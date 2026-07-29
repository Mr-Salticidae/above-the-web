import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./security.js";

// 任务状态机。与任务书页面上的四个标签一一对应：
//   open   招募中     —— 谁都能申请认领
//   taken  进行中     —— 已定人，其余申请自动落选
//   done   完工待打款 —— 交付已确认，钱还没付
//   closed 已收官     —— 打款完成，闭环
export const TASK_STATUSES = ["open", "taken", "done", "closed"];
export const CLAIM_STATUSES = ["pending", "accepted", "rejected", "withdrawn"];
export const ROLES = ["admin", "member"];
// 任务书从哪来：md = git 里的 markdown（构建期渲染成静态页），web = 发布方在站内新建（正文存库）
export const TASK_SOURCES = ["md", "web"];

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  -- 认领任务涉及打款，需要能联系上本人。两个字段都由用户自己填、随时可改，
  -- 只有管理员和本人能读到（列表接口一律不返回）。
  contact TEXT NOT NULL DEFAULT '',
  payee TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id, expires_at);

-- 重置密码的一次性令牌。和会话一样只存 sha256 摘要，库被拖走也换不到密码。
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL DEFAULT 'email',   -- email：用户自助；manual：发布方在管理台生成
  issued_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);

-- 任务：正文和固定元数据来自 git 里的 markdown（每次同步覆盖 seed_ 字段），
-- 状态与流转归数据库。两个源头各管各的，谁也不覆盖谁。
--
-- 例外是站内新建的任务书（source='web'）：发布方在管理台直接写，正文也存在库里，
-- 不进 git、不参与构建。同步一律绕开这类行，否则清单里没有它就会被当成「md 删了」下架。
CREATE TABLE IF NOT EXISTS tasks (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  fee TEXT NOT NULL DEFAULT '',
  deadline TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'md' CHECK (source IN ('md', 'web')),
  -- 只有 source='web' 用得上：markdown 正文。md 任务书的正文归静态页面，这里留空。
  body TEXT NOT NULL DEFAULT '',
  seed_status TEXT NOT NULL DEFAULT 'open',
  seed_taker TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'taken', 'done', 'closed')),
  taker_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  -- 历史任务的承接人没有站内账号，只有 md 里的一个名字，用这个字段兜底显示
  taker_name TEXT NOT NULL DEFAULT '',
  deliverable_url TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  claimed_at INTEGER,
  delivered_at INTEGER,
  paid_at INTEGER,
  -- md 里还在 = 1；任务书文件被删掉后置 0，页面不再展示但历史留痕不丢
  listed INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER
);

CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status, published_at DESC);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  task_slug TEXT NOT NULL REFERENCES tasks(slug) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pitch TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  decide_note TEXT NOT NULL DEFAULT '',
  decided_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  decided_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (task_slug, user_id)
);

