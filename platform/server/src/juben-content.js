// DM 剧本内容通道：从私有仓库 juben-dm-lab 拉取 cases/*/ 下的拆解手册，
// 在服务器内存里缓存，只在 DM 级别接口后面露面。全文不落公开仓库、不进静态构建。
//
// 结构约定（与 juben-dm-lab 的目录对齐）：
//   cases/<卷目录>/<任意层级>/<NN_文件名>.md   → 一卷档案，按完整相对路径排序即阅读顺序
// 卷目录与文件名都可以含中文（如 cases/954-虚拟游戏/01_转写/人物剧本·囚鸽.md）。
//
// 卷 id = 卷目录名；doc id = md 在卷内的完整相对路径（去掉 .md，可含 /）。
// 客户端传 doc id 时 encodeURIComponent，路径里的 / 变 %2F 留在同一 URL 段里，
// 服务端 decode 后只在缓存树里做等值查找——路径永远由服务端从 git 树拼出，
// 不存在拿用户输入拼路径的口子；decode 后仍挡一道 ".."、开头 "/"、反斜杠。

const CASE_ID_RE = /^[0-9A-Za-z][0-9A-Za-z\u4e00-\u9fff_-]*$/;

function safeDocId(id) {
  return (
    typeof id === "string" &&
    id.length > 0 &&
    !id.includes("..") &&
    !id.startsWith("/") &&
    !id.includes("\\")
  );
}

// 站内展示的标题覆盖表：仓库文件名是英文习惯，页面上说人话
const TITLE_OVERRIDES = { README: "请先读我" };

function docTitle(docId, firstHeading) {
  // 展示标题优先用文档第一个 # 标题；没有就用文件名清洗：
  // 去掉序号前缀、下划线换成「 · 」（"音视频线索_画面文字" → "音视频线索 · 画面文字"）
  if (firstHeading && firstHeading.trim()) return firstHeading.trim();
  const file = docId.split("/").pop().replace(/\.md$/i, "");
  if (TITLE_OVERRIDES[file]) return TITLE_OVERRIDES[file];
  return file.replace(/^\d+[_-]*/, "").replace(/_+/g, " · ").trim();
}

function firstHeadingOf(markdown) {
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^#\s+(.+)/);
    if (match) return match[1];
  }
  return "";
}

