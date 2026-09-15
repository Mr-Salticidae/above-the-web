// 对账只接受明确的人民币总额，区间、单价、附加费用留给人工核实。
export function feeCents(value) {
  const match = /^(?:[¥￥]\s*)?(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?\s*(?:元|人民币|CNY)?\s*(?:[（(]税前[）)])?$/.exec(String(value ?? '').trim());
  if (!match) return null;
  const cents = Number(match[1].replaceAll(',', '')) * 100 + Number((match[2] || '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function accountingDate(timestamp) {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) return '';
  const date = new Date(timestamp + 8 * 3600_000);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export function takerKey(task) {
  return task.takerUserId ? `user:${task.takerUserId}` : `name:${task.taker || ''}`;
}

export function monthlyReport(tasks, { month, basis = 'delivery', taker = '' }) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('请选择有效月份');
  if (!['delivery', 'payment'].includes(basis)) throw new Error('统计口径无效');
  const field = basis === 'delivery' ? 'deliveredAt' : 'paidAt';
  const rows = [];
  const undated = [];
  for (const task of tasks) {
    if (taker && takerKey(task) !== taker) continue;
    const date = accountingDate(task[field]);
    const relevant = basis === 'delivery'
      ? ['done', 'closed'].includes(task.status) || Boolean(task.deliverableUrl)
      : task.status === 'closed';
    const issues = [];
    const cents = feeCents(task.fee);
    if (cents === null) issues.push('金额待核实');
    if (!task.taker) issues.push('缺少承接人');
    if (!task.deliverableUrl) issues.push('缺少成稿链接');
    if (date && !['done', 'closed'].includes(task.status)) issues.push('日期与当前状态需核实');
    if (basis === 'payment' && date && task.status !== 'closed') issues.push('有打款日期但未结款');
    if (!date && relevant) issues.push('缺少归属日期');
    const row = { ...task, cents, date, issues };
    if (date.slice(0, 7) === month) rows.push(row);
    else if (!date && relevant) undated.push(row);
  }
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
  const groups = new Map();
  const totals = { count: rows.length, cents: 0, unknown: 0, review: 0, closed: 0 };
  for (const row of rows) {
    const key = takerKey(row);
    const group = groups.get(key) || { key, name: row.taker || '未填写', count: 0, cents: 0, unknown: 0 };
    group.count++;
    if (row.cents === null) { group.unknown++; totals.unknown++; }
    else { group.cents += row.cents; totals.cents += row.cents; }
    if (row.issues.length) totals.review++;
    if (row.status === 'closed') totals.closed++;
    groups.set(key, group);
  }
  return { month, basis, rows, undated, groups: [...groups.values()], totals };
}

const STATUS = { open: '招募中', taken: '进行中', done: '完工待打款', closed: '已结款' };
export function reportCsv(report) {
  const cell = (value) => {
    let text = String(value ?? '');
    if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = [['统计月份', '统计口径', '归属', '任务编号', '任务', '承接人', '账号ID', '当前状态', '报酬原文', '可识别金额（元）', '原报酬', '调价事由', '交付日期', '打款日期', '成稿链接', '上架状态', '核实事项', '备注']];
  for (const [scope, list] of [['本月', report.rows], ['日期缺失（未计入本月）', report.undated]]) {
    for (const t of list) rows.push([report.month, report.basis === 'delivery' ? '交付月' : '打款月', scope, t.slug, t.title, t.taker, t.takerUserId, STATUS[t.status] || t.status, t.fee, t.cents === null ? '' : (t.cents / 100).toFixed(2), t.feeBase, t.feeNote, accountingDate(t.deliveredAt), accountingDate(t.paidAt), t.deliverableUrl, t.listed ? '上架' : '下架', t.issues.join('；'), t.note]);
  }
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
