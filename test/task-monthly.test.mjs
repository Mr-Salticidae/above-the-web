import test from 'node:test';
import assert from 'node:assert/strict';
import { accountingDate, feeCents, monthlyReport, reportCsv } from '../src/lib/task-monthly.mjs';

const task = (extra = {}) => ({ slug: 'sample', title: '测试任务', status: 'done', taker: '甲', fee: '150 元（税前）', deliveredAt: Date.parse('2026-08-31T16:00:00Z'), paidAt: null, deliverableUrl: 'https://example.com/work', listed: true, ...extra });

test('人民币总额按分累加，复杂报酬不猜测', () => {
  for (const [text, cents] of [['150 元（税前）', 15000], ['￥1,234.56', 123456], ['0 元', 0], ['0.1', 10]]) assert.equal(feeCents(text), cents);
  for (const text of ['', '100-150 元', '150 元/篇', '100 元+40报销', '$100', '150 元（税后）', '1,00元', '999999999999999999元']) assert.equal(feeCents(text), null);
});

test('北京时间月界、跨月付款与下架任务', () => {
  const tasks = [task({ listed: false, status: 'closed', paidAt: Date.parse('2026-09-30T16:00:00Z') }), task({ slug: 'aug', deliveredAt: Date.parse('2026-08-31T15:59:59Z') })];
  assert.equal(accountingDate(tasks[0].deliveredAt), '2026-09-01');
  assert.equal(accountingDate(Date.parse('2026-12-31T16:00:00Z')), '2027-01-01');
  assert.equal(monthlyReport(tasks, { month: '2026-09' }).totals.count, 1);
  assert.equal(monthlyReport(tasks, { month: '2026-09', basis: 'payment' }).totals.count, 0);
  assert.equal(monthlyReport(tasks, { month: '2026-10', basis: 'payment' }).totals.count, 1);
});

test('缺失日期单列且不借用发布日期；金额缺失不当作零元', () => {
  const tasks = [task({ deliveredAt: null, publishedAt: '2026-09-01' }), task({ slug: 'unclear', fee: '面议' }), task({ slug: 'open', status: 'open', deliveredAt: null, deliverableUrl: '' })];
  const result = monthlyReport(tasks, { month: '2026-09' });
  assert.equal(result.undated.length, 1);
  assert.equal(result.totals.count, 1);
  assert.equal(result.totals.unknown, 1);
  assert.equal(result.totals.cents, 0);
  assert.equal(monthlyReport(tasks, { month: '2026-09', basis: 'payment' }).undated.length, 0);
});

test('同名账号不合并，承接人筛选与调整后报酬一致', () => {
  const tasks = [task({ takerUserId: 'a', fee: '190元', feeBase: '150元' }), task({ slug: 'b', takerUserId: 'b' }), task({ slug: 'c' })];
  assert.equal(monthlyReport(tasks, { month: '2026-09' }).groups.length, 3);
  const result = monthlyReport(tasks, { month: '2026-09', taker: 'user:a' });
  assert.equal(result.totals.cents, 19000);
  assert.equal(result.rows.length, 1);
});

test('CSV 含 BOM、日期缺失记录与报酬证据，并转义公式、引号和换行', () => {
  const result = monthlyReport([task({ title: '=HYPERLINK("x")', note: '两行\n备注' }), task({ slug: 'legacy', deliveredAt: null })], { month: '2026-09' });
  const csv = reportCsv(result);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('\'=HYPERLINK(""x"")'));
  assert.ok(csv.includes('"两行\n备注"'));
  assert.ok(csv.includes('日期缺失（未计入本月）'));
  assert.ok(csv.includes('150.00'));
});

test('空月和非法输入，状态日期矛盾可见', () => {
  assert.equal(monthlyReport([], { month: '2026-09' }).totals.count, 0);
  assert.throws(() => monthlyReport([], { month: '2026-13' }));
  assert.throws(() => monthlyReport([], { month: '2026-09', basis: 'other' }));
  assert.equal(accountingDate(null), '');
  const report = monthlyReport([task({ status: 'taken' })], { month: '2026-09' });
  assert.ok(report.rows[0].issues.includes('日期与当前状态需核实'));
});
