// AI 辅助填写的回归：草稿只是草稿。
//
// 不打真模型——换成一个假助手（deps.assistant），既能验「送进去的 prompt 里有什么、
// 没有什么」，又能验「模型胡说八道时服务端怎么洗」。真花钱的那条路只有 assist.js 里
// 那一个 fetch，形状和 mailer 一样，不值得为它跑一次真实调用。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { getConfig } from "../src/config.js";
import { createApplication } from "../src/app.js";
import { AssistError } from "../src/assist.js";

const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "atw-assist-test-"));
const manifestPath = path.join(workdir, "index.json");

fs.writeFileSync(
  manifestPath,
  JSON.stringify({
    tasks: [
      {
        slug: "demo-open",
        title: "写一篇 OJO 评测教程",
        summary: "把 OJO 从装到用走一遍",
        date: "2026-07-01",
        deadline: "2026-08-20",
        fee: "150 元（税前）",
        status: "open",
        outline: "## 二、具体要求\n把安装、上手、踩坑三段各写一节，配图不少于八张。",
      },
      {
        slug: "legacy-done",
        title: "历史任务",
        summary: "已经收官的老任务",
        date: "2026-06-01",
        status: "closed",
      },
    ],
  }),
);

// 假助手：记下每次被叫时收到的东西，回一份预置的答案（或抛一个预置的错）。
const calls = [];
let nextReply = null;
let nextError = null;

const assistant = {
  enabled: true,
  model: "fake-model",
  async complete(request) {
    calls.push(request);
    if (nextError) {
      const error = nextError;
      nextError = null;
      throw error;
    }
    return { data: nextReply, usage: null };
  },
};

const config = getConfig({
  ATW_MODE: "test",
  ATW_PORT: "0",
  ATW_DB_PATH: path.join(workdir, "test.sqlite"),
  ATW_TASKS_MANIFEST: manifestPath,
  ATW_ADMIN_PASSWORD: "admin-password-1",
  ATW_ADMIN_EMAIL: "admin@test.local",
  // 配额调小才测得动「点上头」那条
  ATW_AI_HOURLY_LIMIT: "3",
});

const silent = { log() {}, warn() {}, error() {} };
const { server, database, taskSync } = createApplication(config, silent, { assistant });
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

test("准备账号", async () => {
  const admin = await call("POST", "/api/auth/login", {
    body: { identifier: "admin", password: "admin-password-1" },
  });
  assert.equal(admin.status, 200);
  adminToken = admin.payload.token;

  const member = await call("POST", "/api/auth/register", {
    body: {
      username: "taker01",
      displayName: "接单的人",
      email: "taker01@test.local",
      password: "taker-password-1",
    },
  });
  assert.equal(member.status, 201);
  memberToken = member.payload.token;

  // 联系方式与简介：一个该进 prompt，一个绝不能进
  const profile = await call("PATCH", "/api/profile", {
    token: memberToken,
    body: { displayName: "接单的人", contact: "微信 taker-secret-01", bio: "做 AI 教程三年" },
  });
  assert.equal(profile.status, 200);
});

test("/meta 报出 AI 辅助开着", async () => {
  const { payload } = await call("GET", "/api/meta");
  assert.equal(payload.aiAssist, true);
});

test("同步把 md 正文节选带进了库——AI 写自荐说明时要靠它", () => {
  const task = database.findTask("demo-open");
  assert.match(task.outline, /安装、上手、踩坑/);
});

test("任务书草稿：只有发布方能叫，成员一律 403", async () => {
  nextReply = { title: "x", summary: "y", fee: "", deadline: "", slug: "", body: "z", missing: [] };
  const { status } = await call("POST", "/api/ai/task-draft", {
    token: memberToken,
    body: { input: "找人写一篇 OJO 评测" },
  });
  assert.equal(status, 403);
});

