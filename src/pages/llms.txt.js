// llms.txt（https://llmstxt.org/）：给大模型与 AI 抓取器的一页「站点导读」。
// Markdown 格式：站点是什么、有哪些版块、每篇笔记一行（标题 + 一句摘要 + 规范地址）。
// 与 sitemap 分工：sitemap 告诉爬虫「有哪些地址」，llms.txt 告诉模型「先读哪些、讲的是什么」。
import { getCollection } from 'astro:content';
import { groupNotes } from '../lib/note-groups.mjs';
import { getIssues } from '../lib/news.mjs';
import { getEpisodes } from '../lib/prompt-master.mjs';
import { CANONICAL_ORIGIN, SITE_DESCRIPTION, SITE_NAME, SITE_NAME_EN, canonicalUrl } from '../lib/site.mjs';

const RECENT_ISSUES = 14;
const line = (title, url, desc) => `- [${title.replace(/[[\]]/g, '')}](${url})${desc ? `: ${desc}` : ''}`;

export async function GET() {
  const { groups, total } = groupNotes(await getCollection('notes'));
  const issues = getIssues();
  const episodes = getEpisodes();

  const out = [
    `# ${SITE_NAME} · ${SITE_NAME_EN}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    '内容以简体中文为主，主题是用 AI 做图像、视频、音乐时值得留下的经验：方法论、prompt 模板、sref 与参数档案、平台工程记录。',
    `笔记采用 CC BY-NC 4.0 许可（署名、非商业），引用时请注明「${SITE_NAME}」并附原文链接。`,
    '',
    '## 版块',
    '',
    line('笔记', canonicalUrl('/notes/'), `方法论、模板与档案，按主题分栏，共 ${total} 篇`),
    line('AIGC 快讯', canonicalUrl('/news/'), `每天早晨出刊的 AIGC 新闻精选，每条附来源直达，共 ${issues.length} 期`),
    line('成为 Prompt 大师', canonicalUrl('/prompt-master/'), `面向小白的 prompt 拆解连载，共 ${episodes.length} 期`),
    line('音乐', canonicalUrl('/music/'), 'AI 协作创作的歌'),
    line('任务书', canonicalUrl('/tasks/'), '对外发布的合作任务'),
    line('关于', canonicalUrl('/about/'), '站长、站点规矩、制作说明与许可'),
    '',
    '## 订阅与索引',
    '',
    line('全站 RSS', `${CANONICAL_ORIGIN}/rss.xml`, '笔记（全文）与快讯按时间混排'),
    line('JSON Feed', `${CANONICAL_ORIGIN}/feed.json`),
    line('Sitemap', `${CANONICAL_ORIGIN}/sitemap.xml`),
  ];

  for (const g of groups) {
    if (!g.count) continue;
    out.push('', `## 笔记 · ${g.cat}`, '');
    if (g.desc) out.push(g.desc, '');
    const items = [...g.loose, ...g.subs.flatMap((s) => s.items)];
    for (const n of items) out.push(line(n.title, canonicalUrl(`/${encodeURI(n.id)}/`), n.excerpt));
  }

  if (issues.length) {
    out.push('', `## AIGC 快讯 · 最近 ${Math.min(RECENT_ISSUES, issues.length)} 期`, '');
    for (const it of issues.slice(0, RECENT_ISSUES)) {
      out.push(line(`第 ${it.no} 期 · ${it.date}`, canonicalUrl(`/news/${it.date}/`), it.headline));
    }
  }

  return new Response(out.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
