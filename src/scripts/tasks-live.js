// 任务列表页的状态注水。
// 静态 HTML 里的状态来自构建时的 markdown，只是个快照；真实状态在数据库里。
// 这段脚本拉一次 /api/tasks，把卡片挪到正确的分组、刷新标签与承接人。
// 拉不到就什么都不做——页面退回构建时的快照，仍然可读。
//
// 还有一类卡片压根不在快照里：发布方在管理台新建的任务书（source='web'）不进 git、
// 不参与构建，只能在这里现拼一张卡片插进去，形态与 md 卡片完全一致。
import { api, escapeHtml, formatDayLabel, TASK_STATUS_LABEL, url } from './account-core.js';

const GROUP_OF = { open: 'open', taken: 'taken', done: 'archive', closed: 'archive' };

// 与 tasks/index.astro 里的卡片同构——两边改一处，另一处要跟上
function createCard(task) {
  const card = document.createElement('a');
  card.className = 'task-card';
  card.href = url(`tasks/detail/?slug=${encodeURIComponent(task.slug)}`);
  card.dataset.taskCard = '';
  card.dataset.slug = task.slug;
  card.dataset.status = task.status;
  card.dataset.date = task.publishedAt || '';
  card.innerHTML = `
    <div class="tc-top">
      <span class="tc-status" data-status-label></span>
      <span class="tc-date">${escapeHtml(formatDayLabel(task.publishedAt))} 发布</span>
    </div>
    <h2>${escapeHtml(task.title || task.slug)}</h2>
    <p class="tc-summary">${escapeHtml(task.summary)}</p>
    <div class="tc-meta">
      ${task.fee ? `<span class="tc-fee">${escapeHtml(task.fee)}</span>` : ''}
      ${task.deadline ? `<span class="tc-deadline">截止 ${escapeHtml(formatDayLabel(task.deadline))}</span>` : ''}
      <span class="tc-queue" data-queue hidden></span>
      <span class="tc-cta">查看任务书 →</span>
    </div>`;
  return card;
}

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
  // 一份 md 都没有时静态页面里也没有卡片，但站内新建的任务书还得进来，
  // 所以判断依据是分组容器在不在，不是卡片有没有
  if (!document.querySelector('[data-group-list]')) return;
  const cards = Array.from(document.querySelectorAll('[data-task-card]'));
  try {
    const { tasks } = await api('GET', '/tasks');
    const rendered = new Set(cards.map((card) => card.dataset.slug));
    for (const task of tasks) {
      if (task.source === 'web' && !rendered.has(task.slug)) cards.push(createCard(task));
    }
    apply(cards, new Map(tasks.map((t) => [t.slug, t])));
  } catch {
    /* 服务不可用时保留构建快照 */
  }
}
