/**
 * The last steps of export.mjs: social images, vector PDF logos for print, the
 * kit's README and one zip of everything.
 *
 *   social/og-image.png  1200 × 630 link preview (Open Graph, X, Slack, iMessage)
 *   social/avatar.png    800 × 800 profile picture (GitHub, X, Ko-fi, Bluesky)
 *   pdf/<logo>.pdf       each logo and its versions as a vector PDF, for print shops
 *   README.md            what each file is for
 *   <slug>-brand-kit.zip everything above plus svg/, png/, icons/ and the guidelines
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { png, viewBox } from './render.mjs'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const dataUri = (svgText) => 'data:image/svg+xml;base64,' + Buffer.from(svgText).toString('base64')

/** Link preview and avatar. */
export async function social({ b, cfg, out, files, iconSvg, tile, scale, paper, ink, accent }) {
  mkdirSync(join(out, 'social'), { recursive: true })
  const written = []
  const hero = files.horizontal || files.wordmark || files.stacked || files.mark
  const disp = cfg.type?.display
  const gf = disp ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(disp.family).replace(/%20/g, '+')}:wght@${disp.weight || 700}&display=swap` : null
  const bg = cfg.social?.background || paper
  const heroSvg = hero ? readFileSync(join(out, hero.svg), 'utf8') : null
  const html = `<!doctype html><html><head><meta charset="utf-8">${gf ? `<link rel="stylesheet" href="${gf}">` : ''}<style>
body{margin:0;width:1200px;height:630px;background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;position:relative;overflow:hidden}
img{max-width:680px;max-height:${cfg.tagline ? 190 : 240}px}
p{margin:0;font:${disp?.weight || 700} 34px/1.25 ${disp ? `'${disp.family}',` : ''}system-ui,sans-serif;color:${ink};text-align:center;max-width:900px;letter-spacing:-.01em}
${accent ? `body::after{content:'';position:absolute;left:0;right:0;bottom:0;height:14px;background:${accent}}` : ''}
</style></head><body>${heroSvg ? `<img src="${dataUri(heroSvg)}" alt="">` : ''}${cfg.tagline ? `<p>${esc(cfg.tagline)}</p>` : ''}</body></html>`
  const page = await b.newPage({ viewport: { width: 1200, height: 630 } })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  const og = join(out, 'social', 'og-image.png')
  await page.screenshot({ path: og })
  await page.close()
  written.push(og)
  written.push(await png(b, iconSvg, join(out, 'social', 'avatar.png'), { width: 800, height: 800, bg: cfg.social?.avatarBackground || tile, scale }))
  return written
}

/** Each SVG in svg/ as a vector PDF page sized to the art (1 SVG unit = 1 CSS px, at least 4 in wide). */
export async function pdfLogos({ b, out }) {
  mkdirSync(join(out, 'pdf'), { recursive: true })
  const written = []
  for (const f of readdirSync(join(out, 'svg')).filter((n) => n.endsWith('.svg'))) {
    const text = readFileSync(join(out, 'svg', f), 'utf8')
    const vb = viewBox(text)
    const k = Math.max(1, 384 / vb.w)
    const w = Math.round(vb.w * k), h = Math.round(vb.h * k)
    const page = await b.newPage()
    await page.setContent(`<!doctype html><style>@page{size:${w}px ${h}px;margin:0}html,body{margin:0;background:transparent}svg{display:block;width:${w}px;height:${h}px}</style>${text}`)
    const file = join(out, 'pdf', f.replace(/\.svg$/, '.pdf'))
    await page.pdf({ path: file, width: `${w}px`, height: `${h}px`, printBackground: true, pageRanges: '1' })
    await page.close()
    written.push(file)
  }
  return written
}

/** README.md for the kit: one line per file, in the order people need them. */
export function readme({ cfg, out, files }) {
  const has = (p) => {
    try {
      return statSync(join(out, p)).isFile() || statSync(join(out, p)).isDirectory()
    } catch {
      return false
    }
  }
  const logoKeys = Object.keys(files)
  const lines = [
    `# ${cfg.name} brand kit`,
    '',
    cfg.tagline ? `${cfg.tagline}\n` : '',
    'Start with `brand-guidelines.pdf`: it shows the logo, how to use it, the typefaces and the colours.',
    '',
    '## Which file to use',
    '',
    '| You need | Use |',
    '| --- | --- |',
    `| The logo on a website or in an app | \`svg/${logoKeys.includes('horizontal') ? 'horizontal' : logoKeys[0]}.svg\` (and \`-dark.svg\` on dark backgrounds) |`,
    '| The logo in a document, slide or email | `png/` at the width you need (transparent background) |',
    '| The logo for a printer, sign shop or merch | `pdf/` (vector), or `svg/` if they accept it |',
    '| Only one ink available (stamps, embroidery, engraving) | `svg/*-black.svg` or `svg/*-white.svg` |',
    has('icons') ? '| Favicons and app icons for a website | `icons/`: copy the files to the site root and paste `icons/head.html` into the page `<head>` |' : '',
    has('icons/app-icon-1024.png') ? '| An App Store or Play Store icon | `icons/app-icon-1024.png` (square, opaque; the store rounds the corners) |' : '',
    has('social') ? '| A link preview (Open Graph) image | `social/og-image.png` (1200 × 630) |' : '',
    has('social') ? '| A profile picture | `social/avatar.png` (800 × 800) |' : '',
    has('templates/email') ? '| An email signature | `templates/email/`: host `logo.png`, open `signature.html` in a browser, copy it and paste it into the mail settings |' : '',
    has('templates/business-card') ? '| Business cards | `templates/business-card/business-card.pdf` (US 3.5 × 2 in, bleed included, front and back): send it to the printer as is |' : '',
    has('templates/slides') ? '| A presentation | `templates/slides/*.pptx` (PowerPoint, Keynote or Google Slides): add slides from its layouts |' : '',
    has('templates/social') ? '| A social post, story, Ko-fi cover or X header | `templates/social/`: a sample of each, plus a `-blank` version to design on |' : '',
    '',
    '## Contents',
    '',
    ...[
      ['brand-guidelines.pdf', 'printable guidelines, US Letter (also `brand-guidelines.html` and a PNG per page)'],
      ['svg/', 'every logo: main, `-dark`, `-black`, `-white`'],
      ['png/', 'every logo at several widths, transparent'],
      ['pdf/', 'every logo as a vector PDF'],
      ['icons/', '`favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, PWA icons, `site.webmanifest`, `head.html`'],
      ['social/', 'link preview and avatar'],
      ['templates/', 'email signature, business card, slide template and social posts'],
      ['check.png', 'the logo at real pixel sizes, on light and dark, in browser tabs and on a home screen'],
    ]
      .filter(([p]) => has(p))
      .map(([p, d]) => `- \`${p}\`: ${d}`),
    '',
    cfg.type?.display ? `Typefaces: ${[...new Set([cfg.type.display?.family, cfg.type.text?.family].filter(Boolean))].join(' and ')}, free from fonts.google.com. The wordmark is already outlined, so the logo files don't need the font installed.` : '',
    '',
  ]
  const file = join(out, 'README.md')
  writeFileSync(file, lines.filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n'))
  return file
}

