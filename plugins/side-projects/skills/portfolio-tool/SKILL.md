---
name: "portfolio-tool"
description: "Use when starting, scaffolding, deploying or listing one of Matt's standalone side projects — portfolio pieces or small personal tools served under mattblack.space/tools/."
---

# Standalone portfolio tools

Matt builds small standalone tools that double as portfolio pieces. Each one is
its own GitHub repo and Vercel project, served under his portfolio domain at
`https://mattblack.space/tools/<slug>/` and written up as a case study in the
portfolio. This skill is the house recipe. Follow it unless the project's own
CLAUDE.md says otherwise. `mtblck/img-to-svg` is the reference implementation;
`mtblck/boards` (served at `/boards/`) follows the same pattern.

## Known infrastructure

| Thing | Value |
| --- | --- |
| GitHub owner | `mtblck` (repo name = tool slug, kebab-case) |
| Commit identity | `mtblck <105079242+mtblck@users.noreply.github.com>` — see Gotchas |
| Vercel team | `mtblcks-projects` (`team_Q1uznouWmt515f8wBb78KsKp`) |
| Tool proxy target | the project's **production domain** from Settings → Domains (e.g. `img-to-svg-two.vercel.app`), never `<slug>-mtblcks-projects.vercel.app` |
| Portfolio | Vercel project `mb-portfolio` ↔ repo `mtblck/mb-portfolio`, domain `mattblack.space` |
| Supabase | Org `SpringBoard` (`voqenbuqwkmizttjiqqk`), **Pro plan** — every new project bills compute (~$10/mo). Existing projects: Bot Collector, Pokotect, retrorail. |

Re-check these with the Vercel/Supabase tools if anything fails; don't guess IDs.

## Defaults

- **Stack:** React 19 + Vite + Tailwind v4, same as mb-portfolio. TypeScript for
  anything with real logic. No router library unless there are >2 route shapes.
- **No backend unless the tool needs one.** Client-only first: do the work in the
  browser (WASM, Web Workers, WebGPU). If a server step is unavoidable:
  - Secret API key / small proxy → a Vercel Function in the tool's own project.
  - Needs a database or storage → prefer GitHub (issues, repo files) via REST;
    otherwise one shared `tools` Supabase project in the SpringBoard org, one
    Postgres schema per tool, RLS on every table. That project doesn't exist yet
    and creating it costs money: **ask Matt first.**
  - Never put a paid API key in client code. Rate-limit anything that spends money.
- **AI models:** prefer in-browser inference or free/open models. Before wiring a
  paid API, state the expected cost per use and get a yes.
- **Privacy:** no analytics, trackers or third-party scripts. User files stay in
  the browser unless the feature can't work otherwise — say so in the UI if they leave.
