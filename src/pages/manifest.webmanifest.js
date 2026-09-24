// Web App Manifest：加到主屏 / 安装为应用时的名称、图标与配色。base 感知，Pages 镜像与主站各自成立。
import { SITE_DESCRIPTION, SITE_NAME } from '../lib/site.mjs';

export function GET() {
  const base = import.meta.env.BASE_URL;
  const body = {
    name: `${SITE_NAME} · Above the Web`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: 'zh-CN',
    start_url: base,
    scope: base,
    display: 'standalone',
    background_color: '#faf8f3',
    theme_color: '#faf8f3',
    icons: [
      { src: `${base}favicon.svg`, sizes: 'any', type: 'image/svg+xml' },
      { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' },
      { src: `${base}icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
}
