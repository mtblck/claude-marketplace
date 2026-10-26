---
name: linewash
description: Draw spot illustrations in the linewash style, as SVG, for empty states, error and 404 pages, onboarding, success screens and feature cards: one bold steel-blue outline with round caps, pale two-tone washes for shading, a pale backdrop circle, small floating accents and dashed ground lines.
---

# linewash

A linewash illustration is one everyday object drawn in a single bold ink line, filled with pale washes of that same ink, standing on a short ground line with a pale circle behind it and a few small shapes floating around it. It sits above a heading on an empty state, an error page or an onboarding step, at ~240–400 px wide, and has to read at both.

## The idea in three lines

1. **One line colour, one weight.** Every outline is the same ink at the same thickness with round caps and joins. Fills are that ink mixed into white, never another hue.
2. **Shade with washes, not lines.** Form comes from a soft two-tone blend inside each shape (light side to shade side) and a pale diagonal glint, never hatching or a darker outline.
3. **One object, one moment.** The object is caught in the moment the screen describes (a plug pulled out, a tray left empty, a rocket just lifting off). No people, no words.

## Files

Paths are relative to this skill's folder.

| File | Use |
|---|---|
| `scripts/kit.mjs` | The drawing kit: `scene()`, the shape helpers `rr`, `circ`, `poly`, `path`, and the style pieces (`shape`, `line`, `backdrop`, `accents`, `dashes`, `waterline`, `group`). Import it from a short script; never hand-type the SVG. |
| `scripts/render.mjs` | `node scripts/render.mjs art.svg [--out DIR]` writes `art.png` (2×) and `art-thumb.png` (240 px wide). Uses Playwright only if a Chromium is already installed; exit 2 means no browser here, so open the SVG instead. |
| `examples/*.mjs` + `.svg` | Four finished pieces and the scripts that drew them: `inbox` (empty inbox), `search` (no results), `offline` (connection lost), `launch` (all set). Read the closest one before drawing. |

## Workflow

1. **Name the moment.** One sentence: *what object, in what state, means this screen.* "Nothing here yet" is an empty container; "something broke" is a thing pulled apart, tipped over or sinking; "done" is a thing launched, sealed or ticked. Pick the everyday object over the abstract one.
2. **Palette.** The default ink is steel blue `#4a82b0`. For a product with its own brand colour, pass `scene({ ink: '#4a82b0' })` (a 3- or 6-digit hex) and the washes are derived from it. Use a mid-dark, slightly muted ink (contrast ≥ 3:1 on white); a neon or very light ink won't hold the line.
3. **Draw** an 800 × 600 script modelled on the closest example. Write it in the project (or the scratchpad), import the kit by its absolute path in this skill's folder (`import { scene, rr } from '/abs/path/to/scripts/kit.mjs'`) and write the SVG to a path in the project, not next to the kit. Order: backdrop circle first, then back-to-front parts, then accents, then the ground line and dashes. Shapes are `s.shape(geom, { fill, shade, glint })`; details inside them are `s.line(d, { weight: 0.75 })`.
4. **Render and look.** `node scripts/render.mjs art.svg`, read both PNGs, fix what fails the checklist below, look once more.
5. **Deliver** the SVG with alt text (one sentence saying what it shows, the same as its `<title>`), placed where the site keeps its images. Give `alt=""` instead when the heading next to it already says everything. For several screens in one product, draw them as a set: same ink, same canvas, same ground line height.

## Style rules

- **Canvas** 800 × 600 (4:3), white ground. Subject centred a little above the middle, about 40–50 % of the width; the ground line sits around y = 390–420. Keep 80 px clear at every edge.
- **Line** One structural weight (`s.weight`, ~3.5 at 800 wide) for every outline; `0.75×` for inner details (seams, text lines on a page, sparks). Round caps and joins always. No outlines on the backdrop or the accents.
- **Colour** Ink plus four tints of it: `wash` (shade side, ~24 % ink), `mist` (main fill, ~13 %), `haze` (backdrop and faint shapes, ~8 %), `paper` (white, for glints and the brightest faces). Nothing else. A solid ink fill only for tiny parts (socket holes, rivets, terminal dots).
- **Shading** `shade` is a soft blend from the shape's fill to `wash`, light from the upper left: `angle: 0` shades the right side, `90` the bottom, in between for round things. Keep `soft` at 0.2–0.5 so it reads as two tones, not a gradient ramp. One or two thin `glint` bands on the larger shapes, set toward the lit side.
- **Form** Flat, front-on or a gentle three-quarter view; no perspective, no isometric. Rounded corners at a consistent radius per object. Draw what the object is made of (a lid, a seam, a hinge) but stop well before it gets busy.
- **Backdrop** One pale `haze` circle, behind and slightly off to one side of the subject (upper right by default), roughly the subject's height. The subject may overlap it.
- **Accents** Five or six small shapes floating around the backdrop (hexagon, plus, ring, spark, play triangle, dot) in `wash`, sizes 4–12. Two or three tiny ones near the ground: a ring in `wash`, dots in ink. Never on top of the subject.
- **Ground** A `waterline`: a dot, a short lead, a flat or gently waved line, a dot. Under it, two rows of `dashes` in varied lengths, centred under the subject and shorter than the line. Water gets waves; a floor stays flat.
- **No words** No text, numbers, logos or recognisable products in the drawing. The heading and copy belong in the page (set them in the ink colour or a neutral grey).
- **Still** It's a still illustration. If it is ever animated, only the accents drift and the subject bobs; respect reduced motion.

## Review checklist (read both PNGs)

- At 240 px: can you tell what the object is and what state it's in? Do the outlines still read as one weight?
- Only the ink and its four tints (grep the SVG for `#` values); every outline the same width apart from detail lines.
- The shading reads as light from the upper left on every shape; no shape is a flat fill if it's bigger than an accent.
- Accents float in the space around the subject and backdrop, not over it; the dashes are shorter than the ground line and centred.
- No text, logos or real products; `<title>` matches the alt text; the SVG is under ~20 KB.
