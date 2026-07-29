import http from "node:http";
import { randomUUID } from "node:crypto";
import { createDatabase, TASK_STATUSES, ROLES } from "./database.js";
import { createTaskSync } from "./task-sync.js";
import { createMailer, passwordResetMail } from "./mailer.js";
import { createSessionToken, hashPassword, hashToken, verifyPassword } from "./security.js";

const JSON_LIMIT_BYTES = 256 * 1024;
const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 10;
const authAttempts = new Map();

// 同一个账号一小时内最多发几封重置信。挡的是「拿别人注册过的邮箱刷他收件箱」。
const RESET_WINDOW_MS = 60 * 60 * 1000;
const RESET_MAX_PER_WINDOW = 3;

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function clean(value) {
  return String(value ?? "").trim();
}

function corsHeaders(config, request) {
  const origin = clean(request.headers.origin).replace(/\/$/, "");
  if (!origin || !config.corsOrigins.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function sendJson(response, status, payload, config, request) {
  response.writeHead(status, {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...corsHeaders(config, request),
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > JSON_LIMIT_BYTES) throw new HttpError(413, "PAYLOAD_TOO_LARGE", "请求体过大");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "INVALID_JSON", "请求体不是合法 JSON");
  }
}

function bearerToken(request) {
  const authorization = request.headers.authorization || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function clientAddress(request) {
  const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || request.socket.remoteAddress || "unknown";
}

function checkAuthRateLimit(request) {
  const key = clientAddress(request);
  const nowTs = Date.now();
  const record = authAttempts.get(key);
  if (!record || nowTs - record.startedAt > AUTH_WINDOW_MS) {
    authAttempts.set(key, { startedAt: nowTs, count: 1 });
    return;
  }
  record.count += 1;
  if (record.count > AUTH_MAX_ATTEMPTS) {
    throw new HttpError(429, "TOO_MANY_ATTEMPTS", "尝试过于频繁，请 10 分钟后再试");
  }
}

function clearAuthFailures(request) {
  authAttempts.delete(clientAddress(request));
}

function validateRegistration(body) {
  const username = clean(body.username);
  const displayName = clean(body.displayName) || username;
  const email = clean(body.email).toLowerCase();
  const password = String(body.password || "");
  if (!/^[a-zA-Z0-9_-]{2,32}$/.test(username)) {
    throw new HttpError(422, "INVALID_USERNAME", "用户名需为 2–32 位的字母、数字、下划线或连字符");
  }
  if (displayName.length > 32) throw new HttpError(422, "INVALID_DISPLAY_NAME", "昵称最长 32 个字符");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(422, "INVALID_EMAIL", "邮箱格式不正确");
  }
  if (password.length < 8 || password.length > 128) {
    throw new HttpError(422, "WEAK_PASSWORD", "密码需为 8–128 位");
  }
  return { username, displayName, email, password };
}

// 任务书的正文类字段。站内新建时全走这里，长度上限对着页面排版定，
// 不是安全边界（安全边界是 JSON_LIMIT_BYTES），是「写超了页面就难看了」的提醒。
const TASK_FIELD_LIMITS = { title: 80, summary: 200, fee: 40, body: 20000 };

function taskText(value, field, { required = false } = {}) {
  const text = clean(value);
  if (!text && required) {
    throw new HttpError(422, "FIELD_REQUIRED", `请填写${
      { title: "标题", summary: "一句话摘要", body: "任务书正文" }[field] || field
    }`);
  }
  if (text.length > TASK_FIELD_LIMITS[field]) {
    throw new HttpError(422, "FIELD_TOO_LONG", `这一项最长 ${TASK_FIELD_LIMITS[field]} 个字符`);
  }
  return text;
}

function dateText(value, { fallback = "" } = {}) {
  const text = clean(value);
  if (!text) return fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text))) {
    throw new HttpError(422, "INVALID_DATE", "日期格式为 YYYY-MM-DD");
  }
  return text;
}

// 这几个 slug 是任务书板块自己的页面，被任务占了会撞路由
const RESERVED_SLUGS = new Set(["index", "spec", "detail", "new", "api"]);

function normalizeSlug(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// 没填链接后缀就从标题推一个。中文标题推不出 ascii，退回 task-日期-随机四位——
// 链接不好看总比让发布方为了发个任务先起英文名强。
function deriveSlug(database, { slug, title, publishedAt }) {
  const wanted = normalizeSlug(slug) || normalizeSlug(title);
  const base = wanted || `task-${publishedAt.replace(/-/g, "")}`;
  const taken = (candidate) => RESERVED_SLUGS.has(candidate) || database.taskExists(candidate);
  if (!taken(base)) return base;
  for (let n = 2; n <= 9; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken(candidate)) return candidate;
  }
  return `${base}-${randomUUID().slice(0, 4)}`;
}

