// 学习进度同步回归：合并规则、增量游标、校验、限流、隐私边界、清空传播。
//
// 这一层的价值观：进度丢一次只是重勾，但「串号」和「凭空消失」是不可接受的。
// 所以用例里最重的是三块——冲突矩阵、只看得见自己的行、清空能传出去。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getConfig } from "../src/config.js";
import { createApplication } from "../src/app.js";

const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "atw-progress-test-"));
const manifestPath = path.join(workdir, "index.json");
fs.writeFileSync(manifestPath, JSON.stringify({ tasks: [] }));

const silent = { log() {}, warn() {}, error() {} };

const config = getConfig({
  ATW_MODE: "test",
  ATW_PORT: "0",
  ATW_DB_PATH: path.join(workdir, "progress.sqlite"),
  ATW_TASKS_MANIFEST: manifestPath,
  ATW_ADMIN_PASSWORD: "admin-password-1",
  ATW_ADMIN_EMAIL: "admin@test.local",
});

const { server, database } = createApplication(config, silent);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

test.after(() => {
  server.close();
  database.close();
  fs.rmSync(workdir, { recursive: true, force: true });
});

// ---- 小工具 ----

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

let counter = 0;

// 每个用例一个新账号：rev 是每用户独立的，共用账号会让断言互相污染。
// 顺带证明「读者（member）也能同步」——注册出来就是 member。
async function newUser() {
  counter += 1;
  const suffix = `${counter}${Math.random().toString(36).slice(2, 8)}`;
  const username = `progress${suffix}`.toLowerCase();
  const registered = await call("POST", "/api/auth/register", {
    body: {
      username,
      displayName: username,
      email: `${username}@test.local`,
      password: "password-123",
    },
  });
  assert.equal(registered.status, 201, `注册失败：${JSON.stringify(registered.payload)}`);
  const token = registered.payload.token;
  const me = await call("GET", "/api/auth/me", { token });
  return { token, user: me.payload.user };
}

const item = (moduleId, done, at, caseId = "virtual-game") => ({ caseId, moduleId, done, at });

async function push(token, items, baseRev = 0) {
  return call("POST", "/api/juben/progress", { token, body: { baseRev, items } });
}

async function pull(token, since = 0) {
  return call("GET", `/api/juben/progress?since=${since}`, { token });
}

const findItem = (payload, moduleId) => payload.items.find((row) => row.moduleId === moduleId);

// ---- 基础契约 ----

test("空库拉取：rev 0 且没有条目", async () => {
  const { token } = await newUser();
  const { status, payload } = await pull(token);
  assert.equal(status, 200);
  assert.equal(payload.rev, 0);
  assert.deepEqual(payload.items, []);
  assert.ok(Number.isFinite(payload.serverTime));
});

test("推一批：返回新 rev 并回显写入的行", async () => {
  const { token } = await newUser();
  const now = Date.now();
  const { status, payload } = await push(token, [item("flow-skeleton", 1, now)]);
  assert.equal(status, 200);
  assert.equal(payload.rev, 1);
  assert.equal(payload.items.length, 1);
  assert.deepEqual(payload.items[0], {
    caseId: "virtual-game",
    moduleId: "flow-skeleton",
    done: 1,
    at: now,
  });
});

test("同批重复推：不产生重复行，rev 继续递增", async () => {
  const { token, user } = await newUser();
  const now = Date.now();
  await push(token, [item("flow-skeleton", 1, now)]);
  const second = await push(token, [item("flow-skeleton", 1, now + 10)], 1);
  assert.equal(second.payload.rev, 2);
  const rows = database.pullProgress(user.id, 0).items;
  assert.equal(rows.filter((row) => row.moduleId === "flow-skeleton").length, 1);
});

test("空批次不占版本号", async () => {
  const { token } = await newUser();
  await push(token, [item("flow-skeleton", 1, Date.now())]);
  const empty = await push(token, [], 1);
  assert.equal(empty.payload.rev, 1);
  assert.deepEqual(empty.payload.items, []);
});

// ---- 冲突矩阵：九格逐格断言 ----

test("冲突矩阵：完成 vs 无记录 → 新增完成", async () => {
  const { token } = await newUser();
  const { payload } = await push(token, [item("god-view", 1, Date.now())]);
  assert.equal(findItem(payload, "god-view").done, 1);
});

test("冲突矩阵：完成 vs 完成 → 保持完成，client_at 取大", async () => {
  const { token } = await newUser();
  const now = Date.now();
  await push(token, [item("god-view", 1, now)]);
  const later = await push(token, [item("god-view", 1, now + 5000)], 1);
  assert.equal(findItem(later.payload, "god-view").done, 1);
  assert.equal(findItem(later.payload, "god-view").at, now + 5000);
});

