// 文章页的渐进增强（浏览器侧）。全是锦上添花：没有 JS 时正文、目录、锚点跳转照常可用。
//   1. 标题锚点：二至四级标题尾部挂一个 #，点一下复制本节链接
//   2. 代码块复制：每个 <pre> 右上角一个「复制」按钮
//   3. 目录滚动高亮：右侧吸顶目录跟随阅读位置标出当前小节

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 非安全上下文或权限被拒：退回选区复制
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    ta.remove();
    return ok;
  }
}

function flash(el, text, ms = 1400) {
  const prev = el.dataset.label ?? el.textContent;
  el.dataset.label = prev;
  el.textContent = text;
  clearTimeout(el._flashTimer);
  el._flashTimer = setTimeout(() => { el.textContent = prev; }, ms);
}

function headingAnchors(root) {
  for (const h of root.querySelectorAll('h2[id], h3[id], h4[id]')) {
    if (h.querySelector('.h-anchor')) continue;
    const a = document.createElement('a');
    a.className = 'h-anchor';
    a.href = `#${encodeURIComponent(h.id)}`;
    // 锚点在标题元素里面，给它 aria-label 会并进标题的可访问名称，读屏的标题列表里每条都念两遍。
    // 所以对辅助技术整个隐藏：本节链接另有目录可达，这枚 # 只是给鼠标用户的快捷方式。
    a.setAttribute('aria-hidden', 'true');
    a.tabIndex = -1;
    a.title = '复制本节链接';
    a.textContent = '#';
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      const url = `${location.origin}${location.pathname}#${encodeURIComponent(h.id)}`;
      history.replaceState(null, '', `#${encodeURIComponent(h.id)}`);
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (await copyText(url)) flash(a, '已复制');
    });
    h.appendChild(a);
  }
}

function codeCopy(root) {
  for (const pre of root.querySelectorAll('pre')) {
    if (pre.parentElement?.classList.contains('code-block')) continue;
    const wrap = document.createElement('div');
    wrap.className = 'code-block';
    pre.replaceWith(wrap);
    wrap.appendChild(pre);
    const lang = pre.dataset.language;
    if (lang && !['plaintext', 'text', 'txt', 'plain'].includes(lang)) {
      const tag = document.createElement('span');
      tag.className = 'code-lang';
      tag.textContent = lang;
      wrap.appendChild(tag);
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
    btn.textContent = '复制';
    btn.setAttribute('aria-label', '复制代码');
    btn.addEventListener('click', async () => {
      flash(btn, (await copyText(pre.innerText.replace(/\n$/, ''))) ? '已复制' : '复制失败');
    });
    wrap.appendChild(btn);
  }
}

function tocSpy() {
  const links = new Map([...document.querySelectorAll('[data-toc-link]')].map((a) => [a.dataset.tocLink, a]));
  if (!links.size || !('IntersectionObserver' in window)) return;
  const headings = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  const visible = new Set();
  let current = null;
  const mark = (id) => {
    if (id === current) return;
    links.get(current)?.removeAttribute('aria-current');
    current = id;
    const a = links.get(id);
    if (!a) return;
    a.setAttribute('aria-current', 'true');
    // 目录本身很长时，让高亮项留在目录可视范围内（只滚目录，不动页面）
    const rail = a.closest('.toc-rail');
    if (rail && rail.scrollHeight > rail.clientHeight) {
      const top = a.offsetTop - rail.clientHeight / 3;
      rail.scrollTo({ top, behavior: 'smooth' });
    }
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) visible.add(e.target.id);
      else visible.delete(e.target.id);
    }
    // 视口里有标题：取最靠上的那个；一个都没有：取已经滚过去的最后一个
    const inView = headings.find((h) => visible.has(h.id));
    if (inView) return mark(inView.id);
    const passed = headings.filter((h) => h.getBoundingClientRect().top < 0).pop();
    if (passed) mark(passed.id);
  }, { rootMargin: '-10% 0px -65% 0px' });
  headings.forEach((h) => io.observe(h));
}

export function enhanceArticle(root) {
  if (!root) return;
  headingAnchors(root);
  codeCopy(root);
  tocSpy();
  // 窄屏的折叠目录：点了某一节就收起来，免得挡在正文前面
  const inline = root.querySelector('.toc-inline');
  inline?.addEventListener('click', (e) => {
    if (e.target.closest('a')) inline.open = false;
  });
}
