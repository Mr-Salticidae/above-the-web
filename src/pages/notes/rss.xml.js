// 笔记 RSS：最近发布的笔记，带全文（栏目索引页不推）。
import { getCollection } from 'astro:content';
import { renderRss } from '../../lib/feed.mjs';
import { notesFeedItems } from '../../lib/feed-items.mjs';
import { CANONICAL_ORIGIN, SITE_NAME } from '../../lib/site.mjs';

export async function GET() {
  const items = notesFeedItems(await getCollection('notes'), import.meta.env.BASE_URL);
  const body = renderRss({
    title: `${SITE_NAME} · 笔记`,
    description: '沉淀下来的 AIGC 方法论、prompt 模板、sref 档案与平台工程记录。',
    link: `${CANONICAL_ORIGIN}/notes/`,
    feedUrl: `${CANONICAL_ORIGIN}/notes/rss.xml`,
  }, items);
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
