---
name: icons
description: Make favicons, app icons and PWA icons (favicon.ico and .svg, apple-touch-icon, maskable Android icons, a 1024 px App Store icon, webmanifest and the head tags) from an existing logo or mark, or draw a small set of matching UI icons as SVG. Use when a site or app needs its icons, or its icons look blurry, cropped or wrong in dark mode.
---

# icons

Two jobs. **Site and app icons** take a logo that already exists and produce every file browsers, phones and app stores ask for. **UI icons** draw a few small interface icons that match a brand. To design the logo itself, use the `logo` skill. It ends with this same export.

The scripts live in the `logo` skill: `../logo/scripts/` from this skill's folder. Rules for icon proportions are in `../logo/references/craft.md` under **Icons**.

## Site and app icons from an existing logo

1. **Find the mark.** Look for the project's logo SVG (`public/`, `src/assets/`, `static/`, the README's image, an existing `favicon.svg`). Prefer the symbol on its own to the full lockup, since a wordmark is unreadable at 16 px. If there's only a PNG or no logo at all, say so. Then either redraw the mark as SVG with `../logo/scripts/brand.mjs` (keep it faithful: same shapes and colours, cleaner geometry) or offer the `logo` skill.
2. **Make it icon-ready.** The SVG needs a `viewBox` trimmed to the art. If the mark has detail finer than about 1/32 of its size, or disappears on a dark tab, draw a separate `favicon.svg`: bolder, simpler, often the mark on a rounded tile in the brand colour.
3. **Write a small brand.json** next to it (see `../logo/references/brand-json.md`):
   ```json
   { "name": "Inlay", "icon": { "file": "mark.svg", "background": "#1d1d1f", "favicon": "favicon.svg" } }
   ```
   `background` is the tile colour for app icons. Use the brand's primary colour or its dark, with a mark that contrasts with it.
4. **Export.** Run `node ../logo/scripts/export.mjs brand.json --only icons`, then read `dist/check.png`. It shows the favicon in light and dark tabs, the icon on a home screen and under Android's circle mask. Fix what fails and run it again.
5. **Install** in a repo: copy `dist/icons/*` (except `head.html`) to the public root, paste `head.html` into the document head (or the framework's equivalent: Next.js `app/` takes `icon.svg`, `apple-icon.png` and `manifest`; Vite and Astro use `public/` plus the tags), and remove old icon files and tags so the two sets don't fight. Open a PR. Elsewhere, deliver the `icons/` folder and the snippet.

## Small UI icons for a brand

For a handful of interface icons that should match the logo (feature bullets, empty-state badges, a nav). For a full icon library, use an existing open set (Lucide, Tabler, Phosphor) instead, recoloured.

- **Grid** `viewBox="0 0 24 24"`, 2 px padding (live area 20 × 20), stroke 1.75–2 with round caps and joins and `fill="none"`, `stroke="currentColor"` so the icon takes the text colour. Match the logo's character: rounded logo, round joins; sharp logo, mitred joins and square caps.
- **Consistency** Same stroke, same corner radius (2 on 24), same visual weight: circles drawn about 10 % larger than squares, so they look the same size. Each icon is one idea in two to four shapes.
- **Draw** with a script (`brand.mjs` helpers work at any scale), one SVG per icon, and render them together with `node ../logo/scripts/render.mjs *.svg --sheet icons.png` to check they look like one family at 16 and 32 px.
- **Deliver** as separate SVGs (or a sprite if the project already uses one), each with a `<title>` only when it isn't decorative.

## Checklist

- The favicon reads at 16 px in both a light and a dark tab, and isn't a squashed wordmark.
- `apple-touch-icon.png` and `app-icon-1024.png` are opaque squares; the mark sits optically centred, filling about 60–65 %.
- The maskable icon's art sits fully inside the circle crop on `check.png`.
- `site.webmanifest` has the right `name`, `short_name` and `theme_color`, and the old icon tags are gone.
