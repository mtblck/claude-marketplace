# <Name>

<One or two sentences: what this is and who it's for. Live at <url>.> README has
setup and design notes.

## Commands

`npm test` · `npm run build` · `npm run dev` <· `npm run verify` (real-browser E2E)>

PRs: open as drafts and mark them ready only when the work is done. Before marking
one ready, run `/pr-review:review <n>` and fix what it finds; the `pr-review` plugin
(mtblck/claude-marketplace) holds the PR at draft until that review has run in the
session. Marking it ready also triggers `.github/workflows/claude-review.yml`.

## Load-bearing decisions

- <The decision, and the reason it must not quietly change.>

The full reasoning behind these, and every other decision worth keeping, is in
`docs/adr/` (one short record per decision; copy `0000-template.md`). Reversing
one means a new ADR that supersedes it, in the same PR.

## What bites

- <The thing that broke once and will again.>
