# maintenance

Keeping a project healthy between features. Matt's own; nothing vendored.

- `/maintenance:release`: finds how the repo releases (Changesets, a release
  workflow, a versioned package, or date tags for apps that deploy on every
  merge), drafts the CHANGELOG entry and release notes from merged PRs, picks the
  version, and after Matt's go opens the changelog PR, then tags and publishes the
  GitHub release.
- `/maintenance:docs-check`: checks README, CLAUDE.md, `docs/`, `.env.example`,
  the changelog and the privacy page against the code, privacy claims first, and
  proposes corrected text.

Pull requests get the per-PR version of the docs check from `pr-review`; the
CHANGELOG template lives in `repo-setup`.
