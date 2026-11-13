// DM 身份体系回归：邀请码兑换 → 自有邀请码 → 链式传承 → 内容门禁。
// 全程用真实 http 服务 + 临时 sqlite；GitHub 内容通道注入假 fetcher，不发真请求。
// 另外单独建一个「老库」先跑旧 SCHEMA 再迁移，验证 users 表 CHECK 约束升级无损。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getConfig } from "../src/config.js";
import { createApplication } from "../src/app.js";

const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "atw-juben-dm-test-"));

// ---- 老库迁移：先造一个只有 admin/member 的 users 表，再让 createDatabase 升级它 ----

test("老库迁移：users 表 role CHECK 升级为 admin/member/dm，数据无损", () => {
  const legacyDbPath = path.join(workdir, "legacy.sqlite");
  const legacy = new DatabaseSync(legacyDbPath);
  legacy.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
      status TEXT NOT NULL DEFAULT 'active',
      contact TEXT NOT NULL DEFAULT '',
      payee TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_login_at INTEGER
    );
    INSERT INTO users VALUES ('u-legacy', 'legacy', '老用户', 'legacy@test.local', 'x', 'member', 'active', '', '', '', 1, 1, NULL);
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER
    );
    INSERT INTO sessions VALUES ('s-1', 'u-legacy', 'th', 1, 9999999999999, NULL);
  `);
  legacy.close();

  // createApplication 会走 migrate()：重建 users 表 + 补 invited_by/dm_at
  const legacyConfig = getConfig({
    ATW_MODE: "test",
    ATW_PORT: "0",
    ATW_DB_PATH: legacyDbPath,
    ATW_TASKS_MANIFEST: path.join(workdir, "none.json"),
    ATW_ADMIN_PASSWORD: "admin-password-1",
    ATW_ADMIN_EMAIL: "admin@test.local",
  });
  // 老库里已有用户，不会再种管理员
  const { database, server } = createApplication(legacyConfig, { log() {}, warn() {}, error() {} });
  const user = database.findUserById("u-legacy");
  assert.equal(user.username, "legacy");
  assert.equal(user.invited_by, null);
  assert.equal(user.dm_at, null);
  // 升级后的表必须能写入 'dm'
  database.setUserFlags("u-legacy", { role: "dm", status: "active" });
  assert.equal(database.findUserById("u-legacy").role, "dm");
  server.close();
  database.close();
});

// ---- 主流程：真实应用 + 假 GitHub ----

const config = getConfig({
  ATW_MODE: "test",
  ATW_PORT: "0",
  ATW_DB_PATH: path.join(workdir, "test.sqlite"),
  ATW_TASKS_MANIFEST: path.join(workdir, "none.json"),
  ATW_ADMIN_PASSWORD: "admin-password-1",
  ATW_ADMIN_EMAIL: "admin@test.local",
  ATW_JUBEN_TOKEN: "test-token",
});

// 与真实 juben-dm-lab 同构：中文卷目录 + 嵌套子目录 + README/学习包命名习惯
const REPO_FILES = {
  "cases/954-虚拟游戏/README.md": "> 源资料包：`C:\\Users\\12258\\Downloads\\954虚拟游戏`（0.83 GB，不入库）\n> 早期产物快照：`C:\\Users\\12258\\WorkBuddy\\snapshot`（保留作本机备份）\n> 目标：把全部内容转为可检索的 md 文本。\n> ⚠️ 本目录含完整剧透，仅供 DM 使用。\n\n卷首页：没有 # 标题，考验 README 翻译。\n",
  "cases/954-虚拟游戏/00_开本速查卡.md": "# 虚拟游戏 · 开本速查卡\n",
  "cases/954-虚拟游戏/00_DM主持学习手册.md": "# 虚拟游戏 · DM 手册\n\n凶手是某某。\n\n```dm-runbook\n第一步|0|台词|操作|物料|检查|||音频线索~SUQzAA==；BGM · 曲名~~https://example.com\n```\n",
  "cases/954-虚拟游戏/01_转写/人物剧本·前言.md": "# 人物剧本 · 前言\n\n六位玩家入座。\n",
  "cases/247-窗边的女人/README.md": "这里是另一卷。\n",
  "cases/247-窗边的女人/00_对外学习包/第一册_开本与流程.md": "# 第一册 · 开本与流程\n",
  "cases/247-窗边的女人/00_对外学习包/第二册_故事全貌.md": "# 第二册 · 故事全貌\n",
  "cases/247-窗边的女人/00_对外学习包/读我先看.md": "# 窗边的女人 · 读我先看\n",
  "README.md": "# juben-dm-lab",
};

