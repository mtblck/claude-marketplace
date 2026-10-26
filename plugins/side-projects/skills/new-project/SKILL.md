---
name: "new-project"
description: "Use when Matt pitches a new side-project idea or asks to start/kick off/spin up a new project. Interactive quick start - repo, backend, hosting, domain, email, boards and portfolio."
---

# New project quick start

Matt pitches an idea; this skill turns it into a repo that is wired into his
setup: GitHub, Vercel, (maybe) Supabase, (maybe) a Spaceship domain with
Spacemail, Boards and the portfolio. It is a **conversation first, scaffold
second**: settle the shape with Matt, then build only what the shape needs.

Related skills, used rather than repeated here:
- `portfolio-tool`: stack defaults, the `/tools/<slug>/` hosting recipe, commit
  identity, sandbox gotchas, the `projects.json` case-study shape.
- `project-tickets`: GitHub Issues as tickets, label setup, docs conventions.

## Known infrastructure

| Thing | Value |
| --- | --- |
| GitHub | owner `mtblck`; repo name = slug, kebab-case |
| Commit identity | `mtblck <105079242+mtblck@users.noreply.github.com>` (Vercel blocks other author emails) |
| Vercel | team `mtblcks-projects` (`team_Q1uznouWmt515f8wBb78KsKp`). Every project is hosted here. |
| Supabase | org `SpringBoard`, **Pro plan: each new project bills compute (~$10/mo)** |
| Domains | registered at **Spaceship**; nameservers stay at Spaceship (`launch1/2.spaceship.net`) |
| Email | **Spacemail** mailbox per product domain, `hello@<domain>` |
| Portfolio | `mtblck/mb-portfolio` → mattblack.space, entries in `content/projects.json` |
| Boards | `mtblck/boards` → mattblack.space/boards, project list in `projects.json` |
| Reference project | `mtblck/inlaytrace` (public): landing + app + docs + npm package |

Re-check IDs with the Vercel/Supabase tools if something fails; never guess them.

## 1. Hear the idea, then check for overlap

Restate the idea in two sentences. Before asking anything, read
`projects.json` in `mtblck/boards` and `content/projects.json` in
`mtblck/mb-portfolio`: if this extends an existing project, say so and ask
whether it's a feature there or a new repo.

Propose a slug (and a product name if it might go public). If it could become a
product, check that the npm name and domain are free before Matt falls for it
(`npm view <name>`; Vercel `get_domain_availability` / `get_domain_price` for a
quick read, but Matt **buys at Spaceship**, not through Vercel).

## 2. Settle the shape (interactive)

Ask with AskUserQuestion, at most four questions per round, recommended option
first. Skip any question the pitch already answered.

1. **What is it?**
   - *Personal tool*: just for Matt; no listing, no domain.
   - *Portfolio tool*: lives at `mattblack.space/tools/<slug>/` → `portfolio-tool` recipe.
   - *Standalone product*: its own domain, like inlaytrace.com → the product layout below.
2. **Repo visibility**: private (default for anything early) or public. Public
   adds the community files and the Claude-workflow guards (step 4).
3. **Pieces it needs** (multi-select): app · landing page · docs site ·
   npm package · API/serverless functions.
4. **Data**: does anything need to persist beyond the user's browser, be shared
   between users, or need auth? (Drives step 3.)

Then write back a one-paragraph plan (shape, pieces, backend yes/no, domain
yes/no) and get a yes before creating anything.

## 3. Backend and hosting guidance

Give a recommendation with the reason, not a menu.

- **No backend** is the default. Browser-only (Web Workers, WASM,
  `localStorage`/IndexedDB) covers most tools. Inlay is entirely client-side.
- **Secret key, proxy, webhook, small API** → a Vercel Function in the
  project's own repo. Rate-limit and spend-cap anything that costs money; never
  ship a paid key to the client.
