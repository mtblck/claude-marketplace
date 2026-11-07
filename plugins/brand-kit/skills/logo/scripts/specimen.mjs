#!/usr/bin/env node
/**
 * Sets a name in many candidate typefaces on one numbered sheet, so a wordmark
 * face can be chosen by eye ("3 and 11, but tighter").
 *
 *   node specimen.mjs "Name" [--group geometric,humanist] [--font "Inter:700" …]
 *                    [--case upper|lower] [--tracking 0.01] [--ink '#111'] [--out DIR]
 *
 * --group takes keys from references/typefaces.json (every weight listed is set);
 * --font adds any Google Font as "Family:weight" (append "i" for italic: "Fraunces:600i").
 * Writes specimen.svg and, if a browser is available, specimen.png into --out
 * (default: the current folder). The sheet's labels are live text; the names
 * are outlined exactly as text() in brand.mjs would draw them.
 */
import { readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadFont, text, write, esc } from './brand.mjs'
import { browser, png } from './render.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const many = (name) => args.flatMap((a, i) => (args[i - 1] === name ? [a] : []))
const one = (name) => many(name)[0]
const name = args.find((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'))
if (!name) {
  console.error('usage: node specimen.mjs "Name" [--group geometric,humanist] [--font "Inter:700" …] [--case upper|lower] [--out DIR]')
  process.exit(1)
}
const word = one('--case') === 'upper' ? name.toUpperCase() : one('--case') === 'lower' ? name.toLowerCase() : name
const tracking = Number(one('--tracking') || 0)
const ink = one('--ink') || '#111111'
const out = resolve(one('--out') || '.')

const catalog = JSON.parse(readFileSync(join(here, '..', 'references', 'typefaces.json'), 'utf8')).groups
const picks = []
for (const key of (one('--group') || '').split(',').filter(Boolean)) {
  if (!catalog[key]) {
    console.error(`No group "${key}". Groups: ${Object.keys(catalog).join(', ')}`)
    process.exit(1)
  }
  for (const f of catalog[key].families) for (const w of f.weights) picks.push({ family: f.family, weight: w, italic: false, group: key })
}
for (const spec of many('--font')) {
  const m = spec.match(/^(.+?):(\d{3})(i?)$/)
  if (!m) {
    console.error(`--font wants "Family:weight", got "${spec}"`)
    process.exit(1)
  }
  picks.push({ family: m[1], weight: Number(m[2]), italic: !!m[3], group: 'extra' })
}
if (!picks.length) picks.push(...['geometric', 'grotesque', 'humanist', 'serif-classic'].flatMap((k) => catalog[k].families.slice(0, 3).map((f) => ({ family: f.family, weight: f.weights.at(-1), italic: false, group: k }))))

// Each cell: the name with its cap height normalised to 56 units, so faces are
// compared at the same optical size rather than the same nominal size.
const COLS = 2, CELL_W = 600, CELL_H = 150, CAP = 56, PAD = 40
const cells = []
for (const [i, p] of picks.entries()) {
  try {
    const font = await loadFont(p.family, p.weight, { italic: p.italic })
    const probe = text(font, word, { size: 100, tracking })
    const size = (100 * CAP) / probe.capHeight
    let t = text(font, word, { size, tracking })
    const maxW = CELL_W - 2 * PAD
    if (t.bbox.w > maxW) t = text(font, word, { size: (size * maxW) / t.bbox.w, tracking })
    const col = i % COLS, row = Math.floor(i / COLS)
    const x = col * CELL_W + PAD - t.bbox.x1, y = row * CELL_H + 92
    cells.push(`<g transform="translate(${x.toFixed(1)} ${y})"><path d="${t.d}" fill="${ink}"/></g>
<text x="${col * CELL_W + PAD}" y="${row * CELL_H + 128}" class="l">${i + 1} · ${esc(font.label)} · ${p.group}</text>`)
  } catch (e) {
    console.error(`skipped ${p.family} ${p.weight}: ${e.message}`)
  }
}
const rows = Math.ceil(picks.length / COLS)
const W = COLS * CELL_W, H = rows * CELL_H + 20
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><title>${esc(word)}: typeface specimen</title>
<style>.l{font:500 13px system-ui,-apple-system,'Segoe UI',sans-serif;fill:#6b6b6b}</style>
<rect width="${W}" height="${H}" fill="#fbfaf7"/>
${Array.from({ length: rows - 1 }, (_, r) => `<path d="M${PAD} ${(r + 1) * CELL_H + 4}H${W - PAD}" stroke="#e6e3dc"/>`).join('')}
${cells.join('\n')}
</svg>\n`
const file = join(out, 'specimen.svg')
write(file, sheet)
const b = await browser()
console.log(await png(b, sheet, join(out, 'specimen.png'), { width: W }))
await b.close()
