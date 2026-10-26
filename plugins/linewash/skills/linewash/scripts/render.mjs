#!/usr/bin/env node
/**
 * Renders linewash SVGs to PNG at 2× and as a 240 px wide thumbnail, so the
 * drawing can be read back at full detail and at the size an empty state or
 * card shows it.
 *
 *   node render.mjs art.svg [more.svg …] [--out DIR]
 *
 * Writes <name>.png and <name>-thumb.png next to each SVG (or into --out).
 * Uses Playwright only if it and a Chromium are already installed; it never
 * installs one. Exit 2 means "no browser here".
 */
import { readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
const outIdx = args.indexOf('--out')
const outArg = outIdx >= 0 ? args[outIdx + 1] : null
const outDir = outArg && !outArg.startsWith('--') ? resolve(outArg) : null
const files = args.filter((a, i) => a.endsWith('.svg') && !(outIdx >= 0 && i === outIdx + 1))
if (!files.length || (outIdx >= 0 && !outDir)) {
  console.error('usage: node render.mjs art.svg [more.svg …] [--out DIR]')
  process.exit(1)
}

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {}
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim()
    return createRequire(join(globalRoot, 'noop.js'))('playwright')
  } catch {}
  return null
}

const pw = await loadPlaywright()
if (!pw) {
  console.error('Playwright is not installed here; open the SVGs in a browser instead.')
  process.exit(2)
}
let browser
try {
  browser = await pw.chromium.launch()
} catch {
  console.error('No Chromium for Playwright here; open the SVGs in a browser instead.')
  process.exit(2)
}

for (const file of files) {
  const src = resolve(file)
  const vb = readFileSync(src, 'utf8').match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/)
  const [w, h] = vb ? [Math.round(+vb[1]), Math.round(+vb[2])] : [800, 600]
  const dir = outDir ?? dirname(src)
  const name = basename(src, '.svg')
  for (const [suffix, scale] of [['', 2], ['-thumb', 240 / w]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale })
    await page.goto(pathToFileURL(src).href)
    const out = join(dir, `${name}${suffix}.png`)
    await page.screenshot({ path: out })
    await page.close()
    console.log(out)
  }
}
await browser.close()
