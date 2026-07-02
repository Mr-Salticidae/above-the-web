// 「AIGC 快讯」板块：数据源是本仓库 src/data/news/ 下的按日 JSON（一天一期），
// 由每日定时任务（每早 9:30）搜集写入并 push，构建期在此读取渲染。
//
// 每期 JSON 形态（文件名即日期 YYYY-MM-DD.json）：
// {
//   "date": "2026-07-02",
//   "headline": "一句话概括当天主线（编辑口吻）",
//   "items": [
//     {
//       "title": "中文标题（专有名词保留英文）",
//       "summary": "2-3 句：发生了什么 + 对创作者意味着什么",
//       "category": "模型 | 工具 | 行业 | 研究 | 政策",
//       "source": "来源名称",
//       "url": "https://…",
//       "featured": true   // 每期 1-2 条头条，可省略
//     }
//   ]
// }
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join('src', 'data', 'news');
const DATE_RE = /^(\d{4}-\d{2}-\d{2})\.json$/;

export const CATEGORIES = ['模型', '工具', '行业', '研究', '政策'];

// 读取全部期刊，按日期倒序（最新在前）。单个文件损坏时跳过并告警，不阻断构建。
export function getIssues() {
  if (!fs.existsSync(DIR)) return [];
  const issues = [];
  for (const f of fs.readdirSync(DIR)) {
    const m = f.match(DATE_RE);
    if (!m) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      if (!Array.isArray(raw.items) || raw.items.length === 0) continue;
      issues.push({ date: m[1], headline: raw.headline || '', items: raw.items });
    } catch (e) {
      console.warn(`[news] 跳过损坏的期刊文件 ${f}: ${e.message}`);
    }
  }
  issues.sort((a, b) => b.date.localeCompare(a.date));
  // 期号按时间正序编号（第 1 期最早），倒序数组里反着算
  issues.forEach((it, i) => { it.no = issues.length - i; });
  return issues;
}

export function getLatestIssue() {
  return getIssues()[0] || null;
}

// 「2026-07-02」→「2026 年 7 月 2 日 · 周四」
export function formatDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  const week = '日一二三四五六'[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y} 年 ${m} 月 ${d} 日 · 周${week}`;
}
