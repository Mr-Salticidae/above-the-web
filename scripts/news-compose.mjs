// 「AIGC 每日快讯」期刊撰写：把 news-fetch.mjs 产出的候选交给 Claude 单次结构化调用，
// 选稿 + 写中文标题/摘要，落成 src/data/news/YYYY-MM-DD.json。
//
// 为什么是「单次调用」而不是 agentic loop：
// 旧方案让模型自己 curl 抓 RSS，几十 KB 的 XML 反复在上下文里重放，单次跑到 $7、耗时 3 小时。
// 搜集是确定性工作（已由 news-fetch.mjs 完成），模型只需要做判断和改写——一次调用就够，
// 成本降到 $0.1 量级。
//
// URL 防幻觉：模型只输出候选的 id，url / source 由本脚本从候选表映射回填，
// 模型没有机会编造链接（旧方案靠 prompt 约束 + 模型自行核实，是它烧回合的另一个主因）。
//
// 用法：node scripts/news-compose.mjs --in candidates.json [--date YYYY-MM-DD] [--dry-run]
// 环境变量：NEWS_API_KEY（必需）、NEWS_API_BASE、NEWS_MODEL。
//
// 走 OpenAI 兼容协议（当前用 LongCat），故直接用 fetch，不引 SDK：全脚本零依赖。
// 换供应商时改 NEWS_API_BASE / NEWS_MODEL 即可，只要对方支持 response_format.json_schema。

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const API_BASE = process.env.NEWS_API_BASE || 'https://api.longcat.chat/openai/v1';
const MODEL = process.env.NEWS_MODEL || 'LongCat-2.0';
const NEWS_DIR = path.join('src', 'data', 'news');
const MIN_ITEMS = 5;
const MAX_ITEMS = 10;
const MAX_FEATURED = 2;

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

// 结构化输出 schema。模型只产出判断与文案，url/source 不在其中——见文件头的防幻觉说明。
// 注意 structured outputs 不支持 minItems/maxItems 等数组约束，条数在 prompt 里要求、在下面校验。
const SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: '一句话概括当天主线，编辑口吻，不超过 40 字' },
    items: {
      type: 'array',
      description: `入选新闻，${MIN_ITEMS}-${MAX_ITEMS} 条，按重要性排序`,
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: '候选列表中的 id，必须原样引用，不可臆造' },
          title: { type: 'string', description: '中文标题，专有名词保留英文，硬上限 30 个字符' },
          summary: { type: 'string', description: '中文摘要：发生了什么 + 对创作者意味着什么' },
          category: { type: 'string', enum: ['模型', '工具', '行业', '研究', '政策'] },
          featured: { type: 'boolean', description: `是否头条，全期最多 ${MAX_FEATURED} 条为 true` },
        },
        required: ['id', 'title', 'summary', 'category', 'featured'],
        additionalProperties: false,
      },
    },
  },
  required: ['headline', 'items'],
  additionalProperties: false,
};

const SYSTEM = `你是「蛛网之上」站点「AIGC 每日快讯」板块的编辑，面向中文 AIGC 创作者（做 AI 图像、视频、音乐、写作的人）。
用中文写作，专有名词保留英文（Midjourney、Sora、Claude Opus 5 这类不翻译）。
风格：克制、划重点、不做标题党，不用感叹号堆情绪，不写「震撼」「炸裂」这类营销词。`;

