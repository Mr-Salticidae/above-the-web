// 同步层回归：队列、离线、合并、降级、换账号不串数据。
// 服务端用内存假实现（同一套 LWW / 墓碑 / rev 规则），不起真服务——
// 真服务那头的合并逻辑由 platform/server/test/progress.test.js 负责。
import test from 'node:test';
import assert from 'node:assert/strict';
import { jubenCases } from '../src/data/juben.js';
import { createProgressStore, GUEST_OWNER } from '../src/scripts/progress-store.js';
import { createProgressSync, SYNC_STATE, syncText } from '../src/scripts/progress-sync.js';

function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    dump: () => Object.fromEntries(map),
  };
}

// 内存版服务端：与 platform/server/src/database.js 的 mergeProgress 同规则
function fakeServer() {
  const rows = new Map(); // key -> { d, t, rev }
  let rev = 0;
  const state = {
    rows,
    calls: [],
    offline: false,
    failNext: false,
    missing: false, // 模拟「服务端还是旧版，没这个接口」
    gate: null, // 设成 { promise, open } 可以让 POST 卡住，测「请求在飞时又勾一次」
    get rev() {
      return rev;
    },
    async request(method, path, body) {
      state.calls.push({ method, path, body });
      if (state.offline) {
        const error = new Error('连不上服务器，稍后再试');
        error.status = 0;
        throw error;
      }
      if (state.missing) {
        const error = new Error('接口不存在');
        error.status = 404;
        throw error;
      }
      if (state.failNext) {
        state.failNext = false;
        const error = new Error('服务器开小差了');
        error.status = 500;
        throw error;
      }
      const [route, query] = path.split('?');
      if (method === 'GET' && route === '/juben/progress') {
        const since = Number(new URLSearchParams(query || '').get('since') || 0);
        return { rev, items: snapshot((row) => row.rev > since), serverTime: Date.now() };
      }
      if (method === 'POST' && route === '/juben/progress') {
        if (state.gate) await state.gate.promise;
        if (body.items.length) rev += 1;
        for (const item of body.items) {
          const key = `${item.caseId}/${item.moduleId}`;
          const row = rows.get(key);
          if (!row || item.at > row.t || (item.at === row.t && item.done > row.d)) {
            rows.set(key, { d: item.done, t: item.at, rev });
          }
        }
        const baseRev = body.baseRev || 0;
        return { rev, items: snapshot((row) => row.rev > baseRev), serverTime: Date.now() };
      }
      if (method === 'DELETE' && route === '/juben/progress') {
        rev += 1;
        for (const [key, row] of rows) rows.set(key, { ...row, d: 0, rev });
        return { rev, items: [], serverTime: Date.now() };
      }
      throw new Error(`未预期的请求 ${method} ${path}`);
    },
  };

  function snapshot(match) {
    return [...rows.entries()]
      .filter(([, row]) => match(row))
      .map(([key, row]) => {
        const [caseId, moduleId] = key.split('/');
        return { caseId, moduleId, done: row.d, at: row.t };
      });
  }

  return state;
}

function harness({ owner = 'user-a', storage = memoryStorage(), server = fakeServer(), online = () => true, quietMs = 0 } = {}) {
  let ts = 10_000;
  const now = () => (ts += 1000);
  const store = createProgressStore({ cases: jubenCases, owner, storage, now, watch: false });
  store.boot();
  const sync = createProgressSync(store, { request: server.request, owner, storage, quietMs, online });
  return { store, sync, server, storage, now };
}

