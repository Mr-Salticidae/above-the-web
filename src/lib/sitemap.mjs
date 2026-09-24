// Sitemap 的纯函数部分：从构建产物的 HTML 里读出「这一页该不该收录、规范地址、最后修改时间」，
// 再拼成 sitemap.xml。构建钩子见 src/integrations/sitemap.mjs。
//
// 为什么从产物 HTML 读，而不是另维护一份路由表：页面自己声明的 noindex / canonical /
// article:modified_time 就是唯一真相，sitemap 跟着页面走，新增页面零配置，也不会和页面说法打架。
import { escapeXml } from './feed.mjs';

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? m[1] : null;
};

function findTag(html, test) {
  for (const m of html.matchAll(/<(?:meta|link)\b[^>]*>/gi)) {
    if (test(m[0])) return m[0];
  }
  return null;
}

// → { loc, lastmod } | null（null 表示不进 sitemap）
export function sitemapEntryFromHtml(html) {
  const head = String(html || '').split(/<\/head>/i)[0];
  const robots = findTag(head, (t) => /\bname\s*=\s*"robots"/i.test(t));
  if (robots && /noindex/i.test(attr(robots, 'content') || '')) return null;
  const canonical = findTag(head, (t) => /^<link\b/i.test(t) && /\brel\s*=\s*"canonical"/i.test(t));
  const loc = canonical && attr(canonical, 'href');
  if (!loc) return null;
  const modified = findTag(head, (t) => /\bproperty\s*=\s*"article:modified_time"/i.test(t));
  const lastmod = modified ? attr(modified, 'content') : null;
  return { loc: decodeEntities(loc), lastmod: lastmod || null };
}

const decodeEntities = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// 同一 loc 只留一条（取最新的 lastmod），按地址排序，输出稳定、diff 友好
export function renderSitemap(entries) {
  const byLoc = new Map();
  for (const e of entries) {
    if (!e?.loc) continue;
    const prev = byLoc.get(e.loc);
    if (!prev || (e.lastmod && (!prev.lastmod || e.lastmod > prev.lastmod))) byLoc.set(e.loc, e);
  }
  const rows = [...byLoc.values()]
    .sort((a, b) => a.loc.localeCompare(b.loc))
    .map((e) => `<url><loc>${escapeXml(e.loc)}</loc>${e.lastmod ? `<lastmod>${escapeXml(e.lastmod)}</lastmod>` : ''}</url>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...rows,
    '</urlset>',
    '',
  ].join('\n');
}
