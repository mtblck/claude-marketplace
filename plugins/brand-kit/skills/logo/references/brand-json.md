# brand.json

One file describes a brand; `scripts/export.mjs` turns it into every deliverable. File paths are relative to `brand.json`. Only `name` and either `logos.mark` or `icon.file` are required.

```json
{
  "name": "Harbor",
  "shortName": "Harbor",
  "tagline": "Everything you saved, safe in one place.",
  "colors": [
    { "name": "Deep Water", "hex": "#12324a", "role": "primary" },
    { "name": "Signal", "hex": "#f0643c", "role": "accent" },
    { "name": "Sand", "hex": "#f6f1e7", "role": "paper" },
    { "name": "Mist", "hex": "#cfe0ea", "role": "support" }
  ],
  "type": {
    "display": { "family": "Space Grotesk", "weight": 700 },
    "text": { "family": "Inter", "weight": 400 }
  },
  "logos": {
    "mark": { "file": "mark.svg", "dark": "mark-dark.svg", "minWidth": 16 },
    "horizontal": { "file": "logo-horizontal.svg", "dark": "logo-horizontal-dark.svg", "minWidth": 96 },
    "stacked": { "file": "logo-stacked.svg", "dark": "logo-stacked-dark.svg", "minWidth": 64 }
  },
  "icon": {
    "file": "mark-dark.svg",
    "background": "#12324a",
    "favicon": "favicon.svg"
  },
  "clearSpace": 0.25,
  "pngWidths": [256, 512, 1024, 2048],
  "out": "dist"
}
```

| Field | Meaning |
|---|---|
| `name`, `shortName` | Brand name (guidelines, page titles, manifest). `shortName` is the home-screen label, at most 12 characters. |
| `tagline` | Optional line for the guidelines' cover and type sample, and under the logo on the link-preview image. |
| `about` | One or two short paragraphs (split with a blank line, `\n\n`) introducing the brand on the guidelines' cover. Keep it under ~90 words or page 1 overflows. |
| `version` | Guidelines version, default `1.0`. |
| `construction` | One sentence on how the mark is built, under the construction drawing. |
| `colors[]` | `name`, `hex`, `role`, optional `usage` (one sentence: where this colour goes). Roles the export uses: `primary` (one-colour reversed ground, CSS), `accent` (white-on-accent test), `paper` (default icon tile, sheet hero), `dark` (dark grounds; defaults to the darkest colour). Any other role is listed and exported as a CSS variable. |
| `type.display`, `type.text` | Google Font `family` and `weight` for the wordmark and headings, and for body copy. The guidelines load them live for the specimens. |
| `logos.<key>` | Any number of logos. `mark` is special: it drives the size ramp, clear-space diagram and one-colour tests. Usual keys: `mark`, `horizontal`, `stacked`, `wordmark`. `file` is the light-ground version; `dark` is the version for dark grounds; `minWidth` is in px. `black` (or `white`) is a hand-drawn one-colour version, needed when the logo sits on its own tile or relies on two colours touching; it is recoloured to make both. Without it, the main file is recoloured. `mono: false` skips the one-colour versions. |
| `icon.file` | The art placed on icon tiles (usually the mark, or its dark version on a dark tile). Defaults to `logos.mark.file`. |
| `icon.background` | Tile colour for apple-touch, PWA, maskable and 1024 app icons. Defaults to the paper colour. |
| `icon.scale`, `icon.maskableScale` | Share of the tile the art fills: 0.62 and 0.5 by default. |
| `icon.favicon` | A separate SVG for 16–48 px (simplified, or already on its own tile). Defaults to `icon.file`. |
| `icon.faviconBackground`, `icon.faviconScale` | Put the favicon art on a rounded tile of this colour (scale default 0.78). Use this when the mark alone vanishes in a light or dark tab. |
| `icon.themeColor` | Browser and manifest theme colour; defaults to the tile colour. |
| `clearSpace` | Clear space as a share of the mark's height (default 0.25). |
| `pngWidths` | Widths for logo PNGs. One-colour versions get one 1024 px PNG each. |
| `social.background` | Background of `social/og-image.png` (default the paper colour). It shows the horizontal lockup (or the next logo that exists), the tagline in the display face, and an accent bar along the bottom. |
| `social.avatarBackground`, `social.avatarScale` | Background and art size of `social/avatar.png`. Default the icon tile and `icon.maskableScale` (or 0.6), so the art survives the circle crop most sites apply. |
| `website` | The site, without `https://`, for the email signature, business card, closing slide and posts. |
| `contact` | `{ name, role, email, phone }` for the email signature and business card. Defaults are placeholders ("Your Name", "Role", `you@<website>`). |
| `templates` | `false` skips the templates. `templates.background` is the field colour for card fronts, title slides and posts (default the primary colour). `templates.email.logoUrl` is where the signature's `logo.png` is hosted (until set, the HTML points at the local file). `templates.social.headline` and `.kicker` replace the sample post copy (default the tagline and website). |
| `out` | Output folder (default `dist`). |

`node export.mjs brand.json --only icons` writes just `icons/` and `check.png` (no logos, guidelines, social images, PDFs or zip), which is what the `icons` skill uses for an existing logo.
