// 把「AIGC 快讯」板块打成 B 站 Toy 独立包（dist-toy-news/）。
//
// 为什么要单独一条链路：Toy 页面跑在 https://www.bilibili.com/toy/<slug>/ 子路径下，
// 而站点主构建用的是绝对 base（/above-the-web/ 或 /），直接把 dist/news 传上去必然白屏。
// 这里的做法是「构建时插一个哨兵 base，产出后把它改写成相对路径」——
// 包因此与 slug 无关，换 slug、换目录层级都不用重打。
//
//   node scripts/build-toy-news.mjs
//
// 产物 dist-toy-news/ 结构（快讯首页提升为包根 index.html）：
//   index.html            最新一期 + 往期索引
//   2026-07-21/index.html 每期归档页
//   _astro/*              仅快讯页真正引用到的样式/脚本
//   favicon.svg
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SENTINEL = '/__TOYBASE__/';       // 构建期占位 base，产出后全部改写成相对路径
const BUILD_DIR = path.join(ROOT, '.toy-build');
const OUT_DIR = path.join(ROOT, 'dist-toy-news');

fs.rmSync(BUILD_DIR, { recursive: true, force: true });
fs.rmSync(OUT_DIR, { recursive: true, force: true });

console.log('[toy-news] astro build（哨兵 base）…');
execFileSync('npx', ['astro', 'build', '--outDir', BUILD_DIR], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, BASE_PATH: SENTINEL, SITE_URL: 'https://www.bilibili.com', TOY_NEWS: '1' },
});

const newsDir = path.join(BUILD_DIR, 'news');
if (!fs.existsSync(path.join(newsDir, 'index.html'))) {
  throw new Error(`构建产物里没有 news/index.html：${newsDir}`);
}

// 深度 0（包根）用 ./，深度 1（每期归档页）用 ../。哨兵下的 news/ 一层被拍平掉。
// 目录式链接一律补 index.html —— Toy 的静态托管不保证目录兜底，裸 `xxx/` 可能直接 NoSuchKey。
const relativize = (html, depth) => {
  const prefix = depth === 0 ? './' : '../'.repeat(depth);
  return html.replace(/\/__TOYBASE__\/(?:news\/)?([^"')\s]*)/g, (_, rest) =>
    prefix + (rest === '' || rest.endsWith('/') ? `${rest}index.html` : rest));
};

const assets = new Set();
const collectAssets = (html) => {
  for (const m of html.matchAll(/\/__TOYBASE__\/(_astro\/[^"'()\s]+)/g)) assets.add(m[1]);
};

const writeHtml = (srcFile, destFile, depth) => {
  const raw = fs.readFileSync(srcFile, 'utf8');
  collectAssets(raw);
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.writeFileSync(destFile, relativize(raw, depth), 'utf8');
};

// 快讯首页提升为包根 index.html —— Toy 进入 /toy/<slug>/ 直接落在最新一期
writeHtml(path.join(newsDir, 'index.html'), path.join(OUT_DIR, 'index.html'), 0);

let issues = 0;
for (const entry of fs.readdirSync(newsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const src = path.join(newsDir, entry.name, 'index.html');
  if (!fs.existsSync(src)) continue;
  writeHtml(src, path.join(OUT_DIR, entry.name, 'index.html'), 1);
  issues++;
}

// 只搬快讯页真正引用到的 _astro 资源，别把整站样式脚本一起打进去
for (const rel of assets) {
  const src = path.join(BUILD_DIR, rel);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(OUT_DIR, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
fs.copyFileSync(path.join(BUILD_DIR, 'favicon.svg'), path.join(OUT_DIR, 'favicon.svg'));

// 兜底自检：哨兵残留 = 上线后必然 404，宁可在这里炸掉
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const leftovers = walk(OUT_DIR).filter((f) => /\.(html|css|js|svg|json)$/i.test(f)
  && fs.readFileSync(f, 'utf8').includes('__TOYBASE__'));
if (leftovers.length) {
  throw new Error(`以下产物仍残留哨兵 base，需扩展改写规则：\n  ${leftovers.join('\n  ')}`);
}

fs.rmSync(BUILD_DIR, { recursive: true, force: true });
console.log(`[toy-news] 完成：${OUT_DIR}（首页 + ${issues} 期归档 + ${assets.size} 个资源）`);
