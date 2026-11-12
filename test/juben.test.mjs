import test from 'node:test';
import assert from 'node:assert/strict';
import { jubenCases, comparisonRows, methodSteps } from '../src/data/juben.js';

test('剧本档案 ID 唯一，公开学习路径与自测结构完整', () => {
  assert.ok(jubenCases.length > 0);
  assert.equal(new Set(jubenCases.map((item) => item.id)).size, jubenCases.length);
  for (const item of jubenCases) {
    for (const key of ['title', 'status', 'players', 'duration', 'intro', 'tone']) {
      assert.ok(item[key], `${item.id} 缺少 ${key}`);
    }
    assert.ok(item.modules.length >= 3, `${item.id} 学习节点过少`);
    assert.ok(item.questions.length >= 3, `${item.id} 自测题过少`);
    for (const module of item.modules) {
      assert.ok(module.title && module.desc, `${item.id} 学习节点不能只写标题`);
    }
  }
});

test('跨本对照的每一行都能在两卷档案中取到值', () => {
  for (const row of comparisonRows) {
    for (const item of jubenCases) {
      assert.ok(item.compare[row.key], `${item.id} 缺少对照字段 ${row.key}`);
    }
  }
  assert.ok(methodSteps.length >= 5);
});

test('深度链接只进私有剧本库，公开数据不含答案字段', () => {
  const forbiddenKeys = new Set(['culprit', 'solution', 'ending', 'answers', 'fullTruth']);
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbiddenKeys.has(key), false, `公开数据不得包含 ${key}`);
      visit(child);
    }
  };
  visit(jubenCases);
  for (const item of jubenCases) {
    for (const url of [item.privateUrl, item.timelineUrl]) {
      const target = new URL(url);
      assert.equal(target.origin, 'https://github.com');
      assert.ok(target.pathname.startsWith('/Mr-Salticidae/juben-dm-lab/'));
    }
  }
});
