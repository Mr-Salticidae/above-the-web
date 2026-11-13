最后更新：2026-11-13
状态：**P0 与 P1 均已实施并上线（2026-11-13）；P2 待用户反馈后再定**
三项待拍板已于 2026-11-13 按建议定案：取消勾选不加二次确认、member 也能同步、P0 与 P1 分开上线。

# 学习进度跨设备同步 · 实施计划

## 一、要解决什么

一句话：**让「我勾掉的那几项」跟着账号走，不跟着浏览器走。**

现状是纯本地的，代码里只有两处碰过它：

| 位置 | 行为 |
| --- | --- |
| `src/pages/juben/index.astro:723` | 勾选模块 → 写 `localStorage` 的 `atw-juben-progress-v1` |
| `src/pages/account/index.astro:252` | 读同一个 key，渲染「我的档案库」进度条 |

数据结构是 `{ "<caseId>": [0, 1, 2, 3] }`——**数组里存的是模块的下标**。

单人单机够用，一旦换设备就露馅。但真正的问题不止「不同步」这一条，摸完代码发现四个：

### 问题 1 · 用下标当 ID（结构性问题，必须先修）

`[0, 1, 2, 3]` 的意思是「第 0、1、2、3 项已完成」。哪天在 `src/data/juben.js` 里给某一卷**插入**一个新模块，所有人的进度立刻错位一格：做完第 3 项的变成「做完了第 4 项」，删掉一项则整体前移。

在本地这只是一次性的显示错误，**但一旦上了服务端就是持久化的数据污染**——错位会被同步到所有设备，再想纠正就得靠猜。

所以「加稳定 ID」不是同步的优化项，是同步的**前置条件**。当前总共只有 8 个模块（虚拟游戏 4 / 窗边的女人 4），现在改成本最低。

### 问题 2 · 一个浏览器只有一份进度，不分账号

`atw-juben-progress-v1` 是全局单 key。这台机器上切到另一个账号，「我的档案库」里显示的仍是上一个人的勾选。上次重构做了「本机可同时留几个账号，一点就切」，这条 bug 就此埋下——**目前只是显示错，同步之后会变成真实的数据串号**。

### 问题 3 · 服务端没有位置

`platform/server/src/database.js` 里现有 10 张表（`users` / `sessions` / `claims` / `kb_memory` / `dm_invites` …），没有任何存学习进度的表。`kb_memory` 是最接近的先例：一人一行、本人可读、删号级联删。新表照这个形状做。

### 问题 4 · 没有离线缓冲

勾选是同步写 `localStorage` 的，没有队列。同步改造后如果网络抖一下就直接丢写，体验会比现在更差——**所以队列不是加分项，是同步功能的一半**。

---

## 二、目标与非目标

**目标**

1. 同一账号在任意设备打开 `/juben/`，看到的勾选状态一致（秒级，不需要手动点同步）
2. 断网、后台、弱网下勾选不丢，恢复后自动补传
3. 未登录照旧可用，本地进度不降级；登录时把本机进度并入账号
4. 换账号不串数据
5. 服务端只存「哪一项完成了」，不存任何剧本正文

**非目标（这次不做）**

- 匿名用户的云端身份（不做设备指纹、不做匿名 token）
- 实时协同（两个人同时勾同一项没有意义，不需要 WebSocket）
- 排行榜、连续打卡、进度分享卡片
- 笔记阅读位置、自测题答案持久化（复用同一套机制，排 P2）
- 管理台查看某个用户的学习进度（见「五、隐私」）

---

## 三、五个核心决策

### 决策 1 · 本地优先，服务端当镜像

渲染永远读本地，网络只是后台对账。

理由：本站的硬约束是「读站不需要账号」「静态优先」。勾选一个复选框要等一个 HTTP 往返，在弱网下就是卡顿；而进度本身丢一次只是重勾，不是灾难。所以**写入不等网络**，UI 先认，再慢慢同步。

替代方案「写穿到服务端、成功才勾上」被否掉：慢、断网不可用、还要处理按钮 loading 态。

### 决策 2 · 给模块加稳定 slug（人工写，不自动派生）

在 `src/data/juben.js` 每个 module 上补一个 `slug`，例如：

```js
modules: [
  { slug: 'flow-skeleton', title: '先立流程骨架', desc: '…' },
  { slug: 'god-view', title: '再压上帝视角', desc: '…' },
]
```

