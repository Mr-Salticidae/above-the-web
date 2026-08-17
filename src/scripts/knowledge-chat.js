// 知识库 AI 查询（浏览器侧）。
//
// 检索留在静态站：Pagefind 先把问题缩到最相关的几篇笔记，浏览器再读取这些公开页面的正文片段。
// 服务端只收到本轮需要的少量公开上下文，不需要再维护第二份知识库或向量数据库。
// 模型只负责「依据片段回答」，来源选择、URL 和数量都由代码兜住。
import { api, escapeHtml, getCachedUser, getToken, url } from './account-core.js';
import { siteMeta } from './ai-assist.js';
import { searchPagefindNotes } from '../lib/knowledge-search.mjs';

const MAX_RESULTS = 6;
const MAX_SOURCE_CHARS = 3200;
const HISTORY_LIMIT = 8;
const FOLLOW_UP_RE = /^(那|这个|这种|它|还有|继续|再说|为什么|具体|怎么做|如何做)/;
const PENDING_KEY = 'atw-kb-pending-question';

let pagefindPromise = null;

function loadPagefind(base) {
  if (!pagefindPromise) {
    const bundle = `${base.replace(/\/?$/, '/')}pagefind/pagefind.js`;
    pagefindPromise = import(/* @vite-ignore */ bundle)
      .then(async (pagefind) => {
        await pagefind.options({ excerptLength: 80 });
        await pagefind.init();
        return pagefind;
      })
      .catch((error) => {
        pagefindPromise = null;
        throw error;
      });
  }
  return pagefindPromise;
}

function plainText(value) {
  const node = document.createElement('textarea');
  node.innerHTML = String(value || '');
  return node.value.replace(/\s+/g, ' ').trim();
}

function cleanPageText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function excerptSeeds(result) {
  return [result.plain_excerpt, ...(result.sub_results || []).map((item) => item.plain_excerpt)]
    .map(plainText)
    .filter(Boolean);
}

function findSeedIndex(text, seed) {
  const compact = seed.replace(/^[…\.\s]+|[…\.\s]+$/g, '').trim();
  if (!compact) return -1;
  const probes = [compact, compact.slice(0, 36), compact.slice(-36)].filter((item) => item.length >= 8);
  for (const probe of probes) {
    const index = text.indexOf(probe);
    if (index >= 0) return index;
  }
  return -1;
}

function passageFromText(text, result) {
  const clean = cleanPageText(text);
  if (!clean) return excerptSeeds(result).join('\n').slice(0, MAX_SOURCE_CHARS);

  const windows = [];
  for (const seed of excerptSeeds(result).slice(0, 3)) {
    const index = findSeedIndex(clean, seed);
    if (index < 0) continue;
    const start = Math.max(0, index - 520);
    const end = Math.min(clean.length, index + 1180);
    const windowText = clean.slice(start, end).trim();
    if (windowText && !windows.some((item) => item.includes(windowText) || windowText.includes(item))) {
      windows.push(windowText);
    }
  }

  if (!windows.length) return clean.slice(0, MAX_SOURCE_CHARS);
  return windows.join('\n\n……\n\n').slice(0, MAX_SOURCE_CHARS);
}

async function hydrateResult(result, index) {
  const rawUrl = String(result.url || '');
  const absolute = new URL(rawUrl, location.href);
  let articleText = '';
  let category = plainText(result.meta?.category || '');

  try {
    const response = await fetch(absolute.href, { credentials: 'same-origin' });
    if (response.ok) {
      const html = await response.text();
      const documentNode = new DOMParser().parseFromString(html, 'text/html');
      const article = documentNode.querySelector('article.prose');
      articleText = article?.innerText || article?.textContent || '';
      category ||= cleanPageText(article?.querySelector('.meta')?.textContent || '');
    }
  } catch {
    // 单篇页面取不到时仍可退回 Pagefind 的命中摘要，别让整轮问答一起失败。
  }

  return {
    id: index + 1,
    title: plainText(result.meta?.title || '未命名笔记').slice(0, 120),
    category: category.slice(0, 80),
    url: `${absolute.pathname}${absolute.search}${absolute.hash}`,
    excerpt: passageFromText(articleText, result),
  };
}

function retrievalQuery(question, history) {
  const previous = [...history].reverse().find((message) => message.role === 'user')?.content || '';
  if (!previous || (!FOLLOW_UP_RE.test(question) && question.length >= 12)) return question;
  return `${previous} ${question}`.slice(0, 1200);
}

async function retrieveSources(base, question, history) {
  const pagefind = await loadPagefind(base);
  const query = retrievalQuery(question, history);
  const filters = { type: 'note' };
  let hits = await searchPagefindNotes(pagefind, query, { filters, limit: MAX_RESULTS });

  // 多轮里的短追问可能让组合查询变严，退回只搜上一轮主题。
  if (!hits.length && query !== question) {
    const previous = [...history].reverse().find((message) => message.role === 'user')?.content || question;
    hits = await searchPagefindNotes(pagefind, previous, { filters, limit: MAX_RESULTS });
  }

  const results = await Promise.all(hits.slice(0, MAX_RESULTS).map((item) => item.data()));
  return Promise.all(results.map(hydrateResult));
}

