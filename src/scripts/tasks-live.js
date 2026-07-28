// 任务列表页的状态注水。
// 静态 HTML 里的状态来自构建时的 markdown，只是个快照；真实状态在数据库里。
// 这段脚本拉一次 /api/tasks，把卡片挪到正确的分组、刷新标签与承接人。
// 拉不到就什么都不做——页面退回构建时的快照，仍然可读。
import { api, TASK_STATUS_LABEL } from './account-core.js';

const GROUP_OF = { open: 'open', taken: 'taken', done: 'archive', closed: 'archive' };

function apply(cards, tasks) {
  const byGroup = { open: [], taken: [], archive: [] };

  for (const card of cards) {
    const live = tasks.get(card.dataset.slug);
    if (live) {
      card.dataset.status = live.status;
      const label = card.querySelector('[data-status-label]');
      if (label) {
        const taker = live.status === 'taken' && live.taker ? ` · ${live.taker}` : '';
        label.textContent = (TASK_STATUS_LABEL[live.status] || live.status) + taker;
        label.className = `tc-status is-${live.status}`;
      }
      const queue = card.querySelector('[data-queue]');
      if (queue) {
        // 招募中才提申请人数：定了人之后再显示就是多余信息
        const show = live.status === 'open' && live.pendingClaims > 0;
        queue.hidden = !show;
        if (show) queue.textContent = `已有 ${live.pendingClaims} 人申请`;
      }
      card.classList.toggle('is-taken', live.status === 'taken');
    }
    byGroup[GROUP_OF[card.dataset.status] || 'archive'].push(card);
  }

  for (const [group, list] of Object.entries(byGroup)) {
    const section = document.querySelector(`[data-group="${group}"]`);
    const host = section?.querySelector('[data-group-list]');
    if (!host) continue;
    // 组内按发布日期倒序，跨组挪动后顺序才不会乱
    list.sort((a, b) => (b.dataset.date || '').localeCompare(a.dataset.date || ''));
    for (const card of list) host.append(card);
    section.hidden = list.length === 0;
  }

  const emptyState = document.querySelector('[data-empty-open]');
  if (emptyState) emptyState.hidden = byGroup.open.length > 0;
}

export async function hydrateTaskList() {
  const cards = Array.from(document.querySelectorAll('[data-task-card]'));
  if (!cards.length) return;
  try {
    const { tasks } = await api('GET', '/tasks');
    apply(cards, new Map(tasks.map((t) => [t.slug, t])));
  } catch {
    /* 服务不可用时保留构建快照 */
  }
}
