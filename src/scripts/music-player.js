// 音乐播放器（全局，浏览器侧）。
//
// 数据：构建期产物 /music/playlist.json（音频在主站服务器 /music/ 静态目录，不在 git）。
// 跨页续播：静态站切页会重载音频，用 localStorage 记「曲目/进度/播放中/音量/模式」，
// 新页面加载时若上一页在播，从断点自动续播（自动播放被浏览器拦截时停在暂停态，点一下即播）。
// Media Session API 顺带接上：系统媒体键/锁屏控件可用。
// 曲库为空时播放条与抽屉整体隐藏，本文件全部逻辑空转。

const LS_KEY = 'atw-music-state';

const state = {
  tracks: [],
  index: 0,
  playing: false,
  volume: 0.9,
  mode: 'order', // order 列表循环 | single 单曲 | shuffle 随机
};

const els = {};
let audio = null;

const fmt = (s) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
};

const track = () => state.tracks[state.index];

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      index: state.index,
      time: audio ? audio.currentTime : 0,
      playing: state.playing,
      volume: state.volume,
      mode: state.mode,
    }));
  } catch {}
}

function loadPersisted() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
}

function nextIndex() {
  const n = state.tracks.length;
  if (!n) return 0;
  if (state.mode === 'single') return state.index;
  if (state.mode === 'shuffle') {
    if (n === 1) return state.index;
    let i = state.index;
    while (i === state.index) i = Math.floor(Math.random() * n);
    return i;
  }
  return (state.index + 1) % n;
}

function prevIndex() {
  const n = state.tracks.length;
  if (!n) return 0;
  if (state.mode === 'shuffle') return Math.floor(Math.random() * n);
  return (state.index - 1 + n) % n;
}

function applyMediaSession() {
  if (!('mediaSession' in navigator) || !track()) return;
  const t = track();
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title,
    artist: t.artist,
    album: '蛛网之上',
    artwork: t.cover ? [{ src: t.cover, sizes: '512x512' }] : [],
  });
  navigator.mediaSession.setActionHandler('play', () => togglePlay(true));
  navigator.mediaSession.setActionHandler('pause', () => togglePlay(false));
  navigator.mediaSession.setActionHandler('previoustrack', () => playAt(prevIndex()));
  navigator.mediaSession.setActionHandler('nexttrack', () => playAt(nextIndex()));
}

function renderNow() {
  const t = track();
  if (!t) return;
  els.title.textContent = t.title;
  els.artist.textContent = t.artist;
  if (t.cover) {
    els.cover.innerHTML = '';
    const img = document.createElement('img');
    img.src = t.cover;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('error', () => { img.remove(); els.cover.textContent = '♪'; }, { once: true });
    els.cover.append(img);
  } else {
    els.cover.textContent = '♪';
  }
  // 抽屉列表高亮
  els.list.querySelectorAll('[data-idx]').forEach((li) => {
    li.classList.toggle('is-current', Number(li.dataset.idx) === state.index);
  });
  document.title = state.playing ? `▶ ${t.title} · 蛛网之上` : document.title.replace(/^▶ [^·]+ · /, '');
}

function playAt(i, { autoplay = true } = {}) {
  const t = state.tracks[i];
  if (!t) return;
  state.index = i;
  audio.src = t.audio;
  renderNow();
  applyMediaSession();
  if (autoplay) togglePlay(true);
}

function togglePlay(force) {
  const want = force === undefined ? !state.playing : force;
  if (want) {
    audio.play().then(() => {
      state.playing = true;
      syncPlayUI();
      persist();
    }).catch(() => {
      // 浏览器自动播放策略拦截：停在暂停态，用户点播放键即播
      state.playing = false;
      syncPlayUI();
    });
  } else {
    audio.pause();
    state.playing = false;
    syncPlayUI();
    persist();
  }
}

function syncPlayUI() {
  els.play.setAttribute('aria-label', state.playing ? '暂停' : '播放');
  // 拿到的是 <path> 本身，只能改 d；给 path 塞 innerHTML 在 SVG 里不生效（图标会一直停在播放三角）
  els.playIcon.setAttribute('d', state.playing
    ? 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z'
    : 'M8 5.2v13.6L19 12z');
  els.bar.classList.toggle('is-playing', state.playing);
  document.documentElement.classList.toggle('music-on', true);
}

function syncModeUI() {
  els.mode.setAttribute('aria-label', { order: '列表循环', single: '单曲循环', shuffle: '随机播放' }[state.mode]);
  els.mode.dataset.mode = state.mode;
}

function cycleMode() {
  state.mode = { order: 'single', single: 'shuffle', shuffle: 'order' }[state.mode];
  syncModeUI();
  persist();
}

function renderList() {
  els.list.replaceChildren();
  state.tracks.forEach((t, i) => {
    const li = document.createElement('li');
    li.dataset.idx = i;
    li.innerHTML = `<span class="mp-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="mp-meta"><b></b><small>${t.artist}</small></span>
      <span class="mp-dur">${t.duration ? fmt(t.duration) : '--:--'}</span>`;
    li.querySelector('b').textContent = t.title;
    li.addEventListener('click', () => playAt(i));
    els.list.append(li);
  });
}

