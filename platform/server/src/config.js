import path from "node:path";

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function truthy(value, fallback = false) {
  const raw = String(value ?? "").toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw);
}

function list(value, fallback) {
  const items = String(value ?? "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return items.length ? items : fallback;
}

export function getConfig(env = process.env) {
  return {
    mode: env.ATW_MODE || "development",
    host: env.ATW_HOST || "127.0.0.1",
    port: positiveInteger(env.ATW_PORT, 3200),
    dbPath: path.resolve(env.ATW_DB_PATH || "./data/atw.sqlite"),

    // 允许携带凭证的来源。主站与 API 同域（nginx 反代 /api/），跨域只发生在
    // GitHub Pages 镜像上——那边只读得到公开任务状态，写操作一律要求同源。
    corsOrigins: list(env.ATW_CORS_ORIGINS, [
      "https://tiaozhuxiansheng.com",
      "https://www.tiaozhuxiansheng.com",
      "https://mr-salticidae.github.io",
      "http://127.0.0.1:4321",
      "http://localhost:4321",
    ]),

    sessionHours: positiveInteger(env.ATW_SESSION_HOURS, 720), // 30 天

    // 全站开放注册：读站不需要账号，只有认领任务要登录。留邀请码开关是为了
    // 万一被刷号时能临时收口，平时留空。
    inviteCode: String(env.ATW_INVITE_CODE || "").trim(),
    registrationOpen: truthy(env.ATW_REGISTRATION_OPEN, true),

    // 任务清单：Astro 构建期产出的 /tasks/index.json（见 src/pages/tasks/index.json.js）。
    // 服务定时读这个文件，把 md 里新增/改动的任务书 upsert 进库——正文仍归 git，
    // 状态归数据库，两边各管各的。
    tasksManifestPath: path.resolve(
      env.ATW_TASKS_MANIFEST || "/var/www/tiaozhuxiansheng/tasks/index.json",
    ),
    tasksSyncMinutes: positiveInteger(env.ATW_TASKS_SYNC_MINUTES, 10),

    // 首次启动自动创建的管理员（发布方本人）
    admin: {
      username: env.ATW_ADMIN_USERNAME || "admin",
      email: (env.ATW_ADMIN_EMAIL || "admin@example.com").toLowerCase(),
      password: env.ATW_ADMIN_PASSWORD || "change-this-before-production",
      displayName: env.ATW_ADMIN_DISPLAY_NAME || "跳蛛先生",
    },
  };
}
