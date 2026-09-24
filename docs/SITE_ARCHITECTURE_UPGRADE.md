最后更新：2026-09-24

# 站点架构升级说明（2026-09）

本文记录「蛛网之上」这一轮架构升级：对标一线技术博客与数字花园，补齐了哪些能力、各自落在哪个文件、为什么这么做，以及部署侧需要做的一次性配置。

## 1. 目标与边界

对标对象是当下做得最好的一批个人博客与内容站：它们的共同点不在视觉，而在「底座」——内容有时间线、每页都能被搜索引擎和 AI 读懂、能被订阅、切页快且顺、长文有目录与锚点、搜索只搜正文。

升级严守 README 里的三条硬约束：

- **不加统计脚本、不加广告。** 本轮没有任何埋点。
- **静态优先。** 新增能力全部在构建期生成（Feed、Sitemap、结构化数据、相关笔记、阅读时长），运行时脚本只做渐进增强。
- **国内直连。** 不引入任何第三方 CDN、Web 字体或外部服务；**零新增 npm 依赖**（Sitemap、Feed 都是自写的几十行纯函数）。

## 2. 能力一览

| 能力 | 一线博客的通行做法 | 本站实现 | 主要文件 |
| --- | --- | --- | --- |
| 内容时间线 | 每篇文章有发布 / 更新日期 | 从知识库 git 历史派生，文件名日期优先 | `scripts/sync-content.mjs`、`src/lib/note-dates.mjs` |
| 规范地址 | 镜像站回指主站 | 每页 canonical 默认回指主站同路径 | `src/components/SEO.astro`、`src/lib/site.mjs` |
| 社交卡片 | Open Graph / Twitter Card | 全站 OG + 默认分享图 1200×630 | `SEO.astro`、`public/og-default.png` |
| 结构化数据 | JSON-LD | WebSite + Person + BlogPosting / NewsArticle + BreadcrumbList | `src/lib/structured-data.mjs` |
| Sitemap | sitemap.xml 带 lastmod | 构建后从产物 HTML 读 noindex / canonical / 修改时间 | `src/integrations/sitemap.mjs`、`src/lib/sitemap.mjs` |
| 订阅 | RSS / Atom / JSON Feed | 全站、笔记、快讯三份 RSS + 全站 JSON Feed，笔记带全文 | `src/lib/feed.mjs`、`src/lib/feed-items.mjs`、`src/pages/**/rss.xml.js` |
| AI 导读 | llms.txt | 版块介绍 + 每篇笔记一行摘要 + 最近快讯 | `src/pages/llms.txt.js` |
| 爬虫规则 | robots.txt | 全开放，仅挡 `/api/`，指向 sitemap | `src/pages/robots.txt.js` |
| PWA | manifest + 图标 | manifest、192/512/maskable 图标、apple-touch-icon | `src/pages/manifest.webmanifest.js`、`scripts/make-brand-assets.mjs` |
| 文章页 | 目录、锚点、代码复制、阅读时长、相关文章 | 吸顶目录 + 滚动高亮、标题锚点、Shiki 双主题、复制按钮、相关笔记、修订历史 | `src/pages/[...slug].astro`、`src/scripts/article.js`、`src/lib/reading.mjs`、`src/lib/related.mjs` |
| 阅读进度 | 顶部进度条 | CSS 滚动驱动动画，零 JS | `src/styles/global.css` |
| 切页动画 | 视图过渡 | 跨文档 View Transitions（MPA 原生，零 JS） | `src/styles/global.css` |
| 预加载 | 悬停预取 / 预渲染 | Speculation Rules：悬停即预渲染内容页 | `src/layouts/BaseLayout.astro` |
| 404 | 自定义错误页 | 站内搜索 + 最近更新的笔记 | `src/pages/404.astro` |
| 搜索质量 | 只索引正文 | 顶栏、页脚、播放器、文末推荐一律排除出索引 | `data-pagefind-ignore` |
| 可访问性 | 跳到正文、当前栏目标记 | 跳到正文链接、`aria-current`、窄屏栏目导航 | `BaseLayout.astro` |

## 3. 内容时间线

知识库是 Obsidian 仓库，frontmatter 里没有日期，同步时也只保留 `tags` / `title`。日期因此从两处来，优先级从高到低：

