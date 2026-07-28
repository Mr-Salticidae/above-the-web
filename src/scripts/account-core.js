// 站点账号内核（浏览器侧）。
// 站点是静态站，登录态完全在客户端：token 存 localStorage，请求走 Authorization: Bearer。
// 不用 cookie —— 天然免疫 CSRF，也让 Pages 镜像跨域访问同一套 API 时行为一致。
//
// 读站不需要账号。这套东西只在两个地方起作用：认领任务、看自己的记录。
//
// 会话是「一柜多抽屉」：本地可以同时留着好几个账号的令牌，活跃的只有一个。
// 切换账号就是换个抽屉，不用重新输密码；退出登录只丢当前这一个，其余照旧。
// 每个令牌在服务端都是独立会话，退哪个就吊销哪个。

const STORE_KEY = 'atw-sessions';
// 单账号时代的键，只在首次读取时迁移一次
const LEGACY_KEYS = { token: 'atw-token', expires: 'atw-token-expires', user: 'atw-user' };

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

// ---------- 会话仓库 ----------

// 隐私模式下 localStorage 写不进去，本次会话用它兜底，刷新即失
let fallbackStore = null;

const emptyStore = () => ({ active: '', list: [] });

function migrateLegacy() {
  try {
    const token = localStorage.getItem(LEGACY_KEYS.token);
    if (!token) return emptyStore();
    const expiresAt = Number(localStorage.getItem(LEGACY_KEYS.expires) || 0) || 0;
    const raw = localStorage.getItem(LEGACY_KEYS.user);
    for (const key of Object.values(LEGACY_KEYS)) localStorage.removeItem(key);
    const user = raw ? JSON.parse(raw) : null;
    if (!user?.id) return emptyStore();
    return {
      active: user.id,
      list: [{ userId: user.id, token, expiresAt, user, lastUsedAt: Date.now() }],
    };
  } catch {
    return emptyStore();
  }
}

function prune(store) {
  const now = Date.now();
  const list = store.list.filter(
    (entry) => entry && entry.token && entry.user?.id && (!entry.expiresAt || entry.expiresAt > now),
  );
  const active = list.some((entry) => entry.userId === store.active) ? store.active : '';
  return { active, list };
}

function readStore() {
  let store = null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    store = raw ? JSON.parse(raw) : migrateLegacy();
  } catch {
    store = null;
  }
  if (!store || !Array.isArray(store.list)) store = fallbackStore || emptyStore();
  const pruned = prune(store);
  // 过期的抽屉顺手清掉，免得下次还得再判一遍
  if (pruned.list.length !== store.list.length || pruned.active !== store.active) writeStore(pruned);
  return pruned;
}

function writeStore(store) {
  fallbackStore = store;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* 写不进去也不影响本次会话 */
  }
  return store;
}

function activeEntry(store = readStore()) {
  return store.list.find((entry) => entry.userId === store.active) || null;
}

export function getToken() {
  return activeEntry()?.token || '';
}

export function getCachedUser() {
  return activeEntry()?.user || null;
}

// 登录 / 注册成功后落盘：同一个账号重复登录就覆盖旧令牌，不留两份
export function setSession({ token, expiresAt, user }) {
  if (!token || !user?.id) return null;
  const store = readStore();
  const list = store.list.filter((entry) => entry.userId !== user.id);
  list.push({ userId: user.id, token, expiresAt: Number(expiresAt) || 0, user, lastUsedAt: Date.now() });
  writeStore({ active: user.id, list });
  emitAuthChange(user);
  return user;
}

export function cacheUser(user) {
  if (!user?.id) return;
  const store = readStore();
  const entry = store.list.find((item) => item.userId === user.id);
  if (!entry) return;
  entry.user = user;
  writeStore(store);
  if (store.active === user.id) emitAuthChange(user);
}

// 只丢当前这一个账号，其余抽屉留着——切回去还是免密
export function clearSession() {
  const store = readStore();
  writeStore({ active: '', list: store.list.filter((entry) => entry.userId !== store.active) });
  emitAuthChange(null);
}

function forgetToken(token) {
  const store = readStore();
  const list = store.list.filter((entry) => entry.token !== token);
  if (list.length === store.list.length) return;
  const active = list.some((entry) => entry.userId === store.active) ? store.active : '';
  writeStore({ active, list });
  if (!active) emitAuthChange(null);
}

// 本地留着的账号，活跃的排最前，其余按最近用过排
export function listAccounts() {
  const store = readStore();
  return store.list
    .map((entry) => ({
      userId: entry.userId,
      user: entry.user,
      expiresAt: entry.expiresAt,
      lastUsedAt: entry.lastUsedAt || 0,
      isActive: entry.userId === store.active,
    }))
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.lastUsedAt - a.lastUsedAt);
}

