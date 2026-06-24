// 集合条目的展示层工具：标题、栏目、反向链接、URL。
import { categoryLabel } from './kb.mjs';

const BASE = import.meta.env.BASE_URL; // 形如 /above-the-web/

export function href(slug) {
  return `${BASE}${encodeURI(slug)}/`;
}

export function getTitle(note) {
  if (note.data?.title) return note.data.title;
  const m = note.body?.match(/^#\s+(.+)$/m);
  if (m) return m[1].trim();
  return note.id.split('/').pop();
}

export function getCategory(note) {
  return categoryLabel(note.id.split('/')[0]);
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
    const stem = n.id.split('/').pop();
    if (!stemToSlug.has(stem)) stemToSlug.set(stem, n.id);
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