test("冲突矩阵：本地更新 → 服务端被覆盖（完成 / 取消双向）", async () => {
  const { token } = await newUser();
  const now = Date.now();
  await push(token, [item("god-view", 0, now)]);
  const done = await push(token, [item("god-view", 1, now + 1000)], 1);
  assert.equal(findItem(done.payload, "god-view").done, 1);

  const undone = await push(token, [item("god-view", 0, now + 2000)], 2);
  assert.equal(findItem(undone.payload, "god-view").done, 0);
});

test("冲突矩阵：服务端更新 → 本地旧写入被忽略", async () => {
  const { token } = await newUser();
  const now = Date.now();
  await push(token, [item("god-view", 1, now)]);
  // 一台时钟落后的设备晚到，带着更早的 at 想取消：不该生效
  const stale = await push(token, [item("god-view", 0, now - 60_000)], 1);
  assert.equal(findItem(stale.payload, "god-view"), undefined, "没有赢得裁决的行不该回传");
  const snapshot = await pull(token);
  assert.equal(findItem(snapshot.payload, "god-view").done, 1);
});

test("冲突矩阵：取消 vs 完成 → 晚的一方赢", async () => {
  const { token } = await newUser();
  const now = Date.now();
  await push(token, [item("god-view", 1, now)]);
  const undone = await push(token, [item("god-view", 0, now + 1000)], 1);
  assert.equal(findItem(undone.payload, "god-view").done, 0);
});

test("冲突矩阵：取消 vs 无记录 → 写墓碑", async () => {
  const { token, user } = await newUser();
  const { payload } = await push(token, [item("god-view", 0, Date.now() - 1000)]);
  assert.equal(findItem(payload, "god-view").done, 0);
  // 墓碑不是删除：库里留着这一行，别的设备才收得到「被取消了」
  const rows = database.pullProgress(user.id, 0).items;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].done, 0);
});

test("冲突矩阵：同一毫秒且值不同 → done=1 优先（双向）", async () => {
  const { token } = await newUser();
  // 落在夹紧区间内的时间戳才不会被改写，这样两边才是真正的「同一刻」
  const same = Date.now() - 1000;
  await push(token, [item("god-view", 0, same)]);
  const up = await push(token, [item("god-view", 1, same)], 1);
  assert.equal(findItem(up.payload, "god-view").done, 1, "同刻并列时完成优先");

  const down = await push(token, [item("god-view", 0, same)], 2);
  assert.equal(findItem(down.payload, "god-view"), undefined, "同刻并列下取消不该翻盘");
  const snapshot = await pull(token);
  assert.equal(findItem(snapshot.payload, "god-view").done, 1);
});

test("冲突矩阵：未知 caseId 照收，不报错", async () => {
  const { token } = await newUser();
  const { status, payload } = await push(token, [item("flow-skeleton", 1, Date.now(), "some-new-case")]);
  assert.equal(status, 200);
  assert.equal(payload.items[0].caseId, "some-new-case");
});

// ---- 游标 / 夹紧 ----

test("since 增量：只回 rev 之后的行", async () => {
  const { token } = await newUser();
  const now = Date.now();
  await push(token, [item("flow-skeleton", 1, now)]);
  await push(token, [item("god-view", 1, now + 10)], 1);
  const first = await pull(token, 1);
  assert.equal(first.payload.rev, 2);
  assert.deepEqual(first.payload.items.map((row) => row.moduleId), ["god-view"]);
  const upToDate = await pull(token, 2);
  assert.deepEqual(upToDate.payload.items, []);
});

test("离谱的 client_at 被夹紧：未来 5 分钟 / 过去 30 天", async () => {
  const { token, user } = await newUser();
  const before = Date.now();
  const { status } = await push(token, [item("flow-skeleton", 1, 4_102_444_800_000)]);
  assert.equal(status, 200);
  const rows = database.pullProgress(user.id, 0).items;
  // 2030 年的时间戳不该原样落库，否则它会永久压住之后所有真实勾选
  assert.ok(rows[0].at <= before + 5 * 60 * 1000 + 2000, "未来时间被夹到 5 分钟内");
  assert.ok(rows[0].at >= before - 1000, "不该被夹过头");

  await push(token, [item("god-view", 1, 1)], 1);
  const old = database.pullProgress(user.id, 0).items.find((row) => row.moduleId === "god-view");
  assert.ok(old.at >= Date.now() - 30 * 24 * 60 * 60 * 1000 - 2000, "1970 年被夹到 30 天前");
});

