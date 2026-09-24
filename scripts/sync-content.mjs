// 内容同步脚本：把公开知识库 knowledge-base 拉到本地 kb-content/，
// 清洗 Obsidian 特性带来的解析坑（frontmatter BOM），并从 git 历史导出每篇笔记的日期。
// 本地开发：增量 fetch；CI：首次克隆。kb-content/ 已 gitignore。
//
// 克隆方式是 blobless 部分克隆（--filter=blob:none）而不是 --depth 1：
// 提交与目录树全量拿到（整个仓库才几百 KB），文件内容只按当前版本按需下载，
// 所以体积与浅克隆几乎一样，却能 git log 出每个文件的首次提交与最后改动——
// 笔记的「发布于 / 更新于」、Feed、Sitemap 的 lastmod 都靠它（见 src/lib/note-dates.mjs）。

import { execSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { SELECTED } from '../src/lib/kb.mjs';
import { DATES_FILE, parseGitLog } from '../src/lib/note-dates.mjs';

const REPO = 'https://github.com/Mr-Salticidae/knowledge-base.git';
const DIR = 'kb-content';

// 「成为 Prompt 大师」系列：独立仓库、自包含画廊。克隆到缓存后镜像进 public/prompt-master/，
// 作为站点静态独立版块直接托管（/prompt-master/）。缓存与产物均 gitignore，.git 不进 public。
const SERIES_REPO = 'https://github.com/Mr-Salticidae/becoming-a-prompt-master.git';
const SERIES_CACHE = path.join('.cache', 'prompt-master');
const SERIES_PUB = path.join('public', 'prompt-master');

// 精选发布白名单单一真相源在 src/lib/kb.mjs 的 SELECTED（仓库维护/代码/对外分发 暂不发）

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

const isShallow = (dir) => {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim() === 'true';
  } catch {
    return true;
  }
};

function ensureContent() {
  // 旧版脚本留下的浅克隆没有历史，导不出日期：整个删掉重来（kb-content 只是缓存）
  if (fs.existsSync(path.join(DIR, '.git')) && !isShallow(DIR)) {
    console.log('[sync] 已存在 kb-content，执行 git fetch …');
    run(`git -C ${DIR} fetch --filter=blob:none origin HEAD`);
    run(`git -C ${DIR} reset --hard FETCH_HEAD`);
  } else {
    if (fs.existsSync(DIR)) fs.rmSync(DIR, { recursive: true, force: true });
    console.log('[sync] 部分克隆 knowledge-base（全量历史、按需取文件）…');
    run(`git clone --filter=blob:none ${REPO} ${DIR}`);
  }
}

// 从 git 历史导出「路径 → 首次提交 / 最后改动」，写到 DATES_FILE 供构建期读取。
// --no-renames：改名检测要比对文件内容，会在部分克隆里触发逐个下载旧版本；
// 改过名的笔记因此从改名那天算起，可以接受（文件名带日期的以文件名为准）。
// 失败不阻断同步：没有这份文件，页面只是少显示日期。
function exportDates() {
  try {
    const log = execFileSync(
      'git',
      ['-C', DIR, 'log', '--format=%x01%aI', '--name-only', '--no-renames', '-z', 'HEAD', '--', ...SELECTED],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    const files = parseGitLog(log);
    fs.mkdirSync(path.dirname(DATES_FILE), { recursive: true });
    fs.writeFileSync(DATES_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), files }));
    console.log(`[sync] 笔记日期已导出：${Object.keys(files).length} 个路径 → ${DATES_FILE}`);
  } catch (e) {
    console.warn(`[sync] 导出笔记日期失败（页面将退回文件名日期）：${e.message}`);
  }
}

