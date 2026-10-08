#!/usr/bin/env python3
"""Generate EduStory PWA icons (brand: indigo→violet, open book + amber bookmark)."""
from PIL import Image, ImageDraw
import os, math

OUT = '/tmp/edustory/public/icons'
os.makedirs(OUT, exist_ok=True)
os.makedirs('/tmp/edustory/public', exist_ok=True)

VIOLET = (91, 75, 245)
VIOLET_LT = (139, 125, 255)
AMBER = (255, 176, 32)

def gradient(size, c1, c2):
    img = Image.new('RGB', (size, size), c1)
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(1, size - 1)
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        d.line([(0, y), (size, y)], fill=(r, g, b))
    return img

def rounded_mask(size, radius):
    m = Image.new('L', (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m

def draw_glyph(img, size, scale=1.0):
    """Open book with amber bookmark, centered."""
    d = ImageDraw.Draw(img)
    S = size * scale
    cx, cy = size / 2, size / 2 + size * 0.02
    w = S * 0.52          # total book width
    h = S * 0.34          # page height
    half = w / 2
    lift = h * 0.10

    left = [
        (cx - half, cy - h * 0.30),
        (cx - w * 0.03, cy - h * 0.44),
        (cx - w * 0.03, cy + h * 0.30),
        (cx - half, cy + h * 0.42),
    ]
    right = [
        (cx + w * 0.03, cy - h * 0.44),
        (cx + half, cy - h * 0.30),
        (cx + half, cy + h * 0.42),
        (cx + w * 0.03, cy + h * 0.30),
    ]
    d.polygon(left, fill=(255, 255, 255, 255))
    d.polygon(right, fill=(238, 240, 255, 255))
    # spine
    d.rounded_rectangle(
        [cx - S * 0.012, cy - h * 0.46, cx + S * 0.012, cy + h * 0.34],
        radius=S * 0.012, fill=(70, 56, 200, 255),
    )
    # bookmark
    bw = S * 0.075
    bx = cx + w * 0.20
    by = cy - h * 0.40
    bh = h * 0.62
    d.polygon(
        [(bx, by), (bx + bw, by), (bx + bw, by + bh), (bx + bw / 2, by + bh - bw * 0.7), (bx, by + bh)],
        fill=AMBER,
    )

def make(size, radius_ratio=0.22, maskable=False, out=None, glyph_scale=1.0):
    base = gradient(size, VIOLET, VIOLET_LT)
    if maskable:
        # full-bleed square background, glyph pulled into safe zone
        img = base.convert('RGBA')
    else:
        mask = rounded_mask(size, int(size * radius_ratio))
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        img.paste(base, (0, 0), mask)
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw_glyph(layer, size, scale=(0.72 if maskable else 0.9) * glyph_scale)
    img = Image.alpha_composite(img, layer)
    img.save(out, 'PNG')
    return out

make(192, out=f'{OUT}/icon-192.png')
make(512, out=f'{OUT}/icon-512.png')
make(512, maskable=True, out=f'{OUT}/maskable-512.png')
make(180, radius_ratio=0.0, out=f'{OUT}/apple-touch-icon.png')

# favicon.svg
svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5B4BF5"/><stop offset="1" stop-color="#8B7DFF"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="15" fill="url(#g)"/>
  <path d="M32 20.5c-4.2-3-9.6-3.6-14.5-2.2v25c4.9-1.4 10.3-.8 14.5 2.2V20.5z" fill="#fff"/>
  <path d="M32 20.5c4.2-3 9.6-3.6 14.5-2.2v25c-4.9-1.4-10.3-.8-14.5 2.2V20.5z" fill="#EEF0FF"/>
  <rect x="30.6" y="18.6" width="2.8" height="27" rx="1.4" fill="#4638C8"/>
  <path d="M40.5 21.4h5v13.2l-2.5-2.1-2.5 2.1V21.4z" fill="#FFB020"/>
</svg>'''
open('/tmp/edustory/public/icon.svg', 'w').write(svg)

for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(os.path.join(OUT, f)))
print('icon.svg', os.path.getsize('/tmp/edustory/public/icon.svg'))
