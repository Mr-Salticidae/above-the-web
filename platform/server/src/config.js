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

// 环境变量里的一小段 JSON 对象。写坏了就当没填——配置写错不该让服务起不来。
function jsonObject(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
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

    // 站点地址：重置密码的链接拼在这上面，必须是用户实际访问的那个域
    // （主域根路径部署，见 .github/workflows/deploy.yml 的 BASE_PATH=/）
    siteUrl: String(env.ATW_SITE_URL || "https://tiaozhuxiansheng.com").replace(/\/+$/, ""),

    // 发信。没配 API key 就是「没有发信通道」——自助重置自动退回「找站长人工发链接」，
    // 接口照样在，只是不发信，不会因为漏配环境变量把整条路走死。
    mail: {
      provider: String(env.ATW_MAIL_PROVIDER || "resend").toLowerCase(),
      apiKey: String(env.ATW_MAIL_API_KEY || "").trim(),
      from: String(env.ATW_MAIL_FROM || "").trim(),
      replyTo: String(env.ATW_MAIL_REPLY_TO || "").trim(),
      // 留出口子是为了能对着本地假服务器跑真实的发信回归
      endpoint: String(env.ATW_MAIL_ENDPOINT || "https://api.resend.com/emails").trim(),
      timeoutMs: positiveInteger(env.ATW_MAIL_TIMEOUT_MS, 10_000),
    },

    // 重置令牌有效期。短一点更安全，长一点更宽容——1 小时是常见折中。
    resetTtlMinutes: positiveInteger(env.ATW_RESET_TTL_MINUTES, 60),

    // 站内 AI：任务书辅助填写，以及先检索公开笔记、再依据原文回答的知识库查询。
    // 走 OpenAI 兼容协议（默认 ofox 中转），和 scripts/news-compose.mjs 一个路子。
    // 没配 key 就是「没有 AI 通道」——/api/meta 的 aiAssist 变 false，页面上连按钮都不摆，
    // 手填那条路一点没变。和发信一样：宁可降级，也不要因为漏配环境变量把功能走死。
    ai: {
      apiKey: String(env.ATW_AI_API_KEY || "").trim(),
      baseUrl: String(env.ATW_AI_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1")
        .replace(/\/+$/, ""),
      model: String(env.ATW_AI_MODEL || "qwen3.8-max").trim(),
      // 各家自己的参数，原样并进请求体。留这个口子是因为「换供应商只改两个环境变量」
      // 这句话得站得住：思考开关、top_p 这类东西各家名字都不一样，不该为它们改代码。
      // 2026-08-03 线上填的是 {"enable_thinking":false}——千问默认开思考，
      // 填表这种活儿把 token 全烧在 reasoning 上，正文反而写不完。
      extra: jsonObject(env.ATW_AI_EXTRA_JSON),
      // 任务书正文能写到两三千字，给足生成时间；超时就回「手填也能发」
      timeoutMs: positiveInteger(env.ATW_AI_TIMEOUT_MS, 90_000),
      maxTokens: positiveInteger(env.ATW_AI_MAX_TOKENS, 4096),
      // 每个账号每小时最多叫几次。任务书辅助与知识库查询合并计数；所有接口都要登录，
      // 真正的门在账号那一层。
      hourlyLimit: positiveInteger(env.ATW_AI_HOURLY_LIMIT, 30),
    },

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