- **Look:** may borrow the portfolio identity (warm paper/ink in OKLCH, one
  vermillion accent used only for signal, Instrument Serif / Archivo / JetBrains
  Mono, self-hosted). Copy tokens from `mb-portfolio/src/index.css` and the latin
  woff2 files from `mb-portfolio/public/fonts/` (import them relatively so Vite
  hashes them under the tool's base). Light + dark, WCAG AA, honour
  `prefers-reduced-motion`. No inline scripts — the CSP is `script-src 'self'`.
  Reference public files by absolute base path (`/tools/<slug>/theme.js`) if the
  tool has deep links; `./theme.js` 404s on nested routes.

## Hosting under mattblack.space/tools/<slug>

Each tool deploys as its own Vercel project; mb-portfolio proxies the path to it
with an external rewrite. The trick that keeps this simple: **build the tool so
its files live at the same path on both domains.**

1. **Tool repo — Vite:** `base: '/tools/<slug>/'`, `build.outDir: 'dist/tools/<slug>'`.
   Have `preview.headers` read the headers from `vercel.json` so `vite preview`
   enforces the production CSP locally.
2. **Tool repo — `vercel.json`:** `outputDirectory: "dist"`; SPA fallback
   `/tools/<slug>/(.*)` → `/tools/<slug>/index.html`; redirects `/` and
   `/tools/<slug>` → `/tools/<slug>/`. The tool owns its own security headers and
   CSP here (WASM needs `'wasm-unsafe-eval'` in `script-src`; workers need
   `worker-src 'self' blob:`). Add a `hosting:check` script that fails the build
   if those go missing.
3. **Tool Vercel project:** the Vercel connection **cannot create or update
   projects (403)**. Ask Matt to import the repo at vercel.com/new into
   `mtblcks-projects`, named `<slug>`, framework Vite (vercel.json supplies
   build/output). **Leave deployment protection on Standard.** The dashboard no
   longer offers "Only Preview Deployments"; Standard exempts the project's
   production domain, which is what the portfolio proxies to. Read that domain
   with `get_project` (the `domains` entry that isn't `-mtblcks-projects` or
   `-git-`) and confirm it serves publicly with a plain WebFetch (no bypass).
4. **mb-portfolio `vercel.json`** (draft PR, merge after the tool URL serves):
   - Rewrite `/tools/<slug>/(.*)` → `https://<production domain>/tools/<slug>/$1`,
     placed **before** the SPA catch-all, plus a redirect `/tools/<slug>` →
     `/tools/<slug>/`. Use the regex `(.*)` form: a `:path*` source proxies files
     but silently misses the bare `/tools/<slug>/` root (verified on a probe
     deployment). Never target `<slug>-mtblcks-projects.vercel.app`: under
     Standard Protection it 302s to vercel.com/login.
   - The site-wide header block is already scoped to `"/((?!tools/).*)"`. Keep it
     that way (extend the lookahead for other prefixes such as `boards/`):
     otherwise the portfolio's CSP is stacked on the tool's and blocks
     WASM/workers while the page still appears to load.
   - `npm run hosting:check` enforces: rewrite before catch-all, `(.*)` form, no
     `-mtblcks-projects` targets, CSP scoped away from /tools/; and rejects
     `cleanUrls`, `trailingSlash` and `routes`.
5. **Verify on the real domain**, not localhost: the tool root and a deep link
   return the tool's HTML, `/tools/<slug>/assets/*` are 200, exactly one CSP
   header (the tool's), no console CSP violations. `web_fetch_vercel_url` returns
   response headers and can read protected previews. To tell "rewrite matched"
   from "fell through to the SPA", probe a file path (e.g. `robots.txt`) rather
   than an HTML route — every unknown HTML route returns index.html.

Vercel Microfrontends is the heavier alternative; only reach for it if several
tools need shared navigation.

## Gotchas

- **Commit author:** Vercel blocks deployments ("account configuration") when the
  commit author email isn't linked to Matt's account. Always commit as
  `mtblck <105079242+mtblck@users.noreply.github.com>`. If a deployment shows
  BLOCKED, re-author the HEAD commit that way and push again.
- **The git proxy can't delete branches** (push --delete and the refs API both
  403). Avoid throwaway branches on Matt's repos, or tell him which to delete.
- **PRs:** `gh pr create` uses GraphQL, which is blocked; create via
  `gh api repos/<owner>/<repo>/pulls -F draft=true ...`, and mark ready with
  `POST /repos/<owner>/<repo>/pulls/<n>/ccr/ready_for_review`.
- **Worktrees:** sub-agent worktrees live in `.claude/worktrees/`. Add that to
  `.git/info/exclude` before any `git add -A`, or the worktree gets committed as
  an embedded repo.
- **Claude's cloud sandbox:** the Playwright CDN and Rust target downloads are
  blocked. Use `/opt/pw-browsers/chromium-*/chrome-linux/chrome` via
  `executablePath`. Prebuilt WASM from npm is fine; rebuilding Rust for wasm32 isn't.

## Repo conventions

- Lean `CLAUDE.md` (aim ≤30 lines): what the tool is, commands, the load-bearing
  decisions, anything that will bite. Link to README rather than duplicating.
- README in the portfolio's register: what it does, commands, then **design
  notes** that explain *why* the non-obvious choices were made and what broke
  before. Record measured numbers, not adjectives.
- When tuning anything visual or algorithmic, measure it (render back, score
  against a clean reference) rather than eyeballing, and keep the numbers.
- Ship a `verify` script: real-browser E2E against `vite preview` or a URL,
  failing on console errors and CSP violations, saving screenshots to review.
- Commit messages: imperative subject, a body explaining the reason and how it
  was verified (see mb-portfolio history for the tone).
- Guard rails that fail the build beat comments: if a config shape broke once,
  add a check script.
- Track work as GitHub Issues in the tool's repo (see the `project-tickets` skill).

## Listing it in the portfolio

Add an entry to `mb-portfolio/content/projects.json` (validated by
`npm run content:check`). Shape: `slug, title, year, role, status
("live" | "in-progress" | "archived"), summary, stack[], tags[], cover,
links[{label, href}], case{context, challenge, approach[], outcome[{metric, text}]}`.
The case study is context → challenge → approach → outcome, plain text only,
with real decisions, real constraints and measured outcomes — `timeboxed`,
`bot-collector` and `img-to-svg` are the reference examples. Don't invent Matt's
motivation; flag any sentence that guesses it. Tools that are just for Matt's own
use can skip the listing; ask which it is.

## Checklist for a new tool

1. Repo exists and is cloned; write CLAUDE.md + README skeleton.
2. Research before building if the core technique is non-trivial.
3. Scaffold with `base`/`outDir` set for `/tools/<slug>/` from day one.
4. Build, test, and run `verify` in a real browser with production headers.
5. Ask Matt to import the repo into Vercel (Standard Protection is fine); read
   its production domain and confirm it serves publicly.
6. Draft PR to mb-portfolio: `(.*)` rewrite to the production domain, redirect,
   projects.json entry. Verify on the PR's preview, then mark it ready.
7. After merge, verify on mattblack.space and hand Matt the link.