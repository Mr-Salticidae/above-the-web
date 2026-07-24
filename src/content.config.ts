import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { slugify } from './lib/slug.mjs';
import { SELECTED } from './lib/kb.mjs';

// 精选发布白名单：单一真相源是 src/lib/kb.mjs 的 SELECTED，这里只派生 glob 模式
const PATTERNS = SELECTED.map((dir) => `${dir}/**/*.md`);

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

// 任务书：对外发布的合作任务，数据源在本仓库 src/data/tasks/（文件名带日期前缀便于排序，id 去掉前缀作 slug）
const tasks = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/data/tasks',
    generateId: ({ entry }) => entry.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''),
  }),
  schema: (() => {
    // frontmatter 里裸写的 2026-07-20 会被 YAML 解析成 Date，统一收敛成 YYYY-MM-DD 字符串
    const dateStr = z
      .union([z.string(), z.date()])
      .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v));
    return z.object({
      title: z.string(),
      summary: z.string(),
      date: dateStr,
      deadline: dateStr.optional(),
      fee: z.string().optional(),
      status: z.enum(['open', 'taken', 'done', 'closed']).default('open'),
      taker: z.string().optional(),
    }).passthrough();
  })(),
});

export const collections = { notes, tasks };
