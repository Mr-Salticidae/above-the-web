// 端到端流转回归：注册 → 认领 → 定人 → 交付 → 打款收官。
// 用真实 http 服务 + 临时 sqlite 跑，不 mock，跑完删库。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getConfig } from "../src/config.js";
import { createApplication } from "../src/app.js";

const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "atw-platform-test-"));
const manifestPath = path.join(workdir, "index.json");

fs.writeFileSync(
  manifestPath,
  JSON.stringify({
    tasks: [
      {
        slug: "demo-open",
        title: "示例任务",
        summary: "用来跑测试的任务书",
        date: "2026-07-01",
        deadline: "2026-08-01",
        fee: "300 元",
        status: "open",
      },
      {
        slug: "legacy-done",
        title: "历史任务",
        summary: "md 里已经收官的老任务",
        date: "2026-06-01",
        status: "closed",
        taker: "某位没有站内账号的作者",
      },
    ],
  }),
);

const config = getConfig({
  ATW_MODE: "test",
  ATW_PORT: "0",
  ATW_DB_PATH: path.join(workdir, "test.sqlite"),
  ATW_TASKS_MANIFEST: manifestPath,
  ATW_ADMIN_PASSWORD: "admin-password-1",
  ATW_ADMIN_EMAIL: "admin@test.local",
});

const silent = { log() {}, warn() {}, error() {} };
const { server, database, taskSync } = createApplication(config, silent);
taskSync.runOnce();

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

let adminToken = "";
let memberToken = "";
let claimId = "";

test("清单同步：md 里的任务进了库，历史任务保住 md 里的状态和承接人", async () => {
  const { status, payload } = await call("GET", "/api/tasks");
  assert.equal(status, 200);
  const bySlug = Object.fromEntries(payload.tasks.map((t) => [t.slug, t]));
  assert.equal(bySlug["demo-open"].status, "open");
  assert.equal(bySlug["legacy-done"].status, "closed");
  assert.equal(bySlug["legacy-done"].taker, "某位没有站内账号的作者");
});

test("未登录：能读任务状态，不能认领", async () => {
  const read = await call("GET", "/api/tasks/demo-open");
  assert.equal(read.status, 200);
  assert.equal(read.payload.myClaim, null);

  const claim = await call("POST", "/api/tasks/demo-open/claim", { body: { pitch: "我来" } });
  assert.equal(claim.status, 401);
});

test("注册即登录，管理员用初始口令登录", async () => {
  const registered = await call("POST", "/api/auth/register", {
    body: {
      username: "taker01",
      displayName: "接单的人",
      email: "taker01@test.local",
      password: "taker-password-1",
    },
  });
  assert.equal(registered.status, 201);
  assert.ok(registered.payload.token);
  assert.equal(registered.payload.user.role, "member");
  memberToken = registered.payload.token;

  const login = await call("POST", "/api/auth/login", {
    body: { identifier: "admin@test.local", password: "admin-password-1" },
  });
  assert.equal(login.status, 200);
  assert.equal(login.payload.user.role, "admin");
  adminToken = login.payload.token;
});

test("认领要联系方式；提交后进入待处理队列", async () => {
  const missingContact = await call("POST", "/api/tasks/demo-open/claim", {
    token: memberToken,
    body: { pitch: "我做过同类评测" },
  });
  assert.equal(missingContact.status, 422);
  assert.equal(missingContact.payload.error, "CONTACT_REQUIRED");

  const ok = await call("POST", "/api/tasks/demo-open/claim", {
    token: memberToken,
    body: { pitch: "我做过同类评测", contact: "微信 spider-demo" },
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.payload.claim.status, "pending");

  const queue = await call("GET", "/api/admin/overview", { token: adminToken });
  assert.equal(queue.status, 200);
  assert.equal(queue.payload.pendingClaims.length, 1);
  claimId = queue.payload.pendingClaims[0].id;

  // 认领时填的联系方式顺手补进了个人资料
  const me = await call("GET", "/api/auth/me", { token: memberToken });
  assert.equal(me.payload.user.contact, "微信 spider-demo");
});

test("非管理员碰不到管理台", async () => {
  const denied = await call("GET", "/api/admin/overview", { token: memberToken });
  assert.equal(denied.status, 403);
});

test("定人：任务转进行中，页面立刻能读到承接人", async () => {
  const accepted = await call("POST", `/api/admin/claims/${claimId}/accept`, {
    token: adminToken,
    body: { note: "就你了" },
  });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.payload.task.status, "taken");
  assert.equal(accepted.payload.task.taker, "接单的人");

  const detail = await call("GET", "/api/tasks/demo-open");
  assert.equal(detail.payload.task.status, "taken");
  assert.ok(detail.payload.task.claimedAt);
});

