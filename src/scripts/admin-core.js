// 管理台各页共用的那点东西：门禁、提示、任务链接、报酬加减。
// 页面本身互不相干（申请归申请、账号归账号），共用的只有这些。
import { api, escapeHtml, getToken, loginUrl, refreshUser, url } from './account-core.js';

export function tell(selector, text, tone = 'error') {
  const node = document.querySelector(selector);
  if (!node) return;
  node.textContent = text;
  // 三种口吻：busy 进行中/ok 成功/error 出错——「保存中…」不该是红的
  node.dataset.tone = text ? tone : '';
}

export const say = (text, tone = 'error') => tell('[data-global-msg]', text, tone);

// 权限门禁。没登录、登录过期、不是发布方，各给各的话；通过了才把控制台放出来。
// 这页本身不是秘密，秘密在接口那边——前端只是别把没用的东西摆给人看。
export async function bootAdmin() {
  const gate = document.querySelector('[data-gate]');
  const view = document.querySelector('[data-console]');
  const backHere = loginUrl(location.pathname + location.search);

  if (!getToken()) {
    gate.innerHTML = `这页要用发布方账号登录。<a href="${escapeHtml(backHere)}">去登录 →</a>`;
    return null;
  }
  const user = await refreshUser();
  if (!user) {
    gate.innerHTML = `登录已过期。<a href="${escapeHtml(backHere)}">重新登录 →</a>`;
    return null;
  }
  if (user.role !== 'admin') {
    gate.innerHTML = `这页只对发布方开放。你的认领记录在<a href="${url(
      'account/',
    )}">个人中心</a>；要换个账号进来，去<a href="${escapeHtml(
      loginUrl(location.pathname + location.search, { add: true }),
    )}">登录页</a>。`;
    return null;
  }
  gate.hidden = true;
  view.hidden = false;
  return user;
}

// md 任务书有各自的静态页；站内新建的走通用详情页，靠 ?slug= 认人
export const taskHref = (t) =>
  t.source === 'web'
    ? url(`tasks/detail/?slug=${encodeURIComponent(t.slug)}`)
    : url(`tasks/${t.slug}/`);

// 报酬是自由文本（「150 元（税前）」），加钱时把里面第一个数字换掉，
// 后缀原样留着——这样「报销 40」出来的还是「190 元（税前）」，不用重打一遍。
export function bumpFee(fee, delta) {
  const text = String(fee ?? '');
  const match = /-?\d+(?:\.\d+)?/.exec(text);
  const step = Number(delta);
  if (!match || !Number.isFinite(step)) return '';
  const next = Number(match[0]) + step;
  if (!Number.isFinite(next)) return '';
  return text.replace(match[0], String(Number(next.toFixed(2))));
}

export async function loadOverview() {
  return api('GET', '/admin/overview');
}
