#!/usr/bin/env node
// seo-check.mjs: zero-dependency technical SEO evidence collector (Node 18+).
//
//   node seo-check.mjs --url https://example.com [--max 25] [--pages /a,/b]
//                      [--render auto|on|off] [--json out.json] [--md out.md]
//
// Fetches robots.txt, the sitemap(s) and a sample of pages from one site (live,
// a preview deploy or a local build on http://localhost), checks crawl and index
// controls, metadata, canonicals, hreflang, structured data and the raw-vs-
// rendered gap that single-page apps have, and prints findings graded P1/P2/P3.
// Exit 0: no P1. Exit 1: at least one P1. Exit 2: usage error or the site
// could not be fetched at all.
//
// It only reads: it sends GET requests to the one site it is pointed at, never
// submits forms, and treats everything it fetches as data.

import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const VERSION = '1.0.0'

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2)
function opt(name, fallback) {
  const i = argv.indexOf(`--${name}`)
  if (i === -1) return fallback
  const v = argv[i + 1]
  return v === undefined || v.startsWith('--') ? true : v
}
if (argv.includes('--help') || argv.includes('-h') || !opt('url')) {
  console.log(`seo-check ${VERSION}
  --url URL         site to check (required): live, preview or http://localhost:PORT
  --max N           pages to sample (default 25)
  --pages LIST      comma-separated paths or URLs to always include
  --render MODE     auto (default: render with Playwright when installed), on, off
  --max-links N     internal links to status-check (default 150, 0 to skip)
  --json FILE       write the full result as JSON
  --md FILE         write the report as Markdown
  --ua STRING       user agent (default identifies seo-check)
  --timeout MS      per request (default 15000)
  --delay MS        between requests (default 150)`)
  process.exit(argv.includes('--help') || argv.includes('-h') ? 0 : 2)
}

let base
try {
  base = new URL(opt('url'))
} catch {
  console.error(`Not a URL: ${opt('url')}`)
  process.exit(2)
}
const MAX = Number(opt('max', 25))
const MAX_LINKS = Number(opt('max-links', 150))
const RENDER = String(opt('render', 'auto'))
const TIMEOUT = Number(opt('timeout', 15000))
const DELAY = Number(opt('delay', 150))
const UA = String(opt('ua', `Mozilla/5.0 (compatible; seo-check/${VERSION}; +https://github.com/mtblck/claude-marketplace)`))
const LOCAL = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(base.hostname)
const origin = base.origin

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------- fetching

const cache = new Map()

// GET with redirects followed by hand, so the chain is on record.
async function get(url, { maxHops = 5, accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' } = {}) {
  if (cache.has(url)) return cache.get(url)
  const chain = []
  let current = url
  let res
  for (let hop = 0; hop <= maxHops; hop++) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT)
    try {
      res = await fetch(current, { redirect: 'manual', signal: ctrl.signal, headers: { 'user-agent': UA, accept } })
    } catch (e) {
      clearTimeout(t)
      const out = { url, finalUrl: current, status: 0, error: e.cause?.code || e.name || String(e), chain, headers: {}, body: '' }
      cache.set(url, out)
      return out
    }
    clearTimeout(t)
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const next = new URL(res.headers.get('location'), current).href
      chain.push({ from: current, to: next, status: res.status })
      current = next
      await res.arrayBuffer().catch(() => {})
      continue
    }
    break
  }
  const headers = Object.fromEntries(res.headers.entries())
  const type = headers['content-type'] || ''
  const textual = /text|xml|json|javascript/.test(type) || type === ''
  const body = textual ? await res.text().catch(() => '') : (await res.arrayBuffer().catch(() => {}), '')
  const out = { url, finalUrl: current, status: res.status, chain, headers, body, tooManyHops: chain.length > maxHops }
  cache.set(url, out)
  await sleep(DELAY)
  return out
}

// ---------------------------------------------------------------- HTML

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }
const decode = (s = '') =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENT[e.toLowerCase()] ?? m
  })
const squash = (s) => decode(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()

function attrs(src = '') {
  const out = {}
  const re = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let m
  while ((m = re.exec(src))) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '')
  return out
}

function tags(html, name) {
  const re = new RegExp(`<${name}\\b((?:[^>"']|"[^"]*"|'[^']*')*)>`, 'gi')
  const out = []
  let m
  while ((m = re.exec(html))) out.push(attrs(m[1].replace(/\/$/, '')))
  return out
}

