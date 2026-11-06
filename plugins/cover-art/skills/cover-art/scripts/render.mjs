#!/usr/bin/env node
/**
 * Renders cover SVGs to PNG at full size (1600 × 1000) and card size (380 × 238)
 * so both can be read back and checked, plus a 1600 × 900 (16:9) Ko-fi PNG
 * cropped from the middle of the cover (inside its 100 px safe margin).
 *
 *   node render.mjs cover.svg [more.svg …] [--out DIR]
 *
 * Writes <name>.png, <name>-card.png and <name>-kofi.png next to each SVG
 * (or into --out).
 * Uses Playwright only if it and a Chromium are already installed; it never
 * installs one. Exit 2 means "no browser here".
 */
import { basename, dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
const outIdx = args.indexOf('--out')
const outDir = outIdx >= 0 ? resolve(args[outIdx + 1]) : null
const files = args.filter((a, i) => a.endsWith('.svg') && !(outIdx >= 0 && i === outIdx + 1))
if (!files.length) {
  console.error('usage: node render.mjs cover.svg [more.svg …] [--out DIR]')
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

// The card is the same 1600 × 1000 page drawn at a quarter of the pixels, which
// is what a browser does when the card is ~380 px wide. The Ko-fi image trims
// 50 px off the top and bottom to 16:9, which is how Ko-fi posts and shared
// links show images; the safe margin keeps the subject clear of the cut.
const sizes = [
  ['', 1],
  ['-card', 380 / 1600],
  ['-kofi', 1, { x: 0, y: 50, width: 1600, height: 900 }],
]
for (const file of files) {
  const src = resolve(file)
  const dir = outDir ?? dirname(src)
  const name = basename(src, '.svg')
  for (const [suffix, scale, clip] of sizes) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: scale })
    await page.goto(pathToFileURL(src).href)
    const out = join(dir, `${name}${suffix}.png`)
    await page.screenshot({ path: out, ...(clip && { clip }) })
    await page.close()
    console.log(out)
  }
}
await browser.close()
