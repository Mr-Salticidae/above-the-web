import test from 'node:test';
import assert from 'node:assert/strict';
import { jubenCases } from '../src/data/juben.js';
import { createProgressStore, GUEST_OWNER, SCHEMA_VERSION } from '../src/scripts/progress-store.js';

const V1_KEY = 'atw-juben-progress-v1';
const V1_BACKUP = 'atw-juben-progress-v1-backup';
const v2Key = (owner) => `atw-juben-progress-v2:${owner}`;

// 只实现仓库真正用到的那三个方法，顺便留一个 dump 方便断言。
function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    dump: () => Object.fromEntries(map),
  };
}

function makeStore({ seed = {}, owner = 'user-a', now = () => 1000, cases = jubenCases, storage } = {}) {
  const box = storage || memoryStorage(seed);
  const store = createProgressStore({ cases, owner, storage: box, now, watch: false });
  return { store, storage: box };
}

const legacy = (data) => ({ [V1_KEY]: JSON.stringify(data) });

test('v1 的下标进度按当前模块顺序迁成 slug，越界下标丢弃', () => {
  const { store, storage } = makeStore({
    seed: legacy({ 'virtual-game': [0, 2, 9] }),
    now: () => 1000,
  });

  const result = store.boot();

  assert.equal(result.migrated, 2);
  assert.equal(result.dropped, 1);
  assert.equal(store.isDone('virtual-game', 'flow-skeleton'), true);
  assert.equal(store.isDone('virtual-game', 'dual-track-clues'), true);
  assert.equal(store.isDone('virtual-game', 'god-view'), false);
  assert.equal(store.count('virtual-game'), 2);
});

test('迁移完老键让位、留一份原文快照，且再 boot 不会重复计入', () => {
  const original = JSON.stringify({ 'virtual-game': [0, 1] });
  const { store, storage } = makeStore({ seed: { [V1_KEY]: original } });

  store.boot();

  assert.equal(storage.getItem(V1_KEY), null, '老键必须腾出来，否则每次加载都会重迁');
  assert.equal(storage.getItem(V1_BACKUP), original, '原文要留底，映射错了还能人工还原');
  assert.equal(store.count('virtual-game'), 2);

  // 同一个存储上再开一次（等于第二次进站）
  const again = createProgressStore({ cases: jubenCases, owner: 'user-a', storage, now: () => 9999, watch: false });
  assert.deepEqual(again.boot(), { migrated: 0, dropped: 0 });
  assert.equal(again.count('virtual-game'), 2);
});

test('老数据里的未知剧本、非数组值、坏 JSON 都不会把加载搞崩', () => {
  const { store } = makeStore({
    seed: legacy({ 'ghost-case': [0, 1], 'virtual-game': 'nope' }),
  });
  assert.equal(store.boot().migrated, 0);

  const broken = makeStore({ seed: { [V1_KEY]: '{ not json' } });
  assert.deepEqual(broken.store.boot(), { migrated: 0, dropped: 0 });
  assert.equal(broken.store.countAll(), 0);
});

test('进度按账号分桶：切号看不到别人的勾选', () => {
  const { store } = makeStore({ owner: 'user-a' });
  store.boot();

  store.toggle('virtual-game', 'flow-skeleton');
  assert.equal(store.count('virtual-game'), 1);

  store.setOwner('user-b');
  assert.equal(store.count('virtual-game'), 0, '换个人就该是干净的一张白纸');

  store.toggle('virtual-game', 'god-view');
  store.setOwner('user-a');
  assert.equal(store.count('virtual-game'), 1);
  assert.equal(store.isDone('virtual-game', 'flow-skeleton'), true);
  assert.equal(store.isDone('virtual-game', 'god-view'), false);
});

test('未登录勾的进度在登录后并入账号，并清空 guest 桶', () => {
  const { store, storage } = makeStore({ owner: GUEST_OWNER });
  store.boot();
  store.toggle('virtual-game', 'god-view');

  store.setOwner('user-a');
  const adopted = store.adoptGuest();

  assert.equal(adopted, 1);
  assert.equal(store.isDone('virtual-game', 'god-view'), true);
  assert.equal(storage.getItem(v2Key(GUEST_OWNER)), null, '并完要清，否则下次登录会重复并');

  // 幂等：再并一次不产生任何变化
  assert.equal(store.adoptGuest(), 0);
  assert.equal(store.count('virtual-game'), 1);
});