/** Store-only zip of the kit folder (no compression: PNGs and PDFs are already compressed). */
export function zip({ out, name }) {
  const root = resolve(out)
  const target = join(root, `${name}.zip`)
  const entries = []
  const walk = (dir) => {
    for (const n of readdirSync(dir).sort()) {
      const p = join(dir, n)
      if (statSync(p).isDirectory()) walk(p)
      else if (p !== target && !n.endsWith('.zip') && n !== 'check.html') entries.push(p)
    }
  }
  walk(root)
  const parts = [], central = []
  let offset = 0
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  for (const p of entries) {
    const data = readFileSync(p)
    const fname = Buffer.from(`${name}/${relative(root, p).split('\\').join('/')}`)
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(0, 8)
    local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12); local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(fname.length, 26); local.writeUInt16LE(0, 28)
    parts.push(local, fname, data)
    const cen = Buffer.alloc(46)
    cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8); cen.writeUInt16LE(0, 10)
    cen.writeUInt16LE(dosTime, 12); cen.writeUInt16LE(dosDate, 14); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(data.length, 20); cen.writeUInt32LE(data.length, 24)
    cen.writeUInt16LE(fname.length, 28); cen.writeUInt32LE(offset, 42)
    central.push(cen, fname)
    offset += 30 + fname.length + data.length
  }
  const cdSize = central.reduce((s, x) => s + x.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(cdSize, 12); end.writeUInt32LE(offset, 16)
  writeFileSync(target, Buffer.concat([...parts, ...central, end]))
  return target
}

let table
function crc32(buf) {
  if (!table) table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  let c = 0xffffffff
  for (const x of buf) c = table[(c ^ x) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
