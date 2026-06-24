import { defineConfig } from 'astro/config';
import { remarkWikilink } from './src/lib/remark-wikilink.mjs';
import { buildLinkMap } from './src/lib/kb.mjs';

// GitHub Pages 项目站：站点根 + 仓库名 base
const SITE = 'https://mr-salticidae.github.io';
const BASE = '/above-the-web';

// 构建期建立 wikilink 映射（依赖 sync 已把 kb-content 拉好）
const linkMap = buildLinkMap();
const resolve = (target) => {
  const slug = linkMap.get(target);
  return slug ? `${BASE}/${encodeURI(slug)}/` : null;
};

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  markdown: {
    remarkPlugins: [[remarkWikilink, { resolve }]],
  },
});
