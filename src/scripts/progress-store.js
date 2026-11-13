// 学习进度仓库（v2）。
//
// 之前的形状是 { "<caseId>": [0, 1, 2, 3] }，直接躺在 localStorage 里，两个页面各读各写。
// 三个问题逼着要收成这一层：
//   1. 数组里存的是模块「下标」，模块顺序一调整，所有人的进度全体错位；
//   2. 一把钥匙全站共用，同一个浏览器切账号会看到别人的勾选；
//   3. 两个页面各自 JSON.parse / stringify，行为随时可能分叉。
//
// v2 的规矩：
//   - 每一项按 `${caseId}/${moduleSlug}` 存，与顺序无关；
//   - 按账号分桶（atw-juben-progress-v2:<userId>，未登录是 :guest）；
//   - 取消勾选写 d:0 而不是删行——将来同步要靠这个「墓碑」把取消传播出去；
//   - 老数据在首次加载时就地迁移，迁移完留一份 backup 不删。
//
// P0 是本地：迁移、分桶、订阅。P1 在这一层上加了 applyRemote / setRev / takeDirty，
// 网络与队列都在 src/scripts/progress-sync.js 里，这个文件仍然不碰 fetch。

export const GUEST_OWNER = 'guest';
export const SCHEMA_VERSION = 2;

// 「读到哪一卷」也走同一套 items：卷 id 用保留卷名 reading，模块位写 case-<卷 id>。
// 好处是不必为它另开一套存储与同步协议；代价是这些行不参与完成率
// （count / countAll 只认目录里真有的 slug），所以不会污染进度条。
export const SPOT_CASE = 'reading';
export const spotKey = (caseId) => itemKey(SPOT_CASE, `case-${caseId}`);
// 同一卷十分钟内重复进入不再写一条：刷新页面不该变成一次服务端写入
export const SPOT_QUIET_MS = 10 * 60_000;

const KEY_PREFIX = 'atw-juben-progress-v2:';
const LEGACY_KEY = 'atw-juben-progress-v1';
const LEGACY_BACKUP_KEY = 'atw-juben-progress-v1-backup';

export const itemKey = (caseId, moduleId) => `${caseId}/${moduleId}`;

function emptyState() {
  return { version: SCHEMA_VERSION, rev: 0, items: {} };
}

