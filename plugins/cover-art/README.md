# cover-art

One skill, `cover-art`: a minimalist, representational cover illustration for a
website, app, extension or Claude skill. Give it a repo (or a URL) and it reads
the project's purpose, design tokens and any hero visual, picks one of five
concept patterns, draws a 1600 × 1000 SVG with a script, checks it at full and
card size, and delivers it with alt text.

The rule it works from is "one verb, one picture": draw the one thing the
product does, in the product's own colours, with the accent only on that part.

- `scripts/render.mjs` renders a cover at 1600 px and 380 px for review.
- `examples/` holds the seven covers made for mattblack.space while the style
  guide was worked out (Inlay, Collated, Bot Collector, Timeboxed, RetroRail,
  isogram, Does It Pencil).

Written for Matt's portfolio first (mattblack.space), so the delivery step names
its `cover` field, but nothing else is specific to it.
