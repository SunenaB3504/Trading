"""Draws the placeholder Market Learning icon: a rising price line with candles on the app's blue."""
import sys
from PIL import Image, ImageDraw

out = sys.argv[1]
S = 1024
BLUE = (26, 86, 219)      # colors.accent
DARK = (16, 58, 160)
GREEN = (52, 211, 120)
RED = (248, 113, 113)
WHITE = (255, 255, 255)


def art(draw: ImageDraw.ImageDraw, scale: float, ox: float, oy: float) -> None:
    """The picture in a 1024 box, drawn at `scale` from (ox, oy)."""
    p = lambda x, y: (ox + x * scale, oy + y * scale)
    # candles: body and wick
    candles = [(250, 640, 560, 700, 520, RED), (370, 560, 470, 600, 430, GREEN), (490, 600, 500, 640, 470, RED),
               (610, 470, 380, 520, 340, GREEN), (730, 380, 290, 420, 250, GREEN)]
    for x, body_top, body_low, wick_low, wick_top, col in candles:
        top, bottom = min(body_top, body_low), max(body_top, body_low)
        draw.line([p(x, wick_top), p(x, wick_low + 60)], fill=WHITE, width=int(10 * scale))
        draw.rounded_rectangle([p(x - 34, top), p(x + 34, bottom + 60)], radius=int(10 * scale), fill=col, outline=WHITE, width=int(8 * scale))
    # rising line with an arrow head
    pts = [p(200, 760), p(370, 650), p(490, 690), p(610, 540), p(800, 330)]
    draw.line(pts, fill=WHITE, width=int(30 * scale), joint='curve')
    draw.polygon([p(840, 280), p(740, 300), p(820, 380)], fill=WHITE)
    # base line
    draw.line([p(180, 820), p(860, 820)], fill=WHITE, width=int(14 * scale))


# 1) the full icon (square; Android and the store round it)
icon = Image.new('RGBA', (S, S), BLUE)
d = ImageDraw.Draw(icon)
d.rounded_rectangle([0, 0, S, S], radius=0, fill=BLUE)
d.ellipse([-300, 520, 700, 1520], fill=DARK)
art(d, 1.0, 0, 0)
icon.convert('RGB').save(f'{out}/icon.png')

# 2) adaptive foreground: the picture inside the 66% safe zone, on transparent
fg = Image.new('RGBA', (S, S), (0, 0, 0, 0))
art(ImageDraw.Draw(fg), 0.62, S * 0.19, S * 0.17)
fg.save(f'{out}/adaptive-icon.png')

# 3) a small preview for checking by eye
icon.resize((256, 256)).save(f'{out}/icon-preview.png')
print('ok')