function appendTextWithCitations(container, text, sources) {
  const sourceMap = new Map(sources.map((source) => [Number(source.id), source]));
  const parts = String(text || '').split(/\[(\d{1,2})\]/g);
  parts.forEach((part, index) => {
    if (index % 2 === 0) {
      container.append(document.createTextNode(part));
      return;
    }
    const source = sourceMap.get(Number(part));
    if (!source) return;
    const link = document.createElement('a');
    link.className = 'kb-chat-citation';
    link.href = source.url;
    link.textContent = `[${part}]`;
    link.setAttribute('aria-label', `查看来源：${source.title}`);
    container.append(link);
  });
}

function renderAnswer(container, answer, sources) {
  const lines = String(answer || '').replace(/\r/g, '').split('\n');
  let list = null;
  const closeList = () => {
    if (list) container.append(list);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    if (bullet) {
      if (!list) list = document.createElement('ul');
      const item = document.createElement('li');
      appendTextWithCitations(item, bullet[1], sources);
      list.append(item);
      continue;
    }
    closeList();
    const paragraph = document.createElement('p');
    appendTextWithCitations(paragraph, line.replace(/^#{1,4}\s+/, ''), sources);
    container.append(paragraph);
  }
  closeList();
}

function scrollThread(thread) {
  requestAnimationFrame(() => thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' }));
}

// 生成助手头像：有 src 就用 <img>，加载失败降级回圆形「蛛」文字，零 src 也直接文字。
function buildAvatar(avatarSrc) {
  const fallback = () => {
    const div = document.createElement('div');
    div.className = 'kb-chat-avatar';
    div.setAttribute('aria-hidden', 'true');
    div.textContent = '蛛';
    return div;
  };
  if (!avatarSrc) return fallback();
  const img = document.createElement('img');
  img.className = 'kb-chat-avatar';
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.addEventListener('error', () => { img.replaceWith(fallback()); }, { once: true });
  img.src = avatarSrc;
  return img;
}

function assistantMessage(thread, { answer, sources = [], followUps = [], tone = '', avatarSrc = '' }) {
  const message = document.createElement('div');
  message.className = `kb-chat-message is-assistant${tone ? ` is-${tone}` : ''}`;
  message.append(buildAvatar(avatarSrc));

  const bubble = document.createElement('div');
  bubble.className = 'kb-chat-bubble';
  renderAnswer(bubble, answer, sources);

  if (sources.length) {
    const sourceBox = document.createElement('div');
    sourceBox.className = 'kb-chat-sources';
    const label = document.createElement('span');
    label.textContent = '参考笔记';
    sourceBox.append(label);
    sources.forEach((source) => {
      const link = document.createElement('a');
      link.href = source.url;
      link.innerHTML = `<b>[${Number(source.id)}]</b>${escapeHtml(source.title)}`;
      sourceBox.append(link);
    });
    bubble.append(sourceBox);
  }

  if (followUps.length) {
    const followBox = document.createElement('div');
    followBox.className = 'kb-chat-followups';
    followUps.forEach((question) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = question;
      button.dataset.followUp = question;
      followBox.append(button);
    });
    bubble.append(followBox);
  }

  message.append(bubble);
  thread.append(message);
  scrollThread(thread);
  return message;
}

function userMessage(thread, text) {
  const message = document.createElement('div');
  message.className = 'kb-chat-message is-user';
  const bubble = document.createElement('div');
  bubble.className = 'kb-chat-bubble';
  bubble.textContent = text;
  message.append(bubble);
  thread.append(message);
  scrollThread(thread);
}

function loadingMessage(thread, avatarSrc) {
  const message = document.createElement('div');
  message.className = 'kb-chat-message is-assistant is-loading';
  // 沙漏动画纯 CSS：上半堆沙渐少、中流沙、下半堆沙渐满，一轮结束整体翻转 180° 无缝续播。
  const bubble = document.createElement('div');
  bubble.className = 'kb-chat-bubble';
  bubble.innerHTML = `
    <span class="kb-hourglass" aria-hidden="true"><i class="hg-top"></i><i class="hg-stream"></i><i class="hg-bottom"></i></span>
    <em>正在翻笔记</em>`;
  message.append(buildAvatar(avatarSrc));
  message.append(bubble);
  thread.append(message);
  scrollThread(thread);
  return message;
}

export function initKnowledgeChat(root) {
  if (!root || root.dataset.ready === 'true') return;
  root.dataset.ready = 'true';

  const base = root.dataset.base || '/';
  const avatarSrc = root.dataset.assistantAvatar || '';
  const launcher = root.querySelector('[data-kb-launcher]');
  const panel = root.querySelector('[data-kb-panel]');
  const close = root.querySelector('[data-kb-close]');
  const form = root.querySelector('[data-kb-form]');
  const input = root.querySelector('[data-kb-input]');
  const send = root.querySelector('[data-kb-send]');
  const thread = root.querySelector('[data-kb-thread]');
  const starters = root.querySelector('[data-kb-starters]');
  const reset = root.querySelector('[data-kb-reset]');
  const note = root.querySelector('[data-kb-note]');
  const welcome = thread.innerHTML;
  const history = [];
  let busy = false;
  let enabled = true;

  const setOpen = (value, { restoreFocus = true } = {}) => {
    const open = Boolean(value);
    panel.hidden = !open;
    root.dataset.open = String(open);
    launcher.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('kb-chat-open', open);

    if (open) {
      requestAnimationFrame(() => input.focus());
    } else if (restoreFocus) {
      launcher.focus();
    }
  };

  const setBusy = (value) => {
    busy = value;
    input.disabled = value || !enabled;
    send.disabled = value || !enabled;
    root.classList.toggle('is-busy', value);
    root.toggleAttribute('aria-busy', value);
  };

  const submitQuestion = async (raw) => {
    const question = String(raw ?? input.value).trim();
    if (!question || busy || !enabled) return;

    starters.hidden = true;
    reset.hidden = false;
    userMessage(thread, question);
    input.value = '';

    if (!getToken()) {
      try { sessionStorage.setItem(PENDING_KEY, question); } catch {}
      const next = `${location.pathname}${location.search}`;
      const loginUrl = url(`account/login/?next=${encodeURIComponent(next)}`);
      assistantMessage(thread, {
        answer: '这项查询会调用 AI，需要先登录。',
        tone: 'notice',
        avatarSrc,
      });
      const bubble = thread.lastElementChild?.querySelector('.kb-chat-bubble');
      if (bubble) {
        const link = document.createElement('a');
        link.className = 'kb-chat-login';
        link.href = loginUrl;
        link.textContent = '去登录 →';
        bubble.append(link);
      }
      return;
    }

    const loader = loadingMessage(thread, avatarSrc);
    setBusy(true);
    try {
      const sources = await retrieveSources(base, question, history);
      if (!sources.length) {
        loader.remove();
        assistantMessage(thread, {
          answer: '已发布的笔记里暂时没有找到足够接近的内容。可以换一个更具体的关键词，或用右上角全文搜索直接找原文。',
          tone: 'notice',
          avatarSrc,
        });
        return;
      }

      const payload = await api('POST', '/ai/kb-chat', {
        question,
        history: history.slice(-HISTORY_LIMIT),
        sources,
      });
      try { sessionStorage.removeItem(PENDING_KEY); } catch {}
      loader.remove();
      const usedIds = new Set((payload.sourceIds || []).map(Number));
      const usedSources = sources.filter((source) => usedIds.has(source.id));
      assistantMessage(thread, {
        answer: payload.answer,
        sources: usedSources.length ? usedSources : sources.slice(0, 3),
        followUps: payload.followUps || [],
        avatarSrc,
      });
      history.push({ role: 'user', content: question }, { role: 'assistant', content: payload.answer });
      if (history.length > HISTORY_LIMIT) history.splice(0, history.length - HISTORY_LIMIT);
    } catch (error) {
      loader.remove();
      const localIndexMissing = error instanceof TypeError && /import|module|fetch/i.test(error.message || '');
      assistantMessage(thread, {
        answer: localIndexMissing
          ? '全文索引还没有准备好。正式构建后即可查询；现在仍可使用右上角的普通搜索。'
          : error.message || '这次没有查到结果，稍后再试。',
        tone: 'error',
        avatarSrc,
      });
    } finally {
      setBusy(false);
      if (root.dataset.open === 'true') input.focus();
    }
  };

  launcher.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.dataset.open === 'true') setOpen(false);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitQuestion();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitQuestion();
    }
  });
  starters.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button) submitQuestion(button.textContent);
  });
  thread.addEventListener('click', (event) => {
    const button = event.target.closest('[data-follow-up]');
    if (button) submitQuestion(button.dataset.followUp);
  });
  reset.addEventListener('click', () => {
    history.length = 0;
    thread.innerHTML = welcome;
    starters.hidden = false;
    reset.hidden = true;
    input.value = '';
    input.focus();
  });

  const updateLoginNote = () => {
    note.textContent = getCachedUser()
      ? '已登录 · 回答只依据已发布笔记，重要结论请打开原文核对'
      : '登录后可用 · 回答只依据已发布笔记，重要结论请打开原文核对';
  };
  updateLoginNote();
  window.addEventListener('atw-auth', updateLoginNote);
  if (getToken()) {
    try {
      const pending = sessionStorage.getItem(PENDING_KEY);
      if (pending) {
        input.value = pending.slice(0, 1000);
        setOpen(true, { restoreFocus: false });
      }
    } catch {}
  }

  siteMeta().then((meta) => {
    enabled = Boolean(meta.knowledgeChat ?? meta.aiAssist);
    setBusy(false);
    if (!enabled) {
      input.placeholder = 'AI 查询通道暂未开启';
      note.textContent = '当前仍可使用右上角的普通全文搜索';
    }
  });
}
