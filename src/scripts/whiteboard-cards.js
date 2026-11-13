import { escapeHtml } from './account-core.js';

export function renderWhiteboardCards(rows, mode = 'board') {
  const isCase = mode === 'case';
  const isCaseWorkspace = mode === 'case-workspace';
  const isWorkspace = mode === 'trace' || isCaseWorkspace;
  const cards = rows.map((row) => row.split('|'));
  if (!cards.length || cards.some(([title, timing, update, evidence, image, chain, timeline, clues, guidance, extra]) =>
    !title || !timing || !update || !evidence || !image || extra !== undefined ||
    (isCaseWorkspace ? !chain || (timeline !== undefined && (!timeline || !clues || !guidance)) : chain !== undefined) ||
    (!isCase && (image.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)))
  )) return '<p>卡片暂时无法显示，请参考下方正文。</p>';

  const details = (label, content, ordered = false) => {
    const tag = ordered ? 'ol' : 'ul';
    return `<details class="md-case-detail"><summary>${label}</summary><${tag}>${content.split('；').map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}></details>`;
  };
  const slides = cards.map(([title, timing, update, evidence, image, chain, timeline, clues, guidance], index) => isWorkspace ? `
    <section class="md-trace-slide" data-whiteboard-slide${index ? ' hidden' : ''}>
      <div class="md-whiteboard-pan" tabindex="0" aria-label="当前白板图，放大后可滚动">
        <img src="data:image/svg+xml;base64,${image}" alt="${isCaseWorkspace ? escapeHtml(chain) : `第 ${index + 1} 步的完整白板，本步新增或改写处为紫色`}" decoding="async" />
      </div>
      <div class="md-trace-notes" tabindex="0" aria-label="本步说明">
        <h4>${escapeHtml(title)}</h4>
        <dl>
          <div><dt>${isCaseWorkspace ? '先问玩家' : '动笔时机'}</dt><dd>${escapeHtml(timing)}</dd></div>
          <div><dt>${isCaseWorkspace ? '核对证据' : '照着画'}</dt><dd>${escapeHtml(isCaseWorkspace ? evidence : update)}</dd></div>
          <div><dt>${isCaseWorkspace ? '本轮结论' : '更新依据'}</dt><dd>${escapeHtml(isCaseWorkspace ? update : evidence)}</dd></div>
        </dl>
        ${isCaseWorkspace && timeline ? [
          details('事件还原', timeline, true),
          details('逐条核对物证', clues),
          details('DM 提示与揭晓顺序', guidance, true),
        ].join('') : ''}
      </div>
    </section>` : `
    <section data-whiteboard-slide${index ? ' hidden' : ''}>
      <h4>${escapeHtml(title)}</h4>
      <p><strong>${isCase ? '先问玩家' : '动笔时机'}</strong>　${escapeHtml(timing)}</p>
      ${isCase
        ? `<ol class="md-case-chain" aria-label="证据链">${image.split('→').map((node) => `<li>${escapeHtml(node.trim())}</li>`).join('')}</ol>`
        : `<img src="data:image/svg+xml;base64,${image}" alt="" decoding="async" />`}
      <p><strong>${isCase ? '本轮结论' : '本阶段更新'}</strong>　${escapeHtml(update)}</p>
      <p><strong>${isCase ? '核对依据' : '更新依据'}</strong>　${escapeHtml(evidence)}</p>
    </section>`).join('');
  if (isWorkspace) {
    const heading = isCaseWorkspace ? '《虚拟游戏》案件复盘' : '《虚拟游戏》逐笔白板';
    const options = cards.map(([title], i) => `<option value="${i}">${i + 1}. ${escapeHtml(title)}</option>`).join('');
    return `<div class="md-trace-entry">
      <button type="button" data-whiteboard-open>打开${isCaseWorkspace ? '案件复盘' : '逐笔白板'} · ${cards.length} ${isCaseWorkspace ? '张' : '步'}</button>
      <dialog class="md-whiteboard-cards md-trace-workspace${isCaseWorkspace ? ' md-case-workspace' : ''}" aria-label="${heading}">
        <header class="md-trace-heading">
          <div><h3>${heading}</h3><p>${isCaseWorkspace ? '沿箭头复盘证据，图中人物与物品为示意' : '紫色是本步新增或改写的内容'}</p></div>
          <button type="button" data-whiteboard-close>返回档案</button>
        </header>
        <nav class="md-trace-nav" aria-label="${isCaseWorkspace ? '案件卡片' : '白板步骤'}">
          <button type="button" data-whiteboard-prev disabled>${isCaseWorkspace ? '上一张' : '上一步'}</button>
          <select data-whiteboard-select aria-label="${isCaseWorkspace ? '跳到案件' : '跳到步骤'}">${options}</select>
          <span data-whiteboard-count aria-live="polite">1 / ${cards.length}</span>
          <button type="button" data-whiteboard-next${cards.length === 1 ? ' disabled' : ''}>${isCaseWorkspace ? '下一张' : '下一步'}</button>
          <button type="button" data-whiteboard-zoom aria-pressed="false">${isCaseWorkspace ? '放大示意图' : '放大白板'}</button>
        </nav>
        <div class="md-trace-stage">${slides}</div>
      </dialog>
    </div>`;
  }
  return `<div class="md-whiteboard-cards">
    <nav aria-label="${isCase ? '案件推理卡' : '白板阶段卡'}">
      <button type="button" data-whiteboard-prev disabled>${isCase ? '上一张' : '上一阶段'}</button>
      <span data-whiteboard-count aria-live="polite">1 / ${cards.length}</span>
      <button type="button" data-whiteboard-next${cards.length === 1 ? ' disabled' : ''}>${isCase ? '下一张' : '下一阶段'}</button>
    </nav>
    ${slides}
  </div>`;
}

