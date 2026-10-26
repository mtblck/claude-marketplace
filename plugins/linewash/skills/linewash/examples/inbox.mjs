// Empty inbox: an open tray with nothing in it, a paper plane leaving on a dashed trail.
import { writeFileSync } from 'node:fs'
import { scene, rr, poly } from '../scripts/kit.mjs'

const s = scene({ w: 800, h: 600 })
s.backdrop(520, 175, 82)

// tray: back wall, then the front with its notch
s.shape(rr(285, 250, 230, 120, 14), { fill: 'paper' })
s.line('M305 285H495', { weight: 0.75 })
s.shape(poly([[270, 300], [345, 300], [362, 326], [438, 326], [455, 300], [530, 300], [530, 372], [270, 372]], { r: 12 }), {
  fill: 'mist', shade: { angle: 20, at: 0.6, soft: 0.35 }, glint: { at: 0.16, width: 0.05, angle: -60 },
})

// paper plane and its trail
s.line('M255 238C300 200 330 222 372 196C402 178 420 160 446 150', { weight: 0.75, dash: [2.2, 3] })
s.shape(poly([[486, 160], [548, 112], [500, 186]], { r: 4 }), { fill: 'wash' })
s.shape(poly([[450, 146], [548, 112], [486, 160]], { r: 4 }), { fill: 'paper' })

s.accents([['hex', 600, 222, 10], ['plus', 618, 168, 7], ['ring', 432, 98, 8], ['spark', 584, 96, 7], ['tri', 620, 270, 7], ['dot', 452, 218, 4]])
s.waterline(200, 600, 392, { flat: true })
s.dashes([[430, [[300, 330], [350, 450], [470, 520]]], [462, [[370, 440]]]])
s.accents([['ring', 272, 432, 6, 'wash'], ['dot', 250, 470, 4, 'ink'], ['dot', 540, 470, 3.5, 'ink']])

writeFileSync(new URL('inbox.svg', import.meta.url), s.svg('An empty inbox tray with a paper plane flying away from it on a dashed trail'))
