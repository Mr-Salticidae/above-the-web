// 「AIGC 每日快讯」候选抓取：并发拉多个 RSS 源，产出结构化候选列表给 news-compose.mjs 撰写。
//
// 为什么不用 Google News RSS（旧方案用它，模型再 curl 核实原文）：
// Google News 的 <link> 是加密跳转（CBMi… 新格式，base64 解不出真实 URL，
// 只能调 Google 未公开的 batchexecute 接口换取），核实原文正是旧方案烧掉几十个
// 回合、单次 $7 的主因。改抓官方/媒体自己的 RSS——<link> 直接就是可溯源的原文 URL。
//
// 用法：node scripts/news-fetch.mjs [--date YYYY-MM-DD] [--hours 48] [--out 路径]
// 默认输出到 stdout；--out 写文件。

import fs from 'node:fs';
import path from 'node:path';

// 源清单。挑选标准：<link> 是真实文章 URL、有稳定近期更新、面向 AIGC 创作者。
// 增删源直接改这里；单源抓取失败只告警不阻断（见 fetchFeed）。
// 已验证不可用而排除：Anthropic / Meta AI / Runway / ElevenLabs / Suno / Midjourney（无公开 RSS 或 403/404）、
// Unite.AI（站点已关闭 RSS）、36Kr（AI 占比过低，噪音大）。Anthropic 的发布由 The Decoder / Ars Technica 覆盖。
const FEEDS = [
  // AI 垂直媒体：对图像/视频/音乐生成工具的更新覆盖最好，是选稿主力
  { name: 'The Decoder', url: 'https://the-decoder.com/feed/' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/category/ai/feed/' },
  { name: 'Ars Technica', url: 'https://arstechnica.com/ai/feed/' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
  // 创作者向：图像/影像/设计工具的 AI 动态，补齐纯 AI 媒体不覆盖的创作工具视角
  { name: 'PetaPixel', url: 'https://petapixel.com/feed/' },
  { name: 'Creative Bloq', url: 'https://www.creativebloq.com/feeds.xml' },
  // 大厂官方：一手发布，优先级最高
  { name: 'OpenAI', url: 'https://openai.com/news/rss.xml' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml' },
  { name: 'Google', url: 'https://blog.google/technology/ai/rss/' }, // 301 → /innovation-and-ai/…，需 follow
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },
  // 中文
  { name: 'InfoQ', url: 'https://www.infoq.cn/feed' },
];

// 泛技术 / 泛创作媒体：整本 feed 不全是 AI 话题（InfoQ 有数据库和工程实践，
// PetaPixel 有相机评测），只保留标题或摘要命中 AI 关键词的条目，避免噪音挤占候选池。
const AI_FILTERED_SOURCES = new Set(['InfoQ', 'PetaPixel', 'Creative Bloq']);
const AI_KEYWORDS = /\b(ai|llm|gpt|genai|generative|diffusion|midjourney|sora|runway|kling|suno|veo|flux|stable diffusion|nano banana|openai|anthropic|claude|gemini|deepseek|qwen|hunyuan|seedance|copilot|agent)\b|AI|人工智能|大模型|生成式|智能体|多模态|扩散模型/i;

// 会议/课程推广稿与直播预告：标题带这些标记的不是新闻，命中即丢
const TITLE_DENY = [
  /[｜|]\s*(Summit|AICon|QCon|ArchSummit)/i,
  /\b(Summit|AICon|QCon|ArchSummit)\s*20\d\d\s*$/i,
  /^(圆桌访谈|直播预告|报名|招聘)/,
  /[｜|]\s*技术实践\s*$/,
];

const UA = 'Mozilla/5.0 (compatible; above-the-web-news/1.0; +https://github.com/Mr-Salticidae/above-the-web)';
const FETCH_TIMEOUT_MS = 20000;
const CONCURRENCY = 6;
// 摘要线索截断长度。模型全靠它写「发生了什么」，给够；输入 token 是本方案主要成本项，
// 但按当前候选量（20-40 条）算，600 字符也只占 ~5K token，成本增量不到 1 分钱。
const SNIPPET_CHARS = 600;

const NEWS_DIR = path.join('src', 'data', 'news');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

// 北京时间的今天（YYYY-MM-DD）
export function todayInShanghai() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
}

// ── XML 解析 ──────────────────────────────────────────────────────────
// 只做够用的正则解析：源都是标准 RSS 2.0 / Atom，为一个每日任务引入 XML 依赖不划算。

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&amp;/g, '&'); // 放最后，避免把 &amp;lt; 提前还原成 <
}

function pick(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decodeEntities(m[1]).trim() : '';
}

