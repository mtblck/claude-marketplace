#!/usr/bin/env node
// checklist.mjs: build the interactive launch checklist from a seo-check run.
//
//   node checklist.mjs --from seo.json --out DIR [--previous old-checklist.json]
//                      [--title "Inlay launch checklist"] [--no-p3]
//
// Writes DIR/checklist.json and DIR/checklist.html (the page, copied from
// ../templates/checklist.html). Sections: "Fix before launch" (P1), "Fix soon"
// (P2), "Polish" (P3, unless --no-p3) and "Set up once". One item per kind of
// finding, listing the pages it affects. With --previous, ticks, dates and notes
// carry over for items whose id still exists. Edit checklist.json afterwards to
// add causes (file:line) and fixes from the audit's verified findings, then
// publish DIR/checklist.html with checklist.json beside it.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const argv = process.argv.slice(2)
const opt = (n) => {
  const i = argv.indexOf(`--${n}`)
  return i === -1 ? undefined : argv[i + 1]
}
const from = opt('from')
const out = opt('out')
if (!from || !out) {
  console.error('usage: node checklist.mjs --from seo.json --out DIR [--previous checklist.json] [--title TEXT] [--no-p3]')
  process.exit(2)
}
const run = JSON.parse(readFileSync(from, 'utf8'))
const here = dirname(fileURLToPath(import.meta.url))

const SETUP = [
  ['setup.gsc', 'Verify the site in Google Search Console', 'Add a Domain property and verify it with the DNS TXT record, so every protocol and subdomain is covered.', [['Open Search Console', 'https://search.google.com/search-console']]],
  ['setup.gsc-sitemap', 'Submit the sitemap in Search Console', 'Sitemaps → add the sitemap URL. Then check Pages → "Why pages aren\'t indexed" a few days later.', [['Sitemaps report help', 'https://support.google.com/webmasters/answer/7451001']]],
  ['setup.bing', 'Add the site to Bing Webmaster Tools', 'Import it from Search Console in one step, then submit the sitemap. Bing feeds DuckDuckGo, Yahoo, Copilot and several AI search products.', [['Open Bing Webmaster Tools', 'https://www.bing.com/webmasters']]],
  ['setup.indexnow', 'Decide on IndexNow', 'Optional: tells Bing, Yandex, Seznam and Naver about changed pages straight away (not Google). Worth it for sites that publish often.', [['IndexNow', 'https://www.indexnow.org']]],
  ['setup.profiles', 'Link profiles both ways', 'List the GitHub, LinkedIn and social profiles in the Person or Organization JSON-LD sameAs, and link each profile back to the site. For Mastodon, add <link rel="me"> and <meta name="fediverse:creator"> to the home page.', []],
  ['setup.analytics', 'Make organic search traffic measurable', 'Vercel Web Analytics referrers, GA4 or Plausible: something that separates search traffic, so the next audit can show what changed.', []],
  ['setup.share-test', 'Share the home page once on each platform', 'Paste the link in a Slack DM to yourself and run it through the Facebook Sharing Debugger and LinkedIn Post Inspector, which also refresh their caches.', [['Facebook Sharing Debugger', 'https://developers.facebook.com/tools/debug/'], ['LinkedIn Post Inspector', 'https://www.linkedin.com/post-inspector/']]],
  ['setup.redirects', 'Keep redirects for old URLs', 'When routes change or the site moves domain, 301 every URL that ever had traffic to its new home, and keep the old property in Search Console.', []],
]

const groups = new Map()
for (const f of run.findings || []) {
  const g = groups.get(f.id) || { id: f.id, sev: f.sev, msgs: [], urls: new Set() }
  if ({ P1: 0, P2: 1, P3: 2 }[f.sev] < { P1: 0, P2: 1, P3: 2 }[g.sev]) g.sev = f.sev
  g.msgs.push(f.msg)
  if (f.url) g.urls.add(f.url)
  groups.set(f.id, g)
}
const finding = (g) => {
  const urls = [...g.urls]
  const many = urls.length > 1
  return {
    id: `finding.${g.id}`,
    title: g.msgs[0].split(/(?<=[.;:])\s/)[0].replace(/[.;:]$/, ''),
    detail: many ? `${g.msgs[0]}${g.msgs.length > 1 ? ` (and ${g.msgs.length - 1} similar)` : ''}` : g.msgs[0],
    where: urls.length ? `${many ? `${urls.length} pages: ` : ''}${urls.slice(0, 6).join(', ')}${urls.length > 6 ? ' …' : ''}` : '',
    priority: g.sev,
    links: [],
    done: false,
    doneAt: null,
    note: '',
  }
}
const bySev = (sev) => [...groups.values()].filter((g) => g.sev === sev).map(finding)

const host = (() => {
  try {
    return new URL(run.url).hostname
  } catch {
    return run.url
  }
})()
const state = {
  title: opt('title') || `${host} launch checklist`,
  url: run.url,
  generated: (run.startedAt || new Date().toISOString()).slice(0, 10),
  source: `${run.tool || 'seo-check'} via /seo:audit`,
  score: run.score,
  sections: [
    { id: 'p1', title: 'Fix before launch', intro: 'These stop pages from being crawled or indexed, or break every share of a page.', items: bySev('P1') },
    { id: 'p2', title: 'Fix soon', intro: 'These cost visibility or clicks.', items: bySev('P2') },
    ...(argv.includes('--no-p3') ? [] : [{ id: 'p3', title: 'Polish', intro: 'Small things worth doing while you are in the code.', items: bySev('P3') }]),
    {
      id: 'setup',
      title: 'Set up once',
      intro: 'No crawl can see these. Tick what is already done.',
      items: SETUP.map(([id, title, detail, links]) => ({ id, title, detail, where: '', priority: null, links: links.map(([label, href]) => ({ label, href })), done: false, doneAt: null, note: '' })),
    },
  ],
}

const prevPath = opt('previous')
if (prevPath) {
  const prev = JSON.parse(readFileSync(prevPath, 'utf8'))
  const old = new Map(prev.sections.flatMap((s) => s.items).map((i) => [i.id, i]))
  for (const it of state.sections.flatMap((s) => s.items)) {
    const o = old.get(it.id)
    if (o) Object.assign(it, { done: o.done, doneAt: o.doneAt, note: o.note })
  }
  // A finding that is gone was fixed: keep it, ticked, so the history shows.
  const now = new Set(state.sections.flatMap((s) => s.items).map((i) => i.id))
  const fixed = [...old.values()].filter((i) => i.id.startsWith('finding.') && !now.has(i.id))
  if (fixed.length) state.sections.push({ id: 'fixed', title: 'Fixed since last audit', intro: 'No longer found by the checker.', items: fixed.map((i) => ({ ...i, done: true, doneAt: i.doneAt || state.generated })) })
}

mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'checklist.json'), JSON.stringify(state, null, 2) + '\n')
copyFileSync(join(here, '..', 'templates', 'checklist.html'), join(out, 'checklist.html'))
const n = state.sections.reduce((s, x) => s + x.items.length, 0)
console.log(`${join(out, 'checklist.json')} (${n} items) and ${join(out, 'checklist.html')}`)
