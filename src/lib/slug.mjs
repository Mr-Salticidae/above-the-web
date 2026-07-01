// 唯一的 slug 规则：内容集合 generateId、wikilink 解析、路由三处共用，保证一致。
// 输入是相对 kb-content 的路径（含 .md）。输出为「扁平、纯 ASCII」的短 slug：
//   · 保留文件名里可辨识的英文/数字技术词（moodboard、sref、v1…），去掉中文与标点；
//   · 末尾拼 7 位内容哈希（对整条相对路径取 sha1），保证唯一且稳定；
//   · 纯中文（无拉丁词）标题回退前缀 note-。
// 目的：分享链接短、干净、不含中文百分号编码（旧规则整段中文编码后长达 200~300 字符）。
import { createHash } from 'node:crypto';

const LATIN_MAX = 40; // 拉丁词部分限长，避免个别超长英文标题让 slug 再度变冗长

export function slugify(entry) {
  const rel = entry.replace(/\\/g, '/').replace(/\.md$/i, '');
  const stem = rel.split('/').pop() || rel;

  // 连续 ASCII 字母/数字视为一段技术词，其余字符（中文/下划线/空格/标点）作分隔
  let latin = (stem.match(/[a-zA-Z0-9]+/g) || []).join('-').toLowerCase();
  if (latin.length > LATIN_MAX) latin = latin.slice(0, LATIN_MAX).replace(/-+$/, '');

  // 哈希对「整条相对路径」取，跨目录同名文件也不会撞（拉丁词可相同，哈希必不同）
  const hash = createHash('sha1').update(rel).digest('hex').slice(0, 7);

  return latin ? `${latin}-${hash}` : `note-${hash}`;
}
