import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRelaxedSearchQueries,
  mergeSearchHitGroups,
  primeNoteTotal,
  searchPagefindNotes,
} from '../src/lib/knowledge-search.mjs';

test('自然语言问题会降级为核心中文概念和工具名', () => {
  assert.deepEqual(
    buildRelaxedSearchQueries('怎样保持 Midjourney 角色一致性？'),
    ['角色一致性', 'Midjourney'],
  );
});

test('词块末尾的「的」不进检索词', () => {
  // 「音乐生成的」这种尾巴带「的」的块直接拿去搜，读起来也不像个词
  assert.deepEqual(buildRelaxedSearchQueries('库里有没有讲 Suno 音乐生成的笔记？'), ['音乐生成', 'Suno']);
});

test('示例问题能剥掉口语成分', () => {
  assert.deepEqual(
    buildRelaxedSearchQueries('做 AI 短片时，故事结构怎么搭？'),
    ['故事结构', '短片', 'AI'],
  );
  assert.deepEqual(
    buildRelaxedSearchQueries('Prompt 常见的失败原因有哪些？'),
    ['失败原因', 'Prompt'],
  );
});

test('多个英文技术词优先尝试组合，再分别放宽', () => {
  assert.deepEqual(
    buildRelaxedSearchQueries('Midjourney oref 怎么用？'),
    ['Midjourney oref', 'Midjourney', 'oref'],
  );
});

// 2026-08-24 线上实测：「这个知识库里有哪些关于 Midjourney prompt 技巧的笔记？」
// 召回的全是知识库沉淀与分发那一类笔记——问句里的「这个知识库」「笔记」本身就是本库的强索引词，
// 把真正的检索词挤没了。容器词必须和口语词一样剥掉。
test('问句里描述容器的词不参与检索', () => {
  assert.deepEqual(
    buildRelaxedSearchQueries('这个知识库里有哪些关于 Midjourney prompt 技巧的笔记？'),
    ['技巧', 'Midjourney prompt', 'Midjourney', 'prompt'],
  );
});

test('容器词剥完只剩框架时，认工具名而不是退回噪音', () => {
  assert.deepEqual(buildRelaxedSearchQueries('知识库里关于 sref 的笔记有哪些'), ['sref']);
});

// 只剥「知识库」会留下「里讲工作流」这种谁也不是的词，它命中率低、看着还挺精准，
// 召回却远不如「工作流」——容器词后面粘着的方位词和动词要一起剥。
test('容器词后面粘的方位词和动词一起剥掉', () => {
  assert.deepEqual(buildRelaxedSearchQueries('知识库里讲工作流的笔记有哪些'), ['工作流']);
  assert.deepEqual(buildRelaxedSearchQueries('这个笔记里讲的东西'), ['东西']);
  // 别把正经词吃掉：「笔记的整理方法」剥完该剩「整理方法」
  assert.deepEqual(buildRelaxedSearchQueries('笔记的整理方法'), ['整理方法']);
});

test('整句都是框架且没有工具名时，仍退回原始词块兜底', () => {
  // 剥到一个词都不剩又没有工具名可认，只能拿原话去搜——总比一条候选查询都没有强
  assert.deepEqual(buildRelaxedSearchQueries('这个知识库里有什么'), ['这个知识库']);
});

test('合并多组结果时每组保底一席，余额按语义强弱顺序分配', () => {
  const role = { id: 'role' };
  const roleB = { id: 'role-b' };
  const broad = { id: 'broad' };
  // 第一组再长也不能吃光名额：第二组必须拿到它的第一席
  assert.deepEqual(
    mergeSearchHitGroups([[role, roleB], [broad]], 3),
    [role, broad, roleB],
  );
  // 去重照旧
  assert.deepEqual(mergeSearchHitGroups([[role], [broad, role]], 3), [role, broad]);
});

// 全库 100 篇的假索引：filters() 报各栏目篇数，search() 按 table 给结果。
// table 的值可以是数组（正文笔记与索引页不分），也可以是 { note, index } 两档。
function fakePagefind(table, { total = 100 } = {}) {
  const calls = [];
  return {
    calls,
    async filters() {
      return { type: { note: total } };
    },
    async search(query, { filters } = {}) {
      calls.push(filters?.kind ? `${query}#${filters.kind}` : query);
      const entry = table[query];
      if (!entry) return { results: [] };
      if (Array.isArray(entry)) return { results: entry };
      // kind:note 只给正文笔记；不带 kind 时正文笔记与索引页一起返回
      return { results: filters?.kind === 'note' ? entry.note || [] : [...(entry.note || []), ...(entry.index || [])] };
    },
  };
}

test('检索以关键词为主，整句不参与', async () => {
  const role = { id: 'role' };
  const broad = { id: 'broad' };
  const pagefind = fakePagefind({ 角色一致性: [role], Midjourney: [broad] });

  assert.deepEqual(
    await searchPagefindNotes(pagefind, '怎样保持 Midjourney 角色一致性？', { limit: 2 }),
    [role, broad],
  );
  assert.deepEqual(pagefind.calls, ['角色一致性#note', 'Midjourney#note']);
});

// 2026-08-24 实测：整句召回的是覆盖面广的长文档（索引页、大杂烩复盘），
// 「库里有没有讲 Suno 音乐生成的笔记」整句六条里没有一条讲 Suno。整句只配当兜底。
test('关键词全部落空时才回退整句', async () => {
  const fallback = { id: 'fallback' };
  const pagefind = fakePagefind({ '知识库里关于 sref 的笔记有哪些': [fallback] });

  assert.deepEqual(
    await searchPagefindNotes(pagefind, '知识库里关于 sref 的笔记有哪些'),
    [fallback],
  );
  // 先试 sref（正文笔记 → 放开），都落空了才拿整句碰运气
  assert.deepEqual(pagefind.calls, ['sref#note', 'sref', '知识库里关于 sref 的笔记有哪些']);
});

