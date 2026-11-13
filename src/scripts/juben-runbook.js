import { escapeHtml } from './account-core.js';

const runbookHighlights = /(?<gate>不要翻开下一页|不可翻开下一页|重投仍平|强制公开不能藏|经典版(?:跳过走向说明|跳过|省略)|只拿出符合条件的一个剧场)|(?<material>虚拟轨\s*\d+(?:[–—／/、-]\d+)*|现实轨\s*\d+(?:[–—／/、-]\d+)*|《Remember Me》|《Hello Zepp》|「名侦探的分析思路」[\d–—\s]*|编号\s*46|剧场\s*[12])|(?<number>每地最多(?:搜)?两条|每人最多藏一张|五人留在现实搜证，一人进虚拟|\d{1,2}:\d{2}|\d+\s*(?:AP|分钟|点))/g;

function highlightRunbookText(value) {
  let position = 0;
  let html = '';
  for (const match of value.matchAll(runbookHighlights)) {
    const kind = match.groups.gate ? 'gate' : match.groups.material ? 'material' : 'number';
    html += escapeHtml(value.slice(position, match.index));
    html += `<mark class="md-run-highlight is-${kind}">${escapeHtml(match[0])}</mark>`;
    position = match.index + match[0].length;
  }
  return html + escapeHtml(value.slice(position));
}

function renderSceneLine(line) {
  const match = line.match(/^【([^】]+)】(.*)$/);
  if (!match) return `<li>${highlightRunbookText(line)}</li>`;
  const [, role, words] = match;
  const kind = role.includes('DM 念') ? 'speak' : role.includes('玩家接话') ? 'player' : 'cue';
  return `<li class="md-run-scene-${kind}"><strong>${escapeHtml(role)}</strong><div>${highlightRunbookText(words)}</div></li>`;
}

function renderAudioTrack(track) {
  const [name, encoded, source] = track.split('~');
  const included = encoded && /^[A-Za-z0-9+/]+={0,2}$/.test(encoded);
  const remote = encoded?.match(/^@([a-f0-9]{40}|[a-f0-9]{64})$/)?.[1];
  const official = source && /^https:\/\//.test(source) ? `<a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">官方试听与下载页</a>` : '';
  const load = remote ? `<button type="button" data-run-audio-load="${remote}">播放音频</button>` : '';
  return `<div class="md-run-audio-track"><strong>${escapeHtml(name)}</strong>${official}${load}<label>${included || remote ? '替换本机音源' : '选择音频'} <input type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac" data-run-audio="${escapeHtml(name)}"></label><audio controls preload="none"${included ? ` src="data:audio/mpeg;base64,${encoded}"` : ' hidden'}></audio><small role="status"></small></div>`;
}

const isBgm = (track) => track.startsWith('BGM · ');