export function hasStoredAccounts() {
  return readStore().list.length > 0;
}

// 切换账号：换抽屉 + 立刻回服务端验一次，令牌可能已在别处被吊销
export async function switchAccount(userId) {
  const store = readStore();
  const entry = store.list.find((item) => item.userId === userId);
  if (!entry) return null;
  entry.lastUsedAt = Date.now();
  writeStore({ active: userId, list: store.list });
  emitAuthChange(entry.user);
  const user = await refreshUser();
  if (!user) {
    // 令牌已失效，refreshUser 里已经把这个抽屉清掉了
    return null;
  }
  return user;
}

// 退出登录。everywhere=true 连同这个账号在其它设备上的会话一起吊销。
export async function signOut({ userId, everywhere = false } = {}) {
  const store = readStore();
  const target = store.list.find((entry) => entry.userId === (userId || store.active));
  if (target) {
    try {
      await api('POST', '/auth/logout', everywhere ? { all: true } : undefined, { token: target.token });
    } catch {
      /* 服务端不认这个会话也无妨，本地照样清干净 */
    }
  }
  const fresh = readStore();
  const list = fresh.list.filter((entry) => entry.userId !== (userId || store.active));
  const active = list.some((entry) => entry.userId === fresh.active) ? fresh.active : '';
  writeStore({ active, list });
  emitAuthChange(active ? list.find((entry) => entry.userId === active).user : null);
  return { remaining: list.length };
}

// 只从本机忘掉，不动服务端会话（换台机器还能用）
export function forgetAccount(userId) {
  const store = readStore();
  const list = store.list.filter((entry) => entry.userId !== userId);
  const active = list.some((entry) => entry.userId === store.active) ? store.active : '';
  writeStore({ active, list });
  if (active !== store.active) emitAuthChange(null);
}

function emitAuthChange(user) {
  window.dispatchEvent(new CustomEvent('atw-auth', { detail: { user } }));
}

// ---------- 请求 ----------

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || '请求失败');
    this.status = status;
    this.code = code;
  }
}

export async function api(method, path, body, options = {}) {
  const token = options.token ?? getToken();
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
    // 会话失效就地清掉，避免页面一直以「已登录」的样子挂着。
    // 挂掉的如果是别的抽屉（切换/退出时会指定 token），只丢那一个，别误伤当前登录。
    if (response.status === 401 && token) {
      if (token === getToken()) clearSession();
      else forgetToken(token);
    }
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
  // 另一个标签页登录/登出/切号后，本页跟着变
  window.addEventListener('storage', (event) => {
    if (event.key === STORE_KEY) handler(getCachedUser());
  });
}

// ---------- 页面间跳转 ----------

// next 只认站内绝对路径，挡掉 //evil.com 这类协议相对地址
export function safeNext(value) {
  const next = String(value || '');
  return next.startsWith('/') && !next.startsWith('//') ? next : '';
}

export function currentNext() {
  return safeNext(new URLSearchParams(location.search).get('next'));
}

function withParams(path, params) {
  const query = Object.entries(params)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return url(query ? `${path}?${query}` : path);
}

// add=1：本来就登录着，还想再登一个账号进来（登录页别把人弹走）
export const loginUrl = (next, { add = false } = {}) =>
  withParams('account/login/', { next: safeNext(next), add: add ? '1' : '' });
export const registerUrl = (next) => withParams('account/register/', { next: safeNext(next) });

// 需要登录的页面统一用它兜底：没登录就送去登录页，登完回来
export function requireSignIn() {
  location.replace(loginUrl(location.pathname + location.search));
}

// ---------- 展示 ----------

export function displayNameOf(user) {
  return user?.display_name || user?.username || '';
}

// 头像：没有上传功能，就用昵称首字 + 用户名算出的稳定色相，同一个人到哪儿都一个样
export function avatarOf(user) {
  const name = displayNameOf(user);
  const seed = String(user?.username || name || '?');
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  return { initial: (name[0] || '?').toUpperCase(), hue: hash };
}

export function avatarHtml(user, size = '') {
  const { initial, hue } = avatarOf(user);
  const cls = size ? ` atw-avatar-${size}` : '';
  return `<span class="atw-avatar${cls}" style="--av-hue:${hue}" aria-hidden="true">${escapeHtml(
    initial,
  )}</span>`;
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return '';
  return `${formatDate(value)} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
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

export const ROLE_LABEL = { admin: '发布方', member: '成员' };