function httpsUrl(value, { allowEmpty = false } = {}) {
  const url = clean(value);
  if (!url) {
    if (allowEmpty) return "";
    throw new HttpError(422, "INVALID_URL", "请填写链接");
  }
  if (!/^https?:\/\/\S+$/.test(url) || url.length > 500) {
    throw new HttpError(422, "INVALID_URL", "链接需以 http(s):// 开头且不超过 500 字符");
  }
  return url;
}

// 对外可见的任务状态。联系方式、申请者名单这类信息一律不进这个视图。
// 标题、报酬这些正文类字段也带上：md 任务书的静态页面上本来就印着，
// 而站内新建的任务书整张卡片都要靠它们在前端拼出来。
function publicTask(row) {
  return {
    slug: row.slug,
    source: row.source || "md",
    title: row.title || "",
    summary: row.summary || "",
    fee: row.fee || "",
    deadline: row.deadline || "",
    publishedAt: row.published_at || "",
    status: row.status,
    taker: row.taker_display_name || row.taker_name || "",
    takerUserId: row.taker_user_id || null,
    pendingClaims: row.pending_claims ?? 0,
    deliverableUrl: row.deliverable_url || "",
    claimedAt: row.claimed_at,
    deliveredAt: row.delivered_at,
    paidAt: row.paid_at,
    updatedAt: row.updated_at,
    listed: Boolean(row.listed),
  };
}

function ownClaim(row) {
  if (!row) return null;
  return {
    id: row.id,
    taskSlug: row.task_slug,
    status: row.status,
    pitch: row.pitch,
    contact: row.contact,
    decideNote: row.decide_note,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    taskTitle: row.task_title,
    taskStatus: row.task_status,
    taskFee: row.task_fee,
    taskDeadline: row.task_deadline,
  };
}

