---
name: cover-art
description: Make a full-bleed, representational 16:10 cover illustration with the project's logo in a pill for a website, app, extension or Claude skill from its repo or URL, for portfolio cards, case-study heroes, project thumbnails and the matching Ko-fi announcement image.
---

# cover-art

A cover is a flat illustration that says what a project *does*, drawn in the project's own colours, filling the frame edge to edge, with the project's logo in a small dark pill in the bottom-left corner. Not a screenshot, not a mock-up of the UI. It sits on a portfolio card at ~360 px wide, as a case-study hero at ~1200 px and as a Ko-fi post image, and has to work at all three.

## The idea in three lines

1. **One verb, one picture.** Find the single thing the product does to something (traces pixels into shapes, collects figures, paints a tile map) and draw that act, or its result, as a scene that fills the frame.
2. **The product's own colours.** Ground, ink and one accent come from the app's design tokens. The accent goes only on the part of the picture that *is* the verb.
3. **Readable at a glance.** One focal point, legible at 320 px wide. The only words are the logo's own wordmark, in its pill.

## Files

Paths are relative to this skill's folder.

| File | Use |
|---|---|
| `scripts/render.mjs` | `node scripts/render.mjs cover.svg [--out DIR]` writes `cover.png` (1600 × 1000), `cover-card.png` (380 × 238) and `cover-kofi.png` (1600 × 900, 16:9, cropped from the middle for Ko-fi). Uses Playwright only if a Chromium is already installed and never installs one; exit 2 means no browser here, so open the SVG instead. |
| `scripts/logo_pill.py` | Prints the logo pill as an SVG `<g>` to paste in last (or, with `--npm`, the npm pill for the bottom-right corner): the project's mark (SVG nested as-is, or a pixel-art PNG redrawn as rects with `--grid`) and its wordmark set in the brand font as paths. `python3 scripts/logo_pill.py --help`. Needs Pillow and fontTools (+ brotli for `.woff2`). |
| `examples/*.svg` | Eight covers, one or more per pattern below. `tinkerkit.svg` follows the current full-bleed and logo-pill rules; the other seven predate them, so use those for subject, stroke weight and palette, not for framing. |

## Workflow

