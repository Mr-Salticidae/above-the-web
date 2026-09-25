// 登录限流回归：计数只认 nginx 写入的 X-Real-IP，客户端自带的 X-Forwarded-For 换多少个都绕不过去。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getConfig } from "../src/config.js";
import { createApplication } from "../src/app.js";

const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "atw-ratelimit-test-"));
const manifestPath = path.join(workdir, "index.json");
fs.writeFileSync(manifestPath, JSON.stringify({ tasks: [] }));

const silent = { log() {}, warn() {}, error() {} };

const config = getConfig({
  ATW_MODE: "test",
  ATW_PORT: "0",
  ATW_DB_PATH: path.join(workdir, "ratelimit.sqlite"),
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

async function wrongLogin(headers) {
  const response = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ identifier: "admin", password: "definitely-wrong" }),
  });
  return response.status;
}

test("伪造 X-Forwarded-For 绕不过登录限流", async () => {
  const realIp = { "X-Real-IP": "203.0.113.7" };
  const statuses = [];
  for (let i = 0; i < 11; i += 1) {
    statuses.push(await wrongLogin({ ...realIp, "X-Forwarded-For": `198.51.100.${i + 1}` }));
  }
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
  assert.equal(statuses[10], 429);
});

test("不同的真实来源各算各的", async () => {
  assert.equal(await wrongLogin({ "X-Real-IP": "203.0.113.8" }), 401);
});
