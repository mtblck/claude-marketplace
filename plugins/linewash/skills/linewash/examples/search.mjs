// No results: a magnifying glass over a blank page, the page's lines stopping short.
import { writeFileSync } from 'node:fs'
import { scene, rr, circ, poly } from '../scripts/kit.mjs'

const s = scene({ w: 800, h: 600 })
s.backdrop(500, 190, 96)

// a second page behind, then the page
s.shape(rr(318, 168, 160, 206, 14), { fill: 'mist' })
s.shape(poly([[296, 150], [418, 150], [458, 190], [458, 356], [296, 356]], { r: 14 }), {
  fill: 'paper', shade: { angle: 0, to: 'mist', at: 0.7, soft: 0.5 },
})
s.shape(poly([[418, 150], [418, 190], [458, 190]], { r: 4 }), { fill: 'wash' })
s.line('M322 196H380M322 222H398M322 248H362', { weight: 0.75 })
s.line('M322 300H352', { weight: 0.75 })

// magnifier: handle first, then the rim, then the lens on top
s.group('rotate(45 470 300)', () => {
  s.shape(rr(462, 360, 22, 92, 11), { fill: 'mist', shade: { angle: 0, at: 0.6, soft: 0.2 } })
  s.line('M466 378H480', { weight: 0.75 })
})
s.shape(circ(458, 288, 68), { fill: 'mist', shade: { angle: 45, at: 0.5 } })
s.shape(circ(458, 288, 50), { fill: 'haze', glint: { at: 0.32, width: 0.09, angle: -45 } })
s.line('M444 274L472 302M472 274L444 302', { weight: 0.9 })

s.accents([['hex', 620, 160, 11], ['plus', 594, 118, 7], ['ring', 610, 230, 9], ['dot', 268, 140, 4], ['spark', 250, 200, 8]])
s.waterline(190, 610, 418, { flat: true })
s.dashes([[452, [[280, 300], [322, 470], [492, 540]]], [484, [[350, 410], [428, 450]]]])
s.accents([['dot', 236, 486, 4, 'ink'], ['ring', 574, 488, 6]])

writeFileSync(new URL('search.svg', import.meta.url), s.svg('A magnifying glass with a cross in its lens held over a nearly blank page'))