- **Real data** (accounts, shared state, relational data, file storage) →
  **Supabase**. Before creating a project, say plainly it adds ~$10/mo on the
  Pro org and get a yes. Use the Supabase tools (`list_projects`,
  `create_project` in SpringBoard, migrations via `apply_migration`), RLS on every
  table, publishable key only in the client, `generate_typescript_types` into
  the repo. For several small tools, ask whether to share one project with a
  schema per tool (see `portfolio-tool`).
- **Ticket-like or content data** → consider GitHub (issues, repo files) via
  REST before a database, as Boards does.

**Hosting is always Vercel**, team `mtblcks-projects`. The Vercel connection
has returned 403 creating projects before: try `create_project` once, and on
failure ask Matt to import the repo at vercel.com/new (framework from
`vercel.json`, deployment protection left on Standard). Env vars via
`create_project_env` once the project exists.

## 4. Create the repo

Matt creates the empty repo on GitHub (`mtblck/<slug>`, chosen visibility,
no template files); then attach it with `add_repo` (access `push`) and clone.
Commit as the identity above.

Every repo gets the baseline in the `repo-setup` skill (same marketplace):
`CLAUDE.md` (Inlay's is the model), a README that's the front door, `docs/`,
`.claude/settings.json` enabling this marketplace, CI copied from
`mtblck/boards`, the Claude review and `@claude` workflows that load the shared
`pr-review` skill, `vercel.json` with security headers and a CSP of
`script-src 'self'` plus a `hosting:check` script, and an MIT `LICENSE` unless
Matt says otherwise. Matt then adds the `CLAUDE_CODE_OAUTH_TOKEN` secret
(see `repo-setup`, "Hand back").

**Public repos also get** (copy and adapt from inlaytrace): `SECURITY.md`
(contact `hello@<domain>` if there is one), `CONTRIBUTING.md`,
`CODE_OF_CONDUCT.md`, `.github/ISSUE_TEMPLATE/` (bug, feature, config),
`.github/PULL_REQUEST_TEMPLATE.md`. Keep the guards in inlaytrace's Claude
workflows: `@claude` only from OWNER/MEMBER/COLLABORATOR on both comment and
issue, and review skipped for fork PRs. Without them a stranger's issue becomes
a prompt-injection path with write access.

## 5. Scaffold by shape

Default stack (from `portfolio-tool`): React 19 + Vite + Tailwind v4 +
TypeScript. Build only the pieces picked in step 2.

### Portfolio tool
Follow `portfolio-tool` exactly: `base: '/tools/<slug>/'`, `outDir:
'dist/tools/<slug>'`, then a draft PR to mb-portfolio adding the `(.*)` rewrite
to the tool's production domain.

### Standalone product (the inlaytrace layout)
One npm workspace, one Vercel project, one domain:

```
apps/app/        Vite + React app, base '/app/', builds to <root>/dist/app
apps/site/       Astro + Starlight: landing at '/', docs at '/docs/', outDir ../../dist
packages/<pkg>/  the publishable library (only if there is one)
docs/            the only copy of the docs; scripts/sync-docs.mjs copies them into the site
scripts/         check-hosting.mjs, serve.mjs (mimics Vercel for preview), verify.mjs (real-browser E2E)
vercel.json      redirects (/app → /app/, /docs → first page), SPA rewrite /app/(.*), two CSPs
```

Things that were learned the hard way in inlaytrace; carry them over:
- **Docs live once, in `docs/`.** `sync-docs.mjs` turns the first `#` heading
  into the title, `order` into `sidebar.order`, rewrites relative `.md` links to
  site URLs, and skips internal notes (an `INTERNAL` set, `<!-- site:hide -->`
  blocks). The generated folder is gitignored; never edit it.
- **Two CSPs scoped not to overlap**: the site's lists a sha256 per Starlight
  inline script; the app's adds only what it needs (`'wasm-unsafe-eval'`,
  `worker-src 'self' blob:`). `hosting:check --dist` names any new hash after a build.
