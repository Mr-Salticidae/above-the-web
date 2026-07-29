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
| `/admin/` | 仅 admin | 新建任务书、定人、改状态、标打款、管账号、看操作记录 |
| `/tasks/`、`/tasks/<slug>/` | 所有人 | 状态实时注水；登录后可认领；承接人可交付 |
| `/tasks/detail/?slug=` | 所有人 | 站内新建那批任务书的详情页（正文也在运行时渲染） |

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

## 隐私边界

- 联系方式、收款方式由用户自己填，**只有本人和发布方看得到**，不进任何公开接口。
- 打款仍走微信手动转账。站内不接支付、不存支付凭证，只记「什么时候标记了打款」。
- 密码走 scrypt + 每账号随机盐；会话令牌只存 sha256 摘要，库被拖走也拿不到可用 token。
- token 存 localStorage、用 `Authorization: Bearer` 发，不用 cookie——天然免疫 CSRF。

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

回归测试：

```bash
cd platform/server && npm test
```

跑的是 `test/flow.test.js`——真起 http 服务 + 临时 sqlite，把「注册 → 认领 → 定人 → 交付 → 打款 → 打回」
走一遍，顺带验证同步不会覆盖运行时状态，以及多会话那套（一号多处登录、单独踢会话、
退出所有设备、别人的会话 id 踢不动）。站内新建那条也在里面：发布、认领、改正文、下架，
以及「同步不误伤站内任务」「md 补上同名任务书后接管，认领记录不丢」。CI 里这套不过就不部署。

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