CREATE INDEX IF NOT EXISTS claims_task_idx ON claims (task_slug, status, created_at);
CREATE INDEX IF NOT EXISTS claims_user_idx ON claims (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  task_slug TEXT NOT NULL REFERENCES tasks(slug) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  url TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS deliveries_task_idx ON deliveries (task_slug, created_at DESC);

-- 任务时间线。每次状态变更都记一条，页面上直接渲染成「谁在什么时候做了什么」。
CREATE TABLE IF NOT EXISTS task_events (
  id TEXT PRIMARY KEY,
  task_slug TEXT NOT NULL REFERENCES tasks(slug) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS task_events_task_idx ON task_events (task_slug, created_at);
`;

const PUBLIC_USER_COLUMNS =
  "id, username, display_name, email, role, status, contact, payee, bio, created_at, updated_at, last_login_at";
// 对其他用户可见的部分：联系方式与收款信息不出现在任何公开列表里
const SAFE_USER_COLUMNS = "id, username, display_name, role, status, bio, created_at";

// CREATE TABLE IF NOT EXISTS 只管建新表，线上那份老库不会因此长出新列。
// 加字段时在这里补一句 ALTER，重启即生效，不用停机导库。
function migrate(db) {
  const columns = new Set(db.prepare("PRAGMA table_info(tasks)").all().map((c) => c.name));
  if (!columns.has("source")) {
    db.exec("ALTER TABLE tasks ADD COLUMN source TEXT NOT NULL DEFAULT 'md'");
  }
  if (!columns.has("body")) {
    db.exec("ALTER TABLE tasks ADD COLUMN body TEXT NOT NULL DEFAULT ''");
  }
}

export function createDatabase(config) {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  const db = new DatabaseSync(config.dbPath);
  db.exec(SCHEMA);
  migrate(db);

  const now = () => Date.now();

  const api = {
    close() {
      db.close();
    },

    // ---------- 用户 ----------

    createUser({ username, displayName, email, passwordHash, role = "member" }) {
      const id = randomUUID();
      const ts = now();
      db.prepare(
        `INSERT INTO users (id, username, display_name, email, password_hash, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, username, displayName, email, passwordHash, role, ts, ts);
      return api.findUserById(id);
    },

    findUserById(id) {
      return db.prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = ?`).get(id) ?? null;
    },

    findUserForLogin(identifier) {
      return (
        db
          .prepare(
            `SELECT id, username, email, password_hash, role, status FROM users
             WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE`,
          )
          .get(identifier, identifier) ?? null
      );
    },

    findUserByEmail(email) {
      return (
        db
          .prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE email = ? COLLATE NOCASE`)
          .get(email) ?? null
      );
    },

    listUsers() {
      return db.prepare(`SELECT ${PUBLIC_USER_COLUMNS} FROM users ORDER BY created_at`).all();
    },

    findSafeUserById(id) {
      if (!id) return null;
      return db.prepare(`SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ?`).get(id) ?? null;
    },

    countUsers() {
      return db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
    },

    updateProfile(id, { displayName, contact, payee, bio }) {
      db.prepare(
        `UPDATE users SET display_name = ?, contact = ?, payee = ?, bio = ?, updated_at = ? WHERE id = ?`,
      ).run(displayName, contact, payee, bio, now(), id);
      return api.findUserById(id);
    },

    getPasswordHashById(id) {
      return db.prepare("SELECT password_hash FROM users WHERE id = ?").get(id)?.password_hash ?? null;
    },

    setPassword(id, passwordHash) {
      db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
        passwordHash,
        now(),
        id,
      );
    },

    setUserFlags(id, { role, status }) {
      db.prepare("UPDATE users SET role = ?, status = ?, updated_at = ? WHERE id = ?").run(
        role,
        status,
        now(),
        id,
      );
      return api.findUserById(id);
    },

    touchLastLogin(id) {
      db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(now(), id);
    },

    // ---------- 会话 ----------

    createSession({ userId, tokenHash, expiresAt }) {
      const id = randomUUID();
      db.prepare(
        `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`,
      ).run(id, userId, tokenHash, now(), expiresAt);
      return id;
    },

    findActiveSession(tokenHash) {
      return (
        db
          .prepare(
            `SELECT * FROM sessions WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?`,
          )
          .get(tokenHash, now()) ?? null
      );
    },

    revokeSession(tokenHash) {
      db.prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL").run(
        now(),
        tokenHash,
      );
    },

    // 「登录设备」列表：只列还能用的会话，吊销与过期的不给看
    listSessions(userId) {
      return db
        .prepare(
          `SELECT id, token_hash, created_at, expires_at FROM sessions
           WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?
           ORDER BY created_at DESC`,
        )
        .all(userId, now());
    },

    // 带 user_id 一起匹配：拿到别人的会话 id 也踢不动
    revokeSessionById(userId, id) {
      return (
        db
          .prepare(
            `UPDATE sessions SET revoked_at = ?
             WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
          )
          .run(now(), id, userId).changes > 0
      );
    },

    revokeAllSessions(userId) {
      return db
        .prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
        .run(now(), userId).changes;
    },

    revokeOtherSessions(userId, keepTokenHash) {
      db.prepare(
        `UPDATE sessions SET revoked_at = ?
         WHERE user_id = ? AND token_hash <> ? AND revoked_at IS NULL`,
      ).run(now(), userId, keepTokenHash);
    },

    purgeExpiredSessions() {
      db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now() - 7 * 24 * 60 * 60 * 1000);
    },

    // ---------- 重置密码 ----------

    createPasswordReset({ userId, tokenHash, expiresAt, channel = "email", issuedBy = null }) {
      const id = randomUUID();
      db.prepare(
        `INSERT INTO password_resets (id, user_id, token_hash, channel, issued_by, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, userId, tokenHash, channel, issuedBy, now(), expiresAt);
      return id;
    },

    findActivePasswordReset(tokenHash) {
      return (
        db
          .prepare(
            `SELECT r.*, u.username, u.display_name, u.email, u.status AS user_status
             FROM password_resets r JOIN users u ON u.id = r.user_id
             WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > ?`,
          )
          .get(tokenHash, now()) ?? null
      );
    },

    usePasswordReset(id) {
      return (
        db
          .prepare("UPDATE password_resets SET used_at = ? WHERE id = ? AND used_at IS NULL")
          .run(now(), id).changes > 0
      );
    },

    // 新发一张就把这个人手里没用过的旧票全作废，免得一堆链接同时有效
    invalidatePasswordResets(userId) {
      return db
        .prepare("UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL")
        .run(now(), userId).changes;
    },

    countPasswordResetsSince(userId, since) {
      return db
        .prepare("SELECT COUNT(*) AS n FROM password_resets WHERE user_id = ? AND created_at > ?")
        .get(userId, since).n;
    },

    purgeExpiredPasswordResets() {
      db.prepare("DELETE FROM password_resets WHERE expires_at < ?").run(
        now() - 7 * 24 * 60 * 60 * 1000,
      );
    },

    // ---------- 审计 ----------

    createAuditLog({ actorUserId = null, action, targetType, targetId = null, details = {} }) {
      db.prepare(
        `INSERT INTO audit_logs (id, actor_user_id, action, target_type, target_id, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(randomUUID(), actorUserId, action, targetType, targetId, JSON.stringify(details), now());
    },

    listAuditLogs(limit = 200) {
      return db
        .prepare(
          `SELECT a.*, u.display_name AS actor_name FROM audit_logs a
           LEFT JOIN users u ON u.id = a.actor_user_id
           ORDER BY a.created_at DESC LIMIT ?`,
        )
        .all(limit);
    },

    // ---------- 任务 ----------

    // 构建产物 /tasks/index.json → 数据库。新任务按 md 的 status 入库；
    // 已存在的只更新正文类字段，运行时状态一律不动。
    syncTasks(entries) {
      const ts = now();
      const seen = new Set();
      let created = 0;
      let updated = 0;
      let adopted = 0;

      const insert = db.prepare(
        `INSERT INTO tasks (slug, title, summary, fee, deadline, published_at,
                            seed_status, seed_taker, status, taker_name, deliverable_url,
                            source, listed, created_at, updated_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'md', 1, ?, ?, ?)`,
      );
      // source='md' + body='' 是「md 接管」：站内新建的任务书一旦补进了 git，
      // 正文以 md 为准，库里那份草稿退位（认领、打款这些运行时记录照旧不动）。
      const update = db.prepare(
        `UPDATE tasks SET title = ?, summary = ?, fee = ?, deadline = ?, published_at = ?,
                          seed_status = ?, seed_taker = ?, source = 'md', body = '',
                          listed = 1, synced_at = ?
         WHERE slug = ?`,
      );

      for (const entry of entries) {
        const slug = String(entry.slug || "").trim();
        if (!slug) continue;
        seen.add(slug);
        const existing = db.prepare("SELECT slug, source FROM tasks WHERE slug = ?").get(slug);
        const title = String(entry.title || "");
        const summary = String(entry.summary || "");
        const fee = String(entry.fee || "");
        const deadline = String(entry.deadline || "");
        const publishedAt = String(entry.date || "");
        const seedStatus = TASK_STATUSES.includes(entry.status) ? entry.status : "open";
        const seedTaker = String(entry.taker || "");

        if (existing) {
          update.run(title, summary, fee, deadline, publishedAt, seedStatus, seedTaker, ts, slug);
          updated += 1;
          if (existing.source === "web") adopted += 1;
        } else {
          insert.run(
            slug, title, summary, fee, deadline, publishedAt,
            seedStatus, seedTaker, seedStatus, seedTaker,
            String(entry.deliverable || ""), ts, ts, ts,
          );
          created += 1;
        }
      }

      // md 里已经删掉的任务：下架但保留记录，认领与打款历史不能凭空消失。
      // 站内新建的（source='web'）本来就不在清单里，一律不参与这一步。
      let delisted = 0;
      if (seen.size) {
        const placeholders = Array.from(seen, () => "?").join(",");
        const result = db
          .prepare(
            `UPDATE tasks SET listed = 0
             WHERE listed = 1 AND source = 'md' AND slug NOT IN (${placeholders})`,
          )
          .run(...seen);
        delisted = result.changes;
      }
      return { created, updated, adopted, delisted, total: seen.size };
    },

    // 站内新建：发布方在管理台写完就生效，不进 git、不等构建。
    // 状态一律从 open 起步——发任务的那一刻就是开始招募。
    createWebTask({ slug, title, summary, fee, deadline, publishedAt, body }) {
      const ts = now();
      db.prepare(
        `INSERT INTO tasks (slug, title, summary, fee, deadline, published_at,
                            source, body, seed_status, seed_taker, status,
                            listed, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'web', ?, 'open', '', 'open', 1, ?, ?)`,
      ).run(slug, title, summary, fee, deadline, publishedAt, body, ts, ts);
      return api.findTask(slug);
    },

    taskExists(slug) {
      return Boolean(db.prepare("SELECT 1 AS ok FROM tasks WHERE slug = ?").get(slug));
    },

    listTasks({ includeUnlisted = false } = {}) {
      const where = includeUnlisted ? "" : "WHERE t.listed = 1";
      return db
        .prepare(
          `SELECT t.*, u.display_name AS taker_display_name, u.username AS taker_username,
                  (SELECT COUNT(*) FROM claims c WHERE c.task_slug = t.slug AND c.status = 'pending') AS pending_claims
           FROM tasks t LEFT JOIN users u ON u.id = t.taker_user_id
           ${where}
           ORDER BY t.published_at DESC, t.created_at DESC`,
        )
        .all();
    },

    findTask(slug) {
      return (
        db
          .prepare(
            `SELECT t.*, u.display_name AS taker_display_name, u.username AS taker_username,
                    (SELECT COUNT(*) FROM claims c WHERE c.task_slug = t.slug AND c.status = 'pending') AS pending_claims
             FROM tasks t LEFT JOIN users u ON u.id = t.taker_user_id WHERE t.slug = ?`,
          )
          .get(slug) ?? null
      );
    },

    updateTask(slug, fields) {
      const columns = [];
      const values = [];
      for (const [key, value] of Object.entries(fields)) {
        columns.push(`${key} = ?`);
        values.push(value);
      }
      if (!columns.length) return api.findTask(slug);
      columns.push("updated_at = ?");
      values.push(now(), slug);
      db.prepare(`UPDATE tasks SET ${columns.join(", ")} WHERE slug = ?`).run(...values);
      return api.findTask(slug);
    },

    createTaskEvent({ taskSlug, actorUserId = null, fromStatus = null, toStatus, note = "" }) {
      db.prepare(
        `INSERT INTO task_events (id, task_slug, actor_user_id, from_status, to_status, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(randomUUID(), taskSlug, actorUserId, fromStatus, toStatus, note, now());
    },

    listTaskEvents(slug) {
      return db
        .prepare(
          `SELECT e.*, u.display_name AS actor_name FROM task_events e
           LEFT JOIN users u ON u.id = e.actor_user_id
           WHERE e.task_slug = ? ORDER BY e.created_at`,
        )
        .all(slug);
    },

    // ---------- 认领 ----------

    upsertClaim({ taskSlug, userId, pitch, contact }) {
      const ts = now();
      const existing = db
        .prepare("SELECT * FROM claims WHERE task_slug = ? AND user_id = ?")
        .get(taskSlug, userId);
      if (existing) {
        // 撤回后可以再申请：复用同一行，重新回到 pending
        db.prepare(
          `UPDATE claims SET pitch = ?, contact = ?, status = 'pending', decide_note = '',
                             decided_by = NULL, decided_at = NULL, updated_at = ?
           WHERE id = ?`,
        ).run(pitch, contact, ts, existing.id);
        return api.findClaimById(existing.id);
      }
      const id = randomUUID();
      db.prepare(
        `INSERT INTO claims (id, task_slug, user_id, pitch, contact, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, taskSlug, userId, pitch, contact, ts, ts);
      return api.findClaimById(id);
    },

    findClaimById(id) {
      return (
        db
          .prepare(
            `SELECT c.*, u.display_name AS user_display_name, u.username AS username,
                    u.contact AS user_contact, u.payee AS user_payee, t.title AS task_title
             FROM claims c
             JOIN users u ON u.id = c.user_id
             JOIN tasks t ON t.slug = c.task_slug
             WHERE c.id = ?`,
          )
          .get(id) ?? null
      );
    },

    findClaim(taskSlug, userId) {
      const row = db
        .prepare("SELECT id FROM claims WHERE task_slug = ? AND user_id = ?")
        .get(taskSlug, userId);
      return row ? api.findClaimById(row.id) : null;
    },

    listClaimsByTask(taskSlug) {
      return db
        .prepare(
          `SELECT c.*, u.display_name AS user_display_name, u.username AS username,
                  u.contact AS user_contact, u.payee AS user_payee
           FROM claims c JOIN users u ON u.id = c.user_id
           WHERE c.task_slug = ? ORDER BY c.created_at`,
        )
        .all(taskSlug);
    },

    listClaimsByUser(userId) {
      return db
        .prepare(
          `SELECT c.*, t.title AS task_title, t.status AS task_status, t.fee AS task_fee,
                  t.deadline AS task_deadline
           FROM claims c JOIN tasks t ON t.slug = c.task_slug
           WHERE c.user_id = ? ORDER BY c.created_at DESC`,
        )
        .all(userId);
    },

    listPendingClaims() {
      return db
        .prepare(
          `SELECT c.*, u.display_name AS user_display_name, u.username AS username,
                  u.contact AS user_contact, t.title AS task_title
           FROM claims c JOIN users u ON u.id = c.user_id JOIN tasks t ON t.slug = c.task_slug
           WHERE c.status = 'pending' ORDER BY c.created_at`,
        )
        .all();
    },

    setClaimStatus(id, { status, decideNote = "", decidedBy = null }) {
      db.prepare(
        `UPDATE claims SET status = ?, decide_note = ?, decided_by = ?, decided_at = ?, updated_at = ?
         WHERE id = ?`,
      ).run(status, decideNote, decidedBy, now(), now(), id);
      return api.findClaimById(id);
    },

    // 定了人之后，同一任务其余还在排队的申请一律落选——不留「悬着」的状态
    rejectOtherPendingClaims(taskSlug, keepClaimId, decidedBy) {
      const ts = now();
      const result = db
        .prepare(
          `UPDATE claims SET status = 'rejected', decide_note = '任务已由他人认领',
                             decided_by = ?, decided_at = ?, updated_at = ?
           WHERE task_slug = ? AND id <> ? AND status = 'pending'`,
        )
        .run(decidedBy, ts, ts, taskSlug, keepClaimId);
      return result.changes;
    },

    // ---------- 交付 ----------

    createDelivery({ taskSlug, userId, url, note }) {
      const id = randomUUID();
      db.prepare(
        `INSERT INTO deliveries (id, task_slug, user_id, url, note, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(id, taskSlug, userId, url, note, now());
      return db.prepare("SELECT * FROM deliveries WHERE id = ?").get(id);
    },

    listDeliveries(taskSlug) {
      return db
        .prepare(
          `SELECT d.*, u.display_name AS user_display_name FROM deliveries d
           LEFT JOIN users u ON u.id = d.user_id
           WHERE d.task_slug = ? ORDER BY d.created_at DESC`,
        )
        .all(taskSlug);
    },
  };

  // 首次启动建管理员。已经有用户了就不动——避免重启时把线上账号覆盖成默认口令。
  if (api.countUsers() === 0) {
    api.createUser({
      username: config.admin.username,
      displayName: config.admin.displayName,
      email: config.admin.email,
      passwordHash: hashPassword(config.admin.password),
      role: "admin",
    });
  }

  return api;
}
