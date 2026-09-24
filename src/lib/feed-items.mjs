// 把笔记 / 快讯期刊映射成 Feed 条目（渲染见 feed.mjs）。
import { CANONICAL_ORIGIN } from './site.mjs';
import { escapeXml, feedHtml, sortByDateDesc } from './feed.mjs';
import { getTitle, getCategory, getTags, getExcerpt, getDates, isIndexNote } from './notes.mjs';
import { formatDate } from './news.mjs';

export function noteToFeedItem(note, { base = '/', full = true } = {}) {
  const { published, updated } = getDates(note);
  const category = getCategory(note);
  return {
    title: getTitle(note),
    link: `${CANONICAL_ORIGIN}/${encodeURI(note.id)}/`,
    date: published,
    updated,
    summary: getExcerpt(note, 160),
    html: full ? feedHtml(note.rendered?.html, base) : '',
    categories: [category, ...getTags(note)].filter(Boolean),
  };
}

// 可进 Feed 的笔记：栏目索引页是导航，不是文章，不推给订阅者
export const feedableNotes = (notes) => notes.filter((n) => !isIndexNote(n));

export function issueToFeedItem(issue) {
  const list = issue.items
    .map((it) => `<li><p><strong>[${escapeXml(it.category)}] <a href="${escapeXml(it.url)}">${escapeXml(it.title)}</a></strong></p>`
      + `<p>${escapeXml(it.summary)}</p><p>来源：${escapeXml(it.source)}</p></li>`)
    .join('');
  return {
    title: `AIGC 快讯 第 ${issue.no} 期 · ${formatDate(issue.date)}`,
    link: `${CANONICAL_ORIGIN}/news/${issue.date}/`,
    // 快讯每天早晨出刊，按北京时间 09:30 记
    date: `${issue.date}T09:30:00+08:00`,
    summary: issue.headline || `${issue.items.length} 条 AIGC 领域新闻精选`,
    html: `${issue.headline ? `<p>${escapeXml(issue.headline)}</p>` : ''}<ol>${list}</ol>`,
    categories: ['AIGC 快讯'],
  };
}

// 各 Feed 的条目数：笔记带全文，数量克制；快讯一天一期，留一个月
export const FEED_LIMITS = { notes: 30, news: 30, site: 40 };

export function notesFeedItems(notes, base) {
  return sortByDateDesc(feedableNotes(notes).map((n) => noteToFeedItem(n, { base }))).slice(0, FEED_LIMITS.notes);
}

export function newsFeedItems(issues) {
  return issues.slice(0, FEED_LIMITS.news).map(issueToFeedItem);
}

// 全站：笔记与快讯按时间混排
export function siteFeedItems(notes, issues, base) {
  return sortByDateDesc([...notesFeedItems(notes, base), ...newsFeedItems(issues)]).slice(0, FEED_LIMITS.site);
}
