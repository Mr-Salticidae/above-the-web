import test from 'node:test';
import assert from 'node:assert/strict';

import { TASKS_ENABLED, PROGRESS_SYNC } from '../src/data/features.js';

// node --test 里没有 import.meta.env，等价于「构建时没传 PUBLIC_TASKS_ENABLED」。
// 任务书是上一份工作的遗留，默认必须收起：哪天有人手滑把开关打开，
// 导航与首页会重新出现「任务书」，这条用例会先把红灯亮起来。
test('版块开关：任务书默认收起', () => {
  assert.equal(TASKS_ENABLED, false);
});

// 同步是「换设备就丢进度」这个体验缺口的解法，默认开；
// 关掉它只能是有意的（构建参数或服务端 ATW_PROGRESS_SYNC=0），不能是默认值漂移。
test('版块开关：进度同步默认开启', () => {
  assert.equal(PROGRESS_SYNC, true);
});