function extract(html, pageUrl) {
  const jsonld = []
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/application\/ld\+json/i.test(attrs(m[1]).type || '')) continue
    try {
      const data = JSON.parse(m[2].trim())
      const types = new Set()
      const walk = (n) => {
        if (Array.isArray(n)) return n.forEach(walk)
        if (n && typeof n === 'object') {
          if (n['@type']) [].concat(n['@type']).forEach((t) => types.add(String(t)))
          Object.values(n).forEach(walk)
        }
      }
      walk(data)
      jsonld.push({ ok: true, types: [...types] })
    } catch (e) {
      jsonld.push({ ok: false, error: e.message.slice(0, 120) })
    }
  }
  const clean = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1\s*>/gi, ' ')
  const head = (clean.match(/<head\b[\s\S]*?<\/head\s*>/i) || [clean])[0]
  const metas = tags(head, 'meta')
  const meta = (key) => {
    const hit = metas.find((a) => (a.name || a.property || '').toLowerCase() === key)
    return hit ? hit.content ?? '' : null
  }
  const linkTags = tags(head, 'link')
  const rel = (r) => linkTags.filter((a) => (a.rel || '').toLowerCase().split(/\s+/).includes(r))
  const titleM = clean.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)
  const htmlTag = tags(clean, 'html')[0] || {}
  const headings = [...clean.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)].map((m) => ({ level: +m[1], text: squash(m[2]).slice(0, 120) }))
  const body = (clean.match(/<body\b[\s\S]*$/i) || [clean])[0]
  const text = squash(body)
  const abs = (h) => {
    try {
      return new URL(h, pageUrl).href
    } catch {
      return null
    }
  }
  const links = [...clean.matchAll(/<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/a\s*>/gi)].map((m) => {
    const a = attrs(m[1])
    return { href: a.href ?? null, abs: a.href ? abs(a.href) : null, rel: a.rel || '', text: squash(m[2]).slice(0, 80) }
  })
  const images = tags(body, 'img').map((a) => ({ src: a.src || a['data-src'] || '', alt: 'alt' in a ? a.alt : null, width: a.width, height: a.height, role: a.role, hidden: 'aria-hidden' in a }))
  const mixed = /^https:/.test(pageUrl)
    ? [...clean.matchAll(/<(?:img|script|link|iframe|source|video|audio)\b[^>]*\s(?:src|href)\s*=\s*["']?(http:\/\/[^"'\s>]+)/gi)].map((m) => m[1])
    : []
  return {
    title: titleM ? squash(titleM[1]) : null,
    titleCount: (clean.match(/<title\b/gi) || []).length,
    description: meta('description'),
    robots: [meta('robots'), meta('googlebot')].filter(Boolean).join(', ') || null,
    canonicals: rel('canonical').map((a) => a.href || ''),
    hreflang: rel('alternate').filter((a) => a.hreflang).map((a) => ({ lang: a.hreflang, href: abs(a.href || '') })),
    lang: htmlTag.lang || null,
    viewport: meta('viewport'),
    og: { title: meta('og:title'), description: meta('og:description'), image: meta('og:image'), url: meta('og:url'), type: meta('og:type') },
    twitter: meta('twitter:card'),
    headings,
    h1: headings.filter((h) => h.level === 1).map((h) => h.text),
    words: text ? text.split(' ').length : 0,
    links,
    images,
    jsonld,
    mixed: [...new Set(mixed)],
    base: (tags(head, 'base')[0] || {}).href || null,
  }
}

// ---------------------------------------------------------------- robots.txt (RFC 9309)

function parseRobots(txt) {
  const groups = []
  const sitemaps = []
  let cur = null
  let lastWasAgent = false
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim()
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i)
    if (!m) continue
    const key = m[1].toLowerCase()
    const val = m[2].trim()
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) groups.push((cur = { agents: [], rules: [] }))
      cur.agents.push(val.toLowerCase())
      lastWasAgent = true
    } else if (key === 'allow' || key === 'disallow') {
      if (cur) cur.rules.push({ allow: key === 'allow', path: val })
      lastWasAgent = false
    } else if (key === 'sitemap') {
      sitemaps.push(val)
    } else {
      lastWasAgent = false
    }
  }
  return { groups, sitemaps }
}

function ruleMatches(pattern, path) {
  if (pattern === '') return false
  const anchored = pattern.endsWith('$')
  const body = anchored ? pattern.slice(0, -1) : pattern
  const re = new RegExp('^' + body.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + (anchored ? '$' : ''))
  return re.test(path)
}

// Returns { allowed, group } for one user-agent token and path.
function robotsAllows(robots, agent, path) {
  const token = agent.toLowerCase()
  let groups = robots.groups.filter((g) => g.agents.includes(token))
  if (!groups.length) groups = robots.groups.filter((g) => g.agents.includes('*'))
  const rules = groups.flatMap((g) => g.rules)
  let best = null
  for (const r of rules) {
    if (!ruleMatches(r.path, path)) continue
    const len = r.path.replace(/\$$/, '').length
    if (!best || len > best.len || (len === best.len && r.allow)) best = { ...r, len }
  }
  return { allowed: best ? best.allow : true, rule: best ? `${best.allow ? 'Allow' : 'Disallow'}: ${best.path}` : null, matched: groups.length ? groups[0].agents.join(', ') : 'none' }
}

