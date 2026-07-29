// 笔记的分栏结构：栏目 → 子栏目 → 篇目。
//
// 首页要的是「每栏多少篇 + 一句话定位」，/notes/ 要的是完整分区，
// 两边共用这一份——计数各算各的迟早对不上。
import { SELECTED, categoryLabel } from './kb.mjs';
import { getTitle, getCategory, getSubCategory, getExcerpt } from './notes.mjs';

// 栏目一句话定位，给每个分区一点编辑性引导
export const NOTE_CATEGORY_DESC = {
  '方法论与洞察': '可复用的创作心法、审美判断与踩坑记录。',
  'prompt模板库': '可直接套用的提示词模板与案例复盘。',
  'sref档案': '风格参考码（sref）的实测与归档。',
  '参数行为档案': '模型参数的行为规律与边界实验。',
  '视觉系统': 'IP 视觉系统与世界观设定。',
  'skill存档': 'AIGC 创作技能包（Skill）的存档与说明，按技能分簇。',
  '平台工程': '搭建与维护本站及内容平台的工程方法、架构模式与踩坑——这个站怎么做出来的。',
};

export function groupNotes(notes) {
  const cats = SELECTED.map(categoryLabel);
  const counts = Object.fromEntries(cats.map((c) => [c, 0]));
  // 栏目 → 子栏目（保序）→ 计数
  const subOf = Object.fromEntries(cats.map((c) => [c, new Map()]));

  const items = notes.map((n) => {
    const cat = getCategory(n);
    const sub = getSubCategory(n);
    if (cat in counts) counts[cat] += 1;
    if (sub && subOf[cat]) subOf[cat].set(sub, (subOf[cat].get(sub) || 0) + 1);
    return { id: n.id, title: getTitle(n), excerpt: getExcerpt(n), cat, sub };
  });
  items.sort(
    (a, b) =>
      a.cat.localeCompare(b.cat, 'zh') ||
      (a.sub || '').localeCompare(b.sub || '', 'zh') ||
      a.title.localeCompare(b.title, 'zh'),
  );

  // 每栏目 → 无子类的散篇(loose) + 各子类簇(subs)，均按 SELECTED 顺序
  const groups = cats.map((cat) => {
    const catItems = items.filter((i) => i.cat === cat);
    return {
      cat,
      count: counts[cat],
      desc: NOTE_CATEGORY_DESC[cat] || '',
      loose: catItems.filter((i) => !i.sub),
      subs: [...subOf[cat].keys()].map((name) => ({
        name,
        items: catItems.filter((i) => i.sub === name),
      })),
    };
  });

  // 子栏目数据交给 /notes/ 的前端脚本驱动二级筛选条
  const subsByCat = Object.fromEntries(
    cats.map((c) => [c, [...subOf[c].entries()].map(([name, n]) => ({ name, n }))]),
  );

  return { cats, counts, items, groups, subsByCat, total: items.length };
}
