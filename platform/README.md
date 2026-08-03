# 站点账号与任务流转服务

蛛网之上的账号系统。**读站永远不需要账号**——快讯、笔记、Prompt 大师、玩具都不拦。
只有认领任务书要登录，因为那头连着报酬和打款，得能把人对上。

线上跑在香港服务器（`43.128.2.172`）的 `/opt/atw-platform/`，nginx 反代 `tiaozhuxiansheng.com/api/`。
零第三方依赖，Node 22.5+ 自带的 `node:sqlite`。

## 为什么这样切

主站是 Astro 静态站（GitHub Pages + 香港 nginx），静态托管跑不了账号系统，
所以账号必须落在服务器上。但也没必要为此把整站改成 SSR——真正会变的只有任务状态。
于是切成两半：

| 归 git 的 markdown | 归数据库的运行时状态 |
| --- | --- |
| 任务书正文、要求、对标素材 | 招募中 / 进行中 / 完工待打款 / 已收官 |
| 标题、报酬、截止时间、发布日期 | 谁申请了、定给谁、交付链接、打款时间 |
| 教程类标杆的收录与推荐语 | 流转记录（谁在什么时候做了什么） |

发任务有两条路：写 `src/data/tasks/*.md` 然后 push，或者在管理台直接新建（见下一节）。
认领和流转一律在站内点，实时生效，不用重新构建。

两边靠一个构建产物对接：`src/pages/tasks/index.json.js` 在构建时把每份任务书的
frontmatter 导出成 `/tasks/index.json`，随 dist 一起 rsync 到服务器；服务每 10 分钟读一次，
把新任务补进库、把改过的标题报酬刷新。**同步只写正文类字段，运行时状态一律不碰。**

markdown 里的 `status` / `taker` 只在任务第一次入库时当初值用。之后 md 里再改也不影响线上——
要改状态请用管理台。md 里删掉的任务会被标记下架（页面不再展示），但认领与打款记录不删。

## 站内新建任务书

发一份任务不该非得开编辑器、改 git、等一轮构建。管理台的「新建任务书」填完就生效：
标题、摘要、报酬、截止时间、正文（markdown），提交即出现在任务书列表，链接后缀留空会自动推一个。
表单上还有「填入模板」（照着现有任务书的七节骨架）和「预览正文」。

这类任务书 `source='web'`，正文存在库里，与 md 那批的区别只有这些：

| | md（`src/data/tasks/*.md`） | 站内新建 |
| --- | --- | --- |
| 正文存在哪 | git，构建期渲染成静态页 | 数据库，浏览器侧渲染 |
| 详情页 | `/tasks/<slug>/` | `/tasks/detail/?slug=<slug>` |
| 列表卡片 | 构建期就在 HTML 里 | `tasks-live.js` 拉 `/api/tasks` 时现拼一张 |
| 改正文 | 改 md 再 push | 管理台点「编辑正文」 |
| 下架 | 删掉 md 文件 | 管理台点「下架」（可再上架） |
| 搜索索引 / 教程类标杆 | 收录 | 不收录（构建时不存在这份内容） |

认领、定人、交付、打款完全走同一套流程和同一张表，两种任务书在这些事情上没有区别。

**正文只认一小撮 markdown**：`##` 标题、有序/无序列表、`>` 引用、`**粗体**`、`` `代码` ``、
代码块、`[文字](链接)`、`![图](图片链接)`、分隔线。渲染器在 `src/scripts/mini-markdown.js`，
一百来行，先转义再拼 HTML，`javascript:` 一类链接当普通文本落地。表格和脚注这些没做——
写到那个份上，本来就该落成 git 里的 md。

## 说人话就能发任务、接任务

发一份任务书要填七个小节，接一份任务要在空白框里写自荐——这两件事都卡在「面对空框不知道写什么」。
所以两处各加了一个 AI 帮手：**说一句大白话，它把表单填好，你过一眼再改**。

| 谁 | 在哪 | 说一句 | 得到什么 |
| --- | --- | --- | --- |
| 发布方 | `/admin/tasks/new/` | 「找人写一篇 OJO 的工具评测教程，8 月 20 号前交，150 元税前，会员我出」 | 标题、摘要、报酬、截止日期、链接后缀、七节骨架的正文，全落进表单 |
| 接单的人 | 任务详情页的认领面板 | 「这工具我用过一阵，想按装用坑三段写，下周三前能交」 | 一段按「怎么做 / 做过什么 / 什么时候交」组织好的自荐说明 |

