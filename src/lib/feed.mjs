// 订阅源：RSS 2.0 与 JSON Feed 1.1 的纯函数渲染。
// 笔记 / 快讯到 Feed 条目的映射在 feed-items.mjs（它依赖 Astro 的 import.meta.env，
// 放在一起会让这里没法被 node --test 直接加载）。端点只负责取数据、调这两处。
//
// 条目链接一律用主站规范地址（CANONICAL_ORIGIN）：Pages 镜像产出的 Feed 与主站一字不差，
// 阅读器按 guid 去重，不会因为从两个域订阅就收到两份。
import { CANONICAL_ORIGIN, SITE_LANG } from './site.mjs';

export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // XML 1.0 不允许的控制字符（知识库里偶有从别处粘贴来的）直接丢掉，免得整份 Feed 解析失败
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

// CDATA 里唯一的禁区是 "]]>"，拆成两段
const cdata = (html) => `<![CDATA[${String(html ?? '').replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;

// channel: { title, description, link, feedUrl }
// item:    { title, link, date(ISO), summary, html?, categories? }
export function renderRss(channel, items) {
  const newest = items.reduce((m, it) => (it.date && it.date > m ? it.date : m), '');
  const out = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    '<channel>',
    `<title>${escapeXml(channel.title)}</title>`,
    `<link>${escapeXml(channel.link)}</link>`,
    `<description>${escapeXml(channel.description)}</description>`,
    `<language>${SITE_LANG.toLowerCase()}</language>`,
    `<atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml"/>`,
    '<generator>Above the Web · src/lib/feed.mjs</generator>',
  ];
  if (newest) out.push(`<lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>`);
  for (const it of items) {
    out.push('<item>');
    out.push(`<title>${escapeXml(it.title)}</title>`);
    out.push(`<link>${escapeXml(it.link)}</link>`);
    out.push(`<guid isPermaLink="true">${escapeXml(it.link)}</guid>`);
    if (it.date) out.push(`<pubDate>${new Date(it.date).toUTCString()}</pubDate>`);
    for (const c of it.categories || []) out.push(`<category>${escapeXml(c)}</category>`);
    if (it.summary) out.push(`<description>${escapeXml(it.summary)}</description>`);
    if (it.html) out.push(`<content:encoded>${cdata(it.html)}</content:encoded>`);
    out.push('</item>');
  }
  out.push('</channel>', '</rss>');
  return out.join('\n') + '\n';
}

export function renderJsonFeed(channel, items) {
  return JSON.stringify({
    version: 'https://jsonfeed.org/version/1.1',
    title: channel.title,
    home_page_url: channel.link,
    feed_url: channel.feedUrl,
    description: channel.description,
    language: SITE_LANG,
    authors: channel.author ? [channel.author] : undefined,
    items: items.map((it) => ({
      id: it.link,
      url: it.link,
      title: it.title,
      summary: it.summary || undefined,
      content_html: it.html || undefined,
      content_text: it.html ? undefined : it.summary || it.title,
      date_published: it.date || undefined,
      date_modified: it.updated || undefined,
      tags: it.categories?.length ? it.categories : undefined,
    })),
  }, null, 2) + '\n';
}

// 条目按日期倒序；没有日期的沉底（仍保留，Feed 阅读器会按抓到的时间处理）
export function sortByDateDesc(items) {
  return [...items].sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title, 'zh'));
}

// Content Layer 渲染好的笔记 HTML 进 Feed 前的收拾：
//   · 本地图片在 rendered.html 里是 <img __ASTRO_IMAGE_=…> 占位符，要到页面渲染时才换成真图，
//     Feed 里没有那一步，直接去掉（原文链接里看得到）
//   · 站内根相对链接（wikilink 渲染出来的 /above-the-web/xxx/ 或 /xxx/）改成主站绝对地址，
//     否则在阅读器里点开会落到阅读器自己的域名下
export function feedHtml(html, base = '/') {
  const b = String(base).replace(/\/+$/, '');
  return String(html || '')
    .replace(/<img\b[^>]*\b__ASTRO_IMAGE_=[^>]*>/g, '')
    .replace(/\b(href|src)="(\/[^"]*)"/g, (m, attr, p) => {
      if (p.startsWith('//')) return m;
      const rest = b && (p === b || p.startsWith(`${b}/`)) ? p.slice(b.length) || '/' : p;
      return `${attr}="${CANONICAL_ORIGIN}${rest}"`;
    });
}
