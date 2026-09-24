// 阅读统计：字数与预计阅读时长。
//
// 中英混排不能只数「词」：中文按字计（约 400 字/分钟），拉丁文按词计（约 200 词/分钟），
// 两边折算成分钟再相加。代码块、链接地址、HTML 标签与 Markdown 记号都不算阅读量。
const CJK = /[㐀-䶿一-鿿豈-﫿]/g;
const LATIN_WORD = /[A-Za-z0-9]+(?:['’.-][A-Za-z0-9]+)*/g;

export const CJK_PER_MINUTE = 400;
export const WORDS_PER_MINUTE = 200;

export function stripMarkdown(md) {
  return String(md || '')
    .replace(/^---\n[\s\S]*?\n---\n?/, '')      // frontmatter（正文里一般已去掉，兜一下）
    .replace(/```[\s\S]*?(```|$)/g, ' ')         // 围栏代码块
    .replace(/`[^`\n]*`/g, ' ')                  // 行内代码
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')      // 图片
    .replace(/\]\([^)]*\)/g, ']')                // 链接地址（保留链接文字）
    .replace(/<[^>]+>/g, ' ')                    // HTML 标签
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // [[目标|别名]] 只读别名
    .replace(/https?:\/\/\S+/g, ' ');            // 裸链接
}

export function readingStats(md) {
  const text = stripMarkdown(md);
  const cjk = (text.match(CJK) || []).length;
  const words = (text.replace(CJK, ' ').match(LATIN_WORD) || []).length;
  const minutes = Math.max(1, Math.round(cjk / CJK_PER_MINUTE + words / WORDS_PER_MINUTE));
  return { cjk, words, count: cjk + words, minutes };
}

// 12345 → '1.2 万'；9876 → '9,876'
export function formatCount(n) {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, '')} 万`;
  return n.toLocaleString('en-US');
}
