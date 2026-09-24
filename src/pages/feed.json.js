// 全站 JSON Feed 1.1（https://jsonfeed.org/）：与 /rss.xml 同一批条目，给偏好 JSON 的阅读器与脚本用。
import { getCollection } from 'astro:content';
import { renderJsonFeed } from '../lib/feed.mjs';
import { siteFeedItems } from '../lib/feed-items.mjs';
import { getIssues } from '../lib/news.mjs';
import { AUTHOR, CANONICAL_ORIGIN, SITE_DESCRIPTION, SITE_NAME } from '../lib/site.mjs';

export async function GET() {
  const items = siteFeedItems(await getCollection('notes'), getIssues(), import.meta.env.BASE_URL);
  const body = renderJsonFeed({
    title: `${SITE_NAME} · 全站更新`,
    description: SITE_DESCRIPTION,
    link: `${CANONICAL_ORIGIN}/`,
    feedUrl: `${CANONICAL_ORIGIN}/feed.json`,
    author: { name: AUTHOR.name, url: AUTHOR.url },
  }, items);
  return new Response(body, { headers: { 'Content-Type': 'application/feed+json; charset=utf-8' } });
}
