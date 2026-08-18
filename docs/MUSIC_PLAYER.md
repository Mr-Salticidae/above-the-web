最后更新：2026-08-18

# 音乐播放器

## 这项功能是什么

站内音乐板块 `/music/` + 全站底部常驻播放条，播放站长制作的音乐（AI 协作作品）。
对标网易云的核心体验：封面/歌名、播放控制、可拖进度条、音量、列表/单曲/随机循环、
播放列表抽屉、切页面续播、系统媒体键（Media Session）。

## 素材放哪（本机）

```
E:\above-the-web\music-library\        （已 gitignore，音频不进仓库）
  ├─ audio\     mp3 文件，命名「歌名.mp3」或「艺术家 - 歌名.mp3」
  └─ covers\    封面图（可选），与音频同名 .jpg/.jpeg/.png/.webp
```

## 上线三步

```bash
# 1. 上传音频到香港服务器（nginx /music/ 静态目录）
node scripts/upload-music.mjs

# 2. 生成/更新曲目清单（已有人工字段不会被覆盖，可手改 title/note）
node scripts/music-manifest.mjs

# 3. 提交部署（manifest 与页面进 git；音频不进）
git add src/data/music/manifest.json && git commit -m "music: 曲目清单" && git push
```

## 架构

| 层 | 位置 | 说明 |
| --- | --- | --- |
| 曲目数据 | `src/data/music/manifest.json` | 进 git，一首一条：title/artist/audio/cover/duration/note |
| 构建期端点 | `src/pages/music/playlist.json.js` | 导出 `/music/playlist.json`，音频 URL 拼主站绝对地址 |
| 板块页 | `src/pages/music/index.astro` | 封面卡片网格，点卡片经 `atw-music-play` 事件交给播放器 |
| 全局播放器 | `src/components/MusicPlayer.astro` + `src/scripts/music-player.js` | 挂 BaseLayout，曲库为空整体隐藏 |
| 音频托管 | 香港服务器 `/var/www/atw-music/` | nginx `location /music/`（`platform/deploy/nginx-music.conf`），不进 git |

音频用主站绝对地址，GitHub Pages 镜像也能播（audio 元素不受 CORS 限制）；
国内访问主站直连更快。

## 关键设计决策

- **切页续播而非硬无缝**：静态站整页加载，做硬无缝（音频跨页不断）需要 Astro
  ClientRouter 软导航，会让现有全站组件的初始化脚本全部需要适配 `astro:page-load`，
  影响面大。第一版用 localStorage 记「曲目/进度/播放中/音量/模式」，新页加载自动从
  断点续播（静态页小、通常 <1s 中断）；被浏览器自动播放策略拦截时停在断点，点一下
  播放键继续。后续要硬无缝再升级 ClientRouter。
- **音频不进 git**：每首 3-8MB，几十首会把仓库撑胖百 MB 级。走服务器静态目录 +
  rsync 式上传（`upload-music.mjs`），manifest（纯文本元数据）进 git 保证构建可复现。
- **降级**：曲库为空或 playlist 拉取失败时，播放器整体保持 `hidden`，不影响站点。

## nginx 接入（一次性手动）

把 `platform/deploy/nginx-music.conf` 的两个 location 块加进 `tiaozhuxiansheng.com`
的 `server { }`，然后 `nginx -t && systemctl reload nginx`。mp3 需要 range 支持
（拖进度条），nginx 默认支持，配置里显式声明了 Accept-Ranges。

## 验证清单

- 曲库为空：全站无播放条，`/music/` 显示「筹备中」，构建产物无音频引用。
- 有曲库：`/music/playlist.json` 返回曲目；点卡片底部播放条出现并开播；
  切到别的页面音乐从断点续播；进度条/音量/循环模式刷新后保留；
  播放列表抽屉点选切歌；Media Session 在系统媒体键/锁屏可用。