test("任务定了人之后不再接受新申请", async () => {
  const late = await call("POST", "/api/tasks/demo-open/claim", {
    token: memberToken,
    body: { pitch: "还能报名吗", contact: "微信 x" },
  });
  assert.equal(late.status, 409);
  assert.equal(late.payload.error, "TASK_NOT_OPEN");
});

test("交付：只有承接人能提交，提交后进入完工待打款", async () => {
  const badUrl = await call("POST", "/api/tasks/demo-open/delivery", {
    token: memberToken,
    body: { url: "not-a-url" },
  });
  assert.equal(badUrl.status, 422);

  const delivered = await call("POST", "/api/tasks/demo-open/delivery", {
    token: memberToken,
    body: { url: "https://example.com/post/1", note: "成稿在这" },
  });
  assert.equal(delivered.status, 201);
  assert.equal(delivered.payload.task.status, "done");
  assert.equal(delivered.payload.task.deliverableUrl, "https://example.com/post/1");

  const notTaker = await call("POST", "/api/tasks/legacy-done/delivery", {
    token: memberToken,
    body: { url: "https://example.com/post/2" },
  });
  assert.equal(notTaker.status, 403);
});

test("打款收官：状态与时间线都留下痕迹", async () => {
  const closed = await call("PATCH", "/api/admin/tasks/demo-open", {
    token: adminToken,
    body: { status: "closed", note: "已微信转账 300" },
  });
  assert.equal(closed.status, 200);
  assert.equal(closed.payload.task.status, "closed");
  assert.ok(closed.payload.task.paidAt);

  const detail = await call("GET", "/api/tasks/demo-open");
  const timeline = detail.payload.events.map((e) => e.to);
  assert.deepEqual(timeline, ["taken", "done", "closed"]);
  assert.equal(detail.payload.deliveries.length, 1);
});

test("打回招募中会清空承接人，不留矛盾数据", async () => {
  const reopened = await call("PATCH", "/api/admin/tasks/demo-open", {
    token: adminToken,
    body: { status: "open", note: "对方鸽了，重新招" },
  });
  assert.equal(reopened.payload.task.status, "open");
  assert.equal(reopened.payload.task.taker, "");
  assert.equal(reopened.payload.task.claimedAt, null);
  assert.equal(reopened.payload.task.paidAt, null);
});

test("再次同步清单不会覆盖运行时状态", async () => {
  // 库里现在是 open（刚打回），md 里也是 open；把 md 改成 closed 也不该影响运行时
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      tasks: [
        {
          slug: "demo-open",
          title: "示例任务（标题改过了）",
          summary: "用来跑测试的任务书",
          date: "2026-07-01",
          fee: "500 元",
          status: "closed",
        },
      ],
    }),
  );
  const result = taskSync.runOnce();
  assert.equal(result.updated, 1);
  assert.equal(result.delisted, 1); // legacy-done 从 md 里消失了，下架但不删

  const tasks = await call("GET", "/api/tasks");
  const slugs = tasks.payload.tasks.map((t) => t.slug);
  assert.deepEqual(slugs, ["demo-open"]);
  assert.equal(tasks.payload.tasks[0].status, "open");

  const admin = await call("GET", "/api/admin/overview", { token: adminToken });
  const legacy = admin.payload.tasks.find((t) => t.slug === "legacy-done");
  assert.equal(legacy.listed, false); // 管理台还看得到，历史不丢
  assert.equal(admin.payload.tasks.find((t) => t.slug === "demo-open").fee, "500 元");
});
