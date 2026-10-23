---
name: repo-setup
description: Use when setting up a new or empty repo for Matt, or bringing an existing repo up to his baseline - CLAUDE.md, README, docs/, CI, Claude review, Dependabot review and @claude workflows, the shared plugin marketplace, license and public-repo guards.
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
   in `mtblck/boards`.
4. **`.claude/settings.json`** from `templates/settings.json`: registers this
   marketplace (`mtblck/claude-marketplace`) and enables `pr-review`,
   `repo-setup`, `side-projects` and `superpowers`, so anyone opening the repo in Claude Code
   is offered the shared skills, and the GitHub Action can load them.
5. **CI**: `.github/workflows/ci.yml` copied from `mtblck/boards`. Contract: a
   committed lockfile, `npm test` and `npm run build`. Drop the `e2e` job if
   there's no `npm run verify`. Non-JS repos get the equivalent test + build job.
6. **Claude workflows** from `templates/`: `claude-review.yml` (runs the shared
   `pr-review` skill when a PR is opened as non-draft or marked ready),
   `claude-dependabot.yml` (runs `dependency-review` on every Dependabot PR and
   posts one verdict comment) and `claude.yml` (`@claude` on demand). All load
   their skills from the marketplace, so a PR can't change its own review and
   there is no per-repo copy to keep in step. Skip `claude-dependabot.yml` only
   if the repo has no dependencies at all.
7. **`REVIEW.md`** (optional) from `templates/REVIEW.md` when the repo has review
   focus worth stating: what matters most here, what to stop flagging.
8. **`LICENSE`**: MIT unless Matt says otherwise.
9. **Web projects on Vercel**: `vercel.json` with security headers and a CSP of
   `script-src 'self'`, and a `hosting:check` script that fails the build if
   headers, rewrites or CSP regress (see `portfolio-tool` for the recipe).
10. Labels for tickets: `project-tickets`, "Setting up a repo once".

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
- [ ] Dependabot alerts and security updates on (Settings → Code security)
- [ ] Optional: required checks in Settings → Rules (private repos need GitHub Pro)