不用「标题哈希」自动生成——标题改一个字进度就全丢，而标题是最常改的字段。8 个手写 slug 十分钟的事，换来的是永久稳定。

配一道防线：`test/juben.test.mjs` 里加一条**台账用例**，把 `(caseId, slug)` 的完整清单写死在测试里。以后谁想改 slug 或删模块，CI 会红，必须显式改台账——这是提醒「有人正在让老数据失效」，不是拦路。

### 决策 3 · 逐项 LWW + 墓碑，不做整体覆盖

同步单位是**一个模块**（`caseId + moduleId`），每条记录带 `{ done, at }`。

合并规则：同一项取 `at` 更大的那条；`at` 相同时 `done: true` 优先。

为什么不用「整卷数组覆盖」：A 机在书房勾了第 1 项，B 机在通勤路上勾了第 3 项，整体覆盖必丢一边。逐项合并是并集，两边都留下。

为什么保留「取消勾选」的传播：如果只允许 `done: true` 单向同步，误触一次就永久无法修正。所以取消也是一个事件，带自己的时间戳。

### 决策 4 · 本地按账号分桶

```
atw-juben-progress-v2:<userId>    登录态，一人一桶
atw-juben-progress-v2:guest       未登录
```

登录时把 guest 桶并入当前用户桶（并入成功才清 guest，避免同步失败导致丢数据）；退出登录不清用户桶，下次同一个号回来即恢复。

### 决策 5 · 任何登录用户都能同步，不锁 DM

模块清单本身是公开内容（无剧透，`/juben/` 公开页就能看到），进度只是「我读到哪」。锁 DM 会让读者觉得「连勾选都要邀请码」，和上次重构定下的「读者身份现在就能用」相悖。

**DM 门槛只管正文**（`requireDm` 继续罩 `/api/juben/manifest` 与 `/doc/*` 不变）。

---

## 四、数据模型

沿用现有风格：`node:sqlite`、毫秒时间戳、表注释写清用途、`CREATE TABLE IF NOT EXISTS` + `migrate()` 里补 `ALTER`。

```sql
-- 学习进度：一行 = 某人某卷的某一项。永不物理删除，取消勾选写 done=0（墓碑），
-- 这样换设备的人能收到「这一项被取消了」，而不是永远看不到变化。
CREATE TABLE IF NOT EXISTS juben_progress (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id    TEXT NOT NULL,
  module_id  TEXT NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0,
  client_at  INTEGER NOT NULL,   -- 客户端事件时间，只用于同一项的先后判定
  rev        INTEGER NOT NULL,   -- 写入时的用户版本号，增量拉取只认它
  PRIMARY KEY (user_id, case_id, module_id)
);

CREATE INDEX IF NOT EXISTS juben_progress_rev_idx ON juben_progress (user_id, rev);

-- 每用户一个版本号：每次写入批次 +1。增量同步的游标，也是避免「谁先谁后」
-- 依赖双方时钟的关键——服务端时钟统一发号。
CREATE TABLE IF NOT EXISTS juben_sync_state (
  user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rev          INTEGER NOT NULL DEFAULT 0,
  last_sync_at INTEGER,
  updated_at   INTEGER NOT NULL
);
```

三个设计要点：

- **`rev` 而不是 `updated_at` 做游标**。同一毫秒内写两批会撞车，`updated_at > since` 会漏数据；单用户自增 `rev` 不存在这个问题，也不依赖客户端时钟。
- **墓碑而非删除**。`done=0` 保留一行，其他设备才收得到这次取消。行数上限 = 卷数 × 模块数，量级几千，永远不用清理。
- **`client_at` 只做同项比较，且要夹紧**。客户端时钟不可信（有人系统时间设到 2030 年就会永远压住别人），写入前夹到 `[serverNow - 30天, serverNow + 5分钟]`。

---

## 五、隐私边界

进度属于个人学习痕迹，按现有口径（「联系方式只有你和发布方看得到」）从严：

- 接口一律 `requireUser`，只返回 `auth.user.id` 自己的行，**不接受 `?userId=` 参数**
- 管理台不提供「查看某人进度」的接口与界面；即便以后要做运营统计，也只出聚合数（多少人在学同一卷），不出个人明细
- 审计日志记录「有人清空了自己的进度」（`juben.progress_reset`），不记录每次勾选，避免日志变成行为流水

