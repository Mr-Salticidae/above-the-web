// 学习进度的同步层：本地优先，服务端当镜像。
//
// 三条铁律，违反任何一条体验都比「不同步」更差：
//   1. 写入不等网络。勾选先落本地再排队，UI 立刻生效；弱网下不为一个复选框等往返。
//   2. 队列是功能的一半，不是加分项。断网 / 关标签页 / 服务端 5xx 都不许丢写，
//      所以队列落 localStorage，按 owner 分桶（换账号不能带着别人的待推项过去）。
//   3. 徽章常显状态，不弹 toast。静默失败比报错更让人不安。
//
// 这个文件不 import account-core（那会在 node --test 里因为没有 document 而炸），
// 请求函数由调用方注入：页面传 account-core 的 api，测试传假实现。

export const SYNC_STATE = {
  OFF: 'off', // 功能开关关闭 / 服务端没有这个接口：纯本地
  GUEST: 'guest', // 未登录
  SYNCING: 'syncing',
  SYNCED: 'synced',
  PENDING: 'pending', // 有队列但没推上去（离线 / 失败）
  ERROR: 'error', // 服务端出问题
};

const QUEUE_PREFIX = 'atw-juben-queue:';
const REV_PREFIX = 'atw-juben-rev:';
const SYNCED_PREFIX = 'atw-juben-synced:';
// 这台浏览器（这个存储桶）的匿名标识：服务端只拿它数「几台设备在同步」，
// 不认 UA、不认 IP，也不需要它稳定到能认人——换设备就是换一个随机串。
const DEVICE_KEY = 'atw-device-id';
const GUEST = 'guest';
const ENDPOINT = '/juben/progress';
// 单次最多带这么多项。服务端上限 500，这里留余量：一次勾不了这么多，
// 真到了这个数说明队列积压很久，分批推更稳。
const BATCH_LIMIT = 200;

const STATUS_TEXT = {
  [SYNC_STATE.OFF]: '本机记录',
  [SYNC_STATE.GUEST]: '本机记录 · 登录后跨设备',
  [SYNC_STATE.SYNCING]: '同步中…',
  [SYNC_STATE.SYNCED]: '已同步',
  [SYNC_STATE.PENDING]: '待同步',
  [SYNC_STATE.ERROR]: '同步失败 · 点此重试',
};

export function syncText(status) {
  const base = STATUS_TEXT[status.state] || STATUS_TEXT[SYNC_STATE.OFF];
  if (status.state === SYNC_STATE.PENDING) return `${base} · ${status.pending} 项`;
  if (status.state === SYNC_STATE.SYNCED && status.lastSyncAt) {
    const age = Date.now() - status.lastSyncAt;
    if (age < 60_000) return '已同步 · 刚刚';
    if (age < 60 * 60_000) return `已同步 · ${Math.floor(age / 60_000)} 分钟前`;
    return '已同步';
  }
  return base;
}

/** 「3 分钟前」这类说法，档案库状态卡与徽章共用一套口径。 */
export function relativeTime(at, now = Date.now()) {
  if (!Number.isFinite(at) || at <= 0) return '—';
  const age = Math.max(0, now - at);
  if (age < 60_000) return '刚刚';
  if (age < 60 * 60_000) return `${Math.floor(age / 60_000)} 分钟前`;
  if (age < 24 * 60 * 60_000) return `${Math.floor(age / 3_600_000)} 小时前`;
  if (age < 30 * 24 * 60 * 60_000) return `${Math.floor(age / 86_400_000)} 天前`;
  const date = new Date(at);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function defaultStorage() {
  try {
    const probe = '__atw_sync_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

const splitKey = (key) => {
  const slash = key.indexOf('/');
  return slash < 0 ? null : [key.slice(0, slash), key.slice(slash + 1)];
};

// 设备标识：够长、够随机、只含服务端正则允许的字符。
// crypto.randomUUID 在 http 页面（内网预览）也可用；老浏览器退到时间戳 + 随机数。
function createDeviceId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `dev-${crypto.randomUUID().replace(/-/g, '')}`;
    }
  } catch {
    /* 落到下面 */
  }
  const random = () => Math.random().toString(36).slice(2, 10);
  return `dev-${Date.now().toString(36)}${random()}${random()}`;
}

