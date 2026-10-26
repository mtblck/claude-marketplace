# linewash

One skill, `linewash`: spot illustrations in a single house style for empty
states, error and 404 pages, onboarding steps and success screens. One bold
ink line with round caps, pale two-tone washes of that ink for shading, a pale
backdrop circle, small floating hexagons, pluses and rings, and a short ground
line with dashed fragments under it.

- `scripts/kit.mjs` is the drawing kit, so every piece is computed by a short
  script with the same weights and tints instead of hand-typed paths. Pass
  `scene({ ink: '#hex' })` to recolour the whole style for another brand.
- `scripts/render.mjs` renders a piece at 2× and at 240 px for review.
- `examples/` holds four pieces and their scripts: empty inbox, no search
  results, offline, and all set.

Modelled on a reference illustration Matt supplied (a sinking ship on an error
page); the examples are original drawings, not copies of it.
