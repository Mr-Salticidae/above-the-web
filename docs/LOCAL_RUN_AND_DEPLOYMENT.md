最后更新：2026-07-29

# 本地运行与部署说明

本文说明「蛛网之上」主站及其账号/任务服务的本地运行、构建与生产部署方式。

## 1. 项目组成

项目由两部分组成：

- **静态主站**：Astro 5，源码位于 `src/`，构建产物输出到 `dist/`。
- **账号与任务 API**：Node.js + `node:sqlite`，源码位于 `platform/server/`，默认监听 `127.0.0.1:3200`。

日常查看页面、修改样式或编辑静态内容，只需运行静态主站。只有调试登录、注册、任务认领、管理后台等动态功能时，才需要同时启动 API。

## 2. 环境要求

- Node.js 22（仓库的 `.nvmrc` 已固定为 `22`）
- npm
- Git
- 能访问 GitHub（完整内容同步会克隆两个公开仓库）

首次进入项目目录后安装依赖：

```powershell
npm ci
```

`npm ci` 会严格按照 `package-lock.json` 安装依赖，适合新环境和持续集成。修改过依赖清单时再使用 `npm install`。

## 3. 本地运行静态主站

### 3.1 完整启动

在仓库根目录执行：

```powershell
npm run dev
```

该命令会先运行 `npm run sync`，然后启动 Astro 开发服务器。同步过程会：

1. 将公开知识库 `Mr-Salticidae/knowledge-base` 克隆或更新到 `kb-content/`；
2. 清洗站点需要的 Markdown frontmatter；
3. 将 `Mr-Salticidae/becoming-a-prompt-master` 同步到缓存，并镜像到 `public/prompt-master/`。

启动后按终端显示的地址访问，默认通常为：

```text
http://localhost:4321/above-the-web/
```

### 3.2 跳过内容同步

如果 `kb-content/` 和 `.cache/prompt-master/` 已经同步过，或当前网络无法访问 GitHub，可直接执行：

```powershell
npm run dev:nosync
```

该方式只启动 Astro，不刷新外部内容。

## 4. 本地运行账号与任务 API

先打开一个新的终端：

```powershell
Set-Location platform/server
npm run dev
```

本地开发默认配置已经包含以下行为：

- API 地址：`http://127.0.0.1:3200/api/`
- SQLite 文件：`platform/server/data/atw.sqlite`
- 允许来自 `http://localhost:4321` 和 `http://127.0.0.1:4321` 的请求
- 首次启动会创建管理员账号

默认管理员密码仅用于本地调试。若要显式配置本地环境，可复制示例文件：

```powershell
Copy-Item .env.example .env
```

然后将 `.env` 中的生产路径和域名改为本地值，至少建议调整：

```dotenv
ATW_MODE=development
ATW_HOST=127.0.0.1
ATW_PORT=3200
ATW_DB_PATH=./data/atw.sqlite
ATW_TASKS_MANIFEST=../../dist/tasks/index.json
ATW_SITE_URL=http://localhost:4321
ATW_ADMIN_PASSWORD=请换成仅供本地使用的密码
```

服务本身不会自动读取 `.env`。编辑完成后，使用 Node.js 的 `--env-file` 参数启动：

```powershell
node --env-file=.env --watch src/server.js
```

不需要自定义配置时，直接运行前述 `npm run dev` 即可使用代码内置的开发默认值。`.env` 含敏感信息，不得提交到 Git。

如果要让 API 读取最新的任务清单，先在仓库根目录执行一次 `npm run build`，生成 `dist/tasks/index.json`。

## 5. 本地构建与预览

在仓库根目录执行生产构建：

```powershell
npm run build
```

构建流程依次完成内容同步、静态资源版本戳、Astro 构建和 Pagefind 搜索索引生成，最终产物位于 `dist/`。

预览构建结果：

```powershell
npm run preview
```

默认构建目标是 GitHub Pages 项目站：

- `SITE_URL=https://mr-salticidae.github.io`
- `BASE_PATH=/above-the-web`

若要在本地模拟自定义域名根路径部署，可在 PowerShell 中执行：

```powershell
$env:SITE_URL = "https://tiaozhuxiansheng.com"
$env:BASE_PATH = "/"
npm run build
Remove-Item Env:SITE_URL
Remove-Item Env:BASE_PATH
```

## 6. 静态主站部署

静态站部署由 `.github/workflows/deploy.yml` 自动完成。以下事件会触发工作流：

- 推送到 `main`；
- 在 GitHub Actions 中手动运行；
- 知识库发送 `repository_dispatch`，事件类型为 `kb-updated`；
- 每 6 小时执行一次定时同步。

### 6.1 GitHub Pages

工作流会执行：

```bash
npm ci
npm run build
```

随后上传 `dist/` 并部署到 GitHub Pages。仓库需要在 GitHub 的 **Settings → Pages** 中选择 **GitHub Actions** 作为发布源。

Pages 地址为：

```text
https://mr-salticidae.github.io/above-the-web/
```

### 6.2 自定义域名服务器

同一工作流还会使用以下环境变量重新构建根路径版本：

