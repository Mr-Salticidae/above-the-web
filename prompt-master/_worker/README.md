# 点赞计数 Worker · 部署指南

把点赞的「递增」放到 Cloudflare Worker 后面,服务端按**哈希 IP 去重 + 限速**,公开页面再也拿不到可直接刷的递增端点。这是 Josh Comeau 同款做法,免费。

防刷机制:
- **每 IP 每篇只 +1**:用 `SALT` 把访客 IP 做 SHA-256 哈希(不存明文 IP),同 IP 重复点赞不再加。
- **每 IP 限速**:10 秒内最多 5 次写,超出返回 429。
- **Origin 校验**:只接受来自本站的 `POST /like`,挡裸 `curl`。
- 写入凭证(KV)只在服务端,页面源码里看不到可刷的 URL。

---

## 方式一:后台粘贴(最省事,无需装 Node)

1. 注册 / 登录 https://dash.cloudflare.com(免费)。
2. **Workers & Pages → Create application → Create Worker**,命名 `prompt-master-likes`,先 Deploy(占位)。
3. 进入该 Worker → **Edit code**,把 `like-counter.js` 全部内容粘进去 → **Save and Deploy**。
4. 建 KV:左侧 **Storage & Databases → KV → Create namespace**,命名 `LIKES`。
5. 回到 Worker → **Settings → Bindings → Add → KV Namespace**:变量名填 `LIKES`,选第 4 步建的命名空间。
6. **Settings → Variables**:
   - 加变量 `ALLOW_ORIGIN` = `https://mr-salticidae.github.io`
   - 加 **Secret** `SALT` = 任意一串随机字符(如 32 位随机串,填完不用记)。
7. 部署后拿到地址:`https://prompt-master-likes.<你的子域>.workers.dev`。
8. 把这个地址发给我,我改前端指向它(并下线 Abacus)。

## 方式二:wrangler CLI

```bash
npm i -g wrangler
wrangler login
wrangler kv namespace create LIKES      # 把返回的 id 填进 wrangler.toml
wrangler secret put SALT                 # 输入任意随机串
wrangler deploy
```

---

## 自测(部署后)

```bash
# 读数(应为 {"value":0})
curl https://prompt-master-likes.<子域>.workers.dev/get/ep01

# 裸 curl 点赞应被拒(403,因为没有正确 Origin)
curl -X POST https://prompt-master-likes.<子域>.workers.dev/like/ep01

# 带 Origin 才放行(同 IP 第二次会 deduped、不再加)
curl -X POST -H "Origin: https://mr-salticidae.github.io" \
  https://prompt-master-likes.<子域>.workers.dev/like/ep01
```

## 说明

- KV 是最终一致,极高并发下可能少计 1–2 个,对点赞场景可接受。
- key 命名沿用画廊:第 N 期 = `ep{NN}`(如 `ep01`)。
- 之后若启用自定义域名,改 `ALLOW_ORIGIN` 即可。
