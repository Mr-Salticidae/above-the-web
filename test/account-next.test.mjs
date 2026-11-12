// 站点部署在 GitHub Pages 的 /above-the-web/ 子路径下。
// 登录回跳参数 next 只校验了「以 / 开头」，于是写死 '/juben/' 的调用方
// 会把用户送到站点根外的 404 荒野。这里把 base 归一化钉死。
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = {
  querySelector: (selector) => (String(selector).includes('atw-base') ? { content: '/above-the-web/' } : null),
};
globalThis.location = { hostname: 'example.com', search: '', pathname: '/above-the-web/juben/' };

const { safeNext, currentNext, loginUrl, withSiteBase } = await import('../src/scripts/account-core.js');

test('站点 base 下的裸路径要补齐前缀', () => {
  assert.equal(withSiteBase('/juben/'), '/above-the-web/juben/');
  assert.equal(safeNext('/juben/'), '/above-the-web/juben/');
});

test('已经带 base 的路径不重复叠加', () => {
  assert.equal(safeNext('/above-the-web/juben/'), '/above-the-web/juben/');
  assert.equal(safeNext('/above-the-web/'), '/above-the-web/');
});

test('查询串与锚点原样保留', () => {
  assert.equal(safeNext('/juben/?tab=247#top'), '/above-the-web/juben/?tab=247#top');
});

test('站点根也走 base', () => {
  assert.equal(safeNext('/'), '/above-the-web/');
});

test('协议相对与外部地址一律丢弃', () => {
  assert.equal(safeNext('//evil.com/juben'), '');
  assert.equal(safeNext('https://evil.com'), '');
  assert.equal(safeNext('javascript:alert(1)'), '');
  assert.equal(safeNext(''), '');
  assert.equal(safeNext(null), '');
});

test('登录链接里的 next 已编码带 base', () => {
  const link = loginUrl('/juben/');
  assert.match(link, /next=%2Fabove-the-web%2Fjuben%2F/);
});

test('从旧链接进来（next 没有 base）也能纠正回跳', () => {
  globalThis.location.search = '?next=%2Fjuben%2F';
  assert.equal(currentNext(), '/above-the-web/juben/');
  globalThis.location.search = '';
});

test('部署在域根时（base 为空）不做任何改写', async () => {
  globalThis.document.querySelector = () => null;
  globalThis.location.hostname = 'www.example.org';
  // 换个 specifier 拿一份新模块实例，模拟 base 为空的部署
  const root = await import('../src/scripts/account-core.js?base=root');
  assert.equal(root.safeNext('/juben/'), '/juben/');
  assert.equal(root.loginUrl('/juben/'), '/account/login/?next=%2Fjuben%2F');
});
