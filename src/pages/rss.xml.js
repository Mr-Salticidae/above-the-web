// 全站 RSS：笔记（全文）与 AIGC 快讯按时间混排。/notes/rss.xml、/news/rss.xml 是分栏订阅。
import { getCollection } from 'astro:content';
import { renderRss } from '../lib/feed.mjs';
import { siteFeedItems } from '../lib/feed-items.mjs';
import { getIssues } from '../lib/news.mjs';
import { CANONICAL_ORIGIN, SITE_DESCRIPTION, SITE_NAME } from '../lib/site.mjs';

export async function GET() {
  const items = siteFeedItems(await getCollection('notes'), getIssues(), import.meta.env.BASE_URL);
  const body = renderRss({
    title: `${SITE_NAME} · 全站更新`,
    description: SITE_DESCRIPTION,
    link: `${CANONICAL_ORIGIN}/`,
    feedUrl: `${CANONICAL_ORIGIN}/rss.xml`,
  }, items);
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
