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

export const collections = { notes };
