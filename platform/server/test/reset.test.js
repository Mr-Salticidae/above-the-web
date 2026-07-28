// 自助重置密码回归：发信 → 校验链接 → 改密 → 旧登录全下线 → 用完即焚。
// 发信打到一个本地假 Resend 上，验的是真实的 HTTP 载荷，不真发信。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { getConfig } from "../src/config.js";
import { createApplication } from "../src/app.js";

const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "atw-reset-test-"));
const manifestPath = path.join(workdir, "index.json");
fs.writeFileSync(manifestPath, JSON.stringify({ tasks: [] }));

const silent = { log() {}, warn() {}, error() {} };

// ---------- 假的 Resend ----------

const inbox = [];
let mailStatus = 200;
const mailServer = http.createServer((request, response) => {
  let raw = "";
  request.on("data", (chunk) => (raw += chunk));
  request.on("end", () => {
    inbox.push({ auth: request.headers.authorization, body: JSON.parse(raw || "{}") });
    response.writeHead(mailStatus, { "Content-Type": "application/json" });
    response.end(JSON.stringify(mailStatus === 200 ? { id: "mail-1" } : { message: "nope" }));
  });
});
await new Promise((resolve) => mailServer.listen(0, "127.0.0.1", resolve));

const config = getConfig({
  ATW_MODE: "test",
  ATW_PORT: "0",
  ATW_DB_PATH: path.join(workdir, "reset.sqlite"),
  ATW_TASKS_MANIFEST: manifestPath,
  ATW_ADMIN_PASSWORD: "admin-password-1",
  ATW_ADMIN_EMAIL: "admin@test.local",
  ATW_SITE_URL: "https://tiaozhuxiansheng.com/", // 尾斜杠故意留着，看会不会拼出双斜杠
  ATW_MAIL_API_KEY: "re_test_key",
  ATW_MAIL_FROM: "蛛网之上 <no-reply@tiaozhuxiansheng.com>",
  ATW_MAIL_ENDPOINT: `http://127.0.0.1:${mailServer.address().port}/emails`,
  ATW_RESET_TTL_MINUTES: "60",
});

const { server, database } = createApplication(config, silent);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

test.after(() => {
  server.close();
  database.close();
  mailServer.close();
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
  return { status: response.status, payload: await response.json().catch(() => ({})) };
}

const linkIn = (entry) => entry.body.text.match(/https:\/\/\S+/)[0];
const tokenIn = (entry) => new URL(linkIn(entry)).searchParams.get("token");

let registerToken = "";
let resetToken = "";
let adminToken = "";

test("配了发信通道，/meta 就说得清能自助重置", async () => {
  const meta = await call("GET", "/api/meta");
  assert.equal(meta.payload.selfServiceReset, true);
  assert.equal(meta.payload.resetTtlMinutes, 60);
});

test("忘记密码：发出一封信，链接指向站点的重置页", async () => {
  const registered = await call("POST", "/api/auth/register", {
    body: {
      username: "forgetful",
      displayName: "忘性大的人",
      email: "forgetful@test.local",
      password: "old-password-1",
    },
  });
  assert.equal(registered.status, 201);
  registerToken = registered.payload.token;

  const asked = await call("POST", "/api/auth/forgot", {
    body: { email: "FORGETFUL@test.local" }, // 邮箱大小写不敏感
  });
  assert.equal(asked.status, 200);
  assert.equal(asked.payload.delivery, "email");

  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].auth, "Bearer re_test_key");
  assert.deepEqual(inbox[0].body.to, ["forgetful@test.local"]);
  assert.equal(inbox[0].body.from, "蛛网之上 <no-reply@tiaozhuxiansheng.com>");
  assert.match(inbox[0].body.subject, /重置/);
  assert.ok(inbox[0].body.text.startsWith("忘性大的人，你好"));

  const link = linkIn(inbox[0]);
  assert.ok(link.startsWith("https://tiaozhuxiansheng.com/account/reset/?token="), link);
  assert.ok(!link.includes(".com//account"), "尾斜杠不该拼出双斜杠");
  resetToken = tokenIn(inbox[0]);
});

