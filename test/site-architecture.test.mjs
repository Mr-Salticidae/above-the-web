import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGitLog, resolveNoteDates, dayOf } from '../src/lib/note-dates.mjs';
import { readingStats, formatCount } from '../src/lib/reading.mjs';
import { relatedNotes } from '../src/lib/related.mjs';
import { escapeXml, renderRss, renderJsonFeed, feedHtml, sortByDateDesc } from '../src/lib/feed.mjs';
import { sitemapEntryFromHtml, renderSitemap } from '../src/lib/sitemap.mjs';
import { stripBase, canonicalUrl, CANONICAL_ORIGIN } from '../src/lib/site.mjs';
import { articleLd, graph, serializeLd } from '../src/lib/structured-data.mjs';

test('git log -z 输出：最新一次是更新日期，最早一次是发布日期，中文路径原样', () => {
  const log = [
    '\x012026-09-20T09:35:01+08:00', '\n02_参数/A.md', '04_方法/B.md', '',
    '\x012026-09-18T19:27:44+08:00', '\n02_参数/A.md', '',
    '\x012026-08-08T19:36:37+08:00', '\n02_参数/A.md', '04_方法/子栏目/C 带空格.md', '',
  ].join('\0');
  const dates = parseGitLog(log);
  assert.deepEqual(dates['02_参数/A.md'], { created: '2026-08-08T19:36:37+08:00', updated: '2026-09-20T09:35:01+08:00' });
  assert.deepEqual(dates['04_方法/B.md'], { created: '2026-09-20T09:35:01+08:00', updated: '2026-09-20T09:35:01+08:00' });
  assert.ok(dates['04_方法/子栏目/C 带空格.md']);
  assert.deepEqual(parseGitLog(''), {});
});

test('文件名日期优先作发布日；更新日期不早于发布日；都没有时为 null', () => {
  const git = { created: '2026-06-10T10:00:00+08:00', updated: '2026-07-01T08:00:00+08:00' };
  assert.deepEqual(resolveNoteDates('2026-06-06_笔记', git), { published: '2026-06-06T00:00:00+08:00', updated: git.updated });
  assert.deepEqual(resolveNoteDates('无日期笔记', git), { published: git.created, updated: git.updated });
  // 文件名日期晚于最后一次提交（先入库、后补日期前缀）
  assert.equal(resolveNoteDates('2026-08-01_x', git).updated, '2026-08-01T00:00:00+08:00');
  assert.deepEqual(resolveNoteDates('2026-06-06_x'), { published: '2026-06-06T00:00:00+08:00', updated: '2026-06-06T00:00:00+08:00' });
  assert.deepEqual(resolveNoteDates('没有日期'), { published: null, updated: null });
  // 不存在的日子、日期后紧跟数字都不算
  assert.equal(resolveNoteDates('2026-02-30_x').published, null);
  assert.equal(resolveNoteDates('2026-06-061_x').published, null);
  assert.equal(dayOf('2026-09-20T09:35:01+08:00'), '2026-09-20');
  assert.equal(dayOf(null), '');
});

test('阅读统计：中文按字、英文按词，代码与链接地址不计', () => {
  const md = [
    '# 标题',
    '这是一段中文，共计若干字。',
    'Midjourney v8 works well with sref codes.',
    '```js\nconst notCounted = "代码里的中文不算";\n```',
    '[链接文字](https://example.com/very/long/url) 和 `行内代码`',
  ].join('\n');
  const s = readingStats(md);
  assert.equal(s.cjk, 18); // 标题 2 + 正文 11 + 链接文字 4 + 「和」1
  assert.equal(s.words, 7);
  assert.equal(s.minutes, 1);
  assert.equal(readingStats('字'.repeat(4000)).minutes, 10);
  assert.equal(readingStats('').minutes, 1);
  assert.equal(formatCount(9876), '9,876');
  assert.equal(formatCount(12345), '1.2 万');
  assert.equal(formatCount(20000), '2 万');
});