export function buildPrompt({ date, candidates, recentTitles }) {
  const list = candidates
    .map((c) => [
      `[${c.id}] ${c.title}`,
      `    来源：${c.source} | 时间：${c.publishedAt}`,
      c.snippet ? `    线索：${c.snippet}` : null,
    ].filter(Boolean).join('\n'))
    .join('\n\n');

  return `今天是 ${date}（北京时间）。下面是过去 48 小时抓取的 AIGC 相关新闻候选，请从中选出当日快讯。

## 候选列表

${list}

## 选稿要求

- 选 ${MIN_ITEMS}-${MAX_ITEMS} 条，按重要性排序，宁缺毋滥。
- 优先级：创作工具更新（图像/视频/音乐模型）> 大模型厂商重要发布 > 行业与政策大事。
- 跳过与 AIGC 创作无关的条目（消费电子评测、纯基础设施/芯片财经、企业管理话题、会议课程推广）。
- 同一事件被多家媒体报道时只保留信息最全的一条，不要重复选。
- 不要与最近几期已发过的新闻重复（见下方列表）。
- 如果合格新闻不足 ${MIN_ITEMS} 条，就只输出实际合格的条数，不要为凑数硬选。

## 撰写要求

- title：中文，**严格控制在 30 字以内**（这是硬上限，超出会破坏卡片排版），说清楚「谁做了什么」，
  不要用候选的英文标题直译腔。产品名尽量简写（如「Claude Opus 5」而非「Anthropic 的 Claude Opus 5」）。
- summary：2-4 句。第一句说发生了什么（具体、有信息量），最后一句说对创作者意味着什么。
  只能基于候选给出的标题和线索来写，不要编造线索里没有的细节（具体参数、价格、日期都要谨慎）。
  线索信息太少、不足以写出有价值的摘要时，宁可不选这条。
- category：模型 / 工具 / 行业 / 研究 / 政策 五选一。
- featured：最重要的 1-${MAX_FEATURED} 条标 true，其余 false。
- headline：一句话概括当天主线，≤40 字，编辑口吻。

## 最近几期已发过的新闻（避免重复）

${recentTitles.length ? recentTitles.map((t) => `- ${t}`).join('\n') : '（无）'}

请输出符合 schema 的 JSON。items 里的 id 必须原样引用候选列表中的编号。`;
}

// ── 输出解析 ──────────────────────────────────────────────────────────