守着的几条线：

- **只填表单，不替人提交。** 生成完东西还在框里，改不改、发不发都是人说了算。
  库里没有任何一条路径是模型直接写进去的。
- **不编事实。** 报酬、截止日期、标杆链接只有发布方知道；做过什么作品、什么时候有空只有申请人知道。
  没说的一律不填，正文里写成「（待补：……）」占位，并在框底下列一条提醒去补。
  凭空给人安一个「做过三十期教程」的履历，发布方一问就穿帮，比空着糟得多。
- **服务端把模型输出当草稿洗一遍**：截到字段上限、日期不合 `YYYY-MM-DD` 就丢掉、
  链接后缀按站内那套规则重新规范化。「模型说了什么」和「什么能落进表单」是两件事。
- **隐私边界照旧。** 送进模型的只有任务书本身、用户的公开资料（昵称 / 简介）和他自己写的那段话。
  联系方式、收款方式、邮箱一概不带——那几项只有本人和发布方看得到，写自荐说明也根本用不上。
- **每个账号每小时 30 次**（`ATW_AI_HOURLY_LIMIT`）。挡的是「不满意就再点一次」点上头，
  超了只堵 AI 这个入口，手填和提交一点不受影响。

接口两条，都要登录：`POST /api/ai/task-draft`（仅发布方）、`POST /api/ai/claim-pitch`（登录即可）。
走 OpenAI 兼容协议的单次结构化输出调用（`response_format.json_schema`），和
`scripts/news-compose.mjs` 一个路子——搜集和校验都是确定性工作，模型只做判断与改写，
一次请求就够，不开 agentic loop。实现在 `src/assist.js`，零第三方依赖。

**没配 `ATW_AI_API_KEY` 就当它不存在**：`/meta` 的 `aiAssist` 变 `false`，
页面上连按钮都不摆出来，手填那条路一点没变——和发信通道一个道理，宁可降级也不因为漏配就 500。
模型那头出岔子回 502 加一句「手填也能发」，对方的原话只进日志。

顺带把「写到一半没了」这件事也堵上：新建任务书和认领申请的输入都随手存在本机
（`localStorage` 的 `atw-draft:*`，14 天过期），离开再回来自动带回，并说清是几时的东西、
留一个「不要，清空」。提交成功就清掉。这一条与 AI 无关，没开 AI 也在。

**想沉淀进 git 就点「导出 md」**：下载一份 `YYYY-MM-DD-<slug>.md`（frontmatter 已经填好），
放进 `src/data/tasks/` 提交即可。下一次同步认出同名 slug，这份任务会自动转成 md 来源，
正文交还给静态页面，**认领、流转、打款记录一条不动**。反过来，同步永远不碰 `source='web'` 的行——
清单里没有它不代表 md 被删了。

## 页面

| 路径 | 谁能看 | 做什么 |
| --- | --- | --- |
| `/account/login/` | 所有人 | 登录；本机存过的账号可免密直接选 |
| `/account/register/` | 所有人 | 注册（关掉注册时只显示一句提示） |
| `/account/forgot/` | 所有人 | 忘记密码：填邮箱收重置信 |
| `/account/reset/?token=` | 拿到链接的人 | 设新密码 |
| `/account/` | 需登录 | 概览与我的认领 / 资料 / 安全（改密码、登录设备、本机账号） |
| `/admin/` | 仅 admin | 概览：待处理申请 / 招募中 / 进行中 / 待打款 四个数字，点得动 |
| `/admin/claims/` | 仅 admin | 待处理申请：定人或标记落选 |
| `/admin/tasks/` | 仅 admin | 任务：改状态、调整报酬；站内新建的还能改正文 / 下架 / 导出 md |
| `/admin/tasks/new/` | 仅 admin | 新建任务书 |
| `/admin/users/` | 仅 admin | 账号：角色、停用、生成一次性重置链接 |
| `/admin/logs/` | 仅 admin | 最近操作 |
| `/tasks/`、`/tasks/<slug>/` | 所有人 | 状态实时注水；登录后可认领；承接人可交付 |
| `/tasks/detail/?slug=` | 所有人 | 站内新建那批任务书的详情页（正文也在运行时渲染） |