// Search engines first, then AI search and assistant fetchers, then training-only
// crawlers and control tokens. `kind` decides how a block is graded.
const CRAWLERS = [
  ['Googlebot', 'search'], ['Bingbot', 'search'], ['Applebot', 'search'], ['DuckDuckBot', 'search'], ['YandexBot', 'search'],
  ['OAI-SearchBot', 'ai-search'], ['ChatGPT-User', 'ai-user'], ['Claude-SearchBot', 'ai-search'], ['Claude-User', 'ai-user'],
  ['PerplexityBot', 'ai-search'], ['Perplexity-User', 'ai-user'], ['DuckAssistBot', 'ai-search'], ['MistralAI-User', 'ai-user'],
  ['GPTBot', 'ai-training'], ['ClaudeBot', 'ai-training'], ['CCBot', 'ai-training'], ['Meta-ExternalAgent', 'ai-training'],
  ['Bytespider', 'ai-training'], ['Amazonbot', 'ai-training'],
  ['Google-Extended', 'control-token'], ['Applebot-Extended', 'control-token'],
]

// ---------------------------------------------------------------- sitemaps

async function readSitemaps(urls, limit = 20) {
  const seen = new Set()
  const out = { files: [], urls: [], errors: [] }
  const queue = [...urls]
  while (queue.length && out.files.length < limit) {
    const u = queue.shift()
    if (seen.has(u)) continue
    seen.add(u)
    const r = await get(u, { accept: 'application/xml,text/xml;q=0.9,*/*;q=0.5' })
    if (r.status !== 200) {
      out.errors.push({ url: u, status: r.status || r.error })
      continue
    }
    const xml = r.body
    if (!/<(urlset|sitemapindex)\b/i.test(xml)) {
      out.errors.push({ url: u, status: 'not a sitemap (no <urlset> or <sitemapindex>)', type: r.headers['content-type'] })
      continue
    }
    const isIndex = /<sitemapindex\b/i.test(xml)
    const entries = [...xml.matchAll(/<(url|sitemap)\b[\s\S]*?<\/\1\s*>/gi)].map((m) => ({
      loc: decode((m[0].match(/<loc>\s*([\s\S]*?)\s*<\/loc>/i) || [])[1] || '').trim(),
      lastmod: ((m[0].match(/<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/i) || [])[1] || '').trim() || null,
    }))
    out.files.push({ url: u, index: isIndex, count: entries.length, bytes: Buffer.byteLength(xml) })
    if (isIndex) queue.push(...entries.map((e) => e.loc).filter(Boolean))
    else out.urls.push(...entries.filter((e) => e.loc))
  }
  return out
}

