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
    title: '朱元璋 K线人生',
    tagline: '把七十年帝王生涯，画成一条会跟拍的命运曲线',
    desc: '历史叙事可视化：27 个年龄切片化为 K 线节点，镜头跟随朱元璋从濠州少年走向大明开国。可调播放速度、特写强度、背景与配色，所有数值均为帮助理解趋势的叙事指数。',
    tags: ['历史可视化', '互动叙事', 'Canvas'],
    path: '/zhuyuanzhang-kline/',
    status: '在线可看',
    emoji: '📈',
    accent: '#a43d2f',
    cta: '观看一生 →',
  },
  {
    // 完整 URL：与 /mlr/ 同理，deploy.yml 每次部署时克隆 typhoon-eye 仓库镜像到
    // 香港服务器 /typhoon-eye/（大陆直连），不进 GitHub Pages 产物。
    // 实时数据由页面运行时从 jsDelivr 多镜像拉取，镜像的静态壳不影响数据新鲜度。
    title: '风眼 · Typhoon Eye',
    tagline: '台风实况 + 分级预案，一页看懂、照做即可',
    desc: '台风季常备页：实况面板每 15 分钟更新台风位置、风力与风圈，SVG 路径图逐点可查强度；蓝黄橙红四级预警各配递进式可勾选行动清单，进度自动保存。无台风时预案常备，断网也能降级使用。',
    tags: ['防灾工具', '实时数据', 'vibe coding'],
    path: 'https://tiaozhuxiansheng.com/typhoon-eye/',
    status: '在线可用',
    emoji: '🌀',
    accent: '#3d6b99',
    cta: '打开风眼 →',
  },
  {
    // 完整 URL 而非站内路径：游戏由 deploy.yml 镜像到香港服务器 /mlr/（大陆直连），
    // 不进 GitHub Pages 产物，站内相对路径在 Pages 部署上会 404
    title: '镜像自我 · 人生预演',
    tagline: '如果人生可以预演一次，你会走哪一条路？',
    desc: '互动影游：从七岁巷口的一眼涂鸦出发，一路抉择，走向军人 / 画家 / 赛车手 / 音乐人 / 宇航员五种人生结局。电影质感剧照与动态剧照全程背影叙事，结局生成专属人生报告。BILIBILI WORLD 展台作品的在线版。',
    tags: ['互动影游', '人生预演', 'BW 展台'],
    path: 'https://tiaozhuxiansheng.com/mlr/',
    status: '在线可玩',
    // 🪞 是 Unicode 13.0 新字形，Win10 等旧系统渲染成方框；换全平台通用的 🎭
    emoji: '🎭',
    accent: '#d8b878',
    cta: '开始预演 →',
  },
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