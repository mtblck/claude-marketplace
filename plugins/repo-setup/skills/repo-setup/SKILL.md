---
name: repo-setup
description: Use when setting up a new or empty repo for Matt, or bringing an existing repo up to his baseline - CLAUDE.md, README, docs/, CI, Dependabot config, changelog, Claude review, Dependabot review and @claude workflows, GitHub security settings, the shared plugin marketplace, license and public-repo guards.
---

# Repo setup baseline

The files every one of Matt's repos gets, whatever it is. `new-project` (in the
`side-projects` plugin) decides the shape of a new project and then uses this
for the repo itself; use this directly when a repo already exists and only needs
bringing up to the baseline. Templates are in `templates/` next to this file.

Before writing anything, look at what the repo already has and keep it. Show
Matt the list of files you will add or change, then do it in one PR (or the
first commit, if the repo is empty).

## Identity and access

- Owner `mtblck`, repo name = slug, kebab-case. Matt creates the empty repo;
  attach it with `add_repo` (access `push`) and clone.
- Commit as `mtblck <105079242+mtblck@users.noreply.github.com>`. Vercel blocks
  deployments whose author email isn't linked to Matt's account.
- In Claude's cloud sandbox GraphQL is blocked: open PRs with
  `gh api repos/<owner>/<repo>/pulls ...` or the GitHub MCP tools, not `gh pr create`.

## Every repo

1. **`CLAUDE.md`**, at most ~30 lines: what it is, commands, load-bearing
   decisions, what bites. Link to the README rather than repeating it. Start
   from `templates/CLAUDE.md`.
2. **`README.md`**: the front door. What it does, how to run it, then design
   notes explaining *why* the non-obvious choices were made, with measured
   numbers rather than adjectives.
3. **`docs/overview.md`** (plus `research.md` if research came first). Boards
   reads `docs/` directly; frontmatter `order:` and `public:` per `CONVENTIONS.md`
   in `mtblck/boards`. Plus `docs/adr/0000-template.md` from
   `templates/docs/adr/` (decision records; private to Boards by default), and an
   ADR for each load-bearing decision already made, if Matt wants them written
   now (`/maintenance:adr`).
4. **`.claude/settings.json`** from `templates/settings.json`: registers this
   marketplace (`mtblck/claude-marketplace`) and enables `pr-review`,
   `dependency-review`, `maintenance`, `repo-setup`, `side-projects` and `superpowers`, so anyone opening the repo in Claude Code
   is offered the shared skills, and the GitHub Action can load them.
5. **CI**: `.github/workflows/ci.yml` from `templates/ci.yml`. Contract: a
   committed lockfile, `npm ci --ignore-scripts`, then `lint`, `test` and `build`
   when they exist. Drop the `e2e` job if there's no `npm run verify` (a
   Playwright script, ideally with axe, as in `mtblck/collated`). Multi-app repos
   get a job per app; non-JS code gets the equivalent test + build job. The
   Dependabot review reads CI's result instead of running tests itself, so a repo
   without CI gets weaker dependency reviews. CI also reports test coverage: copy
   `templates/coverage-report.mjs` to `.github/scripts/coverage-report.mjs` and add a
   `coverage` script (see "Test coverage" below).
6. **Dependabot**: `.github/dependabot.yml` from `templates/dependabot.yml`: one
   block per lockfile and ecosystem, minor and patch grouped weekly, majors alone,
   a 3-day cooldown (7 for majors), Actions monthly. Keep an existing file's
   groups and held majors; add the cooldown.
7. **Claude workflows** from `templates/`: `claude-review.yml` (runs the shared
   `pr-review` skill when a PR is opened as non-draft or marked ready),
   `claude-dependabot.yml` (runs `dependency-review` on every Dependabot PR and
   posts one verdict comment), `claude-docs-check.yml` (monthly `docs-check` from
   `maintenance`, keeping one open issue listing docs drift; never edits docs) and
   `claude.yml` (`@claude` on demand). All load
   their skills from the marketplace, so a PR can't change its own review and
   there is no per-repo copy to keep in step. Skip `claude-dependabot.yml` only
   if the repo has no dependencies at all.
8. **Performance**, web apps only: `.github/workflows/perf.yml` from
   `templates/perf.yml` and `.github/scripts/perf.mjs` from `templates/perf.mjs`.
   On each PR it builds base and head, compares gzipped bundle sizes and runs
   Lighthouse CI (3 runs, mobile) against a local production server, then uploads
   the `perf` artifact that the Claude review's performance angle reads. Set
   `PAGES` to the app's main public routes (no auth), `START_COMMAND` if it isn't
   `vite preview` or `next start`, and any public build env the app needs. It
   measures a local build, not the Vercel preview: previews sit behind Deployment
   Protection, and a local build keeps base and head on the same machine. Skip
   both files for repos with no web build.
