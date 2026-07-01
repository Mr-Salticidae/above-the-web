// 集合条目的展示层工具：标题、栏目、反向链接、URL。
import { categoryLabel, KB_DIR } from './kb.mjs';

const BASE = import.meta.env.BASE_URL; // 形如 /above-the-web/

export function href(slug) {
  return `${BASE}${encodeURI(slug)}/`;
}

// slug 已扁平化为纯 ASCII 短串（见 slug.mjs），不再含目录层级，
// 故栏目/子栏目/文件名一律从源文件真实路径 note.filePath 派生。
// filePath 形如 kb-content/04_方法论与洞察/01_子栏目/xxx.md（相对项目根，宽容匹配前缀）。
function relParts(note) {
  const fp = (note.filePath || '').replace(/\\/g, '/');
  const marker = KB_DIR + '/';
  const i = fp.indexOf(marker);
  const rel = i >= 0 ? fp.slice(i + marker.length) : fp;
  return rel.split('/').filter(Boolean);
}

// 源文件名 stem（去 .md）——wikilink 目标与标题兜底都按它匹配
export function getStem(note) {
  const parts = relParts(note);
  return (parts.pop() || '').replace(/\.md$/i, '');
}

export function getTitle(note) {
  if (note.data?.title) return note.data.title;
  const m = note.body?.match(/^#\s+(.+)$/m);
  if (m) return m[1].trim();
  return getStem(note) || note.id;
}

export function getCategory(note) {
  return categoryLabel(relParts(note)[0] || '');
}

// 二级子栏目：取路径第二段（若该笔记位于子目录中），否则 null
export function getSubCategory(note) {
  const parts = relParts(note);
  return parts.length > 2 ? categoryLabel(parts[1]) : null;
}

export function getTags(note) {
  return Array.isArray(note.data?.tags) ? note.data.tags : [];
}

// 取正文首段非标题文本作摘要
export function getExcerpt(note, max = 90) {
  const body = note.body || '';
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('>') || t.startsWith('---') || t.startsWith('|')) continue;
    const clean = t.replace(/[*_`>#\[\]]/g, '');
    if (clean.length < 6) continue;
    return clean.length > max ? clean.slice(0, max) + '…' : clean;
  }
  return '';
}

// slug -> 指向它的笔记列表 [{slug,title}]
const WL = /\[\[([^\]]+?)\]\]/g;
export function buildBacklinks(notes) {
  const titleOf = new Map(notes.map((n) => [n.id, getTitle(n)]));
  const stemToSlug = new Map();
  for (const n of notes) {
    const stem = getStem(n); // 真实文件名 stem（wikilink 用中文 stem 引用）
    if (stem && !stemToSlug.has(stem)) stemToSlug.set(stem, n.id);
  }
  const back = new Map();
  for (const n of notes) {
    const seen = new Set();
    let m;
    WL.lastIndex = 0;
    while ((m = WL.exec(n.body || '')) !== null) {
      const target = m[1].split('|')[0].split('#')[0].trim();
      const slug = stemToSlug.get(target);
      if (slug && slug !== n.id && !seen.has(slug)) {
        seen.add(slug);
        if (!back.has(slug)) back.set(slug, []);
        back.get(slug).push({ slug: n.id, title: titleOf.get(n.id) });
      }
    }
  }
  return back;
}
