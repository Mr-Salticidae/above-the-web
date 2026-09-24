// robots.txt：全站开放抓取（含 AI 抓取器——内容本就以 CC BY-NC 公开），只挡掉 API。
// 账号 / 管理台页面不在这里 Disallow：它们自带 noindex，挡住抓取反而让爬虫看不见 noindex。
// 注意 robots.txt 只在域名根生效：主站就是根；Pages 镜像在 /above-the-web/ 子路径下，
// 这份对它不起作用，镜像靠每页 canonical 回指主站。
import { CANONICAL_ORIGIN } from '../lib/site.mjs';

export function GET() {
  const base = import.meta.env.BASE_URL;
  const body = [
    'User-agent: *',
    'Allow: /',
    `Disallow: ${base}api/`,
    '',
    `Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