// 「音乐生成」命中全库 43%、「Suno」只占 12%，按词长排却是前者在先，一口气吃掉五个名额。
test('命中过全库四成的泛词垫到最后再分名额', async () => {
  const suno = [{ id: 's1' }, { id: 's2' }];
  const generic = new Array(45).fill(null).map((_, i) => ({ id: `g${i}` }));
  const pagefind = fakePagefind({ 音乐生成: generic, Suno: suno });
  await primeNoteTotal(pagefind);

  const hits = await searchPagefindNotes(pagefind, '库里有没有讲 Suno 音乐生成的笔记？', { limit: 4 });
  assert.deepEqual(
    hits.map((hit) => hit.id),
    ['s1', 'g0', 's2', 'g1'],
  );
  // 泛词仍参与（排序本身有信息量），只是不再第一个挑
  assert.deepEqual(pagefind.calls, ['音乐生成#note', 'Suno#note']);
});

// 「Skill 是怎么用的？」拆出来是「用的」（命中 90%）和「Skill」（31%）：两个都不算精准词时，
// 命中少的那个更像个正经词，该它先挑。
test('几条查询都泛时，命中少的先挑', async () => {
  const vague = new Array(90).fill(null).map((_, i) => ({ id: `v${i}` }));
  const skill = new Array(50).fill(null).map((_, i) => ({ id: `s${i}` }));
  const pagefind = fakePagefind({ 用的: vague, Skill: skill });
  await primeNoteTotal(pagefind);

  const hits = await searchPagefindNotes(pagefind, 'Skill 是怎么用的？', { limit: 2 });
  assert.deepEqual(hits.map((hit) => hit.id), ['s0', 'v0']);
});

// 栏目索引页一篇装着几十上百个别的笔记的标题，什么词都沾一点。
test('正文笔记够用时，索引页一条都不占名额', async () => {
  const pagefind = fakePagefind({
    Skill: { note: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }], index: [{ id: 'idx' }] },
  });
  await primeNoteTotal(pagefind);

  const hits = await searchPagefindNotes(pagefind, 'Skill 怎么用？', { limit: 3 });
  assert.deepEqual(hits.map((hit) => hit.id), ['n1', 'n2', 'n3']);
  assert.deepEqual(pagefind.calls, ['Skill#note']); // 一轮就够，没去放开第二轮
});

test('正文笔记凑不满时，索引页来补位', async () => {
  const pagefind = fakePagefind({
    Skill: { note: [{ id: 'n1' }, { id: 'n2' }], index: [{ id: 'idx' }] },
  });
  await primeNoteTotal(pagefind);

  const hits = await searchPagefindNotes(pagefind, 'Skill 怎么用？', { limit: 3 });
  assert.deepEqual(hits.map((hit) => hit.id), ['n1', 'n2', 'idx']);
});

test('老索引没有 kind 这个过滤条件时，回到原来的行为', async () => {
  const pagefind = {
    calls: [],
    async filters() {
      return { type: { note: 100 } };
    },
    async search(query, { filters } = {}) {
      this.calls.push(query);
      if (filters?.kind) return { results: [] }; // 老索引不认 kind，带上就什么都搜不到
      return { results: query === 'Skill' ? [{ id: 'a' }, { id: 'b' }] : [] };
    },
  };
  await primeNoteTotal(pagefind);

  const hits = await searchPagefindNotes(pagefind, 'Skill 怎么用？', { limit: 3 });
  assert.deepEqual(hits.map((hit) => hit.id), ['a', 'b']);
});

// 总数只是一层优化，取它的那次调用线上要一两秒——绝不该让提问的人等它
test('总数还没预热好就照常检索，只是先不降级', async () => {
  const generic = [{ id: 'g1' }, { id: 'g2' }];
  const narrow = [{ id: 'n1' }];
  let resolveFilters = null;
  const pagefind = {
    calls: [],
    filters() {
      return new Promise((resolve) => {
        resolveFilters = () => resolve({ type: { note: 100 } });
      });
    },
    async search(query) {
      this.calls.push(query);
      return { results: query === '音乐生成' ? generic : query === 'Suno' ? narrow : [] };
    },
  };

  const hits = await searchPagefindNotes(pagefind, '库里有没有讲 Suno 音乐生成的笔记？', { limit: 3 });
  assert.deepEqual(hits.map((hit) => hit.id), ['g1', 'n1', 'g2']);
  assert.equal(typeof resolveFilters, 'function'); // 预热确实起了，只是没等
});

test('取总数失败就一直不降级，检索照常', async () => {
  const generic = [{ id: 'g1' }, { id: 'g2' }];
  const narrow = [{ id: 'n1' }];
  const pagefind = {
    calls: [],
    async filters() {
      throw new Error('这个版本没有 filters()');
    },
    async search(query) {
      this.calls.push(query);
      return { results: query === '音乐生成' ? generic : query === 'Suno' ? narrow : [] };
    },
  };
  await primeNoteTotal(pagefind);

  const hits = await searchPagefindNotes(pagefind, '库里有没有讲 Suno 音乐生成的笔记？', { limit: 3 });
  assert.deepEqual(hits.map((hit) => hit.id), ['g1', 'n1', 'g2']);
});
