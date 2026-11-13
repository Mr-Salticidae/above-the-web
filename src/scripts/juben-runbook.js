import { escapeHtml } from './account-core.js';

export function renderRunbook(rows) {
  const steps = rows.map((row) => row.split('|'));
  if (!steps.length || steps.some((fields) => fields.length !== 6 || fields.some((value) => !value)
    || !/^\d{1,2}$/.test(fields[1]))) return '<p>现场流程暂时无法显示。</p>';
  return `<div class="md-runbook-entry"><button type="button" data-run-open>打开现场带本 · ${steps.length} 步</button>
    <dialog class="md-whiteboard-cards md-trace-workspace md-runbook" aria-label="《虚拟游戏》现场带本">
      <header class="md-trace-heading"><h3>《虚拟游戏》现场带本</h3><button type="button" data-run-new>新开一场</button><button type="button" data-run-close>返回档案</button></header>
      <nav aria-label="现场步骤">
        <button type="button" data-run-prev disabled>上一步</button>
        <select aria-label="跳到步骤">${steps.map(([title], index) => `<option value="${index}">${index + 1}. ${escapeHtml(title)}</option>`).join('')}</select>
        <button type="button" data-run-next>下一步</button>
      </nav>
      <div class="md-run-body">
        ${steps.map(([title, minutes, say, actions, supplies, check], index) => `<section data-run-step data-minutes="${minutes}"${index ? ' hidden' : ''}>
          <h4>${escapeHtml(title)}</h4>
          ${Number(minutes) ? `<div class="md-run-timer"><output>${minutes}:00</output><span role="status"></span>
            <button type="button" data-run-clock="toggle">开始</button><button type="button" data-run-clock="add">＋5 分钟</button><button type="button" data-run-clock="reset">重置</button></div>` : ''}
          <dl><div><dt>对玩家说</dt><dd>${escapeHtml(say)}</dd></div>
          <div><dt>DM 操作</dt><dd><ol>${actions.split('；').map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol></dd></div>
          <div><dt>物料与判定</dt><dd>${escapeHtml(supplies)}</dd></div>
          <div><dt>进入下一步前</dt><dd>${escapeHtml(check)}</dd></div></dl>
        </section>`).join('')}
      </div>
    </dialog></div>`;
}

export function mountRunbook(host, autoOpen = false) {
  const entry = host.querySelector('.md-runbook-entry');
  if (!entry) return;
  const dialog = entry.querySelector('dialog');
  const steps = [...dialog.querySelectorAll('[data-run-step]')];
  const select = dialog.querySelector('select');
  const prev = dialog.querySelector('[data-run-prev]');
  const next = dialog.querySelector('[data-run-next]');
  const opener = entry.querySelector('[data-run-open]');
  const clocks = steps.map((step) => ({ left: Number(step.dataset.minutes) * 60_000, end: 0, announced: false }));
  const key = 'atw-juben-virtual-game-run-v1';
  let index = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved?.clocks) && saved.clocks.length === clocks.length) {
      saved.clocks.forEach((clock, i) => {
        if (Number(steps[i].dataset.minutes) && Number.isFinite(clock?.left) && clock.left >= 0
          && Number.isFinite(clock.end) && clock.end >= 0) clocks[i] = clock;
      });
      if (Number.isInteger(saved.index) && saved.index >= 0 && saved.index < steps.length) index = saved.index;
    }
  } catch { /* 本机存储不可用时，仍可在本页计时。 */ }
  let interval = 0;
  const save = () => {
    try { localStorage.setItem(key, JSON.stringify({ clocks, index })); } catch { /* 仅保存在当前页面。 */ }
  };
  function paint() {
    for (const [i, clock] of clocks.entries()) {
      const timer = steps[i].querySelector('.md-run-timer');
      if (!timer) continue;
      if (clock.end) {
        clock.left = Math.max(0, clock.end - Date.now());
        if (!clock.left) { clock.end = 0; clock.announced = true; save(); }
      }
      const seconds = Math.ceil(clock.left / 1000);
      timer.querySelector('output').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      const status = timer.querySelector('[role="status"]');
      const message = clock.announced ? '时间到，可结束公聊或加时。' : '';
      if (status.textContent !== message) status.textContent = message;
      timer.querySelector('[data-run-clock="toggle"]').textContent = clock.end ? '暂停' : '开始';
    }
  }
  function goTo(target) {
    if (!Number.isInteger(target) || target < 0 || target >= steps.length) return;
    steps.forEach((step, i) => { step.hidden = i !== target; });
    index = target;
    select.value = String(index);
    prev.disabled = index === 0;
    next.disabled = index === steps.length - 1;
    dialog.querySelector('.md-run-body').scrollTop = 0;
    save();
    paint();
  }
  const open = () => {
    if (dialog.open) return;
    dialog.showModal();
    paint();
    interval = setInterval(() => {
      if (!dialog.isConnected) { clearInterval(interval); return; }
      paint();
    }, 250);
  };
  opener.addEventListener('click', open);
  dialog.querySelector('[data-run-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-run-new]').addEventListener('click', () => {
    if (!window.confirm('回到开场准备并重置本场所有公聊计时？')) return;
    steps.forEach((step, i) => {
      clocks[i] = { left: Number(step.dataset.minutes) * 60_000, end: 0, announced: false };
    });
    goTo(0);
  });
  dialog.addEventListener('close', () => { clearInterval(interval); opener.focus({ preventScroll: true }); });
  prev.addEventListener('click', () => goTo(index - 1));
  next.addEventListener('click', () => goTo(index + 1));
  select.addEventListener('change', () => goTo(Number(select.value)));
  dialog.addEventListener('click', (event) => {
    const action = event.target.closest('[data-run-clock]')?.dataset.runClock;
    if (!action) return;
    paint();
    const clock = clocks[index];
    if (action === 'toggle') clock.end = clock.end ? 0 : clock.left ? Date.now() + clock.left : 0;
    if (action === 'add') {
      if (clock.end) clock.end += 300_000;
      else clock.left += 300_000;
      clock.announced = false;
    }
    if (action === 'reset') {
      clock.left = Number(steps[index].dataset.minutes) * 60_000;
      clock.end = 0;
      clock.announced = false;
    }
    save();
    paint();
  });
  goTo(index);
  if (autoOpen) open();
}