---

## 六、API 契约

三个端点，都挂在 `platform/server/src/app.js` 现有 if 链里，沿用 `reply()` / `readJson()` / `HttpError`。

### 拉取

```
GET /api/juben/progress?since=0
Authorization: Bearer <token>
```

```json
{
  "rev": 42,
  "items": [
    { "caseId": "virtual-game", "moduleId": "flow-skeleton", "done": 1, "at": 1794522042377 }
  ],
  "serverTime": 1794522042380
}
```

- `since` 缺省或 `0` 返回全量快照；否则只返回 `rev > since` 的行
- 未登录 → 401 `UNAUTHORIZED`

### 推送（含合并）

```
POST /api/juben/progress
{ "baseRev": 41, "items": [ { "caseId": "virtual-game", "moduleId": "flow-skeleton", "done": 1, "at": 1794522042377 } ] }
```

```json
{ "rev": 43, "items": [ /* rev > baseRev 的全部行，含被服务端裁决覆盖的那条 */ ], "serverTime": 1794522042383 }
```

- 响应**总是**回一份 `rev > baseRev` 的增量，客户端无脑覆盖本地对应项。这样「A 机取消、B 机同时勾选」的裁决结果能立刻回到发起方，不用等下一轮
- 单次最多 500 条，超出 413；仍受 `JSON_LIMIT_BYTES`（256 KB）总闸限制
- `caseId` / `moduleId` 过 `/^[a-z0-9][a-z0-9-]{0,63}$/`，不合法整批 422（宁拒绝不合并不，避免半批脏数据）
- 每用户写入限流：1 批 / 2 秒，突发 10 批（复用现有限流器）
- 无论是否真的改变了值，只要批次非空就 `rev + 1`——保证「我推了一次」这件事一定产生一个新游标，客户端不会陷入「推了但怎么没变」的困惑

### 清空（危险操作）

```
DELETE /api/juben/progress
```

不物理删，而是给该用户所有行写 `done=0` 并 `rev + 1`。这样另一台设备下次拉取会跟着清空，不会「这边清了那边又把进度推回来」。

---

## 七、合并算法

服务端 `mergeProgress(userId, baseRev, items)` 伪代码：

```
nextRev = currentRev + 1
BEGIN
  for item in items:
    incomingAt = clamp(item.at, serverNow - 30d, serverNow + 5m)
    row = SELECT * FROM juben_progress
          WHERE user_id=? AND case_id=? AND module_id=?
    if row is null:
        INSERT (done=item.done, client_at=incomingAt, rev=nextRev)
    else if incomingAt > row.client_at
         or (incomingAt == row.client_at and item.done > row.done):
        UPDATE done=item.done, client_at=incomingAt, rev=nextRev
    else:
        skip   -- 服务端这条更新，忽略
  UPDATE juben_sync_state SET rev=nextRev, last_sync_at=now
COMMIT
return SELECT * WHERE user_id=? AND rev > baseRev
```

冲突矩阵（这就是测试要逐格覆盖的表）：

| 本地 | 服务端 | 时间关系 | 结果 |
| --- | --- | --- | --- |
| 完成 | 无记录 | — | 新增完成 |
| 完成 | 完成 | 任意 | 保持完成，`client_at` 取大 |
| 完成 | 取消 | 本地更新 | 变完成 |
| 完成 | 取消 | 服务端更新 | 保持取消（本地被覆盖） |
| 取消 | 完成 | 本地更新 | 变取消 |
| 取消 | 完成 | 服务端更新 | 保持完成 |
| 取消 | 无记录 | — | 写墓碑（防止别的设备还留着旧勾选） |
| 任意 | 任意 | 同一毫秒且值不同 | `done=1` 优先（乐观） |
| 未知 `caseId` | — | — | 照收（可能来自更新版本的前端），渲染时忽略 |

---

## 八、前端改造

### 新模块 `src/scripts/progress-store.js`

现在两处各自 `JSON.parse(localStorage...)`，必须收成一个。对外接口：

