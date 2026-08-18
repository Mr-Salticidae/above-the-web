#!/usr/bin/env node
// 上传本机曲库到香港服务器 /var/www/atw-music/（音频不进 git，nginx 直接服务）。
//
// 用法：把 mp3 放 music-library/audio/、封面放 music-library/covers/（可选，与音频同名），
// 然后：node scripts/upload-music.mjs
// 上传后跑 scripts/music-manifest.mjs 生成/更新 manifest，push 部署即生效。
//
// 服务器路径与 platform/deploy/nginx-music.conf 对应；目录不存在会自动创建。

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HOST = 'root@43.128.2.172';
const REMOTE = '/var/www/atw-music';
const LIB = path.resolve('music-library');

function sh(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
}

function uploadDir(sub) {
  const dir = path.join(LIB, sub);
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter((f) => !f.startsWith('.'));
  if (!files.length) return 0;
  sh(`ssh -o ConnectTimeout=10 ${HOST} "mkdir -p ${REMOTE}/${sub}"`);
  sh(`scp -o ConnectTimeout=10 "${dir}/." ${HOST}:${REMOTE}/${sub}/`);
  return files.length;
}

if (!fs.existsSync(LIB)) {
  console.error(`[music-upload] 没有 ${LIB} —— 把 mp3 放进 music-library/audio/ 再跑`);
  process.exit(1);
}

const audio = uploadDir('audio');
const covers = uploadDir('covers');
if (!audio && !covers) {
  console.error('[music-upload] music-library/ 里没有可上传的文件');
  process.exit(1);
}

// 列出服务器侧文件清单核对
console.log(`[music-upload] 已上传：音频 ${audio} 个，封面 ${covers || 0} 个`);
const list = sh(`ssh -o ConnectTimeout=10 ${HOST} "ls ${REMOTE}/audio | head -5; echo ...; ls ${REMOTE}/audio | wc -l"`);
console.log(`[music-upload] 服务器现存：\n${list}`);
console.log('[music-upload] 下一步：node scripts/music-manifest.mjs 生成曲目清单，git push 部署');
