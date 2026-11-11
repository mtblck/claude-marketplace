# SEO audit checklist

One section per subagent in step 3 of the audit. Each item says what to check and,
where it isn't obvious, why. Sources are Google Search Central
(developers.google.com/search/docs) unless noted; when a claim here and the current
Google documentation disagree, the documentation wins and the disagreement is worth
a line in the report.

## 1. Crawl and index

- **robots.txt** is at the root, returns 200 as `text/plain` (not the SPA's
  `index.html`), doesn't block pages that should rank or the CSS/JS needed to
  render them, and lists the sitemap. A 5xx robots.txt makes Google stop crawling
  the whole site; a 404 means "allow everything".
- robots.txt controls **crawling**, not indexing. A blocked URL can still be
  indexed from links, without content. To keep a page out of results, allow
  crawling and send `noindex` (meta tag or `X-Robots-Tag` header).
- **noindex** only on routes classified `public-noindex` or `private`. Check the
  raw HTML, the rendered HTML and the response headers; a noindex added by
  JavaScript may or may not be seen, and one removed by JavaScript isn't.
- **Status codes:** public pages answer 200 directly. Unknown URLs answer 404 (or
  410), not 200 with an empty app shell (a soft 404: the classic SPA fallback
  problem; on Vercel, a catch-all rewrite to `index.html` causes it). Fix with a
  real 404 for unknown paths, or at least `noindex` on the not-found view.
- **Redirects:** permanent moves are 301/308, one hop. No chains, no loops, no
  302s for permanent moves. http → https and one host (apex or www) for the
  whole site.
- **Sitemap:** XML, at most 50,000 URLs and 50 MB per file (use a sitemap index
  beyond that), only canonical, indexable, 200 URLs on the site's own host and
  protocol, absolute URLs. `<lastmod>` is the real last content change; one build
  timestamp on every URL teaches Google to ignore it. `<priority>` and
  `<changefreq>` are ignored by Google.
- **Every `public-index` route** is in the sitemap and linked from at least one
  other page (no orphans). Every sitemap URL maps to a real route.
- **Parameters and facets** (filters, sorts, tracking params) don't create
  crawlable duplicate URLs, or they canonicalise to the clean URL.

## 2. Metadata and canonicals

- **Title:** present, unique per page, describes the page (primary topic first,
  site name last), roughly 30–60 characters so it isn't cut off. Titles that are
  boilerplate, duplicated or stuffed get rewritten by Google.
- **Meta description:** unique per page, a real summary with a reason to click,
  roughly 70–160 characters. Not a ranking factor, but it is often the snippet.
- **Canonical:** one absolute `rel=canonical` per page, self-referencing on
  unique pages, pointing at a 200, indexable URL. Same host, protocol and
  trailing-slash style as the sitemap and internal links. Never canonicalise
  every page to the home page, or page 2 of a list to page 1.
- **`<html lang>`** set to the page language; `<meta charset>` first in `<head>`;
  a viewport meta tag (mobile-first indexing uses the mobile page).
- **Headings:** one `<h1>` that matches the title's topic; headings in order, used
  for structure, not styling.
- **Open Graph and Twitter cards** (`og:title`, `og:description`, absolute
  `og:image` at 1200×630, `twitter:card`): not ranking signals, but they decide
  how shared links look, and link-preview scrapers never run JavaScript.
- **International sites:** `hreflang` with valid codes (`en-GB`, not `en-UK`),
  a self-reference on every page, return links from every alternate (a one-way
  pair is ignored), consistent with canonicals (each locale canonicalises to
  itself), optional `x-default`.

## 3. Rendering and links

- **Raw vs rendered HTML** for each `public-index` template (the checker's
  `render.*`, `*.js-only` and `links.js-only` findings). Googlebot renders
  JavaScript, but later and not always fully; Bing renders less; AI crawlers and
  link previews generally don't render at all. Pages that must rank should have
  their title, description, canonical, main content and links in the served HTML:
  prerender or server-render them.
- **Links are `<a href>`** with real URLs, not click handlers or `href="#"`.
  Descriptive anchor text, not "click here". No broken internal links; link to
  final URLs, not redirects.
- **Important pages within about three clicks** of the home page, and linked
  from related pages, not only from navigation.
- **Images:** `alt` text that describes the image (empty `alt=""` for decorative
  ones), `width` and `height` (or aspect-ratio) to avoid layout shift, modern
  formats, lazy loading below the fold only, descriptive file names.
- **No mixed content** on https pages.

## 4. Structured data

Hand anything deeper to the `schema` skill. Here: is there JSON-LD, does it parse,
is it in the served HTML (not only injected later), does it describe what is
visible on the page, and is the page type eligible for a rich result it doesn't
use yet? `Organization` or `Person` and `WebSite` on the home page are the
baseline for almost every site.

## 5. Content and E-E-A-T

Judgement, so say it's judgement and give the reason.

- **Search intent:** for the query each `public-index` page should win, does the
  page type match what ranks (a tool, a guide, a list, a product page)? A page
  that answers a different question won't rank however well it's tagged.
- **Substance:** the page says something specific that isn't on a hundred other
  pages: first-hand experience, real examples, numbers, screenshots, decisions.
  Thin pages (a heading and a sentence), near-duplicates and boilerplate-only
  pages hold the site back.
- **Who is behind it:** an about page, a named author or maker with a reason to be
  trusted, contact details, dates on time-sensitive content. For a portfolio,
  the case studies themselves are the evidence.
- **Freshness** where it matters: outdated facts, dead projects presented as live,
  copyright years and "latest" claims.
- **Cannibalisation:** two pages competing for the same query; merge or
  differentiate them.

## 6. Performance and mobile

Core Web Vitals at the 75th percentile: **LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1**.
Use field data (CrUX via PageSpeed Insights, Search Console) when the site has
enough traffic; otherwise Lighthouse lab numbers, labelled as lab. Hand causes to
the `pr-review:performance` skill. Mobile: responsive layout, readable text without
zoom, tap targets big enough to hit (Lighthouse flags under 48×48 CSS px;
WCAG 2.2's minimum is 24×24), no horizontal scroll, same content
as desktop.

## 7. AI search

Hand anything deeper to the `ai-search` skill. Here: the crawler-access table from
the checker (are search engines allowed; are AI search crawlers allowed or blocked
on purpose), whether main content is in the served HTML, and whether the site
states plainly who it is and what it does on the home and about pages.

## By site type

- **Portfolio / personal site:** a `Person` entity with `sameAs` links to
  profiles, one indexable page per significant project with a real description
  (not just an image grid), project pages linked from the home page, titles that
  name the work and the person.
- **SaaS or app:** the marketing pages (home, features, pricing, docs, changelog,
  comparison pages) must be indexable and server-rendered or prerendered; the app
  itself (`/app`, `/dashboard`, auth) is `private` and blocked or noindexed.
  `SoftwareApplication` schema on the product page.
- **Tool pages** (calculators, converters, generators): the page must explain the
  tool in text above or below it, not only render a widget; one page per distinct
  job the tool does, not per parameter.
- **Content / blog:** `Article` or `BlogPosting` with author and dates, author
  pages, categories that aren't thin, internal links between related posts,
  `lastmod` from real edits.
- **Local business / shop:** consistent name, address and phone everywhere,
  `LocalBusiness` or `Product` schema, Google Business Profile, unique product and
  category copy.
