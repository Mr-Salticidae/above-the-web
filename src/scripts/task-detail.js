// 任务详情页：状态注水 + 认领 / 交付面板 + 时间线。
// 页面正文（要求、对标素材、报酬说明）仍是构建期渲染的 markdown，这里只接管
// 「这份任务现在到哪一步了、我能做什么」这部分。
import {
  api,
  escapeHtml,
  formatDate,
  getCachedUser,
  getToken,
  loginUrl,
  refreshUser,
  registerUrl,
  TASK_STATUS_LABEL,
  url,
} from './account-core.js';

const STATUS_CLASS = { open: 'is-open', taken: 'is-taken', done: 'is-done', closed: 'is-closed' };

function html(strings, ...values) {
  return strings.reduce((out, part, i) => out + part + (i < values.length ? values[i] : ''), '');
}

export async function hydrateTaskDetail() {
  const root = document.querySelector('[data-task-detail]');
  if (!root) return;
  const slug = root.dataset.slug;
  const panel = root.querySelector('[data-claim-panel]');
  const timeline = root.querySelector('[data-timeline]');

  let user = getCachedUser();
  if (getToken()) user = (await refreshUser()) || user;

  let data;
  try {
    data = await api('GET', `/tasks/${encodeURIComponent(slug)}`);
  } catch {
    // 服务不可用：正文照读，只是没有实时状态和认领入口
    return;
  }

  render(data);

  function render({ task, events, deliveries, myClaim }) {
    // 状态标签
    const label = root.querySelector('[data-status-label]');
    if (label) {
      const taker = task.status === 'taken' && task.taker ? ` · ${task.taker}` : '';
      label.textContent = (TASK_STATUS_LABEL[task.status] || task.status) + taker;
      label.className = `tm-status ${STATUS_CLASS[task.status] || ''}`;
    }
    const crumb = root.querySelector('[data-crumb-status]');
    if (crumb) crumb.textContent = TASK_STATUS_LABEL[task.status] || task.status;

    renderTimeline(events, deliveries, task);
    renderPanel(task, myClaim);
  }

  function renderTimeline(events, deliveries, task) {
    if (!timeline) return;
    const rows = events.map(
      (e) => html`<li>
        <span class="tl-when">${formatDate(e.createdAt)}</span>
        <span class="tl-what">${escapeHtml(TASK_STATUS_LABEL[e.to] || e.to)}${
          e.note ? `：${escapeHtml(e.note)}` : ''
        }</span>
      </li>`,
    );
    const links = deliveries.map(
      (d) => html`<li>
        <span class="tl-when">${formatDate(d.createdAt)}</span>
        <span class="tl-what">交付：<a href="${escapeHtml(d.url)}" target="_blank" rel="noopener">${escapeHtml(
          d.url,
        )}</a></span>
      </li>`,
    );
    const all = [...rows, ...links];
    timeline.innerHTML = all.length
      ? html`<h2 class="tl-title">流转记录</h2><ul class="tl-list">${all.join('')}</ul>`
      : '';
    timeline.hidden = all.length === 0;
    if (task.status === 'closed' && task.paidAt) {
      timeline.insertAdjacentHTML(
        'beforeend',
        html`<p class="tl-paid">报酬已于 ${formatDate(task.paidAt)} 结清。</p>`,
      );
    }
  }

  function renderPanel(task, myClaim) {
    if (!panel) return;
    panel.hidden = false;

    // 已经定了人：只有承接人本人有事可做
    if (task.status !== 'open') {
      if (user && task.takerUserId === user.id && ['taken', 'done'].includes(task.status)) {
        panel.innerHTML = html`
          <h2 class="cp-title">${task.status === 'taken' ? '这份任务定给了你' : '你已提交交付'}</h2>
          <p class="cp-note">
            ${task.status === 'taken'
              ? '做完之后把成稿链接贴在这里，任务会转入「完工待打款」。'
              : '发布方确认后会打款并收官。发现问题可以再提交一次，以最后一次为准。'}
          </p>
          <form class="cp-form" data-deliver>
            <label><span>成稿链接</span><input name="url" type="url" required placeholder="https://" /></label>
            <label><span>补充说明<i>可留空</i></span><input name="note" maxlength="500" /></label>
            <button class="cp-primary" type="submit">提交交付</button>
            <p class="cp-msg" data-cp-msg role="status"></p>
          </form>`;
        panel.querySelector('[data-deliver]').addEventListener('submit', submitDelivery);
        return;
      }
      panel.innerHTML = html`
        <p class="cp-closed">
          ${task.status === 'taken'
            ? `这份任务已经定给${task.taker ? ` ${escapeHtml(task.taker)}` : '其他人'}了。`
            : task.status === 'done'
              ? '已交付，等待发布方确认打款。'
              : '这份任务已经收官。'}
          新的任务书会发在<a href="${url('tasks/')}">任务书列表</a>。
        </p>`;
      return;
    }

    // 招募中：未登录先去登录，登录后按申请状态给不同的动作
    if (!user) {
      const next = location.pathname;
      panel.innerHTML = html`
        <h2 class="cp-title">认领这份任务</h2>
        <p class="cp-note">认领需要登录——任务连着报酬和打款，得能把人对上。读站不需要账号。</p>
        <div class="cp-actions">
          <a class="cp-primary" href="${escapeHtml(loginUrl(next))}">登录后认领</a>
          <a class="cp-ghost" href="${escapeHtml(registerUrl(next))}">没有账号，去注册</a>
        </div>`;
      return;
    }

    if (myClaim && myClaim.status === 'pending') {
      panel.innerHTML = html`
        <h2 class="cp-title">已提交申请</h2>
        <p class="cp-note">${formatDate(myClaim.createdAt)} 提交，等发布方定人。定了会在这里和你的<a href="${url(
          'account/',
        )}">个人中心</a>更新。</p>
        <button class="cp-ghost" type="button" data-withdraw>撤回申请</button>
        <p class="cp-msg" data-cp-msg role="status"></p>`;
      panel.querySelector('[data-withdraw]').addEventListener('click', withdraw);
      return;
    }

    const rejected = myClaim && myClaim.status === 'rejected';
    panel.innerHTML = html`
      <h2 class="cp-title">认领这份任务</h2>
      ${rejected
        ? html`<p class="cp-note cp-rejected">上次没选上${
            myClaim.decideNote ? `：${escapeHtml(myClaim.decideNote)}` : ''
          }。改一改再报一次也行。</p>`
        : html`<p class="cp-note">写清楚你打算怎么做、做过什么同类的东西。发布方定人后会直接联系你。</p>`}
      <form class="cp-form" data-claim>
        <label>
          <span>自荐说明<i>你的思路、相关作品链接</i></span>
          <textarea name="pitch" rows="4" maxlength="1000"></textarea>
        </label>
        <label>
          <span>联系方式<i>微信号 / QQ / 邮箱</i></span>
          <input name="contact" maxlength="120" value="${escapeHtml(user.contact || '')}" required />
        </label>
        <button class="cp-primary" type="submit">提交认领申请</button>
        <p class="cp-msg" data-cp-msg role="status"></p>
      </form>`;
    panel.querySelector('[data-claim]').addEventListener('submit', submitClaim);
  }

  function say(text, tone = 'error') {
    const node = panel.querySelector('[data-cp-msg]');
    if (!node) return;
    node.textContent = text;
    // 三种口吻：busy 进行中/ok 成功/error 出错——「保存中…」不该是红的
    node.dataset.tone = text ? tone : '';
  }

  async function reload() {
    const fresh = await api('GET', `/tasks/${encodeURIComponent(slug)}`);
    render(fresh);
  }

  async function submitClaim(event) {
    event.preventDefault();
    say('提交中…', 'busy');
    const form = new FormData(event.target);
    try {
      await api('POST', `/tasks/${encodeURIComponent(slug)}/claim`, {
        pitch: form.get('pitch'),
        contact: form.get('contact'),
      });
      await reload();
    } catch (error) {
      say(error.message);
    }
  }

  async function withdraw() {
    say('撤回中…', 'busy');
    try {
      await api('DELETE', `/tasks/${encodeURIComponent(slug)}/claim`);
      await reload();
    } catch (error) {
      say(error.message);
    }
  }

  async function submitDelivery(event) {
    event.preventDefault();
    say('提交中…', 'busy');
    const form = new FormData(event.target);
    try {
      await api('POST', `/tasks/${encodeURIComponent(slug)}/delivery`, {
        url: form.get('url'),
        note: form.get('note'),
      });
      await reload();
    } catch (error) {
      say(error.message);
    }
  }
}