export function createJubenContent(config, log = console, deps = {}) {
  // 测试里注入假 fetch；线上走全局 fetch（Node 22 自带）
  const fetcher = deps.fetch ?? globalThis.fetch.bind(globalThis);
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "above-the-web-juben",
    ...(config.juben.token ? { Authorization: `Bearer ${config.juben.token}` } : {}),
  };

  let cache = { at: 0, cases: [] };

  const configured = () => Boolean(config.juben.token && config.juben.repo);

  async function fetchTree() {
    const url =
      `https://api.github.com/repos/${config.juben.repo}/git/trees/${config.juben.branch}` +
      `?recursive=1`;
    const response = await fetcher(url, { headers });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`GitHub tree ${response.status}: ${detail.slice(0, 200)}`);
    }
    const payload = await response.json();
    if (payload.truncated) log.warn?.("[juben] 仓库树被截断，内容清单可能不完整");
    return Array.isArray(payload.tree) ? payload.tree : [];
  }

  // ---------- DM 视角的排序与分组 ----------

  // 中文数字解析：一~九十九，带不带「第」都认（第一册/二卷）。
  // 学习包里的「第一册…第五册」没有阿拉伯前缀，不解析就会按拼音排出 二三四五一 的鬼顺序。
  const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  function cnNumeralValue(text) {
    const match = String(text).match(/^第?([一二三四五六七八九十]+)/);
    if (!match) return null;
    const chars = match[1];
    if (chars === "十") return 10;
    if (chars.startsWith("十")) return 10 + (CN_NUM[chars[1]] ?? 0);
    if (chars.includes("十")) {
      const [tens, ones] = chars.split("十");
      return (CN_NUM[tens] ?? 0) * 10 + (CN_NUM[ones] ?? 0);
    }
    return CN_NUM[chars] ?? null;
  }

  // 组内排序键。DM 的阅读惯例：
  //   0. 入门文档（请先读我 / 读我先看）永远排第一
  //   1. 带序号的按序号排（00_、01_…、第一册、第二册…）
  //   2. 没序号的殿后，按中文习惯排
  function sortKey(name) {
    const file = String(name).replace(/\.md$/i, "");
    if (/^(README|读我先看)/i.test(file)) return { rank: 0, num: 0, rest: "" };
    const arabic = file.match(/^(\d+)/);
    if (arabic) return { rank: 1, num: Number(arabic[1]), rest: file.slice(arabic[1].length) };
    const cn = cnNumeralValue(file);
    if (cn !== null) {
      const chars = file.match(/^第?[一二三四五六七八九十]+/)[0];
      return { rank: 1, num: cn, rest: file.slice(chars.length) };
    }
    return { rank: 2, num: 0, rest: file };
  }

  function compareKeys(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.num !== b.num) return a.num - b.num;
    return a.rest.localeCompare(b.rest, "zh-CN");
  }

  // 分组标签：卷根下的文档归「开卷 · 总览」；子目录剥掉 00_ 这类序号前缀当组名
  function groupLabel(segment) {
    if (!segment) return "开卷 · 总览";
    return segment.replace(/^\d+_*/, "") || segment;
  }

  // cases/<卷目录>/深层/路径.md → [{ id, groups: [{ label, docs }] }]
  // 标题要靠正文第一个 #，树里没有——正文逐个拉一次并进缓存，之后 TTL 内零请求。
  async function buildManifest() {
    const tree = await fetchTree();
    const byCase = new Map();
    for (const node of tree) {
      if (node.type !== "blob") continue;
      const match = String(node.path || "").match(/^cases\/([^/]+)\/(.+\.md)$/i);
      if (!match) continue;
      const caseId = match[1];
      const relPath = match[2];
      if (!CASE_ID_RE.test(caseId)) continue;
      if (!safeDocId(relPath.slice(0, -3))) continue;
      if (!byCase.has(caseId)) byCase.set(caseId, []);
      byCase.get(caseId).push({ path: node.path, relPath, size: node.size ?? 0 });
    }

    const cases = [];
    for (const [id, files] of byCase) {
      // 先按组归拢，组内按 DM 阅读序排，组间按组名序号排
      const byGroup = new Map();
      for (const file of files) {
        const segments = file.relPath.split("/");
        const groupSeg = segments.length > 1 ? segments[0] : "";
        if (!byGroup.has(groupSeg)) byGroup.set(groupSeg, []);
        byGroup.get(groupSeg).push(file);
      }

      // 组间排序：卷根（开卷 · 总览）永远第一，其余按目录序号（00_、01_…）
      const groups = [...byGroup.entries()]
        .map(([seg, groupFiles]) => ({
          seg,
          label: groupLabel(seg),
          key: seg ? sortKey(seg) : { rank: -1, num: 0, rest: "" },
          sorted: groupFiles
            .map((file) => ({ file, key: sortKey(file.relPath.split("/").pop()) }))
            .sort((a, b) => compareKeys(a.key, b.key)),
        }))
        .sort((a, b) => compareKeys(a.key, b.key));

      const caseDocs = [];
      const groupViews = [];
      for (const group of groups) {
        const groupDocViews = [];
        for (const { file } of group.sorted) {
          const markdown = await fetchRaw(file.path).catch((error) => {
            log.warn?.(`[juben] 拉不到 ${file.path}：${error.message}`);
            return null;
          });
          if (markdown === null) continue;
          const docId = file.relPath.slice(0, -3); // 去掉 .md，保留层级
          const meta = {
            id: docId,
            title: docTitle(docId, firstHeadingOf(markdown)),
            bytes: file.size,
          };
          caseDocs.push({ ...meta, markdown });
          groupDocViews.push(meta);
        }
        if (groupDocViews.length) groupViews.push({ label: group.label, docs: groupDocViews });
      }
      if (caseDocs.length) cases.push({ id, docs: caseDocs, groups: groupViews });
    }
    cases.sort((a, b) => a.id.localeCompare(b.id, "zh-CN"));
    return cases;
  }
  async function fetchRaw(path) {
    const url =
      `https://raw.githubusercontent.com/${config.juben.repo}/${config.juben.branch}/${encodeURI(path)}`;
    const response = await fetcher(url, { headers });
    if (!response.ok) throw new Error(`raw ${response.status}`);
    return response.text();
  }

  // 对外清单：只给元数据（id/标题/分组），正文留在缓存里走 doc() 单独给。
  function manifestView(cases) {
    const stripDoc = ({ id, title, bytes }) => ({ id, title, bytes });
    return cases.map((item) => ({
      id: item.id,
      docs: item.docs.map(stripDoc),
      groups: item.groups.map((group) => ({
        label: group.label,
        docs: group.docs.map(stripDoc),
      })),
    }));
  }

  async function manifest({ force = false } = {}) {
    if (!configured()) return { configured: false, cases: [] };
    const fresh = Date.now() - cache.at < config.juben.cacheTtlMinutes * 60 * 1000;
    if (!force && fresh && cache.cases.length) return { configured: true, cases: manifestView(cache.cases) };
    try {
      cache = { at: Date.now(), cases: await buildManifest() };
    } catch (error) {
      log.warn?.(`[juben] 清单拉取失败：${error.message}`);
      if (cache.cases.length) return { configured: true, stale: true, cases: manifestView(cache.cases) };
      throw error;
    }
    return { configured: true, cases: manifestView(cache.cases) };
  }

  function findDoc(cases, caseId, docId) {
    if (!CASE_ID_RE.test(caseId) || !safeDocId(docId)) return null;
    const item = cases.find((entry) => entry.id === caseId);
    return item?.docs.find((doc) => doc.id === docId) ?? null;
  }

  return {
    configured,
    manifest,
    async doc(caseId, docId) {
      // 正文在完整缓存里（清单视图已剥掉 markdown），缓存空就先拉一次
      if (!cache.cases.length) await manifest();
      const found = findDoc(cache.cases, caseId, docId);
      if (!found) return null;
      const { markdown, ...meta } = found;
      return { ...meta, markdown };
    },
    status() {
      return {
        configured: configured(),
        repo: configured() ? config.juben.repo : null,
        branch: config.juben.branch,
        cacheTtlMinutes: config.juben.cacheTtlMinutes,
        cachedAt: cache.cases.length ? cache.at : null,
        caseCount: cache.cases.length,
      };
    },
  };
}
