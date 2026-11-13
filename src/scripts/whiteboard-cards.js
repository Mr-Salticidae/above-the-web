import { escapeHtml } from './account-core.js';

export function renderWhiteboardCards(rows, mode = 'board') {
  const isCase = mode === 'case';
  const cards = rows.map((row) => row.split('|'));
  if (!cards.length || cards.some(([title, timing, update, evidence, image, extra]) =>
    !title || !timing || !update || !evidence || !image || extra !== undefined ||
    (!isCase && (image.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)))
  )) return '<p>卡片暂时无法显示，请参考下方正文。</p>';

  const slides = cards.map(([title, timing, update, evidence, image], index) => `
    <section data-whiteboard-slide${index ? ' hidden' : ''}>
      <h4>${escapeHtml(title)}</h4>
      <p><strong>${isCase ? '先问玩家' : '动笔时机'}</strong>　${escapeHtml(timing)}</p>
      ${isCase
        ? `<ol class="md-case-chain" aria-label="证据链">${image.split('→').map((node) => `<li>${escapeHtml(node.trim())}</li>`).join('')}</ol>`
        : `<img src="data:image/svg+xml;base64,${image}" alt="" decoding="async" />`}
      <p><strong>${isCase ? '本轮结论' : '本阶段更新'}</strong>　${escapeHtml(update)}</p>
      <p><strong>${isCase ? '核对依据' : '更新依据'}</strong>　${escapeHtml(evidence)}</p>
    </section>`).join('');
  return `<div class="md-whiteboard-cards">
    <nav aria-label="${isCase ? '案件推理卡' : '白板阶段卡'}">
      <button type="button" data-whiteboard-prev disabled>${isCase ? '上一张' : '上一阶段'}</button>
      <span data-whiteboard-count aria-live="polite">1 / ${cards.length}</span>
      <button type="button" data-whiteboard-next${cards.length === 1 ? ' disabled' : ''}>${isCase ? '下一张' : '下一阶段'}</button>
    </nav>
    ${slides}
  </div>`;
}

export function mountWhiteboardCards(host) {
  for (const deck of host.querySelectorAll('.md-whiteboard-cards')) {
    const slides = [...deck.querySelectorAll('[data-whiteboard-slide]')];
    const previous = deck.querySelector('[data-whiteboard-prev]');
    const next = deck.querySelector('[data-whiteboard-next]');
    const count = deck.querySelector('[data-whiteboard-count]');
    let current = 0;
    function turn(step) {
      const target = current + step;
      if (target < 0 || target >= slides.length) return;
      slides[current].hidden = true;
      current = target;
      slides[current].hidden = false;
      count.textContent = `${current + 1} / ${slides.length}`;
      const focused = deck.ownerDocument.activeElement;
      previous.disabled = current === 0;
      next.disabled = current === slides.length - 1;
      if (focused === next && next.disabled) previous.focus();
      if (focused === previous && previous.disabled) next.focus();
    }
    previous.addEventListener('click', () => turn(-1));
    next.addEventListener('click', () => turn(1));
  }
}
