// 内容同步脚本：把公开知识库 knowledge-base 拉到本地 kb-content/，
// 并清洗 Obsidian 特性带来的解析坑（frontmatter BOM）。
// 本地开发：增量 pull；CI：浅克隆。kb-content/ 已 gitignore。

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = 'https://github.com/Mr-Salticidae/knowledge-base.git';
const DIR = 'kb-content';

// 精选发布白名单（仓库维护/代码/对外分发 暂不发）
const SELECTED = [
  '04_方法论与洞察',
  '03_prompt模板库',
  '01_sref档案',
  '02_参数行为档案',
  '05_视觉系统',
  '07_skill存档',
];

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function ensureContent() {
  if (fs.existsSync(path.join(DIR, '.git'))) {
    console.log('[sync] 已存在 kb-content，执行 git pull …');
    run(`git -C ${DIR} fetch --depth 1 origin HEAD`);
    run(`git -C ${DIR} reset --hard FETCH_HEAD`);
  } else {
    if (fs.existsSync(DIR)) fs.rmSync(DIR, { recursive: true, force: true });
    console.log('[sync] 浅克隆 knowledge-base …');
    run(`git clone --depth 1 ${REPO} ${DIR}`);
  }
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
clean();
console.log('[sync] 内容就绪 →', path.resolve(DIR));