```js
init({ owner })                  // owner = userId | 'guest'，登录态变化时重绑
listDone(caseId) -> string[]     // 模块 slug 列表，给渲染用
countDone(caseId) -> number      // 档案库进度条用
toggle(caseId, moduleId)         // 本地先写，随即排队同步
reset()                          // 清空（本地 + 服务端）
syncNow({ force })               // 手动触发
status()                         // { state, pending, lastSyncAt }
subscribe(fn)                    // 状态或数据变化时回调
```

内部职责：

1. **v1 → v2 迁移**：读到老 key 的数组时，用当前模块顺序把下标映射成 slug（映射表现场生成，同一次构建内一定对得上）；越界下标丢弃并计数，在控制台留一行提示。迁移后老 key 改名 `atw-juben-progress-v1-backup` 保留一个版本，不做物理删除。
2. **写队列**：`atw-juben-queue:<owner>` 存待推项，`{ caseId, moduleId, done, at }`，同一项后来者覆盖前者（只留最后一次意图）。
3. **触发时机**：勾选后 debounce 1.5s 合批；页面加载（已登录）先拉增量；`online`、`visibilitychange → visible`、`atw-auth` 变化时补一轮；`storage` 事件（另一标签页改了）只重读本地并重渲染，不推。
4. **跨标签页**：写入后广播，避免两个标签各勾一半互相覆盖显示。

### 两个页面改为消费 store

- `/juben/`：`renderModules` 用 `listDone(caseId)` 判勾选；`toggle` 后不再直接写 localStorage
- `/account/`：`vaultBlock()` 用 `countDone()`；把「进度记在这台机器上，换设备不跟着走」这句文案按状态替换

### 同步状态徽章（三态 + 两特例）

放在剧本研究室侧栏与档案库标题旁：

| 状态 | 文案 | 出现时机 |
| --- | --- | --- |
| `guest` | 本机记录 · 登录后可跨设备 | 未登录 |
| `syncing` | 同步中… | 请求在飞 |
| `synced` | 已同步 · 刚刚 / 3 分钟前 | 成功后 |
| `pending` | 待同步 · N 项 | 有队列且离线/失败 |
| `error` | 同步失败 · 点此重试 | 服务端 5xx / 网络错误 |

不弹 toast、不打断勾选——徽章自己变化就够了。

---

## 九、迁移与兼容

| 场景 | 处理 |
| --- | --- |
| 老用户首次加载新版 | v1 数组 → v2 slug 映射，就地完成，无感 |
| 越界下标（模块被删过） | 丢弃 + 控台提示，不阻塞 |
| 未登录老用户 | 迁到 `guest` 桶，登录时并入账号 |
| 服务端已有数据但本地是空的（新设备） | 全量拉取后覆盖本地，保留本地更晚的项 |
| 前端更新、服务端还是旧版 | `GET /progress` 404 → 降级为纯本地，徽章显示「本机记录」，不报错 |
| 服务端有未知 `moduleId`（前端版本更旧） | 原样保留在服务端，本地渲染忽略，**不回传删除** |
| 回滚 | 代码回滚后新表留着不碍事；前端 v2 key 不被旧代码读取，旧代码读 v1 backup 会看到迁移前状态——所以**只回滚代码不回滚数据会看起来像丢进度**，需在发布说明里写清 |

---

## 十、灰度开关

沿用 `src/data/features.js` 那套（上次任务书退场用的），加一条 `PROGRESS_SYNC`：

- 关：`/juben/` 与 `/account/` 行为与今天完全一致（纯本地），服务端接口仍在但前端不调
- 开：走同步

好处是**先发服务端、再发前端**，出问题一个环境变量关掉，不用回滚代码。服务端 `GET /api/meta` 增一个 `features: { progressSync: true }` 字段，前端以服务端为准（静态站构建期拿不到运行时开关时用本地默认值）。

---

## 十一、测试矩阵

**服务端（`platform/server/test/progress.test.js`，实到 24 例）**

1. 空库拉取 → `rev: 0, items: []`
2. 推一批 → 返回 `rev: 1` 且回显
3. 同批重复推 → 不产生重复行，`rev` 递增
4. 冲突矩阵九格逐格断言
5. `since` 增量：只回 `rev > since`
6. 越界 `client_at` 被夹紧
7. 非法 `caseId`（含 `../`、大写、超长）→ 422
8. 501 条 → 413
9. 超 256 KB → 413
10. 未登录 → 401
11. 限流：连打 11 批 → 429
12. 清空 → 全表 `done=0`，另一设备拉取后归零
13. 删号 → 行随 `ON DELETE CASCADE` 消失
14. 他人数据不可见（B 拉不到 A 的行）

