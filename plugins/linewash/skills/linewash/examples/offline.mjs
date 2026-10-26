// Offline: a plug pulled out of its socket, two short spark lines in the gap.
import { writeFileSync } from 'node:fs'
import { scene, rr } from '../scripts/kit.mjs'

const s = scene({ w: 800, h: 600 })
s.backdrop(400, 230, 120)

// cables
s.line('M120 330C190 330 210 262 262 262H286')
s.line('M698 330C628 330 600 262 548 262H520')

// plug, left
s.shape(rr(282, 236, 30, 52, 8), { fill: 'wash' })
s.shape(rr(306, 214, 70, 96, 18), { fill: 'mist', shade: { angle: 90, at: 0.6 }, glint: { at: 0.2, width: 0.07 } })
s.shape(rr(376, 236, 34, 10, 5), { fill: 'paper' })
s.shape(rr(376, 278, 34, 10, 5), { fill: 'paper' })
s.line('M326 236V288', { weight: 0.75 })

// socket, right
s.shape(rr(448, 198, 82, 128, 20), { fill: 'mist', shade: { angle: 90, at: 0.6 }, glint: { at: 0.2, width: 0.07 } })
s.shape(rr(462, 222, 26, 80, 13), { fill: 'paper' })
s.shape(rr(468, 238, 14, 8, 4), { fill: 'ink', line: false })
s.shape(rr(468, 278, 14, 8, 4), { fill: 'ink', line: false })
s.shape(rr(518, 236, 26, 52, 8), { fill: 'wash' })

// sparks in the gap
s.line('M420 228L430 212M428 236L444 228', { weight: 0.75 })
s.line('M420 296L430 312M428 288L444 296', { weight: 0.75 })

s.accents([['hex', 260, 150, 10], ['plus', 552, 140, 8], ['ring', 296, 112, 8], ['tri', 590, 186, 7], ['dot', 520, 110, 4], ['spark', 230, 210, 7]])
s.waterline(150, 650, 400)
s.dashes([[436, [[270, 290], [312, 450], [472, 530]]], [468, [[360, 430]]]])
s.accents([['ring', 236, 438, 6], ['dot', 260, 476, 4, 'ink'], ['dot', 566, 470, 3.5, 'ink']])

writeFileSync(new URL('offline.svg', import.meta.url), s.svg('A plug pulled out of its wall socket, with small sparks in the gap between them'))