/**
 * @param {object} store  createProgressStore 的产物
 * @param {object} options
 * @param {(method: string, path: string, body?: object) => Promise<any>} options.request
 * @param {string} [options.owner]     当前桶（userId 或 'guest'）
 * @param {boolean} [options.enabled]  false = 纯本地（功能开关关掉）
 * @param {number} [options.quietMs]   勾选后多久合批（默认 1500ms）
 * @param {Storage|null} [options.storage]
 * @param {() => boolean} [options.online]
 */
export function createProgressSync(store, options = {}) {
  const request = options.request;
  // active 而不是 const：服务端还是旧版（接口 404）时要在运行时降级成纯本地
  let active = options.enabled !== false && typeof request === 'function';
  const quietMs = options.quietMs ?? 1500;
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const isOnline = options.online || (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));

  const listeners = new Set();

  let owner = options.owner || GUEST;
  let status = active ? (owner === GUEST ? SYNC_STATE.GUEST : SYNC_STATE.SYNCED) : SYNC_STATE.OFF;
  let lastSyncAt = null;
  let lastError = '';
  let rev = 0;
  let pending = new Map(); // key -> { c, m, d, t }
  let timer = null;
  let inflight = null;
  let reconcileNeeded = true; // 本机有服务端不知道的项，第一次全量拉取后要补推
  let deviceId = '';
  let remoteDevices = 0; // 服务端说这个账号有几台设备记过进度
  let serverLastSyncAt = null; // 任一设备最后一次推进度的时刻（服务端时钟）

  // ---------- 持久化 ----------

  function readRaw(key) {
    try {
      return storage ? storage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  function writeRaw(key, value) {
    try {
      if (!storage) return;
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    } catch {
      /* 存储写不进去也不该绑住勾选，队列退化成内存态 */
    }
  }

  // 设备标识只生成一次，之后一直复用——生成两次就等于把自己数成两台设备。
  function ensureDeviceId() {
    if (deviceId) return deviceId;
    const saved = readRaw(DEVICE_KEY);
    if (saved && /^[A-Za-z0-9_-]{8,64}$/.test(saved)) {
      deviceId = saved;
    } else {
      deviceId = createDeviceId();
      writeRaw(DEVICE_KEY, deviceId);
    }
    return deviceId;
  }

  function loadBucket(next) {
    owner = next;
    pending = new Map();
    rev = 0;
    const rawQueue = readRaw(`${QUEUE_PREFIX}${owner}`);
    if (rawQueue) {
      try {
        const parsed = JSON.parse(rawQueue);
        for (const [key, value] of Object.entries(parsed || {})) {
          const pair = splitKey(key);
          if (!pair || !value || typeof value.t !== 'number') continue;
          pending.set(key, { c: pair[0], m: pair[1], d: value.d ? 1 : 0, t: value.t });
        }
      } catch {
        /* 队列坏了就当空的，本地进度还在，下一次勾选会重新入队 */
      }
    }
    const rawRev = Number(readRaw(`${REV_PREFIX}${owner}`) || 0);
    rev = Number.isFinite(rawRev) && rawRev > 0 ? rawRev : 0;
    // 上次同步时间跟着账号存：刷新页面后状态卡还能说「3 分钟前」而不是「—」
    const rawSynced = Number(readRaw(`${SYNCED_PREFIX}${owner}`) || 0);
    lastSyncAt = Number.isFinite(rawSynced) && rawSynced > 0 ? rawSynced : null;
    reconcileNeeded = rev === 0;
  }

  function persistQueue() {
    if (!pending.size) {
      writeRaw(`${QUEUE_PREFIX}${owner}`, null);
      return;
    }
    const payload = {};
    for (const [key, item] of pending) payload[key] = { d: item.d, t: item.t };
    writeRaw(`${QUEUE_PREFIX}${owner}`, JSON.stringify(payload));
  }

  function persistRev() {
    writeRaw(`${REV_PREFIX}${owner}`, String(rev));
  }

  function persistSynced() {
    if (lastSyncAt) writeRaw(`${SYNCED_PREFIX}${owner}`, String(lastSyncAt));
  }

  // ---------- 状态广播 ----------

  function snapshotStatus() {
    return {
      state: status,
      pending: pending.size,
      lastSyncAt,
      error: lastError,
      owner,
      rev,
      // 状态卡要的两项：服务端看到的设备数、任一设备的最后写入时刻
      devices: remoteDevices,
      serverLastSyncAt,
    };
  }

  function setStatus(next) {
    if (status === next) {
      emit();
      return;
    }
    status = next;
    emit();
  }

  function emit() {
    const detail = snapshotStatus();
    for (const listener of [...listeners]) {
      try {
        listener(detail);
      } catch {
        /* 订阅者自己炸了不该拖垮同步 */
      }
    }
  }

  // ---------- 队列 ----------

  // 本机改过的项收进队列：同一项后来的覆盖先前的（只留最后一次意图）
  function collectDirty() {
    for (const key of store.takeDirty()) {
      const pair = splitKey(key);
      if (!pair) continue;
      const item = store.snapshot().items[key];
      if (!item) continue;
      pending.set(key, { c: pair[0], m: pair[1], d: item.d, t: item.t });
    }
    if (pending.size) persistQueue();
    return pending.size;
  }

  function schedule() {
    if (!active || owner === GUEST || !pending.size) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      flush();
    }, quietMs);
    // node 里跑测试时别让这个定时器拖住进程退出（浏览器里 setTimeout 返回数字，无副作用）
    timer?.unref?.();
  }

  function payloadOf(items) {
    return items.map(([key, item]) => {
      const pair = splitKey(key);
      return { caseId: pair[0], moduleId: pair[1], done: item.d, at: item.t };
    });
  }

  // 服务端回来的增量一律并进本地；返回给调用方是为了推进 reconcileNeeded
  function absorb(response) {
    if (!response) return null;
    const result = store.applyRemote(response.items || []);
    if (Number.isFinite(response.rev)) {
      rev = response.rev;
      store.setRev(rev);
      persistRev();
    }
    // 设备数与「任一设备的最后写入」只在拉取响应里出现；没有就保留上一次的值
    if (Number.isFinite(response.devices)) remoteDevices = response.devices;
    if (Number.isFinite(response.lastSyncAt)) serverLastSyncAt = response.lastSyncAt;
    // 本机这条比服务端新：推回去（几乎只发生在「推送途中又勾了一次」）
    for (const key of result.kept) {
      const item = store.snapshot().items[key];
      const pair = splitKey(key);
      if (!item || !pair) continue;
      pending.set(key, { c: pair[0], m: pair[1], d: item.d, t: item.t });
    }
    return result;
  }

  async function pullOnce() {
    const since = rev;
    const response = await request('GET', `${ENDPOINT}?since=${since}`);
    const result = absorb(response);

    // 首次全量拉取后补推：本机有、服务端没有的项（老数据迁移、开关打开前勾的）
    if (reconcileNeeded) {
      reconcileNeeded = false;
      const remote = new Set((response.items || []).map((row) => `${row.caseId}/${row.moduleId}`));
      const local = store.snapshot().items;
      let added = 0;
      for (const [key, item] of Object.entries(local)) {
        if (remote.has(key)) continue;
        const pair = splitKey(key);
        if (!pair) continue;
        pending.set(key, { c: pair[0], m: pair[1], d: item.d, t: item.t });
        added += 1;
      }
      if (added) persistQueue();
      if (result && result.kept.length) persistQueue();
      // 不在这里再调一次 flush：外面那层 pushOnce 会把这个积压一起推走，
      // 而 flush 的 inflight 就是当前这个 promise，自等会永远等下去。
    } else if (result && result.kept.length) {
      persistQueue();
    }
    return response;
  }

  async function pushOnce() {
    const entries = [...pending].slice(0, BATCH_LIMIT);
    if (!entries.length) return null;
    const sent = new Map(entries);
    const response = await request('POST', ENDPOINT, {
      baseRev: rev,
      deviceId: ensureDeviceId(),
      items: payloadOf(entries),
    });

    absorb(response);

    // 只清掉「推的时候就是这一版」的项：请求在飞的时候用户又勾了一下，
    // 那条的 t 已经变了，必须留在队列里等下一批。
    for (const [key, item] of sent) {
      const current = pending.get(key);
      if (current && current.t === item.t && current.d === item.d) pending.delete(key);
    }
    persistQueue();
    return response;
  }

  async function flush() {
    if (!active || owner === GUEST) {
      setStatus(active ? SYNC_STATE.GUEST : SYNC_STATE.OFF);
      return null;
    }
    if (inflight) return inflight;
    if (!isOnline()) {
      setStatus(pending.size ? SYNC_STATE.PENDING : SYNC_STATE.ERROR);
      return null;
    }

    inflight = (async () => {
      setStatus(SYNC_STATE.SYNCING);
      try {
        // 每次同步都先拉增量：别的设备做的改动要在这一轮就合并进来，
        // 否则本机的旧状态会盖掉刚在手机上取消的那一项。
        const pulled = await pullOnce();
        const pushed = pending.size ? await pushOnce() : null;
        lastSyncAt = Date.now();
        lastError = '';
        persistRev();
        persistSynced();
        setStatus(pending.size ? SYNC_STATE.PENDING : SYNC_STATE.SYNCED);
        if (pending.size) schedule();
        return pushed || pulled;
      } catch (error) {
        lastError = error && error.message ? error.message : '同步失败';
        const code = error && error.status;
        // 服务端没有这个接口（旧版部署）/ 功能被关：退回纯本地，不折腾用户
        if (code === 404 || code === 405) {
          enabledOverrideOff();
          return null;
        }
        // 失败后不自动重排：服务端 5xx 时每 1.5 秒重打一次会变成自我 DDoS。
        // 下一次触发来自用户勾选、网络恢复、切回标签页或点徽章——都足够频繁。
        setStatus(code === 0 || !isOnline() ? SYNC_STATE.PENDING : SYNC_STATE.ERROR);
        return null;
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  }

  // 服务端还没上线这个接口：静默降级成「本机记录」，勾选照旧
  function enabledOverrideOff() {
    active = false;
    pending = new Map();
    status = SYNC_STATE.OFF;
    lastError = '';
    emit();
  }

  // ---------- 对外 ----------

  const api = {
    get owner() {
      return owner;
    },
    get enabled() {
      return active;
    },

    /** 挂上订阅与事件；返回卸载函数（页面反复初始化时用得到） */
    start() {
      loadBucket(owner);
      collectDirty();
      if (!active) {
        setStatus(SYNC_STATE.OFF);
        return api;
      }
      if (owner === GUEST) {
        setStatus(SYNC_STATE.GUEST);
        return api;
      }
      setStatus(SYNC_STATE.SYNCING);
      flush();
      return api;
    },

    /**
     * 换桶（登录 / 登出 / 切号）。必须在 store.setOwner 之前调：
     * 否则上一账号那批还没推上去的项会被记到新账号名下。
     */
    setOwner(next) {
      const target = next || GUEST;
      if (target === owner) return;
      collectDirty(); // 归到旧 owner 的队列里，随它一起存档
      persistQueue();
      loadBucket(target);
      if (!active) return setStatus(SYNC_STATE.OFF);
      if (target === GUEST) return setStatus(SYNC_STATE.GUEST);
      setStatus(SYNC_STATE.SYNCING);
      flush();
    },

    /** 勾选后由页面调用（也可直接靠 store.subscribe 触发） */
    note() {
      if (!active) return;
      collectDirty();
      if (!pending.size) {
        setStatus(owner === GUEST ? SYNC_STATE.GUEST : status);
        return;
      }
      if (owner === GUEST) {
        // 未登录：先存着，登录后并入账号那一轮一起推
        setStatus(SYNC_STATE.GUEST);
        return;
      }
      if (status !== SYNC_STATE.SYNCING) setStatus(SYNC_STATE.PENDING);
      schedule();
    },

    syncNow() {
      if (timer) clearTimeout(timer);
      timer = null;
      collectDirty();
      return flush();
    },

    /** 清空（本地 + 服务端）：先清本地再打 DELETE，服务端写墓碑让别的设备跟着归零 */
    async reset() {
      store.clearAll();
      pending = new Map();
      persistQueue();
      if (!active || owner === GUEST) {
        setStatus(active ? SYNC_STATE.GUEST : SYNC_STATE.OFF);
        return;
      }
      setStatus(SYNC_STATE.SYNCING);
      try {
        const response = await request('DELETE', ENDPOINT);
        rev = Number.isFinite(response?.rev) ? response.rev : 0;
        store.setRev(rev);
        persistRev();
        reconcileNeeded = false;
        lastSyncAt = Date.now();
        persistSynced();
        setStatus(SYNC_STATE.SYNCED);
      } catch (error) {
        lastError = error && error.message ? error.message : '同步失败';
        setStatus(SYNC_STATE.ERROR);
      }
    },

    status: snapshotStatus,

    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return api;
}

/** 把状态渲染到徽章元素上；没有元素就静默跳过。 */
export function mountBadge(element, sync) {
  if (!element || !sync) return () => {};
  const render = (status) => {
    element.dataset.state = status.state;
    element.textContent = syncText(status);
    element.title = status.error || '点击立即同步';
  };
  render(sync.status());
  const off = sync.subscribe(render);
  element.addEventListener('click', () => {
    if (element.dataset.state === SYNC_STATE.SYNCING) return;
    sync.syncNow();
  });
  return off;
}
