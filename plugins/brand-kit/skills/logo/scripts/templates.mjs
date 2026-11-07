/**
 * Brand templates from brand.json, following references/templates.md:
 *
 *   templates/email/         signature.html (paste into a mail client), signature.txt,
 *                            logo.png (host it, then set templates.email.logoUrl), preview.png
 *   templates/business-card/ business-card.pdf (3.75 × 2.25 in with bleed, front and back),
 *                            front.png, back.png, preview.png
 *   templates/slides/        <slug>-slides.pptx (one slide master per layout, real placeholders),
 *                            slides.pdf, slide-N.png
 *   templates/social/        square, portrait, story, kofi-cover and x-header posts, each
 *                            with a -blank version (field, logo and bar, no text)
 *
 * Needs pptxgenjs for the .pptx; it is installed once into the brand-kit cache
 * folder (its own subfolder, so it never disturbs opentype.js).
 */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { png } from './render.mjs'
import { CACHE } from './brand.mjs'
import { contrast } from './guide.mjs'

const PPTXGEN = 'pptxgenjs@4.0.1'
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const dataUri = (svgText) => 'data:image/svg+xml;base64,' + Buffer.from(svgText).toString('base64')

/**
 * Writes every template and returns { written, previews }, where previews holds
 * paths (relative to out) for the brand guidelines' template pages.
 */
export async function templates({ b, cfg, out, files, iconSvg, tile, scale, colors, ink, paper }) {
  const t = cfg.templates || {}
  const byRole = (role) => colors.find((c) => c.role === role)?.hex
  const accent = byRole('accent')
  const field = t.background || ink // ground for title slides, card fronts and posts
  const onField = contrast(paper, field) >= 4.5 ? paper : '#ffffff'
  const link = byRole('link') || (contrast(ink, '#ffffff') >= 4.5 ? ink : '#1a1a1a')
  const disp = cfg.type?.display || cfg.type?.text || { family: 'Arial', weight: 700 }
  const body = cfg.type?.text || cfg.type?.display || { family: 'Arial', weight: 400 }
  const ff = (f) => `'${f.family}', Arial, Helvetica, sans-serif`
  const fams = new Map()
  for (const f of [disp, body]) fams.set(f.family, new Set([...(fams.get(f.family) || []), 400, 700, f.weight || 400]))
  const gf = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${[...fams].map(([fam, ws]) => `family=${encodeURIComponent(fam).replace(/%20/g, '+')}:wght@${[...ws].sort((x, y) => x - y).join(';')}`).join('&')}&display=swap">`
  const site = String(cfg.contact?.website || cfg.website || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const contact = {
    name: 'Your Name',
    role: 'Role',
    email: `you@${site || 'example.com'}`,
    phone: '',
    ...cfg.contact,
    website: site,
  }
  const read = (p) => readFileSync(join(out, p), 'utf8')
  const lock = files.horizontal || files.wordmark || files.stacked || files.mark
  const stack = files.stacked || lock
  const svgOf = (f, onDark) => (f ? read(onDark ? f.dark || f.white : f.svg) : null)
  const written = [], previews = {}
  const dir = (d) => (mkdirSync(join(out, 'templates', d), { recursive: true }), join(out, 'templates', d))
  const rel = (p) => p.slice(out.length + 1)
  const shoot = async (html, file, w, h, scaleFactor = 1) => {
    const page = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scaleFactor })
    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: file })
    await page.close()
    written.push(file)
    return file
  }

  // ── Email signature ─────────────────────────────────────────────────────────
  {
    const d = dir('email')
    const k = scale >= 0.95 ? 0 : 0.2 // full-bleed art keeps square corners
    const logoPng = await png(b, iconSvg, join(d, 'logo.png'), { width: 128, height: 128, bg: tile, scale, radius: k })
    written.push(logoPng)
    const src = t.email?.logoUrl || 'logo.png'
    const muted = '#5f6661'
    const line = (s, extra = '') => `<tr><td style="font-family:${ff(body)};font-size:13px;line-height:1.45;color:${ink};${extra}">${s}</td></tr>`
    const details = [
      contact.email && `<a href="mailto:${esc(contact.email)}" style="color:${link};text-decoration:none">${esc(contact.email)}</a>`,
      contact.phone && `<a href="tel:${esc(contact.phone.replace(/[^+\d]/g, ''))}" style="color:${ink};text-decoration:none">${esc(contact.phone)}</a>`,
    ].filter(Boolean).join(`<span style="color:${muted}">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`)
    const sig = `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
<tr>
<td style="vertical-align:top;padding:2px 16px 0 0">${site ? `<a href="https://${esc(site)}">` : ''}<img src="${esc(src)}" width="64" height="64" alt="${esc(cfg.name)}" border="0" style="display:block;width:64px;height:64px;border:0">${site ? '</a>' : ''}</td>
<td style="vertical-align:top;padding:0 0 0 16px;border-left:2px solid ${accent || field}">
<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
<tr><td style="font-family:${ff(disp)};font-size:15px;line-height:1.35;font-weight:700;color:${ink}">${esc(contact.name)}</td></tr>
${line(`${esc(contact.role)}${contact.role ? ', ' : ''}${esc(cfg.name)}`, `color:${muted}`)}
${details ? line(details, 'padding-top:6px') : ''}
${site ? line(`<a href="https://${esc(site)}" style="color:${link};text-decoration:none;font-weight:700">${esc(site)}</a>`) : ''}
</table>
</td>
</tr>
</table>`
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(cfg.name)} email signature</title></head>
<body style="margin:24px;background:#ffffff">
<!-- Select everything below this line, copy it and paste it into your mail client's signature setting. -->
${sig}
</body></html>`
    writeFileSync(join(d, 'signature.html'), html)
    written.push(join(d, 'signature.html'))
    const txt = [contact.name, [contact.role, cfg.name].filter(Boolean).join(', '), [contact.email, contact.phone].filter(Boolean).join('  ·  '), site].filter(Boolean).join('\n') + '\n'
    writeFileSync(join(d, 'signature.txt'), `-- \n${txt}`)
    written.push(join(d, 'signature.txt'))
    // Preview: the signature under a short message, in a mail window, light and dark.
    const shown = sig.replace(esc(src), 'data:image/png;base64,' + readFileSync(logoPng).toString('base64'))
    // Dark mode as clients do it: text colours lightened, images left alone.
    const lighten = (hex) => '#' + hex.slice(1).match(/../g).map((h) => Math.round(parseInt(h, 16) + (255 - parseInt(h, 16)) * 0.6).toString(16).padStart(2, '0')).join('')
    const darkSig = shown.split(ink).join('#e8eae9').split(muted).join('#a3aaa6').split(link).join(lighten(link))
    const pane = (dark) => `<div class="m${dark ? ' d' : ''}"><div class="bar"><i></i><i></i><i></i><span>${dark ? 'Dark mode' : 'New message'}</span></div><div class="b"><p>Hi Sam,</p><p>Thanks for the call today. The files are attached.</p><p>Best,</p><div class="s">${dark ? darkSig : shown}</div></div></div>`
    previews.email = rel(await shoot(`<!doctype html><html><head>${gf}<style>
