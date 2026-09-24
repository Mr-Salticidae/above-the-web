// 生成站点的位图品牌资源（一次性，产物直接入库，不进每次构建）：
//   public/icon-192.png / icon-512.png   PWA 图标（与 favicon.svg 同款圆角蛛网）
//   public/icon-maskable-512.png          安卓自适应图标：满版底色，图案收进 80% 安全区
//   public/apple-touch-icon.png           iOS 主屏图标 180×180（满版，系统自己切圆角）
//   public/og-default.png                 社交分享默认卡片 1200×630
//
//   node scripts/make-brand-assets.mjs
//
// 用 Astro 自带的 sharp（librsvg）把 SVG 栅格化。卡片上的中文靠本机字体（fontconfig），
// 需装有任一中文字体（如 Noto Sans CJK / 文泉驿）；改了文案或配色再跑一次、把 png 一并提交即可。
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.join(process.cwd(), 'public');
const INK = '#100f16';
const ACCENT = '#9b85ff';

// 与 public/favicon.svg 同一个图案，参数化出圆角 / 满版 / 安全区三种
function webIcon({ size, rounded, inset = 0 }) {
  const s = 32;
  const pad = (s * inset) / 2;
  const scale = (s - pad * 2) / s;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${rounded ? 7 : 0}" fill="${INK}"/>
  <g transform="translate(${pad} ${pad}) scale(${scale})" fill="none" stroke="${ACCENT}" stroke-width="1">
    <circle cx="16" cy="16" r="4"/><circle cx="16" cy="16" r="8"/><circle cx="16" cy="16" r="12"/>
    <path d="M16 2v28M2 16h28M6 6l20 20M26 6L6 26"/>
  </g>
</svg>`;
}

function ogCard() {
  const W = 1200;
  const H = 630;
  const cx = 930;
  const cy = 315;
  const rings = [60, 130, 210, 300, 400].map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join('');
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return `<path d="M${cx} ${cy}L${(cx + Math.cos(a) * 700).toFixed(1)} ${(cy + Math.sin(a) * 700).toFixed(1)}"/>`;
  }).join('');
  const font = "'Noto Sans CJK SC','Noto Sans SC','PingFang SC','WenQuanYi Zen Hei',sans-serif";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="${cx / W}" cy="${cy / H}" r="0.6">
      <stop offset="0" stop-color="#6d4aff" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#6d4aff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="veil" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${INK}" stop-opacity="0.92"/>
      <stop offset="0.42" stop-color="${INK}" stop-opacity="0.75"/>
      <stop offset="0.62" stop-color="${INK}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g fill="none" stroke="${ACCENT}" stroke-opacity="0.35" stroke-width="1.5">${rings}${spokes}</g>
  <circle cx="${cx}" cy="${cy}" r="7" fill="${ACCENT}"/>
  <rect width="${W}" height="${H}" fill="url(#veil)"/>
  <text x="96" y="236" font-family="${font}" font-size="30" letter-spacing="10" fill="#9a93ad">跳蛛先生的个人站</text>
  <text x="90" y="350" font-family="${font}" font-size="118" font-weight="700" letter-spacing="14" fill="#ece8f5">蛛网之上</text>
  <text x="98" y="410" font-family="${font}" font-size="26" letter-spacing="12" fill="${ACCENT}">ABOVE THE WEB</text>
  <text x="98" y="500" font-family="${font}" font-size="28" fill="#c9c2da">AIGC 创作笔记 · 每日快讯 · Prompt 拆解 · 可玩小作品</text>
  <text x="98" y="556" font-family="${font}" font-size="24" letter-spacing="2" fill="#9a93ad">tiaozhuxiansheng.com</text>
</svg>`;
}

const jobs = [
  ['icon-192.png', webIcon({ size: 192, rounded: true })],
  ['icon-512.png', webIcon({ size: 512, rounded: true })],
  ['icon-maskable-512.png', webIcon({ size: 512, rounded: false, inset: 0.2 })],
  ['apple-touch-icon.png', webIcon({ size: 180, rounded: false, inset: 0.08 })],
  ['og-default.png', ogCard()],
];

for (const [name, svg] of jobs) {
  const file = path.join(OUT, name);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
  console.log(`  ${name}  ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
}