test("任务书草稿：模型说什么是一回事，能落进表单的是另一回事", async () => {
  calls.length = 0;
  nextReply = {
    title: "标".repeat(200),                 // 超了字段上限
    summary: "把 OJO 从装到用走一遍",
    fee: "150 元（税前）",
    deadline: "下周五",                       // 不是 YYYY-MM-DD
    slug: "  OJO Review!! ",                  // 大写、空格、叹号
    body: "## 零、一句话总结\n\n写一篇 OJO 评测。",
    missing: ["报酬还没说", "标杆链接还没给", "", "四", "五", "六", "七"],
  };

  const { status, payload } = await call("POST", "/api/ai/task-draft", {
    token: adminToken,
    body: { input: "找人写一篇 OJO 的工具评测教程，8 月 20 号前交", today: "2026-08-03" },
  });
  assert.equal(status, 200);
  assert.equal(payload.draft.title.length, 80);      // 截到上限，不是原样放行
  assert.equal(payload.draft.deadline, "");          // 洗不成日期就丢掉，不猜
  assert.equal(payload.draft.slug, "ojo-review");    // 按站内那套规则重新规范化
  assert.equal(payload.missing.length, 5);           // 空串丢掉、最多五条
  assert.ok(!payload.missing.includes(""));

  // prompt 里得有今天这个基准，不然「下周五」无从换算
  assert.match(calls[0].prompt, /2026-08-03/);
  assert.match(calls[0].prompt, /OJO/);
});

test("任务书草稿：表单里已经有东西时，是「照这句改」而不是「重写一份」", async () => {
  calls.length = 0;
  nextReply = {
    title: "写一篇 OJO 评测教程",
    summary: "把 OJO 从装到用走一遍",
    fee: "",
    deadline: "2026-08-20",
    slug: "ojo-review",
    body: "## 零、一句话总结\n\n改过的正文。",
    missing: [],
  };
  const { status } = await call("POST", "/api/ai/task-draft", {
    token: adminToken,
    body: {
      input: "把报酬加到 200",
      today: "2026-08-03",
      current: { title: "写一篇 OJO 评测教程", body: "## 零、一句话总结\n\n原来的正文。" },
    },
  });
  assert.equal(status, 200);
  assert.match(calls[0].prompt, /已经填好的部分/);
  assert.match(calls[0].prompt, /原来的正文/);
});

test("自荐说明：任务上下文进得去，联系方式进不去", async () => {
  calls.length = 0;
  nextReply = { pitch: "我打算按装—用—坑三段写。", missing: ["可以贴一个同类作品链接"] };

  const { status, payload } = await call("POST", "/api/ai/claim-pitch", {
    token: memberToken,
    body: { slug: "demo-open", input: "这工具我用过一阵，想按装用坑三段写，下周三前能交" },
  });
  assert.equal(status, 200);
  assert.equal(payload.pitch, "我打算按装—用—坑三段写。");
  assert.equal(payload.missing.length, 1);

  const { prompt } = calls[0];
  assert.match(prompt, /安装、上手、踩坑/);   // md 正文的节选到位了
  assert.match(prompt, /做 AI 教程三年/);      // 公开简介可以带
  // 这两条只有本人和发布方看得到，不能送去第三方推理服务
  assert.ok(!prompt.includes("taker-secret-01"));
  assert.ok(!prompt.includes("taker01@test.local"));
});

test("自荐说明：模型写超了也不会给出一段提交不上去的稿", async () => {
  nextReply = { pitch: "字".repeat(3000), missing: [] };
  const { payload } = await call("POST", "/api/ai/claim-pitch", {
    token: memberToken,
    body: { slug: "demo-open", input: "随便说点什么" },
  });
  // 认领接口那边的上限就是 1000，这里超了会被直接打回
  assert.equal(payload.pitch.length, 1000);
});

test("自荐说明：不在招募中的任务不给写", async () => {
  const { status } = await call("POST", "/api/ai/claim-pitch", {
    token: memberToken,
    body: { slug: "legacy-done", input: "我想接这个" },
  });
  assert.equal(status, 409);
});

test("说得太少不叫模型，也不算一次配额", async () => {
  calls.length = 0;
  const { status } = await call("POST", "/api/ai/claim-pitch", {
    token: memberToken,
    body: { slug: "demo-open", input: "嗯" },
  });
  assert.equal(status, 422);
  assert.equal(calls.length, 0);
});

test("模型那头出岔子是 502，不是 500，而且不把对方原话漏给用户", async () => {
  nextError = new AssistError("AI_UNREACHABLE", "AI 服务这会儿连不上，手填也能发", "key sk-xxx 余额不足");
  const { status, payload } = await call("POST", "/api/ai/claim-pitch", {
    token: memberToken,
    body: { slug: "demo-open", input: "这工具我用过一阵，想接" },
  });
  assert.equal(status, 502);
  assert.equal(payload.error, "AI_UNREACHABLE");
  assert.match(payload.message, /手填/);
  assert.ok(!payload.message.includes("sk-xxx"));
});

