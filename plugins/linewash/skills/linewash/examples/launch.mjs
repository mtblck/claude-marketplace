// All set: a small rocket lifting off from a puff of cloud.
import { writeFileSync } from 'node:fs'
import { scene, rr, circ, poly, path } from '../scripts/kit.mjs'

const s = scene({ w: 800, h: 600 })
s.backdrop(470, 170, 90)

const body = path('M400 96C436 124 450 170 450 222V300H350V222C350 170 364 124 400 96Z', [350, 96, 100, 204])
// fins behind the body
s.shape(poly([[350, 240], [314, 290], [314, 318], [350, 300]], { r: 6 }), { fill: 'wash' })
s.shape(poly([[450, 240], [486, 290], [486, 318], [450, 300]], { r: 6 }), { fill: 'wash' })
// flame
s.shape(path('M372 300H428C428 330 414 344 400 366C386 344 372 330 372 300Z'), { fill: 'paper' })
s.shape(body, { fill: 'mist', shade: { angle: 0, at: 0.62, soft: 0.25 }, glint: { at: 0.26, width: 0.06, angle: -75 } })
s.line('M364 150H436', { weight: 0.75 })
s.shape(circ(400, 200, 22), { fill: 'paper', glint: { at: 0.3, width: 0.12 } })
s.line('M372 270H428', { weight: 0.75 })
s.shape(rr(366, 300, 68, 12, 6), { fill: 'wash' })

// cloud puff on the pad
s.shape(path('M300 396C286 396 280 380 292 370C290 352 312 344 324 356C332 336 362 336 368 356C376 344 394 346 398 360C410 340 444 344 446 364C458 354 482 362 476 380C490 382 492 396 478 396Z', [280, 336, 212, 60]), {
  fill: 'paper', shade: { angle: 90, to: 'mist', at: 0.6 },
})

s.accents([['hex', 566, 210, 11], ['plus', 576, 128, 8], ['ring', 272, 150, 9], ['spark', 300, 92, 8], ['tri', 552, 270, 7], ['dot', 246, 230, 4]])
s.waterline(170, 630, 400, { flat: true })
s.dashes([[436, [[280, 300], [322, 470], [492, 520]]], [468, [[360, 420], [438, 452]]]])
s.accents([['ring', 556, 470, 6], ['dot', 246, 470, 4, 'ink']])

writeFileSync(new URL('launch.svg', import.meta.url), s.svg('A small rocket lifting off from a puff of cloud on its launch pad'))
