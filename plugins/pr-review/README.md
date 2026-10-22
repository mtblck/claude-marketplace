# pr-review

Matt's pull request review, first piloted in `mtblck/boards`. Four reviewers run
in parallel (correctness; security and data; tests and docs; repo rules and
design), a separate agent verifies every finding against the code, and the rest
is graded 🔴 blocking, 🟡 should fix or 🔵 nit. With `--comment` it posts inline
comments plus one summary comment carrying a `<!-- claude-review head=<sha> -->`
marker, so a re-run reviews only what changed since.

- Locally: `/pr-review:review 42` (prints only) or `/pr-review:review --comment owner/repo/pull/42`.
- In CI: the `claude-review.yml` template in the `repo-setup` plugin.

Per-repo tuning lives in the reviewed repo, not here: `CLAUDE.md` rules and an
optional `REVIEW.md` (what matters most, what to stop flagging), both read from
the PR's base branch.
