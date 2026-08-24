// 知识库 AI 查询（浏览器侧）。
//
// 检索留在静态站：Pagefind 先把问题缩到最相关的几篇笔记，浏览器再读取这些公开页面的正文片段。
// 服务端只收到本轮需要的少量公开上下文，不需要再维护第二份知识库或向量数据库。
// 模型只负责「依据片段回答」，来源选择、URL 和数量都由代码兜住。
import { api, displayNameOf, escapeHtml, getCachedUser, getToken, url } from './account-core.js';
import { siteMeta } from './ai-assist.js';
import { primeNoteTotal, searchPagefindNotes } from '../lib/knowledge-search.mjs';

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

async function hydrateResult(result) {
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
    title: plainText(result.meta?.title || '未命名笔记').slice(0, 120),
    category: category.slice(0, 80),
    url: `${absolute.pathname}${absolute.search}${absolute.hash}`,
    excerpt: passageFromText(articleText, result),
  };
}

// 编号要和服务端 knowledgeSources 的清洗结果对得上：那边会丢掉摘要不足 20 字符、
// URL 重复或形如 // 开头的条目并从 1 重新编号。这边先按同一套规则筛一遍再编号，
// 否则模型标的 [2] 会被前端链接到本地顺位的另一篇笔记。
function numberSources(hydrated) {
  const seen = new Set();
  const sources = [];
  for (const item of hydrated) {
    if (!item.title || item.excerpt.length < 20) continue;
    if (!item.url.startsWith('/') || item.url.startsWith('//') || seen.has(item.url)) continue;
    seen.add(item.url);
    sources.push({ ...item, id: sources.length + 1 });
    if (sources.length >= MAX_RESULTS) break;
  }
  return sources;
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
  const hydrated = await Promise.all(results.map(hydrateResult));
  return numberSources(hydrated);
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

function assistantMessage(thread, { answer, sources = [], followUps = [], tone = '', avatarSrc = '', followLabel = '' }) {
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
    if (followLabel) {
      const label = document.createElement('span');
      label.className = 'kb-chat-followups-label';
      label.textContent = followLabel;
      followBox.append(label);
    }
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
  const avatarFull = root.dataset.assistantFull || '';
  // 栏目地图：构建期固化在组件的 data 属性里，助产模式随请求带给服务端供小织指路。
  let catalog = [];
  try {
    const parsed = JSON.parse(root.dataset.kbCatalog || '[]');
    if (Array.isArray(parsed)) catalog = parsed;
  } catch {}
  const launcher = root.querySelector('[data-kb-launcher]');

  // ── 头像高清预览（单例浮层，fixed 定位不受聊天滚动区 overflow 裁剪）──
  // 桌面：hover 头像弹出、移开即收；触屏：点头像开/关。浮层本身 pointer-events: none，
  // 纯查看不拦截交互；大图只在首次弹出时才加载。图下带一行她的名片，算迷你角色卡。
  let avatarPop = document.querySelector('body > .kb-chat-avatar-pop');
  const hideAvatarPop = () => avatarPop?.classList.remove('is-visible');
  const showAvatarPop = (avatar) => {
    if (!avatarFull) return;
    if (!avatarPop) {
      avatarPop = document.createElement('figure');
      avatarPop.className = 'kb-chat-avatar-pop';
      avatarPop.setAttribute('aria-hidden', 'true');
      const image = document.createElement('img');
      image.alt = '';
      image.addEventListener('error', hideAvatarPop, { once: true });
      const caption = document.createElement('figcaption');
      caption.textContent = '小织 · 知识库的织网人';
      avatarPop.append(image, caption);
      document.body.append(avatarPop);
    }
    const popImage = avatarPop.querySelector('img');
    const resolved = new URL(avatarFull, location.href).href;
    if (popImage.src !== resolved) popImage.src = resolved;
    // 名片行跟着记忆走：聊过几轮就写几轮，Galgame 的好感度就藏在这一行里
    avatarPop.querySelector('figcaption').textContent =
      memory?.meetCount > 0 ? `小织 · 知识库的织网人 · 和你聊过 ${memory.meetCount} 轮` : '小织 · 知识库的织网人';

    // 大图按 718x960 源比例估算占位：宽 220 → 高约 294，加名片行约 322。
    const W = 220;
    const H = 322;
    const GAP = 12;
    const EDGE = 8;
    const rect = avatar.getBoundingClientRect();
    let left = rect.right + GAP;
    if (left + W > window.innerWidth - EDGE) left = Math.max(EDGE, rect.left - W - GAP);
    let top = rect.top + rect.height / 2 - H / 2;
    top = Math.min(Math.max(EDGE, top), Math.max(EDGE, window.innerHeight - H - EDGE));
    avatarPop.style.left = `${Math.round(left)}px`;
    avatarPop.style.top = `${Math.round(top)}px`;
    avatarPop.classList.add('is-visible');
  };

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

  // ── 小织的记忆（Galgame 式回头客档案）──
  // 服务端一人一份：见面次数、上次话题、她自己记下的短条目。这里只负责取来
  // 拼问候语和名片，不在本机存副本；旧服务端没有这个端点时静默当成没有记忆。
  let memory = null;
  const fetchMemory = async () => {
    if (!getToken()) {
      memory = null;
      return;
    }
    try {
      memory = await api('GET', '/ai/kb-memory');
    } catch {
      memory = null;
    }
  };

  // 截断一律按码点数，别把 emoji 或扩展区汉字拦腰切成「�」；切过就补省略号
  const clipChars = (text, limit) => {
    const chars = Array.from(String(text || ''));
    return chars.length > limit ? `${chars.slice(0, limit).join('')}…` : String(text || '');
  };

  // 问候语模板：随机挑一句，按「隔了多久、上次聊什么」换口味。她的台词，不是系统提示。
  // 昵称是服务端原样行的 display_name（snake_case），走 displayNameOf 兜底；
  // 空昵称时连同前后的逗号一起省掉，别渲染出「回来啦，。」这种破句。
  const greetingText = () => {
    const name = displayNameOf(getCachedUser());
    const called = name ? `，${name}` : '';
    const topic = clipChars(memory.lastTopic, 24);
    const days = memory.lastSeenAt ? Math.floor((Date.now() - memory.lastSeenAt) / 86400000) : 0;
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    if (days >= 30) {
      return pick([
        `好久不见${called}。丝线我都还留着——${topic ? `上次你在琢磨「${topic}」，` : ''}这次带了什么来？`,
        `${name ? `${name}，` : ''}隔了这么久还记得回来。网上落了点灰，你的问题倒一根没丢。从哪儿接着说？`,
      ]);
    }
    if (topic) {
      return pick([
        `回来啦${called}。上次我们聊到「${topic}」，后来有进展吗？`,
        `又见面了。「${topic}」那件事我还记着——接着往下问，还是带了新问题来？`,
        `${name ? `${name}，` : ''}欢迎回来。要接着聊「${topic}」，还是这次换根线头？`,
      ]);
    }
    return pick([
      `回来啦${called}。这次想查点什么？`,
      `又见面了${called}。网上新添了些丝线，想从哪儿看起？`,
    ]);
  };

  // 回头客的欢迎语换成她的问候，并挂上「记得什么 / 忘掉我」两个入口。
  // 只在对话还没开始时动第一条气泡，聊到一半绝不插嘴。
  const personalizeWelcome = () => {
    if (!memory || history.length || busy) return;
    const first = thread.querySelector('.kb-chat-message.is-assistant .kb-chat-bubble');
    if (!first) return;
    const paragraph = first.querySelector('p');
    if (!(memory.meetCount > 0)) {
      // 已登录的初见用户：默认欢迎语里那句「登录后……」不该再对着登录的人说
      if (paragraph) {
        paragraph.textContent = paragraph.textContent.replace('登录后，聊过的事我会记得。', '聊过的事，我会记得。');
      }
      return;
    }
    if (paragraph) paragraph.textContent = greetingText();
    if (!first.querySelector('[data-kb-mem]')) {
      const box = document.createElement('div');
      box.className = 'kb-chat-followups kb-chat-mem-actions';
      const show = document.createElement('button');
      show.type = 'button';
      show.dataset.kbMem = 'show';
      show.textContent = '你都记得什么？';
      const forget = document.createElement('button');
      forget.type = 'button';
      forget.dataset.kbMem = 'forget';
      forget.textContent = '把我忘掉吧';
      box.append(show, forget);
      first.append(box);
    }
  };

  // 登出后卸妆：个性化问候和记忆按钮都不该留给下一位访客看
  const depersonalizeWelcome = () => {
    thread.querySelectorAll('.kb-chat-mem-actions').forEach((box) => box.remove());
    if (!history.length && !busy) thread.innerHTML = welcome;
  };

  const memoryDate = (ts) => {
    const date = new Date(Number(ts) || 0);
    return date.getTime() > 0 ? date.toLocaleDateString('zh-CN') : '';
  };

  const showMemoryMessage = async () => {
    await fetchMemory();
    if (!memory) return;
    if (!(memory.meetCount > 0)) {
      assistantMessage(thread, {
        answer: '现在的你，对我来说还是张新面孔——值得写下来的事还不多，多聊几次就有了。',
        tone: 'notice',
        avatarSrc,
      });
      return;
    }
    const lines = [
      `我们聊过 ${memory.meetCount} 轮${memory.lastTopic ? `，最近一次你在问「${memory.lastTopic}」` : ''}。`,
    ];
    if (memory.notes?.length) {
      lines.push('我记下的都在这儿：');
      memory.notes.forEach((entry) => {
        const day = memoryDate(entry.t);
        lines.push(`- ${day ? `${day}：` : ''}${entry.note}`);
      });
    } else {
      lines.push('值得写下来的事还不多——多聊几次就有了。');
    }
    lines.push('这份记忆只有你自己看得到，想让我忘掉就说一声。');
    assistantMessage(thread, { answer: lines.join('\n'), tone: 'notice', avatarSrc });
  };

  const confirmForget = () => {
    // 已经有一个确认还没答，不再叠一个
    if (thread.querySelector('[data-kb-mem="forget-yes"]')) return;
    const message = assistantMessage(thread, {
      answer: '真的要我把这些都忘掉吗？松开的线头，我可接不回来。',
      tone: 'notice',
      avatarSrc,
    });
    const bubble = message.querySelector('.kb-chat-bubble');
    const box = document.createElement('div');
    box.className = 'kb-chat-followups kb-chat-mem-actions';
    const yes = document.createElement('button');
    yes.type = 'button';
    yes.dataset.kbMem = 'forget-yes';
    yes.textContent = '都忘掉';
    const no = document.createElement('button');
    no.type = 'button';
    no.dataset.kbMem = 'forget-no';
    no.textContent = '算了，留着';
    box.append(yes, no);
    bubble.append(box);
  };

  const doForget = async (box) => {
    box?.remove();
    try {
      await api('DELETE', '/ai/kb-memory');
      memory = { meetCount: 0, lastSeenAt: null, lastTopic: '', notes: [] };
      // 忘完就收干净：欢迎气泡上的记忆入口和残留的确认框都不该再在——
      // 刚说完「初次见面」，转头还挂着「你都记得什么？」就穿帮了
      thread.querySelectorAll('.kb-chat-mem-actions').forEach((entry) => entry.remove());
      assistantMessage(thread, {
        answer: '……好，线头都松开了。那现在这样，就算我们初次见面——你好，我是小织。',
        avatarSrc,
      });
    } catch (error) {
      assistantMessage(thread, {
        answer: error.message || '这次没删成，稍后再试。',
        tone: 'error',
        avatarSrc,
      });
    }
  };

  // 面板一打开就在后台把索引和全库笔记数拉起来。点开「问知识库」的人多半要问，
  // 提前几秒开始加载，等他敲完问题就省掉了这段等待；失败也只是回到「提问时再加载」。
  const prewarm = () => {
    loadPagefind(base)
      .then((pagefind) => primeNoteTotal(pagefind, { type: 'note' }))
      .catch(() => {});
  };

  const setOpen = (value, { restoreFocus = true } = {}) => {
    const open = Boolean(value);
    panel.hidden = !open;
    root.dataset.open = String(open);
    launcher.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('kb-chat-open', open);
    if (!open) hideAvatarPop();

    if (open) {
      prewarm();
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
      // 零命中不再本地打住：这正是助产该接手的时刻——把问题连同栏目地图交给小织，
      // 由她引导读者把想问的东西问清楚（服务端会强制走 guide 模式）。
      if (!sources.length) {
        const label = loader.querySelector('em');
        if (label) label.textContent = '正在理线头';
      }

      const payload = await api('POST', '/ai/kb-chat', {
        question,
        history: history.slice(-HISTORY_LIMIT),
        sources,
        catalog,
      });
      try { sessionStorage.removeItem(PENDING_KEY); } catch {}
      loader.remove();
      const isGuide = payload.mode === 'guide';
      const usedIds = new Set((payload.sourceIds || []).map(Number));
      const usedSources = sources.filter((source) => usedIds.has(source.id));
      assistantMessage(thread, {
        answer: payload.answer,
        // 助产回复不是依据来源写的，挂参考笔记框反而误导；查笔记回复保持原样。
        sources: isGuide ? [] : usedSources.length ? usedSources : sources.slice(0, 3),
        followUps: payload.followUps || [],
        tone: isGuide ? 'guide' : '',
        followLabel: isGuide && (payload.followUps || []).length ? '试试这样问：' : '',
        avatarSrc,
      });
      history.push({ role: 'user', content: question }, { role: 'assistant', content: payload.answer });
      if (history.length > HISTORY_LIMIT) history.splice(0, history.length - HISTORY_LIMIT);
      // 本机的记忆跟着走一格，名片计数不用等下次刷新；短条目以服务端为准，看时现取
      if (memory) {
        memory.meetCount += 1;
        memory.lastTopic = clipChars(question.replace(/\s+/g, ' '), 60);
        memory.lastSeenAt = Date.now();
      }
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
    if (event.key === 'Escape') {
      if (avatarPop?.classList.contains('is-visible')) hideAvatarPop();
      else if (root.dataset.open === 'true') setOpen(false);
    }
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
  // 记忆入口：看她记得什么 / 让她忘掉（带一句确认对白，忘了就接不回来）。
  // 问答在途时一律不响应：这会儿删了记忆，等在途那轮落库又会把它复活，承诺就成空话了。
  thread.addEventListener('click', (event) => {
    const button = event.target.closest('[data-kb-mem]');
    if (!button || busy) return;
    const kind = button.dataset.kbMem;
    if (kind === 'show') showMemoryMessage();
    else if (kind === 'forget') confirmForget();
    else if (kind === 'forget-yes') doForget(button.closest('.kb-chat-mem-actions'));
    else if (kind === 'forget-no') {
      button.closest('.kb-chat-mem-actions')?.remove();
      assistantMessage(thread, { answer: '那就都先留着。想问什么，接着来。', avatarSrc });
    }
  });
  // 头像预览：桌面 hover 进出，触屏/鼠标点击开关；滚动或面板收起即隐藏。
  thread.addEventListener('mouseover', (event) => {
    const avatar = event.target.closest('img.kb-chat-avatar');
    if (avatar) showAvatarPop(avatar);
  });
  thread.addEventListener('mouseout', (event) => {
    if (event.target.closest('img.kb-chat-avatar')) hideAvatarPop();
  });
  thread.addEventListener('click', (event) => {
    const avatar = event.target.closest('img.kb-chat-avatar');
    if (!avatar) return;
    if (avatarPop?.classList.contains('is-visible')) hideAvatarPop();
    else showAvatarPop(avatar);
  }, { capture: true });
  thread.addEventListener('scroll', hideAvatarPop, { passive: true });
  reset.addEventListener('click', () => {
    history.length = 0;
    thread.innerHTML = welcome;
    starters.hidden = false;
    reset.hidden = true;
    input.value = '';
    input.focus();
    // 新对话回到欢迎语，但她还是认得你
    personalizeWelcome();
  });

  const updateLoginNote = () => {
    note.textContent = getCachedUser()
      ? '已登录 · 查笔记只依据已发布笔记，重要结论请打开原文核对'
      : '登录后可用 · 查笔记只依据已发布笔记，重要结论请打开原文核对';
  };
  const syncMemory = () => fetchMemory().then(personalizeWelcome);
  updateLoginNote();
  if (getToken()) syncMemory();
  window.addEventListener('atw-auth', () => {
    updateLoginNote();
    if (getToken()) {
      syncMemory();
    } else {
      memory = null;
      depersonalizeWelcome();
    }
  });
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
