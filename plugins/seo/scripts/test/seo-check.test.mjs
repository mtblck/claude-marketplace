// node --test "plugins/seo/scripts/test/*.test.mjs"
// Serves a small site with known problems on localhost and checks that
// seo-check.mjs reports each one, and nothing it shouldn't.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'seo-check.mjs')

const page = ({ title, desc, canonical, h1 = 'Heading', lang = 'en', extraHead = '', body = '', og = '<meta property="og:title" content="x"><meta property="og:image" content="OGIMG">' }) => `<!doctype html>
<html${lang ? ` lang="${lang}"` : ''}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${title ? `<title>${title}</title>` : ''}
${desc ? `<meta name="description" content="${desc}">` : ''}
${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
${og}
${extraHead}
</head><body>${h1 ? `<h1>${h1}</h1>` : ''}${body}<p>${'Plenty of words about the subject. '.repeat(30)}</p>
<a href="/">Home</a> <a href="/about">About</a> <a href="/gone">Gone</a></body></html>`

// PNG header only: enough for the size sniffer
const png = (w, h) => {
  const b = Buffer.alloc(33)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b)
  b.writeUInt32BE(13, 8)
  b.write('IHDR', 12)
  b.writeUInt32BE(w, 16)
  b.writeUInt32BE(h, 20)
  return b
}

function site(port) {
  const o = `http://localhost:${port}`
  const images = { '/icon.png': png(32, 32), '/og.png': png(1200, 630), '/small.png': png(100, 100), '/card.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>' }
  const routes = {
    '/robots.txt': [200, 'text/plain', `User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nUser-agent: OAI-SearchBot\nDisallow: /\n\nSitemap: ${o}/sitemap.xml\n`],
    '/sitemap.xml': [200, 'application/xml', `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['/', '/about', '/dup-a', '/dup-b', '/secret', '/old', '/fr', '/en'].map((p) => `<url><loc>${o}${p}</loc><lastmod>2026-01-01</lastmod></url>`).join('\n')}
</urlset>`],
    '/': [200, 'text/html', page({ title: 'Home of the fixture site', desc: 'A fixture site used to test the seo-check script end to end.', canonical: `${o}/`, extraHead: '<link rel="icon" href="/icon.png"><link rel="manifest" href="/site.webmanifest"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Fixture"}</script>' })],
    '/site.webmanifest': [200, 'application/manifest+json', JSON.stringify({ name: 'Fixture', icons: [{ src: '/icon.png', sizes: '192x192' }] })],
    '/about': [200, 'text/html', page({ title: 'About the fixture', desc: null, canonical: `${o}/about`, h1: null, lang: null, og: '<meta property="og:image" content="/small.png">', body: '<img src="/a.png"><h1>One</h1><h1>Two</h1><h4>Skip</h4>' })],
    '/dup-a': [200, 'text/html', page({ title: 'Same title for two pages', desc: 'Shared description for both duplicate pages in this fixture.', canonical: `${o}/dup-a`, og: `<meta property="og:title" content="t"><meta property="og:image" content="${o}/card.svg">`, extraHead: '<script type="application/ld+json">{ broken </script>' })],
    '/dup-b': [200, 'text/html', page({ title: 'Same title for two pages', desc: 'Shared description for both duplicate pages in this fixture.', canonical: `${o}/missing` })],
    '/secret': [200, 'text/html', page({ title: 'Secret page here', desc: 'This page should not be indexed but sits in the sitemap anyway.', canonical: `${o}/secret`, extraHead: '<meta name="robots" content="noindex">' })],
    '/old': [301, 'text/html', '', { location: '/about' }],
    '/fr': [200, 'text/html', page({ title: 'Page en français', desc: 'Une page de test pour vérifier les liens hreflang réciproques.', canonical: `${o}/fr`, lang: 'fr', og: `<meta property="og:image" content="${o}/broken.png">`, extraHead: `<link rel="alternate" hreflang="fr" href="${o}/fr"><link rel="alternate" hreflang="en-UK" href="${o}/en">` })],
    '/en': [200, 'text/html', page({ title: 'English page', desc: 'An English test page that forgets to link back to the French one.', canonical: `${o}/en`, extraHead: `<link rel="alternate" hreflang="en" href="${o}/en">` })],
  }
  for (const r of Object.values(routes)) if (typeof r[2] === 'string') r[2] = r[2].replace('OGIMG', `${o}/og.png`)
  return createServer((req, res) => {
    const path = new URL(req.url, o).pathname
    if (images[path]) {
      res.writeHead(200, { 'content-type': path.endsWith('.svg') ? 'image/svg+xml' : 'image/png' })
      return res.end(images[path])
    }
    if (path === '/gone' || path === '/missing' || path === '/broken.png') return res.writeHead(404).end()
    const r = routes[path]
    if (!r) {
      // SPA-style fallback: every unknown path gets the shell with 200
      res.writeHead(200, { 'content-type': 'text/html' })
      return res.end('<!doctype html><html><head><title>App</title></head><body><div id="root"></div></body></html>')
    }
    res.writeHead(r[0], { 'content-type': r[1], ...(r[3] || {}) })
    res.end(r[2])
  })
}

test('reports the planted problems', async () => {
  const server = site(0)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const { port } = server.address()
  server.close()
  const real = site(port)
  await new Promise((r) => real.listen(port, '127.0.0.1', r))
  const out = join(mkdtempSync(join(tmpdir(), 'seo-check-')), 'r.json')
  const code = await new Promise((resolve) =>
    execFile('node', [SCRIPT, '--url', `http://localhost:${port}/`, '--render', 'off', '--delay', '0', '--json', out], (err) => resolve(err ? err.code : 0)),
  )
  real.close()
  const r = JSON.parse(readFileSync(out, 'utf8'))
  const ids = new Set(r.findings.map((f) => f.id))
  assert.equal(code, 1, 'exits 1 when there is a P1')
  for (const id of [
    'robots.blocks-ai-search', 'sitemap.lastmod-uniform', 'soft-404', 'description.missing', 'html.lang', 'h1.multiple',
    'headings.skip', 'img.alt', 'img.dimensions', 'jsonld.invalid', 'title.duplicate', 'description.duplicate',
    'canonical.bad-target', 'social.image-relative', 'social.image-small', 'social.image-svg', 'social.image-broken',
    'icons.favicon-small', 'icons.apple-touch', 'icons.manifest-icons', 'icons.theme-color',
    'social.og-title', 'social.og-description', 'social.twitter-card', 'page.noindex-in-sitemap', 'sitemap.redirect', 'hreflang.code', 'hreflang.return', 'links.broken',
  ]) assert.ok(ids.has(id), `expected ${id}; got ${[...ids].join(', ')}`)
  const home = r.pages.find((p) => p.url.endsWith(`${port}/`))
  assert.equal(home.social.imageSize, '1200×630')
  assert.ok(!r.findings.some((f) => f.url === home.url && /^social\.image-(broken|small|svg|relative|type|heavy|ratio)/.test(f.id)), 'home og:image is fine')
  for (const id of ['icons.favicon-missing', 'icons.manifest-broken', 'robots.blocks-search', 'title.missing', 'html.viewport', 'canonical.conflict']) assert.ok(!ids.has(id), `did not expect ${id}`)
  const gpt = r.crawlers.find((c) => c.agent === 'GPTBot')
  const google = r.crawlers.find((c) => c.agent === 'Googlebot')
  assert.equal(gpt.allowed, false)
  assert.equal(google.allowed, true)
  assert.deepEqual(r.pages.find((p) => p.url.endsWith(`${port}/`)).schemaTypes, ['Organization'])
})
