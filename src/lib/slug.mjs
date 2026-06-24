// 唯一的 slug 规则：内容集合 generateId、wikilink 解析、路由三处共用，保证一致。
// 输入是相对 kb-content 的路径（含 .md），输出是 URL slug（保留中文与 / 层级）。
export function slugify(entry) {
  return entry.replace(/\.md$/i, '').replace(/\s+/g, '-');
}