export function renderRunbook(rows) {
  const steps = rows.map((row) => row.split('|'));
  if (!steps.length || steps.some((fields) => fields.length < 6 || fields.length > 9 || fields.slice(0, 6).some((value) => !value)
    || !/^\d{1,2}$/.test(fields[1]))) return '<p>现场流程暂时无法显示。</p>';
  const bgm = [...new Set(steps.flatMap((step) => (step[8] || '').split('；').filter(isBgm)))];
  return `<div class="md-runbook-entry"><button type="button" data-run-open>打开现场带本 · ${steps.length} 步</button>
    <dialog class="md-whiteboard-cards md-trace-workspace md-runbook" aria-label="《虚拟游戏》现场带本">
      <header class="md-trace-heading"><h3>《虚拟游戏》现场带本</h3><button type="button" data-run-new>新开一场</button><button type="button" data-run-close>返回档案</button></header>
      <nav aria-label="现场步骤">
        <button type="button" data-run-prev disabled>上一步</button>
        <select aria-label="跳到步骤">${steps.map(([title], index) => `<option value="${index}">${index + 1}. ${escapeHtml(title)}</option>`).join('')}</select>
        <button type="button" data-run-next>下一步</button>
      </nav>
      ${bgm.length ? `<details class="md-run-bgm"><summary>背景音乐 · 独立播放</summary><div class="md-run-bgm-tracks">${bgm.map(renderAudioTrack).join('')}</div></details>` : ''}
      <div class="md-run-body">
        ${steps.map(([title, minutes, say, actions, supplies, check, scene, reference, audio], index) => `<section data-run-step data-minutes="${minutes}"${reference ? ` data-run-reference="${escapeHtml(reference)}"` : ''}${index ? ' hidden' : ''}>
          <h4>${escapeHtml(title)}</h4>
          ${audio && !audio.split('；').every(isBgm) ? `<details class="md-run-reference md-run-audio"><summary>现场音频</summary>${audio.split('；').filter((track) => !isBgm(track)).map(renderAudioTrack).join('')}</details>` : ''}
          ${Number(minutes) ? `<div class="md-run-timer"><output>${minutes}:00</output><span role="status"></span>
            <button type="button" data-run-clock="toggle">开始</button><button type="button" data-run-clock="add">＋5 分钟</button><button type="button" data-run-clock="reset">重置</button></div>` : ''}
          <dl><div class="md-run-say"><dt>对玩家说</dt><dd>${highlightRunbookText(say)}</dd></div>
          <div><dt>DM 操作</dt><dd><ol>${actions.split('；').map((item) => `<li>${highlightRunbookText(item)}</li>`).join('')}</ol></dd></div>
          <div class="md-run-material"><dt>物料与判定 · 仅 DM 查看</dt><dd>${highlightRunbookText(supplies)}</dd></div>
          <div class="md-run-check"><dt>进入下一步前</dt><dd>${highlightRunbookText(check)}</dd></div></dl>
          ${scene ? `<details class="md-run-reference md-run-scene"><summary>小剧场 · 台词与走位</summary><ol>${scene.split('；').map(renderSceneLine).join('')}</ol></details>` : ''}
        </section>`).join('')}
      </div>
    </dialog></div>`;
}

function mountRunbookAudio(inputs, fetchAudio) {
  const players = new Map(inputs.map((input) => [input, input.closest('.md-run-audio-track').querySelector('audio')]));
  const database = new Promise((resolve, reject) => {
    const request = indexedDB.open('atw-juben-runbook-audio', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('tracks');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Audio storage is blocked'));
  });
  const read = async (name) => {
    const db = await database;
    return new Promise((resolve, reject) => {
      const request = db.transaction('tracks').objectStore('tracks').get(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };
  const save = async (name, file) => {
    const db = await database;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tracks', 'readwrite');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      tx.objectStore('tracks').put(file, name);
    });
  };
  const urls = new Map();
  const observer = new MutationObserver(() => {
    if (inputs[0].isConnected) return;
    for (const [player, url] of urls) {
      player.pause();
      URL.revokeObjectURL(url);
    }
    database.then((db) => db.close(), () => {});
    observer.disconnect();
  });
  observer.observe(inputs[0].ownerDocument.body, { childList: true, subtree: true });
  for (const [input, player] of players) {
    const name = input.dataset.runAudio;
    const track = input.closest('.md-run-audio-track');
    const status = track.querySelector('[role="status"]');
    const load = track.querySelector('[data-run-audio-load]');
    let version = 0;
    function show(file, message = file.name) {
      if (!input.isConnected) return;
      player.pause();
      if (urls.has(player)) URL.revokeObjectURL(urls.get(player));
      const url = URL.createObjectURL(file);
      urls.set(player, url);
      player.src = url;
      player.hidden = false;
      if (load) load.hidden = true;
      status.textContent = message;
    }
    if (load && fetchAudio) load.addEventListener('click', async () => {
      const current = ++version;
      load.disabled = true;
      status.textContent = '正在加载音频…';
      try {
        const audio = await fetchAudio(load.dataset.runAudioLoad);
        if (current !== version) return;
        if (audio.type !== 'audio/mpeg' || !audio.size) throw new Error('Invalid audio');
        show(audio, '已加载');
        if (input.isConnected) player.play().catch(() => {});
      } catch {
        if (current === version) status.textContent = '音频加载失败，请重试或选择本机音源。';
      } finally {
        load.disabled = false;
      }
    });
    read(name).then((file) => { if (file && version === 0) show(file); }, () => {});
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      const current = ++version;
      show(file);
      try { await save(name, file); } catch {
        if (current === version) status.textContent = `${file.name}（本次可播，刷新后需重新选择）`;
      }
    });
    player.addEventListener('play', () => {
      for (const [otherInput, other] of players) {
        if (other !== player && isBgm(otherInput.dataset.runAudio) === isBgm(name)) other.pause();
      }
    });
    player.addEventListener('error', () => { status.textContent = '无法播放，请换用 MP3 或 M4A 文件。'; });
  }
}

