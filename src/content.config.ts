import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { slugify } from './lib/slug.mjs';

// 精选发布白名单（与 src/lib/kb.mjs 的 SELECTED 保持一致）
const PATTERNS = [
  '04_方法论与洞察/**/*.md',
  '03_prompt模板库/**/*.md',
  '01_sref档案/**/*.md',
  '02_参数行为档案/**/*.md',
  '05_视觉系统/**/*.md',
  '07_skill存档/**/*.md',
  '09_平台工程/**/*.md',
];

const notes = defineCollection({
  loader: glob({
    pattern: PATTERNS,
    base: './kb-content',
    generateId: ({ entry }) => slugify(entry),
  }),
  // frontmatter 形态不一（多数仅 tags，部分无 frontmatter），放宽 schema
  schema: z
    .object({
      tags: z.array(z.string()).optional(),
      title: z.string().optional(),
    })
    .passthrough(),
});

export const collections = { notes };