1. **文件名打头的 `YYYY-MM-DD`**：作者亲手写的发布日，最可信，按北京时间零点记；
2. **git 历史**：某路径第一次出现的提交记为发布日期，最后一次改动记为更新日期。

`npm run sync` 把克隆方式从 `--depth 1` 浅克隆改成 `--filter=blob:none` 部分克隆：提交和目录树全量拿到（整个仓库历史只有几百 KB），文件内容只按当前版本下载，体积与浅克隆几乎一样，却能 `git log` 出每个文件的首末提交。结果写到 `.cache/kb-dates.json`（已 gitignore），构建期只读这份 JSON，不在每个页面里调 git。

几点约定：

- 旧版脚本留下的浅克隆没有历史，sync 会自动删掉重新克隆（`kb-content/` 本来就是缓存）。
- `git log` 用 `--no-renames`：改名检测要比对内容，会在部分克隆里触发逐个下载旧版本。改过名的笔记因此从改名那天算起；文件名带日期的不受影响。
- 导出失败不阻断同步，页面、Feed、Sitemap 都能容忍没有日期。

日期用在：文章页刊眉「发布于 / 更新于」、文末「最后修订」、`article:*` 元信息、JSON-LD、Sitemap 的 `lastmod`、Feed 的 `pubDate`、笔记页「最近更新」、404 页推荐。

## 4. 分发层

### 4.1 页头（SEO.astro）

- **规范地址**：未显式指定时，一律回指主站 `https://tiaozhuxiansheng.com` 的同路径。Pages 镜像与主站内容一字不差，搜索引擎只收录主站那份。快讯页原有的 canonical 规则不变。
- **Open Graph / Twitter Card**：标题、摘要、地址、分享图；文章页另带 `article:published_time`、`article:modified_time`、`article:section`、`article:tag`。
- **JSON-LD**：每页一个 `@graph`，站点（WebSite）与作者（Person）节点固定出现，文章页再挂 BlogPosting（笔记）或 NewsArticle（快讯单期）与 BreadcrumbList，彼此用 `@id` 引用。序列化时转义 `<`，正文里的 `</script>` 不会提前闭合标签。
- **自动发现**：`<link rel="alternate">` 指向四个订阅源，另有 sitemap、manifest、apple-touch-icon。
- **地址栏配色**：`theme-color` 跟随站内昼夜主题，切换时同步更新。

### 4.2 Sitemap

本地 Astro 集成 `src/integrations/sitemap.mjs`，在 `astro:build:done` 钩子里生成 `sitemap.xml`：

- Astro 生成的页面：读产物 HTML，`noindex` 的跳过，`loc` 用页面自己声明的 canonical，`lastmod` 用 `article:modified_time`。
- `public/` 下的手工落地页（可玩作品、Prompt 大师画廊）：只收顶层目录的 `index.html`，按主站同路径登记。

从产物读而不是另维护路由表，是为了让 sitemap 与页面自己的说法永远一致：新增页面零配置，改成 `noindex` 自动退出。

### 4.3 订阅源

| 地址 | 内容 | 条目 |
| --- | --- | --- |
| `/rss.xml` | 全站：笔记与快讯按时间混排 | 最近 40 条 |
| `/notes/rss.xml` | 笔记，带全文 | 最近 30 篇 |
| `/news/rss.xml` | 快讯，一期一条，正文是当期全部条目 | 最近 30 期 |
| `/feed.json` | 与 `/rss.xml` 同一批条目的 JSON Feed 1.1 | 最近 40 条 |

- 条目链接一律用主站规范地址：从 Pages 镜像订阅与从主站订阅，阅读器按 guid 去重，不会收到两份。
- 栏目索引页是导航，不推给订阅者。
- 笔记全文取自 Content Layer 渲染好的 HTML：本地图片在那里还是占位符，Feed 里去掉；站内根相对链接改成主站绝对地址。
- 页脚有订阅入口。

### 4.4 robots.txt 与 llms.txt