// ---------------------------------------------------------------- rendering

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {}
  try {
    const root = execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    return createRequire(join(root, 'noop.js'))('playwright')
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- findings

const findings = []
function add(sev, id, msg, url = null, evidence = null) {
  findings.push({ sev, id, msg, url, evidence })
}

const norm = (u) => {
  try {
    const x = new URL(u)
    x.hash = ''
    return x.href
  } catch {
    return u
  }
}
const sameSite = (u) => {
  try {
    return new URL(u).origin === origin
  } catch {
    return false
  }
}
const pathOf = (u) => {
  const x = new URL(u)
  return x.pathname + x.search
}
const isNoindex = (robots) => /\b(noindex|none)\b/i.test(robots || '')
const VALID_LANG = /^(x-default|[a-z]{2,3}(-[A-Za-z]{4})?(-([A-Za-z]{2}|\d{3}))?)$/i

// ---------------------------------------------------------------- main

async function main() {
  const startedAt = new Date().toISOString()
  const home = await get(base.href)
  if (home.status === 0) {
    console.error(`Could not fetch ${base.href}: ${home.error}. If this is a cloud sandbox, the network policy may block the host: audit a local build instead (--url http://localhost:PORT).`)
    process.exit(2)
  }

  // robots.txt
  const robotsRes = await get(`${origin}/robots.txt`, { accept: 'text/plain,*/*;q=0.5' })
  let robots = { groups: [], sitemaps: [] }
  const robotsInfo = { status: robotsRes.status, finalUrl: robotsRes.finalUrl }
  if (robotsRes.status >= 500 || robotsRes.status === 0) {
    add('P1', 'robots.unreachable', `robots.txt answers ${robotsRes.status || robotsRes.error}; Google treats a 5xx robots.txt as "disallow everything" until it recovers.`, robotsRes.url)
  } else if (robotsRes.status === 200 && /<html/i.test(robotsRes.body.slice(0, 500))) {
    add('P2', 'robots.html', 'robots.txt returns an HTML page (likely the SPA fallback), so crawlers get no rules and no Sitemap line.', robotsRes.url)
  } else if (robotsRes.status === 200) {
    robots = parseRobots(robotsRes.body)
    robotsInfo.body = robotsRes.body.slice(0, 4000)
    if (!robots.sitemaps.length) add('P3', 'robots.no-sitemap', 'robots.txt has no Sitemap: line.', robotsRes.url)
  } else {
    add('P3', 'robots.missing', `No robots.txt (${robotsRes.status}). Crawlers treat that as "allow all"; add one with a Sitemap: line.`, robotsRes.url)
  }

  const matrix = CRAWLERS.map(([agent, kind]) => ({ agent, kind, ...robotsAllows(robots, agent, '/') }))
  for (const c of matrix) {
    if (c.allowed) continue
    if (c.kind === 'search') add('P1', 'robots.blocks-search', `robots.txt blocks ${c.agent} from the home page (${c.rule}).`, robotsRes.url)
    if (c.kind === 'ai-search' || c.kind === 'ai-user') add('P3', 'robots.blocks-ai-search', `robots.txt blocks ${c.agent} (${c.rule}): the site cannot be cited by that AI search product. Fine if intended.`, robotsRes.url)
  }

  // sitemaps
  const smUrls = robots.sitemaps.length ? robots.sitemaps : [`${origin}/sitemap.xml`]
  const sm = await readSitemaps(smUrls)
  if (!sm.files.length) {
    add('P2', 'sitemap.missing', `No readable XML sitemap (${sm.errors.map((e) => `${e.url}: ${e.status}`).join('; ') || 'none listed'}).`, smUrls[0])
  } else {
    for (const e of sm.errors) add('P2', 'sitemap.unreadable', `Sitemap ${e.url} could not be read: ${e.status}.`, e.url)
    for (const f of sm.files) if (f.count > 50000 || f.bytes > 50 * 1024 * 1024) add('P2', 'sitemap.too-large', `Sitemap over the 50,000 URL / 50 MB limit (${f.count} URLs, ${f.bytes} bytes).`, f.url)
    const foreign = sm.urls.filter((u) => !sameSite(u.loc))
    if (foreign.length && !LOCAL) add('P2', 'sitemap.other-host', `${foreign.length} sitemap URL(s) are on another host or protocol than ${origin} (e.g. ${foreign[0].loc}).`, sm.files[0].url)
    if (foreign.length && LOCAL) add('P3', 'sitemap.absolute-production', `The local build's sitemap lists production URLs (e.g. ${foreign[0].loc}); they were mapped onto ${origin} for this run.`, sm.files[0].url)
    const mods = sm.urls.map((u) => u.lastmod).filter(Boolean)
    if (mods.length > 5 && new Set(mods).size === 1) add('P3', 'sitemap.lastmod-uniform', `Every <lastmod> is ${mods[0]}: a build-time stamp, not real change dates, so search engines learn to ignore it.`, sm.files[0].url)
  }

  // choose pages: given ones, then an even spread across the sitemap, else a crawl
  const toLocal = (u) => {
    if (!LOCAL || sameSite(u)) return norm(u)
    try {
      const x = new URL(u)
      return norm(origin + x.pathname + x.search)
    } catch {
      return u
    }
  }
  const pages = new Set([norm(home.url)])
  const given = String(opt('pages', '') || '').split(',').map((s) => s.trim()).filter(Boolean)
  for (const p of given) pages.add(norm(new URL(p, origin).href))
  const smLocs = [...new Set(sm.urls.map((u) => toLocal(u.loc)))]
  const inSitemap = new Set(smLocs)
  if (smLocs.length) {
    const step = Math.max(1, smLocs.length / Math.max(1, MAX - pages.size))
    for (let i = 0; i < smLocs.length && pages.size < MAX; i += step) pages.add(smLocs[Math.floor(i)])
  }

  // crawl: fetch pages, add discovered internal links while under MAX
  const results = []
  const queue = [...pages]
  const queued = new Set(queue)
  while (queue.length && results.length < MAX) {
    const u = queue.shift()
    const r = await get(u)
    const ex = /html/i.test(r.headers['content-type'] || '') || /<html/i.test(r.body.slice(0, 1000)) ? extract(r.body, r.finalUrl) : null
    results.push({ url: u, finalUrl: r.finalUrl, status: r.status, error: r.error, chain: r.chain, xRobots: r.headers['x-robots-tag'] || null, contentType: r.headers['content-type'] || null, raw: ex })
    if (ex && !smLocs.length) {
      for (const l of ex.links) {
        if (!l.abs || !sameSite(l.abs) || /nofollow/i.test(l.rel)) continue
        const n = norm(l.abs)
        if (!queued.has(n) && !/\.(png|jpe?g|gif|webp|avif|svg|pdf|zip|ico|xml|txt|json|css|js)$/i.test(new URL(n).pathname)) {
          queued.add(n)
          queue.push(n)
        }
      }
    }
  }

  // render pass
  let renderNote = 'off'
  if (RENDER !== 'off') {
    const pw = await loadPlaywright()
    if (!pw) {
      renderNote = 'Playwright not installed: raw HTML only'
      if (RENDER === 'on') {
        console.error('--render on, but Playwright is not installed.')
        process.exit(2)
      }
    } else {
      let browser
      try {
        browser = await pw.chromium.launch()
        const ctx = await browser.newContext({ userAgent: UA })
        for (const p of results) {
          if (!p.raw || p.status !== 200) continue
          const page = await ctx.newPage()
          try {
            await page.goto(p.finalUrl, { waitUntil: 'networkidle', timeout: TIMEOUT * 2 })
            p.rendered = extract(await page.content(), p.finalUrl)
          } catch (e) {
            p.renderError = e.message.split('\n')[0]
          }
          await page.close()
        }
        renderNote = 'rendered with Playwright Chromium'
      } catch (e) {
        renderNote = `render failed: ${e.message.split('\n')[0]}`
      } finally {
        await browser?.close()
      }
    }
  }

  // host consolidation and soft 404 (live sites only for host checks)
  if (!LOCAL && base.protocol === 'https:') {
    const http = await get(`http://${base.host}/`)
    if (http.status === 200 && !http.chain.length) add('P1', 'host.http', `http://${base.host}/ serves the site without redirecting to https.`, `http://${base.host}/`)
    const alt = base.hostname.startsWith('www.') ? base.hostname.slice(4) : `www.${base.hostname}`
    const other = await get(`https://${alt}/`)
    if (other.status === 200 && !other.chain.length) add('P2', 'host.duplicate', `Both ${base.hostname} and ${alt} serve the site; one should 301 to the other.`, `https://${alt}/`)
  }
  const probe = await get(`${origin}/seo-check-${Math.random().toString(36).slice(2, 10)}`)
  if (probe.status === 200) {
    const ex = extract(probe.body, probe.finalUrl)
    add('P2', 'soft-404', `A made-up URL returns 200${ex.title ? ` with title "${ex.title}"` : ''} instead of 404. Unknown URLs become indexable duplicates (typical SPA fallback); return a real 404 or noindex the not-found view.`, probe.url)
  }

  // per-page checks
  const titles = new Map()
  const descs = new Map()
  const byUrl = new Map(results.map((p) => [p.finalUrl, p]))
  for (const p of results) {
    const listed = inSitemap.has(p.url)
    if (p.status !== 200) {
      add(listed ? 'P1' : 'P2', 'page.status', `${listed ? 'Sitemap URL' : 'Page'} answers ${p.status || p.error}.`, p.url)
      continue
    }
    if (p.chain.length) {
      if (listed) add('P2', 'sitemap.redirect', `Sitemap lists a URL that redirects (${p.chain.map((c) => c.status).join(' → ')} → ${p.finalUrl}); list the final URL.`, p.url)
      else if (p.chain.length > 1) add('P2', 'page.redirect-chain', `${p.chain.length} redirect hops to ${p.finalUrl}.`, p.url)
    }
    const d = p.raw
    if (!d) continue
    const r = p.rendered
    const robotsVal = [d.robots, p.xRobots].filter(Boolean).join(', ')
    if (isNoindex(robotsVal)) {
      if (listed) add('P1', 'page.noindex-in-sitemap', `Page is noindex (${robotsVal}) but listed in the sitemap.`, p.url)
      else add('P3', 'page.noindex', `Page is noindex (${robotsVal}); confirm that is intended.`, p.url)
      continue
    }
    if (r && !isNoindex(d.robots) && isNoindex(r.robots)) add('P2', 'render.noindex', 'Raw HTML is indexable but JavaScript adds noindex: Google may index the shell before it renders.', p.url)

    const title = d.title || r?.title
    if (!title) add('P1', 'title.missing', 'No <title>.', p.url)
    else {
      if (!d.title && r?.title) add('P2', 'title.js-only', `Title "${r.title}" only exists after JavaScript runs; crawlers that do not render (most AI bots, link previews) see none.`, p.url)
      if (title.length > 65) add('P3', 'title.long', `Title is ${title.length} characters and will be cut off in results: "${title}".`, p.url)
      if (title.length < 15) add('P3', 'title.short', `Title is only ${title.length} characters: "${title}".`, p.url)
      titles.set(title, [...(titles.get(title) || []), p.url])
    }
    if (d.titleCount > 1) add('P2', 'title.multiple', `${d.titleCount} <title> elements in the raw HTML.`, p.url)
    if (r?.title && d.title && r.title !== d.title) add('P3', 'title.changes', `JavaScript changes the title from "${d.title}" to "${r.title}"; non-rendering crawlers see the first.`, p.url)

    const desc = d.description ?? r?.description
    if (!desc) add('P2', 'description.missing', 'No meta description.', p.url)
    else {
      if (d.description == null && r?.description) add('P3', 'description.js-only', 'Meta description only exists after JavaScript runs.', p.url)
      if (desc.length > 160) add('P3', 'description.long', `Meta description is ${desc.length} characters (about 160 show).`, p.url)
      if (desc.length < 50) add('P3', 'description.short', `Meta description is only ${desc.length} characters.`, p.url)
      descs.set(desc, [...(descs.get(desc) || []), p.url])
    }

    const canon = d.canonicals.length ? d.canonicals : r?.canonicals || []
    if (!canon.length) add('P2', 'canonical.missing', 'No rel=canonical.', p.url)
    else if (new Set(canon).size > 1) add('P1', 'canonical.conflict', `Conflicting canonicals: ${[...new Set(canon)].join(' | ')}.`, p.url)
    else {
      if (!d.canonicals.length) add('P2', 'canonical.js-only', 'rel=canonical only exists after JavaScript runs; Google may pick its own canonical first.', p.url)
      if (r?.canonicals?.length && d.canonicals.length && r.canonicals[0] !== d.canonicals[0]) add('P1', 'canonical.changes', `Raw canonical ${d.canonicals[0]} differs from rendered ${r.canonicals[0]}.`, p.url)
      if (!/^https?:\/\//i.test(canon[0])) add('P3', 'canonical.relative', `Canonical is relative ("${canon[0]}"); use an absolute URL.`, p.url)
      let target
      try {
        target = new URL(canon[0], p.finalUrl).href
      } catch {}
      if (target) {
        const t = toLocal(target)
        if (norm(t) !== norm(p.finalUrl)) {
          if (LOCAL && !sameSite(target)) {
            // production canonical on a local build: compare paths only
            if (new URL(target).pathname !== new URL(p.finalUrl).pathname) add('P3', 'canonical.other', `Canonicalised to another page: ${target}. Fine for duplicates; wrong for a page that should rank.`, p.url)
          } else {
            const tr = await get(t)
            const tex = tr.status === 200 ? extract(tr.body, tr.finalUrl) : null
            if (tr.status !== 200 || tr.chain.length) add('P1', 'canonical.bad-target', `Canonical ${target} answers ${tr.chain.length ? `a redirect to ${tr.finalUrl}` : tr.status || tr.error}.`, p.url)
            else if (tex && isNoindex([tex.robots, tr.headers['x-robots-tag']].join(','))) add('P1', 'canonical.noindex-target', `Canonical ${target} is noindex.`, p.url)
            else add('P3', 'canonical.other', `Canonicalised to another page: ${target}. Fine for duplicates; wrong for a page that should rank.`, p.url)
          }
        }
      }
    }

    const view = r || d
    if (!d.lang && !r?.lang) add('P2', 'html.lang', 'No lang attribute on <html>.', p.url)
    if (!d.viewport) add('P1', 'html.viewport', 'No viewport meta tag: the page is not mobile-friendly for mobile-first indexing.', p.url)
    if (!view.h1.length) add('P2', 'h1.missing', 'No <h1>.', p.url)
    if (view.h1.length > 1) add('P3', 'h1.multiple', `${view.h1.length} <h1> elements: ${view.h1.slice(0, 3).map((t) => `"${t}"`).join(', ')}.`, p.url)
    for (let i = 1; i < view.headings.length; i++) {
      if (view.headings[i].level - view.headings[i - 1].level > 1) {
        add('P3', 'headings.skip', `Heading level jumps from h${view.headings[i - 1].level} to h${view.headings[i].level} ("${view.headings[i].text}").`, p.url)
        break
      }
    }
    if (r && d.words < 50 && r.words >= 150) add('P2', 'render.content-js-only', `The raw HTML has ${d.words} words; the rendered page has ${r.words}. Google renders later, but AI crawlers and link previews do not run JavaScript and see an empty shell. Prerender or server-render public pages.`, p.url)
    else if (!r && d.words < 50) add('P3', 'content.thin-raw', `Raw HTML has only ${d.words} words (no render pass ran to compare).`, p.url)

    const noAlt = view.images.filter((i) => i.alt === null && i.role !== 'presentation' && !i.hidden)
    if (noAlt.length) add('P2', 'img.alt', `${noAlt.length} image(s) without an alt attribute (e.g. ${noAlt[0].src.slice(0, 80)}).`, p.url)
    const noDim = view.images.filter((i) => !i.width || !i.height)
    if (noDim.length) add('P3', 'img.dimensions', `${noDim.length} image(s) without width and height (layout shift).`, p.url)

    const ld = [...d.jsonld, ...(r?.jsonld || [])]
    for (const j of ld.filter((j) => !j.ok)) add('P1', 'jsonld.invalid', `JSON-LD block does not parse: ${j.error}.`, p.url)
    p.schemaTypes = [...new Set(ld.flatMap((j) => j.types || []))]

    const og = r?.og?.title ? r.og : d.og
    if (!d.og.title || !d.og.image) add('P3', 'og.missing', `Raw HTML lacks ${[!d.og.title && 'og:title', !d.og.image && 'og:image'].filter(Boolean).join(' and ')}; link previews (which never run JavaScript) fall back to guesses.`, p.url)
    if (og.image && !/^https?:\/\//i.test(og.image)) add('P3', 'og.relative-image', `og:image is relative ("${og.image}"); most scrapers need an absolute URL.`, p.url)
    if (d.mixed.length) add('P2', 'mixed-content', `${d.mixed.length} http:// resource(s) on an https page (e.g. ${d.mixed[0]}).`, p.url)

    const hl = d.hreflang.length ? d.hreflang : r?.hreflang || []
    if (hl.length) {
      for (const h of hl) if (!VALID_LANG.test(h.lang) || /-uk$/i.test(h.lang)) add('P2', 'hreflang.code', `Invalid hreflang code "${h.lang}" (use ISO 639-1 language plus optional ISO 3166-1 region, e.g. en-GB).`, p.url)
      if (!hl.some((h) => h.href && norm(toLocal(h.href)) === norm(p.finalUrl))) add('P2', 'hreflang.self', 'hreflang set does not include the page itself.', p.url)
      for (const h of hl) {
        if (!h.href || h.lang === 'x-default') continue
        const other = byUrl.get(norm(toLocal(h.href)))
        const ohl = other ? (other.raw?.hreflang.length ? other.raw.hreflang : other.rendered?.hreflang || []) : null
        if (ohl && !ohl.some((x) => x.href && norm(toLocal(x.href)) === norm(p.finalUrl))) add('P1', 'hreflang.return', `${h.href} (${h.lang}) does not link back with hreflang; Google ignores the pair.`, p.url)
      }
    }
  }
  for (const [t, us] of titles) if (us.length > 1) add('P2', 'title.duplicate', `${us.length} pages share the title "${t}": ${us.slice(0, 4).join(', ')}${us.length > 4 ? ' …' : ''}.`, us[0])
  for (const [t, us] of descs) if (us.length > 1) add('P2', 'description.duplicate', `${us.length} pages share one meta description: ${us.slice(0, 4).join(', ')}${us.length > 4 ? ' …' : ''}.`, us[0])

  // internal link status
  const linkTargets = new Map()
  for (const p of results) for (const l of [...(p.raw?.links || []), ...(p.rendered?.links || [])]) {
    if (!l.abs || !sameSite(l.abs) || !/^https?:/.test(l.abs)) continue
    const n = norm(l.abs)
    if (!linkTargets.has(n)) linkTargets.set(n, p.url)
  }
  let checkedLinks = 0
  const unreachable = []
  for (const [u, from] of linkTargets) {
    if (checkedLinks >= MAX_LINKS) break
    checkedLinks++
    const r = await get(u)
    if (r.status === 0) unreachable.push(`${u} (${r.error})`)
    else if (r.status >= 400) add('P2', 'links.broken', `Internal link to ${u} answers ${r.status}.`, from)
    else if (r.chain.length && r.chain[0].status === 302) add('P3', 'links.temp-redirect', `Internal link to ${u} goes through a 302; link to ${r.finalUrl} directly.`, from)
  }
  const jsOnlyNav = results.filter((p) => p.raw && p.rendered && p.raw.links.length === 0 && p.rendered.links.length > 0)
  if (jsOnlyNav.length) add('P3', 'links.js-only', `${jsOnlyNav.length} page(s) have no <a href> links until JavaScript runs.`, jsOnlyNav[0].url)

  // llms.txt: reported, never graded
  const llms = await get(`${origin}/llms.txt`, { accept: 'text/plain,text/markdown,*/*;q=0.5' })
  const llmsInfo = { status: llms.status, present: llms.status === 200 && !/<html/i.test(llms.body.slice(0, 300)) }

  // score: one deduction per kind of problem, not per page, so one template bug
  // doesn't swamp everything. A gauge of this run's checks, not a ranking prediction.
  const W = { P1: 12, P2: 4, P3: 1 }
  const kinds = new Map()
  for (const f of findings) if (!kinds.has(f.id) || W[f.sev] > W[kinds.get(f.id)]) kinds.set(f.id, f.sev)
  const score = Math.max(0, 100 - [...kinds.values()].reduce((s, sev) => s + W[sev], 0))

  const order = { P1: 0, P2: 1, P3: 2 }
  findings.sort((a, b) => order[a.sev] - order[b.sev] || a.id.localeCompare(b.id))
  const counts = { P1: 0, P2: 0, P3: 0 }
  findings.forEach((f) => counts[f.sev]++)

  const result = {
    tool: `seo-check ${VERSION}`,
    startedAt,
    url: base.href,
    local: LOCAL,
    render: renderNote,
    score,
    counts,
    robots: { ...robotsInfo, sitemaps: robots.sitemaps },
    crawlers: matrix.map(({ agent, kind, allowed, rule }) => ({ agent, kind, allowed, rule })),
    sitemaps: { files: sm.files, errors: sm.errors, urlCount: sm.urls.length },
    llmsTxt: llmsInfo,
    pages: results.map((p) => ({
      url: p.url,
      finalUrl: p.finalUrl,
      status: p.status,
      redirects: p.chain.length,
      inSitemap: inSitemap.has(p.url),
      title: p.raw?.title ?? null,
      renderedTitle: p.rendered?.title ?? null,
      description: p.raw?.description ?? null,
      canonical: p.raw?.canonicals?.[0] ?? p.rendered?.canonicals?.[0] ?? null,
      robots: [p.raw?.robots, p.xRobots].filter(Boolean).join(', ') || null,
      h1: (p.rendered || p.raw)?.h1 ?? [],
      wordsRaw: p.raw?.words ?? null,
      wordsRendered: p.rendered?.words ?? null,
      schemaTypes: p.schemaTypes || [],
      hreflang: (p.raw?.hreflang.length ? p.raw.hreflang : p.rendered?.hreflang) || [],
      renderError: p.renderError,
    })),
    linksChecked: checkedLinks,
    linksUnreachable: unreachable,
    findings,
  }

  const md = report(result)
  if (opt('json')) writeFileSync(String(opt('json')), JSON.stringify(result, null, 2))
  if (opt('md')) writeFileSync(String(opt('md')), md)
  console.log(md)
  process.exit(counts.P1 ? 1 : 0)
}

function report(r) {
  const L = []
  L.push(`# seo-check: ${r.url}`, '')
  L.push(`Technical score **${r.score}/100** (this run's checks only; not a ranking prediction) · ${r.counts.P1} P1 · ${r.counts.P2} P2 · ${r.counts.P3} P3`)
  L.push(`${r.pages.length} pages · ${r.sitemaps.urlCount} sitemap URLs · ${r.linksChecked} internal links checked · ${r.render}${r.local ? ' · local build: host, https and www checks skipped' : ''}`, '')
  L.push('## Findings', '')
  if (!r.findings.length) L.push('None.')
  for (const f of r.findings) L.push(`- **${f.sev}** \`${f.id}\` ${f.msg}${f.url ? ` (${f.url})` : ''}`)
  if (r.linksUnreachable.length) L.push('', `Not graded: ${r.linksUnreachable.length} internal link(s) could not be fetched from here (network, not necessarily broken): ${r.linksUnreachable.slice(0, 5).join(', ')}${r.linksUnreachable.length > 5 ? ' …' : ''}.`)
  L.push('', '## Crawler access to /', '', '| Crawler | Kind | Allowed | Rule |', '| --- | --- | --- | --- |')
  for (const c of r.crawlers) L.push(`| ${c.agent} | ${c.kind} | ${c.allowed ? 'yes' : '**no**'} | ${c.rule || '(no matching rule)'} |`)
  L.push('', `robots.txt: ${r.robots.status} · Sitemap lines: ${r.robots.sitemaps.join(', ') || 'none'} · llms.txt: ${r.llmsTxt.present ? 'present' : 'absent'} (optional; not graded)`)
  L.push('', '## Pages', '', '| URL | Status | Title | Words raw / rendered | Canonical | Schema |', '| --- | --- | --- | --- | --- | --- |')
  for (const p of r.pages) {
    const t = (p.title || p.renderedTitle || '').replace(/\|/g, '\\|').slice(0, 60)
    L.push(`| ${p.url} | ${p.status}${p.redirects ? ` (${p.redirects} redirect)` : ''} | ${t || '—'} | ${p.wordsRaw ?? '—'} / ${p.wordsRendered ?? '—'} | ${p.canonical ? (p.canonical === p.finalUrl ? 'self' : p.canonical) : '—'} | ${p.schemaTypes.join(', ') || '—'} |`)
  }
  return L.join('\n') + '\n'
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
