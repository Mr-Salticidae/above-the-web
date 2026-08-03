// AI 辅助填写（浏览器侧）+ 草稿留存。
//
// 两个页面用同一套东西：管理台「新建任务书」和任务详情页的认领面板。
// 长得一样是有意的——同一个动作（说人话 → 它帮你填 → 你过一眼再改）不该在两处长成两个样。
//
// 三条规矩：
//   1. **AI 只填表单，不替人提交。** 生成完东西还在框里，改不改、发不发都是人说了算。
//   2. **没有 AI 通道就当它不存在。** /api/meta 的 aiAssist 为假时整个框不渲染，
//      页面上看不出少了什么，手填一路照旧。
//   3. **写过的东西不能因为手滑没了。** 输入随手存本机，回来自动带回，提交成功才清。
import { api, escapeHtml } from './account-core.js';

// ---------- 站点元信息 ----------

// 一页里可能有好几处要问「开没开 AI」，问一次就够
let metaPromise = null;

export function siteMeta() {
  if (!metaPromise) metaPromise = api('GET', '/meta').catch(() => ({}));
  return metaPromise;
}

export async function aiAssistEnabled() {
  return Boolean((await siteMeta()).aiAssist);
}

// ---------- 草稿留存 ----------
//
// 任务书能写两三千字，自荐说明也要想一会儿。误关标签页、登录过期、手滑刷新——
// 这些都不该让人从头再来。存本机就够了：草稿是私事，没必要往服务器上放。

const DRAFT_PREFIX = 'atw-draft:';
const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function pruneDrafts() {
  const now = Date.now();
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(DRAFT_PREFIX)) continue;
    try {
      const { savedAt } = JSON.parse(localStorage.getItem(key)) || {};
      if (!savedAt || now - savedAt > DRAFT_TTL_MS) localStorage.removeItem(key);
    } catch {
      localStorage.removeItem(key);
    }
  }
}

export function saveDraft(key, value) {
  try {
    // 全空就当没写过，别留一条空记录下次还提示「恢复了草稿」
    if (!Object.values(value || {}).some((item) => String(item ?? '').trim())) {
      localStorage.removeItem(DRAFT_PREFIX + key);
      return;
    }
    pruneDrafts();
    localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    /* 隐私模式写不进去也不影响这次填写 */
  }
}

export function readDraft(key) {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    if (!raw) return null;
    const { savedAt, value } = JSON.parse(raw);
    if (!savedAt || Date.now() - savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_PREFIX + key);
      return null;
    }
    return { savedAt, value: value || {} };
  } catch {
    return null;
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    /* 同上 */
  }
}

// 输入一路存，但别每敲一个字都写一次 localStorage
export function autosave(form, key, fields, { delay = 600 } = {}) {
  let timer = null;
  const snapshot = () =>
    Object.fromEntries(fields.map((name) => [name, form.querySelector(`[name="${name}"]`)?.value ?? '']));
  form.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => saveDraft(key, snapshot()), delay);
  });
  return { flush: () => saveDraft(key, snapshot()) };
}

// 「上次的草稿恢复了」这句话得说清楚是什么时候的
export function draftAgeLabel(savedAt) {
  const minutes = Math.round((Date.now() - savedAt) / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.round(hours / 24)} 天前`;
}

// ---------- 接口 ----------

export const draftTask = (payload) => api('POST', '/ai/task-draft', payload);
export const draftPitch = (payload) => api('POST', '/ai/claim-pitch', payload);

// 浏览器本地时区的今天。「下周五」要换算成日期，基准得是填表这个人所在的今天，
// 不是香港服务器的今天。
export function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

// ---------- 「说人话」输入框 ----------
//
// 空白框最劝退。所以这个框里备着几句现成的话——点一下就填进去，改两个字就能用。

// examples 可以是一串字符串，也可以是 { label, text }——按钮上显示 label，填进框里的是 text。
// 需要「点一下填进去的是个带括号的骨架、按钮上却只有四个字」时用后者。
// hint 是我们自己写的一句话，允许带 <b> 这类标签，不要把用户输入接到这上面。
export function mountAssistBox(host, {
  lead,
  placeholder,
  examples = [],
  examplesLead = '没想好怎么说？点一句改改：',
  actionLabel,
  hint = '',
  run,
}) {
  if (!host) return null;

  const chips = examples.map((item) =>
    typeof item === 'string' ? { label: item, text: item } : item,
  );

  host.innerHTML = `
    <div class="ai-box">
      <p class="ai-lead"><span class="ai-tag">AI 帮手</span>${escapeHtml(lead)}</p>
      <textarea class="ai-input" rows="3" maxlength="2000" placeholder="${escapeHtml(placeholder)}" data-ai-input></textarea>
      ${
        chips.length
          ? `<p class="ai-examples">${escapeHtml(examplesLead)}${chips
              .map(
                (chip, index) =>
                  `<button type="button" class="ai-chip" data-ai-example="${index}">${escapeHtml(
                    chip.label.length > 20 ? `${chip.label.slice(0, 20)}…` : chip.label,
                  )}</button>`,
              )
              .join('')}</p>`
          : ''
      }
      <div class="ai-actions">
        <button type="button" class="ai-run" data-ai-run>${escapeHtml(actionLabel)}</button>
        <span class="ai-msg" role="status" data-ai-msg></span>
      </div>
      ${hint ? `<p class="ai-hint">${hint}</p>` : ''}
      <ul class="ai-missing" data-ai-missing hidden></ul>
    </div>`;

  const input = host.querySelector('[data-ai-input]');
  const button = host.querySelector('[data-ai-run]');
  const msg = host.querySelector('[data-ai-msg]');
  const missingBox = host.querySelector('[data-ai-missing]');

  const say = (text, tone = 'error') => {
    msg.textContent = text;
    msg.dataset.tone = text ? tone : '';
  };

  const showMissing = (items = []) => {
    missingBox.hidden = !items.length;
    missingBox.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  };

  host.querySelectorAll('[data-ai-example]').forEach((chip) => {
    chip.addEventListener('click', () => {
      input.value = chips[Number(chip.dataset.aiExample)]?.text || '';
      input.focus();
      // 光标落到末尾：这句话是拿来改的，不是拿来照抄的
      input.setSelectionRange(input.value.length, input.value.length);
      say('');
    });
  });

  const ui = {
    host,
    input,
    say,
    showMissing,
    setAction(label) {
      button.textContent = label;
    },
    get value() {
      return input.value.trim();
    },
  };

  let running = false;
  button.addEventListener('click', async () => {
    if (running) return;
    if (ui.value.length < 4) {
      say('先说一句话，哪怕很粗糙也行');
      input.focus();
      return;
    }
    running = true;
    button.disabled = true;
    showMissing([]);
    say('AI 正在写，十几秒…', 'busy');
    try {
      await run(ui.value, ui);
    } catch (error) {
      say(error.message || '这次没成，手填也能发');
    } finally {
      running = false;
      button.disabled = false;
    }
  });

  // Ctrl / ⌘ + Enter 直接跑，别逼人去够鼠标
  input.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') button.click();
  });

  return ui;
}
