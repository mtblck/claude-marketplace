# Performance checklist

Shared by the `performance` audit and the `review` skill's performance angle. The
apps are Vite/React and Next.js on Vercel; the numbers come from `perf.yml` (the
`repo-setup` template) when the repo has it. Measurements are a local production
build, Lighthouse mobile with simulated throttling, median of a few runs.

## Thresholds for measured deltas

All bundle sizes are gzipped. "Initial" is what the entry page loads before any
lazy chunk (Vite: what `index.html` references; Next: the root main files).

| Measure | Report (🟡) | Blocking (🔴) |
| --- | --- | --- |
| Initial JS or CSS | +10% or +50 KB | +25% or +150 KB |
| Any one chunk | +50 KB | +150 KB on an initial chunk |
| All JS | +100 KB | none on its own |
| Lighthouse performance score, any page | 5+ points down | 10+ points down, or below 50 |
| LCP | +500 ms, or crosses 2.5 s | crosses 4 s |
| CLS | +0.05, or crosses 0.1 | crosses 0.25 |
| TBT | +200 ms | crosses 600 ms |

A repo's `REVIEW.md` can set its own budgets or exempt a route; those win.

Lighthouse is noisy, a few points and ~200 ms between identical runs. A score or
timing delta is a finding only when the diff explains it (a new dependency, a
bigger image, a new blocking script, more client JS on that page). A delta with no
cause in the diff goes in the summary as "measured, no cause found", not as a
finding. Bundle sizes are deterministic: a size delta is real, the question is only
whether the PR's purpose justifies it (say so, and downgrade to 🔵, when it plainly
does: a new feature that needs a library, lazily loaded).

Improvements are worth one line of credit in the summary.

## Causes to look for in the diff

### Dependencies
- A new runtime dependency: its minified+gzip size and whether it's tree-shakeable
  (ESM, `sideEffects: false`). Known heavy ones: moment, lodash (whole, not
  `lodash-es` or per-method), chart libraries, editors (Monaco, CodeMirror, Quill),
  PDF and image libraries, icon packs imported whole, `@aws-sdk` v2, firebase compat.
- A namespace or default import that defeats tree-shaking
  (`import * as Icons`, `import _ from 'lodash'`).
- A dependency moved from `devDependencies` to `dependencies`, or a server-only
  package imported from client code.
- Two libraries doing the same job (a second date or state library).

### Code splitting
- A route, dialog, editor or chart imported statically into the entry when it isn't
  needed for first paint: `React.lazy`/`import()` in Vite, `next/dynamic` in Next.
- Next.js App Router: `'use client'` added high in the tree (a layout or page) so a
  whole subtree ships as client JS; a client component that only renders data and
  could be a server component; a large library imported in a client component when
  it could run on the server.
- Barrel files (`index.ts` re-exporting everything) pulled into a client entry.

### Images and media
- `<img>` without `width`/`height` (or aspect-ratio) above the fold: CLS.
- Large images not resized or not in a modern format; in Next, `<img>` where
  `next/image` would size and lazy-load it.
- The LCP image lazy-loaded, or missing `fetchpriority="high"`/`priority`; images
  below the fold without `loading="lazy"`.
- Autoplaying video or large GIFs.

### Fonts, CSS and scripts
- Web fonts without `font-display: swap` (or `next/font`), many weights, or fonts
  loaded from a third-party origin with no preconnect.
- Render-blocking `<script>` without `defer`/`async`/`type="module"` in the head;
  third-party scripts (analytics, chat, embeds) loaded eagerly. In Next,
  `next/script` with `strategy="beforeInteractive"` where `afterInteractive` or
  `lazyOnload` would do.
- A CSS framework or reset imported whole, or Tailwind content globs widened so
  unused classes ship.

### Data and rendering
- Request waterfalls: sequential `await`s that could be parallel, a fetch in a
  child that waits on its parent's fetch, client-side fetching of data the server
  already has.
- A Next page made dynamic that was static (`cookies()`, `headers()`,
  `no-store`, `revalidate = 0`) without need.
- Work in render: sorting, filtering or parsing large data on every render without
  memoisation; a context value recreated each render so the whole tree re-renders;
  state updates in a scroll, resize or input handler without throttling.
- Lists of hundreds of rows rendered without virtualisation; layout thrashing
  (reading layout in a loop that writes styles).
- Animations of `width`/`height`/`top`/`left` instead of `transform`/`opacity`.

### Build config
- Changes to `vite.config`, `next.config`, `tsconfig` targets, Browserslist or
  PostCSS that turn off minification, add polyfills, widen the target or disable
  code splitting.
- Source maps shipped publicly in production by accident.
