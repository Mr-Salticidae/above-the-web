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

// 表格：卷宗里的表格密度极高（线索总表、角色配置、源资料盘点），
// 不认管道语法的渲染器会把整张表压成一行「| | --- | |」，彻底没法读。
// 只认 GFM 的标准形态：表头行 + 分隔行 + 若干数据行，且行首必须是 |。
const TABLE_DELIM_ROW = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;
const TABLE_ROW = /^\s*\|/;

function splitCells(line) {
  let text = line.trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1);
  // 只按未被转义的管道切，`\|` 留在单元格里当普通字符
  return text.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function alignOf(cell) {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return '';
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
  // 卷宗 md 普遍带 YAML frontmatter（id / name / players…），那是给机器看的索引，
  // 原样渲染就是开头一坨「id: "247" name: ...」的乱麻，先整块剥掉。
  if (/^---\s*$/.test(lines[0] ?? '')) {
    const end = lines.findIndex((line, index) => index > 0 && /^---\s*$/.test(line));
    if (end > 0 && end <= 40) lines.splice(0, end + 1);
  }
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

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
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

    // 表格块：当前行是表头、下一行是分隔行，才算数——单写一个 | 的行按普通段落处理
    if (TABLE_ROW.test(line) && lines[i + 1] && TABLE_DELIM_ROW.test(lines[i + 1])) {
      closeAll();
      const header = splitCells(line);
      const aligns = splitCells(lines[i + 1]).map(alignOf);
      const rows = [];
      let cursor = i + 2;
      while (cursor < lines.length && TABLE_ROW.test(lines[cursor])) {
        rows.push(splitCells(lines[cursor]));
        cursor += 1;
      }
      i = cursor - 1; // 归位：外层还会 ++，正好落在表格后的第一行
      const cell = (tag, text, index) => {
        const align = aligns[index] ? ` style="text-align:${aligns[index]}"` : '';
        return `<${tag}${align}>${inline(text)}</${tag}>`;
      };
      const head = `<thead><tr>${header.map((text, index) => cell('th', text, index)).join('')}</tr></thead>`;
      const body = rows.length
        ? `<tbody>${rows
            .map((row) => `<tr>${header.map((_, index) => cell('td', row[index] ?? '', index)).join('')}</tr>`)
            .join('')}</tbody>`
        : '';
      // 表格扛不住窄屏，外面套一层可横向滚动的壳，别把整页撑破
      out.push(`<div class="md-table"><table>${head}${body}</table></div>`);
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
