// 版块开关：哪些栏目对外露出。
//
// 任务书是上一份工作留下的东西——数据、接口、管理台、月度对账都还在，
// 只是暂时不作为站点主体，导航与首页不再出现，/tasks/ 直接访问给一页说明。
// 想恢复：把下面的默认值改成 true，或构建时传 PUBLIC_TASKS_ENABLED=1。
//
// 用 import.meta.env?. 而不是 import.meta.env.：node --test 里没有 env，
// 单元测试也能安全 import 这个文件（默认值即「关」）。

const raw = import.meta.env?.PUBLIC_TASKS_ENABLED;
const OFF = new Set(['0', 'false', 'off', 'no']);

export const TASKS_ENABLED =
  raw === undefined || raw === null || raw === ''
    ? false
    : !OFF.has(String(raw).trim().toLowerCase());

// 学习进度跨设备同步。默认开——「换台设备勾选就没了」是这个站已知的体验缺口。
// 想退回纯本地：构建时 PUBLIC_PROGRESS_SYNC=0，或服务端 ATW_PROGRESS_SYNC=0
// （前端以 /api/meta 的 features.progressSync 为准，一个环境变量即可止血，不用重新发布）。
const rawSync = import.meta.env?.PUBLIC_PROGRESS_SYNC;

export const PROGRESS_SYNC =
  rawSync === undefined || rawSync === null || rawSync === ''
    ? true
    : !OFF.has(String(rawSync).trim().toLowerCase());