// localStorage 在隐私模式 / 被禁用时会直接抛错。探一次，探不通就退化成内存态：
// 功能照用，只是关掉页面就没了——总比整页脚本崩掉强。
function defaultStorage() {
  try {
    const probe = '__atw_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeCases(cases) {
  const catalog = new Map();
  for (const item of cases || []) {
    if (!item || !item.id) continue;
    const slugs = (item.modules || [])
      .map((module) => (typeof module === 'string' ? module : module && module.slug))
      .filter((slug) => typeof slug === 'string' && slug);
    catalog.set(item.id, slugs);
  }
  return catalog;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// 取时间更晚的那条；同一毫秒内完成优先（乐观：宁可多记一条完成，也不要让勾选凭空消失）。
function newerOf(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (b.t > a.t) return b;
  if (b.t < a.t) return a;
  return b.d > a.d ? b : a;
}

// 与服务端完全同一套比较规则：先比时间，同刻比 d（完成优先）。
// 用正负号而不是返回对象，是因为 applyRemote 要区分「本机更新」和「两边一致」。
function compareItems(a, b) {
  if (a.t !== b.t) return a.t - b.t;
  return a.d - b.d;
}

/**
 * @param {object} options
 * @param {Array} options.cases        剧本目录：[{ id, modules: [{ slug }] }]
 * @param {string} [options.owner]     当前桶：用户 id 或 'guest'
 * @param {Storage|null} [options.storage] 注入存储（测试用；不传则用 localStorage）
 * @param {() => number} [options.now] 注入时钟（测试用）
 * @param {boolean} [options.watch]    是否监听其它标签页的写入（默认：用真 localStorage 时开）
 */
export function createProgressStore(options = {}) {
  const catalog = normalizeCases(options.cases);
  const now = typeof options.now === 'function' ? options.now : () => Date.now();
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const listeners = new Set();

  let owner = options.owner || GUEST_OWNER;
  let state = emptyState();
  let memory = null; // storage 不可用时的退路
  // 「本机改过、还没同步上去」的项。同步层取走后再推，失败会由它自己重新排队。
  const dirty = new Set();

  const keyFor = (who) => `${KEY_PREFIX}${who}`;

  function readRaw(key) {
    try {
      return storage ? storage.getItem(key) : memory ? memory[key] : null;
    } catch {
      return null;
    }
  }

  function writeRaw(key, value) {
    try {
      if (storage) {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } else {
        memory = memory || {};
        if (value === null) delete memory[key];
        else memory[key] = value;
      }
      return true;
    } catch {
      return false;
    }
  }

  function parseState(raw) {
    if (!raw) return emptyState();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return emptyState();
    }
    if (!isRecord(parsed) || !isRecord(parsed.items)) return emptyState();
    const items = {};
    for (const [key, value] of Object.entries(parsed.items)) {
      if (!isRecord(value)) continue;
      if (typeof value.t !== 'number' || !Number.isFinite(value.t)) continue;
      items[key] = { d: value.d ? 1 : 0, t: value.t };
    }
    return {
      version: SCHEMA_VERSION,
      rev: Number.isFinite(parsed.rev) ? parsed.rev : 0,
      items,
    };
  }

  // 别人写的条目先并进来，别直接覆盖——两个标签页同时勾，覆盖会丢一边。
  function mergeInto(target, source) {
    for (const [key, item] of Object.entries(source)) {
      target[key] = newerOf(target[key], item);
    }
    return target;
  }

  function persist() {
    return writeRaw(keyFor(owner), JSON.stringify(state));
  }

  function emit(reason) {
    const detail = { reason, owner, done: countAll(), items: { ...state.items } };
    for (const listener of [...listeners]) {
      try {
        listener(detail);
      } catch {
        // 订阅者自己炸了不该拖垮仓库
      }
    }
  }

  /**
   * 老数据迁移：v1 的下标按「当前模块顺序」映射成 slug。
   * 越界的下标说明对应模块已被删掉过，丢弃并记数（返回值里带出来，页面可提示）。
   */
  function migrateLegacy(target) {
    const raw = readRaw(LEGACY_KEY);
    if (!raw) return { migrated: 0, dropped: 0 };

    let legacy;
    try {
      legacy = JSON.parse(raw);
    } catch {
      legacy = null;
    }

    let migrated = 0;
    let dropped = 0;
    const items = {};

    if (isRecord(legacy)) {
      for (const [caseId, value] of Object.entries(legacy)) {
        if (!Array.isArray(value)) continue;
        const slugs = catalog.get(caseId);
        for (const index of value) {
          const slug = slugs && Number.isInteger(index) ? slugs[index] : undefined;
          if (!slug) {
            dropped += 1;
            continue;
          }
          items[itemKey(caseId, slug)] = { d: 1, t: now() };
          migrated += 1;
        }
      }
    }

    if (migrated > 0) {
      const bucket = parseState(readRaw(keyFor(target)));
      mergeInto(bucket.items, items);
      writeRaw(keyFor(target), JSON.stringify(bucket));
    }

    // 留一份原始快照：万一映射表理解错了，还能人工还原。
    if (!readRaw(LEGACY_BACKUP_KEY)) writeRaw(LEGACY_BACKUP_KEY, raw);
    writeRaw(LEGACY_KEY, null);

    return { migrated, dropped };
  }

  function load(nextOwner) {
    owner = nextOwner || GUEST_OWNER;
    state = parseState(readRaw(keyFor(owner)));
  }

  function countFor(caseId) {
    const slugs = catalog.get(caseId);
    if (!slugs) return 0;
    let total = 0;
    for (const [key, item] of Object.entries(state.items)) {
      if (!item.d) continue;
      const slash = key.indexOf('/');
      if (slash < 0) continue;
      if (key.slice(0, slash) !== caseId) continue;
      if (slugs.includes(key.slice(slash + 1))) total += 1;
    }
    return total;
  }

  function countAll() {
    let total = 0;
    for (const [key, item] of Object.entries(state.items)) {
      if (!item.d) continue;
      const slash = key.indexOf('/');
      if (slash < 0) continue;
      const slugs = catalog.get(key.slice(0, slash));
      if (slugs && slugs.includes(key.slice(slash + 1))) total += 1;
    }
    return total;
  }

  const api = {
    get owner() {
      return owner;
    },
    get rev() {
      return state.rev;
    },

    /** 首次加载：先把老数据迁进当前桶，再读当前桶。 */
    boot() {
      const result = migrateLegacy(owner);
      load(owner);
      emit('boot');
      return result;
    },

    /** 切账号 / 登录态变化时重绑到另一个桶。 */
    setOwner(next) {
      if (!next || next === owner) return;
      const result = migrateLegacy(next); // 只在老数据还在时才有动作，通常是空转
      load(next);
      emit('owner');
      return result;
    },

    /** 未登录时的本地进度，登录后并进账号（幂等：并多少次结果一样）。 */
    adoptGuest() {
      if (owner === GUEST_OWNER) return 0;
      const guest = parseState(readRaw(keyFor(GUEST_OWNER)));
      const incoming = Object.keys(guest.items).length;
      if (!incoming) return 0;
      mergeInto(state.items, guest.items);
      // 并进来的这批要推给账号，否则换个设备就「刚才勾的怎么没了」
      for (const key of Object.keys(guest.items)) dirty.add(key);
      persist();
      writeRaw(keyFor(GUEST_OWNER), null);
      emit('adopt');
      return incoming;
    },

    reload() {
      load(owner);
      emit('external');
    },

    isDone(caseId, moduleId) {
      const item = state.items[itemKey(caseId, moduleId)];
      return Boolean(item && item.d);
    },

    doneIds(caseId) {
      const slugs = catalog.get(caseId) || [];
      return slugs.filter((slug) => {
        const item = state.items[itemKey(caseId, slug)];
        return Boolean(item && item.d);
      });
    },

    count: countFor,
    countAll,

    /**
     * 记下「现在正读这一卷」。写的是同一份 items，只是走保留卷名 reading，
     * 因此它跟着进度一起上传，换台设备也能接着上次那一卷打开。
     * 不 emit：切卷本来就要重画，再广播一次会让页面白重渲染一遍。
     */
    markReading(caseId) {
      if (!catalog.has(caseId)) return false;
      const key = spotKey(caseId);
      const stamp = now();
      // 已经就是「最近读的一卷」且刚记过：不再写。否则每刷新一次页面就给服务端加一行。
      const last = api.lastReading();
      if (last && last.caseId === caseId && stamp - last.at < SPOT_QUIET_MS) return false;
      state.items[key] = { d: 1, t: stamp };
      dirty.add(key);
      persist();
      return true;
    },

    /** 最近读过的那一卷（越界 / 已下架的卷直接忽略，不留幽灵入口）。 */
    lastReading() {
      let best = null;
      for (const [key, item] of Object.entries(state.items)) {
        if (!item.d) continue;
        if (!key.startsWith(`${SPOT_CASE}/case-`)) continue;
        const caseId = key.slice(`${SPOT_CASE}/case-`.length);
        if (!catalog.has(caseId)) continue;
        if (!best || item.t > best.at) best = { caseId, at: item.t };
      }
      return best;
    },

    toggle(caseId, moduleId) {
      const key = itemKey(caseId, moduleId);
      const next = !api.isDone(caseId, moduleId);
      state.items[key] = { d: next ? 1 : 0, t: now() };
      dirty.add(key);
      persist();
      emit('toggle');
      return next;
    },

    /** 清空一卷：写成墓碑而不是删行，将来同步才能把「清空」传播到别的设备。 */
    resetCase(caseId) {
      const slugs = catalog.get(caseId) || [];
      const stamp = now();
      for (const slug of slugs) {
        const key = itemKey(caseId, slug);
        state.items[key] = { d: 0, t: stamp };
        dirty.add(key);
      }
      persist();
      emit('reset');
    },

    /** 整桶丢弃（换设备重置 / 测试用），本地与存储一起清。 */
    clearAll() {
      state = emptyState();
      dirty.clear();
      persist();
      emit('clear');
    },

    /**
     * 合并服务端下发的增量。规则与服务端一致：先比 t，同刻 d=1 优先。
     * 返回 { applied, kept }：
     *   applied —— 服务端赢了，本地已被覆盖（同步层拿它推进「已知」）
     *   kept    —— 本机这条更晚，服务端那份是旧的；同步层要把它推回去
     */
    applyRemote(items) {
      const applied = [];
      const kept = [];
      let changed = false;
      for (const item of items || []) {
        if (!item || typeof item.caseId !== 'string' || typeof item.moduleId !== 'string') continue;
        const key = itemKey(item.caseId, item.moduleId);
        const incoming = { d: item.done ? 1 : 0, t: Number(item.at) || 0 };
        const local = state.items[key];
        if (!local) {
          state.items[key] = incoming;
          applied.push(key);
          changed = true;
          continue;
        }
        const order = compareItems(local, incoming);
        if (order > 0) kept.push(key);
        else if (order < 0) {
          state.items[key] = incoming;
          applied.push(key);
          changed = true;
        }
      }
      if (changed) {
        persist();
        emit('remote');
      }
      return { applied, kept };
    },

    /** 记下服务端版本号（客户端游标，只用来做增量拉取）。 */
    setRev(value) {
      if (!Number.isFinite(value) || value === state.rev) return;
      state.rev = value;
      persist();
    },

    /** 取走待同步的键（同步层每个批次取一次，失败时由队列兜底）。 */
    takeDirty() {
      const keys = [...dirty];
      dirty.clear();
      return keys;
    },

    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** 调试与 P1 用的内部快照，不做外部契约。 */
    snapshot() {
      return { ...state, items: { ...state.items } };
    },
  };

  const usingRealStorage = storage && typeof window !== 'undefined' && storage === window.localStorage;
  if (options.watch !== false && usingRealStorage) {
    window.addEventListener('storage', (event) => {
      if (!event.key || event.key === keyFor(owner)) api.reload();
    });
  }

  return api;
}
