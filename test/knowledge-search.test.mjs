import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRelaxedSearchQueries,
  mergeSearchHitGroups,
  searchPagefindNotes,
} from '../src/lib/knowledge-search.mjs';

test('自然语言问题会降级为核心中文概念和工具名', () => {
  assert.deepEqual(
    buildRelaxedSearchQueries('怎样保持 Midjourney 角色一致性？'),
    ['角色一致性', 'Midjourney'],
  );
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
    ['技巧的', 'Midjourney prompt', 'Midjourney', 'prompt'],
  );
});

test('容器词剥完只剩框架时，认工具名而不是退回噪音', () => {
  assert.deepEqual(buildRelaxedSearchQueries('知识库里关于 sref 的笔记有哪些'), ['sref']);
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

test('完整问句为零时会实际执行放宽检索', async () => {
  const role = { id: 'role' };
  const broad = { id: 'broad' };
  const calls = [];
  const pagefind = {
    async search(query) {
      calls.push(query);
      return {
        results: query === '角色一致性' ? [role] : query === 'Midjourney' ? [broad] : [],
      };
    },
  };

  assert.deepEqual(
    await searchPagefindNotes(pagefind, '怎样保持 Midjourney 角色一致性？'),
    [role, broad],
  );
  assert.deepEqual(calls, [
    '怎样保持 Midjourney 角色一致性？',
    '角色一致性',
    'Midjourney',
  ]);
});

// 整句偶尔会擦中一两篇索引页，旧实现就此短路，读者得到的是「只找到一篇索引」。
test('整句只擦中一两条时也补一轮放宽，strict 结果仍排最前', async () => {
  const indexPage = { id: 'index-page' };
  const srefA = { id: 'sref-a' };
  const srefB = { id: 'sref-b' };
  const calls = [];
  const pagefind = {
    async search(query) {
      calls.push(query);
      return { results: query === 'sref' ? [srefA, srefB] : query.includes('知识库') ? [indexPage] : [] };
    },
  };

  assert.deepEqual(
    await searchPagefindNotes(pagefind, '知识库里关于 sref 的笔记有哪些'),
    [indexPage, srefA, srefB],
  );
  assert.deepEqual(calls, ['知识库里关于 sref 的笔记有哪些', 'sref']);
});

test('整句命中够多时不再放宽，省掉多余检索', async () => {
  const hits = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const calls = [];
  const pagefind = {
    async search(query) {
      calls.push(query);
      return { results: hits };
    },
  };

  assert.deepEqual(await searchPagefindNotes(pagefind, '角色一致性怎么锁'), hits);
  assert.equal(calls.length, 1);
});
