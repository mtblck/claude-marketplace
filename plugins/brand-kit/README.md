# brand-kit

Logos and the files that ship with them.

- **`logo`** designs a logo in SVG. It works from a brief, writes concepts from
  different metaphors and structures, sets the name in many real Google Fonts
  on one numbered specimen sheet so the typeface is chosen by eye, draws the
  marks and lockups with scripts on a 256 grid, and exports everything from one
  `brand.json`.
- **`icons`** makes favicons, app icons and PWA icons from a logo that already
  exists (or a few matching UI icons), using the same export.

What one `node scripts/export.mjs brand.json` writes:

| Folder / file | Contents |
| --- | --- |
| `svg/` | every logo, its dark version, one-colour black and white versions |
| `png/` | every logo at 256–2048 px wide, transparent |
| `icons/` | `favicon.ico` (16/32/48), `favicon.svg`, `apple-touch-icon.png`, `icon-192/512.png`, `icon-maskable-512.png`, `app-icon-1024.png`, `site.webmanifest`, `head.html` |
| `check.png` | size ramp from 16 px, light and dark, one-colour tests, favicon in browser tabs, app icon on a home screen and under Android's mask |
| `brand-guidelines.pdf` (+ `.html`, one PNG per page) | printable US Letter brand guidelines: cover and logo versions; construction, clear space, minimum size, one colour, misuse and icons; typography; colour with HEX, RGB, CMYK and contrast |
| `pdf/` | every logo as a vector PDF, for print shops |
| `social/` | `og-image.png` (1200 × 630 link preview: logo, tagline, accent bar) and `avatar.png` (800 × 800, circle-safe) |
| `templates/` | email signature (HTML + text), business card (print PDF with bleed), slide template (`.pptx` + PDF) and social posts (square, portrait, story, Ko-fi cover, X header, each with a blank), with two pages about them in the guidelines |
| `README.md` | which file to use for what |
| `<name>-brand-kit.zip` | all of the above in one download |

Scripts (in `skills/logo/scripts/`, Node 18+):

- `brand.mjs`: drawing kit. Fetches Google Fonts and outlines text with
  `opentype.js` (installed once into `~/.cache/brand-kit`, not the project), plus
  geometry helpers and `lockup()`.
- `specimen.mjs`: the name in every face of the chosen typeface groups.
- `render.mjs`: PNGs of any SVG, or a numbered concept comparison sheet.
- `export.mjs`: everything above from `brand.json`.

Rendering uses Playwright's Chromium if it's installed (as in Claude's cloud
sessions) and never installs one. Fonts need network access to
`fonts.googleapis.com` and `fonts.gstatic.com`.

`examples/harbor/` is a complete worked logo (a harbour arch with a beacon,
Space Grotesk wordmark): `node draw.mjs && node ../../scripts/export.mjs brand.json`.

`references/typefaces.json` lists around 70 Google Fonts that are free for
commercial logo use (SIL OFL or Apache 2.0), in eleven voices, each with text
faces that pair with it.

The process and craft rules are original, informed by reading
[kaankiziltug/logo-design-skill](https://github.com/kaankiziltug/logo-design-skill)
(MIT), OpenData's [svg-design skill](https://github.com/tryopendata/skills) and
its write-up "Using Claude as a logo design agency", and the Logo Creator skill
on MCP Market. No text or code was copied from them; see THIRD_PARTY_NOTICES.md.