export function mountWhiteboardCards(host, { openTrace = false } = {}) {
  for (const deck of host.querySelectorAll('.md-whiteboard-cards')) {
    const slides = [...deck.querySelectorAll('[data-whiteboard-slide]')];
    const previous = deck.querySelector('[data-whiteboard-prev]');
    const next = deck.querySelector('[data-whiteboard-next]');
    const count = deck.querySelector('[data-whiteboard-count]');
    const select = deck.querySelector('[data-whiteboard-select]');
    if (select) {
      const opener = deck.parentElement.querySelector('[data-whiteboard-open]');
      const open = () => { if (!deck.open) deck.showModal(); };
      opener.addEventListener('click', open);
      deck.querySelector('[data-whiteboard-close]').addEventListener('click', () => deck.close());
      deck.addEventListener('close', () => { if (opener.isConnected) opener.focus({ preventScroll: true }); });
      if (openTrace && !deck.classList.contains('md-case-workspace')) open();
    }
    const zoom = deck.querySelector('[data-whiteboard-zoom]');
    const zoomLabel = zoom?.textContent;
    if (zoom) zoom.addEventListener('click', () => {
      const enlarged = deck.classList.toggle('is-enlarged');
      zoom.setAttribute('aria-pressed', String(enlarged));
      zoom.textContent = enlarged ? '缩回全图' : zoomLabel;
    });
    let current = 0;
    function goTo(target) {
      if (target < 0 || target >= slides.length) return;
      slides[current].hidden = true;
      current = target;
      slides[current].hidden = false;
      count.textContent = `${current + 1} / ${slides.length}`;
      if (select) {
        select.value = String(current);
        slides[current].querySelector('.md-trace-notes').scrollTop = 0;
        slides[current].querySelectorAll('.md-case-detail').forEach((item) => { item.open = false; });
      }
      const focused = deck.ownerDocument.activeElement;
      previous.disabled = current === 0;
      next.disabled = current === slides.length - 1;
      if (focused === next && next.disabled) previous.focus();
      if (focused === previous && previous.disabled) next.focus();
    }
    previous.addEventListener('click', () => goTo(current - 1));
    next.addEventListener('click', () => goTo(current + 1));
    select?.addEventListener('change', () => goTo(Number(select.value)));
  }
}
