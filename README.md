# 蛛网之上 · Above the Web

> 跳蛛先生 / Mr-Salticidae 的**个人站**——AIGC 创作笔记、每日快讯、prompt 拆解连载与可玩小作品，杂志风、开源。笔记内容自动同步自 [knowledge-base](https://github.com/Mr-Salticidae/knowledge-base)。

线上地址：`https://mr-salticidae.github.io/above-the-web/`（启用 Pages 后生效）

## 架构

- **Astro**（静态站，SSG）+ 自有 `remark-wikilink` 插件渲染 Obsidian 双链
- 内容源：构建时浅克隆 `knowledge-base`，仅取 v1 精选目录（见 `src/lib/kb.mjs` 的 `SELECTED`）
- 搜索：Pagefind（静态全文，零后端）
- 部署：GitHub Pages + Actions
- 账号与任务流转：`platform/`（Node + node:sqlite，跑在香港服务器，见下）

## 本地开发

```bash
npm install
npm run dev        # 自动 sync 内容后启动 dev server
```

`npm run sync` 会把 `knowledge-base` 克隆到 `kb-content/`（已 gitignore），并清洗 frontmatter BOM。

## 自动同步

平台在以下时机重建部署：① 本仓库 push；② 每 6 小时定时；③ 手动 workflow_dispatch；④ `knowledge-base` 发来 `repository_dispatch`（type `kb-updated`）。

**开启「knowledge-base 一更新就秒级同步」**（可选，需一次性配置）：
1. 建一个有 `repo` 权限的 PAT，加到 `knowledge-base` 仓库 secret `DISPATCH_TOKEN`。
2. 在 `knowledge-base` 加 workflow，push 时调用本仓库 `repository_dispatch`（event_type `kb-updated`）。
未配置时，定时 + push 已能保证同步，只是不即时。

## 账号与任务书

读站不需要账号——快讯、笔记、Prompt 大师、玩具一律不拦。**只有认领任务书要登录**，
因为那头连着报酬和打款，得能把人对上。

任务书正文仍写在 `src/data/tasks/*.md`（push 即发布），但状态归数据库：认领、定人、
交付、打款在站内点，页面实时生效，不用改 markdown 重新构建。服务代码、状态机、
部署与运维都在 [platform/README.md](platform/README.md)。

登录（`/account/login/`）与注册（`/account/register/`）各自成页，`/account/` 是登录后的个人中心。
顶栏账号菜单里可以切换账号、退出登录——本机能同时留几个账号，切换不用重输密码；
个人中心的「安全」还能看登录设备、单独踢掉某一处或退出所有设备。

忘了密码走 `/account/forgot/`：填注册邮箱收一封带一次性链接的信，链接 60 分钟有效、用过即焚，
重置成功后所有设备一并下线。发信通道在服务端配（见 platform/README.md 的「自助重置密码」），
没配时自动退回「管理台生成链接、站长人工发」。

API 只有一套（自有域名 `tiaozhuxiansheng.com/api/`）。Pages 镜像跨域也能用（CORS 白名单里有
`mr-salticidae.github.io`，令牌走 Bearer 不依赖 cookie），只是两个域的登录态各自独立，
要各登录一次。

## 内容范围

v1 精选发布：方法论与洞察 / prompt模板库 / sref档案 / 参数行为档案 / 视觉系统。`07_skill存档` 暂不发。

许可：内容遵循源仓库 [CC BY-NC 4.0](https://github.com/Mr-Salticidae/knowledge-base/blob/main/LICENSE.md)。
