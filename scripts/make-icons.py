"""Generate the PWA / iOS icons from the logo.

    python scripts/make-icons.py            # uses public/logo-source.png if present, else public/logo.png

public/logo.png has a fake "transparency" checkerboard baked into its pixels, so the background is
cleaned first: light, grey (unsaturated) pixels -> white.
Then the mark is cropped and placed on a white square:
  icon-192 / icon-512      mark fills ~84% (purpose "any")
  icon-maskable-512        mark fills ~62% (inside the 80% safe zone, so circle/squircle masks never cut it)
  apple-touch-icon (180)   mark fills ~78% (iOS rounds the corners itself)
Needs Pillow (pip install pillow).
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public')
OUT = os.path.join(PUB, 'icons')
BG = (255, 255, 255)


def is_backdrop(px):
    # checker cells are light greys (~200–255) with almost no colour
    r, g, b = px[:3]
    return min(r, g, b) >= 190 and max(r, g, b) - min(r, g, b) <= 20


def clean(im):
    """Every light grey pixel -> pure white. The logo's own white parts are already pure white, so they
    don't change; this also clears checker pockets enclosed by the ring, which a flood fill can't reach."""
    im = im.convert('RGB')
    w, h = im.size
    px = im.load()
    for y in range(h):
        for x in range(w):
            if is_backdrop(px[x, y]):
                px[x, y] = BG
    return im


def crop_to_mark(im, margin=6):
    """Bounding box of the COLOURED pixels (green / gold) — ignores stray grey specks."""
    w, h = im.size
    px = im.load()
    xs, ys = [], []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if max(r, g, b) - min(r, g, b) > 60:
                xs.append(x); ys.append(y)
    return im.crop((max(min(xs) - margin, 0), max(min(ys) - margin, 0),
                    min(max(xs) + margin, w), min(max(ys) + margin, h)))


def place(mark, size, fill):
    canvas = Image.new('RGB', (size, size), BG)
    side = round(size * fill)
    m = mark.copy()
    m.thumbnail((side, side), Image.LANCZOS)
    canvas.paste(m, ((size - m.width) // 2, (size - m.height) // 2))
    return canvas


def main():
    src = os.path.join(PUB, 'logo-source.png')
    if not os.path.exists(src):
        src = os.path.join(PUB, 'logo.png')
    im = Image.open(src)
    if im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] < 255:
        flat = Image.new('RGB', im.size, BG)
        flat.paste(im, mask=im.getchannel('A'))
        im = flat
    mark = crop_to_mark(clean(im))
    os.makedirs(OUT, exist_ok=True)
    place(mark, 192, 0.84).save(os.path.join(OUT, 'icon-192.png'), optimize=True)
    place(mark, 512, 0.84).save(os.path.join(OUT, 'icon-512.png'), optimize=True)
    place(mark, 512, 0.62).save(os.path.join(OUT, 'icon-maskable-512.png'), optimize=True)
    place(mark, 180, 0.78).save(os.path.join(PUB, 'apple-touch-icon.png'), optimize=True)
    print('icons from', os.path.relpath(src, ROOT), '->', os.path.relpath(OUT, ROOT), '+ public/apple-touch-icon.png')


if __name__ == '__main__':
    sys.exit(main())