// RSS 用 <link>URL</link>，Atom 用 <link href="URL"/>（且常有 rel="alternate" 之外的其他 link）
function pickLink(xml) {
  const rss = xml.match(/<link[^>]*>\s*(?:<!\[CDATA\[)?\s*(https?:\/\/[^<\]\s]+)/i);
  if (rss) return decodeEntities(rss[1]).trim();
  const atom = xml.match(/<link[^>]*rel=["']alternate["'][^>]*href=["'](https?:\/\/[^"']+)/i)
    || xml.match(/<link[^>]*href=["'](https?:\/\/[^"']+)/i);
  return atom ? decodeEntities(atom[1]).trim() : '';
}

function stripHtml(s) {
  return decodeEntities(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseFeed(xml, sourceName) {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  const out = [];
  for (const b of blocks) {
    const url = pickLink(b);
    const title = stripHtml(pick(b, 'title'));
    if (!url || !title) continue;
    const dateRaw = pick(b, 'pubDate') || pick(b, 'published') || pick(b, 'updated') || pick(b, 'dc:date');
    const ts = Date.parse(dateRaw);
    // 摘要线索优先用 summary/description，退到 content（多为全文，截断即可）
    const body = pick(b, 'description') || pick(b, 'summary') || pick(b, 'content:encoded') || pick(b, 'content');
    out.push({
      title,
      url,
      source: sourceName,
      publishedAt: Number.isNaN(ts) ? null : new Date(ts).toISOString(),
      snippet: stripHtml(body).slice(0, SNIPPET_CHARS),
    });
  }
  return out;
}

// ── 抓取 ──────────────────────────────────────────────────────────────

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml, */*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[news-fetch] ${feed.name} HTTP ${res.status}，跳过`);
      return [];
    }
    const items = parseFeed(await res.text(), feed.name);
    console.error(`[news-fetch] ${feed.name}: ${items.length} 条`);
    return items;
  } catch (e) {
    // 单源失败不阻断：源随时可能改版/限流，凑够候选比源全更重要
    console.error(`[news-fetch] ${feed.name} 失败（${e.message}），跳过`);
    return [];
  }
}

async function fetchAll(feeds) {
  const results = [];
  for (let i = 0; i < feeds.length; i += CONCURRENCY) {
    const batch = await Promise.all(feeds.slice(i, i + CONCURRENCY).map(fetchFeed));
    results.push(...batch.flat());
  }
  return results;
}

// ── 归一化与去重 ──────────────────────────────────────────────────────

// 去掉跟踪参数与 hash，保证同一篇文章跨源只留一条
function canonicalUrl(u) {
  try {
    const url = new URL(u);
    url.hash = '';
    for (const k of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(k) || /^(ref|source|fbclid|gclid|mc_cid|mc_eid|f|oc)$/i.test(k)) url.searchParams.delete(k);
    }
    return url.toString().replace(/\?$/, '').replace(/\/$/, '');
  } catch {
    return u;
  }
}

function titleKey(t) {
  return t.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '').slice(0, 60);
}

// 已发期刊里出现过的 URL，避免跨期重复报道同一条
function publishedUrls() {
  const urls = new Set();
  if (!fs.existsSync(NEWS_DIR)) return urls;
  for (const f of fs.readdirSync(NEWS_DIR)) {
    if (!/\.json$/.test(f)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(NEWS_DIR, f), 'utf8'));
      for (const it of data.items || []) if (it.url) urls.add(canonicalUrl(it.url));
    } catch { /* 损坏的期刊文件不该阻断抓取 */ }
  }
  return urls;
}

// 最近几期的标题，交给模型做语义去重（同一事件被不同媒体报道时 URL 不同，去重不到）
function recentTitles(limit = 3) {
  if (!fs.existsSync(NEWS_DIR)) return [];
  const files = fs.readdirSync(NEWS_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse().slice(0, limit);
  const out = [];
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(NEWS_DIR, f), 'utf8'));
      for (const it of data.items || []) out.push(`${data.date} ${it.title}`);
    } catch { /* 同上 */ }
  }
  return out;
}

// ── 主流程 ────────────────────────────────────────────────────────────

async function main() {
  const date = arg('date', todayInShanghai());
  const hours = Number(arg('hours', '48'));
  const outPath = arg('out');

  const cutoff = Date.now() - hours * 3600 * 1000;
  const seenUrl = publishedUrls();
  const seenTitle = new Set();
  const candidates = [];

  let dropped = { stale: 0, noise: 0, offtopic: 0, dup: 0 };

  for (const item of await fetchAll(FEEDS)) {
    // 无日期的条目一律丢弃：无法判断新鲜度，宁缺毋滥
    if (!item.publishedAt || Date.parse(item.publishedAt) < cutoff) { dropped.stale++; continue; }
    if (TITLE_DENY.some((re) => re.test(item.title))) { dropped.noise++; continue; }
    if (AI_FILTERED_SOURCES.has(item.source) && !AI_KEYWORDS.test(`${item.title} ${item.snippet}`)) { dropped.offtopic++; continue; }
    const url = canonicalUrl(item.url);
    if (seenUrl.has(url)) { dropped.dup++; continue; }
    const tk = titleKey(item.title);
    if (seenTitle.has(tk)) { dropped.dup++; continue; }
    seenUrl.add(url);
    seenTitle.add(tk);
    candidates.push({ ...item, url });
  }

  // 新的在前：同等条件下优先近 24 小时的消息
  candidates.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  candidates.forEach((c, i) => { c.id = i + 1; });

  const payload = { date, hours, fetchedAt: new Date().toISOString(), recentTitles: recentTitles(), candidates };
  const json = JSON.stringify(payload, null, 2);

  console.error(
    `[news-fetch] 候选 ${candidates.length} 条（${hours} 小时内）`
    + ` | 丢弃：过期 ${dropped.stale}、推广稿 ${dropped.noise}、非 AI ${dropped.offtopic}、重复 ${dropped.dup}`,
  );
  // 候选过少多半是源集体改版或网络受限，留给 CI 一个显式信号（不 fail，让 compose 决定）
  if (candidates.length < 12) console.error(`[news-fetch] ⚠ 候选偏少，撰写质量可能受影响`);
  if (outPath) {
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    fs.writeFileSync(outPath, json, 'utf8');
    console.error(`[news-fetch] 已写入 ${outPath}`);
  } else {
    process.stdout.write(json);
  }
}

await main();
