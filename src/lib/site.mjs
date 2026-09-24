// 站点级常量与构建变体：站名、作者、规范域名，以及「这次构建产出的是哪一份」。
//
// 同一套源码产出四份东西（见 README「部署」）：
//   · 香港服务器主站 tiaozhuxiansheng.com（BASE_PATH=/）      ← 规范地址（canonical）的唯一来源
//   · GitHub Pages 镜像（BASE_PATH=/above-the-web）          ← 镜像，每页 canonical 回指主站
//   · 快讯子站 news.tiaozhuxiansheng.com（NEWS_SITE=1）       ← 对外隔离，不许出现个人站地址
//   · B 站 Toy 包（TOY_NEWS=1）                               ← 相对路径独立包
// 后两份只带快讯（STANDALONE），SEO 头、Feed、预渲染这些「整站能力」一律不进包，
// 否则要么外泄主站地址、要么指向包里不存在的文件。

export const TOY = process.env.TOY_NEWS === '1';
export const NEWS_SITE = process.env.NEWS_SITE === '1';
export const STANDALONE = TOY || NEWS_SITE;

export const SITE_NAME = '蛛网之上';
export const SITE_NAME_EN = 'Above the Web';
export const SITE_TAGLINE = '跳蛛先生的个人站';
export const SITE_DESCRIPTION = '跳蛛先生的个人站——AIGC 创作笔记、每日快讯、prompt 拆解连载，和一些做着玩的小作品。';
export const SITE_LANG = 'zh-CN';

// 主站是国内直连的主入口；Pages 镜像与主站内容一字不差，搜索引擎只该收录这一份
export const CANONICAL_ORIGIN = 'https://tiaozhuxiansheng.com';

export const AUTHOR = {
  name: '跳蛛先生',
  url: `${CANONICAL_ORIGIN}/about/`,
  sameAs: ['https://github.com/Mr-Salticidae'],
};

export const KB_REPO = 'https://github.com/Mr-Salticidae/knowledge-base';
export const KB_BRANCH = 'main';

// 去掉 base 前缀，得到站内路径（恒以 / 开头）：
//   ('/above-the-web/notes/', '/above-the-web/') → '/notes/'
//   ('/notes/', '/')                             → '/notes/'
export function stripBase(pathname, base) {
  const b = String(base || '/').replace(/\/+$/, '');
  let p = String(pathname || '/');
  if (b && (p === b || p.startsWith(`${b}/`))) p = p.slice(b.length);
  return p.startsWith('/') ? p : `/${p}`;
}

// 站内路径 → 主站上的规范绝对地址。path 不带 base（'/notes/'、'notes/' 均可）。
export function canonicalUrl(path = '/') {
  const p = String(path).startsWith('/') ? path : `/${path}`;
  return `${CANONICAL_ORIGIN}${p}`;
}
