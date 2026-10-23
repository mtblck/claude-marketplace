---
name: cover-art
description: Make a minimalist, representational 16:10 cover illustration for a website, app, extension or Claude skill from its repo or URL, for portfolio cards, case-study heroes and project thumbnails.
---

# cover-art

A cover is a small flat illustration that says what a project *does*, drawn in the project's own colours, and nothing else. Not a screenshot, not a logo, not a mock-up of the UI. It sits on a portfolio card at ~360 px wide and as a case-study hero at ~1200 px, and has to work at both.

## The idea in three lines

1. **One verb, one picture.** Find the single thing the product does to something (traces pixels into shapes, collects figures, checks whether a deal works) and draw that act, or its result, as one object or one before/after.
2. **The product's own colours.** Background, ink and one accent come from the app's design tokens. The accent goes only on the part of the picture that *is* the verb.
3. **Readable at a glance.** No words, nothing that needs a caption, one focal point, legible at 320 px wide.

## Files

Paths are relative to this skill's folder.

| File | Use |
|---|---|
| `scripts/render.mjs` | `node scripts/render.mjs cover.svg [--out DIR]` writes `cover.png` (1600 × 1000) and `cover-card.png` (380 × 238). Uses Playwright only if a Chromium is already installed and never installs one; exit 2 means no browser here, so open the SVG instead. |
| `examples/*.svg` | Seven finished covers, one or more per pattern below. Open two or three before drawing to match their margin, subject size and stroke weight. |

## Workflow

1. **Find the source.** Take a repo (preferred) or URL. If the live site can't be reached from here, use the repo: it holds everything below. For a private repo, attach it first.
2. **Discovery.** Read, in this order, and stop when you have the brief:
   - `README.md`, `CLAUDE.md`, `docs/overview*`, the landing page source (`index.astro`, `page.tsx`, `index.html`, `site/`), and any case-study text the portfolio already has for it (for example `content/projects.json` in `mtblck/mb-portfolio`).
   - Design tokens: grep CSS for custom properties (`--paper`, `--ink`, `--accent`, `--primary`, DaisyUI or Tailwind theme blocks, `@theme`). Note light and dark sets.
   - The logo, favicon and the hero visual if one exists. **A hero visual the product already uses is the strongest starting point** (Inlay's pixels/shapes split, Isogram's isometric figures).
   - Write the brief in five lines: *what it does (one verb)*, *who it's for*, *what it acts on*, *signature visual if any*, *palette* (ground, ink, 1–2 neutrals, accent, as hex).
3. **Concepts.** Write three one-line concepts, each from a different pattern below, pick one and say why in a sentence. If the user is around, show all three; otherwise go with the pick. When the user suggests an object, draw it, and if it's a hard one draw two or three takes side by side at card size so they can choose by eye.
4. **Draw** a 1600 × 1000 SVG with a script (Python or JS) rather than hand-typed paths, so geometry is computed and repeatable. Use the product's real assets where they help: its sample image, its own trace, its icon geometry.
5. **Render and look.** `node scripts/render.mjs cover.svg`, then read both PNGs. Fix anything that fails the checklist, then look once more.
6. **Deliver** the SVG (PNG only if the SVG is over ~150 KB, e.g. heavy pixel art) with alt text: one sentence saying what the picture shows. On mattblack.space (`mtblck/mb-portfolio`) that is `public/work/<slug>.svg` and the project's `cover` in `content/projects.json`, `{ "src": "/work/<slug>.svg", "alt": "…" }`, with `caption` only if the picture uses real product data worth naming. Elsewhere, put it where the site keeps its images and wire it the way that site does. Open a PR.

## Patterns (pick the one that fits the verb)

