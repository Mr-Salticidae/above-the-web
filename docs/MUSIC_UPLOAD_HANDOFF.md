最后更新：2026-09-24

# 交接：把本机的歌一次性上架到音乐板块

本文写给在站长**个人电脑**上运行的 Claude Code 本地会话。云端会话读不到本机硬盘，所以扫描、挑选、上传这几步由你（本地会话）来做；搬上服务器与部署由仓库里现成的工作流完成。照着做即可，遇到拿不准的地方停下来问站长。

## 1. 目标

把 `D:\AIGC工作站` 里站长做过的歌**一次全部**上架到 <https://tiaozhuxiansheng.com/music/>（全站底部播放器同一份曲库）。目前线上只有 1 首《雨里旧信》，它必须保留。

## 2. 你需要知道的背景

- **仓库**：`Mr-Salticidae/above-the-web`（私有）。本机可能还没有克隆；旧文档里的 `E:\above-the-web` 是站长公司电脑的路径，**这台电脑上不存在**。
- **音频不进 git**。文件放在香港服务器 `/var/www/atw-music/audio/`、`covers/`，由 nginx 以 `https://tiaozhuxiansheng.com/music/audio/<文件名>` 提供。
- **曲目清单进 git**：`src/data/music/manifest.json`，构建时导出成 `/music/playlist.json`。字段：

  | 字段 | 必填 | 说明 |
  | --- | --- | --- |
  | `id` | 是 | ASCII 短标识，全清单唯一，如 `yuwen` |
  | `title` | 是 | 中文歌名，页面上显示的就是它 |
  | `artist` | 是 | 默认 `跳蛛先生` |
  | `audio` | 是 | 服务器上的音频文件名，**用 ASCII**，如 `yuwen.mp3` |
  | `cover` | 否 | 服务器上的封面文件名，如 `yuwen.jpg`；没有就省略这个字段 |
  | `duration` | 否 | 秒数，入库工作流会报出来 |
  | `note` | 否 | 一句话简介，风格参考现有的《雨里旧信》 |

- **本机大概率没有服务器 SSH 私钥**，所以不用 `scripts/upload-music.mjs`。改走 GitHub Release 中转：本机把文件传到 Release `music-inbox`，再手动触发工作流 `.github/workflows/music-inbox.yml`。它会用 CI 里的部署密钥把文件搬到服务器，wav / flac / m4a 自动转成 mp3，逐个回查文件大小，核对无误后删掉 Release 里的附件。
- **不要运行 `scripts/music-manifest.mjs`**。它按本机 `music-library/audio/` 重新生成整份清单，本机没有的曲目（例如《雨里旧信》）会被删掉。清单一律**手工追加**。
- `scripts/collect-music.mjs` 可以用来扫描、列候选，但它的 `--apply` 会按中文歌名复制文件，不适合这条流程，只用扫描那一步就行。

## 3. 前置条件

- 装有 git、Node 22、GitHub CLI（`gh`），并已 `gh auth login`，账号对上述仓库有写权限。
- 没有的话先请站长装好或登录，不要改用其他账号。

## 4. 步骤

### 4.1 准备仓库

