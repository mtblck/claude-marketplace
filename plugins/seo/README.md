# seo

SEO audits for web apps and sites, built for repos like Matt's (Vite/React SPAs
and Next.js on Vercel): every finding comes with evidence from the served HTML and
the place in the code that causes it.

| Skill | Use it for |
| --- | --- |
| `/seo:audit [url \| route \| fix]` | Full audit: crawl and index controls, metadata and canonicals, sitemaps, raw vs rendered HTML, links, structured data, Core Web Vitals, content and E-E-A-T, AI search. Verified findings graded P1/P2/P3, a technical score, `SEO-AUDIT.md`. With `fix`, fixes shared code first and re-measures. |
| `/seo:page <url \| route> [query]` | One page against the query it should win and the pages that rank for it: intent, title and description options, content gaps, internal links. |
| `/seo:schema [url \| route] [type]` | Find, validate and write schema.org JSON-LD the way the stack does head content. |
| `/seo:social [url ...]` | Social cards and link previews: OG and Twitter tags on every page, the share image fetched and measured, and a picture of how the link unfurls on Slack, Facebook, X, LinkedIn and iMessage. |
| `/seo:ai-search [url]` | AI crawler access, pages that work without JavaScript, quotable content, entity clarity, llms.txt, each call labelled documented or judgement. |

Claude also picks them up from their descriptions ("why isn't this page indexed?").

## The checker

`scripts/seo-check.mjs` is the evidence collector the skills share. Node 18+, no
dependencies; renders pages with Playwright when it's installed.

```
node plugins/seo/scripts/seo-check.mjs --url https://example.com --max 30 --md seo.md --json seo.json
node plugins/seo/scripts/seo-check.mjs --url http://localhost:4173   # a local build
```

It reads robots.txt (RFC 9309 matching, with an access table for search engines,
AI search fetchers, training crawlers and control tokens), the sitemap or sitemap
index, and an even sample of sitemap URLs (or a crawl from the home page), then
checks status codes, redirects, noindex in sitemaps, titles and descriptions
(missing, length, duplicates), canonicals and their targets, `lang`, viewport,
headings, images, JSON-LD parsing, Open Graph and Twitter card tags (and fetches each share image to check its status, type, file size, pixel size and ratio), mixed content, hreflang codes and
return links, internal link status, soft 404s, http → https and www/apex
consolidation (live sites only), and what only appears after JavaScript runs.
Exit 1 when there's a P1, so it can gate a deploy. It only sends GET requests to
the site it's pointed at.

The score deducts once per kind of problem (P1 12, P2 4, P3 1). It's a gauge for
comparing runs, not a ranking prediction.

`scripts/social-preview.mjs --url <page> [--url ...] --out <dir>` draws how each
page unfurls on Slack, Facebook, X, LinkedIn and iMessage (HTML, plus a PNG with
Playwright), from the served HTML only, the way the scrapers see it. The layouts
are close approximations, not pixel copies.

Test: `node --test "plugins/seo/scripts/test/*.test.mjs"` (serves a fixture site
with planted problems on localhost).

In Claude's cloud sandbox the network policy may block the live site; the skills
then audit a local production build, and on Vercel can read the deployment through
the Vercel connector.

## Prior art

Built after a survey of the SEO skills on GitHub on 2026-11-11. Nothing was
copied; the ideas taken are listed in the repo's `THIRD_PARTY_NOTICES.md`.

| Project | License | Taken | Left |
| --- | --- | --- | --- |
| [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) | MIT | Fetched content as untrusted data; audit split into parallel specialist passes; P1-style priority definitions; error handling for unreachable sites | 26 skills, 19 agents, a Python runtime with ~20 packages, paid-API extensions and a PostToolUse hook: far more than these repos need |
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) `seo-audit`, `schema`, `ai-seo` | MIT | Priority order (crawl → technical → on-page → content → authority); "raw fetch can't see JS-injected schema"; issue / evidence / fix report shape | Marketing-agency framing and questionnaires; no measurement |
| [umutxyp/Seo-Promt-Master](https://github.com/umutxyp/Seo-Promt-Master) | MIT | Read the code *and* fetch the served site; classify routes public-index / public-noindex / private; fix shared infrastructure first; prove fixes by re-fetching | Its 1,600-line CLI and 18-file knowledge base: a smaller original checker with a render pass fits these repos better and needs no vendoring |
| [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills) `seo` | MIT | Don't invent ranking weights; a Lighthouse SEO score is a subset; separate crawl/index from content quality | Overlaps `pr-review:performance` and `accessibility` |
| [inhouseseo/superseo-skills](https://github.com/inhouseseo/superseo-skills) `page-audit` | Apache-2.0 | Single-page review against the live top results; never infer what an unread competitor page says | Content-writing and link-building skills |
| [zubair-trabzada/geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude) | MIT | AI crawler tiers (search vs training) | Agency sales features (prospects, proposals, CRM); unsourced statistics |
| [JeffLi1993/seo-audit-skill](https://github.com/JeffLi1993/seo-audit-skill) | MIT | (nothing new) | Lighter subset of the above |