// 拉取「成为 Prompt 大师」系列到缓存，再镜像进 public/prompt-master/（排除 .git）。
// 增量：缓存已存在则 fetch+reset；CI：浅克隆。镜像每次重建，保证删期也能同步。
function ensureSeries() {
  if (fs.existsSync(path.join(SERIES_CACHE, '.git'))) {
    console.log('[sync] 已存在 prompt-master 缓存，执行 git pull …');
    run(`git -C ${SERIES_CACHE} fetch --depth 1 origin HEAD`);
    run(`git -C ${SERIES_CACHE} reset --hard FETCH_HEAD`);
  } else {
    if (fs.existsSync(SERIES_CACHE)) fs.rmSync(SERIES_CACHE, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(SERIES_CACHE), { recursive: true });
    console.log('[sync] 浅克隆 becoming-a-prompt-master …');
    run(`git clone --depth 1 ${SERIES_REPO} ${SERIES_CACHE}`);
  }
  // 镜像到 public/：清空旧产物后整盘复制，排除 .git（不可外泄到 dist）。
  if (fs.existsSync(SERIES_PUB)) fs.rmSync(SERIES_PUB, { recursive: true, force: true });
  fs.cpSync(SERIES_CACHE, SERIES_PUB, {
    recursive: true,
    filter: (src) => !/[\\/]\.git([\\/]|$)/.test(src),
  });
  console.log('[sync] prompt-master 已镜像 →', path.resolve(SERIES_PUB));
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// 从原始 frontmatter 文本里宽容地抽出 tags（兼容 inline [a, b] 与 block - a 两种写法）
function extractTags(block) {
  const inline = block.match(/^tags:\s*\[(.*)\]\s*$/m);
  if (inline) {
    return inline[1].split(',').map((s) => s.trim()).filter(Boolean);
  }
  const m = block.match(/^tags:\s*$/m);
  if (m) {
    const after = block.slice(m.index + m[0].length).split('\n');
    const tags = [];
    for (const line of after) {
      const item = line.match(/^\s*-\s*(.+?)\s*$/);
      if (item) tags.push(item[1].replace(/^["']|["']$/g, ''));
      else if (line.trim() !== '') break;
    }
    return tags;
  }
  return [];
}

// 归一化 frontmatter：knowledge-base 用 Obsidian 风味 frontmatter（值里可能含 [[]]、未引号冒号等
// 非法 YAML）。平台只消费 tags / title，故重建为最小安全 YAML，丢弃其余专有键，杜绝解析崩溃。
function normalizeFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return text;
  const block = text.slice(3, end);
  const rest = text.slice(end + 4);

  const tags = extractTags(block);
  const titleMatch = block.match(/^title:\s*(.+?)\s*$/m);

  let fm = '---\n';
  if (tags.length) fm += 'tags:\n' + tags.map((t) => `  - ${JSON.stringify(t)}`).join('\n') + '\n';
  if (titleMatch) fm += `title: ${JSON.stringify(titleMatch[1].replace(/^["']|["']$/g, ''))}\n`;
  fm += '---';
  return fm + rest;
}

// 读 → 去 BOM → 归一化 frontmatter → 写回。返回是否改动。
function sanitize(file) {
  const original = fs.readFileSync(file, 'utf8');
  const next = normalizeFrontmatter(stripBom(original));
  if (next !== original) {
    fs.writeFileSync(file, next, 'utf8');
    return true;
  }
  return false;
}

function walkMd(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walkMd(full, acc);
    else if (name.toLowerCase().endsWith('.md')) acc.push(full);
  }
  return acc;
}

function clean() {
  let changed = 0;
  let total = 0;
  for (const top of SELECTED) {
    for (const f of walkMd(path.join(DIR, top))) {
      total++;
      if (sanitize(f)) changed++;
    }
  }
  console.log(`[sync] 清洗完成：${total} 篇，归一化 frontmatter / 去 BOM ${changed} 处。`);
}

ensureContent();
exportDates();
clean();
console.log('[sync] 内容就绪 →', path.resolve(DIR));

ensureSeries();
