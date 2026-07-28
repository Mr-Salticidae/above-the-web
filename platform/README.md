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

发任务还是写 `src/data/tasks/*.md` 然后 push；认领和流转在站内点，实时生效，不用重新构建。

两边靠一个构建产物对接：`src/pages/tasks/index.json.js` 在构建时把每份任务书的
frontmatter 导出成 `/tasks/index.json`，随 dist 一起 rsync 到服务器；服务每 10 分钟读一次，
把新任务补进库、把改过的标题报酬刷新。**同步只写正文类字段，运行时状态一律不碰。**

markdown 里的 `status` / `taker` 只在任务第一次入库时当初值用。之后 md 里再改也不影响线上——
要改状态请用管理台。md 里删掉的任务会被标记下架（页面不再展示），但认领与打款记录不删。

## 页面

| 路径 | 谁能看 | 做什么 |
| --- | --- | --- |
| `/account/` | 所有人 | 登录 / 注册 / 个人资料 / 我的认领 / 改密码 |
| `/admin/` | 仅 admin | 定人、改状态、标打款、管账号、看操作记录 |
| `/tasks/`、`/tasks/<slug>/` | 所有人 | 状态实时注水；登录后可认领；承接人可交付 |

站点 header 右上角只有一个「登录」入口，登录后变成昵称。不弹窗、不拦路。

## 状态机

```
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
走一遍，顺带验证同步不会覆盖运行时状态。CI 里这套不过就不部署。

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

## 与 VACAT 协作板块的关系

`/vacat/` 是另一套服务（`/opt/vacat-platform/`，端口 3100），有自己的账号库和邀请码，
两边目前互相独立。这套 auth 内核和那边、和 pb-arena 是同构的（`security.js` 一模一样），
将来要合并成单点登录，从这三份同构代码开始收敛最省事。
