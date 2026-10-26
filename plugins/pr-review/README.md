# pr-review

Matt's review skills, first piloted in `mtblck/boards`.

## `review`: pull requests

Four reviewers run in parallel (correctness; security and data; tests and docs; repo
rules and design), plus one for accessibility when the PR touches UI and one for
performance when it touches client code, dependencies or build config. The
performance reviewer reads the bundle-size and Lighthouse numbers from the repo's
`perf.yml` run (the `repo-setup` template) when there is one, and reviews the diff
for known causes either way. A separate
agent verifies every finding against the code, and the rest is graded 🔴 blocking,
🟡 should fix or 🔵 nit. With `--comment` it posts inline comments plus one summary
comment carrying a `<!-- claude-review head=<sha> -->` marker, so a re-run reviews
only what changed since.

When CI uploads a coverage report (the `ci.yml` template in `repo-setup`), the
review workflow passes it with `--coverage <dir>` and the tests angle reports new
functions and branches that no test runs, each still verified against the tests.

- Locally: `/pr-review:review 42` (prints only) or `/pr-review:review --comment owner/repo/pull/42`.
- In CI: the `claude-review.yml` template in the `repo-setup` plugin.
- Before a session readies its own PR: automatic, see below.

### The ready-for-review hook

`hooks/ready-gate.sh` makes the review part of readying a PR in any Claude session
that has the plugin enabled, rather than leaving it to the review Action. It denies:

- marking a PR ready (`mcp__github__update_pull_request` with `draft: false`,
  `gh pr ready`, or `gh api` to `pulls/<n>/…/ready_for_review` or with `draft=false`)
  until `/pr-review:review <n>` has run on that PR in the session, and
- opening a PR that isn't a draft (`mcp__github__create_pull_request`, `gh pr create`
  or `gh api …/pulls` without draft), so every PR goes through that step.

The denial tells Claude to run the review (print only), fix every 🔴 and 🟡 finding,
push, and mark the PR ready again. A review counts when it starts, through the
`Skill` tool or a typed `/pr-review:review <n>`; the PR numbers are kept per
session under `$TMPDIR/pr-review-gate/`, so a new session reviews again. When the
user says to skip the review for a PR, the denial names the one-line command that
records it. The hook does nothing in GitHub Actions (`GITHUB_ACTIONS` is set) and
lets everything through when `jq` is missing.

Per-repo tuning lives in the reviewed repo, not here: `CLAUDE.md` rules and an
optional `REVIEW.md` (what matters most, what to stop flagging), both read from
the PR's base branch.

## `security`, `accessibility` and `performance`: audits

The deeper, on-demand passes over a whole repo, a feature or a branch:

- `/pr-review:security`: maps the attack surface and trust boundaries, then checks
  access control, Supabase/Firebase rules, secrets, injection, headers and CSP,
  abuse limits, CI workflows and dependencies; verified, graded Critical to Low.
- `/pr-review:accessibility`: WCAG 2.2 AA. A code pass, then a real-browser pass
  (axe, keyboard walkthrough, 320 px and 200% zoom, reduced motion) when the app runs.
- `/pr-review:performance`: builds the app, measures gzipped bundles and runs
  Lighthouse locally, then finds the causes in the code (heavy dependencies,
  splitting, images, fonts and scripts, waterfalls, client/server boundaries).

Each has a `checklist.md` beside it, which the `review` skill's security,
accessibility and performance angles read too, so a PR and an audit are judged by the same list.
Dependabot PRs are reviewed by the `dependency-review` plugin instead.
