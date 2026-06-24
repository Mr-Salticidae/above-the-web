import { defineConfig } from 'astro/config';
import { remarkWikilink } from './src/lib/remark-wikilink.mjs';
import { remarkSafeImages } from './src/lib/remark-safe-images.mjs';
import { buildLinkMap } from './src/lib/kb.mjs';

// 站点地址与 base 改为环境变量驱动，一套代码兼容两种部署目标：
//   · GitHub Pages 项目站（默认）：根域 + /above-the-web 子路径
//   · Cloudflare Pages + 自定义域名：在构建环境设 SITE_URL=https://你的域名、BASE_PATH=/
const SITE = process.env.SITE_URL || 'https://mr-salticidae.github.io';
const BASE = process.env.BASE_PATH || '/above-the-web';

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
    // remarkSafeImages 先行：中性化破损/模板图片，避免后续图片解析在构建期报错
    remarkPlugins: [remarkSafeImages, [remarkWikilink, { resolve }]],
  },
});
