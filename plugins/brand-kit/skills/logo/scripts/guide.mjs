/**
 * The printable brand guidelines: US Letter pages (8.5 × 11 in) as HTML, a PDF
 * and one PNG per page. Called by export.mjs; reads the same brand.json.
 *
 *   Page 1  cover: title, introduction, the logo and its versions
 *   Page 2  logo rules: construction, clear space and minimum size, one colour, misuse, icons
 *   Page 3  typography and colour
 *
 * Optional brand.json fields used only here: "about" (a paragraph or two for the
 * introduction), "version" (default "1.0"), "construction" (a sentence on how the
 * mark is built), and per colour "usage" (one sentence on where it goes).
 */
import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function rgb(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}
export function lum(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
export const darkest = (hexes) => hexes.filter(Boolean).sort((a, b) => lum(a) - lum(b))[0]
/** Naive device CMYK, good enough to brief a printer; real print needs a proof. */
function cmyk(hex) {
  const [r, g, b] = rgb(hex).map((v) => v / 255)
  const k = 1 - Math.max(r, g, b)
  if (k >= 1) return [0, 0, 0, 100]
  return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map((v) => Math.round(v * 100))
}
function saturation(hex) {
  const [r, g, b] = rgb(hex).map((v) => v / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  return max === 0 ? 0 : (max - min) / max
}
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

export async function guide({ b, cfg, files, out, colors, ink, paper, dark, accent, markVb, previews }) {
  const type = cfg.type || {}
  const disp = type.display || type.text, body = type.text || type.display
  const fams = [disp, body].filter(Boolean)
  const weights = new Map()
  for (const t of fams) weights.set(t.family, new Set([...(weights.get(t.family) || [400]), t.weight || 400, 400, 700]))
  const gf = fams.length
    ? `https://fonts.googleapis.com/css2?${[...weights].map(([fam, ws]) => `family=${encodeURIComponent(fam).replace(/%20/g, '+')}:wght@${[...ws].sort((x, y) => x - y).join(';')}`).join('&')}&display=swap`
    : null
  const ff = (t) => (t ? `'${t.family}', system-ui, sans-serif` : 'system-ui, sans-serif')
  // The highlight: the most saturated colour that still reads on paper (3:1), for titles and rules.
  const highlight = colors.map((c) => c.hex).filter((h) => contrast(h, '#ffffff') >= 3).sort((x, y) => saturation(y) - saturation(x))[0] || ink
  const onHighlight = contrast('#ffffff', highlight) >= 3 ? '#ffffff' : ink
  const version = cfg.version || '1.0'
  const date = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const hero = files.horizontal || files.wordmark || files.stacked || files.mark
  const mark = files.mark
  const markW = markVb ? markVb.w / markVb.h : 1
  const cs = cfg.clearSpace ?? 0.25
  const logos = Object.entries(cfg.logos || {})

  const total = previews ? 5 : 3
  const section = (n, title) => `<div class="sec"><h2>${title}</h2><span class="rule"></span><span class="pill">${String(n).padStart(2, '0')}</span></div>`
  const head = `<header class="top">${mark ? `<img src="${mark.svg}" alt="" class="tm">` : ''}<b>${esc(cfg.name)}</b><span>Brand guidelines</span><span class="r">Version ${esc(version)} · ${date}</span></header>`
  const foot = (n, total) => `<footer class="foot"><span>${esc(cfg.name)} · Brand guidelines</span><span>${n} / ${total}</span></footer>`
  const tile = (src, bg, label, h = 90, extra = '') => `<figure class="tile" style="background:${bg}${extra}"><img src="${src}" alt="" style="height:${h}px"><figcaption style="color:${contrast(bg, '#ffffff') > 3 ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.55)'}">${label}</figcaption></figure>`

  // ── Page 1: cover and logo ──
  const p1 = `<section class="page">${head}
<div class="cover">
  <h1><span style="color:${ink}">Brand</span><br><span style="color:${highlight}">Guidelines</span></h1>
  ${mark ? `<img src="${mark.svg}" alt="" class="bigmark">` : ''}
</div>
<div class="intro">
  ${cfg.tagline ? `<p class="lead">${esc(cfg.tagline)}</p>` : ''}
  ${cfg.about ? `<div class="about">${String(cfg.about).split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join('')}</div>` : ''}
</div>
${section(1, 'Logo')}
<div class="hero" style="background:${paper}">${hero ? `<img src="${hero.svg}" alt="${esc(cfg.name)} logo">` : ''}</div>
<div class="tiles">
  ${mark ? tile(mark.svg, '#ffffff', 'Mark', 84, ';border:1px solid #e3e3e3') : ''}
  ${mark ? tile(mark.dark || mark.white, dark, 'On dark', 84) : ''}
  ${mark ? tile(mark.white, highlight, 'Reversed', 84) : ''}
  ${files.stacked ? tile(files.stacked.svg, '#ffffff', 'Stacked', 96, ';border:1px solid #e3e3e3') : ''}
</div>
<p class="note">Use the full logo wherever there is room, and the mark alone where space is small or square. On dark grounds use the dark version; where only one ink is available, use the one-colour logo in black or white.</p>
${foot(1, total)}</section>`

  // ── Page 2: logo rules ──
  const minRows = logos.filter(([, l]) => l.minWidth).map(([k, l]) => {
    const f = files[k]
    return `<figure class="min"><div><img src="${f.svg}" alt="" style="width:${l.minWidth}px"></div><figcaption><b>${k}</b><br>${l.minWidth} px · ${(l.minWidth / 96).toFixed(2)} in</figcaption></figure>`
  }).join('')
  const misuse = hero ? [
    ['Don’t stretch or squash it', 'transform:scaleX(1.45)'],
    ['Don’t rotate it', 'transform:rotate(-14deg)'],
    ['Don’t recolour it', 'filter:hue-rotate(150deg) saturate(1.6)'],
    ['Don’t add effects', 'filter:drop-shadow(4px 6px 3px rgba(0,0,0,.45)) blur(.4px)'],
  ].map(([label, style]) => `<figure class="dont"><div><img src="${(files.mark || hero).svg}" alt="" style="${style}"></div><figcaption><i>✕</i>${label}</figcaption></figure>`).join('') : ''
  const p2 = `<section class="page">${head}
${section(2, 'Logo rules')}
<div class="two">
  <div>
    <h3>Construction</h3>
    <div class="grid">${mark ? `<div class="csbox" style="padding:${cs * 150}px"><img src="${mark.svg}" alt="" style="height:150px;width:${150 * markW}px"></div>` : ''}</div>
    <p class="note">${esc(cfg.construction || 'The mark is drawn from simple geometry on a fixed grid; never redraw or trace it, use the master files.')} The dashed line is the clear space: ${Math.round(cs * 100)} % of the mark’s height on every side, kept free of text and other graphics.</p>
  </div>
  <div>
    <h3>Minimum size</h3>
    <div class="mins">${minRows}</div>
    <p class="note">Below its minimum width, step down to the mark; below 32 px use the favicon.</p>
    <h3>One colour</h3>
    <div class="row">
      ${files.horizontal ? `<div class="mono" style="background:#fff;border:1px solid #e3e3e3"><img src="${files.horizontal.black}" alt=""></div><div class="mono" style="background:${ink}"><img src="${files.horizontal.white}" alt=""></div>` : mark ? `<div class="mono" style="background:#fff;border:1px solid #e3e3e3"><img src="${mark.black}" alt=""></div><div class="mono" style="background:${ink}"><img src="${mark.white}" alt=""></div>` : ''}
    </div>
  </div>
</div>
<h3>Misuse</h3>
<div class="donts">${misuse}</div>
<h3>App and web icons</h3>
<div class="icons">
  <figure><img src="icons/app-icon-1024.png" alt="" style="width:96px;border-radius:21px"><figcaption>App icon</figcaption></figure>
  <figure><img src="icons/icon-maskable-512.png" alt="" style="width:96px;border-radius:50%"><figcaption>Android (masked)</figcaption></figure>
  <figure><img src="icons/favicon-48.png" alt="" style="width:32px;margin:32px"><figcaption>Favicon</figcaption></figure>
  <p class="note">Files in <code>icons/</code>. Platforms round or mask the corners themselves; supply the square art as it is.</p>
</div>
${foot(2, total)}</section>`

  // ── Page 3: typography and colour ──
  const spec = (t, role) => t ? `<div class="spec">
  <div class="aa" style="font-family:${ff(t)};font-weight:${t.weight || 400};color:${role.startsWith('Display') ? highlight : ink}">Aa</div>
  <div><p class="fam">${esc(t.family)} <span>${role} · ${t.weight || 400}</span></p>
  <p class="abc" style="font-family:${ff(t)};font-weight:${t.weight || 400}">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 !@#$%&amp;*()+-/?</p>
  ${weightsLine(t)}</div></div>` : ''
  // When one family does everything, show the weights in use instead of a second specimen.
  function weightsLine(t) {
    if (!(disp && body && disp.family === body.family) || t !== disp) return ''
    const names = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' }
    return `<p class="wts">${[...new Set([body.weight || 400, disp.weight || 700])].sort((x, y) => y - x).map((w) => `<span style="font-family:${ff(t)};font-weight:${w}">${names[w] || w} ${w}</span>`).join('')}</p>`
  }
  const sameFace = disp && body && disp.family === body.family
  const p3 = `<section class="page">${head}
${section(3, 'Typography')}
${spec(disp, sameFace ? 'Display and text' : 'Display')}
${sameFace ? '' : spec(body, 'Text')}
<div class="sample">
  <p style="font:${disp?.weight || 700} 26px/1.15 ${ff(disp)};margin:0 0 8px;color:${ink}">${esc(cfg.tagline || `The ${cfg.name} type pairing, set as a headline`)}</p>
  <p style="font:${body?.weight || 400} 12.5px/1.6 ${ff(body)};margin:0;color:#333;max-width:64ch">Headings are set in ${esc(disp?.family || 'the display face')} at ${disp?.weight || 700} with slightly tight spacing; body copy in ${esc(body?.family || 'the text face')} at ${body?.weight || 400}, 16–18 px on screen and 10–12 pt in print, with a line height around 1.5. Keep lines to 60–75 characters. ${sameFace ? 'It is a free Google Font: load it' : 'Both are free Google Fonts: load them'} from fonts.google.com or self-host the files.</p>
</div>
${section(4, 'Colour')}
<div class="bar">${colors.map((c) => `<span style="flex:${roleWeight(c.role)};background:${c.hex}"></span>`).join('')}</div>
<div class="swatches">${colors.map((c) => `<div class="sw"><i style="background:${c.hex}${lum(c.hex) > 0.85 ? ';box-shadow:inset 0 0 0 1px #ddd' : ''}"></i><div><b>${esc(c.name)}</b>${c.role ? ` <span>${esc(c.role)}</span>` : ''}<br>HEX ${c.hex.toUpperCase()}<br>RGB ${rgb(c.hex).join(' ')}<br>CMYK ${cmyk(c.hex).join(' ')}<br>${contrast(c.hex, '#ffffff').toFixed(1)}:1 on white${c.usage ? `<br><em>${esc(c.usage)}</em>` : ''}</div></div>`).join('')}</div>
<p class="note">The bar shows roughly how much of each colour to use. Text needs 4.5:1 against its background (3:1 for large type and graphics). CMYK values are a starting point for print; ask for a proof.</p>
${foot(3, total)}</section>`

  // ── Pages 4–5: templates (when export made them) ──
  const site = String(cfg.contact?.website || cfg.website || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const p4 = previews ? `<section class="page">${head}
${section(5, 'Email signature')}
<img class="shot" src="${previews.email}" alt="">
<div class="cols">
  <p class="note">Files in <code>templates/email/</code>. Host <code>logo.png</code> (set <code>templates.email.logoUrl</code> and export again), open <code>signature.html</code> in a browser, select all, copy and paste it into the mail client’s signature setting. <code>signature.txt</code> is the plain-text version.</p>
  <p class="note">One table with inline styles, so Gmail and Outlook keep it. The logo is the app-icon art on its own tile so it survives dark mode, and the text falls back to Arial where ${esc(disp?.family || 'the brand face')} isn’t installed. Keep it to name, role, contact and site: no quotes, banners or icon rows.</p>
</div>
${section(6, 'Business card')}
<div class="cards"><figure><img src="${previews.cardFront}" alt=""><figcaption>Front</figcaption></figure><figure><img src="${previews.cardBack}" alt=""><figcaption>Back</figcaption></figure></div>
<div class="cols">
  <p class="note"><b>Size</b> 3.5 × 2 in trim (85 × 55 mm in Europe), with 0.125 in bleed on every side: <code>business-card.pdf</code> is 3.75 × 2.25 in, one page per side, fonts embedded and the logo in vector. Keep text 0.25 in inside the trim.</p>
  <p class="note"><b>Layout</b> The front carries only the logo, on the brand colour; the back carries the person: name in ${esc(disp?.family || 'the display face')} 10.5 pt, role and up to four contact lines at 7.5 pt, never under 6.5 pt. Order a proof: printers convert RGB to CMYK, so check the colour against the values on page 3.</p>
</div>
${foot(4, total)}</section>` : ''
  const sizeNames = { 'post-square': 'Square post · 1080 × 1080', 'post-portrait': 'Portrait post · 1080 × 1350', story: 'Story · 1080 × 1920', 'kofi-cover': 'Ko-fi cover · 1200 × 400', 'x-header': 'X header · 1500 × 500' }
  const socialFig = (p) => `<figure><img src="${p}" alt=""><figcaption>${sizeNames[p.split('/').pop().replace('.png', '')] || ''}</figcaption></figure>`
  const p5 = previews ? `<section class="page">${head}
${section(7, 'Slides')}
<div class="slides">${previews.slides.map((p, i) => `<figure><img src="${p}" alt=""><figcaption>${['Title', 'Section', 'Content', 'Two columns', 'Statement', 'Closing'][i] || ''}</figcaption></figure>`).join('')}</div>
<p class="note">Files in <code>templates/slides/</code>: an editable <code>.pptx</code> (each layout is a slide master with placeholders; opens in PowerPoint, Keynote and Google Slides) and a PDF. 16:9 with 0.75 in margins; titles in ${esc(disp?.family || 'the display face')} 38 pt (54 on the title slide), body 22–24 pt and never under 18; six points at most. Brand colour on title, section and closing slides, paper behind content. The full logo opens and closes the deck; content slides carry only the small mark.</p>
${section(8, 'Social')}
<div class="posts">${previews.social.filter((p) => !/kofi|x-header/.test(p)).map(socialFig).join('')}<figure><img src="social/og-image.png" alt=""><figcaption>Link preview · 1200 × 630</figcaption></figure></div>
<div class="banners">${previews.social.filter((p) => /kofi|x-header/.test(p)).map(socialFig).join('')}</div>
<p class="note">Files in <code>templates/social/</code>, each with a <code>-blank</code> version (field, logo and bar, no text) for designing posts in Canva or Figma. One headline of eight words or fewer per image, the dark logo small in the top corner, the ${accent ? 'accent' : 'brand'} bar along the bottom. Stories keep text out of the top 250 and bottom 300 px; the Ko-fi cover crops its sides on phones, and the X header’s lower left sits under the profile picture.${site ? '' : ''}</p>
${foot(5, total)}</section>` : ''

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(cfg.name)} brand guidelines</title>
${gf ? `<link rel="stylesheet" href="${gf}">` : ''}<style>
@page{size:letter;margin:0}
*{box-sizing:border-box}html,body{margin:0;background:#d9d9d9}
body{font:11px/1.5 ${ff(body)};color:#222;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:8.5in;height:11in;padding:.55in .6in .5in;background:#fff;position:relative;overflow:hidden;margin:0 auto 24px;display:flex;flex-direction:column;gap:14px;page-break-after:always;break-after:page}
@media print{html,body{background:#fff}.page{margin:0}}
h1,h2,h3{font-family:${ff(disp)};margin:0;color:${ink}}
.top{display:flex;align-items:center;gap:8px;font-size:10px;color:#666;padding-bottom:10px;border-bottom:1px solid #e5e5e5}
.top b{color:${ink};font-family:${ff(disp)};font-size:12px}.top .tm{height:16px}.top .r{margin-left:auto}
.cover{display:flex;justify-content:space-between;align-items:center;margin-top:18px}
h1{font-size:68px;line-height:.98;font-weight:${disp?.weight || 700};letter-spacing:-.02em}
.bigmark{height:130px}
.intro{display:grid;grid-template-columns:1fr 1.4fr;gap:28px;align-items:start}
.lead{font-family:${ff(disp)};font-weight:${disp?.weight || 700};font-size:17px;line-height:1.3;color:${ink};margin:0}
.about p{margin:0 0 6px;color:#444}
.sec{display:flex;align-items:center;gap:12px;margin-top:10px}
.sec h2{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${highlight}}
.sec .rule{flex:1;height:1.5px;background:${highlight};opacity:.5}
.pill{background:${highlight};color:${onHighlight};border-radius:20px;padding:1px 12px;font-size:10px;font-weight:700}
.hero{border-radius:14px;height:2.75in;display:grid;place-items:center}.hero img{max-height:62%;max-width:78%}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.tile{margin:0;border-radius:12px;height:1.95in;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}
.tile img{max-width:80%}.tile figcaption{font-size:9.5px;letter-spacing:.06em;text-transform:uppercase}
.note{color:#555;margin:0;font-size:10.5px}
h3{font-size:13px;margin:4px 0 8px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.grid{border-radius:12px;height:3in;display:grid;place-items:center;margin-bottom:8px;
  background-color:#fafafa;background-image:linear-gradient(#e9e9e9 1px,transparent 1px),linear-gradient(90deg,#e9e9e9 1px,transparent 1px);background-size:15px 15px}
.csbox{outline:1.5px dashed #d33;outline-offset:0;background:rgba(255,255,255,.6)}.csbox img{display:block}
.mins{display:flex;align-items:flex-end;gap:26px;margin-bottom:10px;padding:14px 16px;border-radius:12px;background:#fafafa}.min{margin:0;display:flex;flex-direction:column;gap:8px;font-size:9.5px;color:#555}.min div{display:flex;align-items:flex-end;min-height:20px}.min figcaption{line-height:1.3}
.row{display:flex;gap:10px}.mono{flex:1;height:.95in;border-radius:10px;display:grid;place-items:center}.mono img{max-width:78%;max-height:44%}
.donts{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.dont{margin:0}.dont div{height:1.15in;border-radius:10px;background:#f6f6f6;display:grid;place-items:center;overflow:hidden}.dont img{height:54px}
.dont figcaption{font-size:9.5px;color:#555;margin-top:5px;display:flex;gap:6px;align-items:center}.dont i{font-style:normal;color:#fff;background:#d33;border-radius:50%;width:14px;height:14px;display:grid;place-items:center;font-size:8px}
.icons{display:flex;align-items:flex-end;gap:22px}.icons figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:9.5px;color:#555}.icons .note{flex:1;align-self:center}
.spec{display:grid;grid-template-columns:2.1in 1fr;gap:20px;align-items:center}
.aa{font-size:118px;line-height:1;letter-spacing:-.03em}
.fam{font-size:15px;font-weight:700;color:${ink};margin:0 0 6px;font-family:${ff(disp)}}.fam span{font:500 10px ${ff(body)};color:#777;letter-spacing:.06em;text-transform:uppercase;margin-left:6px}
.wts{margin:10px 0 0;display:flex;gap:22px;font-size:20px;color:${ink}}.abc{margin:0;font-size:15px;line-height:1.45;color:#333;letter-spacing:.02em}
.sample{border-left:3px solid ${highlight};padding:4px 0 4px 16px}
.bar{display:flex;height:.85in;border-radius:12px;overflow:hidden}
.swatches{display:grid;grid-template-columns:repeat(3,1fr);gap:14px 18px}
.sw{display:flex;gap:10px;font-size:9.5px;line-height:1.45;color:#444}.sw i{flex:none;width:30px;height:30px;border-radius:50%}.sw b{color:#111;font-size:11px}.sw span{color:#888;text-transform:uppercase;letter-spacing:.05em;font-size:8.5px}
.foot{margin-top:auto;display:flex;justify-content:space-between;font-size:9px;color:#888;border-top:1px solid #e5e5e5;padding-top:8px}
code{font:10px ui-monospace,Menlo,monospace}
.shot{width:100%;border-radius:10px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.cards{display:flex;gap:24px;justify-content:center;padding:22px;background:#f2f3f2;border-radius:12px}.cards figure,.slides figure,.posts figure,.banners figure{margin:0;display:flex;flex-direction:column;gap:6px;font-size:9.5px;color:#555}
.cards img{width:3.2in;border-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.12),0 6px 16px rgba(0,0,0,.1)}
.slides{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.slides img{width:100%;border-radius:4px;box-shadow:0 0 0 1px #e3e3e3}
.posts{display:flex;gap:12px;align-items:flex-end}.posts img{height:1.55in;border-radius:4px;box-shadow:0 0 0 1px #e3e3e3}
.banners{display:flex;gap:12px}.banners figure{flex:1}.banners img{width:100%;border-radius:4px}
</style></head><body>${p1}${p2}${p3}${p4}${p5}</body></html>`

  const file = join(out, 'brand-guidelines.html')
  writeFileSync(file, html)
  const page = await b.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 1.5 })
  await page.goto(pathToFileURL(resolve(file)).href, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  const written = [file]
  const pages = await page.locator('.page').all()
  for (const [i, el] of pages.entries()) {
    const png = join(out, `brand-guidelines-${i + 1}.png`)
    await el.screenshot({ path: png })
    written.push(png)
  }
  // Pages that overflow get clipped by .page's overflow:hidden; flag them so they get fixed.
  const overflow = await page.$$eval('.page', (els) => els.map((e, i) => (e.scrollHeight > e.clientHeight + 1 ? i + 1 : 0)).filter(Boolean))
  if (overflow.length) console.error(`brand-guidelines: page ${overflow.join(', ')} overflows Letter; shorten "about" or the colour list`)
  await page.emulateMedia({ media: 'print' })
  const pdf = join(out, 'brand-guidelines.pdf')
  await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true })
  written.push(pdf)
  await page.close()
  return written
}

/** Rough share of the palette each role gets in the colour bar. */
function roleWeight(role) {
  return { primary: 3, paper: 3, dark: 2, mat: 2, accent: 1.2 }[role] ?? 1
}
