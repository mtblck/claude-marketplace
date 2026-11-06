#!/usr/bin/env python3
"""Print an SVG <g> for a cover's logo pill: a dark rounded pill with the
project's mark and, optionally, its wordmark set in the brand font as paths.

  python3 logo_pill.py --mark icon.png [--grid 32] [--font Brand.woff2 --text NAME]
                       [--color #f8b84e] [--fill #0b0d12] [--stroke #272d3a]
                       [--x 72] [--bottom 896] [--height 104] [--track 0.12]

--mark   the project's mark: an SVG (nested as-is) or a PNG. A pixel-art PNG
         is redrawn as crisp rects; --grid is its pixel grid (e.g. 32 for a
         32 x 32 icon saved at 512 px). A non-pixel PNG is not supported:
         find the SVG.
--font   the wordmark's font file (.ttf, .otf, .woff, .woff2); glyphs become
         paths, so the cover never depends on a font being installed.
--bottom the pill's bottom edge. 896 keeps it inside the 16:9 Ko-fi crop
         (y 50-950) with room to spare.

--npm    instead of a project logo, print the npm pill for the bottom-right
         corner (projects published to npm): the npm logo in the same dark
         pill, right edge at --right (default 1528), no --mark needed.

Needs Pillow for PNG marks and fontTools (+ brotli for .woff2) for wordmarks.
"""
import argparse
import re
import sys

ap = argparse.ArgumentParser()
ap.add_argument('--mark')
ap.add_argument('--npm', action='store_true', help='print the npm pill (bottom right) instead')
ap.add_argument('--right', type=float, default=1528, help='right edge of the npm pill')
ap.add_argument('--grid', type=int, default=0)
ap.add_argument('--font')
ap.add_argument('--text')
ap.add_argument('--color', default='#ffffff', help='wordmark colour')
ap.add_argument('--fill', default='#0b0d12', help='pill colour')
ap.add_argument('--stroke', default='', help='pill outline colour (optional)')
ap.add_argument('--x', type=float, default=72)
ap.add_argument('--bottom', type=float, default=896)
ap.add_argument('--height', type=float, default=104)
ap.add_argument('--track', type=float, default=0.06, help='letter spacing in em')
a = ap.parse_args()

H = a.height

# npm's own logo (brand red box, white letters), 18 x 7 units
NPM = ('<path fill="#CB3837" d="M0,0h18v6H9v1H5V6H0V0z"/>'
       '<path fill="#FFFFFF" d="M1,5h2V2h1v3h1V1H1z M6,1v5h2V5h2V1H6z M8,2h1v2H8z '
       'M11,1v4h2V2h1v3h1V2h1v3h1V1H11z"/>')
if a.npm:
    lh = round(H * 0.38)                # logo height
    lw = lh * 18 / 7
    pad = round(H * 0.36)
    w = pad + lw + pad
    x0, y0 = a.right - w, a.bottom - H
    stroke = f' stroke="{a.stroke}" stroke-width="3"' if a.stroke else ''
    print(f'<g id="npm-pill"><rect x="{x0:.1f}" y="{y0:.1f}" width="{w:.1f}" height="{H:.1f}" rx="{H/2:.1f}" '
          f'fill="{a.fill}"{stroke}/><svg x="{x0 + pad:.1f}" y="{y0 + (H - lh) / 2:.1f}" width="{lw:.1f}" '
          f'height="{lh}" viewBox="0 0 18 7" shape-rendering="crispEdges">{NPM}</svg></g>')
    sys.exit(0)
if not a.mark:
    sys.exit('--mark is required (or --npm for the npm pill)')
MARK = round(H * 0.62)            # mark size inside the pill
PAD = round(H * 0.3)
GAP = round(H * 0.21)
y0 = a.bottom - H
parts = []

# --- wordmark as paths
word_svg, word_w = '', 0.0
if a.text:
    if not a.font:
        sys.exit('--text needs --font (the brand font file); covers never use <text>')
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    f = TTFont(a.font)
    gs, cmap = f.getGlyphSet(), f.getBestCmap()
    upm = f['head'].unitsPerEm
    cap = getattr(f['OS/2'], 'sCapHeight', 0) or upm * 0.7
    size = H * 0.28 / (cap / upm)     # cap height = 28 % of the pill
    k = size / upm
    track = a.track * size
    d, adv = [], 0.0
    for ch in a.text:
        g = cmap.get(ord(ch))
        if g is None:
            sys.exit(f'font has no glyph for {ch!r}')
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (k, 0, 0, -k, adv, 0)))
        d.append(pen.getCommands())
        adv += gs[g].width * k + track
    word_w = adv - track
    word_cap = cap * k
    word_svg = (d, word_cap)

W = PAD + MARK + (GAP + word_w if a.text else 0) + PAD
stroke = f' stroke="{a.stroke}" stroke-width="3"' if a.stroke else ''
parts.append(f'<rect x="{a.x:.1f}" y="{y0:.1f}" width="{W:.1f}" height="{H:.1f}" rx="{H/2:.1f}" fill="{a.fill}"{stroke}/>')
mx, my = a.x + PAD, y0 + (H - MARK) / 2

# --- mark
if a.mark.lower().endswith('.svg'):
    src = open(a.mark).read()
    vb = re.search(r'viewBox="([^"]+)"', src)
    inner = re.sub(r'(?s)^.*?<svg[^>]*>|</svg>\s*$', '', src)
    vbs = f' viewBox="{vb.group(1)}"' if vb else ''
    parts.append(f'<svg x="{mx:.1f}" y="{my:.1f}" width="{MARK}" height="{MARK}"{vbs}>{inner}</svg>')
else:
    from PIL import Image
    if not a.grid:
        sys.exit('a PNG mark needs --grid (its pixel-art grid, e.g. 32)')
    im = Image.open(a.mark).convert('RGBA')
    cell = im.width / a.grid
    gp = MARK / a.grid
    runs = []
    for yy in range(a.grid):
        for xx in range(a.grid):
            r, g, b, al = im.getpixel((int(xx * cell + cell / 2), int(yy * cell + cell / 2)))
            if al < 128:
                continue
            col = f'#{r:02x}{g:02x}{b:02x}'
            if runs and runs[-1][1] == yy and runs[-1][3] == col and runs[-1][0] + runs[-1][2] == xx:
                runs[-1][2] += 1
            else:
                runs.append([xx, yy, 1, col])
    rects = ''.join(f'<rect x="{mx + x*gp:.1f}" y="{my + y*gp:.1f}" width="{n*gp:.1f}" height="{gp:.1f}" fill="{c}"/>'
                    for x, y, n, c in runs)
    parts.append(f'<g shape-rendering="crispEdges">{rects}</g>')

if a.text:
    d, word_cap = word_svg
    wx, wy = mx + MARK + GAP, y0 + H / 2 + word_cap / 2
    parts.append(f'<path transform="translate({wx:.1f} {wy:.1f})" fill="{a.color}" d="{"".join(d)}"/>')

print(f'<g id="logo-pill">{"".join(parts)}</g>')