管理台一件事一页，共用的只有 `layouts/AdminLayout.astro` 那层壳（标题 + 板块导航 + 权限门禁）。
门禁在 `src/scripts/admin-core.js` 的 `bootAdmin()`，各页 boot 过了才拿得到内容——
但这只是「别把没用的东西摆给人看」，真正的门在接口那边。

登录与注册各自成页，互相只留一个链接——和一线平台一个走法，别把两种心态塞进一个表单。
未登录访问 `/account/` 直接送到登录页，登完带 `next` 回原处。

站点 header 右上角是一个账号菜单：没登录是「登录 / 注册」，登录后是头像 + 昵称，
点开有个人中心、我的认领、管理台（仅 admin）、切换账号、退出登录。不弹窗、不拦路。

## 多账号与会话

浏览器本地可以同时留几个账号的令牌（`localStorage` 的 `atw-sessions`，活跃的只有一个），
切换账号就是换一个令牌，不用重输密码。每个令牌在服务端都是一条独立会话：

- **退出登录**：只吊销当前这一个会话，本机其余账号照旧，别的设备不受影响。
- **退出所有设备**：`POST /api/auth/logout` 带 `{"all": true}`，这个账号所有令牌一起作废。
- **登录设备**：个人中心「安全」列出还有效的会话，可以单独退掉某一处；退掉当前这台等同退出登录。
- **移除**：只把令牌从这台机器上抹掉，不动服务端会话——公用电脑上清干净用它。
- 令牌失效（过期或被别处吊销）时，前端只丢那一个抽屉，不会顺手把别的账号一起登出。

## 自助重置密码

用户在 `/account/forgot/` 填注册邮箱，站里发一封带一次性链接的信；点开 `/account/reset/?token=`
设新密码。链接默认 60 分钟有效（`ATW_RESET_TTL_MINUTES`），**用过即焚，重置成功后这个账号
在所有设备上的登录一并吊销**——会走到重置这一步，通常正是因为号可能不干净了。

几条守着的线：

- **不给探测口子**：邮箱在不在库里、信发没发成功，`POST /api/auth/forgot` 回的都是同一句。
  发信失败只记日志和审计（管理台「最近操作」里的 `auth.reset_request`，`mailed:false`）。
- **不给刷收件箱**：同一个账号一小时最多 3 封，超了静默丢弃；叠加原有的按 IP 限流。
- **同时只有一张票**：新发一张，之前没用过的立刻作废。令牌和会话一样只存 sha256 摘要。
- **停用的账号不发信**，也不给生成链接。

发信走 `src/mailer.js`，目前接 Resend——一个 `fetch` POST 就完事，不引第三方 SDK。
要换别家（阿里云邮件推送等）在那个文件里加一个分支即可，`send()` 的形状不变。

**开通顺序不能反**（2026-07-28 踩过）：

1. `resend.com/domains` 加 `tiaozhuxiansheng.com`，拿到 DKIM / SPF / MX 三条记录；
2. 本域 NS 在 `dns23/24.hichina.com`，记录加在**阿里云云解析**，等状态变 Verified
   （逐字段的操作手册见 [deploy/resend-domain-verify.md](deploy/resend-domain-verify.md)）；
3. 最后才把 `ATW_MAIL_API_KEY` 填进服务器的 `.env` 并 `systemctl restart atw-platform`。

顺序反了的后果很具体：`/meta` 的 `selfServiceReset` 变成 `true`，页面照常说「信已经发出去了」，
而 Resend 那边直接 `403 domain is not verified`——用户永远等不到信，比没有这个功能更糟。
所以域名没验证之前，`ATW_MAIL_API_KEY` 就该留空，让它老实走人工兜底。

用「只允许发信」的受限 key 就够了（它调不了 `/domains` 之类的管理接口，被拖走也只能发信）。

**没配发信通道也不会走死**：`/meta` 的 `selfServiceReset` 会变成 `false`，`/account/forgot/`
自动改口成「找站长人工发」，发布方在管理台每个用户旁边点「重置链接」生成一次性链接，
通过微信/QQ 发给本人——和自助那条走的是同一套令牌。

## 状态机