**前端（`test/progress-store.test.mjs` 12 例 + `test/progress-sync.test.mjs` 15 例）**

1. v1 数组按当前顺序映射成 slug
2. 越界下标被丢弃
3. v1 backup key 保留
4. 分桶：两个 userId 互不干扰
5. guest → user 并入、并入后清 guest
6. 队列：同项多次 toggle 只留最后一次
7. 队列：成功后清空、失败保留
8. 服务端 404 时降级纯本地不抛错
9. `since` 游标持久化
10. slug 台账（每卷 slug 唯一、格式合法、清单未变）

**端到端（Playwright，两个独立 context 模拟两台设备，3 例）**

1. A 勾 3 项 → B 打开 `/juben/` 看到 3 项、档案库 3/8
2. B 取消 1 项 → A 刷新后同步取消
3. 断网勾选 → 徽章「待同步 1 项」→ 恢复网络自动变「已同步」

回归底线（已达成）：服务端 94 例 + 前端 82 例全绿。

---

## 十二、风险登记

| 风险 | 可能性 | 影响 | 应对 |
| --- | --- | --- | --- |
| slug 被改导致老进度变孤儿 | 中 | 中 | 台账测试红 CI；孤儿行保留不删，可随时人工修 |
| 客户端时钟离谱导致错误裁决 | 低 | 中 | `client_at` 夹紧 ±容差，游标用服务端 `rev` |
| 换账号串数据 | 中 | 高 | v2 按 owner 分桶 + 切号时重绑 + 专门用例 |
| 弱网下用户以为没同步 | 高 | 低 | 徽章常显状态，不是静默 |
| 队列写爆 localStorage | 低 | 低 | 队列按项去重，天然有上限（卷数×模块数） |
| 前端先发、服务端未就绪 | 中 | 中 | 404 降级纯本地 + 开关 |
| 泄露「谁在学哪本」 | 低 | 中 | 不出个人明细接口，审计只记清空 |
| 大改 `/account/` 影响上次重构的版式 | 中 | 低 | 只换数据来源，DOM 结构不动 |

---

## 十三、分阶段交付

按依赖顺序排，每阶段独立可发布、可验收。

### P0 · 把数据底盘换掉（不含网络，可单独上线）— 已完成

| # | 工作 | 体量 | 状态 |
| --- | --- | --- | --- |
| 1 | `juben.js` 8 个模块补 slug | S | ✅ `flow-skeleton` / `god-view` / `dual-track-clues` / `layered-review` / `five-stages` / `character-web` / `cross-media-evidence` / `question-layers` |
| 2 | 台账测试 + slug 格式校验 | S | ✅ `test/juben.test.mjs` 的 `SLUG_LEDGER` |
| 3 | `progress-store.js`：v1→v2 迁移、按 owner 分桶、subscribe | M | ✅ `src/scripts/progress-store.js` |
| 4 | `/juben/` 与 `/account/` 改接 store | M | ✅ 两处不再自己碰 localStorage |
| 5 | 前端用例 1–5、10 | S | ✅ `test/progress-store.test.mjs` 12 例，前端合计 67 例 |

**验收（实测）**：老数据 `{'virtual-game':[0,2,9]}` 迁移后勾选为「第 1、3 项」，越界下标丢弃，`v1` 键清空并留 backup；两个 DM 账号在同一浏览器分别显示 3/4·0/4（38%）与 0/4·1/4（13%）；未登录勾的项在登录后并入账号且 guest 桶清空；取消勾选落 `d:0` 墓碑，个人中心随之归零。

> 这一阶段单独价值很高：**它顺手修掉了「换账号看到别人进度」这个已存在的 bug**，且不引入任何网络依赖。

### P1 · 同步打通 — 已完成

