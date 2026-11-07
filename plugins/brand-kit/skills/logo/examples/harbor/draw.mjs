// Harbor: a read-it-later app ("everything you saved, safe in one place").
// Concept: a harbour mouth seen head-on, an arch you sail into, with a beacon
// light inside it. Built on a 256 grid: arch band 36 wide, legs to the
// baseline, beacon on the arch's centre line.
//
//   node draw.mjs            (writes the SVGs and brand.json next to this file)
//   node ../../scripts/export.mjs brand.json
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadFont, lockup, arcBand, rect, circle, svg, write } from '../../scripts/brand.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const out = (f) => join(here, f)

const C = { water: '#12324a', signal: '#f0643c', sand: '#f6f1e7', mist: '#cfe0ea' }

// ── The mark, 256 × 256 ──
// Outer radius 104 centred at (128, 128); band 36 → inner radius 68.
// Legs run from the arch's spring line (y = 128) to the baseline (y = 232).
const R = 104, BAND = 36, CY = 128, BASE = 232
const arch = arcBand(128, CY, R, BAND, 180, 360) + rect(128 - R, CY - 0.5, BAND, BASE - CY + 0.5) + rect(128 + R - BAND, CY - 0.5, BAND, BASE - CY + 0.5)
// Beacon: sits on the centre line, its top a little above the spring line so it
// reads as "inside the arch" rather than floating at the optical centre.
const beacon = circle(128, 158, 26)
const markBody = (archFill, beaconFill) => `<path d="${arch}" fill="${archFill}"/><path d="${beacon}" fill="${beaconFill}"/>`
const M = 256
// Trim to the art: the arch spans x 24–232 and y 24–232, so the mark's box is 208 square.
const trim = (body) => `<g transform="translate(-24 -24)">${body}</g>`
const mark = (a, b) => ({ body: trim(markBody(a, b)), w: 208, h: 208 })

write(out('mark.svg'), svg({ w: 208, h: 208, title: 'Harbor', body: mark(C.water, C.signal).body }))
write(out('mark-dark.svg'), svg({ w: 208, h: 208, title: 'Harbor', body: mark(C.sand, C.signal).body }))
// App-icon art sits on the Deep Water tile, so it uses the dark-ground colours.
// Favicon: same geometry; at 16 px the band is ~2.8 px, which still holds.
write(out('favicon.svg'), svg({ w: M, h: M, title: 'Harbor', body: `<rect width="256" height="256" rx="56" fill="${C.water}"/><g transform="translate(128 132) scale(0.78) translate(-128 -128)">${markBody(C.sand, C.signal)}</g>` }))

// ── Wordmark lockups ──
const font = await loadFont('Space Grotesk', 700)
for (const [layout, file] of [['horizontal', 'logo-horizontal'], ['stacked', 'logo-stacked']]) {
  for (const [suffix, a, word] of [['', C.water, C.water], ['-dark', C.sand, C.sand]]) {
    const l = lockup({ mark: mark(a, C.signal), font, name: 'Harbor', layout, color: word, tracking: -0.02 })
    write(out(`${file}${suffix}.svg`), svg({ w: l.w, h: l.h, title: 'Harbor', body: l.body }))
  }
}

write(
  out('brand.json'),
  JSON.stringify(
    {
      name: 'Harbor',
      tagline: 'Everything you saved, safe in one place.',
      about:
        'Harbor keeps the links, notes and files you save from everywhere in one calm, searchable place, and gets them back to you when you need them.\n\nThe mark is a harbour mouth seen head on: an arch for shelter and a single beacon inside it, the thing you saved, waiting where you left it.',
      construction:
        'On a 256 grid: an arch of outer radius 104 and band 36 whose legs run straight to the baseline, and a beacon of radius 26 on the centre line, its top just above the spring of the arch.',
      website: 'harbor.example',
      contact: { name: 'Avery Lin', role: 'Founder', email: 'avery@harbor.example', phone: '+1 555 0134' },
      colors: [
        { name: 'Deep Water', hex: C.water, role: 'primary', usage: 'The wordmark, headings and the brand field.' },
        { name: 'Signal', hex: C.signal, role: 'accent', usage: 'The beacon and one highlight per layout; never body text.' },
        { name: 'Sand', hex: C.sand, role: 'paper', usage: 'Backgrounds, and the mark on Deep Water.' },
        { name: 'Mist', hex: C.mist, role: 'support', usage: 'Panels, rules and quiet backgrounds.' },
      ],
      type: {
        display: { family: 'Space Grotesk', weight: 700 },
        text: { family: 'Inter', weight: 400 },
      },
      logos: {
        mark: { file: 'mark.svg', dark: 'mark-dark.svg', minWidth: 16 },
        horizontal: { file: 'logo-horizontal.svg', dark: 'logo-horizontal-dark.svg', minWidth: 96 },
        stacked: { file: 'logo-stacked.svg', dark: 'logo-stacked-dark.svg', minWidth: 64 },
      },
      icon: { file: 'mark-dark.svg', background: C.water, favicon: 'favicon.svg' },
      clearSpace: 0.25,
      out: 'dist',
    },
    null,
    2
  ) + '\n'
)
