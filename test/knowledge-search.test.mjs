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

test('合并多组结果时保留语义更强的查询顺序并去重', () => {
  const role = { id: 'role' };
  const broad = { id: 'broad' };
  assert.deepEqual(
    mergeSearchHitGroups([[role], [broad, role]], 3),
    [role, broad],
  );
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
