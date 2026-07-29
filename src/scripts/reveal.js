// 滚动渐现：元素进入视口时淡入上移，同批错峰。
//
// 仅 JS 就绪后才隐藏（html.rv-on），无 JS / 爬虫下内容照常全量可见。
// reduced-motion（含 Windows 关掉「动画效果」的机器）不跳过，而是由 CSS 降级为纯淡入——
// 规范针对的是位移运动，透明度渐变是安全的。动画走 keyframes 而非 transition，
// 结束即摘除 rv 类，把 transform/transition 还给元素自己的 hover 动效。
export function revealOnScroll(selector) {
  if (!('IntersectionObserver' in window)) return;
  const elements = [...document.querySelectorAll(selector)];
  if (!elements.length) return;

  document.documentElement.classList.add('rv-on');
  const settle = (el) => {
    el.classList.remove('rv', 'rv-in');
    el.style.animationDelay = '';
  };
  elements.forEach((el) => {
    el.classList.add('rv');
    el.addEventListener('animationend', () => settle(el), { once: true });
  });

  const io = new IntersectionObserver(
    (entries) => {
      let batch = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        const delay = Math.min(batch++ * 70, 350);
        entry.target.style.animationDelay = `${delay}ms`;
        entry.target.classList.add('rv-in');
        // animationend 兜底（如动画被打断未回调）：超时后强制 settle，
        // 避免填充态动画压住 hover 位移
        setTimeout(() => settle(entry.target), delay + 900);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  elements.forEach((el) => io.observe(el));
}