```text
open 招募中 ──[发布方在管理台点「定给他」]──> taken 进行中
                                                  │
                        [承接人提交成稿链接]────────┘
                                                  ↓
                                          done 完工待打款
                                                  │
                        [发布方标记打款]───────────┘
                                                  ↓
                                            closed 已收官
```

- 定人的同时，同一份任务其余还在排队的申请自动落选，不留「悬着」的状态。
- 承接人自己不能把任务改成已收官——钱有没有到只有发布方知道。
- 发布方可以把任意状态改回 `open`，这会清空承接人和所有时间戳（对方鸽了就是重新招）。
- 每次状态变更都写一条流转记录，任务详情页直接展示。

## 调整报酬

定完人之后临时加钱是常事：报销一份会员费、加急、追加一节内容。这类改动**不走 markdown**——
改 md 既慢（要等一轮构建），又会被下一轮同步覆盖回去。管理台任务页每份任务都有「调整报酬」：

- 「在原价上加」填 `40`，页面当场算给你看：`100 元（税前） → 140 元（税前）`
  （报酬是自由文本，只换掉里面第一个数字，后缀原样留着）；也可以「直接写新报酬」。
- 「事由」会写进流转记录，承接人在任务页看得到——钱变了多少、因为什么，两边都有据可查。
- 「撤销调整」回到任务书里写的那个数。

存的是 `tasks.fee_override` / `fee_note` 两列，属于运行时状态，**同步一律不碰**。
对外接口里 `fee` 永远是「现在到底结多少」，`feeBase` / `feeNote` 是调整前的数与事由；
任务卡片、详情页、承接人的「我的认领」都跟着走同一个值，不会一处 100 一处 140。

导出 md 时写的是**原价**——任务书是任务书，这次结多少是这次的事。

## 隐私边界

- 联系方式、收款方式由用户自己填，**只有本人和发布方看得到**，不进任何公开接口。
- 打款仍走微信手动转账。站内不接支付、不存支付凭证，只记「什么时候标记了打款」。
- 密码走 scrypt + 每账号随机盐；会话令牌只存 sha256 摘要，库被拖走也拿不到可用 token。
- token 存 localStorage、用 `Authorization: Bearer` 发，不用 cookie——天然免疫 CSRF。
- AI 辅助送出去的只有任务书本身、公开资料（昵称 / 简介）和用户自己写的那段话。
  联系方式、收款方式、邮箱不进 prompt——这条在 `test/assist.test.js` 里有一条断言看着。

## 本地开发

```bash
# 1. 先构建一次主站，产出任务清单
npm run build

# 2. 起服务（数据库和清单路径都指到本地）
cd platform/server
ATW_MODE=development \
ATW_DB_PATH=./data/atw.sqlite \
ATW_TASKS_MANIFEST=../../dist/tasks/index.json \
ATW_ADMIN_PASSWORD=local-admin-pw \
ATW_ADMIN_EMAIL=admin@local.test \
node src/server.js

# 3. 另开一个终端起站点
npx astro preview --port 4321
# 访问 http://localhost:4321/above-the-web/
```

前端在 localhost 下会自动把 API 指向 `http://127.0.0.1:3200/api`（见 `src/scripts/account-core.js`）。

**想在本地看 AI 帮手**，起服务时多带三个环境变量即可（不填 key 页面上就没有这块）：

```bash
ATW_AI_API_KEY=... ATW_AI_BASE_URL=https://api.ofox.ai/v1 ATW_AI_MODEL=claude-fable-5
```

不想花钱又要走通整条路，把 `ATW_AI_BASE_URL` 指到一个自己写的假上游就行——
`/chat/completions` 回一个 `choices[0].message.content` 是 JSON 字符串的响应，形状和真的一样。

回归测试：

```bash
cd platform/server && npm test
```

`test/assist.test.js` 管 AI 辅助那条：换一个假助手进去（`deps.assistant`），验「送进 prompt 的有什么、
没有什么」和「模型胡说八道时服务端怎么洗」——超长标题截断、洗不成日期就丢、脏 slug 重新规范化、
联系方式不外泄、配额到顶只堵 AI 不堵认领、没配 key 时接口 503 且 `aiAssist` 为假。