test("一小时点太多次就歇着，手填不受影响", async () => {
  nextReply = { pitch: "还行。", missing: [] };
  // 上面已经成功叫过 2 次（第 3 次抛错的那次也扣了配额），限额 3，这一次就该到顶
  let last = { status: 200 };
  for (let i = 0; i < 4 && last.status !== 429; i += 1) {
    last = await call("POST", "/api/ai/claim-pitch", {
      token: memberToken,
      body: { slug: "demo-open", input: "这工具我用过一阵，想接" },
    });
  }
  assert.equal(last.status, 429);
  assert.equal(last.payload.error, "AI_QUOTA");

  // 认领本身照走——AI 只是个入口，堵了不该把主路一起堵上
  const claim = await call("POST", "/api/tasks/demo-open/claim", {
    token: memberToken,
    body: { pitch: "我自己手写的自荐", contact: "微信 taker-secret-01" },
  });
  assert.equal(claim.status, 201);
});

// 下面两条不走假助手，验的是 assist.js 自己拼请求、读响应那一段。
// 上游换成一个本地假服务器，形状和真的一样。
test("各家自己的参数原样并进请求体，配置写坏了当没填", async () => {
  const { createAssistant } = await import("../src/assist.js");
  const seen = [];
  const upstream = http.createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => (raw += chunk));
    request.on("end", () => {
      seen.push(JSON.parse(raw));
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: '{"ok":1}' } }] }),
      );
    });
  });
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${upstream.address().port}/v1`;

  const make = (extraJson) =>
    createAssistant(
      getConfig({ ATW_AI_API_KEY: "k", ATW_AI_BASE_URL: base, ATW_AI_MODEL: "m", ATW_AI_EXTRA_JSON: extraJson }),
      silent,
    );
  const args = { system: "s", prompt: "p", schema: { type: "object" }, schemaName: "n" };

  await make('{"enable_thinking":false}').complete(args);
  assert.equal(seen[0].enable_thinking, false);

  // 写坏的 JSON、以及数组这种不是对象的，都当没填——配置写错不该把服务带崩
  await make("{这不是 JSON").complete(args);
  assert.equal("enable_thinking" in seen[1], false);
  await make("[1,2,3]").complete(args);
  assert.equal(Array.isArray(seen[2]) || "0" in seen[2], false);
  assert.equal(seen[2].model, "m");

  upstream.close();
});

test("额度写满被截断时说人话，不报「格式不对」", async () => {
  const { createAssistant, AssistError: Err } = await import("../src/assist.js");
  const upstream = http.createServer((request, response) => {
    request.on("data", () => {});
    request.on("end", () => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          // 半截 JSON：正文写到一半没额度了
          choices: [{ finish_reason: "length", message: { content: '{"title":"OJO 工具评' } }],
          usage: { completion_tokens: 4096, completion_tokens_details: { reasoning_tokens: 3800 } },
        }),
      );
    });
  });
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));

  const assist = createAssistant(
    getConfig({
      ATW_AI_API_KEY: "k",
      ATW_AI_BASE_URL: `http://127.0.0.1:${upstream.address().port}/v1`,
      ATW_AI_MODEL: "m",
    }),
    silent,
  );
  await assert.rejects(
    () => assist.complete({ system: "s", prompt: "p", schema: { type: "object" }, schemaName: "n" }),
    (error) => {
      assert.ok(error instanceof Err);
      assert.equal(error.code, "AI_TRUNCATED");
      assert.match(error.message, /手填/);
      // 排查得看得到实际烧了多少 token，尤其是思考型模型
      assert.match(error.detail, /reasoning_tokens/);
      return true;
    },
  );
  upstream.close();
});

test("没配 key 的站点：aiAssist 为假，接口 503，草稿一条也生不出来", async () => {
  const bare = getConfig({
    ATW_MODE: "test",
    ATW_PORT: "0",
    ATW_DB_PATH: path.join(workdir, "bare.sqlite"),
    ATW_TASKS_MANIFEST: manifestPath,
    ATW_ADMIN_PASSWORD: "admin-password-2",
    ATW_ADMIN_EMAIL: "admin2@test.local",
  });
  const app = createApplication(bare, silent);
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  const bareOrigin = `http://127.0.0.1:${app.server.address().port}`;

  const meta = await (await fetch(`${bareOrigin}/api/meta`)).json();
  assert.equal(meta.aiAssist, false);

  const login = await (
    await fetch(`${bareOrigin}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "admin", password: "admin-password-2" }),
    })
  ).json();
  const draft = await fetch(`${bareOrigin}/api/ai/task-draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${login.token}` },
    body: JSON.stringify({ input: "找人写一篇 OJO 评测" }),
  });
  assert.equal(draft.status, 503);

  app.server.close();
  app.database.close();
});