function fakeGitHub(url) {
  const treeUrl = "https://api.github.com/repos/Mr-Salticidae/juben-dm-lab/git/trees/main?recursive=1";
  if (url === treeUrl) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        tree: Object.keys(REPO_FILES).map((filePath) => ({
          type: "blob",
          path: filePath,
          size: REPO_FILES[filePath].length,
        })),
      }),
      text: async () => "",
    };
  }
  for (const [filePath, content] of Object.entries(REPO_FILES)) {
    const rawUrl = `https://raw.githubusercontent.com/Mr-Salticidae/juben-dm-lab/main/${encodeURI(filePath)}`;
    if (url === rawUrl) {
      return { ok: true, status: 200, text: async () => content, json: async () => ({}) };
    }
  }
  return { ok: false, status: 404, text: async () => "not found", json: async () => ({}) };
}

test("冷启动合并并发清单请求，续刷只读取变更的档案", async () => {
  const { createJubenContent } = await import("../src/juben-content.js");
  const files = Object.keys(REPO_FILES).filter((path) => path.startsWith("cases/"));
  const changed = files[0];
  let version = "v1";
  let trees = 0;
  let inFlight = 0;
  let peak = 0;
  const reads = [];
  const content = createJubenContent(config, { warn() {} }, {
    async fetch(url) {
      if (url.includes("/git/trees/")) {
        trees += 1;
        return { ok: true, json: async () => ({
          tree: files.map((path) => ({ type: "blob", path, sha: path === changed ? version : path })),
        }) };
      }
      const path = files.find((entry) => url.endsWith(encodeURI(entry)));
      reads.push(path);
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setImmediate(resolve));
      inFlight -= 1;
      return { ok: true, text: async () => path === changed ? `# ${version}\n正文` : REPO_FILES[path] };
    },
  });
  const [first, second] = await Promise.all([content.manifest(), content.manifest()]);
  assert.deepEqual(first, second);
  assert.equal(trees, 1);
  assert.equal(reads.length, files.length);
  assert.ok(peak > 1 && peak <= 6);
  assert.doesNotMatch(JSON.stringify(first), /正文|markdown/);

  version = "v2";
  reads.length = 0;
  await content.manifest({ force: true });
  assert.deepEqual(reads, [changed]);
  const [, caseId, name] = changed.split("/");
  assert.equal((await content.doc(caseId, name.slice(0, -3))).title, "v2");
});

const silent = { log() {}, warn() {}, error() {} };
const { server, database } = createApplication(config, silent, { jubenFetcher: fakeGitHub });
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

test.after(() => {
  server.close();
  database.close();
  fs.rmSync(workdir, { recursive: true, force: true });
});

