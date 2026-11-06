// 社交媒体主页：全站「关注我」的唯一数据源。
//
// 首页 hero 下的关注条、关于页「关注与联系」、页脚关注行、结构化数据 Person.sameAs
// 全部从这里读。加一个平台 = 往 socials 里加一行；撤一个 = 删一行。
//
// 字段：
//   key     —— 稳定标识，样式与测试用
//   name    —— 平台名（对外显示）
//   handle  —— 在该平台上的名字
//   url     —— 个人主页地址（必须是主页，不是某条作品）
//   desc    —— 一句话：在这个平台能看到什么
//   primary —— true 的才上首页 hero 关注条（首页只放主阵地，免得喧宾夺主）
//
// 只收录核实过的主页。没有可直达网页主页的平台（如视频号）用 hint 写「怎么搜到」，不填 url。
export const socials = [
  {
    key: 'bilibili',
    name: '哔哩哔哩',
    handle: '跳蛛先生',
    url: 'https://space.bilibili.com/6891496',
    desc: 'AI 短片、角色 PV、原创 MV 与小作品宣传片，最完整的视频合集。',
    primary: true,
  },
  {
    key: 'github',
    name: 'GitHub',
    handle: 'Mr-Salticidae',
    url: 'https://github.com/Mr-Salticidae',
    desc: '公开知识库、本站源码与几件开源小工具。',
    primary: true,
  },
  {
    key: 'netease-music',
    name: '网易云音乐',
    handle: '跳蛛先生',
    url: 'https://music.163.com/#/artist?id=124358911',
    desc: '自己做的歌：《那道题还亮着》《第三阶的秋天》等，可收藏、可单曲循环。',
  },
  // 待补（拿到主页链接后取消注释并填上 url）：
  // { key: 'douyin', name: '抖音', handle: '', url: '', desc: '', primary: true },
  // { key: 'xiaohongshu', name: '小红书', handle: '', url: '', desc: '', primary: true },
  // { key: 'kuaishou', name: '快手', handle: '', url: '', desc: '' },
  // { key: 'channels', name: '微信视频号', handle: '', hint: '微信里搜「…」', desc: '' },
];

// 有可点击主页的条目（结构化数据 sameAs 只认 URL）
export const socialUrls = socials.filter((s) => s.url).map((s) => s.url);
export const primarySocials = socials.filter((s) => s.primary);
