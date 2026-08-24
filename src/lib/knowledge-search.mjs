// Pagefind 对包含多个词的查询偏严格。聊天问题通常还带着“怎样、请问、有哪些”等口语成分，
// 直接整句搜索很容易把本来存在的笔记筛成 0 条。这里仅负责把自然语言问题降级成少量检索词，
// 不改写用户问题，也不参与最终回答。

const LATIN_TOKEN_RE = /[A-Za-z][A-Za-z0-9+_.-]{1,31}/g;
const FILLER_RE = /(?:请问|请帮我|帮我|我想知道|想知道|想了解|告诉我|讲讲|介绍一下|介绍|分析一下|解释一下|能不能|能否|是否|可以|怎样|如何|怎么|为什么|为何|常见的|相关的|具体的|主要的|有哪些|有什么|是什么|应该|最好|保持|进行)/g;
// 容器词：读者是在问「这座知识库」，所以「这个 / 知识库 / 笔记 / 关于」描述的是容器，不是主题。
// 这些词偏偏是本库的强索引词（库里就有讲知识库沉淀与分发的笔记），不剥掉的话，
// 「这个知识库里有哪些关于 Midjourney 的笔记」会被它们带去知识库维护那一堆，真正的 Midjourney 反而挤不进来。
const META_RE = /(?:这个|这些|那个|那些|这里|那里|本站|站内|库里|知识库|笔记|文章|文档|资料|内容|里面|关于|有没有|没有|哪些|什么|一些|以及|说说)/g;
const TRAILING_CONTEXT_RE = /(?:的时候|方面|过程中|时|中|里|上|下)$/;
// strict 命中少于这个数就补一轮放宽：整句偶尔会擦中一两篇索引页就此短路，
// 「知识库里关于 sref 的笔记」只捞回一篇「方法论与洞察索引」正是这么来的。
const MIN_STRICT_HITS = 3;

function uniquePush(output, seen, value) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  const key = clean.toLocaleLowerCase();
  if (clean.length < 2 || seen.has(key)) return;
  seen.add(key);
  output.push(clean);
}

function chineseChunks(text) {
  return (text.match(/[\p{Script=Han}]{2,}/gu) || [])
    .map((chunk) => {
      const trimmed = chunk.replace(TRAILING_CONTEXT_RE, '');
      return [...trimmed].length >= 2 ? trimmed : chunk;
    })
    .filter((chunk) => [...chunk].length >= 2)
    .sort((a, b) => [...b].length - [...a].length);
}

export function buildRelaxedSearchQueries(question, limit = 5) {
  const clean = String(question || '').normalize('NFKC').replace(/[，。！？、；：,.!?;:()（）【】\[\]“”"'`]/g, ' ');
  const latin = clean.match(LATIN_TOKEN_RE) || [];
  const withoutLatin = clean.replace(LATIN_TOKEN_RE, ' ').replace(FILLER_RE, ' ');
  // 先按剥掉容器词的版本取块。剥空了说明整句只剩框架：这时有工具名就只认工具名
  // （「知识库里关于 sref 的笔记」→ 只搜 sref），一个工具名都没有才退回未剥的块，
  // 否则会连一条候选查询都不剩。
  const stripped = chineseChunks(withoutLatin.replace(META_RE, ' '));
  const chinese = stripped.length ? stripped : latin.length ? [] : chineseChunks(withoutLatin);

  const output = [];
  const seen = new Set();
  chinese.forEach((chunk) => uniquePush(output, seen, chunk));
  if (latin.length > 1) uniquePush(output, seen, latin.join(' '));
  latin.forEach((token) => uniquePush(output, seen, token));
  return output.slice(0, Math.max(1, limit));
}

// 先给每条查询保底一席，再按顺序把余额贪心填满。
// 纯贪心时，排在前面的那条查询会把 6 个名额一口吃光——问 Midjourney 却只召回
// 「这个知识库」命中的一堆笔记，就是这么来的。保底一席让每条查询都至少露一面，
// 余额仍按语义强弱的顺序分配，精准查询照样占多数席位。
export function mergeSearchHitGroups(groups, limit = 6) {
  const output = [];
  const seen = new Set();
  const take = (hit) => {
    const id = String(hit?.id || '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    output.push(hit);
    return true;
  };

  for (const group of groups) {
    if (output.length >= limit) return output;
    for (const hit of group || []) if (take(hit)) break;
  }
  for (const group of groups) {
    for (const hit of (group || []).slice(0, limit * 2)) {
      if (output.length >= limit) return output;
      take(hit);
    }
  }
  return output;
}

export async function searchPagefindNotes(pagefind, query, { filters = { type: 'note' }, limit = 6 } = {}) {
  const strict = await pagefind.search(query, { filters });
  if (strict.results.length >= MIN_STRICT_HITS) return strict.results.slice(0, limit);

  // 整句命中太少（含零命中）时补一轮放宽。strict 的结果仍排在最前——
  // 它是唯一按完整问句排过序的一组，只是数量不够，不该被放宽结果盖掉。
  const relaxedQueries = buildRelaxedSearchQueries(query);
  const relaxed = await Promise.all(
    relaxedQueries.map((item) => pagefind.search(item, { filters })),
  );
  return mergeSearchHitGroups([strict.results, ...relaxed.map((item) => item.results)], limit);
}