// ---- 校验与限流 ----

test("非法 caseId / moduleId 整批 422，一条都不写", async () => {
  const { token, user } = await newUser();
  const bad = [
    { caseId: "../etc", moduleId: "flow-skeleton" },
    { caseId: "Virtual-Game", moduleId: "flow-skeleton" },
    { caseId: "virtual-game", moduleId: "a".repeat(65) },
    { caseId: "virtual-game", moduleId: "" },
  ];
  for (const entry of bad) {
    const { status } = await push(token, [{ ...entry, done: 1, at: Date.now() }]);
    assert.equal(status, 422, `${JSON.stringify(entry)} 应该被拒`);
  }
  assert.deepEqual(database.pullProgress(user.id, 0).items, []);
});

test("501 条 → 413", async () => {
  const { token } = await newUser();
  const now = Date.now();
  const items = Array.from({ length: 501 }, (_, index) => item(`module-${index}`, 1, now));
  const { status } = await push(token, items);
  assert.equal(status, 413);
});

test("超 256 KB 请求体 → 413", async () => {
  const { token } = await newUser();
  const response = await fetch(`${origin}/api/juben/progress`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ caseId: "virtual-game", moduleId: "flow-skeleton", done: 1, at: 1, pad: "x".repeat(300 * 1024) }],
    }),
  });
  assert.equal(response.status, 413);
});

test("未登录 → 401", async () => {
  assert.equal((await pull("")).status, 401);
  assert.equal((await call("POST", "/api/juben/progress", { body: { items: [] } })).status, 401);
  assert.equal((await call("DELETE", "/api/juben/progress", {})).status, 401);
});

test("限流：连打 11 批 → 429", async () => {
  const { token } = await newUser();
  const now = Date.now();
  const statuses = [];
  for (let i = 0; i < 11; i += 1) {
    statuses.push((await push(token, [item(`m-${i}`, 1, now + i)])).status);
  }
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(200));
  assert.equal(statuses[10], 429);
});

// ---- 清空 / 隐私 / 级联 ----

test("清空：全部写墓碑，另一台设备拉取后归零", async () => {
  const { token, user } = await newUser();
  const now = Date.now();
  await push(token, [item("flow-skeleton", 1, now), item("god-view", 1, now)]);
  const before = await pull(token);
  assert.equal(before.payload.items.filter((row) => row.done).length, 2);

  const cleared = await call("DELETE", "/api/juben/progress", { token });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.payload.rev, before.payload.rev + 1);

  const after = await pull(token);
  assert.equal(after.payload.items.filter((row) => row.done).length, 0);
  // 墓碑仍在：不是删行，否则「取消」这件事传播不出去
  assert.equal(database.pullProgress(user.id, 0).items.length, 2);

  const logs = database.listAuditLogs(20).filter((row) => row.action === "juben.progress_reset");
  assert.equal(logs.length, 1);
});

test("清空后再推回完成，rev 继续递增（不会卡在旧值）", async () => {
  const { token } = await newUser();
  const now = Date.now();
  await push(token, [item("flow-skeleton", 1, now)]);
  const cleared = await call("DELETE", "/api/juben/progress", { token });
  const back = await push(token, [item("flow-skeleton", 1, now + 5000)], cleared.payload.rev);
  assert.equal(back.payload.rev, cleared.payload.rev + 1);
  assert.equal(findItem(back.payload, "flow-skeleton").done, 1);
});

test("他人数据不可见：B 拉不到 A 的行", async () => {
  const a = await newUser();
  const b = await newUser();
  await push(a.token, [item("flow-skeleton", 1, Date.now())]);
  const seen = await pull(b.token);
  assert.equal(seen.payload.rev, 0);
  assert.deepEqual(seen.payload.items, []);
});

test("删号 → 行随 ON DELETE CASCADE 消失", async () => {
  const { token, user } = await newUser();
  await push(token, [item("flow-skeleton", 1, Date.now())]);
  assert.equal(database.pullProgress(user.id, 0).items.length, 1);

  // 用一条独立连接删号：外键级联是按「执行删除的那条连接」生效的
  const side = new DatabaseSync(config.dbPath);
  side.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  side.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  side.close();

  assert.deepEqual(database.pullProgress(user.id, 0).items, []);
  assert.equal(database.progressRev(user.id), 0);
});

test("/api/meta 带进度同步开关", async () => {
  const { status, payload } = await call("GET", "/api/meta");
  assert.equal(status, 200);
  assert.equal(payload.features.progressSync, true);
});
