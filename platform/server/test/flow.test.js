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

// ---------- 站内新建任务书 ----------

let webSlug = "";

test("站内新建：发布方在管理台发任务，不经 md 也不等构建", async () => {
  const denied = await call("POST", "/api/admin/tasks", {
    token: memberToken,
    body: { title: "普通成员发的任务", summary: "不该成功", body: "正文" },
  });
  assert.equal(denied.status, 403);

  const missing = await call("POST", "/api/admin/tasks", {
    token: adminToken,
    body: { title: "缺正文", summary: "只有摘要" },
  });
  assert.equal(missing.status, 422);
  assert.equal(missing.payload.error, "FIELD_REQUIRED");

  const created = await call("POST", "/api/admin/tasks", {
    token: adminToken,
    body: {
      title: "站内新建的评测任务",
      summary: "在管理台直接写出来的任务书",
      fee: "200 元（税前）",
      deadline: "2026-08-20",
      publishedAt: "2026-07-29",
      body: "## 一、要求\n\n照着规范写。",
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.payload.task.status, "open");
  assert.equal(created.payload.task.source, "web");
  webSlug = created.payload.task.slug;
  // 中文标题推不出 ascii slug，退回 task-日期
  assert.match(webSlug, /^task-20260729/);

  // 公开列表里立刻就有，正文类字段一并带出来，前端好拼卡片
  const listed = await call("GET", "/api/tasks");
  const card = listed.payload.tasks.find((t) => t.slug === webSlug);
  assert.equal(card.title, "站内新建的评测任务");
  assert.equal(card.fee, "200 元（税前）");
  assert.equal(card.deadline, "2026-08-20");

  const detail = await call("GET", `/api/tasks/${webSlug}`);
  assert.equal(detail.payload.body, "## 一、要求\n\n照着规范写。");
  assert.equal(detail.payload.events[0].to, "open"); // 新建那一刻就记了一条
});

test("站内新建的任务书能被认领，走的还是同一条流转", async () => {
  const claim = await call("POST", `/api/tasks/${webSlug}/claim`, {
    token: memberToken,
    body: { pitch: "我来做这个", contact: "微信 spider-demo" },
  });
  assert.equal(claim.status, 201);
  assert.equal(claim.payload.claim.status, "pending");
});

test("改正文只对站内新建的开放；md 那份挡在门外", async () => {
  const edited = await call("PATCH", `/api/admin/tasks/${webSlug}`, {
    token: adminToken,
    body: { title: "站内新建的评测任务（改过标题）", fee: "260 元（税前）" },
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.payload.task.title, "站内新建的评测任务（改过标题）");

  const fromMarkdown = await call("PATCH", "/api/admin/tasks/demo-open", {
    token: adminToken,
    body: { title: "想在管理台改 md 的标题" },
  });
  assert.equal(fromMarkdown.status, 409);
  assert.equal(fromMarkdown.payload.error, "TASK_FROM_MARKDOWN");

  const badDate = await call("PATCH", `/api/admin/tasks/${webSlug}`, {
    token: adminToken,
    body: { deadline: "8月20日" },
  });
  assert.equal(badDate.status, 422);
});

test("下架：列表和详情都收走，管理台还看得到", async () => {
  const off = await call("PATCH", `/api/admin/tasks/${webSlug}`, {
    token: adminToken,
    body: { listed: false },
  });
  assert.equal(off.status, 200);

  const listed = await call("GET", "/api/tasks");
  assert.equal(listed.payload.tasks.some((t) => t.slug === webSlug), false);
  assert.equal((await call("GET", `/api/tasks/${webSlug}`)).status, 404);
  // 发布方自己还能看——下架后总得能再看一眼
  assert.equal((await call("GET", `/api/tasks/${webSlug}`, { token: adminToken })).status, 200);

  const admin = await call("GET", "/api/admin/overview", { token: adminToken });
  assert.equal(admin.payload.tasks.find((t) => t.slug === webSlug).listed, false);

  await call("PATCH", `/api/admin/tasks/${webSlug}`, { token: adminToken, body: { listed: true } });
});

test("同步不碰站内新建的任务，md 补上同名任务书后由 md 接管", async () => {
  const before = taskSync.runOnce();
  assert.equal(before.delisted, 0); // 清单里没有它，但它不是 md 来的，不该被下架
  const stillThere = await call("GET", "/api/tasks");
  assert.ok(stillThere.payload.tasks.some((t) => t.slug === webSlug));

  // 把这份任务书补进 git（管理台导出 md → 提交），下一次同步 md 就该接管正文
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
        {
          slug: webSlug,
          title: "站内新建的评测任务（md 版）",
          summary: "已经提进 git 的那份",
          date: "2026-07-29",
          fee: "260 元（税前）",
          status: "open",
        },
      ],
    }),
  );
  const after = taskSync.runOnce();
  assert.equal(after.adopted, 1);

  const detail = await call("GET", `/api/tasks/${webSlug}`);
  assert.equal(detail.payload.task.source, "md");
  assert.equal(detail.payload.task.title, "站内新建的评测任务（md 版）");
  assert.equal(detail.payload.body, ""); // 正文让位给静态页面

  // 换了来源，认领记录一条都不能丢
  const claims = await call("GET", `/api/admin/tasks/${webSlug}/claims`, { token: adminToken });
  assert.equal(claims.payload.claims.length, 1);
});

// ---------- 调整报酬 ----------

