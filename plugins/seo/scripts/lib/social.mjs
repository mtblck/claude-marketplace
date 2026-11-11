// Social card helpers shared by seo-check.mjs and social-preview.mjs.
// Zero dependencies. Link-preview scrapers (Slack, Facebook, LinkedIn, X,
// iMessage, Discord) read the served HTML and never run JavaScript, so these
// read the raw HTML only.

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }
export const decode = (s = '') =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENT[e.toLowerCase()] ?? m
  })

function attrs(src = '') {
  const out = {}
  const re = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let m
  while ((m = re.exec(src))) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '')
  return out
}

// All social-card inputs from one page's raw HTML, with absolute image URLs.
export function parseSocial(html, pageUrl) {
  const clean = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, ' ')
  const head = (clean.match(/<head\b[\s\S]*?<\/head\s*>/i) || [clean])[0]
  const metas = [...head.matchAll(/<meta\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)].map((m) => attrs(m[1]))
  const all = (key) => metas.filter((a) => (a.property || a.name || '').toLowerCase() === key).map((a) => (a.content ?? '').trim())
  const one = (key) => all(key)[0] ?? null
  const abs = (u) => {
    if (!u) return null
    try {
      return new URL(u, pageUrl).href
    } catch {
      return null
    }
  }
  const titleM = clean.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)
  const canon = [...head.matchAll(/<link\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)].map((m) => attrs(m[1])).find((a) => (a.rel || '').toLowerCase().split(/\s+/).includes('canonical'))
  const icon = [...head.matchAll(/<link\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)].map((m) => attrs(m[1])).find((a) => /(^|\s)(icon|apple-touch-icon)(\s|$)/i.test(a.rel || ''))
  return {
    pageUrl,
    title: titleM ? decode(titleM[1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim() : null,
    description: one('description'),
    canonical: canon?.href ? abs(canon.href) : null,
    icon: icon?.href ? abs(icon.href) : null,
    og: {
      title: one('og:title'),
      description: one('og:description'),
      images: all('og:image').concat(all('og:image:url')).map((raw) => ({ raw, url: abs(raw) })),
      imageSecure: one('og:image:secure_url'),
      imageAlt: one('og:image:alt'),
      imageWidth: one('og:image:width'),
      imageHeight: one('og:image:height'),
      url: one('og:url'),
      type: one('og:type'),
      siteName: one('og:site_name'),
    },
    twitter: {
      card: one('twitter:card'),
      title: one('twitter:title'),
      description: one('twitter:description'),
      image: one('twitter:image') ?? one('twitter:image:src'),
      imageAlt: one('twitter:image:alt'),
      site: one('twitter:site'),
    },
  }
}

// What each platform would most likely show, from the tags (fallback order per
// platform; approximate, since the platforms don't publish exact rules).
export function cards(s) {
  const host = (() => {
    try {
      return new URL(s.og.url || s.pageUrl).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  })()
  const ogImage = s.og.images[0]?.url || null
  const title = s.og.title || s.title
  const desc = s.og.description || s.description
  const twImage = s.twitter.image ? new URL(s.twitter.image, s.pageUrl).href : ogImage
  return {
    host,
    facebook: { title, description: desc, image: ogImage, host },
    linkedin: { title, description: null, image: ogImage, host },
    slack: { site: s.og.siteName || host, title, description: desc, image: ogImage, icon: s.icon },
    x: {
      card: s.twitter.card || null,
      large: (s.twitter.card || '') === 'summary_large_image',
      title: s.twitter.title || title,
      description: s.twitter.description || desc,
      image: twImage,
      host,
    },
    imessage: { title, image: ogImage, host },
  }
}

// Width and height from PNG, JPEG, GIF or WebP bytes; null if unknown.
export function imageSize(buf) {
  if (!buf || buf.length < 24) return null
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return { type: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  if (buf.toString('ascii', 0, 3) === 'GIF') return { type: 'gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buf.toString('ascii', 12, 16)
    if (kind === 'VP8X') return { type: 'webp', width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) }
    if (kind === 'VP8L') {
      const b = buf.readUInt32LE(21)
      return { type: 'webp', width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 }
    }
    if (kind === 'VP8 ') return { type: 'webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++
        continue
      }
      const marker = buf[i + 1]
      const len = buf.readUInt16BE(i + 2)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { type: 'jpeg', width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) }
      i += 2 + len
    }
  }
  if (buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0) {
    // ICO: one directory entry per size; 0 means 256
    let width = 0
    let height = 0
    for (let i = 0, n = buf.readUInt16LE(4); i < n && 6 + i * 16 + 1 < buf.length; i++) {
      width = Math.max(width, buf[6 + i * 16] || 256)
      height = Math.max(height, buf[7 + i * 16] || 256)
    }
    return { type: 'ico', width, height }
  }
  if (/^\s*(<\?xml|<svg)/i.test(buf.toString('utf8', 0, 200))) return { type: 'svg', width: null, height: null }
  return null
}