test('相关笔记：稀有标签胜过泛标签，反向链接与跳过项不推，低于阈值不硬凑', () => {
  const common = '类型/协作工具链';
  const items = [
    { id: 'a', cat: '方法', sub: null, tags: [common, '工具/ElevenLabs'], outlinks: new Set(['e']), backlinks: new Set(['d']) },
    { id: 'b', cat: '方法', sub: null, tags: [common, '工具/ElevenLabs'] },
    { id: 'c', cat: '方法', sub: null, tags: [common] },
    { id: 'd', cat: '方法', sub: null, tags: [common, '工具/ElevenLabs'] },
    { id: 'e', cat: '档案', sub: null, tags: [] },
    { id: 'f', cat: '方法', sub: null, tags: ['工具/ElevenLabs'], skip: true },
    // 凑出接近真实语料的规模：IDF 要在几百篇里才分得出「烂大街」与「稀有」
    ...Array.from({ length: 6 }, (_, i) => ({ id: `x${i}`, cat: '其他', sub: null, tags: [common] })),
    ...Array.from({ length: 24 }, (_, i) => ({ id: `y${i}`, cat: '其他', sub: null, tags: [] })),
  ];
  const rel = relatedNotes(items).get('a');
  assert.equal(rel[0], 'b');           // 共享稀有标签 + 同栏目
  assert.ok(rel.includes('e'));        // 正文 wikilink 指向
  assert.ok(!rel.includes('d'));       // 已在反向链接里
  assert.ok(!rel.includes('f'));       // 索引页之类跳过
  assert.ok(!rel.includes('x0'));      // 只共享一个烂大街标签，不够格
  assert.ok(!rel.includes('c'));       // 同栏目 + 烂大街标签，仍不够格
  assert.deepEqual(rel, ['b', 'e']);
  const sub = relatedNotes([
    { id: 'p', cat: 'S', sub: '簇', tags: [] },
    { id: 'q', cat: 'S', sub: '簇', tags: [] },
    { id: 'r', cat: 'T', sub: '簇', tags: [] },
  ]);
  assert.deepEqual(sub.get('p'), ['q']); // 同名子栏目但不同栏目不算同簇
});

test('Feed：XML 转义、CDATA 拆分、控制字符剔除，JSON Feed 字段齐全', () => {
  assert.equal(escapeXml(`<a href="x">&'</a>\u0001`), '&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;');
  const items = [{ title: 'T & <b>', link: 'https://e.com/a/', date: '2026-09-20T09:35:01+08:00', summary: 's', html: '<p>x ]]> y</p>', categories: ['方法'] }];
  const xml = renderRss({ title: '站', description: 'd', link: 'https://e.com/', feedUrl: 'https://e.com/rss.xml' }, items);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<title>T &amp; &lt;b&gt;<\/title>/);
  assert.match(xml, /<pubDate>Sun, 20 Sep 2026 01:35:01 GMT<\/pubDate>/);
  assert.match(xml, /<!\[CDATA\[<p>x \]\]\]\]><!\[CDATA\[> y<\/p>\]\]>/);
  assert.match(xml, /<lastBuildDate>Sun, 20 Sep 2026 01:35:01 GMT<\/lastBuildDate>/);
  const json = JSON.parse(renderJsonFeed({ title: '站', link: 'https://e.com/', feedUrl: 'https://e.com/feed.json' }, items));
  assert.equal(json.version, 'https://jsonfeed.org/version/1.1');
  assert.equal(json.items[0].id, 'https://e.com/a/');
  assert.equal(json.items[0].content_html, '<p>x ]]> y</p>');
  assert.deepEqual(sortByDateDesc([{ title: 'a', date: '2026-01-01' }, { title: 'b', date: '' }, { title: 'c', date: '2026-02-01' }]).map((i) => i.title), ['c', 'a', 'b']);
});