- The app's Vite config reads headers from `vercel.json` into `preview.headers`,
  so a bad CSP fails locally, not just on Vercel.
- The app and site import the package **by name, aliased to its `src/`**
  (Vite/Astro `resolve.alias` + tsconfig paths): no package build in the dev loop.
- A **privacy page** linked from landing and app when the product handles user files.
- Long-lived `Cache-Control: immutable` only on hashed asset paths (`/app/assets/`, `/_astro/`).

### npm package (inlaytrace's `packages/inlay` is the template)
- `tsdown` builds `dist/`; `exports` with `types` + `default`; `files: [dist,
  CHANGELOG.md]`; `sideEffects: false`; `engines.node >=20`; no DOM or app imports.
- `check` = `publint --strict && attw --pack --profile esm-only`;
  `test/smoke.mjs` loads `dist/` in plain Node. CI runs both on Node 24 and 20.
- **Changesets** for versions (`.changeset/config.json`, `access: public`,
  private workspace packages not versioned); `version-packages` script.
- **Release = npm trusted publishing, stage-only** (`release.yml`): merging the
  version PR stages the release with provenance; Matt approves with 2FA
  (`npm stage approve`); a re-run tags it. No npm token stored anywhere. Copy
  inlaytrace's `release.yml` and its CONTRIBUTING release section; Matt
  configures the trusted publisher on npmjs.com for the new package.

## 6. Domain and email (products only)

Matt registers the domain at **Spaceship**. DNS stays at Spaceship, pointed at Vercel:
1. Add the domain to the Vercel project (`add_project_domain`, apex and `www`,
   one redirecting to the other).
2. Read `get_domain_config` for the records Vercel wants (for inlaytrace: apex
   `A` record, currently `216.150.1.1`; `www` gets the CNAME it recommends) and
   give Matt the exact records to enter in Spaceship's DNS. Recheck until
   `misconfigured: false`.
3. Email: Matt sets up `hello@<domain>` on **Spacemail**. Its MX, SPF and DKIM
   records go in the same Spaceship DNS zone. Don't let the Vercel records
   replace them. Use `hello@<domain>` as the contact in SECURITY.md, the privacy
   page, `package.json` `author`/`bugs` where it fits.

Buying the domain and creating the mailbox are Matt's to do; Claude prepares
the records and verifies.

## 7. Wire into Boards

PR to `mtblck/boards`:
- `projects.json`: `{ "slug", "name", "repo": "mtblck/<slug>", "url"? }`. No `public`
  field (Boards rejects it): the board is public exactly when the GitHub repo is,
  and signed-out visitors see only public repos.
Then, in the new repo, create the labels and a first handful of tickets (`project-tickets`
"Setting up a repo once"; ticket body ends with `## Done when`).

Tell Matt: **Boards' GitHub token is scoped to named repos**. He must add the
new repo to it, or the board shows nothing, and visitors won't see it even if
the repo is public.

## 8. Add to the portfolio

Ask whether it gets listed (personal tools can skip). If yes, a draft PR to
`mtblck/mb-portfolio` adding a `content/projects.json` entry with `status:
"in-progress"`, links (live, site/docs, npm, source), and a case study skeleton
(context → challenge → approach → outcome) from what Matt actually said. Run
`npm run content:check`. Flag any sentence that guesses his motivation; update
the entry to `live` with measured outcomes when it ships.

## 9. Hand back

A short checklist of what's done and what's waiting on Matt, e.g.:
- [ ] Vercel import (if `create_project` 403'd)
- [ ] `CLAUDE_CODE_OAUTH_TOKEN` secret + Claude GitHub App on the repo
- [ ] Spaceship DNS records / Spacemail mailbox
- [ ] Add the repo to Boards' GitHub token
- [ ] npm trusted publisher (packages only)
- [ ] Merge the boards and portfolio PRs

Plus the links: repo, preview URL, board, draft PRs.