```dotenv
SITE_URL=https://tiaozhuxiansheng.com
BASE_PATH=/
```

构建后，工作流会补充外部镜像和下载资源，再通过 `rsync` 将 `dist/` 同步到：

```text
43.128.2.172:/var/www/tiaozhuxiansheng/
```

GitHub 仓库必须配置 Actions Secret：

| Secret | 用途 |
| --- | --- |
| `HK_SSH_KEY` | 登录香港服务器并执行 `rsync` 的 SSH 私钥 |

`GITHUB_TOKEN` 由 GitHub Actions 自动提供，用于读取 Release 资源，无需手工创建。

服务器侧需要预先配置 nginx，使 `tiaozhuxiansheng.com` 的站点根目录指向 `/var/www/tiaozhuxiansheng/`，并将 `/api/` 反向代理到 `127.0.0.1:3200`。

### 6.3 「AIGC 快讯」子域名

同一工作流还会执行 `node scripts/build-news-site.mjs`，把快讯板块单独打成以子域名根为 base 的产物 `dist-news/`，并 `rsync` 到同一台服务器的独立目录：

```text
43.128.2.172:/var/www/atw-news/
```

该目录与主站 `/var/www/tiaozhuxiansheng/` 互不重叠，两处 `rsync --delete` 各自只清自己那份。

站点地址：

```text
https://news.tiaozhuxiansheng.com/
```

服务器侧需要一次性配置（CI 不代劳，见 `platform/deploy/nginx-news.conf` 的头部说明）：

1. DNS 添加 A 记录 `news` → `43.128.2.172`，并确认解析已生效；
2. 将 `platform/deploy/nginx-news.conf` 写入 `/etc/nginx/sites-available/` 并软链到 `sites-enabled/`；
3. 运行 `certbot --nginx -d news.tiaozhuxiansheng.com --agree-tos -m <邮箱> --redirect` 申请证书。

主站 `/news/` 与 Pages 镜像继续保留，页面 canonical 统一指向子域名。本地验证打包结果：

```powershell
node scripts/build-news-site.mjs
```

## 7. API 服务部署

API 的自动部署工作流位于 `.github/workflows/deploy-platform.yml`。以下情况会触发：

- `main` 分支中的 `platform/**` 发生变化；
- 部署工作流本身发生变化；
- 在 GitHub Actions 中手动运行。

部署前会先执行：

```bash
cd platform/server
node --test test/*.test.js
```

测试通过后，工作流使用 `HK_SSH_KEY` 将 `platform/` 同步到服务器。首次部署会运行：

```bash
bash /tmp/atw-platform-src/deploy/setup-server.sh
```

安装脚本会创建服务账号、目录、systemd 服务和初始环境文件。后续部署会更新 `/opt/atw-platform/`，重启 `atw-platform`，并访问本机 `/api/meta` 完成健康检查。

生产环境的关键文件和目录为：

```text
/opt/atw-platform/server/.env
/var/lib/atw-platform/atw.sqlite
/var/www/tiaozhuxiansheng/tasks/index.json
```

首次部署后，应登录服务器检查并修改 `/opt/atw-platform/server/.env`，尤其是：

- `ATW_ADMIN_PASSWORD`：必须改为强密码；
- `ATW_CORS_ORIGINS`：只保留实际允许的站点来源；
- `ATW_SITE_URL`：保持为用户实际访问的域名；
- `ATW_MAIL_API_KEY`：只有发信域名验证完成后才能填写；
- `ATW_MAIL_FROM`：必须使用已验证域名下的发件地址。

修改配置后重启并检查服务：

```bash
systemctl restart atw-platform
systemctl status atw-platform
curl -fsS http://127.0.0.1:3200/api/meta
```

更完整的 API 架构、首次安装、nginx、邮件和运维说明见 `platform/README.md`。

## 8. 发布前检查

提交部署前建议依次执行：

```powershell
npm run build
Set-Location platform/server
node --test test/*.test.js
```

确认以下事项：

- 静态构建成功，`dist/` 已生成；
- `dist/tasks/index.json` 存在；
- API 测试全部通过；
- `.env`、数据库、SSH 私钥等敏感文件未进入 Git；
- GitHub Actions 所需的 `HK_SSH_KEY` 已配置；
- GitHub Pages 发布源已设为 GitHub Actions。

## 9. 常见问题

### 内容同步失败

`npm run dev` 和 `npm run build` 都会访问 GitHub。先检查网络和 Git；若本地已有同步内容，开发时可临时使用 `npm run dev:nosync`。

### 页面路径或静态资源出现 404

检查构建目标是否匹配部署位置：

- GitHub Pages 项目站使用 `BASE_PATH=/above-the-web`；
- 自定义域名根目录使用 `BASE_PATH=/`。

### 静态页面正常，但登录或任务操作失败

确认 API 服务正在运行、nginx 已代理 `/api/`，并检查浏览器请求来源是否包含在 `ATW_CORS_ORIGINS` 中。

### 忘记密码邮件没有发出

不要在发信域名验证完成前填写 `ATW_MAIL_API_KEY`。未配置邮件服务时，系统会自动退回管理员生成一次性重置链接的流程。