// 整体 parse 优先；失败时退回「扫描出最后一个配平的 {...} 块」——
// 结果可能夹在思考文本里（见调用处关于 reasoning_content 的说明），
// 且思考文本本身常含花括号，所以从后往前找、按括号配平截取，而不是用正则。
export function extractJson(text) {
  const s = (text || '').trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch { /* 往下走扫描 */ }

  for (let end = s.lastIndexOf('}'); end !== -1; end = s.lastIndexOf('}', end - 1)) {
    let depth = 0, inStr = false, esc = false;
    for (let i = end; i >= 0; i--) {
      const ch = s[i];
      if (esc) { esc = false; continue; }
      if (inStr) {
        if (ch === '\\') { esc = true; continue; }   // 反扫时的转义判断不完美，够用即可
        if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') { inStr = true; continue; }
      if (ch === '}') depth++;
      else if (ch === '{') {
        if (--depth === 0) {
          try { return JSON.parse(s.slice(i, end + 1)); } catch { break; }
        }
      }
    }
  }
  return null;
}

// ── 校验与回填 ────────────────────────────────────────────────────────

export function assemble(result, candidates, date) {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const seen = new Set();
  const items = [];

  for (const it of result.items || []) {
    const c = byId.get(it.id);
    // id 不在候选表里 = 模型臆造，直接丢弃（防幻觉的最后一道闸）
    if (!c) { console.error(`[news-compose] ⚠ 丢弃无效 id=${it.id}（${it.title}）`); continue; }
    if (seen.has(it.id)) { console.error(`[news-compose] ⚠ 丢弃重复 id=${it.id}`); continue; }
    seen.add(it.id);
    items.push({
      title: it.title.trim(),
      summary: it.summary.trim(),
      category: it.category,
      source: c.source,   // 回填自候选，模型无从编造
      url: c.url,
      featured: Boolean(it.featured),
    });
  }

  // 标题过长不致命（卡片会换行），但持续超标说明 prompt 该调，留个信号
  const longTitles = items.filter((it) => it.title.length > 30).length;
  if (longTitles) console.error(`[news-compose] ⚠ ${longTitles} 条标题超过 30 字`);

  // featured 超额时只保留靠前的（items 已按重要性排序）
  let featured = 0;
  for (const it of items) {
    if (!it.featured) continue;
    if (++featured > MAX_FEATURED) it.featured = false;
  }
  if (featured === 0 && items.length) items[0].featured = true;

  return { date, headline: (result.headline || '').trim(), items: items.slice(0, MAX_ITEMS) };
}

// ── 主流程 ────────────────────────────────────────────────────────────

async function main() {
  const inPath = arg('in');
  if (!inPath) { console.error('[news-compose] 缺少 --in <candidates.json>'); process.exit(2); }

  const input = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  const date = arg('date', input.date);
  const candidates = input.candidates || [];

  if (candidates.length < MIN_ITEMS) {
    console.error(`[news-compose] 候选仅 ${candidates.length} 条，不足 ${MIN_ITEMS} 条，本次不出稿`);
    process.exit(3);
  }

  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) { console.error('[news-compose] 缺少环境变量 NEWS_API_KEY'); process.exit(2); }

  const prompt = buildPrompt({ date, candidates, recentTitles: input.recentTitles || [] });
  console.error(`[news-compose] 模型 ${MODEL} @ ${API_BASE}，候选 ${candidates.length} 条，prompt ≈ ${Math.round(prompt.length / 3.2)} tokens`);

  let res;
  try {
    res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'daily_issue', strict: true, schema: SCHEMA },
        },
      }),
      signal: AbortSignal.timeout(300000), // 推理模型可能思考较久
    });
  } catch (e) {
    console.error(`[news-compose] 请求失败（网络层）：${e.message}`);
    process.exit(4);
  }

  const bodyText = await res.text();
  if (!res.ok) {
    // 报错正文比堆栈有用，直接给出来
    let detail = bodyText.slice(0, 300);
    try { detail = JSON.parse(bodyText).error?.message || detail; } catch { /* 非 JSON 就用原文 */ }
    console.error(`[news-compose] API 调用失败 (HTTP ${res.status})：${detail}`);
    if (res.status === 401 || res.status === 403) console.error('[news-compose] → NEWS_API_KEY 无效或无权限');
    if (res.status === 402) console.error('[news-compose] → 账户额度不足');
    if (res.status === 404) console.error(`[news-compose] → 模型 ${MODEL} 或端点 ${API_BASE} 不存在`);
    if (res.status === 429) console.error('[news-compose] → 触发限流，稍后重跑');
    process.exit(4);
  }

  let body;
  try { body = JSON.parse(bodyText); } catch { console.error('[news-compose] 响应不是合法 JSON：', bodyText.slice(0, 300)); process.exit(5); }

  const choice = body.choices?.[0];
  if (!choice) { console.error('[news-compose] 响应缺少 choices：', bodyText.slice(0, 300)); process.exit(5); }
  if (choice.finish_reason === 'length') {
    console.error('[news-compose] 输出被 max_tokens 截断，本次不出稿');
    process.exit(4);
  }

  const u = body.usage || {};
  console.error(`[news-compose] usage: prompt=${u.prompt_tokens ?? '?'} completion=${u.completion_tokens ?? '?'}`);

  // LongCat-2.0 在 json_schema 模式下把结果放进 reasoning_content 且不返回 content
  // （2026-07-27 实测），故两个字段都要认；将来对方修好了也照样工作。
  const raw = choice.message?.content || choice.message?.reasoning_content || '';
  const parsed = extractJson(raw);
  if (!parsed) {
    console.error('[news-compose] 模型输出中找不到合法 JSON：', raw.slice(0, 400));
    process.exit(5);
  }

  const issue = assemble(parsed, candidates, date);
  if (issue.items.length < MIN_ITEMS) {
    console.error(`[news-compose] 有效条目仅 ${issue.items.length} 条，不足 ${MIN_ITEMS} 条，本次不出稿`);
    process.exit(3);
  }

  const json = `${JSON.stringify(issue, null, 2)}\n`;
  if (hasFlag('dry-run')) {
    process.stdout.write(json);
    console.error('[news-compose] --dry-run，未写文件');
    return;
  }

  fs.mkdirSync(NEWS_DIR, { recursive: true });
  const outPath = path.join(NEWS_DIR, `${date}.json`);
  fs.writeFileSync(outPath, json, 'utf8'); // UTF-8 无 BOM
  console.error(`[news-compose] 已写入 ${outPath}（${issue.items.length} 条，${issue.items.filter((i) => i.featured).length} 条头条）`);
}

// 仅在直接运行时执行；被 import 时只暴露 assemble / buildPrompt 供测试
// （argv[1] 判空：`node -e "import(...)"` 这类动态导入下它是 undefined）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
