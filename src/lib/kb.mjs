// 构建期扫描 kb-content，产出三样东西供全站使用：
//   1. SELECTED        精选发布的顶层目录白名单
//   2. buildLinkMap()  wikilink 目标（文件名 stem）→ slug 映射（给 remark 插件解析内链）
//   3. 工具函数        slug ↔ 路径 ↔ 标题
import fs from 'node:fs';
import path from 'node:path';
import { slugify } from './slug.mjs';

export const KB_DIR = 'kb-content';

export const SELECTED = [
  '04_方法论与洞察',
  '03_prompt模板库',
  '01_sref档案',
  '02_参数行为档案',
  '05_视觉系统',
  '07_skill存档',
  '09_平台工程',
];

// 顶层目录 → 人类可读的栏目名（去掉数字前缀）
export function categoryLabel(top) {
  return top.replace(/^\d+_/, '');
}

function walkMd(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkMd(full, acc);
    else if (name.toLowerCase().endsWith('.md')) acc.push(full);
  }
  return acc;
}

// 列出所有精选 md 的 { rel, slug, stem }
export function listNotes() {
  const notes = [];
  for (const top of SELECTED) {
    for (const full of walkMd(path.join(KB_DIR, top))) {
      const rel = path.relative(KB_DIR, full).split(path.sep).join('/');
      notes.push({ rel, slug: slugify(rel), stem: path.basename(full).replace(/\.md$/i, ''), top });
    }
  }
  return notes;
}

// 文件名 stem → slug（wikilink 解析用）。同名取第一个。
export function buildLinkMap() {
  const map = new Map();
  for (const n of listNotes()) {
    if (!map.has(n.stem)) map.set(n.stem, n.slug);
  }
  return map;
}