找一个本机工作目录（问站长放哪里，或用 `D:\code\`）：

```powershell
gh repo clone Mr-Salticidae/above-the-web
cd above-the-web
git pull
```

### 4.2 扫描候选

```powershell
node scripts/collect-music.mjs "D:\AIGC工作站"
```

它会生成 `music-library\candidates.tsv`，每行是「选用 / 歌名 / 源文件 / 封面」。`music-library/` 已被 gitignore。

### 4.3 和站长一起定最终曲目

把候选整理成一张表给站长确认，**确认之前不要上传**：

- **合并重复版本**：同一首歌常有 `(1)`、`_v2`、`-final`、demo / 定稿等多个版本，每首只留一个，拿不准就问。
- **排除非成品**：伴奏、试听片段、别人的参考曲、素材音效等。
- **每首定下四样**：中文歌名 `title`；ASCII `id`（拼音或英文，小写加连字符，不能和现有的 `yulijiuxin` 重复）；源文件；封面。封面取同目录下同名图片，或名字里带 cover / 封面的图片，都没有就留空。
- **起草简介**：每首一句 `note`。可以参考源文件所在文件夹里的歌词、创作记录，拿给站长过目。

### 4.4 整理成 ASCII 文件名并上传到 Release

GitHub 会改写 Release 附件名里的中文与空格，所以上传前统一改名：音频改成 `<id>.<原扩展名>`，封面改成 `<id>.<图片扩展名>`。复制到一个临时目录再改名，**不要动 `D:\AIGC工作站` 里的原文件**。

```powershell
# Release 不存在就先建（预发布版本，仓库私有，外人看不到）
gh release view music-inbox -R Mr-Salticidae/above-the-web 2>$null
if ($LASTEXITCODE -ne 0) {
  gh release create music-inbox -R Mr-Salticidae/above-the-web --prerelease --title "music-inbox" --notes "音乐入库中转，附件由 music-inbox 工作流搬走后自动清理"
}
gh release upload music-inbox <临时目录>\* -R Mr-Salticidae/above-the-web --clobber
```

wav / flac / m4a 可以直接传，工作流会转码；单个附件上限 2 GB。

### 4.5 触发入库工作流

```powershell
gh workflow run music-inbox.yml -R Mr-Salticidae/above-the-web -f cleanup=true
gh run watch -R Mr-Salticidae/above-the-web $(gh run list -R Mr-Salticidae/above-the-web -w music-inbox.yml -L 1 --json databaseId -q '.[0].databaseId')
```

- **成功**：运行摘要里有一张表，列出每个文件和时长（秒），记下来填 `duration`。
- **失败**：看日志里标 ✗ 的文件，修好后重新上传、重跑。失败时 Release 附件不会被清理。

确认音频已经能访问（任意一个即可）：

```powershell
curl -I https://tiaozhuxiansheng.com/music/audio/<id>.mp3   # 应为 200
```

### 4.6 追加曲目清单并提交

**音频落地之后**才改清单，否则上线后会出现点了不能播的歌。在 `src/data/music/manifest.json` 的 `tracks` 数组里，保留《雨里旧信》，在后面追加新曲目。顺序就是播放列表的顺序，问站长要不要按创作时间排。

```json
{
  "id": "yuwen",
  "title": "余温",
  "artist": "跳蛛先生",
  "audio": "yuwen.mp3",
  "cover": "yuwen.jpg",
  "duration": 201,
  "note": "……一句话简介……"
}
```

然后开 PR 合并。合并到 `main` 会自动部署，主站、Pages 镜像都会更新：

```powershell
npm ci
npm test
git switch -c music/add-tracks
git add src/data/music/manifest.json
git commit -m "music: 上架 N 首歌"
git push -u origin music/add-tracks
gh pr create -R Mr-Salticidae/above-the-web --fill
gh pr merge -R Mr-Salticidae/above-the-web --rebase
```

`npm ci` 如果卡在 `registry.npmmirror.com`，属于网络问题，可以跳过 `npm ci` / `npm test` 直接提交，CI 会再跑一遍测试。

### 4.7 验收

部署约 2 分钟后：

- 打开 <https://tiaozhuxiansheng.com/music/playlist.json>，曲目数 = 1 + 新增数，每条的 `audio` 地址都能打开。
- 打开 <https://tiaozhuxiansheng.com/music/>，随便点几首，确认能播、封面对得上。
- 把结果（上架了哪些歌、有没有跳过的）告诉站长。

## 5. 不要做的事

- 不要把音频、封面提交进 git（`music-library/` 已 gitignore）。
- 不要运行 `scripts/music-manifest.mjs`，不要删除或改动《雨里旧信》那条。
- 不要移动、重命名 `D:\AIGC工作站` 里的原文件。
- 不要在站长确认曲目表之前上传。
- 不要为了绕过报错去改 `.github/workflows/` 或服务器配置。卡住就停下，把报错告诉站长。

## 6. 相关文件

- `.github/workflows/music-inbox.yml`：Release → 服务器的搬运工作流
- `scripts/collect-music.mjs`：扫描候选（本流程只用扫描）
- `src/data/music/manifest.json`：曲目清单
- `src/pages/music/playlist.json.js`：清单 → 播放列表
- `docs/MUSIC_PLAYER.md`：播放器与音乐板块的整体说明
