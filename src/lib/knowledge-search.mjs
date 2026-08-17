// Pagefind 对包含多个词的查询偏严格。聊天问题通常还带着“怎样、请问、有哪些”等口语成分，
// 直接整句搜索很容易把本来存在的笔记筛成 0 条。这里仅负责把自然语言问题降级成少量检索词，
// 不改写用户问题，也不参与最终回答。

const LATIN_TOKEN_RE = /[A-Za-z][A-Za-z0-9+_.-]{1,31}/g;
const FILLER_RE = /(?:请问|请帮我|帮我|我想知道|想知道|想了解|告诉我|讲讲|介绍一下|介绍|分析一下|解释一下|能不能|能否|是否|可以|怎样|如何|怎么|为什么|为何|常见的|相关的|具体的|主要的|有哪些|有什么|是什么|应该|最好|保持|进行)/g;
const TRAILING_CONTEXT_RE = /(?:的时候|方面|过程中|时|中|里|上|下)$/;

function uniquePush(output, seen, value) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  const key = clean.toLocaleLowerCase();
  if (clean.length < 2 || seen.has(key)) return;
  seen.add(key);
  output.push(clean);
}

export function buildRelaxedSearchQueries(question, limit = 5) {
  const clean = String(question || '').normalize('NFKC').replace(/[，。！？、；：,.!?;:()（）【】\[\]“”"'`]/g, ' ');
  const latin = clean.match(LATIN_TOKEN_RE) || [];
  const withoutLatin = clean.replace(LATIN_TOKEN_RE, ' ').replace(FILLER_RE, ' ');
  const chinese = (withoutLatin.match(/[\p{Script=Han}]{2,}/gu) || [])
    .map((chunk) => {
      const trimmed = chunk.replace(TRAILING_CONTEXT_RE, '');
      return [...trimmed].length >= 2 ? trimmed : chunk;
    })
    .filter((chunk) => [...chunk].length >= 2)
    .sort((a, b) => [...b].length - [...a].length);

  const output = [];
  const seen = new Set();
  chinese.forEach((chunk) => uniquePush(output, seen, chunk));
  if (latin.length > 1) uniquePush(output, seen, latin.join(' '));
  latin.forEach((token) => uniquePush(output, seen, token));
  return output.slice(0, Math.max(1, limit));
}

export function mergeSearchHitGroups(groups, limit = 6) {
  const output = [];
  const seen = new Set();

  for (const group of groups) {
    for (const hit of (group || []).slice(0, limit * 2)) {
      const id = String(hit?.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      output.push(hit);
      if (output.length >= limit) return output;
    }
  }
  return output;
}

export async function searchPagefindNotes(pagefind, query, { filters = { type: 'note' }, limit = 6 } = {}) {
  const strict = await pagefind.search(query, { filters });
  if (strict.results.length) return strict.results.slice(0, limit);

  const relaxedQueries = buildRelaxedSearchQueries(query);
  const relaxed = await Promise.all(
    relaxedQueries.map((item) => pagefind.search(item, { filters })),
  );
  return mergeSearchHitGroups(relaxed.map((item) => item.results), limit);
}
