// 站点账号内核（浏览器侧）。
// 站点是静态站，登录态完全在客户端：token 存 localStorage，请求走 Authorization: Bearer。
// 不用 cookie —— 天然免疫 CSRF，也让 Pages 镜像跨域访问同一套 API 时行为一致。
//
// 读站不需要账号。这套东西只在两个地方起作用：认领任务、看自己的记录。

const TOKEN_KEY = 'atw-token';
const EXPIRES_KEY = 'atw-token-expires';
const USER_KEY = 'atw-user';

export const API_BASE = (() => {
  const declared = document.querySelector('meta[name="atw-api"]')?.content;
  if (declared) return declared.replace(/\/$/, '');
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://127.0.0.1:3200/api';
  if (host.endsWith('tiaozhuxiansheng.com')) return '/api';
  // Pages 镜像等其它来源：同一套 API，跨域走 CORS 白名单
  return 'https://tiaozhuxiansheng.com/api';
})();

export const SITE_BASE = (
  document.querySelector('meta[name="atw-base"]')?.content || '/'
).replace(/\/$/, '');

export const url = (path) => `${SITE_BASE}/${String(path).replace(/^\//, '')}`;

export function getToken() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expires = Number(localStorage.getItem(EXPIRES_KEY) || 0);
    if (!token) return '';
    // 过期的 token 不必发出去挨一个 401
    if (expires && expires < Date.now()) {
      clearSession();
      return '';
    }
    return token;
  } catch {
    return '';
  }
}

export function getCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession({ token, expiresAt, user }) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (expiresAt) localStorage.setItem(EXPIRES_KEY, String(expiresAt));
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* 隐私模式下写不进去也不影响本次会话 */
  }
  emitAuthChange(user ?? getCachedUser());
}

export function cacheUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* 同上 */
  }
  emitAuthChange(user);
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* 同上 */
  }
  emitAuthChange(null);
}

function emitAuthChange(user) {
  window.dispatchEvent(new CustomEvent('atw-auth', { detail: { user } }));
}

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || '请求失败');
    this.status = status;
    this.code = code;
  }
}

export async function api(method, path, body) {
  const token = getToken();
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', '连不上服务器，稍后再试');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    // 会话失效就地清掉，避免页面一直以「已登录」的样子挂着
    if (response.status === 401) clearSession();
    throw new ApiError(response.status, payload.error || 'ERROR', payload.message);
  }
  return payload;
}

// 拉一次当前用户，顺带校验 token 还有效。没登录返回 null，不抛错。
export async function refreshUser() {
  if (!getToken()) return null;
  try {
    const { user } = await api('GET', '/auth/me');
    cacheUser(user);
    return user;
  } catch {
    return null;
  }
}

export function onAuthChange(handler) {
  window.addEventListener('atw-auth', (event) => handler(event.detail.user));
  // 另一个标签页登录/登出后，本页跟着变
  window.addEventListener('storage', (event) => {
    if (event.key === TOKEN_KEY || event.key === USER_KEY) handler(getCachedUser());
  });
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
  );
}

export const TASK_STATUS_LABEL = {
  open: '招募中',
  taken: '进行中',
  done: '完工待打款',
  closed: '已收官',
};