function onTimeUpdate() {
  if (!Number.isFinite(audio.duration)) return;
  els.progress.value = String((audio.currentTime / audio.duration) * 1000);
  els.cur.textContent = fmt(audio.currentTime);
  els.dur.textContent = fmt(audio.duration);
  persist();
}

function bind() {
  els.play.addEventListener('click', () => togglePlay());
  els.prev.addEventListener('click', () => playAt(prevIndex()));
  els.next.addEventListener('click', () => playAt(nextIndex()));
  els.mode.addEventListener('click', cycleMode);

  els.progress.addEventListener('input', () => {
    if (Number.isFinite(audio.duration)) audio.currentTime = (Number(els.progress.value) / 1000) * audio.duration;
  });

  els.volume.addEventListener('input', () => {
    state.volume = Number(els.volume.value);
    audio.volume = state.volume;
    persist();
  });

  els.toggleList.addEventListener('click', () => {
    els.drawer.hidden = !els.drawer.hidden;
    els.toggleList.setAttribute('aria-expanded', String(!els.drawer.hidden));
  });

  audio.addEventListener('timeupdate', onTimeUpdate);
  audio.addEventListener('loadedmetadata', () => { els.dur.textContent = fmt(audio.duration); });
  audio.addEventListener('ended', () => {
    if (state.mode === 'single') { audio.currentTime = 0; togglePlay(true); }
    else playAt(nextIndex());
  });
  audio.addEventListener('play', () => { state.playing = true; syncPlayUI(); });
  audio.addEventListener('pause', () => { state.playing = false; syncPlayUI(); persist(); });

  // 页面卸载前把进度存准（beforeunload 在移动端不可靠，timeupdate 里也持续 persist）
  window.addEventListener('beforeunload', persist);
}

export function initMusicPlayer(root) {
  if (!root || root.dataset.ready === 'true') return;
  root.dataset.ready = 'true';

  els.bar = root.querySelector('[data-mp-bar]');
  els.play = root.querySelector('[data-mp-play]');
  els.playIcon = els.play.querySelector('path');
  els.prev = root.querySelector('[data-mp-prev]');
  els.next = root.querySelector('[data-mp-next]');
  els.mode = root.querySelector('[data-mp-mode]');
  els.progress = root.querySelector('[data-mp-progress]');
  els.cur = root.querySelector('[data-mp-cur]');
  els.dur = root.querySelector('[data-mp-dur]');
  els.volume = root.querySelector('[data-mp-volume]');
  els.title = root.querySelector('[data-mp-title]');
  els.artist = root.querySelector('[data-mp-artist]');
  els.cover = root.querySelector('[data-mp-cover]');
  els.toggleList = root.querySelector('[data-mp-toggle-list]');
  els.drawer = root.querySelector('[data-mp-drawer]');
  els.list = root.querySelector('[data-mp-list]');
  els.closeList = root.querySelector('[data-mp-close]');
  audio = root.querySelector('audio');

  fetch(`${root.dataset.base || '/'}music/playlist.json`)
    .then((r) => r.json())
    .then(({ tracks }) => {
      if (!Array.isArray(tracks) || !tracks.length) return; // 曲库未就绪：整体保持隐藏
      state.tracks = tracks;

      const saved = loadPersisted();
      if (saved) {
        state.index = Math.min(Number(saved.index) || 0, tracks.length - 1);
        state.volume = typeof saved.volume === 'number' ? saved.volume : 0.9;
        state.mode = ['order', 'single', 'shuffle'].includes(saved.mode) ? saved.mode : 'order';
      }

      audio.volume = state.volume;
      els.volume.value = String(state.volume);
      renderList();
      syncModeUI();

      const t = track();
      audio.src = t.audio;
      audio.preload = 'metadata';
      // 断点位置等 metadata 就绪后再回（不自动播放，等用户或续播逻辑）
      audio.addEventListener('loadedmetadata', () => {
        if (saved && Number.isFinite(saved.time) && saved.time > 3 && saved.time < audio.duration - 2) {
          audio.currentTime = saved.time;
        }
      }, { once: true });
      renderNow();

      // 上一页在播 → 自动续播；被浏览器拦截就停在断点，点播放键继续
      if (saved && saved.playing) togglePlay(true);

      bind();
      // 板块页卡片点播放 → 全局播放器接管
      window.addEventListener('atw-music-play', (e) => playAt(Number(e.detail?.index) || 0));
      els.closeList.addEventListener('click', () => {
        els.drawer.hidden = true;
        els.toggleList.setAttribute('aria-expanded', 'false');
      });

      root.hidden = false; // 有曲库才现身
    })
    .catch(() => {/* playlist 拉不到（Pages 早期构建等）：静默保持隐藏 */});
}
