// 把指向「不存在的本地文件」或「模板占位符」的 markdown 图片中性化为文本，
// 避免 Astro 图片解析在构建期抛 ImageNotFound（kb-content 来自外部仓库，
// 含模板占位图如 {{主题}}_原图.png，且部分图片资源未随仓库提供）。
import { visit } from 'unist-util-visit';
import fs from 'node:fs';
import path from 'node:path';

const isExternal = (u) => /^(https?:)?\/\//i.test(u) || u.startsWith('data:') || u.startsWith('#');
const isTemplate = (u) => /\{\{|\{%|\$\{|<%/.test(u);

export function remarkSafeImages() {
  return (tree, file) => {
    const src = file?.path || file?.history?.[0];
    const dir = src ? path.dirname(src) : (file?.cwd || process.cwd());

    visit(tree, 'image', (node, index, parent) => {
      const url = (node.url || '').trim();
      if (!url || isExternal(url) || parent == null || typeof index !== 'number') return;

      let missing = isTemplate(url);
      if (!missing) {
        try {
          const clean = decodeURIComponent(url.replace(/^<|>$/g, '').split(/[?#]/)[0]);
          const abs = path.isAbsolute(clean) ? clean : path.resolve(dir, clean);
          missing = !fs.existsSync(abs);
        } catch {
          missing = true;
        }
      }

      if (missing) {
        const alt = (node.alt || node.title || '').trim();
        parent.children[index] = { type: 'text', value: alt ? `（图：${alt}）` : '' };
      }
    });
  };
}
