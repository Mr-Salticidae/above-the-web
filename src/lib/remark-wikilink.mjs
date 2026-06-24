// 自有 wikilink 插件：把 [[目标]] / [[目标|别名]] / [[目标#标题]] 转成内链。
// 解析得到 URL → 渲染为 <a class="wikilink">；解析不到（悬空链接）→ 灰显 <span>，不报错。
import { visit } from 'unist-util-visit';

const PATTERN = /\[\[([^\]]+?)\]\]/g;

export function remarkWikilink({ resolve }) {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index == null || !node.value.includes('[[')) return;

      const value = node.value;
      const out = [];
      let last = 0;
      let m;
      PATTERN.lastIndex = 0;
      while ((m = PATTERN.exec(value)) !== null) {
        if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });

        const raw = m[1];
        const bar = raw.indexOf('|');
        const targetPart = bar === -1 ? raw : raw.slice(0, bar);
        const display = (bar === -1 ? raw : raw.slice(bar + 1)).trim();
        const target = targetPart.split('#')[0].trim();
        const url = resolve(target);

        if (url) {
          out.push({
            type: 'link',
            url,
            data: { hProperties: { className: ['wikilink'] } },
            children: [{ type: 'text', value: display }],
          });
        } else {
          out.push({
            type: 'wikilinkDangling',
            data: {
              hName: 'span',
              hProperties: { className: ['wikilink', 'wikilink--dangling'], title: '尚未发布的笔记' },
              hChildren: [{ type: 'text', value: display }],
            },
            children: [{ type: 'text', value: display }],
          });
        }
        last = m.index + m[0].length;
      }
      if (last < value.length) out.push({ type: 'text', value: value.slice(last) });

      parent.children.splice(index, 1, ...out);
      return index + out.length;
    });
  };
}
