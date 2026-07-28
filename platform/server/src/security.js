// 账号安全内核 —— 与 vacat-platform/pb-arena-server 的 security.js 同构（有意保持一致，便于三边一起演进）。
// 密码走 scrypt + 每账号随机盐；会话令牌只存 sha256 摘要，库被拖走也拿不到可用 token。
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const PASSWORD_KEY_LENGTH = 64;

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [algorithm, salt, expectedHex] = String(storedHash).split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const expected = Buffer.from(expectedHex, "hex");
  // 长度不等时 timingSafeEqual 会抛异常，先比长度
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSessionToken() {
  return `${randomUUID()}.${randomBytes(32).toString("base64url")}`;
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
