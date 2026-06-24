// 「成为 Prompt 大师」系列：从同步进 public/prompt-master/ 的自包含画廊里抽出 EPISODES 元数据，
// 供首页独立版块展示最新几期封面。源真相是 index.html 里的 EPISODES 数组（合法 JS 字面量）。
import fs from 'node:fs';
import path from 'node:path';

const INDEX = path.join('public', 'prompt-master', 'index.html');

// 读取并解析 EPISODES。文件缺失（未 sync）或解析失败时返回 []，让首页优雅降级、不阻断构建。
export function getEpisodes() {
  if (!fs.existsSync(INDEX)) return [];
  let html;
  try {
    html = fs.readFileSync(INDEX, 'utf8');
  } catch {
    return [];
  }
  const m = html.match(/var\s+EPISODES\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!m) return [];
  try {
    // 数组用未引号键 + 双引号字符串，是合法 JS 字面量；以函数求值，不引入依赖。
    const list = new Function(`return ${m[1]}`)();
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// 取最新 n 期（数组按期数升序，末尾最新），倒序返回供首页"新→旧"展示。
export function getLatestEpisodes(n = 4) {
  const all = getEpisodes();
  return all.slice(-n).reverse();
}
