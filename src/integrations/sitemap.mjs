// 本地 Astro 集成：构建结束后生成 sitemap.xml。零第三方依赖，规则全在 src/lib/sitemap.mjs。
//
//   · Astro 生成的页面：读产物 HTML，noindex 的跳过，loc 用页面自己声明的 canonical，
//     lastmod 用 article:modified_time（笔记的最后改动、快讯的出刊日）
//   · public/ 下的手工落地页（可玩作品、Prompt 大师画廊）：只收顶层目录的 index.html，
//     它们没有 canonical，按主站同路径登记
//   · 快讯子站 / Toy 包（STANDALONE）不生成：它们只搬快讯目录，sitemap 也不该带主站地址
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSitemap, sitemapEntryFromHtml } from '../lib/sitemap.mjs';
import { STANDALONE, canonicalUrl } from '../lib/site.mjs';

export default function sitemap() {
  return {
    name: 'atw-sitemap',
    hooks: {
      'astro:build:done': ({ dir, pages, logger }) => {
        if (STANDALONE) return;
        const out = fileURLToPath(dir);
        const entries = [];
        const seen = new Set();
        const read = (file) => {
          try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
        };

        for (const { pathname } of pages) {
          const rel = pathname.replace(/^\/+|\/+$/g, '');
          const file = path.join(out, rel, 'index.html');
          seen.add(rel.split('/')[0]);
          const html = read(file);
          if (!html) continue; // 端点（rss.xml 等）与 404.html 没有 index.html
          const entry = sitemapEntryFromHtml(html);
          if (entry) entries.push(entry);
        }

        for (const d of fs.readdirSync(out, { withFileTypes: true })) {
          if (!d.isDirectory() || d.name.startsWith('_') || d.name === 'pagefind' || seen.has(d.name)) continue;
          const html = read(path.join(out, d.name, 'index.html'));
          if (!html || /<meta[^>]+name="robots"[^>]+noindex/i.test(html)) continue;
          entries.push({ loc: canonicalUrl(`/${encodeURI(d.name)}/`), lastmod: null });
        }

        fs.writeFileSync(path.join(out, 'sitemap.xml'), renderSitemap(entries));
        logger.info(`sitemap.xml：${entries.length} 个地址`);
      },
    },
  };
}
