// 笔记时间线：每篇笔记的「发布于 / 更新于」。
//
// knowledge-base 是 Obsidian 仓库，frontmatter 里没有日期（sync 时也只保留 tags / title），
// 所以日期从两处来，优先级从高到低：
//   1. 文件名打头的 YYYY-MM-DD（作者亲手写的发布日，最可信）→ 发布日期
//   2. git 历史：某路径第一次出现的提交 → 发布日期；最后一次改动的提交 → 更新日期
// git 历史由 scripts/sync-content.mjs 在同步时一次性导出到 DATES_FILE，
// 构建期只读这份 JSON，不在每个页面里调 git。文件缺失（如 dev:nosync 配了旧的浅克隆）
// 时一律退回文件名日期，再没有就是 null——页面、Feed、Sitemap 都要能容忍没有日期。
import fs from 'node:fs';

export const DATES_FILE = '.cache/kb-dates.json';

const HEADER = '\x01';

// 解析 `git log --format=%x01%aI --name-only --no-renames -z` 的输出。
// -z 下提交头与各个文件名都以 NUL 分隔，文件名不做引号转义（中文路径原样）；
// 每个提交的第一个文件名前会多一个换行。git log 从新到旧，所以同一路径
// 第一次遇到的是最近一次改动（updated），最后一次遇到的是最早出现（created）。
export function parseGitLog(text) {
  const dates = {};
  let current = null;
  for (const raw of text.split('\0')) {
    const token = raw.replace(/^\n+/, '');
    if (!token) continue;
    if (token.startsWith(HEADER)) {
      current = token.slice(1).trim() || null;
      continue;
    }
    if (!current) continue;
    const entry = dates[token];
    if (entry) entry.created = current;
    else dates[token] = { created: current, updated: current };
  }
  return dates;
}

const NAME_DATE = /^(\d{4})-(\d{2})-(\d{2})(?!\d)/;

// 任意带时区的 ISO 时间 → 同一时刻的北京时间写法（…+08:00）。
// git 记的是每次提交所在机器的时区：知识库历史里大多是 +08:00，也混着 +00:00、+09:00。
// 统一折算后，「取前 10 位就是当天日期」与「字符串排序就是时间排序」才都成立——
// 否则 2026-06-03T22:59+00:00 会被标成 6 月 3 日，而那在北京已是 6 月 4 日早上。
export function toBeijingIso(iso) {
  const t = Date.parse(iso);
  if (!iso || Number.isNaN(t)) return null;
  return new Date(t + 8 * 3600e3).toISOString().replace(/\.\d{3}Z$/, '+08:00');
}

// 文件名日期 + git 日期 → { published, updated }（北京时间 ISO 字符串或 null）。
// 文件名只有日，按北京时间零点记。
export function resolveNoteDates(stem, git) {
  const m = String(stem || '').match(NAME_DATE);
  const fromName = m && isValidDay(m[1], m[2], m[3]) ? `${m[1]}-${m[2]}-${m[3]}T00:00:00+08:00` : null;
  const published = fromName || toBeijingIso(git?.created) || null;
  let updated = toBeijingIso(git?.updated) || published;
  // 文件名日期可能晚于首次入库（先建文件、后补日期前缀），更新日期不能早于发布日期
  if (published && updated && Date.parse(updated) < Date.parse(published)) updated = published;
  return { published, updated };
}

function isValidDay(y, m, d) {
  const t = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return t.getUTCFullYear() === Number(y) && t.getUTCMonth() === Number(m) - 1 && t.getUTCDate() === Number(d);
}

let cache = null;
// 相对 kb-content 的路径（04_方法论与洞察/xxx.md）→ { created, updated }
export function loadGitDates() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(DATES_FILE, 'utf8')).files || {};
  } catch {
    cache = {};
  }
  return cache;
}

// ISO → 页面上展示的「2026-09-20」。resolveNoteDates 产出的都是北京时间写法，前 10 位即北京日期。
export function dayOf(iso) {
  return iso ? String(iso).slice(0, 10) : '';
}