body{margin:0;background:#eceeed;padding:28px;display:flex;gap:28px;font-family:Arial,Helvetica,sans-serif}
.m{width:520px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.bar{display:flex;gap:6px;align-items:center;padding:10px 14px;background:#f4f4f4;font-size:12px;color:#777}.bar i{width:10px;height:10px;border-radius:50%;background:#d6d6d6}.bar span{margin-left:8px}
.b{padding:20px 24px 26px;font-size:14px;color:#222}.b p{margin:0 0 12px}.s{margin-top:18px}
.d{background:#1f1f1f}.d .bar{background:#2b2b2b;color:#aaa}.d .b{background:#1f1f1f;color:#e6e6e6}
</style></head><body>${pane(false)}${pane(true)}</body></html>`, join(d, 'preview.png'), 1124, 330, 2))
  }

  // ── Business card ──────────────────────────────────────────────────────────
  {
    const d = dir('business-card')
    const IN = 96, bleed = 0.125, W = 3.5, H = 2, m = 0.25
    const front = svgOf(lock, true)
    const markSvg = files.mark ? read(files.mark.svg) : null
    const lines = [contact.email, contact.phone, site].filter(Boolean)
    const card = (side) => side === 'front'
      ? `<section class="c" style="background:${field}"><img src="${dataUri(front)}" style="width:${(lock === files.mark ? 0.7 : W * 0.5) * IN}px;position:absolute;left:50%;top:50%;transform:translate(-50%,-52%)"></section>`
      : `<section class="c" style="background:${paper}">
<div style="position:absolute;left:${(bleed + m) * IN}px;top:${(bleed + m) * IN}px">
<div style="font:${disp.weight || 700} ${10.5 * IN / 72}px/1.2 ${ff(disp)};color:${ink}">${esc(contact.name)}</div>
<div style="font:400 ${7.5 * IN / 72}px/1.4 ${ff(body)};color:${ink};opacity:.72;margin-top:2px">${esc(contact.role)}</div></div>
<div style="position:absolute;left:${(bleed + m) * IN}px;bottom:${(bleed + m) * IN}px;font:400 ${7.5 * IN / 72}px/1.55 ${ff(body)};color:${ink}">${lines.map(esc).join('<br>')}</div>
${markSvg ? `<img src="${dataUri(markSvg)}" style="position:absolute;right:${(bleed + m) * IN}px;top:${(bleed + m) * IN}px;height:${0.42 * IN}px">` : ''}
${accent ? `<span style="position:absolute;right:${(bleed + m) * IN}px;bottom:${(bleed + m) * IN}px;width:${0.42 * IN}px;height:${0.04 * IN}px;background:${accent}"></span>` : ''}</section>`
    const html = `<!doctype html><html><head><meta charset="utf-8">${gf}<style>
@page{size:${W + 2 * bleed}in ${H + 2 * bleed}in;margin:0}
html,body{margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.c{position:relative;width:${(W + 2 * bleed) * IN}px;height:${(H + 2 * bleed) * IN}px;overflow:hidden;break-after:page}
</style></head><body>${card('front')}${card('back')}</body></html>`
    writeFileSync(join(d, 'business-card.html'), html)
    const page = await b.newPage({ viewport: { width: (W + 2 * bleed) * IN, height: (H + 2 * bleed) * IN * 2 }, deviceScaleFactor: 3 })
    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    const shots = []
    for (const [i, side] of ['front', 'back'].entries()) {
      const f = join(d, `${side}.png`)
      await page.screenshot({ path: f, clip: { x: bleed * IN, y: (i * (H + 2 * bleed) + bleed) * IN, width: W * IN, height: H * IN } })
      written.push(f)
      shots.push(f)
    }
    await page.emulateMedia({ media: 'print' })
    await page.pdf({ path: join(d, 'business-card.pdf'), preferCSSPageSize: true, printBackground: true })
    await page.close()
    rmSync(join(d, 'business-card.html'))
    written.push(join(d, 'business-card.pdf'))
    previews.cardFront = rel(shots[0])
    previews.cardBack = rel(shots[1])
    const b64 = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64')
    previews.card = rel(await shoot(`<!doctype html><body style="margin:0;background:#e9ebea;display:flex;gap:40px;padding:44px;align-items:center">${shots.map((f) => `<img src="${b64(f)}" style="width:336px;height:192px;border-radius:5px;box-shadow:0 2px 3px rgba(0,0,0,.12),0 10px 24px rgba(0,0,0,.12)">`).join('')}</body>`, join(d, 'preview.png'), 800, 280, 2))
  }

  // ── Slides ──────────────────────────────────────────────────────────────────
  {
    const d = dir('slides')
    const tmp = mkdtempSync(join(tmpdir(), 'brand-kit-'))
    const W = 13.333, H = 7.5, M = 0.75
    const assets = {}
    const asset = async (name, svgText, h) => {
      if (!svgText) return null
      const f = join(tmp, `${name}.png`)
      const vb = svgText.match(/viewBox="([^"]+)"/)[1].split(/[\s,]+/).map(Number)
      await png(b, svgText, f, { width: Math.round((vb[2] / vb[3]) * h * 300) })
      return (assets[name] = { path: f, w: (vb[2] / vb[3]) * h, h, svg: svgText })
    }
    const lockDark = await asset('lockup-dark', svgOf(lock, true), 0.6)
    const stackDark = await asset('stacked-dark', svgOf(stack, true), stack === lock ? 0.9 : 2.1)
    const smallMark = await asset('mark', files.mark ? read(files.mark.svg) : null, 0.4)
    const hex = (c) => c.replace('#', '').toUpperCase()
    const dispBold = (disp.weight || 700) >= 600
    // One spec drives both the .pptx masters and the HTML previews.
    const foot = (color) => [
      { text: cfg.name, x: M, y: H - 0.6, w: 6, h: 0.3, size: 11, color, font: body },
    ]
    const layouts = [
      { name: 'TITLE', bg: field, items: [
        lockDark && { img: lockDark, x: M, y: M },
        accent && { rect: accent, x: M, y: 3.55, w: 0.9, h: 0.09 },
        { ph: 'title', type: 'title', x: M, y: 3.85, w: 10.8, h: 1.6, size: 54, color: onField, font: disp, bold: dispBold },
        { ph: 'sub', type: 'body', x: M, y: 5.85, w: 10.8, h: 0.7, size: 22, color: onField, font: body },
      ], sample: { title: cfg.tagline || 'Presentation title', sub: `${cfg.name} · ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` } },
      { name: 'SECTION', bg: field, items: [
        { ph: 'num', type: 'body', x: M, y: 2.3, w: 4, h: 1.3, size: 72, color: accent || onField, font: disp, bold: dispBold },
        { ph: 'title', type: 'title', x: M, y: 3.7, w: 10.8, h: 1.4, size: 48, color: onField, font: disp, bold: dispBold },
        smallMark && files.mark?.dark && { img: { ...(await asset('mark-dark', read(files.mark.dark), 0.4)) }, x: W - M - 0.4, y: H - M - 0.4 },
      ].filter(Boolean), sample: { num: '01', title: 'Section title' } },
      { name: 'CONTENT', bg: paper, slideNumber: true, items: [
        { ph: 'title', type: 'title', x: M, y: M, w: 10.6, h: 1.0, size: 38, color: ink, font: disp, bold: dispBold },
        { ph: 'body', type: 'body', x: M, y: 2.0, w: 10.6, h: 4.4, size: 24, color: ink, font: body, bullets: true },
        smallMark && { img: smallMark, x: W - M - smallMark.w, y: M + 0.15 },
        ...foot(ink),
      ], sample: { title: 'A slide with a few points', body: [`Titles in ${disp.family}, sentence case`, `Body in ${body.family} at 24 pt, never under 18`, 'Six points at most, two lines each', 'One accent per slide, if any'] } },
      { name: 'TWO_COLUMN', bg: paper, slideNumber: true, items: [
        { ph: 'title', type: 'title', x: M, y: M, w: 10.6, h: 1.0, size: 38, color: ink, font: disp, bold: dispBold },
        { ph: 'left', type: 'body', x: M, y: 2.0, w: 5.6, h: 4.4, size: 22, color: ink, font: body, bullets: true },
        { ph: 'right', type: 'body', x: M + 6.1, y: 2.0, w: 5.6, h: 4.4, size: 22, color: ink, font: body, bullets: true },
        smallMark && { img: smallMark, x: W - M - smallMark.w, y: M + 0.15 },
        ...foot(ink),
      ], sample: { title: 'Two columns', left: ['Before', 'Compare two things side by side'], right: ['After', 'Or a point and its picture'] } },
      { name: 'STATEMENT', bg: paper, slideNumber: true, items: [
        accent && { rect: accent, x: M, y: 2.2, w: 0.09, h: 2.6 },
        { ph: 'title', type: 'title', x: M + 0.45, y: 2.1, w: 10.6, h: 2.8, size: 44, color: ink, font: disp, bold: dispBold },
        { ph: 'by', type: 'body', x: M + 0.45, y: 5.05, w: 10, h: 0.6, size: 18, color: ink, font: body },
        ...foot(ink),
      ], sample: { title: String(cfg.about || 'One big idea per slide, said in a sentence.').split(/(?<=\.)\s/)[0], by: cfg.name } },
      { name: 'CLOSING', bg: field, items: [
        stackDark && { img: stackDark, x: (W - stackDark.w) / 2, y: 2.15 },
        { ph: 'title', type: 'body', x: M, y: 5.35, w: W - 2 * M, h: 0.7, size: 22, color: onField, font: body, align: 'center' },
      ].filter(Boolean), sample: { title: site || 'Thank you' } },
    ].map((l) => ({ ...l, items: l.items.filter(Boolean) }))

    // .pptx
    const PptxGenJS = await need(PPTXGEN, 'pptxgenjs', 'pptx')
    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_WIDE'
    pptx.title = `${cfg.name} slides`
    pptx.theme = { headFontFace: disp.family, bodyFontFace: body.family }
    for (const l of layouts) {
      const objects = l.items.map((it) =>
        it.img ? { image: { x: it.x, y: it.y, w: it.img.w, h: it.img.h, path: it.img.path } }
          : it.rect ? { rect: { x: it.x, y: it.y, w: it.w, h: it.h, fill: { color: hex(it.rect) }, line: { type: 'none' } } }
            : it.ph ? { placeholder: { options: { name: it.ph, type: it.type, x: it.x, y: it.y, w: it.w, h: it.h, fontFace: it.font.family, fontSize: it.size, color: hex(it.color), bold: !!it.bold, valign: 'top', align: it.align || 'left', margin: 0, lineSpacingMultiple: 1.05 }, text: '' } }
              : { text: { text: it.text, options: { x: it.x, y: it.y, w: it.w, h: it.h, fontFace: it.font.family, fontSize: it.size, color: hex(it.color), margin: 0 } } })
      pptx.defineSlideMaster({
        title: l.name,
        background: { color: hex(l.bg) },
        objects,
        ...(l.slideNumber ? { slideNumber: { x: W - M - 1, y: H - 0.6, w: 1, h: 0.3, fontFace: body.family, fontSize: 11, color: hex(ink), align: 'right' } } : {}),
      })
      const s = pptx.addSlide({ masterName: l.name })
      for (const it of l.items.filter((i) => i.ph)) {
        const v = l.sample[it.ph]
        if (v == null) continue
        if (Array.isArray(v)) s.addText(v.map((x, i) => ({ text: x, options: { bullet: it.bullets && !(l.name === 'TWO_COLUMN' && i === 0) ? { indent: 22 } : false, bold: l.name === 'TWO_COLUMN' && i === 0, breakLine: true, paraSpaceAfter: 10 } })), { placeholder: it.ph })
        else s.addText(v, { placeholder: it.ph })
      }
    }
    const slug = String(cfg.name || 'brand').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand'
    const pptxFile = join(d, `${slug}-slides.pptx`)
    await pptx.writeFile({ fileName: pptxFile })
    written.push(pptxFile)

    // HTML previews of the same spec → slides.pdf and slide-N.png
    const PX = 144, pt = PX / 72
    const el = (it, l) => {
      const box = `position:absolute;left:${it.x * PX}px;top:${it.y * PX}px`
      if (it.img) return `<img src="${dataUri(it.img.svg)}" style="${box};width:${it.img.w * PX}px;height:${it.img.h * PX}px">`
      if (it.rect) return `<div style="${box};width:${it.w * PX}px;height:${it.h * PX}px;background:${it.rect}"></div>`
      const v = it.ph ? l.sample[it.ph] : it.text
      if (v == null) return ''
      const style = `${box};width:${it.w * PX}px;height:${it.h * PX}px;font:${it.bold ? disp.weight || 700 : it.font.weight || 400} ${it.size * pt}px/1.12 '${it.font.family}',sans-serif;color:${it.color};text-align:${it.align || 'left'};${it.type === 'title' ? 'letter-spacing:-.01em;' : ''}margin:0`
      if (!Array.isArray(v)) return `<div style="${style}">${esc(v)}</div>`
      return `<div style="${style}">${v.map((x, i) => l.name === 'TWO_COLUMN' && i === 0 ? `<p style="margin:0 0 ${10 * pt}px;font-weight:700">${esc(x)}</p>` : `<p style="margin:0 0 ${10 * pt}px;padding-left:${22 * pt}px;text-indent:-${22 * pt}px;line-height:1.2">•&nbsp;&nbsp;${esc(x)}</p>`).join('')}</div>`
    }
    const slideHtml = layouts.map((l, i) => `<section class="s" style="background:${l.bg}">${l.items.map((it) => el(it, l)).join('')}${l.slideNumber ? `<div style="position:absolute;right:${M * PX}px;top:${(H - 0.6) * PX}px;font:400 ${11 * pt}px '${body.family}',sans-serif;color:${ink}">${i + 1}</div>` : ''}</section>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8">${gf}<style>
@page{size:${W}in ${H}in;margin:0}html,body{margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.s{position:relative;width:${W * PX}px;height:${H * PX}px;overflow:hidden;break-after:page}
</style></head><body>${slideHtml}</body></html>`
    const page = await b.newPage({ viewport: { width: Math.round(W * PX), height: H * PX }, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    previews.slides = []
    for (const [i, s] of (await page.locator('.s').all()).entries()) {
      const f = join(d, `slide-${i + 1}.png`)
      await s.screenshot({ path: f })
      written.push(f)
      previews.slides.push(rel(f))
    }
    await page.emulateMedia({ media: 'print' })
    // Print at 1 px = 1/144 in so the 1920 px slide fills a 13.333 in page.
    await page.pdf({ path: join(d, 'slides.pdf'), preferCSSPageSize: true, printBackground: true, scale: 96 / PX })
    written.push(join(d, 'slides.pdf'))
    await page.close()
    rmSync(tmp, { recursive: true, force: true })
  }

  // ── Social posts ────────────────────────────────────────────────────────────
  {
    const d = dir('social')
    const logo = svgOf(lock, true)
    const headline = t.social?.headline || cfg.tagline || cfg.name
    const kicker = t.social?.kicker || site || ''
    const sizes = [
      { key: 'post-square', w: 1080, h: 1080 },
      { key: 'post-portrait', w: 1080, h: 1350 },
      { key: 'story', w: 1080, h: 1920, top: 250, bottom: 300 },
      { key: 'kofi-cover', w: 1200, h: 400, banner: 'center' },
      { key: 'x-header', w: 1500, h: 500, banner: 'right' },
    ]
    const post = ({ w, h, top = 0, bottom = 0, banner }, blank) => {
      const u = Math.min(w, h) / 1080
      const bar = Math.max(10, Math.round(14 * (w / 1200)))
      const css = `body{margin:0;width:${w}px;height:${h}px;background:${field};position:relative;overflow:hidden;font-family:'${body.family}',sans-serif}
.bar{position:absolute;left:0;right:0;bottom:0;height:${bar}px;background:${accent || onField}}
h1{margin:0;font:${disp.weight || 700} ${Math.round(96 * u)}px/1.04 '${disp.family}',sans-serif;letter-spacing:-.02em;color:${onField}}
.k{font:700 ${Math.round(30 * u)}px/1.2 '${body.family}',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:${accent || onField};margin-bottom:${Math.round(28 * u)}px}`
      if (banner) {
        const hh = h * (banner === 'center' ? 0.34 : 0.3)
        const box = banner === 'center' ? `left:50%;top:50%;transform:translate(-50%,-50%);align-items:center;text-align:center` : `right:${w * 0.08}px;top:50%;transform:translateY(-50%);align-items:flex-end;text-align:right;max-width:${w * 0.55}px`
        return `<!doctype html><html><head>${gf}<style>${css}
.g{position:absolute;display:flex;flex-direction:column;gap:${h * 0.07}px;${box}}.g img{height:${hh}px}
.g p{margin:0;font:${disp.weight || 700} ${Math.round(h * 0.075)}px/1.2 '${disp.family}',sans-serif;color:${onField};max-width:${banner === 'center' ? 760 : w * 0.55}px}</style></head>
<body><div class="g"><img src="${dataUri(logo)}">${blank ? '' : `<p>${esc(headline)}</p>`}</div><div class="bar"></div></body></html>`
      }
      const pad = Math.round(84 * u)
      return `<!doctype html><html><head>${gf}<style>${css}
.logo{position:absolute;left:${pad}px;top:${top + pad}px;height:${Math.round(64 * u)}px}
.t{position:absolute;left:${pad}px;right:${pad}px;bottom:${bottom + pad + bar}px}</style></head>
<body><img class="logo" src="${dataUri(logo)}">${blank ? '' : `<div class="t">${kicker ? `<div class="k">${esc(kicker)}</div>` : ''}<h1>${esc(headline)}</h1></div>`}<div class="bar"></div></body></html>`
    }
    previews.social = []
    for (const s of sizes) {
      previews.social.push(rel(await shoot(post(s, false), join(d, `${s.key}.png`), s.w, s.h)))
      await shoot(post(s, true), join(d, `${s.key}-blank.png`), s.w, s.h)
    }
  }
  return { written, previews }
}

/** Load a CommonJS package, installing it once into its own folder in the brand-kit cache. */
async function need(spec, name, sub) {
  try {
    return (await import(name)).default
  } catch {}
  const prefix = join(CACHE, sub)
  const req = createRequire(join(prefix, 'noop.js'))
  try {
    return req(name)
  } catch {}
  mkdirSync(prefix, { recursive: true })
  console.error(`brand-kit: installing ${spec} into ${prefix} (once)`)
  execFileSync('npm', ['install', '--no-save', '--no-audit', '--no-fund', '--prefix', prefix, spec], { stdio: 'ignore' })
  return req(name)
}