9. **`CHANGELOG.md`** from `templates/CHANGELOG.md` for anything with users,
   with two workflows that keep it moving without anyone remembering:
   `changelog.yml` (no Claude) adds a line under Unreleased for each merged PR,
   from its title and labels; `claude-release.yml` runs the `release` skill
   (`maintenance` plugin) in draft mode every Monday and on demand, opening a
   changelog PR and a *draft* GitHub release. Matt merges and publishes; nothing
   is tagged unattended. Quiet weeks stop before Claude runs. Drop the schedule
   (keep the manual trigger) for repos nobody else uses, and skip both for a
   repo that releases with Changesets or its own release workflow.
   If a ruleset requires PRs on `main`, `changelog.yml` can't push; the release
   draft then fills Unreleased from the merged PRs instead.
10. **`REVIEW.md`** (optional) from `templates/REVIEW.md` when the repo has review
   focus worth stating: what matters most here, performance budgets, what to stop flagging.
11. **`LICENSE`**: MIT unless Matt says otherwise.
12. **Web projects on Vercel**: `vercel.json` with security headers and a CSP of
   `script-src 'self'`, and a `hosting:check` script that fails the build if
   headers, rewrites or CSP regress (see `portfolio-tool` for the recipe).
13. Labels for tickets: `project-tickets`, "Setting up a repo once".

## Test coverage

Report only, so every repo has a number to watch and every PR shows which new lines no
test runs. No paid service and no secrets.

- **Convention:** a `coverage` npm script that runs the same tests as `test` and also
  writes `coverage/lcov.info`. CI runs it in place of `npm test` when it exists.
  - Vitest: `"coverage": "vitest run --coverage --coverage.reporter=lcov --coverage.reporter=json-summary --coverage.reporter=text-summary"`,
    plus `@vitest/coverage-v8` (same version as `vitest`) in devDependencies.
  - Jest: `"coverage": "jest --coverage --coverageReporters=lcov --coverageReporters=json-summary --coverageReporters=text-summary"`.
  - Rust (`cargo install cargo-llvm-cov` or `taiki-e/install-action`):
    `cargo llvm-cov --lcov --output-path coverage/lcov.info`.
  - Python (`pytest-cov`): `pytest --cov --cov-report=lcov:coverage/lcov.info`.
  Non-npm jobs run their command, then the same `Coverage report` and
  `Upload coverage` steps as the template.
- **What CI does:** `coverage-report.mjs` puts whole-repo and changed-line coverage
  in the job summary and writes `coverage/diff-coverage.json`; both are uploaded as
  the `coverage` artifact (14 days). The Claude review waits for that run, downloads
  the artifact and reports uncovered new functions and branches as 🟡 findings.
- **Thresholds, opt in per repo:** none at first. Once the number is steady, set the
  repository variable `COVERAGE_MIN` (whole-repo line %) and/or `DIFF_COVERAGE_MIN`
  (changed-line %) under Settings → Secrets and variables → Actions → Variables; CI
  then fails below them. Variables, not secrets: they are not sensitive.
- **No tests yet:** add the `coverage` script anyway once there is a first test, and
  use `/maintenance:test-gaps` to pick and write the first tests where they matter
  most.

## GitHub security settings

Repo settings, not files: apply them with `gh api` where it works, and say which
were applied. Claude's cloud sandbox refuses these endpoints (HTTP 403 from its
proxy), so there hand Matt the link instead:
`https://github.com/<o>/<r>/settings/security_analysis`, with which toggles to turn on.

- Dependabot alerts and security updates:
  `gh api -X PUT repos/<o>/<r>/vulnerability-alerts` and
  `gh api -X PUT repos/<o>/<r>/automated-security-fixes`.
- Secret scanning and push protection (blocks a push that contains a credential):
  `gh api -X PATCH repos/<o>/<r> --input -` with
  `{"security_and_analysis":{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}}`.
- CodeQL default setup (JavaScript/TypeScript, Actions and any other language it
  finds; no workflow file to maintain):
  `gh api -X PATCH repos/<o>/<r>/code-scanning/default-setup -f state=configured`.
- Private vulnerability reporting, public repos: `gh api -X PUT repos/<o>/<r>/private-vulnerability-reporting`.

Free on public repos. On private repos secret scanning and CodeQL need GitHub's paid
Secret Protection / Code Security; skip them there and say so, Dependabot alerts and
updates are free everywhere. Results show under the repo's Security tab; the
`security` skill in `pr-review` reads open alerts as part of an audit.

## Public repos also get

Copy and adapt from `mtblck/inlaytrace`: `SECURITY.md` (contact `hello@<domain>`
if there is one), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
`.github/ISSUE_TEMPLATE/` (bug, feature, config) and
`.github/PULL_REQUEST_TEMPLATE.md`.

Keep the guards in the Claude workflows (they are in the templates): `@claude`
runs only for `OWNER`/`MEMBER`/`COLLABORATOR` on comments, reviews and issues,
and the review is skipped for fork PRs. Without them a stranger's issue becomes
a prompt-injection path with write access.

## Hand back

A checklist of what's waiting on Matt:
- [ ] Claude GitHub App installed on the repo (https://github.com/apps/claude)
- [ ] `CLAUDE_CODE_OAUTH_TOKEN` repo secret (`claude setup-token` locally), under
      both Actions and Dependabot secrets (Dependabot runs see only the latter)
- [ ] GitHub security settings above, if they couldn't be applied from here
- [ ] Optional: required checks in Settings → Rules (private repos need GitHub Pro)