test('Feed 正文：去掉未解析的图片占位，站内链接改主站绝对地址', () => {
  const html = '<p><img __ASTRO_IMAGE_="{&#x22;src&#x22;:&#x22;a.png&#x22;}"><a href="/above-the-web/note-1/">x</a>'
    + '<a href="/above-the-web/">home</a><a href="/news/">n</a><a href="https://o.com/">o</a><a href="//cdn.x/y">p</a><a href="#s">q</a></p>';
  const out = feedHtml(html, '/above-the-web/');
  assert.ok(!out.includes('__ASTRO_IMAGE_'));
  assert.ok(out.includes(`href="${CANONICAL_ORIGIN}/note-1/"`));
  assert.ok(out.includes(`href="${CANONICAL_ORIGIN}/"`));
  assert.ok(out.includes(`href="${CANONICAL_ORIGIN}/news/"`));
  assert.ok(out.includes('href="https://o.com/"'));
  assert.ok(out.includes('href="//cdn.x/y"'));
  assert.ok(out.includes('href="#s"'));
  assert.equal(feedHtml('<a href="/x/">x</a>', '/'), `<a href="${CANONICAL_ORIGIN}/x/">x</a>`);
});

test('Sitemap：跟随页面自己声明的 noindex / canonical / 修改时间，去重排序', () => {
  const page = (extra) => `<html><head><meta charset="utf-8">${extra}</head><body><meta name="robots" content="noindex"></body></html>`;
  assert.deepEqual(
    sitemapEntryFromHtml(page('<link rel="canonical" href="https://e.com/a/?x=1&amp;y=2"><meta property="article:modified_time" content="2026-09-20T09:35:01+08:00">')),
    { loc: 'https://e.com/a/?x=1&y=2', lastmod: '2026-09-20T09:35:01+08:00' },
  );
  assert.equal(sitemapEntryFromHtml(page('<meta name="robots" content="noindex, nofollow"><link rel="canonical" href="https://e.com/b/">')), null);
  assert.equal(sitemapEntryFromHtml(page('')), null); // 没有 canonical：不登记（body 里的 robots 不算数）
  const xml = renderSitemap([
    { loc: 'https://e.com/b/', lastmod: null },
    { loc: 'https://e.com/a/', lastmod: '2026-01-01' },
    { loc: 'https://e.com/a/', lastmod: '2026-02-01' },
    null,
  ]);
  assert.equal((xml.match(/<url>/g) || []).length, 2);
  assert.ok(xml.indexOf('https://e.com/a/') < xml.indexOf('https://e.com/b/'));
  assert.ok(xml.includes('<lastmod>2026-02-01</lastmod>'));
});

test('站点地址：去 base、拼主站规范地址', () => {
  assert.equal(stripBase('/above-the-web/notes/', '/above-the-web/'), '/notes/');
  assert.equal(stripBase('/above-the-web/', '/above-the-web/'), '/');
  assert.equal(stripBase('/above-the-webx/', '/above-the-web/'), '/above-the-webx/');
  assert.equal(stripBase('/notes/', '/'), '/notes/');
  assert.equal(canonicalUrl('/notes/'), `${CANONICAL_ORIGIN}/notes/`);
  assert.equal(canonicalUrl('notes/'), `${CANONICAL_ORIGIN}/notes/`);
});

test('JSON-LD：文章节点引用站点与作者，序列化转义 < 防止提前闭合 script', () => {
  const ld = graph([articleLd({ url: 'https://e.com/a/', title: '</script><b>', published: '2026-09-20', tags: ['x', 'y'] })]);
  const types = ld['@graph'].map((n) => n['@type']);
  assert.deepEqual(types, ['WebSite', 'Person', 'BlogPosting']);
  assert.equal(ld['@graph'][2].dateModified, '2026-09-20');
  assert.equal(ld['@graph'][2].keywords, 'x, y');
  const s = serializeLd(ld);
  assert.ok(!s.includes('</script>'));
  assert.deepEqual(JSON.parse(s), ld);
});
