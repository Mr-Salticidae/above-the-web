// 相关笔记：给每篇笔记挑几篇「读完这篇可以接着读」的。
//
// 打分信号（都在构建期算，不靠向量检索）：
//   · 共享标签：按稀有度加权（IDF）——「类型/协作工具链」挂了一百多篇，几乎不说明什么；
//     「工具/ElevenLabs」只有几篇，共享它就很说明问题
//   · 同一子栏目：作者自己归的簇，信号很强
//   · 同一栏目：弱信号，只用来在同分时往近处排
//   · 正文里的 wikilink 指向：作者明确说「相关」
// 反向链接（谁链接到这篇）在页面上另有一栏，这里不重复推。
export const WEIGHTS = { sub: 2.5, cat: 0.5, outlink: 3 };
export const MIN_SCORE = 2.5;

// items: [{ id, cat, sub, tags: string[], outlinks: Set<id>, backlinks: Set<id>, skip?: boolean }]
// → Map<id, id[]>
export function relatedNotes(items, { limit = 4 } = {}) {
  const df = new Map();
  for (const it of items) for (const t of new Set(it.tags)) df.set(t, (df.get(t) || 0) + 1);
  const n = items.length || 1;
  const idf = (t) => Math.log(n / (df.get(t) || 1));

  const result = new Map();
  for (const a of items) {
    const tagsA = new Set(a.tags);
    const scored = [];
    for (const b of items) {
      if (b.id === a.id || b.skip || a.backlinks?.has(b.id)) continue;
      let score = 0;
      for (const t of b.tags) if (tagsA.has(t)) score += idf(t);
      if (a.sub && a.sub === b.sub && a.cat === b.cat) score += WEIGHTS.sub;
      if (a.cat === b.cat) score += WEIGHTS.cat;
      if (a.outlinks?.has(b.id)) score += WEIGHTS.outlink;
      if (score >= MIN_SCORE) scored.push({ id: b.id, score });
    }
    scored.sort((x, y) => y.score - x.score || x.id.localeCompare(y.id));
    result.set(a.id, scored.slice(0, limit).map((s) => s.id));
  }
  return result;
}
