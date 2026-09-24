import { defineConfig } from 'astro/config';
import { remarkWikilink } from './src/lib/remark-wikilink.mjs';
import { remarkSafeImages } from './src/lib/remark-safe-images.mjs';
import { buildLinkMap } from './src/lib/kb.mjs';
import sitemap from './src/integrations/sitemap.mjs';

// 站点地址与 base 改为环境变量驱动，一套代码兼容两种部署目标：
//   · GitHub Pages 项目站（默认）：根域 + /above-the-web 子路径
//   · Cloudflare Pages + 自定义域名：在构建环境设 SITE_URL=https://你的域名、BASE_PATH=/
const SITE = process.env.SITE_URL || 'https://mr-salticidae.github.io';
const BASE = process.env.BASE_PATH || '/above-the-web';

// 构建期建立 wikilink 映射（依赖 sync 已把 kb-content 拉好）
const linkMap = buildLinkMap();
// base 归一化：BASE_PATH=/ 时拼 `${BASE}/${slug}` 会得到 //slug（协议相对 URL，全站内链失效）。
const BASE_PREFIX = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE;
const resolve = (target) => {
  const slug = linkMap.get(target);
  return slug ? `${BASE_PREFIX}/${encodeURI(slug)}/` : null;
};

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  // sitemap.xml：构建后按产物里各页自己声明的 noindex / canonical / 修改时间生成，见 src/integrations/sitemap.mjs
  integrations: [sitemap()],
  markdown: {
    // remarkSafeImages 先行：中性化破损/模板图片，避免后续图片解析在构建期报错
    remarkPlugins: [remarkSafeImages, [remarkWikilink, { resolve }]],
    // 代码高亮跟随站内昼夜主题：Shiki 同时产出两套配色写进 CSS 变量，
    // 由 global.css 按 data-theme 选用（不是按系统偏好，站内主题开关说了算）
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
});
