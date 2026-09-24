#!/usr/bin/env node
// 从散落各处的创作目录里把歌收进 music-library/（之后照常 upload-music → music-manifest）。
//
// 歌一般躺在各个项目文件夹里（D:\AIGC工作站\36_霓雨\…），一首首手挑太费事。分两步：
//
//   1) 扫描：node scripts/collect-music.mjs "D:\AIGC工作站"
//      递归找音频，写出 music-library/candidates.tsv（可用记事本 / Excel 打开）。
//      每行：选用(y/n) · 歌名 · 源文件 · 封面。mp3 默认 y；wav / flac / m4a 默认 n
//      （播放器与清单脚本只收 mp3，先转码再放回来）。把不要的改成 n，歌名可以直接改。
//
//   2) 收集：node scripts/collect-music.mjs --apply
//      把选用 = y 的复制成 music-library/audio/<歌名>.mp3，封面复制成 covers/<歌名>.<扩展名>。
//      已存在的同名文件跳过，不覆盖。
//
// 然后：node scripts/upload-music.mjs && node scripts/music-manifest.mjs，提交 manifest.json。
import fs from 'node:fs';
import path from 'node:path';

const LIB = path.resolve('music-library');
const TSV = path.join(LIB, 'candidates.tsv');
const AUDIO_EXTS = ['.mp3', '.wav', '.flac', '.m4a'];
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const SKIP_DIRS = new Set(['node_modules', '.git', '$RECYCLE.BIN', 'System Volume Information']);
const HEADER = ['选用', '歌名', '源文件', '封面'];

// 「雨里旧信 (1)」「雨里旧信_v2」「雨里旧信-final」→「雨里旧信」
function guessTitle(file) {
  return path.basename(file, path.extname(file))
    .replace(/\s*[（(]\d+[)）]$/, '')
    .replace(/[_\-\s]*(v\d+|final|master|mix|定稿|成品)$/i, '')
    .replace(/[_]+/g, ' ')
    .trim() || path.basename(file);
}

// 封面：同目录下同名图片优先，其次文件名含 cover / 封面 的图片；都没有就留空，别乱猜
function findCover(audioFile, siblings) {
  const stem = path.basename(audioFile, path.extname(audioFile)).toLowerCase();
  const images = siblings.filter((f) => IMAGE_EXTS.includes(path.extname(f).toLowerCase()));
  return images.find((f) => path.basename(f, path.extname(f)).toLowerCase() === stem)
    || images.find((f) => /cover|封面/i.test(path.basename(f)))
    || '';
}

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  const files = entries.filter((e) => e.isFile()).map((e) => path.join(dir, e.name));
  for (const f of files) {
    if (AUDIO_EXTS.includes(path.extname(f).toLowerCase())) out.push({ file: f, cover: findCover(f, files) });
  }
  for (const e of entries) {
    if (e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(path.join(dir, e.name), out);
  }
  return out;
}

const safeName = (s) => s.replace(/[\\/:*?"<>|\t\r\n]/g, ' ').replace(/\s+/g, ' ').trim();

function scan(root) {
  if (!fs.existsSync(root)) {
    console.error(`[collect-music] 找不到目录：${root}`);
    process.exit(1);
  }
  const found = walk(path.resolve(root));
  if (!found.length) {
    console.error(`[collect-music] ${root} 下没有找到 ${AUDIO_EXTS.join(' / ')} 文件`);
    process.exit(1);
  }
  const rows = found.map(({ file, cover }) => [
    path.extname(file).toLowerCase() === '.mp3' ? 'y' : 'n',
    safeName(guessTitle(file)),
    file,
    cover,
  ]);
  fs.mkdirSync(LIB, { recursive: true });
  // 带 BOM：Windows 上 Excel 直接打开不乱码
  fs.writeFileSync(TSV, '\uFEFF' + [HEADER, ...rows].map((r) => r.join('\t')).join('\r\n') + '\r\n');
  const mp3 = rows.filter((r) => r[0] === 'y').length;
  console.log(`[collect-music] 找到 ${rows.length} 个音频（mp3 ${mp3} 个默认选用，其余需先转 mp3）`);
  console.log(`[collect-music] 清单：${TSV}`);
  console.log('[collect-music] 把不要的改成 n、歌名按需改好，然后：node scripts/collect-music.mjs --apply');
}

function apply() {
  if (!fs.existsSync(TSV)) {
    console.error('[collect-music] 还没有清单，先跑：node scripts/collect-music.mjs "D:\\AIGC工作站"');
    process.exit(1);
  }
  const lines = fs.readFileSync(TSV, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean).slice(1);
  const audioDir = path.join(LIB, 'audio');
  const coverDir = path.join(LIB, 'covers');
  fs.mkdirSync(audioDir, { recursive: true });
  fs.mkdirSync(coverDir, { recursive: true });
  const seen = new Set();
  let copied = 0;
  let skipped = 0;
  for (const line of lines) {
    const [pick, rawTitle, src, cover] = line.split('\t');
    if (String(pick).trim().toLowerCase() !== 'y') continue;
    const title = safeName(rawTitle || guessTitle(src));
    if (path.extname(src).toLowerCase() !== '.mp3') {
      console.warn(`  跳过（不是 mp3，先转码）：${src}`);
      skipped++;
      continue;
    }
    if (seen.has(title)) {
      console.warn(`  跳过（歌名重复，改个名再来）：${title} ← ${src}`);
      skipped++;
      continue;
    }
    seen.add(title);
    const dest = path.join(audioDir, `${title}.mp3`);
    if (fs.existsSync(dest)) {
      console.log(`  已有，不覆盖：${title}.mp3`);
    } else if (!fs.existsSync(src)) {
      console.warn(`  源文件不见了：${src}`);
      skipped++;
      continue;
    } else {
      fs.copyFileSync(src, dest);
      copied++;
      console.log(`  ✓ ${title}.mp3`);
    }
    if (cover && fs.existsSync(cover)) {
      const coverDest = path.join(coverDir, `${title}${path.extname(cover).toLowerCase()}`);
      if (!fs.existsSync(coverDest)) fs.copyFileSync(cover, coverDest);
    }
  }
  console.log(`[collect-music] 复制 ${copied} 首，跳过 ${skipped} 首 → ${audioDir}`);
  console.log('[collect-music] 下一步：node scripts/upload-music.mjs && node scripts/music-manifest.mjs');
}

const arg = process.argv[2];
if (arg === '--apply') apply();
else if (arg) scan(arg);
else {
  console.error('用法：node scripts/collect-music.mjs "D:\\AIGC工作站"   （扫描，生成清单）');
  console.error('      node scripts/collect-music.mjs --apply           （按清单复制进 music-library）');
  process.exit(1);
}
