# 蛛网之上 · Above the Web

> 跳蛛先生 / Mr-Salticidae 创作知识库的**杂志风开源展示站**。内容自动同步自 [knowledge-base](https://github.com/Mr-Salticidae/knowledge-base)。

线上地址：`https://mr-salticidae.github.io/above-the-web/`（启用 Pages 后生效）

## 架构

- **Astro**（静态站，SSG）+ 自有 `remark-wikilink` 插件渲染 Obsidian 双链
- 内容源：构建时浅克隆 `knowledge-base`，仅取 v1 精选目录（见 `src/lib/kb.mjs` 的 `SELECTED`）
- 搜索：Pagefind（静态全文，零后端）
- 部署：GitHub Pages + Actions

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

## 内容范围

v1 精选发布：方法论与洞察 / prompt模板库 / sref档案 / 参数行为档案 / 视觉系统。`07_skill存档` 暂不发。

许可：内容遵循源仓库 [CC BY-NC 4.0](https://github.com/Mr-Salticidae/knowledge-base/blob/main/LICENSE.md)。
