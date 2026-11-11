#!/usr/bin/env node
// social-preview.mjs: draw how a link would unfurl on Slack, Facebook, X,
// LinkedIn and iMessage, from the page's served HTML (no JavaScript, as the
// scrapers do). Zero dependencies; screenshots with Playwright when installed.
//
//   node social-preview.mjs --url https://example.com/page [--url ...] [--out DIR]
//
// Writes DIR/social-preview.html and, with Playwright, DIR/social-preview.png
// (default DIR: current folder). The cards are close approximations of each
// platform's layout, not pixel copies; the platforms' own debuggers are the
// final word.

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { parseSocial, cards, fetchImage, socialFindings } from './lib/social.mjs'

const argv = process.argv.slice(2)
const urls = argv.flatMap((a, i) => (a === '--url' && argv[i + 1] ? [argv[i + 1]] : []))
const oi = argv.indexOf('--out')
const OUT = oi !== -1 && argv[oi + 1] ? argv[oi + 1] : '.'
if (!urls.length || argv.includes('--help')) {
  console.log('usage: node social-preview.mjs --url URL [--url URL ...] [--out DIR]')
  process.exit(urls.length ? 0 : 2)
}
const UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'

const esc = (s = '') => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s || '')

async function dataUri(url) {
  if (!url) return null
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } })
    if (!res.ok) return null
    const type = res.headers.get('content-type') || 'image/png'
    if (!/^image\//.test(type) || /svg/.test(type)) return null // the platforms don't show SVG either
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`
  } catch {
    return null
  }
}

const img = (src, cls) => (src ? `<div class="${cls}" style="background-image:url('${src}')"></div>` : `<div class="${cls} none">no image</div>`)

function section(url, s, c, images, problems) {
  const x = c.x
  return `<section>
  <h2>${esc(url)}</h2>
  ${problems.length ? `<ul class="problems">${problems.map((p) => `<li><b>${p.sev}</b> ${esc(p.msg)}</li>`).join('')}</ul>` : '<p class="ok">No social card problems found.</p>'}
  <div class="grid">
    <figure><figcaption>Slack</figcaption><div class="slack">
      <div class="bar"></div><div>
        <div class="site">${esc(c.slack.site)}</div>
        <div class="t">${esc(clip(c.slack.title, 90)) || '<i>no title</i>'}</div>
        <div class="d">${esc(clip(c.slack.description, 200))}</div>
        ${images.og ? img(images.og, 'slackimg') : ''}
      </div></div></figure>
    <figure><figcaption>Facebook</figcaption><div class="fb">
      ${img(images.og, 'wide')}
      <div class="meta"><div class="h">${esc(c.facebook.host.toUpperCase())}</div>
      <div class="t">${esc(clip(c.facebook.title, 88)) || '<i>no title</i>'}</div>
      <div class="d">${esc(clip(c.facebook.description, 110))}</div></div></div></figure>
    <figure><figcaption>X ${x.card ? `(${esc(x.card)})` : '(no twitter:card)'}</figcaption>
      ${x.large ? `<div class="x">${img(images.x, 'wide round')}<div class="xh">From ${esc(x.host)}</div><div class="xt">${esc(clip(x.title, 70))}</div></div>`
        : `<div class="xs">${img(images.x, 'sq')}<div><div class="xh">${esc(x.host)}</div><div class="t">${esc(clip(x.title, 70))}</div><div class="d">${esc(clip(x.description, 100))}</div></div></div>`}</figure>
    <figure><figcaption>LinkedIn</figcaption><div class="li">
      ${img(images.og, 'wide')}
      <div class="meta"><div class="t">${esc(clip(c.linkedin.title, 70)) || '<i>no title</i>'}</div><div class="h">${esc(c.linkedin.host)}</div></div></div></figure>
    <figure><figcaption>iMessage</figcaption><div class="im">
      ${img(images.og, 'wide')}
      <div class="meta"><div class="t">${esc(clip(c.imessage.title, 60)) || esc(c.imessage.host)}</div><div class="h">${esc(c.imessage.host)}</div></div></div></figure>
  </div>
</section>`
}

const CSS = `
body{margin:0;padding:24px;background:#f3f4f6;font:14px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#1c1e21;width:1100px}
h1{font-size:18px;margin:0 0 4px} .note{color:#555;margin:0 0 20px}
section{background:#fff;border-radius:12px;padding:20px;margin-bottom:24px}
h2{font-size:14px;font-weight:600;margin:0 0 10px;word-break:break-all}
.problems{margin:0 0 14px;padding-left:18px;color:#8a1c1c} .ok{color:#17663a;margin:0 0 14px}
.grid{display:grid;grid-template-columns:repeat(2,500px);gap:20px 40px}
figure{margin:0} figcaption{font-size:12px;color:#666;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}
.none{display:flex;align-items:center;justify-content:center;color:#999;background:#e5e7eb!important;font-size:13px}
.wide{width:100%;aspect-ratio:1.91/1;background:center/cover no-repeat #ddd}
.wide.none{aspect-ratio:auto;height:34px}
.round{border-radius:16px}
.slack{display:flex;gap:10px;font-family:Lato,Helvetica,Arial,sans-serif;color:#1d1c1d}
.slack .bar{width:4px;border-radius:4px;background:#ddd;flex:none}
.slack .site{font-weight:700;font-size:13px} .slack .t{color:#1264a3;font-weight:700} .slack .d{margin:2px 0 6px}
.slackimg{width:360px;aspect-ratio:1.91/1;border-radius:8px;background:center/cover no-repeat #ddd}
.fb,.li,.im{border:1px solid #dadde1;border-radius:2px;overflow:hidden;background:#f0f2f5}
.meta{padding:10px 12px} .h{font-size:12px;color:#65676b} .t{font-weight:600;font-size:16px;margin:2px 0} .d{color:#65676b;font-size:14px}
.li{background:#fff;border-radius:8px} .li .t{font-size:14px}
.im{border-radius:18px;background:#e9e9eb;border:none} .im .t{font-size:14px}
.x .xh{font-size:13px;color:#536471;margin-top:4px} .x .xt{display:none}
.xs{display:flex;border:1px solid #cfd9de;border-radius:16px;overflow:hidden} .xs .sq{width:130px;height:130px;flex:none;background:center/cover no-repeat #ddd}
.xs>div:last-child{padding:12px} .xh{color:#536471;font-size:13px}`

async function main() {
  const sections = []
  let worst = 0
  for (const u of urls) {
    let html = ''
    let status = 0
    let finalUrl = u
    try {
      const res = await fetch(u, { headers: { 'user-agent': UA, accept: 'text/html' } })
      status = res.status
      finalUrl = res.url
      html = await res.text()
    } catch (e) {
      console.error(`Could not fetch ${u}: ${e.cause?.code || e.message}`)
      process.exit(2)
    }
    const s = parseSocial(html, finalUrl)
    const c = cards(s)
    const firstImg = s.og.images[0]?.url
    const imgInfo = firstImg ? await fetchImage(firstImg, { ua: UA }) : null
    const problems = []
    if (status !== 200) problems.push({ sev: 'P1', msg: `Page answers ${status} to a link-preview scraper.` })
    socialFindings(s, imgInfo, (sev, id, msg) => problems.push({ sev, id, msg }), { pageIsHttps: /^https:/.test(finalUrl) })
    problems.sort((a, b) => a.sev.localeCompare(b.sev))
    if (problems.some((p) => p.sev === 'P1')) worst = 1
    const images = { og: await dataUri(firstImg), x: c.x.image === firstImg ? null : await dataUri(c.x.image) }
    images.x = images.x || images.og
    sections.push(section(u, s, c, images, problems))
    console.log(`${u}\n  title: ${c.facebook.title || '—'}\n  description: ${c.facebook.description || '—'}\n  image: ${firstImg || '—'}${imgInfo?.size?.width ? ` (${imgInfo.size.width}×${imgInfo.size.height}, ${Math.round(imgInfo.bytes / 1024)} KB)` : ''}\n  twitter:card: ${s.twitter.card || '—'}`)
    for (const p of problems) console.log(`  ${p.sev} ${p.id || ''} ${p.msg}`)
  }
  const page = `<!doctype html><meta charset="utf-8"><title>Social previews</title><style>${CSS}</style>
<h1>Link previews</h1><p class="note">Built from the served HTML, as the scrapers see it. Layouts approximate each platform; confirm with the Facebook Sharing Debugger, LinkedIn Post Inspector, or by pasting the link in a Slack DM to yourself.</p>
${sections.join('\n')}`
  mkdirSync(OUT, { recursive: true })
  const htmlPath = join(OUT, 'social-preview.html')
  writeFileSync(htmlPath, page)
  console.log(`\nwrote ${htmlPath}`)

  let pw = null
  try {
    pw = await import('playwright')
  } catch {
    try {
      pw = createRequire(join(execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'noop.js'))('playwright')
    } catch {}
  }
  if (pw) {
    const browser = await pw.chromium.launch()
    const p = await browser.newPage({ viewport: { width: 1148, height: 800 }, deviceScaleFactor: 1 })
    await p.setContent(page, { waitUntil: 'load' })
    const png = join(OUT, 'social-preview.png')
    await p.screenshot({ path: png, fullPage: true })
    await browser.close()
    console.log(`wrote ${png}`)
  } else {
    console.log('Playwright not installed: open the HTML file to see the cards.')
  }
  process.exit(worst)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
