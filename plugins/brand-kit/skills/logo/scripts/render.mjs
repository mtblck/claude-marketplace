#!/usr/bin/env node
/**
 * Rasterises SVGs (and HTML sheets) with Playwright's Chromium.
 *
 *   node render.mjs logo.svg [more.svg …] [--width 1024] [--bg '#fff'] [--out DIR]
 *   node render.mjs a.svg b.svg c.svg --sheet concepts.png
 *
 * Writes <name>-<width>.png next to each SVG (or into --out), transparent
 * unless --bg is given. --sheet instead puts all the SVGs on one numbered
 * comparison sheet: each large, at 32 px and 16 px, and on a dark ground. Used as a module by export.mjs and specimen.mjs.
 * Uses Playwright only if it and a Chromium are already installed; it never
 * installs one. Exit 2 means "no browser here": open the SVGs instead.
 */
import { basename, dirname, join, resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

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

/** Launch Chromium or exit 2 with a plain message. */
export async function browser() {
  const pw = await loadPlaywright()
  if (!pw) {
    console.error('Playwright is not installed here; open the SVGs in a browser instead.')
    process.exit(2)
  }
  try {
    return await pw.chromium.launch()
  } catch {
    console.error('No Chromium for Playwright here; open the SVGs in a browser instead.')
    process.exit(2)
  }
}

/** The viewBox size of an SVG string, for its aspect ratio. */
export function viewBox(svgText) {
  const vb = svgText.match(/viewBox="([^"]+)"/)?.[1]?.trim().split(/[\s,]+/).map(Number)
  if (vb?.length === 4) return { w: vb[2], h: vb[3] }
  const w = Number(svgText.match(/\bwidth="([\d.]+)/)?.[1]), h = Number(svgText.match(/\bheight="([\d.]+)/)?.[1])
  if (w && h) return { w, h }
  throw new Error('SVG has no viewBox (and no width/height)')
}

const dataUri = (svgText) => 'data:image/svg+xml;base64,' + Buffer.from(svgText).toString('base64')

/**
 * Draw `svgText` into a `width` × `height` PNG.
 *   bg       background colour (omit for transparent)
 *   scale    share of the canvas the artwork may fill (1 = edge to edge), kept centred
 *   radius   corner radius of the background, as a share of the width (0.2237 ≈ iOS)
 * Height defaults to the SVG's aspect ratio at `width`.
 */
export async function png(b, svgText, out, { width, height, bg, scale = 1, radius = 0 } = {}) {
  const vb = viewBox(svgText)
  height ??= Math.round((width * vb.h) / vb.w)
  const fit = Math.min((width * scale) / vb.w, (height * scale) / vb.h)
  const w = vb.w * fit, h = vb.h * fit
  const page = await b.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">
<div style="width:${width}px;height:${height}px;display:grid;place-items:center;${bg ? `background:${bg};` : ''}border-radius:${radius * width}px;overflow:hidden">
<img src="${dataUri(svgText)}" style="width:${w}px;height:${h}px;display:block"></div></body></html>`)
  await page.locator('img').evaluate((img) => img.decode())
  await page.screenshot({ path: out, omitBackground: !bg || radius > 0 })
  await page.close()
  return out
}

/** Screenshot a whole HTML file (sheets). */
export async function htmlShot(b, htmlFile, out, { width = 1280 } = {}) {
  const page = await b.newPage({ viewport: { width, height: 100 }, deviceScaleFactor: 1 })
  await page.goto(pathToFileURL(resolve(htmlFile)).href, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: out, fullPage: true })
  await page.close()
  return out
}

// CLI
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const opt = (name) => {
    const i = args.indexOf(name)
    return i >= 0 ? args[i + 1] : undefined
  }
  const values = new Set(['--width', '--bg', '--out', '--sheet'].map((n) => opt(n)).filter(Boolean))
  const files = args.filter((a) => a.endsWith('.svg') && !values.has(a))
  if (!files.length) {
    console.error("usage: node render.mjs logo.svg [more.svg …] [--width 1024] [--bg '#fff'] [--out DIR]")
    process.exit(1)
  }
  const width = Number(opt('--width') || 1024)
  const b = await browser()
  if (opt('--sheet')) {
    const cell = (file, i) => {
      const uri = dataUri(readFileSync(resolve(file), 'utf8'))
      const im = (h) => `<img src="${uri}" style="height:${h}px;width:auto;max-width:100%">`
      return `<div class="c"><b>${i + 1}</b><div class="big">${im(200)}</div><div class="sm">${im(32)}${im(16)}<span>${basename(file, '.svg')}</span></div><div class="sm dk">${im(32)}${im(16)}</div></div>`
    }
    const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#eee;font:13px system-ui,sans-serif;width:${Math.min(files.length, 3) * 380 + 48}px;box-sizing:border-box">
<style>.g{display:flex;flex-wrap:wrap;gap:16px}.c{width:364px;background:#fff;border-radius:10px;padding:16px;box-sizing:border-box;position:relative}
.c b{position:absolute;top:10px;left:14px;font-size:18px}.big{height:240px;display:grid;place-items:center}
.sm{display:flex;align-items:center;gap:16px;padding:10px;border-top:1px solid #eee}.sm span{color:#888;margin-left:auto}.dk{background:#1d1d1f;border-radius:6px}</style>
<div class="g">${files.map(cell).join('')}</div></body></html>`
    const tmp = join(dirname(resolve(opt('--sheet'))), '.sheet.html')
    const { writeFileSync, rmSync } = await import('node:fs')
    writeFileSync(tmp, html)
    console.log(await htmlShot(b, tmp, resolve(opt('--sheet')), { width: Math.min(files.length, 3) * 380 + 48 }))
    rmSync(tmp)
    await b.close()
    process.exit(0)
  }
  for (const file of files) {
    const src = resolve(file)
    const out = join(opt('--out') ? resolve(opt('--out')) : dirname(src), `${basename(src, '.svg')}-${width}.png`)
    console.log(await png(b, readFileSync(src, 'utf8'), out, { width, bg: opt('--bg') }))
  }
  await b.close()
}
