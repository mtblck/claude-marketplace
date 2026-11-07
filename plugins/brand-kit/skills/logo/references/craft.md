# Logo craft

The rules `logo` draws by. Read the section you need: before drawing, before lockups, before icons.

## Choosing the structure

| Structure | When it fits | Watch out for |
|---|---|---|
| **Symbol + wordmark** | Most products: the symbol becomes the app icon and favicon, the lockup does the rest | Two ideas in one logo. The symbol carries the idea; the wordmark stays plain |
| **Lettermark / monogram** | Long names, or names whose initial is distinctive | An initial in a circle is not a concept. Find something the letter can *do* |
| **Wordmark only** | Short, distinctive names; editorial or fashion voice | It still needs a favicon: take one letter, or the word's distinctive detail |
| **Wordmark with one modified letter** | The idea lives in a letter (a counter becomes a lens, a stem becomes a pin) | Modify one letter only, and keep it readable as that letter |
| **Abstract mark** | The product is abstract (infrastructure, finance, a platform) | Generic blobs and swooshes. Base it on a real property of the product, like flow, layers or a grid |
| **Emblem / badge** | Crafts, food and drink, clubs, heritage | Detail that dies at small sizes: make a simplified inner mark for icons |

## Construction

- **Grid** Draw a symbol on a 256 × 256 grid and trim the final `viewBox` to the art's bounds (the `harbor` example trims to 208). Coordinates are integers or halves; only computed curve points may carry two decimals.
- **Shape vocabulary** Circles, arcs (`arcBand`), rectangles with one shared radius, regular polygons (`ngon`), and straight cuts at 0/15/30/45/60/90°. A logo that uses three of these reads as designed; one that uses all of them reads as noise.
- **Weights** One structural thickness for every band and stem (say 32–40 on a 256 grid for a bold mark, 20–24 for a light one), and at most one secondary thickness at about half of it. Two weights that differ by under 20 % look like a mistake.
- **Radii** One corner radius for the whole logo, or zero. Inner corners of a band are its outer radius minus its width.
- **Holes and overlaps** Holes are subpaths with `fill-rule="evenodd"` (or cut out of the geometry). Never paint a shape in the background colour to fake a hole: the one-colour and dark versions will expose it.
- **Strokes** Fine while sketching, but outline them before export: everything in the final SVG is a filled path. Use `arcBand`, `rect` and `poly` to draw thick lines as shapes from the start.
- **Optical corrections** Round and pointed shapes overshoot the flat ones by 1–3 % (a circle next to a square is drawn slightly larger, and a triangle's apex pokes past the line). Horizontal bars are drawn about 5–10 % thinner than vertical stems to look equal. The visual centre of a mark sits slightly above the geometric centre. Triangles and asymmetric marks need nudging toward their heavy side to look centred in a tile.
- **Near-misses** Either align things exactly or offset them clearly (by at least a stroke width). Edges 2 units apart, or tangents that almost touch, look like errors at every size.
- **Tiny parts** Anything thinner or smaller than about 1/32 of the mark's height (8 units on 256) vanishes at 16–32 px. Enlarge it, merge it, or drop it from the favicon version.

## Type

- **Voice first** Match the face to the brief's adjectives using the groups in `typefaces.json`, then choose by eye on the specimen sheet.
- **Customise lightly** In order of effort: set tracking (wordmarks in bold weights usually want −1 to −3 %, all-caps wants +4 to +10 %); choose case; swap in an alternate; modify one letter (cut a terminal, join two letters, replace a counter with the symbol). Redrawing the whole word is a bigger job than it looks: avoid it unless asked.
- **Spacing** Kerning comes from the font, but check the classic gaps (`r` before a round letter, `T`, `V`, `W`, `Y`, `A`, `L` next to anything) and fix them by splitting the word: `text()` on parts and position them by hand.
- **Pairing** One family for the wordmark and headings; a text face for body copy that is calmer than it (see the group's `text` list). A serif display face pairs with a sans text face more often than the other way round. Never more than two families.
- **Licensing** Every face in `typefaces.json` is SIL OFL or Apache 2.0, which allow outlined use in a logo. For any other font, check its licence on fonts.google.com or the foundry's site before using it.

## Lockups

- **Horizontal** The word's cap height is 40–55 % of the mark's height (`capRatio`, default 0.46), centred on the mark's vertical middle. The gap is 25–40 % of the mark's height (default 0.32).
- **Mark as a letter** A solid, simple mark (a square, a circle) can instead sit at exactly the cap height, top on the capitals and bottom on the baseline, with a gap of about 40 % of the cap height: `lockup({ capRatio: 1, gap: 0.4 })`. It reads as the word's first letter and keeps the lockup compact. Render both options side by side and choose by eye; keep the larger-mark version for the stacked lockup.
- **Stacked** The word centred under the mark, cap height about 30 % of the mark's width, gap about a third of the mark.
- **Balance** Neither half should dominate. If the mark looks heavier, shrink it slightly or step the wordmark up a weight; don't change the mark's internal proportions.
- **Clear space** Default 25 % of the mark's height on every side (`clearSpace` in `brand.json`). Minimum widths: mark 16 px, horizontal 96 px, stacked 64 px unless the check sheet says otherwise.

## Colour

- Start from the product's existing tokens. If there are none, choose a primary colour from the brief's adjectives (deep blue reads trustworthy, green growth, warm reds and oranges energy, black and white editorial), then add one accent with a clearly different hue and lightness, a paper (warm or cool off-white) and a dark.
- The primary colour carries the wordmark, so it needs 4.5:1 or more on white; the guidelines show each contrast ratio.
- The accent goes on one part of the mark, the part that carries the idea (Harbor's beacon).
- The dark version swaps the primary colour for the paper and keeps the accent if it still has 3:1 or more against the dark. If not, lighten the accent for the dark version.
- Every logo also exists in pure black and pure white. `export.mjs` makes these by recolouring every fill, which is why holes must be real holes.

## Icons

- **Favicon** At 16 px only the silhouette survives. If the mark has fine detail, draw a `favicon.svg` with the detail enlarged or removed, often on a rounded tile in the primary colour so it holds up in both light and dark tabs (`icon.favicon`, or `icon.faviconBackground` to have the export add the tile).
- **App icon** The art fills about 60–65 % of the tile (`icon.scale`, default 0.62) on an opaque background. iOS adds its own rounded corners, so `app-icon-1024.png` and `apple-touch-icon.png` are square and opaque.
- **Maskable (Android)** Launchers crop to a circle, squircle or other shape, so the art stays inside the central 80 % circle: `icon.maskableScale`, default 0.5. Check the circle crop on `check.png`.
- **Tile colour** Usually the primary colour with the dark or reversed mark on it, or paper with the normal mark. A white tile with a thin mark looks unfinished on a home screen.

## Things that make a logo look AI-made

Generic gradients and glows, a symbol made of a dozen small parts, a "tech" hexagon or circuit trace, a lightbulb for ideas, a speech bubble for chat, a leaf for anything green, a wordmark in the default weight with no tracking adjustment, and three colours of similar weight. Avoid all of them unless the brief explicitly calls for one, and even then do something specific with it.
