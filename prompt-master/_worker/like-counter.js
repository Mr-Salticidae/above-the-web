// 目标是成为 Prompt 大师 · 点赞计数 Worker
// 全局真实计数 + 按「哈希 IP」去重(每 IP 每篇只 +1)+ 每 IP 限速。
// 公开页面只能 POST /like(且需正确 Origin),写入逻辑与计数凭证都在服务端,
// 因此别人拿不到可直接刷的递增端点。
//
// 需要的绑定(在 Cloudflare 后台配置,见 README.md):
//   - KV 命名空间绑定:LIKES
//   - 变量 ALLOW_ORIGIN:允许的站点(默认下方常量)
//   - Secret SALT:任意随机字符串,用于哈希 IP(保护隐私,不存明文 IP)

const DEFAULT_ORIGIN = "https://mr-salticidae.github.io";
const RL_MAX = 5;          // 每 IP 10 秒内最多 5 次写请求
const RL_WINDOW = 10;      // 秒
const DEDUP_TTL = 60 * 60 * 24 * 365; // 同 IP 对同一 key 去重保留 1 年

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function corsHeaders(allow) {
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

const validKey = (k) => /^[a-z0-9_-]{1,40}$/i.test(k);

export default {
  async fetch(request, env) {
    const allow = env.ALLOW_ORIGIN || DEFAULT_ORIGIN;
    const H = corsHeaders(allow);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: H });

    const { pathname } = new URL(request.url);
    const [action, key] = pathname.split("/").filter(Boolean);
    if (!key || !validKey(key)) return json({ error: "bad key" }, 400, H);

    // 读取计数:GET /get/:key
    if (action === "get" && request.method === "GET") {
      const v = parseInt(await env.LIKES.get("count:" + key)) || 0;
      return json({ value: v }, 200, H);
    }

    // 点赞:POST /like/:key
    if (action === "like" && request.method === "POST") {
      // 1) Origin 校验:挡裸 curl / 跨站滥用(非绝对安全,但抬高成本)
      if ((request.headers.get("Origin") || "") !== allow) {
        return json({ error: "forbidden origin" }, 403, H);
      }

      const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
      const h = await sha256((env.SALT || "salt") + "|" + ip);

      // 2) 限速:每 IP 滑动窗口内最多 RL_MAX 次写
      const rlKey = "rl:" + h;
      const rl = parseInt(await env.LIKES.get(rlKey)) || 0;
      if (rl >= RL_MAX) return json({ error: "rate limited" }, 429, H);
      await env.LIKES.put(rlKey, String(rl + 1), { expirationTtl: RL_WINDOW });

      // 3) 去重:同 IP 对同一 key 只计一次
      const dedupKey = "liked:" + key + ":" + h;
      const cur = parseInt(await env.LIKES.get("count:" + key)) || 0;
      if (await env.LIKES.get(dedupKey)) {
        return json({ value: cur, liked: true, deduped: true }, 200, H);
      }

      await env.LIKES.put(dedupKey, "1", { expirationTtl: DEDUP_TTL });
      const next = cur + 1;
      await env.LIKES.put("count:" + key, String(next));
      return json({ value: next, liked: true }, 200, H);
    }

    return json({ error: "not found" }, 404, H);
  },
};
