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
      assert.ok(module.slug, `${item.id} 的「${module.title}」缺少 slug——学习进度靠它认人`);
    }
  }
});

// 学习进度按 `${caseId}/${slug}` 存，slug 就是进度的身份证。
// 台账写死在这里：谁改 slug、删模块，CI 会红——那是「有人正在让所有人的老进度失效」的信号，
// 必须显式改台账才放行，而不是顺手 glitch 过去。
const SLUG_LEDGER = {
  'virtual-game': ['flow-skeleton', 'god-view', 'dual-track-clues', 'layered-review'],
  'woman-by-window': ['five-stages', 'character-web', 'cross-media-evidence', 'question-layers'],
};

test('模块 slug 是稳定 ID：格式合法、卷内唯一、与台账一致', () => {
  assert.deepEqual(
    jubenCases.map((item) => item.id).sort(),
    Object.keys(SLUG_LEDGER).sort(),
    '新增或删除剧本时，台账要一起改',
  );

  for (const item of jubenCases) {
    const slugs = item.modules.map((module) => module.slug);
    for (const slug of slugs) {
      assert.match(slug, /^[a-z0-9][a-z0-9-]{0,63}$/, `${item.id} 的 slug 只能是短横线小写`);
    }
    assert.equal(new Set(slugs).size, slugs.length, `${item.id} 的 slug 有重复`);
    assert.deepEqual(
      slugs,
      SLUG_LEDGER[item.id],
      `${item.id} 的模块 slug 变了：老用户已完成的状态会对不上，确认无碍后同步更新台账`,
    );
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
