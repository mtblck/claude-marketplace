# cover-art

One skill, `cover-art`: a full-bleed, representational cover illustration for a
website, app, extension or Claude skill, with the project's logo in a dark pill
bottom left. Give it a repo (or a URL) and it reads
the project's purpose, design tokens and any hero visual, finds its logo and brand font, picks one of five
concept patterns, draws a 1600 × 1000 SVG with a script, checks it at full and
card size, and delivers it with alt text, plus a 1600 × 900 Ko-fi PNG of the
same cover for announcing the project or an update.

The rule it works from is "one verb, one picture": draw the one thing the
product does, in the product's own colours, with the accent only on that part.

- `scripts/render.mjs` renders a cover at 1600 px and 380 px for review, and
  the 16:9 Ko-fi PNG.
- `scripts/logo_pill.py` draws the logo pill: the project's mark and its
  wordmark set in the brand font as paths, and (`--npm`) the npm pill a
  project on npm gets bottom right.
- `examples/` holds covers made for mattblack.space: Tinkerkit in the current
  full-bleed, logo-pill style, and seven earlier ones made while the style guide
  was worked out (Inlay, Collated, Bot Collector, Timeboxed, RetroRail, isogram,
  Does It Pencil), which are centred and have no logo.

## Changes

- 1.2.0: covers fill the frame (no wide plain border) and carry the project's
  logo in a dark pill bottom left, and projects on npm an npm pill bottom right;
  `logo_pill.py`; a safe area for the focal
  point and pill that also fits the Ko-fi crop; guidance for a project missing
  from the portfolio, for a separate site repo, and for pixel-art shade ramps.

Written for Matt's portfolio first (mattblack.space), so the delivery step names
its `cover` field, but nothing else is specific to it.