// 等一个条件成立（用来卡住「请求真的在飞」这一刻）
async function until(predicate, tries = 100) {
  for (let i = 0; i < tries; i += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error('等待超时');
}

const queueOf = (storage, owner = 'user-a') => {
  const raw = storage.dump()[`atw-juben-queue:${owner}`];
  return raw ? JSON.parse(raw) : null;
};

test('勾选 → 入队 → 推送成功 → 队列清空、状态已同步', async () => {
  const { store, sync, server, storage } = harness();
  sync.start();
  await sync.syncNow(); // 首轮全量拉取（空库）

  store.toggle('virtual-game', 'flow-skeleton');
  sync.note();
  assert.equal(sync.status().pending, 1, '勾完立刻进队列');
  assert.ok(queueOf(storage), '队列落盘了，关标签页也不丢');

  await sync.syncNow();
  assert.equal(sync.status().state, SYNC_STATE.SYNCED);
  assert.equal(sync.status().pending, 0);
  assert.equal(queueOf(storage), null, '推成功后队列清空');
  assert.equal(server.rows.get('virtual-game/flow-skeleton').d, 1);
});

test('离线勾选：不推、状态待同步、恢复后补上', async () => {
  let online = false;
  const { store, sync, server, storage } = harness({ online: () => online });
  sync.start();
  await sync.syncNow();

  store.toggle('virtual-game', 'god-view');
  sync.note();
  await sync.syncNow();

  assert.equal(sync.status().state, SYNC_STATE.PENDING);
  assert.equal(sync.status().pending, 1);
  assert.equal(server.rows.size, 0, '断网时一条都不该到服务端');
  assert.ok(queueOf(storage), '队列还在，等网络回来');

  online = true;
  await sync.syncNow();
  assert.equal(sync.status().state, SYNC_STATE.SYNCED);
  assert.equal(server.rows.get('virtual-game/god-view').d, 1);
});

test('同一项连勾两次：队列只留最后一次意图', async () => {
  const { store, sync, storage } = harness();
  sync.start();
  await sync.syncNow();

  store.toggle('virtual-game', 'flow-skeleton'); // 勾上
  sync.note();
  store.toggle('virtual-game', 'flow-skeleton'); // 又取消
  sync.note();

  const queue = queueOf(storage);
  assert.deepEqual(Object.keys(queue), ['virtual-game/flow-skeleton']);
  assert.equal(queue['virtual-game/flow-skeleton'].d, 0, '留的是「取消」，不是「完成」');
});

test('别的设备勾了：本机拉取后自动跟上', async () => {
  const server = fakeServer();
  server.rows.set('virtual-game/dual-track-clues', { d: 1, t: 5_000, rev: 1 }); // 另一台设备早推过

  const deviceB = harness({ server, storage: memoryStorage() });
  deviceB.sync.start();
  await deviceB.sync.syncNow();

  assert.equal(deviceB.store.isDone('virtual-game', 'dual-track-clues'), true);
  assert.equal(deviceB.sync.status().state, SYNC_STATE.SYNCED);
  assert.equal(queueOf(deviceB.storage), null, '别人勾的项不该被本机当成待推');
});

test('本机更晚的记录：拉下来不会盖掉，且会推回服务端', async () => {
  const server = fakeServer();
  const { store, sync } = harness({ server });
  sync.start();
  await sync.syncNow();

  server.rows.set('virtual-game/layered-review', { d: 0, t: 1_000, rev: 5 }); // 服务端：取消，很旧
  store.toggle('virtual-game', 'layered-review'); // 本机：完成，刚点
  sync.note();

  await sync.syncNow();
  assert.equal(store.isDone('virtual-game', 'layered-review'), true, '本机更晚的那条要保住');
  assert.equal(server.rows.get('virtual-game/layered-review').d, 1, '并且推回服务端');
});

test('推送途中又勾一次：新的那条留在队列里，下一轮补推', async () => {
  // 合批窗口调长，把「自动补推」按住，好在批次结束的那一刻断言队列
  const { store, sync, server, storage } = harness({ quietMs: 10_000 });
  sync.start();
  await sync.syncNow();

  let open;
  server.gate = { promise: new Promise((resolve) => { open = resolve; }) };

  store.toggle('virtual-game', 'five-stages');
  sync.note();
  const flight = sync.syncNow(); // POST 卡在 gate 上
  await until(() => server.calls.some((entry) => entry.method === 'POST'));

  store.toggle('virtual-game', 'five-stages'); // 请求在飞的时候又取消
  sync.note();
  open();
  await flight;

  // 飞出去那条 d=1，本地已经是 d=0，所以队列里必须还留着新版本
  assert.ok(queueOf(storage), '在飞期间的改动不能被当成「已推成功」清掉');

  server.gate = null;
  await sync.syncNow();
  assert.equal(server.rows.get('virtual-game/five-stages').d, 0, '最终服务端是取消');
  assert.equal(queueOf(storage), null);
});

test('服务端还是旧版（接口 404）：静默降级为纯本地，勾选照常', async () => {
  const server = fakeServer();
  server.missing = true;
  const { store, sync } = harness({ server });
  sync.start();
  await sync.syncNow();

  assert.equal(sync.status().state, SYNC_STATE.OFF);
  store.toggle('virtual-game', 'flow-skeleton');
  sync.note();
  await sync.syncNow();
  assert.equal(store.isDone('virtual-game', 'flow-skeleton'), true, '降级不影响本地勾选');
  assert.equal(sync.status().state, SYNC_STATE.OFF);
});

test('服务端 5xx：队列保留，状态「同步失败」', async () => {
  const { store, sync, server, storage } = harness();
  sync.start();
  await sync.syncNow();

  server.failNext = true;
  store.toggle('virtual-game', 'flow-skeleton');
  sync.note();
  await sync.syncNow();

  assert.equal(sync.status().state, SYNC_STATE.ERROR);
  assert.ok(queueOf(storage), '失败时队列必须还在');
});

test('首次全量拉取后补推：本机有、服务端没有的项（老数据迁移）', async () => {
  const storage = memoryStorage({
    'atw-juben-progress-v2:user-a': JSON.stringify({
      version: 2,
      rev: 0,
      items: { 'virtual-game/character-web': { d: 1, t: 9000 } },
    }),
  });
  const { sync, server } = harness({ storage });
  sync.start();
  await sync.syncNow();

  assert.equal(server.rows.get('virtual-game/character-web').d, 1, '本机存量的勾选要补上去');
  assert.equal(sync.status().state, SYNC_STATE.SYNCED);
});

test('换账号：上一个账号的待推项不会记到新账号名下', async () => {
  let online = false;
  const { store, sync, storage } = harness({ owner: 'user-a', online: () => online });
  sync.start();
  await sync.syncNow();

  store.toggle('virtual-game', 'flow-skeleton');
  sync.note();
  await sync.syncNow(); // 离线，队列留在 user-a

  // 顺序有讲究：先告诉同步层换人，再换仓库的桶
  sync.setOwner('user-b');
  store.setOwner('user-b');

  assert.equal(queueOf(storage, 'user-b'), null, 'B 的队列是空的');
  assert.ok(queueOf(storage, 'user-a'), 'A 的待推项原地存档，不清空也不搬家');

  online = true;
  await sync.syncNow();
  assert.equal(sync.status().pending, 0, 'B 没有待推项');
});

test('未登录：勾选只进本机队列，状态是「本机记录」', async () => {
  const { store, sync, server } = harness({ owner: GUEST_OWNER });
  sync.start();
  store.toggle('virtual-game', 'flow-skeleton');
  sync.note();
  await sync.syncNow();

  assert.equal(sync.status().state, SYNC_STATE.GUEST);
  assert.equal(server.rows.size, 0, '匿名不该往服务端写');
  assert.match(syncText(sync.status()), /登录后跨设备/);
});

test('登录后把未登录勾的项带进账号', async () => {
  const server = fakeServer();
  const { store, sync } = harness({ owner: GUEST_OWNER, server });
  sync.start();
  store.toggle('virtual-game', 'question-layers');
  sync.note();

  sync.setOwner('user-a');
  store.setOwner('user-a');
  store.adoptGuest();
  sync.note();
  await sync.syncNow();

  assert.equal(store.isDone('virtual-game', 'question-layers'), true);
  assert.equal(server.rows.get('virtual-game/question-layers').d, 1, '进门时勾的项要跟着账号走');
});

test('清空：本地归零 + 服务端写墓碑 + 游标重置', async () => {
  const { store, sync, server } = harness();
  sync.start();
  await sync.syncNow();
  store.toggle('virtual-game', 'flow-skeleton');
  sync.note();
  await sync.syncNow();
  const revBefore = server.rev;

  await sync.reset();

  assert.equal(store.count('virtual-game'), 0);
  assert.equal(server.rev, revBefore + 1);
  assert.equal(server.rows.get('virtual-game/flow-skeleton').d, 0, '服务端留墓碑，不是删行');
  assert.equal(sync.status().state, SYNC_STATE.SYNCED);
});

test('功能开关关闭：完全不发请求', async () => {
  const server = fakeServer();
  const { store, sync } = (() => {
    const storage = memoryStorage();
    const store = createProgressStore({ cases: jubenCases, owner: 'user-a', storage, now: () => 1000, watch: false });
    store.boot();
    const sync = createProgressSync(store, { request: server.request, owner: 'user-a', storage, enabled: false, quietMs: 0 });
    return { store, sync };
  })();

  sync.start();
  store.toggle('virtual-game', 'flow-skeleton');
  sync.note();
  await sync.syncNow();

  assert.equal(server.calls.length, 0);
  assert.equal(sync.status().state, SYNC_STATE.OFF);
  assert.equal(store.isDone('virtual-game', 'flow-skeleton'), true);
});

test('徽章文案：三态 + 待同步计数', () => {
  assert.equal(syncText({ state: SYNC_STATE.GUEST, pending: 0 }), '本机记录 · 登录后跨设备');
  assert.equal(syncText({ state: SYNC_STATE.SYNCING, pending: 0 }), '同步中…');
  assert.equal(syncText({ state: SYNC_STATE.PENDING, pending: 3 }), '待同步 · 3 项');
  assert.equal(syncText({ state: SYNC_STATE.ERROR, pending: 1 }), '同步失败 · 点此重试');
  assert.equal(syncText({ state: SYNC_STATE.SYNCED, lastSyncAt: Date.now() }), '已同步 · 刚刚');
  assert.equal(syncText({ state: SYNC_STATE.SYNCED, lastSyncAt: Date.now() - 5 * 60_000 }), '已同步 · 5 分钟前');
});
