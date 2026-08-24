// Pagefind 对包含多个词的查询偏严格。聊天问题通常还带着“怎样、请问、有哪些”等口语成分，
// 直接整句搜索很容易把本来存在的笔记筛成 0 条。这里仅负责把自然语言问题降级成少量检索词，
// 不改写用户问题，也不参与最终回答。

const LATIN_TOKEN_RE = /[A-Za-z][A-Za-z0-9+_.-]{1,31}/g;
const FILLER_RE = /(?:请问|请帮我|帮我|我想知道|想知道|想了解|告诉我|讲讲|介绍一下|介绍|分析一下|解释一下|能不能|能否|是否|可以|怎样|如何|怎么|为什么|为何|常见的|相关的|具体的|主要的|有哪些|有什么|是什么|应该|最好|保持|进行)/g;
// 容器词：读者是在问「这座知识库」，所以「这个 / 知识库 / 笔记 / 关于」描述的是容器，不是主题。
// 这些词偏偏是本库的强索引词（库里就有讲知识库沉淀与分发的笔记），不剥掉的话，
// 「这个知识库里有哪些关于 Midjourney 的笔记」会被它们带去知识库维护那一堆，真正的 Midjourney 反而挤不进来。
// 容器词后面常粘着方位词和「讲 / 收录」这类动词，一起剥掉，否则
// 「知识库里讲工作流的笔记」只剥掉「知识库」，留下「里讲工作流」这种谁也不是的词
// （它命中率低，看着还挺精准，实际召回远不如「工作流」）。
const META_RE = /(?:这个|这些|那个|那些|这里|那里|本站|站内|库里|知识库|笔记|文章|文档|资料|内容|里面|关于|有没有|没有|哪些|什么|一些|以及|说说)(?:里面|里|中)?(?:讲到|讲|说到|说|写到|写|提到|收录|记录)?(?:的|了|过)?/g;
const TRAILING_CONTEXT_RE = /(?:的时候|方面|过程中|的|时|中|里|上|下)$/;
// 命中超过全库这个比例的查询没有区分度，把它垫到最后再分名额。
// 实测（442 篇笔记）：「用的」90%、「是用」93%、「prompt」「AI」100%、「回事」46%、「音乐生成」43%，
// 而「工作流」38%、「Skill」31%、「角色一致性」19%、「Suno」12%、「技巧」5%。
// 问 Suno 时「音乐生成」按词长排在前面，一口气吃掉五个名额，Suno 只剩一个——就是这么来的。
// 这条线卡在 40%：既拦得住口语碎片和「音乐生成」，又不误伤「Skill」「工作流」这类真词。
// 垫后而不是丢掉：泛词的命中排序本身仍有信息量（搜 prompt 的第一条正是 Prompt Master Skill）。
const GENERIC_HIT_RATIO = 0.4;

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

// 全库笔记数，用来判断一条查询泛不泛。按 pagefind 实例缓存，一次会话取一次。
const noteTotals = new WeakMap();

function totalEntry(pagefind) {
  let entry = noteTotals.get(pagefind);
  if (!entry) {
    entry = { value: 0, promise: null };
    noteTotals.set(pagefind, entry);
  }
  return entry;
}

// 预热总数。走 `filters()` 而不是空查询：前者只读过滤索引，后者要把全库文档索引拉下来——
// 线上实测 1.7s 对 6.0s，同样都得到 442。
// 面板一打开就在后台跑，等用户敲完问题通常早就好了；**检索绝不等它**，
// 没就绪就当拿不到（0），跳过泛词降级即可，宁可少一层优化也不让人干等。
export function primeNoteTotal(pagefind, filters = { type: 'note' }) {
  const entry = totalEntry(pagefind);
  if (entry.promise) return entry.promise;
  const [key, value] = Object.entries(filters)[0] || [];
  entry.promise = Promise.resolve()
    .then(() => pagefind.filters())
    .then((all) => {
      entry.value = Number(all?.[key]?.[value]) || 0;
    })
    .catch(() => {
      entry.value = 0;
    });
  return entry.promise;
}

// 泛到没有区分度的查询垫到最后，其余保持原有的语义强弱顺序（稳定，不打乱同档次的相对次序）。
function demoteGenericGroups(groups, total) {
  if (!total) return groups;
  const specific = [];
  const generic = [];
  for (const group of groups) {
    ((group?.length || 0) / total > GENERIC_HIT_RATIO ? generic : specific).push(group);
  }
  // 都泛的时候彼此还能比一比：命中越少越像个正经词，排前面先挑
  generic.sort((a, b) => (a?.length || 0) - (b?.length || 0));
  return [...specific, ...generic];
}

function searchGroups(pagefind, queries, filters) {
  return Promise.all(
    queries.map((item) => Promise.resolve(pagefind.search(item, { filters })).then((r) => r.results)),
  );
}

// 用后备结果把名额补满，已经选中的不重复收
function topUpHits(hits, extra, limit) {
  const seen = new Set(hits.map((hit) => String(hit?.id || '')));
  for (const hit of extra) {
    if (hits.length >= limit) break;
    const id = String(hit?.id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    hits.push(hit);
  }
  return hits;
}

export async function searchPagefindNotes(pagefind, query, { filters = { type: 'note' }, limit = 6 } = {}) {
  // 关键词检索是主力，整句只当兜底。实测整句对自然语言问句系统性失准：
  // 问句被切成许多词，覆盖面广的长文档（索引页、大杂烩复盘）因为凑齐了更多词而胜出，
  // 真正的关键词被稀释——「库里有没有讲 Suno 音乐生成的笔记」整句召回六篇，没有一篇讲 Suno。
  const relaxedQueries = buildRelaxedSearchQueries(query);
  // 没预热过就顺手起一次（仍然不等它），下一轮提问就能用上
  primeNoteTotal(pagefind, filters);
  const pick = (groups) => mergeSearchHitGroups(demoteGenericGroups(groups, totalEntry(pagefind).value), limit);

  // 先只看正文笔记。栏目索引页一篇装着几十上百个别的笔记的标题，因此什么词都沾一点，
  // 混进来就挤掉真正讲这件事的那篇（`kind` 由笔记页在构建期标注，见 src/pages/[...slug].astro）。
  const hits = pick(await searchGroups(pagefind, relaxedQueries, { ...filters, kind: 'note' }));

  // 正文笔记凑不满才放开，让索引页来补位——它虽然稀，总比空着强。
  // 老索引没有 kind 这个过滤条件时上一步会全空，也从这里回到原来的行为。
  if (hits.length < limit) {
    topUpHits(hits, pick(await searchGroups(pagefind, relaxedQueries, filters)), limit);
  }
  if (hits.length) return hits;

  // 关键词一条都没命中，才轮到整句碰运气
  const strict = await pagefind.search(query, { filters });
  return strict.results.slice(0, limit);
}
