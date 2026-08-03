最后更新：2026-08-03

# 项目页面地图

本项目使用 Astro 的文件系统路由：`src/pages` 下的文件路径会映射为站点路由。项目配置了 `trailingSlash: 'always'`，因此页面路由统一以 `/` 结尾。

> 路由表中的路径以站点 `base` 之后为准。默认部署时 `base` 为 `/above-the-web`，也可通过 `BASE_PATH` 环境变量改为其他前缀。

| 路由 | 源文件路径 | 用途 |
| --- | --- | --- |
| `/` | `src/pages/index.astro` | 网站首页，聚合 AIGC 快讯、Prompt 大师系列、可玩内容、任务书、协作板块和笔记栏目入口。 |
| `/[...slug]/` | `src/pages/[...slug].astro` | 笔记内容动态路由；构建时从 `notes` 内容集合为每篇笔记生成详情页，并展示标签和反向链接。实际路由由笔记 ID 决定。 |
| `/notes/` | `src/pages/notes/index.astro` | 全部笔记的索引页，支持按栏目和子栏目筛选。 |
| `/news/` | `src/pages/news/index.astro` | AIGC 快讯首页，展示最新一期全文及往期归档。 |
| `/news/[date]/` | `src/pages/news/[date].astro` | AIGC 快讯单期归档页，按日期生成，并提供前后期导航。 |
| `/tasks/` | `src/pages/tasks/index.astro` | 对外合作任务列表，按招募中、进行中、已收官分组，并展示教程标杆。 |
| `/tasks/[slug]/` | `src/pages/tasks/[slug].astro` | Markdown 任务书详情动态路由；构建时从 `tasks` 内容集合按任务 ID 生成页面。 |
| `/tasks/detail/` | `src/pages/tasks/detail.astro` | 站内新建任务的通用详情容器，通过 `?slug=` 在运行时读取并装配任务内容。 |
| `/tasks/spec/` | `src/pages/tasks/spec.astro` | 教程类任务的统一交付规范，包括命名、权限、上传流程和正文模板。 |
| `/tasks/index.json` | `src/pages/tasks/index.json.js` | 给后端同步使用的任务清单 JSON 端点，导出 Git 中任务书的不变量，不是面向访客的页面。 |
| `/account/` | `src/pages/account/index.astro` | 登录后的个人中心，管理资料、任务认领记录、密码、登录设备和账号切换。 |
| `/account/login/` | `src/pages/account/login/index.astro` | 账号登录与本机已有账号选择页面。 |
| `/account/register/` | `src/pages/account/register/index.astro` | 新用户注册页面。 |
| `/account/forgot/` | `src/pages/account/forgot/index.astro` | 忘记密码页面，用于申请一次性密码重置链接。 |
| `/account/reset/` | `src/pages/account/reset/index.astro` | 密码重置落地页，校验令牌后设置新密码。 |
| `/admin/` | `src/pages/admin/index.astro` | 管理台概览，汇总待处理申请和各状态任务数量。 |
| `/admin/claims/` | `src/pages/admin/claims.astro` | 管理任务认领申请，可接受或拒绝申请。 |
| `/admin/logs/` | `src/pages/admin/logs.astro` | 查看最近的管理操作与审计记录。 |
| `/admin/tasks/` | `src/pages/admin/tasks/index.astro` | 管理全部任务的状态、报酬、正文、上下架和 Markdown 导出。 |
| `/admin/tasks/new/` | `src/pages/admin/tasks/new.astro` | 在管理台直接新建任务书，支持说人话交给 AI 拟草稿、Markdown 正文预览与本机草稿留存。 |
| `/admin/users/` | `src/pages/admin/users.astro` | 管理用户角色与启停状态，并可生成一次性密码重置链接。 |

## 技术框架

- 主框架：**Astro 5**（`astro` 依赖版本为 `^5.6.1`）
- 页面形式：Astro `.astro` 组件与文件系统路由
- 内容系统：Astro Content Collections（笔记与任务书）
- 搜索：Pagefind（在生产构建后为 `dist` 生成静态搜索索引）
- 渲染方式：以构建期静态生成为主，账户、任务状态和管理台等功能由浏览器端脚本连接后端 API 动态加载