// Fetch an image the way a scraper would: follow redirects, read up to 10 MB.
export async function fetchImage(url, { ua, timeout = 15000 } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': ua || 'facebookexternalhit/1.1', accept: 'image/*,*/*;q=0.5' } })
    const buf = Buffer.from(await res.arrayBuffer())
    return { status: res.status, finalUrl: res.url, type: res.headers.get('content-type') || '', bytes: buf.length, size: res.ok ? imageSize(buf) : null }
  } catch (e) {
    return { status: 0, error: e.cause?.code || e.name || String(e) }
  } finally {
    clearTimeout(t)
  }
}

// Findings for one page. `add(sev, id, msg)`; `img` is fetchImage's result for
// the first og:image (or null when there is none or it wasn't fetched).
export function socialFindings(s, img, add, { rendered = null, pageIsHttps = false } = {}) {
  const ogImg = s.og.images[0]
  if (!s.og.title && !s.title) add('P2', 'social.title', 'No og:title and no <title>: shared links show the bare URL.')
  else if (!s.og.title) add('P3', 'social.og-title', 'No og:title; Facebook, Slack and LinkedIn fall back to <title>, which usually carries the site-name suffix.')
  if (!s.og.description && !s.description) add('P2', 'social.description', 'No og:description and no meta description: shared links show no summary.')
  else if (!s.og.description) add('P3', 'social.og-description', 'No og:description; most platforms fall back to the meta description.')
  if (!ogImg) add('P2', 'social.image', 'No og:image: shared links show no picture (or a random one picked from the page).')
  else {
    if (!/^https?:\/\//i.test(ogImg.raw)) add('P2', 'social.image-relative', `og:image is relative ("${ogImg.raw}"); Facebook, LinkedIn and Slack need an absolute URL.`)
    if (pageIsHttps && /^http:\/\//i.test(ogImg.raw)) add('P3', 'social.image-http', 'og:image is http on an https page; some apps refuse to load it.')
    if (img) {
      if (img.status === 0) add('P3', 'social.image-unreachable', `og:image could not be fetched from here (${img.error}); check it from a browser.`)
      else if (img.status !== 200) add('P1', 'social.image-broken', `og:image answers ${img.status}: every share of this page shows a broken or missing picture.`)
      else {
        if (!/^image\//i.test(img.type)) add('P2', 'social.image-type', `og:image is served as "${img.type || 'no content-type'}", not an image type.`)
        if (img.size?.type === 'svg') add('P2', 'social.image-svg', 'og:image is an SVG; Facebook, X, LinkedIn and Slack do not show SVG previews. Use a PNG or JPEG.')
        if (img.bytes > 5 * 1024 * 1024) add('P2', 'social.image-heavy', `og:image is ${(img.bytes / 1048576).toFixed(1)} MB; X rejects images over 5 MB and others time out. Aim for under 1 MB.`)
        else if (img.bytes > 1024 * 1024) add('P3', 'social.image-heavy', `og:image is ${(img.bytes / 1048576).toFixed(1)} MB; under 1 MB unfurls faster.`)
        const w = img.size?.width
        const h = img.size?.height
        if (w && h) {
          if (w < 200 || h < 200) add('P2', 'social.image-small', `og:image is ${w}×${h}; Facebook ignores images under 200×200.`)
          else if (w < 1200 || h < 600) add('P3', 'social.image-small', `og:image is ${w}×${h}; large cards want 1200×630 (shown small or blurry otherwise).`)
          const ratio = w / h
          if (ratio < 1.6 || ratio > 2.2) add('P3', 'social.image-ratio', `og:image is ${w}×${h} (ratio ${ratio.toFixed(2)}); large cards are 1.91:1 and crop the rest.`)
          if ((s.og.imageWidth && +s.og.imageWidth !== w) || (s.og.imageHeight && +s.og.imageHeight !== h)) add('P3', 'social.image-dims-tag', `og:image:width/height say ${s.og.imageWidth}×${s.og.imageHeight}, the file is ${w}×${h}.`)
        }
      }
    }
    if (!s.og.imageAlt && !s.twitter.imageAlt) add('P3', 'social.image-alt', 'No og:image:alt (or twitter:image:alt) for screen-reader users of the preview.')
  }
  if (!s.twitter.card) add('P3', 'social.twitter-card', 'No twitter:card; X shows at most a small card. Use summary_large_image for a full-width image.')
  if (s.og.url && s.canonical && s.og.url.replace(/\/$/, '') !== s.canonical.replace(/\/$/, '')) add('P3', 'social.og-url', `og:url (${s.og.url}) differs from the canonical (${s.canonical}); shares and like counts split between them.`)
  if (rendered) {
    const late = []
    if (!s.og.title && rendered.og.title) late.push('og:title')
    if (!s.og.description && rendered.og.description) late.push('og:description')
    if (!ogImg && rendered.og.images.length) late.push('og:image')
    if (!s.twitter.card && rendered.twitter.card) late.push('twitter:card')
    if (late.length) add('P2', 'social.js-only', `${late.join(', ')} only exist after JavaScript runs; Slack, Facebook, LinkedIn, X and iMessage never run it, so shares miss them. Put them in the served HTML (prerender or server-render).`)
  }
}