export function mountRunbook(host, autoOpen = false, fetchAudio) {
  const entry = host.querySelector('.md-runbook-entry');
  if (!entry) return;
  const dialog = entry.querySelector('dialog');
  const audioInputs = [...dialog.querySelectorAll('[data-run-audio]')];
  if (audioInputs.length) mountRunbookAudio(audioInputs, fetchAudio);
  const steps = [...dialog.querySelectorAll('[data-run-step]')];
  const select = dialog.querySelector('select');
  const prev = dialog.querySelector('[data-run-prev]');
  const next = dialog.querySelector('[data-run-next]');
  const opener = entry.querySelector('[data-run-open]');
  const clocks = steps.map((step) => ({ left: Number(step.dataset.minutes) * 60_000, end: 0, announced: false }));
  const key = 'atw-juben-virtual-game-run-v1';
  let index = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved?.clocks) && saved.clocks.length === clocks.length) {
      saved.clocks.forEach((clock, i) => {
        if (Number(steps[i].dataset.minutes) && Number.isFinite(clock?.left) && clock.left >= 0
          && Number.isFinite(clock.end) && clock.end >= 0) clocks[i] = clock;
      });
      if (Number.isInteger(saved.index) && saved.index >= 0 && saved.index < steps.length) index = saved.index;
    }
  } catch { /* 本机存储不可用时，仍可在本页计时。 */ }
  let interval = 0;
  const save = () => {
    try { localStorage.setItem(key, JSON.stringify({ clocks, index })); } catch { /* 仅保存在当前页面。 */ }
  };
  function paint() {
    for (const [i, clock] of clocks.entries()) {
      const timer = steps[i].querySelector('.md-run-timer');
      if (!timer) continue;
      if (clock.end) {
        clock.left = Math.max(0, clock.end - Date.now());
        if (!clock.left) { clock.end = 0; clock.announced = true; save(); }
      }
      const seconds = Math.ceil(clock.left / 1000);
      timer.querySelector('output').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      const status = timer.querySelector('[role="status"]');
      const message = clock.announced ? '时间到，可结束公聊或加时。' : '';
      if (status.textContent !== message) status.textContent = message;
      timer.querySelector('[data-run-clock="toggle"]').textContent = clock.end ? '暂停' : '开始';
    }
  }
  function goTo(target) {
    if (!Number.isInteger(target) || target < 0 || target >= steps.length) return;
    steps.forEach((step, i) => { step.hidden = i !== target; });
    index = target;
    select.value = String(index);
    prev.disabled = index === 0;
    next.disabled = index === steps.length - 1;
    dialog.querySelector('.md-run-body').scrollTop = 0;
    save();
    paint();
  }
  const open = () => {
    if (dialog.open) return;
    dialog.showModal();
    paint();
    interval = setInterval(() => {
      if (!dialog.isConnected) { clearInterval(interval); return; }
      paint();
    }, 250);
  };
  opener.addEventListener('click', open);
  dialog.querySelector('[data-run-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-run-new]').addEventListener('click', () => {
    if (!window.confirm('回到开场准备并重置本场所有公聊计时？')) return;
    steps.forEach((step, i) => {
      clocks[i] = { left: Number(step.dataset.minutes) * 60_000, end: 0, announced: false };
    });
    goTo(0);
  });
  dialog.addEventListener('close', () => { clearInterval(interval); opener.focus({ preventScroll: true }); });
  prev.addEventListener('click', () => goTo(index - 1));
  next.addEventListener('click', () => goTo(index + 1));
  select.addEventListener('change', () => goTo(Number(select.value)));
  dialog.addEventListener('click', (event) => {
    const action = event.target.closest('[data-run-clock]')?.dataset.runClock;
    if (!action) return;
    paint();
    const clock = clocks[index];
    if (action === 'toggle') clock.end = clock.end ? 0 : clock.left ? Date.now() + clock.left : 0;
    if (action === 'add') {
      if (clock.end) clock.end += 300_000;
      else clock.left += 300_000;
      clock.announced = false;
    }
    if (action === 'reset') {
      clock.left = Number(steps[index].dataset.minutes) * 60_000;
      clock.end = 0;
      clock.announced = false;
    }
    save();
    paint();
  });
  goTo(index);
  if (autoOpen) open();
}

