# Brand templates

The rules `templates.mjs` builds by, and the ones to follow when changing its output or making a template by hand. Every template takes its logo, colours and typefaces from `brand.json`; none of them redraws the logo.

Shared rules:

- **One field colour.** Each template uses the brand colour (`templates.background`, default the primary) or the paper colour as its ground, never a gradient or a photo behind text. The accent appears once per piece, on a small element.
- **The logo version follows the ground.** Normal logo on paper, dark version on the brand colour. Never put the normal logo on a dark field.
- **Type from the brand.** Headings in the display face, everything else in the text face, both from `brand.json`. Set text as live text, not images of text, so it can be edited and read by screen readers.
- **Placeholder copy describes itself.** Samples say what goes there ("Your Name", "A slide with a few points") and, where it helps, the rule ("Six points at most"), so a template teaches its own use.

## Email signature

Email clients are the most hostile place a brand goes: Gmail strips `<style>` and data URIs, Outlook renders with Word, and dark mode inverts colours without asking.

| Rule | Why |
| --- | --- |
| One `<table>` with inline styles only; no `<style>`, classes, flex, grid or background images | Gmail, Outlook and mobile clients drop or ignore the rest |
| Logo as a PNG at 2× its display size (shown at 48–64 px), from an absolute `https://` URL, with `width`, `height`, `alt` and `border="0"` | SVG doesn't render in Gmail or Outlook; pasted local or data-URI images get dropped or attached as files |
| The logo sits on its own solid tile (the app-icon art) | Dark mode turns the background dark; a transparent dark logo disappears |
| Font stack: brand face first, then Arial, Helvetica, sans-serif | Web fonts load only in Apple Mail and iOS; everyone else gets the fallback, so the layout must not depend on the face |
| Name 15 px bold, role 13 px, details 13 px, line height about 1.45; text in the ink colour, links in a brand colour with 4.5:1 on white | Small enough to sit under a message, large enough on a phone |
| Three to five lines: name, role and company, then email, phone and website. No quotes, banners, legal text or rows of social icons unless asked | Signatures repeat on every message in a thread |
| A plain-text version alongside | For clients and replies that strip HTML |

Install: host `logo.png`, set `templates.email.logoUrl`, export again, open `signature.html` in a browser, select all, copy, and paste into Gmail (Settings › Signature), Apple Mail (Settings › Signatures) or Outlook (Settings › Mail › Compose and reply).

## Business card

| Spec | US | Europe / ISO |
| --- | --- | --- |
| Trim | 3.5 × 2 in | 85 × 55 mm |
| Bleed | 0.125 in on every side | 3 mm |
| Safe area | 0.125 in inside the trim (the export keeps 0.25 in) | 3–4 mm |
| File | 3.75 × 2.25 in PDF, one page per side | 91 × 61 mm |

- **Front** is the brand: the logo alone, optically centred, on the brand colour full bleed. The horizontal lockup takes about half the card's width; a mark alone about 0.7 in.
- **Back** is the person: name in the display face at 10–11 pt, role at 7.5 pt, then at most four contact lines at 7.5 pt, left-aligned on one margin, with a small mark opposite. Nothing under 6.5 pt, and no rules thinner than 0.25 pt.
- **Print** Flat colour areas reproduce most consistently. The PDF is RGB with fonts embedded and the logo as vectors; most online printers convert it, but colour shifts, so order a proof or give the printer the CMYK values from the guidelines. For a large black area ask for rich black (C60 M40 Y40 K100), and keep small text in plain black.
- Don't add crop marks unless the printer asks: the page size already includes the bleed.

## Slides

| Spec | Value |
| --- | --- |
| Size | 16:9, 13.333 × 7.5 in (1920 × 1080 px) |
| Margins | 0.75 in on every side; nothing but full-bleed colour goes outside them |
| Titles | display face, 36–40 pt on content slides, 54–60 pt on title slides, sentence case |
| Body | text face, 20–24 pt, never under 18 pt; at most six points of two lines each |
| Footer | brand name and slide number, 11 pt, at the bottom margin |

- **Layouts** Title, Section, Content, Two columns, Statement, Closing. Six layouts cover almost every talk; more become a choice nobody makes.
- **Colour** Title, section and closing slides on the brand colour; content slides on paper so charts and screenshots sit on a calm ground. The accent marks one thing per slide at most.
- **Logo** The full lockup on the title and closing slides; on content slides only the small mark in one corner (about 0.4 in), or nothing. Never a large logo on every slide.
- **File** An editable `.pptx` with each layout as a slide master and real placeholders, so new slides keep the design. It opens in PowerPoint, Keynote and Google Slides. Fonts are referenced by name: Google Slides has every Google Font; PowerPoint and Keynote need the font installed, or they substitute.

## Social and Ko-fi

| Image | Size | Keep clear |
| --- | --- | --- |
| Link preview (Open Graph) | 1200 × 630 | outer 5 %: some sites crop to 1.91:1 or square |
| Square post (Instagram, Ko-fi, LinkedIn, Bluesky) | 1080 × 1080 | — |
| Portrait post (Instagram) | 1080 × 1350 | grid crops to 4:5 or square: keep text central |
| Story / Reel | 1080 × 1920 | top 250 px and bottom 300 px sit under the app's controls |
| Ko-fi cover | 1200 × 400 (3:1) | sides crop on phones: keep content in the middle 800 px |
| X header | 1500 × 500 | the profile picture covers the bottom left; keep content centre and right |
| Avatar | 800 × 800 | most sites crop to a circle: keep art inside the middle 70 % |

- **One message per image.** A headline of eight words or fewer in the display face, at least 64 px on a 1080 canvas, with an optional short kicker above it in the accent.
- **Logo small and consistent.** The dark lockup in the same corner on every post, about 6 % of the width tall; it signs the post, it isn't the post.
- **Same ground, same bar.** Brand-colour field with the accent bar along the bottom edge (the link-preview image shares the bar), so a feed of posts reads as one set.
- **Blank versions** of each size (field, logo and bar, no text) are exported for designing posts in Canva, Figma or Keynote.