| # | 工作 | 体量 | 状态 |
| --- | --- | --- | --- |
| 6 | 建表（`juben_progress` / `juben_sync_state`，随 SCHEMA 建，老库重启即长出来） | S | ✅ 索引 `(user_id, rev)` |
| 7 | `pullProgress` / `mergeProgress` / `resetProgress` + `clampClientAt` | M | ✅ `src/database.js` 剧本进度段 |
| 8 | 三个路由 + 整批校验 + 令牌桶（稳态 1 批/2 秒，突发 10）+ 清空审计 | M | ✅ `src/app.js` |
| 9 | 服务端用例 | M | ✅ `test/progress.test.js` **24 例**（比计划的 14 例多出空批不占 rev、同刻双向、开关透出等） |
| 10 | sync 层：pull / push / 队列 / 触发时机 / 降级 / 补推 | M | ✅ `src/scripts/progress-sync.js`（不 import account-core，请求函数注入） |
| 11 | 状态徽章与文案 | S | ✅ 剧本研究室学习路径右上、档案库标题旁，可点重试 |
| 12 | 双 context 端到端 | M | ✅ 见下方实测（临时脚本跑完即删，不留环境依赖） |

**实现时对计划的三处微调**（都不是改目标，是落地细节）：

1. **失败不自动重排**。原计划「失败保留队列」默认会每 1.5 秒重试一次，服务端 5xx 时就是小型的自我 DDoS。改成：失败只置状态，下一次触发来自用户勾选 / 网络恢复 / 切回标签页 / 点徽章——都足够频繁。
2. **队列去重放在 store 的 dirty 集合**，同步层不扫描全量 diff。`toggle` / `resetCase` / `adoptGuest` 各自登记 dirty 键，`takeDirty()` 取走即清；`applyRemote` 把「本机更晚」的键退回 dirty（`kept`），避免下发的数据被反手再推一次形成乒乓。
3. **首次全量拉取后补推**（计划里没有这一条）。老数据迁移、开关打开前勾的项都不在服务端，靠「全量快照里没有的本地项入队」补上——否则那批老进度会永远只留在原设备。

**实测（两台独立 browser context，同一账号）**：

| 场景 | 结果 |
| --- | --- |
| A 机勾 3 项（合批成一次 POST） | 3/4，徽章 `待同步 · 3 项` → `已同步 · 刚刚`，服务端 rev 1、3 条 `done=1` |
| B 机首次打开同一账号 | 3/4、3 个勾选中，徽章 `已同步 · 刚刚` |
| B 机取消 1 项 → A 机刷新 | 双端均为 2/4，服务端该行 `done=0` |
| A 机断网勾 1 项 | 3/4 立即生效，徽章 `待同步 · 1 项`，服务端零写入 |
| 恢复网络 | 徽章 `已同步 · 刚刚`，服务端 rev 3 且该项 `done=1` |
| 个人中心（DM 身份） | `38% · 3/8` 与剧本研究室一致，标题旁徽章 `已同步 · 刚刚` |

回归：服务端 **94 例**全绿（原 70 + 新增 24），前端 **82 例**全绿（原 67 + 同步 15）。

### P2 · 体验补全（尚未开工，看 P1 上线后的实际反馈再定）

| # | 工作 | 体量 |
| --- | --- | --- |
| 13 | 档案库「同步状态卡」：上次同步、设备数、手动同步、清空（二次确认） | S |
| 14 | 阅读位置：上次读到哪一篇，复用同一 items 机制（key 换 `doc:<docId>`） | M |
| 15 | 自测题作答持久化（现在一换卷就丢） | S |

---

## 十四、三项决策（已定案）

> 2026-11-13 定案：三项全部按下列建议执行。

1. **取消勾选要不要二次确认？**
   我的建议：**不要**。勾选是高频率轻动作，弹确认会烦；误触的代价只是重勾一次。但「清空全部进度」必须二次确认。

2. **读者（member）能不能同步？**
   我的建议：**能**。模块清单本来就公开，锁 DM 与「读者身份现在就能用」相悖。若你希望进度也算 DM 权益，改一行 `requireUser` → `requireDm` 即可。

3. **P0 是否现在就做？**
   我的建议：**做，且与 P1 分开上线**。它修的是现存 bug，不依赖任何服务端改动，风险最低；而 P1 需要动表、动接口，值得单独一个发布窗口。

---

## 十五、明确不做的

- 不做设备指纹 / 匿名云身份（隐私上不划算，收益低）
- 不做实时双向推送（进度不是协同场景）
- 不做进度导出成图片 / 分享卡片（视觉工作量远大于价值）
- 不清理墓碑行（量级固定，删了反而丢失「取消」语义）
- 不动 `/api/juben/manifest` 与 `/doc/*` 的 DM 门槛
