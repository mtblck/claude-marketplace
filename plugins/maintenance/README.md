# maintenance

Keeping a project healthy between features. Matt's own; nothing vendored.

- `/maintenance:release`: finds how the repo releases (Changesets, a release
  workflow, a versioned package, or date tags for apps that deploy on every
  merge), drafts the CHANGELOG entry and release notes from merged PRs, picks the
  version, and after Matt's go opens the changelog PR, then tags and publishes the
  GitHub release. `--draft` is the unattended version for CI (`claude-release.yml`
  in `repo-setup`): it opens the changelog PR and a draft release, publishes
  nothing, and stops when nothing user-visible merged.
- `/maintenance:docs-check`: checks README, CLAUDE.md, `docs/` (including ADRs and
  the load-bearing decisions), `.env.example`, the changelog and the privacy page
  against the code, privacy claims first, and proposes corrected text. With
  `--issue owner/repo` it runs report-only and keeps one open "Docs drift" issue
  instead; `repo-setup`'s `claude-docs-check.yml` runs it that way monthly.
- `/maintenance:adr`: drafts a decision record in `docs/adr/` from a PR, an issue
  or the conversation, numbered after the existing ones, and marks any ADR it
  reverses as superseded.
- `/maintenance:health-check`: read-only sweep of Matt's repos (default: the
  rollout set) for Dependabot alerts and PRs, red CI on the default branch,
  Claude reviews skipped for a missing secret, stale or unreviewed PRs and drift
  from the `repo-setup` templates, ranked worst first with links. A weekly
  scheduled task (Mondays 8:35 New York time) runs it and posts the summary in
  Matt's Shared Skills project; it never posts findings to GitHub, since some
  repos are private and this one is public.

Pull requests get the per-PR version of the docs check from `pr-review`, which
also suggests an ADR when a PR makes or reverses a load-bearing decision; the
CHANGELOG and ADR templates and the `changelog.yml` / `claude-release.yml`
workflows live in `repo-setup`.
