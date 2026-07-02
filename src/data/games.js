// 可玩作品清单（首页「可玩 · Plays」区数据源）。
// 新增一个游戏 = 在数组开头加一条；首页卡片会自动出现。
// 字段：
//   title    标题
//   tagline  一句话定位
//   desc     一段简介
//   tags     标签（数组）
//   path     站内路径（放在 public/ 下，如 '/fraud-desk/'）；外链请用完整 http(s) 链接
//   status   状态徽标，如 '在线可玩' / '免费下载' / '开发中'
//   emoji    卡片角标图标
//   accent   该作品的主题色（卡片描边/角标/CTA 用，给每个作品一点自有身份）
//   cta      可选；卡片底部按钮文案，默认 '开始游玩 →'（下载型作品可改成 '了解 · 下载 →'）
export const games = [
  {
    title: 'Maieutic · 助产式对话',
    tagline: '不是给答案，而是帮你找到答案',
    desc: '一个 Socratic 助产式对话工具：通过提问和引导，帮你理清思路、发现盲区、找到自己的答案。支持知识解答、学习探索、情绪反思、创意构思、深度调研五种模式，用加粗标记核心观点。',
    tags: ['对话工具', 'Socratic', '认知引导'],
    path: '/maieutic/',
    status: '在线可用',
    emoji: '🤝',
    accent: '#5f7355',
    cta: '开始对话 →',
  },
  {
    title: '卡点标记器 · BeatTapper',
    tagline: '你选哪些拍，机器精确到毫秒',
    desc: '给剪辑创作者的节奏游戏式打点工具：加载本地音乐，跟着重击按空格，PERFECT / GOOD 判定手感反馈；每个点自动吸附到真实攻击峰，回放闪光+咔哒声检验，导出时间戳直接交给剪辑脚本。音频全程本地处理，不上传。',
    tags: ['剪辑工具', '节奏游戏', '蒙眼剪辑法'],
    path: '/beat-tapper/',
    status: '在线可用',
    emoji: '🥁',
    accent: '#c98a1c',
    cta: '打开工具 →',
  },
  {
    title: '工位池塘 · Desk Pond',
    tagline: '你专注，它钓鱼；你完成计划，它长树',
    desc: '一个安静待在桌面角落的像素小窗：番茄钟 + 任务苗圃 + 水族馆。钓到的鱼真的在缸里游，进度只增不减、漏天不清零。本地存档，免费开源，Windows 双击即用。',
    tags: ['桌面陪伴', '番茄钟', 'vibe coding'],
    path: '/desk-pond/',
    status: '免费下载 · Windows',
    emoji: '🎣',
    accent: '#2f8fa3',
    cta: '了解 · 下载 →',
  },
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