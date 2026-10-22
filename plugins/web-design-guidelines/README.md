# web-design-guidelines

A UI review skill from Vercel Labs. The skill is from
[vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
(`skills/web-design-guidelines`, MIT per that repo's README, commit
`063bee94c3f4df8453406c830b0a7df0f2860278`). The rules are from
[vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines)
(`command.md`, MIT, © 2025 Vercel Labs, see `LICENSE`; commit
`434b7f91364665f2f733b310ec54809bf8f37937`).

Run it with `/web-design-guidelines:web-design-guidelines src/**/*.tsx`, or ask
Claude to review a page's UI or accessibility.

## Changes from upstream

- Upstream fetches `command.md` from GitHub on every run. Here it is vendored
  as `skills/web-design-guidelines/guidelines.md` (its command frontmatter and
  `$ARGUMENTS` line removed), so reviews work offline and nothing fetched at
  run time can steer the review.

To update: copy a newer `command.md` over `guidelines.md`, re-apply the change
above, and bump the commit here and `version` in `plugin.json`.
