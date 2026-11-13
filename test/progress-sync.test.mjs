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
    devices: 0, // 服务端记账的「几台设备」
    lastSyncAt: null,
    clampAt: null, // 设成数字可模拟服务端夹紧 client_at
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
        return {
          rev,
          items: snapshot((row) => row.rev > since),
          devices: state.devices,
          lastSyncAt: state.lastSyncAt,
          serverTime: Date.now(),
        };
      }
      if (method === 'POST' && route === '/juben/progress') {
        if (state.gate) await state.gate.promise;
        if (body.items.length) rev += 1;
        for (const item of body.items) {
          const key = `${item.caseId}/${item.moduleId}`;
          const at = state.clampAt === null ? item.at : Math.min(item.at, state.clampAt);
          const row = rows.get(key);
          if (!row || at > row.t || (at === row.t && item.done > row.d)) {
            rows.set(key, { d: item.done, t: at, rev });
          }
        }
        const baseRev = body.baseRev || 0;
        return {
          rev,
          items: snapshot((row) => row.rev > baseRev),
          devices: state.devices,
          lastSyncAt: state.lastSyncAt,
          serverTime: Date.now(),
        };
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

test('服务端夹紧时间戳：POST 回显覆盖已发送项，队列与本地一起收敛', async () => {
  const { store, sync, server, storage } = harness({ quietMs: 10_000 });
  sync.start();
  await sync.syncNow();
  server.clampAt = 10_000;

  store.toggle('virtual-game', 'flow-skeleton'); // 本地 t=11000，服务端会夹到 10000
  sync.note();
  await sync.syncNow();

  assert.equal(store.snapshot().items['virtual-game/flow-skeleton'].t, 10_000);
  assert.equal(server.rows.get('virtual-game/flow-skeleton').t, 10_000);
  assert.equal(queueOf(storage), null, '已接受的项不能带着本地旧时间戳直接出队');

  const posts = server.calls.filter((entry) => entry.method === 'POST').length;
  await sync.syncNow();
  assert.equal(server.calls.filter((entry) => entry.method === 'POST').length, posts, '下一轮不该反复补推');
});

test('服务端夹紧时间戳时，请求途中产生的新编辑仍然保留', async () => {
  const { store, sync, server, storage } = harness({ quietMs: 10_000 });
  sync.start();
  await sync.syncNow();
  server.clampAt = 10_000;
  let open;
  server.gate = { promise: new Promise((resolve) => { open = resolve; }) };

  store.toggle('virtual-game', 'five-stages');
  sync.note();
  const flight = sync.syncNow();
  await until(() => server.calls.some((entry) => entry.method === 'POST'));
  store.toggle('virtual-game', 'five-stages'); // 新编辑：取消，t=12000
  sync.note();
  open();
  await flight;

  assert.deepEqual(store.snapshot().items['virtual-game/five-stages'], { d: 0, t: 12_000 });
  assert.deepEqual(queueOf(storage)['virtual-game/five-stages'], { d: 0, t: 12_000 });

  server.gate = null;
  server.clampAt = null;
  await sync.syncNow();
  assert.equal(server.rows.get('virtual-game/five-stages').d, 0);
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

test('换账号时 delayed GET：A 的响应不能改写 B 的仓库、队列、rev 或状态', async () => {
  let online = true;
  let currentOwner = 'user-a';
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const server = {
    calls: [],
    async request(method, path, body) {
      server.calls.push({ method, path, body, owner: currentOwner });
      if (method === 'GET' && currentOwner === 'user-a') {
        const response = {
          rev: 7,
          items: [{ caseId: 'virtual-game', moduleId: 'flow-skeleton', done: 1, at: 1000 }],
        };
        await gate;
        return response;
      }
      if (method === 'GET') return { rev: 4, items: [] };
      throw new Error(`未预期的请求 ${method}`);
    },
  };
  const storage = memoryStorage({
    'atw-juben-progress-v2:user-b': JSON.stringify({
      version: 2,
      rev: 4,
      items: { 'virtual-game/god-view': { d: 1, t: 9000 } },
    }),
    'atw-juben-rev:user-b': '4',
    'atw-juben-queue:user-b': JSON.stringify({ 'virtual-game/god-view': { d: 1, t: 9000 } }),
  });
  const { store, sync } = harness({ server, storage, online: () => online });
  sync.start();
  const flightA = sync.syncNow();
  await until(() => server.calls.some((entry) => entry.method === 'GET'));

  online = false;
  currentOwner = 'user-b';
  sync.setOwner('user-b');
  store.setOwner('user-b');
  assert.equal(sync.status().state, SYNC_STATE.PENDING);
  release();
  await flightA;

  assert.equal(store.snapshot().items['virtual-game/flow-skeleton'], undefined, 'A 的项不能并入 B');
  assert.equal(store.isDone('virtual-game', 'god-view'), true);
  assert.deepEqual(queueOf(storage, 'user-b'), { 'virtual-game/god-view': { d: 1, t: 9000 } });
  assert.equal(sync.status().rev, 4, 'A 的旧 rev 不能覆盖 B');
  assert.equal(sync.status().pending, 1);
  assert.equal(sync.status().state, SYNC_STATE.PENDING);
});

test('换账号时 delayed POST：旧响应被忽略，旧 finally 也不清掉 B 的在飞请求', async () => {
  let currentOwner = 'user-a';
  let releaseA;
  let releaseB;
  const gateA = new Promise((resolve) => { releaseA = resolve; });
  const gateB = new Promise((resolve) => { releaseB = resolve; });
  const server = {
    calls: [],
    async request(method, path, body) {
      const requestOwner = currentOwner;
      server.calls.push({ method, path, body, owner: requestOwner });
      if (method === 'GET') return { rev: requestOwner === 'user-b' ? 4 : 0, items: [] };
      if (method === 'POST' && requestOwner === 'user-a') {
        await gateA;
        return {
          rev: 1,
          items: [{ caseId: 'virtual-game', moduleId: 'flow-skeleton', done: 1, at: body.items[0].at }],
        };
      }
      if (method === 'POST' && requestOwner === 'user-b') {
        await gateB;
        return {
          rev: 5,
          items: [{ caseId: 'virtual-game', moduleId: 'god-view', done: 1, at: body.items[0].at }],
        };
      }
      throw new Error(`未预期的请求 ${method} ${requestOwner}`);
    },
  };
  const storage = memoryStorage({
    'atw-juben-progress-v2:user-b': JSON.stringify({
      version: 2,
      rev: 4,
      items: { 'virtual-game/god-view': { d: 1, t: 9000 } },
    }),
    'atw-juben-rev:user-b': '4',
    'atw-juben-queue:user-b': JSON.stringify({ 'virtual-game/god-view': { d: 1, t: 9000 } }),
  });
  const { store, sync } = harness({ server, storage, quietMs: 10_000 });
  sync.start();
  await sync.syncNow();

  store.toggle('virtual-game', 'flow-skeleton');
  sync.note();
  const flightA = sync.syncNow();
  await until(() => server.calls.some((entry) => entry.method === 'POST' && entry.owner === 'user-a'));

  currentOwner = 'user-b';
  sync.setOwner('user-b');
  store.setOwner('user-b');
  const flightB = sync.syncNow();
  await until(() => server.calls.some((entry) => entry.method === 'POST' && entry.owner === 'user-b'));

  releaseA();
  await flightA;
  assert.equal(sync.status().state, SYNC_STATE.SYNCING, 'A 完成后不能把 B 标成已同步');
  assert.equal(sync.status().rev, 4);
  assert.equal(store.snapshot().items['virtual-game/flow-skeleton'], undefined);
  assert.equal(sync.syncNow(), flightB, 'A 的 finally 不能清掉 B 的 inflight 引用');

  releaseB();
  await flightB;
  assert.equal(sync.status().state, SYNC_STATE.SYNCED);
  assert.equal(sync.status().rev, 5);
  assert.equal(sync.status().pending, 0);
  assert.equal(store.isDone('virtual-game', 'god-view'), true);
  assert.equal(store.snapshot().items['virtual-game/flow-skeleton'], undefined);
  assert.equal(queueOf(storage, 'user-b'), null);
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

  assert.equal(await sync.reset(), true);

  assert.equal(store.count('virtual-game'), 0);
  assert.equal(server.rev, revBefore + 1);
  assert.equal(server.rows.get('virtual-game/flow-skeleton').d, 0, '服务端留墓碑，不是删行');
  assert.equal(sync.status().state, SYNC_STATE.SYNCED);
});

test('清空失败：保留本地数据与待推队列，并明确返回失败', async () => {
  const { store, sync, server, storage } = harness({ quietMs: 10_000 });
  sync.start();
  await sync.syncNow();
  store.toggle('virtual-game', 'flow-skeleton');
  sync.note();
  server.failNext = true;

  assert.equal(await sync.reset(), false);
  assert.equal(store.isDone('virtual-game', 'flow-skeleton'), true, 'DELETE 失败不能先清本地');
  assert.deepEqual(queueOf(storage), { 'virtual-game/flow-skeleton': { d: 1, t: 11_000 } });
  assert.equal(sync.status().state, SYNC_STATE.ERROR);

  assert.equal(await sync.reset(), true, '网络恢复后仍可按原数据执行清空');
  assert.equal(store.count('virtual-game'), 0);
  assert.equal(queueOf(storage), null);
});

test('清空成功后，之前 delayed GET 的旧响应不能把进度恢复', async () => {
  let delayGet = false;
  let open;
  const server = {
    calls: [],
    async request(method, path, body) {
      server.calls.push({ method, path, body });
      if (method === 'GET') {
        const response = {
          rev: 1,
          items: [{ caseId: 'virtual-game', moduleId: 'flow-skeleton', done: 1, at: 11_000 }],
        };
        if (delayGet) {
          delayGet = false;
          await new Promise((resolve) => { open = resolve; });
        }
        return response;
      }
      if (method === 'DELETE') return { rev: 2, cleared: 1, serverTime: Date.now() };
      throw new Error(`未预期的请求 ${method}`);
    },
  };
  const { store, sync } = harness({ server });
  sync.start();
  await sync.syncNow(); // 先拿到服务端已有的完成项

  delayGet = true;
  const stale = sync.syncNow();
  await until(() => server.calls.filter((entry) => entry.method === 'GET').length === 2);
  const resetting = sync.reset();
  assert.equal(await resetting, true);
  open();
  await stale;

  assert.equal(store.count('virtual-game'), 0);
  assert.equal(sync.status().rev, 2);
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

// ---- 档案库状态卡：设备标识、上次同步、设备数 ----

test('推送带上设备标识，且两次同步用的是同一个', async () => {
  const { store, sync, server, storage } = harness({ quietMs: 10_000 });
  sync.start();
  await sync.syncNow();

  store.toggle('virtual-game', 'flow-skeleton');
  sync.note();
  await sync.syncNow();
  store.toggle('virtual-game', 'god-view');
  sync.note();
  await sync.syncNow();

  const posts = server.calls.filter((entry) => entry.method === 'POST');
  assert.equal(posts.length, 2);
  const [first, second] = posts.map((entry) => entry.body.deviceId);
  assert.match(first, /^[A-Za-z0-9_-]{8,64}$/, '设备标识要符合服务端的字符白名单');
  assert.equal(first, second, '同一个浏览器不该把自己数成两台设备');
  assert.equal(storage.dump()['atw-device-id'], first, '标识落盘了，刷新后还认得出自己');
});

test('设备标识在两次页面会话之间复用（不是每次加载新生成）', async () => {
  const storage = memoryStorage();
  const first = harness({ storage, quietMs: 10_000 });
  first.sync.start();
  await first.sync.syncNow();
  // 设备标识是第一次推送时才生成的：只读页面不写库，不必先跟服务端报个到
  first.store.toggle('virtual-game', 'flow-skeleton');
  first.sync.note();
  await first.sync.syncNow();
  const id = storage.dump()['atw-device-id'];
  assert.ok(id);

  const second = harness({ storage, quietMs: 10_000 });
  second.sync.start();
  await second.sync.syncNow();
  second.store.toggle('virtual-game', 'god-view');
  second.sync.note();
  await second.sync.syncNow();
  const posts = second.server.calls.filter((entry) => entry.method === 'POST');
  assert.equal(posts.at(-1).body.deviceId, id, '第二个会话沿用同一个标识');
});

test('上次同步时间跟着账号落盘：刷新后状态卡还能说「刚才」', async () => {
  const storage = memoryStorage();
  const first = harness({ storage });
  first.sync.start();
  await first.sync.syncNow();
  const at = first.sync.status().lastSyncAt;
  assert.ok(Number.isFinite(at));
  assert.ok(storage.dump()['atw-juben-synced:user-a'], '时间戳写进了当前账号的桶');

  const second = harness({ storage });
  second.sync.start();
  assert.equal(second.sync.status().lastSyncAt, at, '新实例起来就带着上次的时间');
});

test('换账号：同步时间不跟着串桶', async () => {
  const storage = memoryStorage();
  const { sync } = harness({ storage });
  sync.start();
  await sync.syncNow();
  assert.ok(sync.status().lastSyncAt > 0);

  sync.setOwner('user-b');
  assert.equal(sync.status().lastSyncAt, null, '另一个账号还没同步过');
});

test('服务端说有几台设备，状态里就透出几台', async () => {
  const server = fakeServer();
  server.devices = 3;
  server.lastSyncAt = 123456;
  const { sync } = harness({ server });
  sync.start();
  await sync.syncNow();
  const status = sync.status();
  assert.equal(status.devices, 3);
  assert.equal(status.serverLastSyncAt, 123456);
});

test('同步失败时不谎报设备数（保留上一次读到的值）', async () => {
  const server = fakeServer();
  server.devices = 2;
  const { store, sync } = harness({ server, quietMs: 10_000 });
  sync.start();
  await sync.syncNow();
  assert.equal(sync.status().devices, 2);

  server.failNext = true;
  store.toggle('virtual-game', 'five-stages');
  sync.note();
  await sync.syncNow();
  assert.equal(sync.status().devices, 2, '失败不该把已知值清成 0');
});
