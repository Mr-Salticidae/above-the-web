#!/usr/bin/env node
// 扫描本机曲库生成 src/data/music/manifest.json 初稿（零依赖）。
//
// 用法：mp3 放 music-library/audio/（命名建议「歌名.mp3」或「艺术家 - 歌名.mp3」），
// 封面可选（music-library/covers/，与音频同名 .jpg/.png/.webp）。
// 跑：node scripts/music-manifest.mjs → 生成/合并 manifest，人工过一眼（改 title/note）再提交。
//
// 时长：读 mp3 末尾的 duration 估算不引依赖做不准，先留 0（播放时会以实际时长显示）。
// 合并策略：按 audio 文件名匹配，已有人工记录（title/note 等）保留不覆盖。

import fs from 'node:fs';
import path from 'node:path';

const LIB = path.resolve('music-library');
const AUDIO = path.join(LIB, 'audio');
const COVERS = path.join(LIB, 'covers');
const OUT = path.resolve('src/data/music/manifest.json');

if (!fs.existsSync(AUDIO)) {
  console.error(`[music-manifest] 没有 ${AUDIO} —— 先把 mp3 放进去`);
  process.exit(1);
}

const COVER_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const mp3s = fs.readdirSync(AUDIO).filter((f) => f.toLowerCase().endsWith('.mp3')).sort();

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { tracks: [] };
const prevByAudio = new Map(prev.tracks.map((t) => [t.audio, t]));

const tracks = mp3s.map((file) => {
  const stem = file.replace(/\.mp3$/i, '');
  // 「艺术家 - 歌名」或「歌名」两种命名都认；已有记录优先用人工确认过的字段
  const m = stem.match(/^(.+?)\s*-\s*(.+)$/);
  const guessed = {
    id: stem.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '') || stem,
    artist: m ? m[1].trim() : '跳蛛先生',
    title: (m ? m[2] : stem).trim(),
  };
  const cover = COVER_EXTS.map((e) => stem + e).find((c) => fs.existsSync(path.join(COVERS, c)));
  const old = prevByAudio.get(file);
  return {
    id: old?.id || guessed.id,
    title: old?.title || guessed.title,
    artist: old?.artist || guessed.artist,
    audio: file,
    ...(cover || old?.cover ? { cover: old?.cover || cover } : {}),
    duration: old?.duration || 0,
    note: old?.note || '',
  };
});

fs.writeFileSync(OUT, JSON.stringify({ tracks }, null, 2) + '\n', 'utf8');
console.log(`[music-manifest] 写入 ${tracks.length} 首 → ${path.relative(process.cwd(), OUT)}`);
console.log('[music-manifest] 记得人工过一眼 title/note，git push 部署后生效');