1. **Find the source.** Take a repo (preferred) or URL. If the live site can't be reached from here, use the repo: it holds everything below. For a private repo, attach it first. The marketing site is often a separate repo from the product (`<name>-site`, or whatever the product's README or CLAUDE.md names): look there for design tokens, the logo and the brand font.
2. **Discovery.** Read, in this order, and stop when you have the brief:
   - `README.md`, `CLAUDE.md`, `docs/overview*`, the landing page source (`index.astro`, `page.tsx`, `index.html`, `site/`), and any case-study text the portfolio already has for it (for example `content/projects.json` in `mtblck/mb-portfolio`).
   - Design tokens: grep CSS for custom properties (`--paper`, `--ink`, `--accent`, `--primary`, DaisyUI or Tailwind theme blocks, `@theme`). Note light and dark sets.
   - The logo: the mark (SVG preferred; a pixel-art icon PNG works too), how the site sets the wordmark (font, weight, letter spacing, colour; see its header or `Brand` component), and the font file itself (the site's font package, e.g. `@fontsource/<font>`, which `npm pack` fetches without installing).
   - Whether it is published to npm (a non-private `package.json` with a `name`, an npm badge or link in the README, or an npm link on its site). If so it gets the npm pill.
   - The hero visual if one exists. **A hero visual the product already uses is the strongest starting point** (Inlay's pixels/shapes split, Isogram's isometric figures).
   - Write the brief in six lines: *what it does (one verb)*, *who it's for*, *what it acts on*, *signature visual if any*, *palette* (ground, ink, 1–2 neutrals, accent, as hex), *logo* (mark file, wordmark font and colour, and whether it gets the npm pill).
3. **Concepts.** Write three one-line concepts, each from a different pattern below, pick one and say why in a sentence. If the user is around, show all three; otherwise go with the pick. When the user suggests an object, draw it, and if it's a hard one draw two or three takes side by side at card size so they can choose by eye.
4. **Draw** a 1600 × 1000 SVG with a script (Python or JS) rather than hand-typed paths, so geometry is computed and repeatable. Use the product's real assets where they help: its sample image, its own trace, its icon geometry. Repeated pieces (tiles, bricks, leaves) go in `<defs>` and are placed with `<use>`, which keeps a full-bleed scene well under the size limit. Add the logo pill (and the npm pill, if it's on npm) last, from `scripts/logo_pill.py`.
5. **Render and look.** `node scripts/render.mjs cover.svg`, then read the full, card and Ko-fi PNGs. Fix anything that fails the checklist, then look once more.
6. **Deliver** the SVG (PNG only if the SVG is over ~150 KB, e.g. heavy pixel art) with alt text: one sentence saying what the picture shows. On mattblack.space (`mtblck/mb-portfolio`) that is `public/work/<slug>.svg` and the project's `cover` in `content/projects.json`, `{ "src": "/work/<slug>.svg", "alt": "…" }`, with `caption` only if the picture uses real product data worth naming. **If the project has no entry yet**, add a small one (`status` from what the project's site says, `case: null`, `links` to its live site), placed next to projects of the same kind, run `npm run content:check`, and list every field you had to guess (offer, summary, stack, tags) at the top of the PR for Matt to check. Elsewhere, put it where the site keeps its images and wire it the way that site does.
7. **Ko-fi PNG, every time.** `render.mjs` writes it as `<name>-kofi.png` (1600 × 900) for announcing the project or an update on Ko-fi. Read it to check the crop cut nothing that matters and the pills sit whole inside it. On mattblack.space copy it to `kofi/<slug>.png` (outside `public/`, so the site doesn't serve it); elsewhere, keep it next to the cover's source. Attach it to your reply so it can be uploaded to Ko-fi straight away, with the same alt text. Then open a PR with the SVG, the `cover` entry and the Ko-fi PNG.

## Patterns (pick the one that fits the verb)

| Pattern | When | Example |
|---|---|---|
| **Split** | The product transforms one thing into another | Inlay (`examples/inlay.svg`): the same badge, pixels on the left, traced shapes with their nodes on the right, divided by the compare handle |
| **Signature** | The product's output is itself visual and has a house style | Isogram (`examples/isogram.svg`): a cube bouncing across a plate in its glow look, earlier frames as onion skin, the landing frame lit, step bars below. Tinkerkit (`examples/tinkerkit.svg`): a pixel village tile map filling the frame, a road running up to the brass cursor laying its next tile, a small corner still unpainted. Avoid stock tech objects (a server, a laptop): they name the category, not the product |
| **Stand-in object** | The product organises or collects real-world things | Bot Collector (`examples/bot-collector.svg`): a vending machine stocked with toy robots, the brand-coloured one in the pickup tray. RetroRail (`examples/retrorail.svg`): a retro board, one card lifted out as the action item |
| **The name, drawn** | The name is an idiom or pun that already explains it | Does It Pencil (`examples/does-it-pencil.svg`): a house drawn in pencil on graph paper, the pencil resting where the line ends, a green check. Timeboxed (`examples/timeboxed.svg`): a square timer, the time left as a wedge |
| **Tool at work** | Utilities with an obvious physical analogue | Collated (`examples/collated.svg`): a messy pile of scans, an arrow, the same pages squared into a stack |

Avoid: browser windows and phone frames (that's a screenshot pretending), dashboards, charts with fake numbers, laptops, generic "AI sparkle", people.

## Style rules

- **Canvas** 1600 × 1000 (16:10), `viewBox="0 0 1600 1000"`, a `<title>` matching the alt text.
- **Full bleed** The picture fills the whole frame, edge to edge: no wide band of plain ground around a centred object. Make the subject a scene or surface that runs off the edges (the map, the desk, the cutting mat, the shelf the machine stands on) or draw the object large enough that it is cropped by the frame. Empty space is only allowed where it means something (the unpainted part of a canvas) and stays small, ≤ 25 % of the frame.
- **Safe area** The cover is shown with `object-cover` and cropped to 16:9 for Ko-fi (y 50–950), so the focal point (the accent) and the logo pill stay inside x 100–1500, y 150–850. Anything outside that is scene that may be cut.
- **Composition** One focal point, on or near the optical centre (slightly above the middle). Detail elsewhere in the scene stays quieter than the focal point.
- **Logo pill** Bottom-left corner: left edge at x ≈ 72, bottom edge at y ≈ 896, about 104 px tall, fully rounded. Fill is the product's darkest ground (its dark-mode paper, or near-black `#0b0d12` for a light-first brand), with an optional 3 px outline in a neutral token so it separates from dark scenes. Inside: the mark at ~62 % of the pill's height, then the wordmark in the site's brand font, colour and letter spacing, as paths (never `<text>`). Mark alone if the product has no wordmark. Keep the scene's focal point clear of it.
- **npm pill** If the project is published to npm, add a second pill in the bottom-right corner, mirroring the first (right edge x ≈ 1528, same bottom, height, fill and outline), holding only the npm logo in its own red: `scripts/logo_pill.py --npm`. No pill for other registries unless asked.
- **Ground** The scene is the ground. For flat areas use the product's paper (light) or its signature dark if the brand is dark-first. One faint texture is allowed when it belongs to the subject (graph paper for a calculator, a cutting mat for a tracer, a tile grid for a tile editor), at ≤ 10 % contrast.
- **Colour** Ground + ink + up to two neutrals + one accent, all from the product's tokens. Real materials (kraft, wood, graphite) may add up to two muted colours. Pixel art may use a two- or three-step shade ramp of each colour (grass, water, roof) without that counting against the limit. Semantic colour (a green "pass") counts as the accent if it's the verb. No gradients; one soft ground shadow at ≤ 12 % opacity is fine (shaped by the viewpoint rule below); a glow only when glow is the product's own look. The page the covers sit on should stay neutral so each cover can wear its own product's colours.
- **One viewpoint** Draw either strictly front-on (a flat elevation), straight top-down, or in true isometric, never a mix. Flaps, lids and shadows follow the same view: a flat bar under a front-on object, an iso footprint under an isometric one. A box flap or shadow "in perspective" on a front-on drawing reads as wrong immediately.
- **Form** Flat shapes with simple geometry and consistent corner radii. If line-drawn, one stroke weight for structure (≥ 4 px at 1600, ~1 px on a card) and one lighter for detail; round caps and joins. Pixel art uses `shape-rendering="crispEdges"` and one art-pixel size throughout (the pill's mark may differ).
- **Detail** Enough that it reads as made, never so much it reads as busy: at 380 px every part of the focal point should still be distinguishable. If a detail disappears at card size, cut it or enlarge it.
- **No other words** Apart from the logo pill and the npm pill: no text, numbers, third-party logos, trademarks or real product likenesses (invent robots, don't draw Optimus Prime; a generic house, not a Zillow card).
- **Motion** Covers are still. If the product is about motion, imply it: a lit packet mid-wire, a progress bar part-filled, a pencil at the end of its line.
- **Set consistency** Covers in one gallery share the pill's size and position, the safe area and stroke weight, and differ in palette and scene. That is what makes a wall of them feel curated rather than matched.

## Review checklist (read the full, card and Ko-fi PNGs)

- At 380 px: can you say what the product does from the picture alone? Is the accent the first thing the eye lands on, before the logo?
- The art fills the frame: no plain border or wide band of empty ground; any empty area means something and is ≤ 25 %.
- The focal point and logo pill sit inside the safe area (x 100–1500, y 150–850); the pill reads at card size and doesn't cover the focal point.
- A project on npm has the npm pill bottom right, level with the logo pill; one that isn't has none.
- The logo is the product's own: real mark, wordmark in the site's font and colour, drawn as paths.
- Colours match the product's tokens (check hex values against the brief); ≤ 6 colours plus materials and pixel-art shade ramps.
- No other text, logos or recognisable third-party designs.
- Alt text describes the picture plainly and mentions the logo ("A pixel village map, a road running up to a brass cursor laying the next tile, with the Tinkerkit logo bottom left"), not the product's marketing line.
- SVG under ~150 KB; it renders identically in Chromium at both sizes.
- The Ko-fi PNG is 1600 × 900, and the focal point and pills sit whole inside it.
