// 把「AIGC 快讯」板块打成独立子站产物（dist-news/），部署到 news.tiaozhuxiansheng.com。
//
// 为什么要单独一条链路：主站产物里快讯挂在 /news/ 下，直接把 dist/news 传到子域名根，
// 站内链接（/news/2026-08-26/）会整体多一层落空；导航里的笔记/音乐/任务书也不在包内。
// 做法与 Toy 包同源——「构建时插一个哨兵 base，产出后改写」，只是改写目标从相对路径
// 换成子域名的根路径 /。
//
// 为什么不省掉这次构建、直接对主站 dist/news 做字符串替换：期刊条目的外链本身常带
// /news/ 路径段（新闻站的 URL 就长这样），裸替换 "/news/" 会把它们一起改坏。
// 哨兵串独一无二，不会误伤；NEWS_SITE=1 还顺带把导航改成指向主站的绝对地址。
//
//   node scripts/build-news-site.mjs
//
// 产物 dist-news/（nginx root 直接指向它，见 platform/deploy/nginx-news.conf）：
//   index.html            最新一期 + 往期索引（子域名根）
//   2026-08-26/index.html 每期归档页
//   _astro/*              仅快讯页真正引用到的样式/脚本
//   favicon.svg
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SENTINEL = '/__NEWSBASE__/';      // 构建期占位 base，产出后全部改写成子域名根路径
const ORIGIN = 'https://news.tiaozhuxiansheng.com';
const BUILD_DIR = path.join(ROOT, '.news-build');
const OUT_DIR = path.join(ROOT, 'dist-news');

fs.rmSync(BUILD_DIR, { recursive: true, force: true });
fs.rmSync(OUT_DIR, { recursive: true, force: true });

console.log('[news-site] astro build（哨兵 base）…');
execFileSync('npx', ['astro', 'build', '--outDir', BUILD_DIR], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, BASE_PATH: SENTINEL, SITE_URL: ORIGIN, NEWS_SITE: '1' },
});

const newsDir = path.join(BUILD_DIR, 'news');
if (!fs.existsSync(path.join(newsDir, 'index.html'))) {
  throw new Error(`构建产物里没有 news/index.html：${newsDir}`);
}

// 哨兵下的 news/ 一层被拍平：/__NEWSBASE__/news/2026-08-26/ → /2026-08-26/，
// 其余资源（/__NEWSBASE__/_astro/… 、favicon）直接落到根。目录式链接保持不动——
// nginx 的 try_files $uri $uri/ 会兜到目录下的 index.html。
const absolutize = (text) =>
  text.replaceAll(`${SENTINEL}news/`, '/').replaceAll(SENTINEL, '/');

const assets = new Set();
const collectAssets = (html) => {
  for (const m of html.matchAll(/\/__NEWSBASE__\/(_astro\/[^"'()\s]+)/g)) assets.add(m[1]);
};

const writeHtml = (srcFile, destFile) => {
  const raw = fs.readFileSync(srcFile, 'utf8');
  collectAssets(raw);
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.writeFileSync(destFile, absolutize(raw), 'utf8');
};

// 快讯首页提升为子域名根 index.html
writeHtml(path.join(newsDir, 'index.html'), path.join(OUT_DIR, 'index.html'));

let issues = 0;
for (const entry of fs.readdirSync(newsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const src = path.join(newsDir, entry.name, 'index.html');
  if (!fs.existsSync(src)) continue;
  writeHtml(src, path.join(OUT_DIR, entry.name, 'index.html'));
  issues++;
}

// 只搬快讯页真正引用到的 _astro 资源，别把整站样式脚本一起打进去。
// css/js 里也可能内嵌哨兵（背景图、字体、动态 import），一并改写。
for (const rel of assets) {
  const src = path.join(BUILD_DIR, rel);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(OUT_DIR, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (/\.(css|js)$/i.test(rel)) {
    fs.writeFileSync(dest, absolutize(fs.readFileSync(src, 'utf8')), 'utf8');
  } else {
    fs.copyFileSync(src, dest);
  }
}
fs.copyFileSync(path.join(BUILD_DIR, 'favicon.svg'), path.join(OUT_DIR, 'favicon.svg'));

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const textFiles = walk(OUT_DIR).filter((f) => /\.(html|css|js|svg|json)$/i.test(f));

// 兜底自检 1：哨兵残留 = 上线后必然 404，宁可在这里炸掉
const leftovers = textFiles.filter((f) => fs.readFileSync(f, 'utf8').includes('__NEWSBASE__'));
if (leftovers.length) {
  throw new Error(`以下产物仍残留哨兵 base，需扩展改写规则：\n  ${leftovers.join('\n  ')}`);
}

// 兜底自检 2：canonical 必须指向子域名自己——主站 /news/ 靠它把权重让给这里，
// 要是常量被改歪，两边互指或指丢，SEO 上比不加还糟。
const home = fs.readFileSync(path.join(OUT_DIR, 'index.html'), 'utf8');
if (!home.includes(`<link rel="canonical" href="${ORIGIN}/">`)) {
  throw new Error('首页缺少指向子域名的 canonical，检查 src/lib/news.mjs 的 NEWS_SITE_ORIGIN');
}

// 兜底自检 3：子站是直接发给外部学员的，产物里不许出现通往个人站/个人仓库的链接。
// 快讯条目指向外部新闻源是正常的（含 github.com 上的项目），只拦自家那几个落点。
// BaseLayout 里靠 NEWS_SITE 分支把导航摘干净，这条守卫防的是日后有人改回来而没人发现。
const OWN_HOSTS = new Set([
  'tiaozhuxiansheng.com', 'www.tiaozhuxiansheng.com',
  'tiaozhuxiansheng.cn', 'www.tiaozhuxiansheng.cn',
  'mr-salticidae.github.io',
]);
const isOwnLink = (href) => {
  let u;
  try { u = new URL(href, ORIGIN); } catch { return false; }
  if (OWN_HOSTS.has(u.host)) return true;
  // 个人仓库（github.com/Mr-Salticidae/…）也算自家落点，别人的 GitHub 项目不算
  return u.host === 'github.com' && u.pathname.toLowerCase().startsWith('/mr-salticidae/');
};
const leaked = [];
for (const f of textFiles) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (isOwnLink(m[1])) leaked.push(`${path.relative(OUT_DIR, f)} → ${m[1]}`);
  }
}
if (leaked.length) {
  const list = [...new Set(leaked)];
  for (const x of list) console.error(`  ${x}`);
  throw new Error(`子站产物里有 ${list.length} 处通往个人站的链接（见上），隔离被破坏`);
}

fs.rmSync(BUILD_DIR, { recursive: true, force: true });
console.log(`[news-site] 完成：${OUT_DIR}（首页 + ${issues} 期归档 + ${assets.size} 个资源，无外泄链接）`);
