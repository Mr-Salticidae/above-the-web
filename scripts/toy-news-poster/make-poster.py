# 「AIGC 快讯」Toy 封面：MJ 底图 + 站点刊头排印，输出 1200x900（Toy 列表卡片推荐 4:3）。
#
#   python scripts/toy-news-poster/make-poster.py
#
# base.jpg 是 Midjourney v8.1 出的底图（--ar 4:3 --style raw，纸屑 + 紫色蛛丝汇聚
# 到右下节点），已降到 1600px 宽存仓库——成品只要 1200px，留这点余量足够重排。
# 排印规则对齐 src/pages/news/index.astro 的刊头：眉题 / 衬线大字 / 字距英文副题。
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont

HERE = Path(__file__).resolve().parent
SRC = HERE / "base.jpg"
OUT = HERE / "poster.png"

W, H = 1200, 900
PAPER = (250, 248, 243)   # --paper
INK = (27, 24, 19)        # --ink
INK_SOFT = (107, 99, 87)  # --ink-soft
ACCENT = (109, 74, 255)   # --accent 蛛丝紫

SERIF = r"C:\Windows\Fonts\simsun.ttc"
SANS = r"C:\Windows\Fonts\segoeuisl.ttf"   # Segoe UI Semilight，撑字距小标

# ---- 底图：cover 裁切到 4:3，轻微去饱和 + 提亮，把 MJ 的重棕调拉回站点纸白 ----
img = Image.open(SRC).convert("RGB")
s = max(W / img.width, H / img.height)
img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
left, top = (img.width - W) // 2, (img.height - H) // 2
img = img.crop((left, top, left + W, top + H))
img = ImageEnhance.Color(img).enhance(0.80)
img = ImageEnhance.Brightness(img).enhance(1.02)

# ---- 刊头压光：顶部一层纸白渐隐，把上方虚焦暗形压下去，保证标题可读 ----
# 收得比直觉更紧：压光越深、照片中段越发灰发平，只要够托住字就行。
scrim = Image.new("RGBA", (W, H), PAPER + (0,))
sd = ImageDraw.Draw(scrim)
SCRIM_BOTTOM, SCRIM_TOP_A = int(H * 0.48), 186
for y in range(SCRIM_BOTTOM):
    t = y / SCRIM_BOTTOM
    sd.line([(0, y), (W, y)], fill=PAPER + (int(SCRIM_TOP_A * (1 - t) ** 1.7),))
img = Image.alpha_composite(img.convert("RGBA"), scrim)

d = ImageDraw.Draw(img)


def tracked(draw, xy, text, font, fill, tracking, stroke=0):
    """按字距逐字符绘制，返回总宽。PIL 没有 letter-spacing，只能手绘。"""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill, stroke_width=stroke, stroke_fill=fill)
        x += draw.textlength(ch, font=font) + tracking
    return x - tracking - xy[0]


X, TITLE_Y = 88, 168
f_kicker = ImageFont.truetype(SANS, 17)
f_title = ImageFont.truetype(SERIF, 112)
f_sub = ImageFont.truetype(SANS, 21)
f_foot = ImageFont.truetype(SERIF, 21)

# 眉题
tracked(d, (X, 128), "DAILY BRIEFING FOR CREATORS", f_kicker, INK_SOFT, 5.4)

# 主标题：宋体 + 描边加粗（Windows 没有粗宋），字距略放，取报头气。
# 中英之间用固定小间隙，不走空格——宋体的全角空格叠上字距会把两段拉散。
latin_w = tracked(d, (X, TITLE_Y), "AIGC", f_title, INK, 6, stroke=1)
gap = 30
zh_w = tracked(d, (X + latin_w + gap, TITLE_Y), "快讯", f_title, INK, 6, stroke=1)
title_w = latin_w + gap + zh_w

# 刊头细线 + 英文副题
rule_y = TITLE_Y + 112 + 40
d.line([(X, rule_y), (X + title_w, rule_y)], fill=INK, width=2)
tracked(d, (X, rule_y + 22), "AIGC DAILY", f_sub, ACCENT, 10)

# 角标：站点署名
d.text((X, H - 78), "蛛网之上 · Above the Web", font=f_foot, fill=INK_SOFT)

img.convert("RGB").save(OUT, "PNG", optimize=True)
print(f"{OUT} {img.size}")
