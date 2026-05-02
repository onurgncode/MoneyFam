#!/usr/bin/env python3
"""Generate macOS app icon from the wordmark logo.

The logo is wide (1619x750) so we center it on a 1024x1024 white square
with appropriate margin. Result follows Apple HIG conventions for
wordmark-style app icons (e.g. Microsoft Word, Adobe).

Output: build/icon.png
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'branding' / 'logo.png'
OUT_DIR = ROOT / 'build'
OUT_DIR.mkdir(exist_ok=True)
OUT = OUT_DIR / 'icon.png'

CANVAS = 1024
ARTWORK_MARGIN = 96  # ~9.4% margin per Apple HIG guidance

img = Image.open(SRC).convert('RGBA')

# Trim transparent borders on the source
content_bbox = img.getbbox()
trimmed = img.crop(content_bbox)
print(f'Source content size: {trimmed.size}')

# Fit into the artwork area while preserving aspect ratio
target = CANVAS - 2 * ARTWORK_MARGIN
sw, sh = trimmed.size
scale = min(target / sw, target / sh)
new_w = int(sw * scale)
new_h = int(sh * scale)
trimmed = trimmed.resize((new_w, new_h), Image.LANCZOS)

# White square canvas, center the wordmark
canvas = Image.new('RGBA', (CANVAS, CANVAS), (255, 255, 255, 255))
x = (CANVAS - new_w) // 2
y = (CANVAS - new_h) // 2
canvas.paste(trimmed, (x, y), trimmed)
canvas.save(OUT, format='PNG')
print(f'Saved: {OUT} ({CANVAS}x{CANVAS})')
