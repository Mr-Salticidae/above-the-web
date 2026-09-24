// AIGC 快讯 RSS：一期一条，正文是当期全部条目（每条附来源直达）。
// 快讯子站 / Toy 包只搬 news/ 下的期刊目录，这个文件不会进它们的产物。
import { renderRss } from '../../lib/feed.mjs';
import { newsFeedItems } from '../../lib/feed-items.mjs';
import { getIssues } from '../../lib/news.mjs';
import { CANONICAL_ORIGIN, SITE_NAME } from '../../lib/site.mjs';

export function GET() {
  const body = renderRss({
    title: `${SITE_NAME} · AIGC 快讯`,
    description: '每日更新的 AIGC 领域新闻精选：模型发布、创作工具更新、行业动态，为创作者划重点。',
    link: `${CANONICAL_ORIGIN}/news/`,
    feedUrl: `${CANONICAL_ORIGIN}/news/rss.xml`,
  }, newsFeedItems(getIssues()));
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