test('勾选写入 d/t，取消勾选留墓碑而不是删行', () => {
  let clock = 500;
  const { store } = makeStore({ now: () => clock });
  store.boot();

  assert.equal(store.toggle('woman-by-window', 'five-stages'), true);
  let snapshot = store.snapshot();
  assert.deepEqual(snapshot.items['woman-by-window/five-stages'], { d: 1, t: 500 });
  assert.equal(snapshot.version, SCHEMA_VERSION);

  clock = 900;
  assert.equal(store.toggle('woman-by-window', 'five-stages'), false);
  snapshot = store.snapshot();
  assert.deepEqual(snapshot.items['woman-by-window/five-stages'], { d: 0, t: 900 }, '取消要留行，同步靠它传播');
  assert.equal(store.count('woman-by-window'), 0);
});

test('清空一卷写整卷墓碑，不删行', () => {
  const { store } = makeStore({ now: () => 700 });
  store.boot();
  store.toggle('virtual-game', 'flow-skeleton');
  store.toggle('virtual-game', 'god-view');

  store.resetCase('virtual-game');

  assert.equal(store.count('virtual-game'), 0);
  const items = store.snapshot().items;
  for (const module of jubenCases.find((item) => item.id === 'virtual-game').modules) {
    assert.deepEqual(items[`virtual-game/${module.slug}`], { d: 0, t: 700 });
  }
  assert.equal(Object.keys(items).length, 4);
});

test('已下线的模块与未知卷原样保留，但不计入完成数', () => {
  const seed = {
    [v2Key('user-a')]: JSON.stringify({
      version: SCHEMA_VERSION,
      rev: 3,
      items: {
        'virtual-game/flow-skeleton': { d: 1, t: 10 },
        'virtual-game/retired-module': { d: 1, t: 10 },
        'ghost-case/x': { d: 1, t: 10 },
      },
    }),
  };
  const { store } = makeStore({ seed });

  store.boot();

  assert.equal(store.count('virtual-game'), 1, '下线模块不该虚增完成率');
  assert.equal(store.countAll(), 1);
  assert.ok(store.snapshot().items['virtual-game/retired-module'], '别人的数据不能因为不认识就删');
  assert.equal(store.snapshot().rev, 3);
});

test('订阅：变更会通知，退订后不再通知', () => {
  const { store } = makeStore();
  store.boot();

  const reasons = [];
  const off = store.subscribe((detail) => reasons.push(detail.reason));

  store.toggle('virtual-game', 'flow-skeleton');
  store.resetCase('virtual-game');
  assert.deepEqual(reasons, ['toggle', 'reset']);

  off();
  store.toggle('virtual-game', 'god-view');
  assert.deepEqual(reasons, ['toggle', 'reset']);
});

test('别的标签页写入后 reload 能读到，且同毫秒的冲突让「完成」活着', () => {
  const { store, storage } = makeStore();
  store.boot();

  storage.setItem(
    v2Key('user-a'),
    JSON.stringify({ version: 2, rev: 1, items: { 'virtual-game/flow-skeleton': { d: 1, t: 1000 } } }),
  );
  store.reload();
  assert.equal(store.isDone('virtual-game', 'flow-skeleton'), true);
});

test('localStorage 不可用时退化成内存态，功能不崩', () => {
  const store = createProgressStore({ cases: jubenCases, owner: 'user-a', storage: null, now: () => 1, watch: false });

  assert.doesNotThrow(() => store.boot());
  assert.equal(store.toggle('virtual-game', 'flow-skeleton'), true);
  assert.equal(store.count('virtual-game'), 1);
  store.reload();
  assert.equal(store.count('virtual-game'), 1, '内存态下 reload 不该把数据洗掉');
});

test('目录允许只给 slug 数组（个人中心就是这么传的）', () => {
  const cases = [{ id: 'virtual-game', modules: ['flow-skeleton', 'god-view'] }];
  const { store } = makeStore({ cases });
  store.boot();

  store.toggle('virtual-game', 'god-view');

  assert.equal(store.count('virtual-game'), 1);
  assert.deepEqual(store.doneIds('virtual-game'), ['god-view']);
});
