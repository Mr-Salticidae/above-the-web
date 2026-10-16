// Skill 一键下载清单：构建期由 scripts/pack-skills.mjs 写出 src/data/skills.generated.json。
// 清单不存在（没跑 sync、打包失败）时返回空表——页面退化为没有下载按钮，不让构建失败。
import fs from 'node:fs';
import path from 'node:path';

const MANIFEST = path.join('src', 'data', 'skills.generated.json');
let cache = null;

export function loadSkills() {
  if (cache) return cache;
  try {
    const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    cache = { skills: m.skills || [], allZipBytes: m.allZipBytes || 0 };
  } catch {
    cache = { skills: [], allZipBytes: 0 };
  }
  return cache;
}

// 笔记 slug → 所属 Skill（只认 SKILL.md 与同目录 README.md 两页，其余子文档不挂下载卡）
export function skillForNote(slug) {
  return loadSkills().skills.find((s) => s.noteSlug === slug || s.readmeSlug === slug) || null;
}

export function formatBytes(n) {
  if (!n) return '0 KB';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
