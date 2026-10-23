# pr-review

Matt's review skills, first piloted in `mtblck/boards`.

## `review`: pull requests

Four reviewers run in parallel (correctness; security and data; tests and docs; repo
rules and design), plus a fifth for accessibility when the PR touches UI. A separate
agent verifies every finding against the code, and the rest is graded 🔴 blocking,
🟡 should fix or 🔵 nit. With `--comment` it posts inline comments plus one summary
comment carrying a `<!-- claude-review head=<sha> -->` marker, so a re-run reviews
only what changed since.

- Locally: `/pr-review:review 42` (prints only) or `/pr-review:review --comment owner/repo/pull/42`.
- In CI: the `claude-review.yml` template in the `repo-setup` plugin.

Per-repo tuning lives in the reviewed repo, not here: `CLAUDE.md` rules and an
optional `REVIEW.md` (what matters most, what to stop flagging), both read from
the PR's base branch.

## `security` and `accessibility`: audits

The deeper, on-demand passes over a whole repo, a feature or a branch:

- `/pr-review:security`: maps the attack surface and trust boundaries, then checks
  access control, Supabase/Firebase rules, secrets, injection, headers and CSP,
  abuse limits, CI workflows and dependencies; verified, graded Critical to Low.
- `/pr-review:accessibility`: WCAG 2.2 AA. A code pass, then a real-browser pass
  (axe, keyboard walkthrough, 320 px and 200% zoom, reduced motion) when the app runs.

Each has a `checklist.md` beside it, which the `review` skill's security and
accessibility angles read too, so a PR and an audit are judged by the same list.
Dependabot PRs are reviewed by the `dependency-review` plugin instead.
