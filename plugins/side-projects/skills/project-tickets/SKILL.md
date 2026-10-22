---
name: "project-tickets"
description: "Use to read, create, move or comment on tickets and docs for Matt's side projects (GitHub Issues + docs/*.md per repo, shown at mattblack.space/boards), via gh REST."
---

# Project tickets and docs

Matt's tickets are **GitHub Issues in each project's own repo**, and his docs are
`docs/*.md` in that repo. Boards (mattblack.space/boards, repo `mtblck/boards`)
is only a view over them, so Claude works on the source directly with `gh`. The
contract is `CONVENTIONS.md` in `mtblck/boards`; this skill is the working
summary.

## Projects

| Board slug | Repo |
| --- | --- |
| mb-portfolio | mtblck/mb-portfolio |
| img-to-svg | mtblck/img-to-svg |
| botcollector | mtblck/botcollector |
| timeboxed | mtblck/timeboxed |

The authoritative list is `projects.json` in `mtblck/boards`.

## Access

Use `gh api` (REST). In Claude's cloud sandbox, GraphQL is blocked (so no
`gh issue create`, `gh pr create` or Projects v2), and only repos attached to
the session are reachable: attach a repo with `add_repo` (read for viewing,
push for writing) before calling it. On Matt's own machine any `gh` command works.

## Columns are labels

| Column | Rule |
| --- | --- |
| Backlog | open, no `status:` label or `status:backlog` |
| To do | open + `status:todo` |
| Doing | open + `status:doing` |
| Done | closed with reason `completed` |

Exactly one `status:` label on an open issue. Other labels: `type:bug`
`type:feature` `type:chore` `type:docs`, `priority:high`, `public` (visible to
anonymous visitors on public projects).

## Recipes (R = owner/repo)

```bash
# Board: open issues with labels (pull requests excluded)
gh api "repos/$R/issues?state=open&per_page=100" \
  --jq '.[] | select(.pull_request|not) | "#\(.number) [\([.labels[].name]|join(","))] \(.title)"'

# Read a ticket and its comments
gh api repos/$R/issues/$N --jq '.title, .body'
gh api repos/$R/issues/$N/comments --jq '.[] | "\(.user.login): \(.body)"'

# Create (body: problem statement, then "## Done when" checklist)
gh api repos/$R/issues -f title="..." -f body="$BODY" \
  -f 'labels[]=status:todo' -f 'labels[]=type:feature'

# Move: remove the old status label, add the new one
gh api -X DELETE "repos/$R/issues/$N/labels/status:todo"
gh api repos/$R/issues/$N/labels -f 'labels[]=status:doing'

# Done / reopen (reopened issues go to Backlog)
gh api -X PATCH repos/$R/issues/$N -f state=closed -f state_reason=completed
gh api -X PATCH repos/$R/issues/$N -f state=open

# Comment
gh api repos/$R/issues/$N/comments -f body="..."

# Docs: list, and read one
gh api repos/$R/contents/docs --jq '.[].path'
gh api repos/$R/contents/docs/research.md --jq '.content' | base64 -d
```

URL-encode the colon in label paths if a shell or tool needs it
(`status%3Atodo`). Write docs by committing `docs/*.md` in a clone. Docs take
optional frontmatter `public: true` and `order: 10`.

## Setting up a repo once

Create the labels (idempotent: ignore 422 "already exists"):

```bash
for l in "status:backlog c2bfb8" "status:todo 5b8bd9" "status:doing d9822b" \
         "type:bug c4451f" "type:feature 2d6a4f" "type:chore 8a8580" \
         "type:docs 6b5ca5" "priority:high b3261e" "public 1f3b4d"; do
  set -- $l; gh api repos/$R/labels -f name="$1" -f color="$2" >/dev/null 2>&1 || true
done
```

## Working habits

- When starting work on a ticket, move it to Doing; reference it as `Fixes #N` in
  the PR so merging closes it.
- When you notice follow-up work, propose it as tickets (title + Done-when) and
  create them once Matt agrees, rather than leaving TODOs in code.
- Never mark anything `public` unless Matt asks; private is the default.
- Commits that touch docs: author `mtblck <105079242+mtblck@users.noreply.github.com>`
  (Vercel blocks deploys from other author emails).