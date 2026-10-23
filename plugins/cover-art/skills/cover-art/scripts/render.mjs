#!/usr/bin/env node
/**
 * Renders cover SVGs to PNG at full size (1600 × 1000) and card size (380 × 238)
 * so both can be read back and checked.
 *
 *   node render.mjs cover.svg [more.svg …] [--out DIR]
 *
 * Writes <name>.png and <name>-card.png next to each SVG (or into --out).
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
const files = args.filter((a, i) => a.endsWith('.svg') && i !== outIdx + 1)
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
// is what a browser does when the card is ~380 px wide.
const sizes = [
  ['', 1],
  ['-card', 380 / 1600],
]
for (const file of files) {
  const src = resolve(file)
  const dir = outDir ?? dirname(src)
  const name = basename(src, '.svg')
  for (const [suffix, scale] of sizes) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: scale })
    await page.goto(pathToFileURL(src).href)
    const out = join(dir, `${name}${suffix}.png`)
    await page.screenshot({ path: out })
    await page.close()
    console.log(out)
  }
}
await browser.close()