- `robots.txt`：全站开放抓取，只挡 `/api/`。账号、管理台页面不在这里 Disallow——它们自带 `noindex`，挡住抓取反而让爬虫看不见 `noindex`。
- `llms.txt`（[llmstxt.org](https://llmstxt.org/) 约定）：给大模型的一页站点导读——站点是什么、版块与篇数、许可与引用方式、每篇笔记一行（标题 + 摘要 + 地址）、最近 14 期快讯。

### 4.5 PWA 与品牌资源

`scripts/make-brand-assets.mjs` 用 Astro 自带的 sharp 把 SVG 栅格化，产物直接入库，不进每次构建：

- `icon-192.png` / `icon-512.png`：与 favicon 同款圆角蛛网；
- `icon-maskable-512.png`：安卓自适应图标，满版底色、图案收进安全区；
- `apple-touch-icon.png`：iOS 主屏图标；
- `og-default.png`：社交分享默认卡片。

改了文案或配色重跑一次即可；卡片上的中文依赖本机任一中文字体。

## 5. 阅读体验（笔记文章页）

- **刊眉**：栏目面包屑（笔记 / 栏目 / 子栏目）+ 发布、更新日期 + 阅读时长与字数。阅读时长中文按 400 字 / 分钟、拉丁文按 200 词 / 分钟分别折算，代码块与链接地址不计。
- **目录**：二、三级标题不少于 3 个时出目录。宽屏（≥1180px）在正文右侧吸顶，滚动时高亮当前小节；窄屏收成正文前一颗可折叠的小胶囊。
- **标题锚点**：二至四级标题悬停出现 `#`，点一下复制本节链接。
- **代码块**：Shiki 同时产出 github-light / github-dark 两套配色，按站内主题开关取用（不是按系统偏好）；右上角语言标记与复制按钮。
- **文末**：最后修订日期、「在 GitHub 查看源文件」「修订历史」、许可说明；再往下是反向链接与「接着读」。
- **相关笔记**：构建期打分，不靠向量检索。共享标签按稀有度（IDF）加权——挂了一百多篇的泛标签几乎不加分，只有几篇共享的标签分量很重；同子栏目、正文 wikilink 指向也加分；达不到阈值宁可不推。已在反向链接里的不重复推，栏目索引页不推。
- **阅读进度条**：CSS 滚动驱动动画（`animation-timeline: scroll()`），零 JS；不支持的浏览器不显示。
- **每页都有 h1**：极少数正文没有一级标题的笔记（README / SKILL 这类）由页面补上。
- 所有增强都是渐进式的：没有 JS 时，正文、目录、锚点跳转照常可用。

笔记索引页 `/notes/` 顶部新增「最近更新」六张卡（按 git 最后改动排序），选定具体栏目时自动收起。

## 6. 导航与性能

### 6.1 跨文档视图过渡

`global.css` 里一句 `@view-transition { navigation: auto; }`：同源页面切换时浏览器原生淡入淡出，零 JS，不改变多页站的脚本执行模型。顶栏与播放条各自命名，切页时原地不动。不支持的浏览器照常整页跳转；系统开启「减少动态效果」时关闭。

没有改用 Astro 的 ClientRouter（前端路由）：那会改变每个页面脚本的执行时机（模块脚本只执行一次），全站二十多处页面脚本都要改写成监听 `astro:page-load`，账号、任务、管理台这类依赖 API 的页面风险太大。

### 6.2 Speculation Rules 预渲染

`BaseLayout` 里一段 `<script type="speculationrules">`：鼠标悬停或手指按下约 200ms（`eagerness: moderate`）时，浏览器在后台把目标页完整渲染好，点开即现。Chromium 系支持，其余浏览器忽略这段 JSON。

只预渲染 Astro 生成的内容页，以下一律排除：

- 账号、管理台、任务书、`/api/`：页面一加载就调 API、读登录态，提前跑一遍没有意义还可能串状态；
- `public/` 下的手工作品与 Prompt 大师画廊（构建时自动读取目录名）：有的自带音频与重动画，只在真正点开时加载；
- 带扩展名的资源、新窗口与下载链接、`rel=nofollow` 以及带 `data-no-prerender` 的链接。

**音乐播放器的配合**：播放器靠 localStorage 里的「曲目 / 进度」跨页续播。被预渲染的页面会提前执行脚本，读到的是几秒甚至几十秒前的旧进度。因此播放器在 `document.prerendering` 期间不初始化，等页面真正被激活（`prerenderingchange`）再读状态、接着播。

### 6.3 顶栏高度

吸顶顶栏的实际高度随宽度与换行变化，由一小段脚本用 ResizeObserver 实测后写进 CSS 变量 `--header-h`。笔记页的栏目筛选条、文章目录、锚点跳转留白都以它为准（此前筛选条按固定的 3.85rem 吸顶，实际顶栏有 86px，会被压住一截）。

## 7. 搜索质量

Pagefind 默认索引整个 `<body>`，顶栏导航、页脚、播放器里的字因此出现在每一页。本轮给这些区域加了 `data-pagefind-ignore`（只挡正文索引，`data-pagefind-meta` 与 `data-pagefind-filter` 照常采集），文章页的刊眉、目录、文末推荐也一并排除，避免「接着读」里别的笔记标题让本页命中不相干的查询。

同一份内容、升级前后的命中页数对比：

| 查询 | 升级前 | 升级后 |
| --- | --- | --- |
| 音乐 | 609 | 102 |
| 任务书 | 608 | 75 |
| 蛛网之上 | 188 | 15 |
| GitHub | 610 | 65 |
| Midjourney | 57 | 57 |

知识库 AI 查询依赖的 `type` / `kind` 过滤与 `category` 元信息保持不变（`kind`: note 497 / index 5，`type`: note 502）。

## 8. 可访问性

- 「跳到正文」链接：只在键盘聚焦时出现，落到 `<main id="main">`。
- 顶栏与页脚的当前栏目挂 `aria-current="page"`，并有下划线标记。
- 窄屏（≤860px）不再整排隐藏栏目导航，而是换到顶栏第二行横向滑动；GitHub 链接在 ≤1080px 时收进页脚。

## 9. 三种构建变体的边界

快讯子站（`NEWS_SITE=1`）与 B 站 Toy 包（`TOY_NEWS=1`）只带快讯，统称 STANDALONE。本轮新增的「整站能力」在这两种构建里一律不渲染：

- `SEO.astro` 整段不出（其中几乎每一行都带主站绝对地址，进了子站会破坏对外隔离）；
- Speculation Rules、页脚订阅入口不出；
- Sitemap 不生成；Feed 文件虽在中间产物里，但两个打包脚本只搬 `news/` 下的期刊目录，不会带走。

子站原有的三道守卫（哨兵残留、每页 noindex、无外泄链接）全部照旧通过；另外人工核对了 `content=` 属性与 JSON-LD 里也没有主站地址。

## 10. 部署侧一次性配置

主站 nginx 需要手动接入 `platform/deploy/nginx-site-static.conf` 里的几段（与其他 nginx 片段同一惯例，CI 不代劳）：

1. `error_page 404 /404.html;`：启用自定义 404。GitHub Pages 会自动使用产物根目录的 `404.html`，无需配置。
2. `.webmanifest` 的 MIME 类型：旧版 nginx 不认，会按二进制下发。
3. `/_astro/` 长缓存：产物带内容哈希，可以放心缓存一年。
4. 订阅源、sitemap、llms.txt 的短缓存与 gzip。

CI 无需改动：`deploy.yml` 里的 `npm test` 与 `npm run build` 自动覆盖新增的单元测试与生成步骤。

## 11. 验证方式

- `npm test`：`test/site-architecture.test.mjs` 覆盖 git 日志解析、日期优先级、阅读统计、相关笔记打分、Feed 渲染与转义、Feed 正文清理、Sitemap 条目提取与去重、站点地址拼接、JSON-LD 序列化。
- `npm run build` 之后：`dist/sitemap.xml`、`dist/rss.xml`、`dist/notes/rss.xml`、`dist/news/rss.xml` 可用 `xmllint --noout` 校验；`dist/feed.json` 可用 `JSON.parse` 校验。
- `node scripts/build-news-site.mjs`、`node scripts/build-toy-news.mjs`：独立包守卫必须通过。
- 预渲染：Chrome DevTools →「Application」→「Speculative loads」可看到规则与每次尝试的状态。

## 12. 后续可做

- **逐页分享图**：按每篇标题生成 OG 图。难点是中文字体——要在构建期对思源黑体做子集化后交给 satori / resvg，否则字体文件动辄十几 MB。目前全站共用一张默认卡片。
- **标签页**：知识库的标签是层级式的（`类型/…`、`工具/…`、`主题/…`），可以按前缀出 `/tags/` 目录页。
- **视图过渡的元素级动画**：给笔记卡片与文章标题配对 `view-transition-name`，实现从卡片「飞」进文章的效果。
- **跨页不断播的音乐**：真正做到切页不断音，需要前端路由（ClientRouter + `transition:persist`）并改写全站页面脚本，代价见 6.1。