export function createApplication(config, log = console, deps = {}) {
  const database = createDatabase(config);
  const taskSync = createTaskSync(config, database, log);
  // 测试里换成假的发信器，就能验证「发了什么信」而不真发出去
  const mailer = deps.mailer ?? createMailer(config, log);

  // 开一张一次性重置票。旧的没用过的一并作废，同一时间只留一个有效链接。
  function issuePasswordReset(user, { channel = "email", issuedBy = null } = {}) {
    database.invalidatePasswordResets(user.id);
    const token = createSessionToken();
    const expiresAt = Date.now() + config.resetTtlMinutes * 60 * 1000;
    database.createPasswordReset({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      channel,
      issuedBy,
    });
    return { token, expiresAt, url: `${config.siteUrl}/account/reset/?token=${encodeURIComponent(token)}` };
  }

  function authenticate(request) {
    const token = bearerToken(request);
    if (!token) throw new HttpError(401, "UNAUTHENTICATED", "请先登录");
    const session = database.findActiveSession(hashToken(token));
    if (!session) throw new HttpError(401, "SESSION_EXPIRED", "登录已过期，请重新登录");
    const user = database.findUserById(session.user_id);
    if (!user) throw new HttpError(401, "UNAUTHENTICATED", "账号不存在");
    if (user.status !== "active") throw new HttpError(403, "ACCOUNT_RESTRICTED", "账号已被停用");
    return { user, token };
  }

  // 没登录也放行，只是拿不到 user——公开接口用它来附带「我的申请」
  function optionalAuth(request) {
    try {
      return authenticate(request).user;
    } catch {
      return null;
    }
  }

  function requireAdmin(request) {
    const auth = authenticate(request);
    if (auth.user.role !== "admin") {
      throw new HttpError(403, "FORBIDDEN", "只有发布方可以执行该操作");
    }
    return auth;
  }

  function taskOrThrow(slug) {
    const task = database.findTask(slug);
    if (!task) throw new HttpError(404, "TASK_NOT_FOUND", "任务不存在");
    return task;
  }

  // 状态流转的唯一入口：改状态一定同时留一条时间线，不给「状态变了但没人知道为什么」留口子
  function transition(task, toStatus, { actorUserId, note = "", extra = {} }) {
    if (!TASK_STATUSES.includes(toStatus)) {
      throw new HttpError(422, "INVALID_STATUS", "任务状态不合法");
    }
    const updated = database.updateTask(task.slug, { status: toStatus, ...extra });
    database.createTaskEvent({
      taskSlug: task.slug,
      actorUserId,
      fromStatus: task.status,
      toStatus,
      note,
    });
    return updated;
  }

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

      if (request.method === "OPTIONS") {
        response.writeHead(204, {
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
          "Access-Control-Max-Age": "600",
          ...corsHeaders(config, request),
        });
        response.end();
        return;
      }

      const route = `${request.method} ${url.pathname}`;
      const reply = (status, payload) => sendJson(response, status, payload, config, request);

      // ---------- 元信息 ----------

      if (route === "GET /api/meta") {
        reply(200, {
          registrationOpen: config.registrationOpen,
          requiresInvite: Boolean(config.inviteCode),
          // 没有发信通道时前端把「忘记密码」改成「找站长人工发链接」的说法
          selfServiceReset: mailer.enabled,
          resetTtlMinutes: config.resetTtlMinutes,
          taskStatuses: TASK_STATUSES,
          roles: ROLES,
        });
        return;
      }

      // ---------- 账号 ----------

      if (route === "POST /api/auth/register") {
        checkAuthRateLimit(request);
        if (!config.registrationOpen) {
          throw new HttpError(403, "REGISTRATION_CLOSED", "暂时关闭注册");
        }
        const body = await readJson(request);
        if (config.inviteCode && clean(body.inviteCode) !== config.inviteCode) {
          throw new HttpError(403, "INVALID_INVITE_CODE", "邀请码不正确");
        }
        const input = validateRegistration(body);
        let user;
        try {
          user = database.createUser({
            username: input.username,
            displayName: input.displayName,
            email: input.email,
            passwordHash: hashPassword(input.password),
            role: "member",
          });
        } catch (error) {
          if (String(error.message).includes("UNIQUE constraint failed")) {
            throw new HttpError(409, "ACCOUNT_EXISTS", "用户名或邮箱已被注册");
          }
          throw error;
        }
        database.createAuditLog({
          actorUserId: user.id,
          action: "auth.register",
          targetType: "user",
          targetId: user.id,
        });
        // 注册即登录，少一次输入
        const token = createSessionToken();
        const expiresAt = Date.now() + config.sessionHours * 60 * 60 * 1000;
        database.createSession({ userId: user.id, tokenHash: hashToken(token), expiresAt });
        database.touchLastLogin(user.id);
        clearAuthFailures(request);
        reply(201, { token, expiresAt, user: database.findUserById(user.id) });
        return;
      }

      if (route === "POST /api/auth/login") {
        checkAuthRateLimit(request);
        const body = await readJson(request);
        const identifier = clean(body.identifier);
        const password = String(body.password || "");
        const found = database.findUserForLogin(identifier);
        if (!found || !verifyPassword(password, found.password_hash)) {
          throw new HttpError(401, "INVALID_CREDENTIALS", "用户名或密码不正确");
        }
        if (found.status !== "active") throw new HttpError(403, "ACCOUNT_RESTRICTED", "账号已被停用");
        const token = createSessionToken();
        const expiresAt = Date.now() + config.sessionHours * 60 * 60 * 1000;
        database.createSession({ userId: found.id, tokenHash: hashToken(token), expiresAt });
        database.touchLastLogin(found.id);
        database.createAuditLog({
          actorUserId: found.id,
          action: "auth.login",
          targetType: "session",
          details: { expiresAt },
        });
        clearAuthFailures(request);
        reply(200, { token, expiresAt, user: database.findUserById(found.id) });
        return;
      }

      if (route === "GET /api/auth/me") {
        const { user } = authenticate(request);
        reply(200, { user });
        return;
      }

      if (route === "POST /api/auth/logout") {
        const { user, token } = authenticate(request);
        const body = await readJson(request);
        // { all: true } 是「退出所有设备」：本机换账号只退当前这一个，别人的设备不受牵连
        if (body.all === true) {
          const revoked = database.revokeAllSessions(user.id);
          database.createAuditLog({
            actorUserId: user.id,
            action: "auth.logout_all",
            targetType: "session",
            details: { revoked },
          });
          reply(200, { ok: true, revoked });
          return;
        }
        database.revokeSession(hashToken(token));
        database.createAuditLog({ actorUserId: user.id, action: "auth.logout", targetType: "session" });
        reply(200, { ok: true, revoked: 1 });
        return;
      }

      if (route === "GET /api/auth/sessions") {
        const { user, token } = authenticate(request);
        const currentHash = hashToken(token);
        reply(200, {
          sessions: database.listSessions(user.id).map((session) => ({
            id: session.id,
            createdAt: session.created_at,
            expiresAt: session.expires_at,
            current: session.token_hash === currentHash,
          })),
        });
        return;
      }

      const sessionMatch = url.pathname.match(/^\/api\/auth\/sessions\/([^/]+)$/);
      if (request.method === "DELETE" && sessionMatch) {
        const { user, token } = authenticate(request);
        const sessionId = decodeURIComponent(sessionMatch[1]);
        const target = database.listSessions(user.id).find((s) => s.id === sessionId);
        if (!target) throw new HttpError(404, "SESSION_NOT_FOUND", "这个登录已经失效了");
        database.revokeSessionById(user.id, sessionId);
        database.createAuditLog({
          actorUserId: user.id,
          action: "auth.session_revoke",
          targetType: "session",
          targetId: sessionId,
        });
        // current=true 时前端要把本地令牌一起清掉，否则页面还挂着一个已经吊销的会话
        reply(200, { ok: true, current: target.token_hash === hashToken(token) });
        return;
      }

      if (route === "POST /api/auth/password") {
        const { user, token } = authenticate(request);
        const body = await readJson(request);
        const currentPassword = String(body.currentPassword || "");
        const newPassword = String(body.newPassword || "");
        const storedHash = database.getPasswordHashById(user.id);
        if (!storedHash || !verifyPassword(currentPassword, storedHash)) {
          throw new HttpError(403, "INVALID_CURRENT_PASSWORD", "当前密码不正确");
        }
        if (newPassword.length < 8 || newPassword.length > 128) {
          throw new HttpError(422, "WEAK_PASSWORD", "新密码需为 8–128 位");
        }
        if (newPassword === currentPassword) {
          throw new HttpError(422, "PASSWORD_UNCHANGED", "新密码不能和当前密码相同");
        }
        database.setPassword(user.id, hashPassword(newPassword));
        // 只踢其它设备，保留当前会话
        database.revokeOtherSessions(user.id, hashToken(token));
        database.createAuditLog({
          actorUserId: user.id,
          action: "auth.password_change",
          targetType: "user",
          targetId: user.id,
        });
        reply(200, { passwordChanged: true });
        return;
      }

      // ---------- 忘记密码 ----------

      if (route === "POST /api/auth/forgot") {
        checkAuthRateLimit(request);
        const body = await readJson(request);
        const email = clean(body.email).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new HttpError(422, "INVALID_EMAIL", "邮箱格式不正确");
        }
        // 不管这个邮箱在不在库里、发信成没成功，回的东西都一模一样。
        // 否则这个接口就成了「查某个邮箱注册过没有」的探测器。
        const sameAnswer = () =>
          reply(200, {
            ok: true,
            delivery: mailer.enabled ? "email" : "manual",
            ttlMinutes: config.resetTtlMinutes,
          });

        const user = database.findUserByEmail(email);
        if (!user || user.status !== "active") {
          sameAnswer();
          return;
        }
        if (
          database.countPasswordResetsSince(user.id, Date.now() - RESET_WINDOW_MS) >=
          RESET_MAX_PER_WINDOW
        ) {
          sameAnswer();
          return;
        }

        const issued = issuePasswordReset(user, { channel: "email" });
        let mailed = false;
        let failure = "";
        if (mailer.enabled) {
          try {
            await mailer.send({
              to: user.email,
              ...passwordResetMail({
                displayName: user.display_name,
                resetUrl: issued.url,
                ttlMinutes: config.resetTtlMinutes,
                siteUrl: config.siteUrl,
              }),
            });
            mailed = true;
          } catch (error) {
            // 发不出去也不能告诉调用方——那等于确认了这个邮箱有账号。
            // 记日志 + 记审计，站长在管理台看得到，可以改用人工发链接。
            failure = error.detail || error.message;
            log.error("[atw-platform] 重置信发送失败", failure);
          }
        }
        database.createAuditLog({
          actorUserId: user.id,
          action: "auth.reset_request",
          targetType: "user",
          targetId: user.id,
          details: { mailed, provider: mailer.provider, ...(failure ? { failure } : {}) },
        });
        sameAnswer();
        return;
      }

      if (route === "GET /api/auth/reset") {
        const reset = database.findActivePasswordReset(hashToken(clean(url.searchParams.get("token"))));
        if (!reset || reset.user_status !== "active") {
          throw new HttpError(404, "RESET_INVALID", "这个链接已经失效了，重新发一次");
        }
        reply(200, {
          valid: true,
          username: reset.username,
          displayName: reset.display_name,
          expiresAt: reset.expires_at,
        });
        return;
      }

      if (route === "POST /api/auth/reset") {
        checkAuthRateLimit(request);
        const body = await readJson(request);
        const password = String(body.password || "");
        const reset = database.findActivePasswordReset(hashToken(clean(body.token)));
        if (!reset || reset.user_status !== "active") {
          throw new HttpError(404, "RESET_INVALID", "这个链接已经失效了，重新发一次");
        }
        if (password.length < 8 || password.length > 128) {
          throw new HttpError(422, "WEAK_PASSWORD", "新密码需为 8–128 位");
        }
        database.setPassword(reset.user_id, hashPassword(password));
        database.usePasswordReset(reset.id);
        // 还没用的票一起作废；改完密码把所有设备都踢下线——
        // 走到重置这一步，通常正是因为号可能不干净了
        database.invalidatePasswordResets(reset.user_id);
        const revoked = database.revokeAllSessions(reset.user_id);
        database.createAuditLog({
          actorUserId: reset.user_id,
          action: "auth.reset_complete",
          targetType: "user",
          targetId: reset.user_id,
          details: { channel: reset.channel, revokedSessions: revoked },
        });
        clearAuthFailures(request);
        reply(200, { ok: true, username: reset.username, revokedSessions: revoked });
        return;
      }

      if (route === "PATCH /api/profile") {
        const { user } = authenticate(request);
        const body = await readJson(request);
        const displayName = clean(body.displayName) || user.display_name;
        const contact = clean(body.contact);
        const payee = clean(body.payee);
        const bio = clean(body.bio);
        if (displayName.length > 32) throw new HttpError(422, "INVALID_DISPLAY_NAME", "昵称最长 32 个字符");
        if (contact.length > 120 || payee.length > 120) {
          throw new HttpError(422, "FIELD_TOO_LONG", "联系方式与收款方式各限 120 字符");
        }
        if (bio.length > 200) throw new HttpError(422, "FIELD_TOO_LONG", "简介最长 200 字符");
        const updated = database.updateProfile(user.id, { displayName, contact, payee, bio });
        reply(200, { user: updated });
        return;
      }

      // ---------- 任务（公开读） ----------

      if (route === "GET /api/tasks") {
        const viewer = optionalAuth(request);
        const tasks = database.listTasks().map(publicTask);
        const mine = viewer
          ? Object.fromEntries(
              database.listClaimsByUser(viewer.id).map((c) => [c.task_slug, ownClaim(c)]),
            )
          : {};
        reply(200, { tasks, myClaims: mine });
        return;
      }

      const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
      if (request.method === "GET" && taskMatch) {
        const slug = decodeURIComponent(taskMatch[1]);
        const task = taskOrThrow(slug);
        const viewer = optionalAuth(request);
        // 下架的站内任务书连页面也一并收走（md 那份的正文在静态站上，藏不住也不用藏）。
        // 发布方例外——下架后还要能自己看一眼再决定上不上。
        if (task.source === "web" && !task.listed && viewer?.role !== "admin") {
          throw new HttpError(404, "TASK_NOT_FOUND", "任务不存在");
        }
        reply(200, {
          task: publicTask(task),
          // 站内新建的任务书正文在库里，页面要靠它渲染；md 那份归静态页面，这里给空串
          body: task.source === "web" ? task.body : "",
          events: database.listTaskEvents(slug).map((e) => ({
            id: e.id,
            from: e.from_status,
            to: e.to_status,
            note: e.note,
            actor: e.actor_name || "",
            createdAt: e.created_at,
          })),
          deliveries: database.listDeliveries(slug).map((d) => ({
            id: d.id,
            url: d.url,
            note: d.note,
            by: d.user_display_name || "",
            createdAt: d.created_at,
          })),
          myClaim: viewer ? ownClaim(database.findClaim(slug, viewer.id)) : null,
        });
        return;
      }

      // ---------- 认领 ----------

      const claimMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/claim$/);
      if (request.method === "POST" && claimMatch) {
        const { user } = authenticate(request);
        const slug = decodeURIComponent(claimMatch[1]);
        const task = taskOrThrow(slug);
        if (task.status !== "open") {
          throw new HttpError(409, "TASK_NOT_OPEN", "这份任务已经不在招募中了");
        }
        const body = await readJson(request);
        const pitch = clean(body.pitch);
        const contact = clean(body.contact) || user.contact;
        if (pitch.length > 1000) throw new HttpError(422, "FIELD_TOO_LONG", "自荐说明最长 1000 字符");
        if (!contact) {
          throw new HttpError(422, "CONTACT_REQUIRED", "请填写联系方式——定了人要能找到你");
        }
        if (contact.length > 120) throw new HttpError(422, "FIELD_TOO_LONG", "联系方式最长 120 字符");
        // 顺手把联系方式补进个人资料，下次不用再填
        if (!user.contact) database.updateProfile(user.id, {
          displayName: user.display_name,
          contact,
          payee: user.payee,
          bio: user.bio,
        });
        const claim = database.upsertClaim({ taskSlug: slug, userId: user.id, pitch, contact });
        database.createAuditLog({
          actorUserId: user.id,
          action: "claim.submit",
          targetType: "task",
          targetId: slug,
        });
        reply(201, { claim: ownClaim(claim) });
        return;
      }

      if (request.method === "DELETE" && claimMatch) {
        const { user } = authenticate(request);
        const slug = decodeURIComponent(claimMatch[1]);
        const claim = database.findClaim(slug, user.id);
        if (!claim) throw new HttpError(404, "CLAIM_NOT_FOUND", "没有找到你的申请");
        if (claim.status === "accepted") {
          throw new HttpError(409, "CLAIM_ACCEPTED", "已经定了你来做，撤回请直接联系发布方");
        }
        const updated = database.setClaimStatus(claim.id, { status: "withdrawn" });
        database.createAuditLog({
          actorUserId: user.id,
          action: "claim.withdraw",
          targetType: "task",
          targetId: slug,
        });
        reply(200, { claim: ownClaim(updated) });
        return;
      }

      if (route === "GET /api/my/claims") {
        const { user } = authenticate(request);
        reply(200, { claims: database.listClaimsByUser(user.id).map(ownClaim) });
        return;
      }

      // ---------- 交付（承接人本人） ----------

      const deliveryMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/delivery$/);
      if (request.method === "POST" && deliveryMatch) {
        const { user } = authenticate(request);
        const slug = decodeURIComponent(deliveryMatch[1]);
        const task = taskOrThrow(slug);
        if (task.taker_user_id !== user.id) {
          throw new HttpError(403, "NOT_TAKER", "只有承接人可以提交交付");
        }
        if (!["taken", "done"].includes(task.status)) {
          throw new HttpError(409, "TASK_NOT_IN_PROGRESS", "当前状态不能提交交付");
        }
        const body = await readJson(request);
        const deliveryUrl = httpsUrl(body.url);
        const note = clean(body.note).slice(0, 1000);
        database.createDelivery({ taskSlug: slug, userId: user.id, url: deliveryUrl, note });
        // 交付一提交就进「完工待打款」，等发布方确认打款后收官
        transition(task, "done", {
          actorUserId: user.id,
          note: note || "提交交付",
          extra: { deliverable_url: deliveryUrl, delivered_at: Date.now() },
        });
        database.createAuditLog({
          actorUserId: user.id,
          action: "task.deliver",
          targetType: "task",
          targetId: slug,
          details: { url: deliveryUrl },
        });
        reply(201, { task: publicTask(taskOrThrow(slug)) });
        return;
      }

      // ---------- 管理台 ----------

      if (route === "GET /api/admin/overview") {
        requireAdmin(request);
        reply(200, {
          tasks: database.listTasks({ includeUnlisted: true }).map((t) => ({
            ...publicTask(t),
            seedStatus: t.seed_status,
            note: t.note,
          })),
          pendingClaims: database.listPendingClaims().map((c) => ({
            id: c.id,
            taskSlug: c.task_slug,
            taskTitle: c.task_title,
            user: c.user_display_name,
            username: c.username,
            contact: c.contact || c.user_contact,
            pitch: c.pitch,
            createdAt: c.created_at,
          })),
        });
        return;
      }

      const taskClaimsMatch = url.pathname.match(/^\/api\/admin\/tasks\/([^/]+)\/claims$/);
      if (request.method === "GET" && taskClaimsMatch) {
        requireAdmin(request);
        const slug = decodeURIComponent(taskClaimsMatch[1]);
        reply(200, {
          claims: database.listClaimsByTask(slug).map((c) => ({
            id: c.id,
            user: c.user_display_name,
            username: c.username,
            contact: c.contact || c.user_contact,
            payee: c.user_payee,
            pitch: c.pitch,
            status: c.status,
            decideNote: c.decide_note,
            createdAt: c.created_at,
            decidedAt: c.decided_at,
          })),
        });
        return;
      }

      const decideMatch = url.pathname.match(/^\/api\/admin\/claims\/([^/]+)\/(accept|reject)$/);
      if (request.method === "POST" && decideMatch) {
        const { user: admin } = requireAdmin(request);
        const claim = database.findClaimById(decodeURIComponent(decideMatch[1]));
        if (!claim) throw new HttpError(404, "CLAIM_NOT_FOUND", "申请不存在");
        const body = await readJson(request);
        const decideNote = clean(body.note).slice(0, 500);

        if (decideMatch[2] === "reject") {
          const updated = database.setClaimStatus(claim.id, {
            status: "rejected",
            decideNote,
            decidedBy: admin.id,
          });
          database.createAuditLog({
            actorUserId: admin.id,
            action: "claim.reject",
            targetType: "claim",
            targetId: claim.id,
          });
          reply(200, { claim: ownClaim(updated) });
          return;
        }

        const task = taskOrThrow(claim.task_slug);
        if (task.status !== "open") {
          throw new HttpError(409, "TASK_NOT_OPEN", "这份任务已经不在招募中，先把状态改回招募中再定人");
        }
        database.setClaimStatus(claim.id, { status: "accepted", decideNote, decidedBy: admin.id });
        const rejected = database.rejectOtherPendingClaims(task.slug, claim.id, admin.id);
        transition(task, "taken", {
          actorUserId: admin.id,
          note: decideNote || `定给 ${claim.user_display_name}`,
          extra: {
            taker_user_id: claim.user_id,
            taker_name: claim.user_display_name,
            claimed_at: Date.now(),
          },
        });
        database.createAuditLog({
          actorUserId: admin.id,
          action: "claim.accept",
          targetType: "task",
          targetId: task.slug,
          details: { claimId: claim.id, rejectedOthers: rejected },
        });
        reply(200, { task: publicTask(taskOrThrow(task.slug)), rejectedOthers: rejected });
        return;
      }

      // 站内新建任务书。发布方在管理台写完就生效——不用改 markdown，也不用等一轮构建。
      // 正文存库，详情页走 /tasks/detail/?slug=。想让它长期沉淀进 git，
      // 在管理台导出成 md 提交即可，下一次同步 md 会自动接管这份任务。
      if (route === "POST /api/admin/tasks") {
        const { user: admin } = requireAdmin(request);
        const body = await readJson(request);
        const title = taskText(body.title, "title", { required: true });
        const summary = taskText(body.summary, "summary", { required: true });
        const content = taskText(body.body, "body", { required: true });
        const fee = taskText(body.fee, "fee");
        // 发布日期由前端按本地时区送来，漏送才退回服务器当天
        const publishedAt = dateText(body.publishedAt, {
          fallback: new Date().toISOString().slice(0, 10),
        });
        const deadline = dateText(body.deadline);
        const slug = deriveSlug(database, { slug: body.slug, title, publishedAt });

        const task = database.createWebTask({
          slug,
          title,
          summary,
          fee,
          deadline,
          publishedAt,
          body: content,
        });
        database.createTaskEvent({
          taskSlug: slug,
          actorUserId: admin.id,
          fromStatus: null,
          toStatus: "open",
          note: "在站内发布",
        });
        database.createAuditLog({
          actorUserId: admin.id,
          action: "task.create",
          targetType: "task",
          targetId: slug,
          details: { title },
        });
        reply(201, { task: publicTask(task) });
        return;
      }

      const adminTaskMatch = url.pathname.match(/^\/api\/admin\/tasks\/([^/]+)$/);
      if (request.method === "PATCH" && adminTaskMatch) {
        const { user: admin } = requireAdmin(request);
        const slug = decodeURIComponent(adminTaskMatch[1]);
        const task = taskOrThrow(slug);
        const body = await readJson(request);
        const note = clean(body.note).slice(0, 500);
        const extra = {};

        if (body.takerName !== undefined) {
          // 历史任务的承接人没有站内账号，允许直接写名字
          extra.taker_name = clean(body.takerName).slice(0, 32);
          if (!extra.taker_name) extra.taker_user_id = null;
        }
        if (body.deliverableUrl !== undefined) {
          extra.deliverable_url = httpsUrl(body.deliverableUrl, { allowEmpty: true });
        }
        if (body.note !== undefined) extra.note = note;

        // 正文类字段只有站内新建的任务书能在这儿改。md 那份的真相源是 git——
        // 在管理台改了也会被下一次同步覆盖回去，与其埋这个坑不如当场说清楚。
        const CONTENT_KEYS = ["title", "summary", "fee", "deadline", "publishedAt", "body", "listed"];
        if (CONTENT_KEYS.some((key) => body[key] !== undefined)) {
          if (task.source !== "web") {
            throw new HttpError(
              409,
              "TASK_FROM_MARKDOWN",
              "这份任务书的正文归 src/data/tasks/*.md 管，改完 push 就生效",
            );
          }
          if (body.title !== undefined) extra.title = taskText(body.title, "title", { required: true });
          if (body.summary !== undefined) {
            extra.summary = taskText(body.summary, "summary", { required: true });
          }
          if (body.body !== undefined) extra.body = taskText(body.body, "body", { required: true });
          if (body.fee !== undefined) extra.fee = taskText(body.fee, "fee");
          if (body.deadline !== undefined) extra.deadline = dateText(body.deadline);
          if (body.publishedAt !== undefined) {
            extra.published_at = dateText(body.publishedAt, { fallback: task.published_at });
          }
          // 下架：页面不再展示，但认领与打款记录都还在，随时能再上架
          if (body.listed !== undefined) extra.listed = body.listed ? 1 : 0;
        }

        let updated;
        if (body.status !== undefined && body.status !== task.status) {
          const toStatus = clean(body.status);
          if (!TASK_STATUSES.includes(toStatus)) {
            throw new HttpError(422, "INVALID_STATUS", "任务状态不合法");
          }
          if (toStatus === "open") {
            // 打回招募中就是彻底重来：承接人与时间戳一并清空，避免留下矛盾数据
            Object.assign(extra, {
              taker_user_id: null,
              taker_name: "",
              claimed_at: null,
              delivered_at: null,
              paid_at: null,
            });
          }
          if (toStatus === "closed") extra.paid_at = extra.paid_at ?? Date.now();
          if (toStatus === "done") extra.delivered_at = task.delivered_at ?? Date.now();
          updated = transition(task, toStatus, { actorUserId: admin.id, note, extra });
        } else {
          updated = database.updateTask(slug, extra);
          if (note) {
            database.createTaskEvent({
              taskSlug: slug,
              actorUserId: admin.id,
              fromStatus: task.status,
              toStatus: task.status,
              note,
            });
          }
        }
        database.createAuditLog({
          actorUserId: admin.id,
          action: "task.update",
          targetType: "task",
          targetId: slug,
          details: { status: updated.status },
        });
        reply(200, { task: publicTask(updated) });
        return;
      }

      if (route === "POST /api/admin/tasks/sync") {
        requireAdmin(request);
        const result = taskSync.runOnce();
        if (!result) throw new HttpError(503, "MANIFEST_UNAVAILABLE", "任务清单读不到，检查构建产物路径");
        reply(200, { sync: result });
        return;
      }

      if (route === "GET /api/admin/users") {
        requireAdmin(request);
        reply(200, { users: database.listUsers() });
        return;
      }

      const adminUserMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
      if (request.method === "PATCH" && adminUserMatch) {
        const { user: admin } = requireAdmin(request);
        const targetId = decodeURIComponent(adminUserMatch[1]);
        const target = database.findUserById(targetId);
        if (!target) throw new HttpError(404, "USER_NOT_FOUND", "用户不存在");
        if (target.id === admin.id) {
          throw new HttpError(409, "SELF_MODIFY", "不能改自己的角色或状态，避免把自己锁在门外");
        }
        const body = await readJson(request);
        const role = ROLES.includes(clean(body.role)) ? clean(body.role) : target.role;
        const status = ["active", "suspended"].includes(clean(body.status))
          ? clean(body.status)
          : target.status;
        const updated = database.setUserFlags(target.id, { role, status });
        database.createAuditLog({
          actorUserId: admin.id,
          action: "user.update",
          targetType: "user",
          targetId: target.id,
          details: { role, status },
        });
        reply(200, { user: updated });
        return;
      }

      // 人工兜底：没有发信通道、或者用户邮箱早就不用了，发布方在管理台生成链接，
      // 通过微信/QQ 发给本人。链接和自助那条走的是同一套一次性令牌。
      const resetLinkMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/reset-link$/);
      if (request.method === "POST" && resetLinkMatch) {
        const { user: admin } = requireAdmin(request);
        const target = database.findUserById(decodeURIComponent(resetLinkMatch[1]));
        if (!target) throw new HttpError(404, "USER_NOT_FOUND", "用户不存在");
        if (target.status !== "active") {
          throw new HttpError(409, "ACCOUNT_RESTRICTED", "账号已停用，先恢复再重置");
        }
        const issued = issuePasswordReset(target, { channel: "manual", issuedBy: admin.id });
        database.createAuditLog({
          actorUserId: admin.id,
          action: "user.reset_link",
          targetType: "user",
          targetId: target.id,
        });
        reply(201, { url: issued.url, expiresAt: issued.expiresAt, username: target.username });
        return;
      }

      if (route === "GET /api/admin/audit-logs") {
        requireAdmin(request);
        reply(200, { logs: database.listAuditLogs() });
        return;
      }

      throw new HttpError(404, "NOT_FOUND", "接口不存在");
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(response, error.status, { error: error.code, message: error.message }, config, request);
        return;
      }
      log.error("[atw-platform] 未处理的异常", error);
      sendJson(response, 500, { error: "INTERNAL_ERROR", message: "服务器开小差了" }, config, request);
    }
  });

  return { server, database, taskSync };
}