`test/flow.test.js`——真起 http 服务 + 临时 sqlite，把「注册 → 认领 → 定人 → 交付 → 打款 → 打回」
走一遍，顺带验证同步不会覆盖运行时状态，以及多会话那套（一号多处登录、单独踢会话、
退出所有设备、别人的会话 id 踢不动）。站内新建那条也在里面：发布、认领、改正文、下架，
以及「同步不误伤站内任务」「md 补上同名任务书后接管，认领记录不丢」。
调价那条同样有：md 任务书也能调、时间线留痕、同步不覆盖、撤销回原价、「我的认领」跟着变。
CI 里这套不过就不部署。

## 部署

代码更新走 CI（`.github/workflows/deploy-platform.yml`，`platform/**` 有变化时触发）。
首次部署 CI 会自动跑 `deploy/setup-server.sh` 完成安装，初始管理员口令写在服务器的
`/root/atw-platform-first-run.txt`（只有 root 能读）：

```bash
ssh root@43.128.2.172 'cat /root/atw-platform-first-run.txt'
```

**只有 nginx 那一步要手动做一次**（改线上 nginx 不适合让 CI 代劳）：
把 `deploy/nginx-atw-platform.conf` 的内容加进 `tiaozhuxiansheng.com` 的 `server { }` 块，
然后 `nginx -t && systemctl reload nginx`。

⚠️ 里面 `location = /api/maieutic` 那条精确匹配必须保留——`/api/maieutic` 早就归
`api-proxy`（127.0.0.1:3001）管，漏了它 Maieutic 会 404。

验证：

```bash
curl -s https://tiaozhuxiansheng.com/api/meta
```

## 运维

```bash
# 日志
journalctl -u atw-platform -f

# 重启
systemctl restart atw-platform

# 备份数据库（WAL 模式，直接 cp 可能拿到不一致的快照，用 sqlite3 .backup）
sqlite3 /var/lib/atw-platform/atw.sqlite ".backup '/root/atw-$(date +%F).sqlite'"

# 被刷号时临时收口：改 .env 后重启
ATW_REGISTRATION_OPEN=false     # 完全关闭注册
ATW_INVITE_CODE=某个口令         # 或者改成凭邀请码注册
```

数据在 `/var/lib/atw-platform/`，代码在 `/opt/atw-platform/`，重新部署不会碰数据。

### 改 nginx 之前先读这三条

首次接入时踩过，都是本地测不出来的：

1. **备份别放 `sites-enabled/`。** nginx 会加载那个目录下的**所有**文件，不看后缀——备份副本里的 `listen 443` 会和正本撞车（`duplicate listen options for [::]:443`），校验直接失败。备份放 `/root/`。`sites-available/` 里放备份是安全的（不被加载），所以"以前一直这么备份没事"会给人错误的安全感。
2. **确认哪份配置真正生效。** 本站的 `sites-enabled/tiaozhuxiansheng` 是**实体文件不是软链**，而 `sites-available/` 里的同名文件是过期副本（连 `/vacat/` 都没有）。按常规去改 available 会白改一轮，且 `nginx -t` 照样通过。动手前先 `ls -l /etc/nginx/sites-enabled/` 看有没有 `->`。
3. **远程手工操作给单行命令。** 带 `if/else` 的多行脚本粘进远程终端会被粘连成一个字符串，输出错乱到看不出真实原因。一条一条来，每条都能独立看到结果。

配置片段每次部署会同步到 `/opt/atw-platform/deploy/`，改 nginx 时直接从那里取。

### 忘了服务器 root 密码

- 手上还有 root 会话：直接 `passwd`，root 改自己的密码不需要旧密码。
- 完全进不去：腾讯云控制台 → 轻量应用服务器 → 实例 → 重置密码（通常要重启生效）；同页的「登录」是网页 VNC，兜底手段。
- **重置密码不影响自动部署**：CI 走的是 `HK_SSH_KEY` 那把独立部署密钥（`gh_deploy_hk`），与 root 密码无关。

## 与 VACAT 协作板块的关系

`/vacat/` 是另一套服务（`/opt/vacat-platform/`，端口 3100），有自己的账号库和邀请码，
两边目前互相独立。这套 auth 内核和那边、和 pb-arena 是同构的（`security.js` 一模一样），
将来要合并成单点登录，从这三份同构代码开始收敛最省事。