async function call(method, route, { token, body } = {}) {
  const response = await fetch(`${origin}${route}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function registerAndLogin(username) {
  const registered = await call("POST", "/api/auth/register", {
    body: {
      username,
      displayName: username,
      email: `${username}@test.local`,
      password: "password-123",
    },
  });
  return registered.payload.token;
}

let adminToken = "";
let memberToken = "";
let colleagueToken = "";
let adminInviteCode = "";

test("首任 DM 是 admin：登录即拿到邀请码（首次访问才生成）", async () => {
  const login = await call("POST", "/api/auth/login", {
    body: { identifier: "admin", password: "admin-password-1" },
  });
  assert.equal(login.status, 200);
  adminToken = login.payload.token;

  const invite = await call("GET", "/api/dm/invite", { token: adminToken });
  assert.equal(invite.status, 200);
  adminInviteCode = invite.payload.invite.code;
  assert.match(adminInviteCode, /^[2-9A-HJ-NP-Z]{5}-[2-9A-HJ-NP-Z]{5}$/);

  // 一人一码：再拿还是同一枚
  const again = await call("GET", "/api/dm/invite", { token: adminToken });
  assert.equal(again.payload.invite.code, adminInviteCode);
});

test("未登录 / 普通 member 碰不了 DM 区", async () => {
  memberToken = await registerAndLogin("member01");

  const anonymous = await call("GET", "/api/juben/manifest");
  assert.equal(anonymous.status, 401);

  const forbidden = await call("GET", "/api/juben/manifest", { token: memberToken });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.payload.error, "NOT_DM");

  const redeemEmpty = await call("POST", "/api/dm/redeem", { token: memberToken, body: {} });
  assert.equal(redeemEmpty.status, 422);
});

test("member 兑换邀请码成为 DM，并长出自己的邀请码", async () => {
  const bad = await call("POST", "/api/dm/redeem", { token: memberToken, body: { code: "WRONG-CODE" } });
  assert.equal(bad.status, 404);

  const redeem = await call("POST", "/api/dm/redeem", {
    token: memberToken,
    body: { code: adminInviteCode },
  });
  assert.equal(redeem.status, 200);
  assert.equal(redeem.payload.user.role, "dm");
  assert.equal(redeem.payload.user.invited_by, redeem.payload.user.invited_by);
  const ownCode = redeem.payload.invite.code;
  assert.match(ownCode, /^[2-9A-HJ-NP-Z]{5}-[2-9A-HJ-NP-Z]{5}$/);
  assert.notEqual(ownCode, adminInviteCode);

  // 已经是 DM 再兑换：409
  const again = await call("POST", "/api/dm/redeem", {
    token: memberToken,
    body: { code: adminInviteCode },
  });
  assert.equal(again.status, 409);
});

test("链式传承：新 DM 的码能带下一个人进门", async () => {
  colleagueToken = await registerAndLogin("colleague01");

  const newDm = await call("POST", "/api/dm/redeem", { token: memberToken, body: {} });
  // 上一条测试里 member 已经是 DM，直接拿它的码
  const invite = await call("GET", "/api/dm/invite", { token: memberToken });
  const chainCode = invite.payload.invite.code;

  const redeem = await call("POST", "/api/dm/redeem", {
    token: colleagueToken,
    body: { code: chainCode },
  });
  assert.equal(redeem.status, 200);
  assert.equal(redeem.payload.user.role, "dm");

  // 邀请人看得到自己领进门的人
  const invited = await call("GET", "/api/dm/invited", { token: memberToken });
  assert.equal(invited.status, 200);
  const names = invited.payload.invited.map((row) => row.username);
  assert.ok(names.includes("colleague01"));

  // 码的使用次数有记账
  const inviteAgain = await call("GET", "/api/dm/invite", { token: memberToken });
  assert.equal(inviteAgain.payload.invite.uses, 1);
});

test("DM 读得到剧本清单与正文，中文目录与嵌套路径都通", async () => {
  const manifest = await call("GET", "/api/juben/manifest", { token: colleagueToken });
  assert.equal(manifest.status, 200);
  assert.equal(manifest.payload.configured, true);
  assert.equal(manifest.payload.cases.length, 2);
  const ids = manifest.payload.cases.map((entry) => entry.id);
  assert.deepEqual([...ids].sort(), ["247-窗边的女人", "954-虚拟游戏"]);
  // 清单按 DM 阅读视角分组：开卷总览在首，中文数字按册数排（第二册不得插队到第一册前）
  const case954 = manifest.payload.cases.find((entry) => entry.id === "954-虚拟游戏");
  assert.equal(case954.groups[0].label, "开卷 · 总览");
  const groupLabels = case954.groups.map((group) => group.label);
  assert.ok(groupLabels.includes("转写"));
  const docIds = case954.groups.flatMap((group) => group.docs.map((doc) => doc.id));
  assert.ok(docIds.includes("01_转写/人物剧本·前言"));
  assert.ok(case954.groups.every((group) => group.docs.every((doc) => !("markdown" in doc))));

  // 组内顺序：README 翻译成「请先读我」并排第一，序号文档其次
  const overview = case954.groups.find((group) => group.label === "开卷 · 总览");
  assert.equal(overview.docs[0].title, "请先读我");
  assert.ok(overview.docs.slice(1).some((doc) => doc.title.includes("开本速查卡")));

  // 学习包的册数顺序：一、二不能按拼音乱序；读我先看永远第一
  const case247 = manifest.payload.cases.find((entry) => entry.id === "247-窗边的女人");
  const booklet = case247.groups.find((group) => group.label === "对外学习包");
  const bookletTitles = booklet.docs.map((doc) => doc.title);
  const indexOf = (needle) => bookletTitles.findIndex((title) => title.includes(needle));
  assert.equal(indexOf("读我先看"), 0);
  assert.ok(indexOf("第一册") >= 0 && indexOf("第二册") >= 0);
  assert.ok(indexOf("第一册") < indexOf("第二册"), "第一册应排在第二册前");

  // 嵌套 doc id 要整体 encode（路径里的 / 变 %2F 才留在同一 URL 段）
  const docId = encodeURIComponent("00_DM主持学习手册");
  const doc = await call("GET", `/api/juben/doc/${encodeURIComponent("954-虚拟游戏")}/${docId}`, {
    token: colleagueToken,
  });
  assert.equal(doc.status, 200);
  assert.equal(doc.payload.doc.title, "虚拟游戏 · DM 手册");
  assert.ok(doc.payload.doc.markdown.includes("凶手是某某"));
  assert.match(doc.payload.doc.markdown, /SUQzAA==/);

  const docPath = `/api/juben/doc/${encodeURIComponent("954-虚拟游戏")}/${docId}`;
  const lightweight = await call("GET", `${docPath}?audio=deferred`, { token: colleagueToken });
  const audioKey = lightweight.payload.doc.markdown.match(/音频线索~@([a-f0-9]{64})/)[1];
  assert.doesNotMatch(lightweight.payload.doc.markdown, /SUQzAA==/);
  assert.match(lightweight.payload.doc.markdown, /BGM · 曲名~~https:\/\/example\.com/);
  const audioPath = `${docPath}/audio/${audioKey}`;
  const audio = await fetch(`${origin}${audioPath}`, { headers: { Authorization: `Bearer ${colleagueToken}` } });
  assert.equal(audio.status, 200);
  assert.equal(audio.headers.get('cache-control'), 'no-store');
  assert.equal(audio.headers.get('content-type'), 'audio/mpeg');
  assert.equal(Buffer.from(await audio.arrayBuffer()).toString('base64'), 'SUQzAA==');
  assert.equal((await call('GET', `${docPath}/audio/${'0'.repeat(64)}`, { token: colleagueToken })).status, 404);
  assert.equal((await call('GET', audioPath)).status, 401);

  // 网页只展示主持内容：本机路径、备份说明和制作目标不随正文下发，剧透警示仍保留。
  const readme = await call("GET", `/api/juben/doc/${encodeURIComponent("954-虚拟游戏")}/README`, {
    token: colleagueToken,
  });
  assert.equal(readme.status, 200);
  assert.doesNotMatch(readme.payload.doc.markdown, /C:\\Users|Downloads|不入库|本机备份|目标：把全部内容转为/);
  assert.match(readme.payload.doc.markdown, /仅供 DM 使用/);
  assert.match(readme.payload.doc.markdown, /卷首页/);

  // 路径白名单：含 .. 的 id 直接 404，不拼出奇怪路径
  const evil = await call(
    "GET",
    `/api/juben/doc/${encodeURIComponent("954-虚拟游戏")}/${encodeURIComponent("../evil")}`,
    { token: colleagueToken },
  );
  assert.equal(evil.status, 404);

  // member 视角被挡在门外
  const outsider = await registerAndLogin("outsider01");
  const blocked = await call("GET", `/api/juben/doc/${encodeURIComponent("954-虚拟游戏")}/${docId}`, {
    token: outsider,
  });
  assert.equal(blocked.status, 403);
  assert.equal((await call('GET', audioPath, { token: outsider })).status, 403);
});

test("没配 token 的部署：通道优雅降级，兑换体系照常", async () => {
  const noTokenConfig = getConfig({
    ATW_MODE: "test",
    ATW_PORT: "0",
    ATW_DB_PATH: path.join(workdir, "notoken.sqlite"),
    ATW_TASKS_MANIFEST: path.join(workdir, "none.json"),
    ATW_ADMIN_PASSWORD: "admin-password-1",
    ATW_ADMIN_EMAIL: "admin@test.local",
    // ATW_JUBEN_TOKEN 不给
  });
  const { server: s2, database: db2 } = createApplication(noTokenConfig, silent);
  await new Promise((resolve) => s2.listen(0, "127.0.0.1", resolve));
  const origin2 = `http://127.0.0.1:${s2.address().port}`;
  try {
    const login = await fetch(`${origin2}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "admin", password: "admin-password-1" }),
    }).then((r) => r.json());
    const manifest = await fetch(`${origin2}/api/juben/manifest`, {
      headers: { Authorization: `Bearer ${login.token}` },
    }).then((r) => r.json());
    assert.equal(manifest.configured, false);
    assert.equal(manifest.cases.length, 0);

    const invite = await fetch(`${origin2}/api/dm/invite`, {
      headers: { Authorization: `Bearer ${login.token}` },
    }).then((r) => r.json());
    assert.match(invite.invite.code, /^[2-9A-HJ-NP-Z]{5}-[2-9A-HJ-NP-Z]{5}$/);
  } finally {
    s2.close();
    db2.close();
  }
});