export function attachRunbookReferences(host, workspaces, { includeLive = true } = {}) {
  const steps = host.querySelectorAll('[data-run-step]');
  const cases = workspaces.find(({ deck }) => deck.classList.contains('md-case-workspace'))?.slides;
  const board = workspaces.find(({ deck }) => !deck.classList.contains('md-case-workspace'))?.slides;
  if (!steps.length) return;
  const doc = host.ownerDocument;

  function addReference(step, label, render) {
    const details = doc.createElement('details');
    details.className = 'md-run-reference';
    const summary = doc.createElement('summary');
    summary.textContent = label;
    details.append(summary);
    details.addEventListener('toggle', () => {
      if (details.open && details.children.length === 1) render(details);
    });
    step.append(details);
  }

  function copyImage(slide, target) {
    const image = slide.querySelector('img')?.cloneNode();
    if (image) target.append(image);
  }

  for (const step of steps) {
    if (!step.dataset.runReference) continue;
    let reference;
    try { reference = JSON.parse(step.dataset.runReference); } catch { continue; }
    if (!reference || typeof reference !== 'object') continue;
    const { live, layout, boardStep, caseIndices } = reference;
    if (includeLive && Array.isArray(live) && live.length === 2 && live.every((value) => typeof value === 'string')) {
      const [title, update] = live;
      const panel = doc.createElement('aside');
      panel.className = 'md-run-live';
      const heading = doc.createElement('h5');
      heading.textContent = '现场整理与更新白板';
      const lead = doc.createElement('strong');
      lead.textContent = title;
      const notes = doc.createElement('p');
      notes.textContent = update;
      panel.append(heading, lead, notes);
      if (Array.isArray(layout)) {
        const grid = doc.createElement('ul');
        grid.className = 'md-run-layout';
        for (const label of layout) {
          const cell = doc.createElement('li');
          cell.textContent = label;
          grid.append(cell);
        }
        panel.append(grid);
      }
      step.querySelector('dl').before(panel);
    }
    if (Number.isInteger(boardStep) && board?.[boardStep - 1]) {
      addReference(step, `本步白板 · 第 ${boardStep} 笔`, (target) => {
        const slide = board[boardStep - 1];
        copyImage(slide, target);
        const notes = doc.createElement('p');
        notes.textContent = slide.querySelectorAll('dd')[1].textContent;
        target.append(notes);
      });
    }
    if (!Array.isArray(caseIndices) || !caseIndices.length || !caseIndices.every((i) => Number.isInteger(i) && cases?.[i])) continue;
    addReference(step, `本重案件卡 · ${caseIndices.length} 张`, (target) => {
      const select = doc.createElement('select');
      select.setAttribute('aria-label', '选择本重案件');
      const card = doc.createElement('div');
      for (const i of caseIndices) {
        const option = doc.createElement('option');
        option.value = String(i);
        option.textContent = cases[i].querySelector('h4').textContent;
        select.append(option);
      }
      const render = () => {
        const slide = cases[Number(select.value)];
        card.replaceChildren();
        copyImage(slide, card);
        const notes = slide.querySelector('.md-trace-notes').cloneNode(true);
        notes.className = 'md-run-case-notes';
        notes.removeAttribute('tabindex');
        notes.removeAttribute('aria-label');
        notes.querySelector('.md-linked-board')?.remove();
        card.append(notes);
      };
      select.addEventListener('change', render);
      target.append(select, card);
      render();
    });
  }
}