test("调整报酬：md 任务书也能调，时间线留痕，同步不覆盖", async () => {
  // demo-open 是 md 来的，清单里写着 500 元
  const adjusted = await call("PATCH", "/api/admin/tasks/demo-open", {
    token: adminToken,
    body: { feeOverride: "540 元", feeNote: "报销 40 元会员费" },
  });
  assert.equal(adjusted.status, 200);
  assert.equal(adjusted.payload.task.fee, "540 元");
  assert.equal(adjusted.payload.task.feeBase, "500 元");
  assert.equal(adjusted.payload.task.feeNote, "报销 40 元会员费");

  const detail = await call("GET", "/api/tasks/demo-open");
  assert.equal(detail.payload.events.at(-1).note, "报酬调整：500 元 → 540 元（报销 40 元会员费）");

  // 改 md 会被同步覆盖，调价不会——这正是它单独存一列的理由
  taskSync.runOnce();
  const synced = await call("GET", "/api/tasks/demo-open");
  assert.equal(synced.payload.task.fee, "540 元");
  assert.equal(synced.payload.task.feeBase, "500 元");
});

test("承接人在「我的认领」里看到的是调整后的报酬", async () => {
  const mine = await call("GET", "/api/my/claims", { token: memberToken });
  const claim = mine.payload.claims.find((c) => c.taskSlug === "demo-open");
  assert.equal(claim.taskFee, "540 元");
});

test("撤销调整：回到任务书里写的那个数", async () => {
  const restored = await call("PATCH", "/api/admin/tasks/demo-open", {
    token: adminToken,
    body: { feeOverride: "" },
  });
  assert.equal(restored.payload.task.fee, "500 元");
  assert.equal(restored.payload.task.feeBase, "");

  const detail = await call("GET", "/api/tasks/demo-open");
  assert.equal(detail.payload.events.at(-1).note, "报酬恢复为任务书里的 500 元");

  // 同一个值再提交一次不该再记一条
  const noop = await call("PATCH", "/api/admin/tasks/demo-open", {
    token: adminToken,
    body: { feeOverride: "" },
  });
  assert.equal(noop.status, 200);
  const again = await call("GET", "/api/tasks/demo-open");
  assert.equal(again.payload.events.length, detail.payload.events.length);
});

// ---------- 多会话：切换账号与退出登录 ----------

let switcherA = "";
let switcherB = "";
let switcherC = "";

test("同一个账号可以有多处登录，每处一个独立会话", async () => {
  const registered = await call("POST", "/api/auth/register", {
    body: {
      username: "switcher",
      displayName: "换号的人",
      email: "switcher@test.local",
      password: "switcher-password-1",
    },
  });
  assert.equal(registered.status, 201);
  switcherA = registered.payload.token;

  for (const slot of ["B", "C"]) {
    const login = await call("POST", "/api/auth/login", {
      body: { identifier: "switcher", password: "switcher-password-1" },
    });
    assert.equal(login.status, 200);
    if (slot === "B") switcherB = login.payload.token;
    else switcherC = login.payload.token;
  }

  // 三个令牌都能用，互不影响——这正是本地留着多个账号来回切的前提
  for (const token of [switcherA, switcherB, switcherC]) {
    const me = await call("GET", "/api/auth/me", { token });
    assert.equal(me.status, 200);
    assert.equal(me.payload.user.username, "switcher");
  }

  const sessions = await call("GET", "/api/auth/sessions", { token: switcherA });
  assert.equal(sessions.status, 200);
  assert.equal(sessions.payload.sessions.length, 3);
  assert.equal(sessions.payload.sessions.filter((s) => s.current).length, 1);
});

test("退掉某一处登录：只有那一处失效，别处照旧", async () => {
  const own = await call("GET", "/api/auth/sessions", { token: switcherB });
  const idB = own.payload.sessions.find((s) => s.current).id;

  const revoked = await call("DELETE", `/api/auth/sessions/${idB}`, { token: switcherA });
  assert.equal(revoked.status, 200);
  assert.equal(revoked.payload.current, false); // 不是自己这台

  assert.equal((await call("GET", "/api/auth/me", { token: switcherB })).status, 401);
  assert.equal((await call("GET", "/api/auth/me", { token: switcherA })).status, 200);

  // 已经失效的会话不能再退一次
  assert.equal((await call("DELETE", `/api/auth/sessions/${idB}`, { token: switcherA })).status, 404);
});

test("别人的会话 id 踢不动", async () => {
  const stranger = await call("GET", "/api/auth/sessions", { token: memberToken });
  const strangerId = stranger.payload.sessions[0].id;

  const denied = await call("DELETE", `/api/auth/sessions/${strangerId}`, { token: switcherA });
  assert.equal(denied.status, 404);
  assert.equal((await call("GET", "/api/auth/me", { token: memberToken })).status, 200);
});

test("退出登录只丢当前这一个会话", async () => {
  const out = await call("POST", "/api/auth/logout", { token: switcherA });
  assert.equal(out.status, 200);
  assert.equal(out.payload.revoked, 1);

  assert.equal((await call("GET", "/api/auth/me", { token: switcherA })).status, 401);
  assert.equal((await call("GET", "/api/auth/me", { token: switcherC })).status, 200);
});

test("退出所有设备：这个账号所有令牌一起作废，别的账号不受牵连", async () => {
  const everywhere = await call("POST", "/api/auth/logout", {
    token: switcherC,
    body: { all: true },
  });
  assert.equal(everywhere.status, 200);
  assert.ok(everywhere.payload.revoked >= 1);

  assert.equal((await call("GET", "/api/auth/me", { token: switcherC })).status, 401);
  assert.equal((await call("GET", "/api/auth/me", { token: memberToken })).status, 200);

  // 退光之后还能重新登录，账号本身没事
  const again = await call("POST", "/api/auth/login", {
    body: { identifier: "switcher@test.local", password: "switcher-password-1" },
  });
  assert.equal(again.status, 200);
  const sessions = await call("GET", "/api/auth/sessions", { token: again.payload.token });
  assert.equal(sessions.payload.sessions.length, 1);
});
