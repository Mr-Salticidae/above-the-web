// 可玩作品清单（首页「可玩 · Plays」区数据源）。
// 新增一个游戏 = 在数组开头加一条；首页卡片会自动出现。
// 字段：
//   title    标题
//   tagline  一句话定位
//   desc     一段简介
//   tags     标签（数组）
//   path     站内路径（放在 public/ 下，如 '/fraud-desk/'）；外链请用完整 http(s) 链接
//   status   状态徽标，如 '在线可玩' / '开发中'
//   emoji    卡片角标图标
//   accent   该作品的主题色（卡片描边/角标/CTA 用，给每个作品一点自有身份）
export const games = [
  {
    title: '反诈柜台 · The Fraud Desk',
    tagline: '反诈版《Papers, Please》',
    desc: '你是夜班反诈分析员，每桩限时 25 秒，识破来路不明的短信 / 转账 / 来电——放行还是拦截。200 桩真实改编案件，中英双语，点开即玩。',
    tags: ['反诈科普', 'vibe coding', '中英双语'],
    path: '/fraud-desk/',
    status: '在线可玩',
    emoji: '🕵️',
    accent: '#a72b22',
  },
];