| Pattern | When | Example |
|---|---|---|
| **Split** | The product transforms one thing into another | Inlay (`examples/inlay.svg`): the same badge, pixels on the left, traced shapes with their nodes on the right, divided by the compare handle |
| **Signature** | The product's output is itself visual and has a house style | Isogram (`examples/isogram.svg`): a cube bouncing across a plate in its glow look, earlier frames as onion skin, the landing frame lit, step bars below. Avoid stock tech objects (a server, a laptop): they name the category, not the product |
| **Stand-in object** | The product organises or collects real-world things | Bot Collector (`examples/bot-collector.svg`): a vending machine stocked with toy robots, the brand-coloured one in the pickup tray. RetroRail (`examples/retrorail.svg`): a retro board, one card lifted out as the action item |
| **The name, drawn** | The name is an idiom or pun that already explains it | Does It Pencil (`examples/does-it-pencil.svg`): a house drawn in pencil on graph paper, the pencil resting where the line ends, a green check. Timeboxed (`examples/timeboxed.svg`): a square timer, the time left as a wedge |
| **Tool at work** | Utilities with an obvious physical analogue | Collated (`examples/collated.svg`): a messy pile of scans, an arrow, the same pages squared into a stack |

Avoid: browser windows and phone frames (that's a screenshot pretending), dashboards, charts with fake numbers, laptops, generic "AI sparkle", people.

## Style rules

- **Canvas** 1600 × 1000 (16:10), `viewBox="0 0 1600 1000"`, a `<title>` matching the alt text. The cover is shown with `object-cover` so nothing may depend on the outer edges: keep a 100 px safe margin.
- **Composition** One subject, centred on the optical centre (slightly above the middle), filling 50–65 % of the width. Empty ground is part of the design; don't fill it.
- **Ground** A flat fill: the product's paper (light) or its signature dark if the brand is dark-first. One faint texture is allowed when it belongs to the subject (graph paper for a calculator, a cutting mat for a tracer), at ≤ 10 % contrast.
- **Colour** Ground + ink + up to two neutrals + one accent, all from the product's tokens. Real materials (kraft, wood, graphite) may add up to two muted colours. Semantic colour (a green "pass") counts as the accent if it's the verb. No gradients; one soft ground shadow at ≤ 12 % opacity is fine (shaped by the viewpoint rule below); a glow only when glow is the product's own look. The page the covers sit on should stay neutral so each cover can wear its own product's colours.
- **One viewpoint** Draw either strictly front-on (a flat elevation) or in true isometric, never a mix of the two. Flaps, lids and shadows follow the same view: a flat bar under a front-on object, an iso footprint under an isometric one. A box flap or shadow "in perspective" on a front-on drawing reads as wrong immediately.
- **Form** Flat shapes with simple geometry and consistent corner radii. If line-drawn, one stroke weight for structure (≥ 4 px at 1600, ~1 px on a card) and one lighter for detail; round caps and joins.
- **Detail** Enough that it reads as made, never so much it reads as busy: at 380 px every part should still be distinguishable. If a detail disappears at card size, cut it or enlarge it.
- **No words** No text, numbers, logos, trademarks or real product likenesses (invent robots, don't draw Optimus Prime; a generic house, not a Zillow card).
- **Motion** Covers are still. If the product is about motion, imply it: a lit packet mid-wire, a progress bar part-filled, a pencil at the end of its line.
- **Set consistency** Covers in one gallery share margin, subject size and stroke weight, and differ in palette. That is what makes a wall of them feel curated rather than matched.

## Review checklist (read both PNGs)

- At 380 px: can you say what the product does from the picture alone? Is the accent the first thing the eye lands on?
- Nothing touches the safe margin; the subject isn't small and lost or cramped to the edges.
- Colours match the product's tokens (check hex values against the brief); ≤ 6 colours plus materials.
- No text, logos or recognisable third-party designs. No stray elements outside the subject.
- Alt text describes the picture plainly ("A house drawn in pencil on graph paper, the pencil resting at the end of its line, with a green check"), not the product's marketing line.
- SVG under ~150 KB; it renders identically in Chromium at both sizes.