test("陌生邮箱和已注册邮箱回的一模一样，不给探测口子", async () => {
  const before = inbox.length;
  const stranger = await call("POST", "/api/auth/forgot", {
    body: { email: "nobody-here@test.local" },
  });
  assert.equal(stranger.status, 200);
  assert.deepEqual(stranger.payload, { ok: true, delivery: "email", ttlMinutes: 60 });
  assert.equal(inbox.length, before, "库里没这个人，也就没有信");

  const malformed = await call("POST", "/api/auth/forgot", { body: { email: "不是邮箱" } });
  assert.equal(malformed.status, 422);
});

test("链接可以先校验再用，用完即焚", async () => {
  const peek = await call("GET", `/api/auth/reset?token=${encodeURIComponent(resetToken)}`);
  assert.equal(peek.status, 200);
  assert.equal(peek.payload.username, "forgetful");
  assert.equal(peek.payload.displayName, "忘性大的人");

  const tooShort = await call("POST", "/api/auth/reset", {
    body: { token: resetToken, password: "short" },
  });
  assert.equal(tooShort.status, 422);

  const done = await call("POST", "/api/auth/reset", {
    body: { token: resetToken, password: "brand-new-password-1" },
  });
  assert.equal(done.status, 200);
  assert.ok(done.payload.revokedSessions >= 1);

  const again = await call("POST", "/api/auth/reset", {
    body: { token: resetToken, password: "another-password-1" },
  });
  assert.equal(again.status, 404);
  assert.equal(again.payload.error, "RESET_INVALID");

  assert.equal((await call("GET", `/api/auth/reset?token=${resetToken}`)).status, 404);
  assert.equal((await call("GET", "/api/auth/reset?token=")).status, 404);
});

test("重置之后：旧密码作废、旧登录全下线、新密码能进", async () => {
  assert.equal((await call("GET", "/api/auth/me", { token: registerToken })).status, 401);

  const oldPassword = await call("POST", "/api/auth/login", {
    body: { identifier: "forgetful", password: "old-password-1" },
  });
  assert.equal(oldPassword.status, 401);

  const fresh = await call("POST", "/api/auth/login", {
    body: { identifier: "forgetful", password: "brand-new-password-1" },
  });
  assert.equal(fresh.status, 200);
});

test("同一个账号一小时最多三封，多的静默丢掉", async () => {
  const before = inbox.length;
  for (let i = 0; i < 5; i += 1) {
    assert.equal(
      (await call("POST", "/api/auth/forgot", { body: { email: "forgetful@test.local" } })).status,
      200,
    );
  }
  assert.equal(inbox.length - before, 2, "窗口内已经用掉一封，只该再发两封");
});

test("新发一张票，之前没用过的立刻作废", async () => {
  const older = tokenIn(inbox[inbox.length - 2]);
  const newer = tokenIn(inbox[inbox.length - 1]);
  assert.notEqual(older, newer);
  assert.equal((await call("GET", `/api/auth/reset?token=${older}`)).status, 404);
  assert.equal((await call("GET", `/api/auth/reset?token=${newer}`)).status, 200);
});

test("发信失败不改变对外的回答，但会记进审计", async () => {
  const admin = await call("POST", "/api/auth/login", {
    body: { identifier: "admin@test.local", password: "admin-password-1" },
  });
  adminToken = admin.payload.token;

  const registered = await call("POST", "/api/auth/register", {
    body: {
      username: "unreachable",
      displayName: "收不到信的人",
      email: "unreachable@test.local",
      password: "some-password-1",
    },
  });
  assert.equal(registered.status, 201);

  mailStatus = 422;
  const asked = await call("POST", "/api/auth/forgot", {
    body: { email: "unreachable@test.local" },
  });
  mailStatus = 200;
  assert.equal(asked.status, 200);
  assert.equal(asked.payload.delivery, "email");

  const logs = await call("GET", "/api/admin/audit-logs", { token: adminToken });
  const failed = logs.payload.logs.find(
    (entry) => entry.action === "auth.reset_request" && entry.details_json.includes('"mailed":false'),
  );
  assert.ok(failed, "审计里应该留下发信失败的记录");
});

