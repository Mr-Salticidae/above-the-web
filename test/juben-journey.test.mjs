import test from 'node:test';
import assert from 'node:assert/strict';
import { jubenCases } from '../src/data/juben.js';
import {
  firstOpenMission,
  missionAt,
  missionHref,
  nextMission,
  resolveVaultMission,
  vaultDocList,
} from '../src/scripts/juben-journey.js';

const virtual = jubenCases.find((item) => item.id === 'virtual-game');

// 独立台账：故意不从 jubenCases 自己生成，避免「拿被测值当期望值」的假通过。
// 私有档案改名或训练关卡误改 docId 时，这里会先报出来。
const EXPECTED_DOC_IDS = {
  'virtual-game': [
    '00_DM主持学习手册',
    '08_上帝视角时间线_DM复盘底稿',
    '04_线索总表/虚拟游戏线索列表',
    '07_归纳卡片',
  ],
  'woman-by-window': [
    '00_对外学习包/第一册_开本与流程',
    '00_对外学习包/第二册_故事全貌',
    '00_对外学习包/第四册_音视频线索',
    '00_对外学习包/第五册_自测与带本提醒',
  ],
};

const manifestFor = (item, docs = EXPECTED_DOC_IDS[item.id]) => ({
  id: item.vaultCaseId,
  docs: docs.map((id) => ({ id, title: id })),
  groups: [{ label: '训练', docs: docs.map((id) => ({ id, title: id })) }],
});

test('未知模块回退第一关，下一关在末关停止', () => {
  assert.equal(missionAt(virtual, 'not-a-module').module.slug, 'flow-skeleton');
  assert.equal(missionAt(virtual, 'god-view').index, 1);
  assert.equal(nextMission(virtual, 'flow-skeleton').module.slug, 'god-view');
  assert.equal(nextMission(virtual, 'layered-review'), null);
});

test('续练定位首个未完成节点，全部完成后回到第一关巡演', () => {
  const done = new Set(['flow-skeleton', 'god-view']);
  const next = firstOpenMission(virtual, (caseId, slug) => done.has(slug));
  assert.equal(next.module.slug, 'dual-track-clues');
  assert.equal(next.index, 2);
  const all = firstOpenMission(virtual, () => true);
  assert.equal(all.module.slug, 'flow-skeleton');
});

test('训练链接保留部署 base，并携带 case/module 与档案库锚点', () => {
  assert.equal(
    missionHref('/above-the-web/juben/', 'woman-by-window', 'character-web'),
    '/above-the-web/juben/?case=woman-by-window&module=character-web#dm-vault',
  );
  assert.equal(
    missionHref('/juben/?from=account', 'virtual-game', 'god-view'),
    '/juben/?from=account&case=virtual-game&module=god-view#dm-vault',
  );
});

test('两卷八个关卡都能解析到各自真实文档 ID', () => {
  const manifest = jubenCases.map((item) => manifestFor(item));
  for (const item of jubenCases) {
    assert.deepEqual(item.modules.map((module) => module.docId), EXPECTED_DOC_IDS[item.id]);
    for (const module of item.modules) {
      const target = resolveVaultMission(jubenCases, manifest, item.id, module.slug);
      assert.equal(target.vaultCaseId, item.vaultCaseId);
      assert.equal(target.docId, module.docId);
      assert.equal(target.docMissing, false);
      assert.equal(target.mission.module.slug, module.slug);
    }
  }
});

test('清单缺指定文档时退回首篇并显式标记，不拼假地址', () => {
  const item = jubenCases[0];
  const manifest = [manifestFor(item, ['README'])];
  const target = resolveVaultMission(jubenCases, manifest, item.id, 'god-view');
  assert.equal(target.docId, 'README');
  assert.equal(target.docMissing, true);
});

test('未知卷与空清单都有安全降级', () => {
  const fallback = resolveVaultMission(jubenCases, [], 'missing', 'missing');
  assert.equal(fallback.publicCase.id, jubenCases[0].id);
  assert.equal(fallback.manifestCase, null);
  assert.equal(fallback.docId, null);
  assert.equal(fallback.mission.module.slug, jubenCases[0].modules[0].slug);
});

test('目录既支持分组清单也支持扁平清单', () => {
  const item = manifestFor(virtual);
  assert.equal(vaultDocList(item).length, item.groups[0].docs.length);
  assert.equal(vaultDocList({ docs: item.docs }).length, item.docs.length);
  assert.deepEqual(vaultDocList(null), []);
});
