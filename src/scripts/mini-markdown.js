// 站内新建的任务书正文是 markdown，存在数据库里，构建期看不到它，只能在浏览器侧渲染。
// 这里只认任务书真正用得上的那一小撮语法——标题、列表、引用、代码、粗斜体、链接、图片、分隔线。
// 为几份任务书打包一个完整的 markdown 引擎不划算；写不下的东西，本来就该落成 git 里的 md。
//
// 正文由发布方自己写，但仍然先转义再拼 HTML：内容进过数据库，就不再是「自己写的字符串」了。
import { escapeHtml } from './account-core.js';

// 相对路径、锚点、http(s) 与 mailto 放行，其余协议（javascript: 之流）一律当普通文本。
// 任务书里写 ../spec/ 指向教程规范是常事，不能因为它不带协议就拦掉。
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const SAFE_SCHEME = /^(https?|mailto):/i;
const safeHref = (href) => !HAS_SCHEME.test(href) || SAFE_SCHEME.test(href);
// 抠行内代码时的占位符：任务书正文里不会出现的控制字符
const PLACEHOLDER = String.fromCharCode(0);

function inline(text) {
  const codes = [];
  // 行内代码先抠出来占位，免得里面的星号方括号被当成语法
  let out = String(text).replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `${PLACEHOLDER}${codes.length - 1}${PLACEHOLDER}`;
  });
  out = escapeHtml(out);
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (whole, alt, src) =>
    safeHref(src) ? `<img src="${src}" alt="${alt}" loading="lazy" />` : whole,
  );
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label, href) => {
    if (!safeHref(href)) return whole;
    const blank = /^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${href}"${blank}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return out.replace(
    new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, 'g'),
    (_, index) => `<code>${escapeHtml(codes[Number(index)])}</code>`,
  );
}

// 段落内的软换行：中文两行之间不该冒出一个空格，只有两边都是西文时才补
function joinLines(parts) {
  return parts.reduce((text, part) => {
    if (!text) return part;
    const glue = /[A-Za-z0-9)\]"'`]$/.test(text) && /^[A-Za-z0-9([<"'`]/.test(part) ? ' ' : '';
    return text + glue + part;
  }, '');
}

export function renderMarkdown(source) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let para = [];
  let list = null;
  let quote = [];
  let fence = null;

  const closePara = () => {
    if (para.length) out.push(`<p>${inline(joinLines(para))}</p>`);
    para = [];
  };
  const closeList = () => {
    if (list) {
      out.push(`<${list.tag}>${list.items.map((item) => `<li>${inline(item)}</li>`).join('')}</${list.tag}>`);
    }
    list = null;
  };
  const closeQuote = () => {
    if (quote.length) {
      out.push(`<blockquote>${quote.map((q) => `<p>${inline(q)}</p>`).join('')}</blockquote>`);
    }
    quote = [];
  };
  const closeAll = () => {
    closePara();
    closeList();
    closeQuote();
  };
  const closeFence = () => {
    out.push(`<pre><code>${escapeHtml(fence.join('\n'))}</code></pre>`);
    fence = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');

    if (fence) {
      if (/^\s*```/.test(line)) closeFence();
      else fence.push(raw);
      continue;
    }
    if (/^\s*```/.test(line)) {
      closeAll();
      fence = [];
      continue;
    }
    if (!line.trim()) {
      closeAll();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeAll();
      // 页面上的 h1 是任务标题，正文里的标题一律从 h2 起，层级才不打架
      const level = Math.min(Math.max(heading[1].length, 2), 4);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      closeAll();
      out.push('<hr />');
      continue;
    }

    const quoted = line.match(/^>\s?(.*)$/);
    if (quoted) {
      closePara();
      closeList();
      quote.push(quoted[1]);
      continue;
    }
    closeQuote();

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      closePara();
      const tag = bullet ? 'ul' : 'ol';
      if (!list || list.tag !== tag) closeList();
      if (!list) list = { tag, items: [] };
      list.items.push((bullet || numbered)[1]);
      continue;
    }
    closeList();
    para.push(line.trim());
  }

  if (fence) closeFence();
  closeAll();
  return out.join('\n');
}
