# maintenance

Keeping a project healthy between features. Matt's own; nothing vendored.

- `/maintenance:release`: finds how the repo releases (Changesets, a release
  workflow, a versioned package, or date tags for apps that deploy on every
  merge), drafts the CHANGELOG entry and release notes from merged PRs, picks the
  version, and after Matt's go opens the changelog PR, then tags and publishes the
  GitHub release.
- `/maintenance:docs-check`: checks README, CLAUDE.md, `docs/` (including ADRs and
  the load-bearing decisions), `.env.example`, the changelog and the privacy page
  against the code, privacy claims first, and proposes corrected text. With
  `--issue owner/repo` it runs report-only and keeps one open "Docs drift" issue
  instead; `repo-setup`'s `claude-docs-check.yml` runs it that way monthly.
- `/maintenance:adr`: drafts a decision record in `docs/adr/` from a PR, an issue
  or the conversation, numbered after the existing ones, and marks any ADR it
  reverses as superseded.

Pull requests get the per-PR version of the docs check from `pr-review`, which
also suggests an ADR when a PR makes or reverses a load-bearing decision; the
CHANGELOG and ADR templates live in `repo-setup`.
