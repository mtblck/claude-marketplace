#!/usr/bin/env node
/**
 * Turns a finished logo into everything that ships, from one brand.json.
 *
 *   node export.mjs path/to/brand.json [--only icons]
 *
 * Writes into brand.json's "out" folder (default: dist/ next to it):
 *   svg/     every logo, its dark version, and generated one-colour black/white versions
 *   png/     every logo at each width in "pngWidths", transparent
 *   icons/   favicon.ico (16/32/48), favicon.svg, favicon-*.png, apple-touch-icon.png,
 *            icon-192/512.png, icon-maskable-512.png, app-icon-1024.png,
 *            site.webmanifest and head.html (the <link> tags to paste)
 *   check.html + check.png              small-size, dark, one-colour and icon-mask tests
 *   brand-sheet.html + brand-sheet.png  the one-page brand guide
 * --only icons skips the logos and the brand sheet (for the icons skill).
 *
 * brand.json (paths relative to it; see references/brand-json.md):
 * {
 *   "name": "Harbor",
 *   "colors": [{ "name": "Deep Water", "hex": "#12324a", "role": "primary" }, …],
 *   "type": { "display": { "family": "Space Grotesk", "weight": 700 }, "text": { "family": "Inter", "weight": 400 } },
 *   "logos": { "mark": { "file": "mark.svg", "dark": "mark-dark.svg", "minWidth": 16 }, "horizontal": { … } },
 *   "icon": { "file": "mark-dark.svg", "background": "#12324a", "favicon": "favicon.svg" },
 *   "clearSpace": 0.25
 * }
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname, relative } from 'node:path'
import { browser, png, htmlShot, viewBox } from './render.mjs'

const args = process.argv.slice(2)
const cfgPath = args.find((a) => a.endsWith('.json'))
if (!cfgPath) {
  console.error('usage: node export.mjs brand.json [--only icons]')
  process.exit(1)
}
const onlyIcons = args.includes('--only') && args[args.indexOf('--only') + 1] === 'icons'
const base = dirname(resolve(cfgPath))
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
const out = resolve(base, cfg.out || 'dist')
const at = (p) => resolve(base, p)
const read = (p) => readFileSync(at(p), 'utf8')
const colors = cfg.colors || []
const byRole = (role) => colors.find((c) => c.role === role)?.hex
const ink = byRole('primary') || byRole('ink') || '#111111'
const paper = byRole('paper') || '#ffffff'
const dark = byRole('dark') || darkest(colors.map((c) => c.hex)) || '#111111'
const logos = Object.entries(cfg.logos || {})
const icon = cfg.icon || {}
const iconFile = icon.file || cfg.logos?.mark?.file
if (!iconFile && !logos.length) {
  console.error('brand.json needs "logos" (with at least "mark") or "icon.file"')
  process.exit(1)
}
for (const d of ['svg', 'png', 'icons']) mkdirSync(join(out, d), { recursive: true })
const b = await browser()
const wrote = (p) => {
  const r = relative(process.cwd(), p)
  console.log(!r || r.startsWith('..') ? p : r)
}

// ── Logos: SVG copies, one-colour versions, PNGs ────────────────────────────
const files = {} // key → { svg, dark, black, white } as paths relative to out
if (!onlyIcons) {
  const widths = cfg.pngWidths || [256, 512, 1024, 2048]
  for (const [key, l] of logos) {
    const entry = (files[key] = {})
    const variants = [['', l.file], ['-dark', l.dark]]
    if (l.mono !== false) variants.push(['-black', mono(read(l.file), '#000000')], ['-white', mono(read(l.file), '#ffffff')])
    for (const [suffix, src] of variants) {
      if (!src) continue
      const text = src.startsWith('<') ? src : read(src)
      const svgOut = join(out, 'svg', `${key}${suffix}.svg`)
      writeFileSync(svgOut, text)
      wrote(svgOut)
      entry[suffix.slice(1) || 'svg'] = `svg/${key}${suffix}.svg`
      for (const w of suffix === '' || suffix === '-dark' ? widths : [1024]) {
        wrote(await png(b, text, join(out, 'png', `${key}${suffix}-${w}.png`), { width: w }))
      }
    }
  }
}

// ── Icons ────────────────────────────────────────────────────────────────────
const iconSvg = read(iconFile)
const tile = icon.background || paper
const scale = icon.scale ?? 0.62
const favSrc = icon.favicon ? read(icon.favicon) : iconSvg
const favTile = icon.faviconBackground // optional: favicon drawn on a rounded tile
const fav = (size, file) =>
  png(b, favSrc, file, favTile ? { width: size, height: size, bg: favTile, scale: icon.faviconScale ?? 0.78, radius: 0.22 } : { width: size, height: size })
const I = (f) => join(out, 'icons', f)
const icoParts = []
for (const s of [16, 32, 48]) {
  wrote(await fav(s, I(`favicon-${s}.png`)))
  icoParts.push([s, readFileSync(I(`favicon-${s}.png`))])
}
writeFileSync(I('favicon.ico'), ico(icoParts))
wrote(I('favicon.ico'))
writeFileSync(I('favicon.svg'), favTile ? tileSvg(favSrc, favTile, icon.faviconScale ?? 0.78, 0.22) : favSrc)
wrote(I('favicon.svg'))
// Apple and app stores want an opaque square; the OS rounds the corners itself.
wrote(await png(b, iconSvg, I('apple-touch-icon.png'), { width: 180, height: 180, bg: tile, scale }))
wrote(await png(b, iconSvg, I('app-icon-1024.png'), { width: 1024, height: 1024, bg: tile, scale }))
// PWA "any" icons: rounded tile. "maskable": full bleed, art inside the 80 % safe circle.
wrote(await png(b, iconSvg, I('icon-192.png'), { width: 192, height: 192, bg: tile, scale, radius: 0.2 }))
wrote(await png(b, iconSvg, I('icon-512.png'), { width: 512, height: 512, bg: tile, scale, radius: 0.2 }))
wrote(await png(b, iconSvg, I('icon-maskable-512.png'), { width: 512, height: 512, bg: tile, scale: icon.maskableScale ?? 0.5 }))
const manifest = {
  name: cfg.name,
  short_name: cfg.shortName || cfg.name,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  theme_color: icon.themeColor || tile,
  background_color: icon.themeColor || tile,
  display: 'standalone',
}
writeFileSync(I('site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n')
wrote(I('site.webmanifest'))
writeFileSync(
  I('head.html'),
  `<!-- Copy icons/ to the site root (public/), then paste into <head>. -->
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="${icon.themeColor || tile}">
`
)
wrote(I('head.html'))

// ── Check sheet ──────────────────────────────────────────────────────────────
const shown = onlyIcons ? [] : logos
const markKey = files.mark ? 'mark' : null
const markLight = markKey ? files.mark.svg : null
const markDark = markKey ? files.mark.dark || files.mark.white : null
const img = (src, w, extra = '') => `<img src="${src}" style="width:${w}px;height:auto;display:block" ${extra}>`
const sizes = [16, 24, 32, 48, 64, 128]
const ramp = (src, bg, fg) =>
  `<div class="ramp" style="background:${bg};color:${fg}">${sizes.map((s) => `<figure>${img(src, s)}<figcaption>${s}</figcaption></figure>`).join('')}</div>`
const check = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(cfg.name)}: check sheet</title><style>
body{margin:0;padding:32px;font:13px/1.4 system-ui,sans-serif;background:#f3f2ef;color:#333;width:1216px;box-sizing:border-box}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#777;margin:28px 0 10px}
.row{display:flex;gap:16px;flex-wrap:wrap;align-items:stretch}
.ramp{display:flex;align-items:flex-end;gap:28px;padding:20px 24px;border-radius:10px}
figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:6px}
figcaption{font-size:11px;opacity:.6}
.panel{padding:28px;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:28px}
.tab{display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:8px 8px 0 0;width:200px;font-size:12px}
.tab img{width:16px;height:16px}
.home{display:grid;grid-template-columns:repeat(4,60px);gap:18px;padding:24px;border-radius:10px;background:linear-gradient(160deg,#7a8ca8,#3b4660)}
.home i{width:60px;height:60px;border-radius:13.4px;background:rgba(255,255,255,.35)}
.home img{width:60px;height:60px;border-radius:13.4px}
.circ{border-radius:50%;overflow:hidden}
</style></head><body>
<h1 style="font-size:20px;margin:0">${esc(cfg.name)}: check sheet</h1>
<p>Everything at real pixel size. Read it at 100 %: if a detail is gone at 16 or 32, simplify the favicon.</p>
${markKey ? `<h2>Mark size ramp (light, dark)</h2><div class="row">${ramp(markLight, '#ffffff', '#333')}${ramp(markDark, dark, '#ddd')}</div>` : ''}
${shown.filter(([k]) => k !== 'mark').length ? `<h2>Logos on light and dark, at display size and at minimum width</h2>` : ''}
${shown
  .filter(([k]) => k !== 'mark')
  .map(([k, l]) => {
    const f = files[k]
    const vb = viewBox(read(l.file))
    const w = Math.round(Math.min(480, (140 * vb.w) / vb.h))
    return `<div class="row" style="margin-bottom:16px"><div class="panel" style="background:#fff;flex:1">${img(f.svg, w)}${img(f.svg, l.minWidth || 96)}</div><div class="panel" style="background:${dark};flex:1">${img(f.dark || f.white, w)}${img(f.dark || f.white, l.minWidth || 96)}</div></div>`
  })
  .join('')}
${markKey ? `<h2>One colour: black, white on ink, white on accent</h2><div class="row">
<div class="panel" style="background:#fff">${img(files.mark.black, 96)}</div>
<div class="panel" style="background:${ink}">${img(files.mark.white, 96)}</div>
${byRole('accent') ? `<div class="panel" style="background:${byRole('accent')}">${img(files.mark.white, 96)}</div>` : ''}
${files.horizontal ? `<div class="panel" style="background:#fff">${img(files.horizontal.black, 240)}</div>` : ''}</div>` : ''}
<h2>Favicon in a browser tab (16 px), light and dark</h2><div class="row">
<div style="background:#dee1e6;padding:8px 8px 0;border-radius:10px 10px 0 0"><div class="tab" style="background:#fff;color:#333"><img src="icons/favicon-32.png">${esc(cfg.name)}</div></div>
<div style="background:#202124;padding:8px 8px 0;border-radius:10px 10px 0 0"><div class="tab" style="background:#35363a;color:#eee"><img src="icons/favicon-32.png">${esc(cfg.name)}</div></div>
<div class="ramp" style="background:#fff">${[16, 32, 48].map((s) => `<figure><img src="icons/favicon-${s}.png" style="width:${s}px"><figcaption>${s}</figcaption></figure>`).join('')}</div></div>
<h2>App icon: iOS home screen, Android circle mask, maskable safe zone</h2><div class="row">
<div class="home"><i></i><img src="icons/app-icon-1024.png"><i></i><i></i><i></i><i></i><i></i><i></i></div>
<div class="panel" style="background:#e9e9ef"><img class="circ" src="icons/icon-maskable-512.png" style="width:108px"><img class="circ" src="icons/icon-maskable-512.png" style="width:48px"><img src="icons/icon-512.png" style="width:96px"><img src="icons/apple-touch-icon.png" style="width:60px;border-radius:13.4px"></div>
</div></body></html>`
writeFileSync(join(out, 'check.html'), check)
wrote(await htmlShot(b, join(out, 'check.html'), join(out, 'check.png'), { width: 1216 }))

// ── Brand sheet ─────────────────────────────────────────────────────────────
if (!onlyIcons) {
  const type = cfg.type || {}
  const fams = Object.values(type).filter((t) => t?.family)
  const gf = fams.length
    ? `https://fonts.googleapis.com/css2?${fams.map((t) => `family=${encodeURIComponent(t.family).replace(/%20/g, '+')}:wght@${[...new Set([400, t.weight || 400])].sort().join(';')}`).join('&')}&display=swap`
    : null
  const disp = type.display, body = type.text || type.display
  const ff = (t) => (t ? `'${t.family}', system-ui, sans-serif` : 'system-ui, sans-serif')
  const hero = files.horizontal || files.stacked || files.wordmark || files.mark
  const cs = cfg.clearSpace ?? 0.25
  const markVb = markKey ? viewBox(read(cfg.logos.mark.file)) : null
  const sheet = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(cfg.name)} brand guide</title>${gf ? `<link rel="stylesheet" href="${gf}">` : ''}<style>
:root{--ink:${ink};--paper:${paper};--dark:${dark}}
*{box-sizing:border-box}body{margin:0;background:#fff;color:#1d1d1f;font:16px/1.55 ${ff(body)}}
main{max-width:1120px;margin:0 auto;padding:56px 32px 80px}
h1,h2,h3{font-family:${ff(disp)};font-weight:${disp?.weight || 700};line-height:1.15;margin:0}
h2{font-size:28px;margin:64px 0 8px}h2+p{margin:0 0 24px;color:#555;max-width:62ch}
.hero{background:var(--paper);border-radius:16px;padding:72px;display:flex;justify-content:center}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.tile{border-radius:12px;padding:40px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;min-height:200px;border:1px solid #eee}
.tile img{max-width:100%;max-height:110px}.tile small{font-size:12px;opacity:.65}
.sw{border-radius:12px;overflow:hidden;border:1px solid #eee}.sw div{height:110px}.sw p{margin:0;padding:12px 14px;font-size:13px;line-height:1.5}
code,pre{font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}pre{background:#f5f5f4;border-radius:10px;padding:16px;overflow:auto}
.clear{display:flex;gap:40px;align-items:center;flex-wrap:wrap}
.cs{position:relative;padding:${cs * 120}px;outline:1px dashed #c33;background:repeating-linear-gradient(45deg,#fdf0f0,#fdf0f0 6px,#fff 6px,#fff 12px)}
.cs img{display:block;height:120px;background:#fff}
ul{padding-left:20px;max-width:70ch}li{margin:4px 0}
</style></head><body><main>
<h1 style="font-size:44px;margin-bottom:24px">${esc(cfg.name)}</h1>
${hero ? `<div class="hero"><img src="${hero.svg}" alt="${esc(cfg.name)} logo" style="max-width:min(560px,100%);max-height:220px"></div>` : ''}
${cfg.tagline ? `<p style="font-size:20px;margin:24px 0 0">${esc(cfg.tagline)}</p>` : ''}
<h2>Logo</h2><p>Use the full logo wherever there's room; the mark alone for small or square spaces. On dark or photographic backgrounds use the dark version, and the one-colour versions when only one ink is available.</p>
<div class="grid">${logos
    .map(([k, l]) => {
      const f = files[k]
      return `<div class="tile" style="background:#fff"><img src="${f.svg}" alt=""><small>${k}${l.minWidth ? ` · min ${l.minWidth} px wide` : ''}</small></div>
<div class="tile" style="background:var(--dark);color:#fff"><img src="${f.dark || f.white}" alt=""><small>${k} on dark</small></div>`
    })
    .join('')}${files.mark ? `<div class="tile" style="background:#fff"><img src="${files.mark.black}" alt=""><small>one colour</small></div><div class="tile" style="background:var(--ink);color:#fff"><img src="${files.mark.white}" alt=""><small>reversed</small></div>` : ''}</div>
${markKey ? `<h2>Clear space and size</h2><p>Keep clear space of at least ${Math.round(cs * 100)} % of the mark's height on every side. Below each logo's minimum width, step down to the mark; below 32 px, use the favicon.</p>
<div class="clear"><div class="cs"><img src="${files.mark.svg}" alt="" style="width:${(120 * markVb.w) / markVb.h}px"></div>${hero && hero !== files.mark ? `<div class="cs"><img src="${hero.svg}" alt=""></div>` : ''}</div>` : ''}
${colors.length ? `<h2>Colour</h2><p>Contrast is against white and against ${esc(colors.find((c) => c.hex === dark)?.name || 'the darkest colour')}. 4.5:1 and above is fine for text; 3:1 for large text and graphics.</p>
<div class="grid">${colors
    .map(
      (c) => `<div class="sw"><div style="background:${c.hex}"></div><p><b>${esc(c.name)}</b>${c.role ? ` · ${esc(c.role)}` : ''}<br>${c.hex.toUpperCase()} · rgb(${rgb(c.hex).join(', ')})<br>on white ${contrast(c.hex, '#ffffff').toFixed(1)}:1 · on dark ${contrast(c.hex, dark).toFixed(1)}:1</p></div>`
    )
    .join('')}</div>` : ''}
${fams.length ? `<h2>Typography</h2><p>${disp ? `${esc(disp.family)} for the wordmark and headings` : ''}${body && body !== disp ? `, ${esc(body.family)} for everything else` : ''}. Both are free Google Fonts.</p>
${disp ? `<p style="font:${disp.weight || 700} 56px/1.1 ${ff(disp)};margin:0 0 8px">Aa Bb Cc 0123</p><p style="font:${disp.weight || 700} 32px/1.2 ${ff(disp)};margin:0 0 24px">${esc(cfg.tagline || `The quick brown fox, by ${cfg.name}`)}</p>` : ''}
${body ? `<p style="font:${body.weight || 400} 17px/1.6 ${ff(body)};max-width:62ch">Body copy is set in ${esc(body.family)} at 16 to 18 px with a line height around 1.55. Keep lines to 60 to 75 characters and let the display face carry the personality in headings, so the page stays calm to read.</p>` : ''}
<pre>${esc(gf ? `<link rel="stylesheet" href="${gf}">\n\n` : '')}${esc(`:root {\n${disp ? `  --font-display: ${ff(disp)};\n` : ''}${body ? `  --font-body: ${ff(body)};\n` : ''}${colors.map((c) => `  --${(c.role || c.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}: ${c.hex};`).join('\n')}\n}`)}</pre>` : ''}
<h2>App and web icons</h2><p>From <code>icons/</code>: copy the files to the site root and paste <code>head.html</code> into the page head.</p>
<div class="grid"><div class="tile" style="background:#f3f3f5"><img src="icons/app-icon-1024.png" alt="" style="width:120px;border-radius:27px"><small>app icon</small></div><div class="tile" style="background:#f3f3f5"><img src="icons/icon-maskable-512.png" alt="" style="width:120px;border-radius:50%"><small>Android (maskable)</small></div><div class="tile" style="background:#f3f3f5"><img src="icons/favicon-48.png" alt="" style="width:48px"><small>favicon</small></div></div>
<h2>Don't</h2><ul><li>Stretch, squash, rotate or re-space the logo, or rebuild the wordmark in a live font.</li><li>Recolour it outside the palette, add shadows, outlines, gradients or effects.</li><li>Put the light logo on a busy photo or a mid-tone; switch to the dark or one-colour version.</li><li>Crowd it inside the clear space, or use it smaller than its minimum width.</li></ul>
</main></body></html>`
  writeFileSync(join(out, 'brand-sheet.html'), sheet)
  wrote(await htmlShot(b, join(out, 'brand-sheet.html'), join(out, 'brand-sheet.png'), { width: 1200 }))
}
await b.close()

// ── helpers ─────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}
function rgb(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}
function lum(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
function darkest(hexes) {
  return hexes.filter(Boolean).sort((a, b) => lum(a) - lum(b))[0]
}
/** Every painted colour → one colour. "none" and url(#…) paints are left alone. */
function mono(svgText, color) {
  return svgText
    .replace(/\b(fill|stroke|stop-color)="(?!none|url)[^"]*"/g, `$1="${color}"`)
    .replace(/\b(fill|stroke|stop-color):\s*(?!none|url)[^;"}]+/g, `$1:${color}`)
    .replace(/<svg\b(?![^>]*\bfill=)/, `<svg fill="${color}"`)
}
/** The art centred on a rounded tile, as one SVG (for favicon.svg). */
function tileSvg(art, bg, k, r) {
  const vb = viewBox(art)
  const s = Math.max(vb.w, vb.h) / k
  const x = (s - vb.w) / 2, y = (s - vb.h) / 2
  const inner = art.replace(/<\?xml[^>]*>/, '').replace(/<svg\b/, `<svg x="${x}" y="${y}" width="${vb.w}" height="${vb.h}"`)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}" rx="${s * r}" fill="${bg}"/>${inner}</svg>\n`
}
/** A .ico holding PNG images (supported everywhere that matters since Vista). */
function ico(parts) {
  const head = Buffer.alloc(6 + 16 * parts.length)
  head.writeUInt16LE(0, 0)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(parts.length, 4)
  let offset = head.length
  parts.forEach(([size, data], i) => {
    const e = 6 + 16 * i
    head.writeUInt8(size >= 256 ? 0 : size, e)
    head.writeUInt8(size >= 256 ? 0 : size, e + 1)
    head.writeUInt16LE(1, e + 4)
    head.writeUInt16LE(32, e + 6)
    head.writeUInt32LE(data.length, e + 8)
    head.writeUInt32LE(offset, e + 12)
    offset += data.length
  })
  return Buffer.concat([head, ...parts.map(([, d]) => d)])
}