test("停用的账号不发重置信", async () => {
  const users = await call("GET", "/api/admin/users", { token: adminToken });
  const target = users.payload.users.find((user) => user.username === "unreachable");
  await call("PATCH", `/api/admin/users/${target.id}`, {
    token: adminToken,
    body: { status: "suspended" },
  });

  const before = inbox.length;
  const asked = await call("POST", "/api/auth/forgot", {
    body: { email: "unreachable@test.local" },
  });
  assert.equal(asked.status, 200); // 对外还是同一句
  assert.equal(inbox.length, before);

  await call("PATCH", `/api/admin/users/${target.id}`, {
    token: adminToken,
    body: { status: "active" },
  });
});

test("管理台可以给人生成一次性重置链接，非管理员不行", async () => {
  const users = await call("GET", "/api/admin/users", { token: adminToken });
  const target = users.payload.users.find((user) => user.username === "unreachable");

  const member = await call("POST", "/api/auth/login", {
    body: { identifier: "forgetful", password: "brand-new-password-1" },
  });
  const denied = await call("POST", `/api/admin/users/${target.id}/reset-link`, {
    token: member.payload.token,
  });
  assert.equal(denied.status, 403);

  const link = await call("POST", `/api/admin/users/${target.id}/reset-link`, {
    token: adminToken,
  });
  assert.equal(link.status, 201);
  assert.ok(link.payload.url.startsWith("https://tiaozhuxiansheng.com/account/reset/?token="));

  // 人工发的链接和自助那条走同一套令牌
  const manual = new URL(link.payload.url).searchParams.get("token");
  const used = await call("POST", "/api/auth/reset", {
    body: { token: manual, password: "manual-set-password-1" },
  });
  assert.equal(used.status, 200);
  assert.equal(
    (await call("POST", "/api/auth/login", {
      body: { identifier: "unreachable", password: "manual-set-password-1" },
    })).status,
    200,
  );

  await call("PATCH", `/api/admin/users/${target.id}`, {
    token: adminToken,
    body: { status: "suspended" },
  });
  const refused = await call("POST", `/api/admin/users/${target.id}/reset-link`, {
    token: adminToken,
  });
  assert.equal(refused.status, 409);
});

test("没有发信通道时：接口照常，只是明说要走人工", async () => {
  const bare = getConfig({
    ATW_MODE: "test",
    ATW_PORT: "0",
    ATW_DB_PATH: path.join(workdir, "nomail.sqlite"),
    ATW_TASKS_MANIFEST: manifestPath,
    ATW_ADMIN_PASSWORD: "admin-password-1",
    ATW_ADMIN_EMAIL: "admin@test.local",
  });
  const app = createApplication(bare, silent);
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  const bareOrigin = `http://127.0.0.1:${app.server.address().port}`;

  const meta = await fetch(`${bareOrigin}/api/meta`).then((response) => response.json());
  assert.equal(meta.selfServiceReset, false);

  const asked = await fetch(`${bareOrigin}/api/auth/forgot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@test.local" }),
  });
  assert.equal(asked.status, 200);
  assert.equal((await asked.json()).delivery, "manual");

  // 没有信可发，但管理台照样能生成链接——这就是人工兜底
  const admin = await fetch(`${bareOrigin}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "admin@test.local", password: "admin-password-1" }),
  }).then((response) => response.json());
  const users = await fetch(`${bareOrigin}/api/admin/users`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  }).then((response) => response.json());
  const link = await fetch(`${bareOrigin}/api/admin/users/${users.users[0].id}/reset-link`, {
    method: "POST",
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  assert.equal(link.status, 201);

  app.server.close();
  app.database.close();
});
