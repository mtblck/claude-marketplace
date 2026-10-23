# claude-marketplace

Matt's [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces):
the skills he wants in every repo, on his machine, in Claude's cloud sessions
and in the Claude GitHub Action. The marketplace is called **`mtblck`**, so
plugins are installed as `<plugin>@mtblck`.

## Plugins

| Plugin | Skills | Source |
| --- | --- | --- |
| `pr-review` | `review`: four-angle PR review (five with accessibility when UI changes), every finding verified, graded 🔴/🟡/🔵, optional inline comments; `security` and `accessibility` (WCAG 2.2 AA) audits | Matt (from `mtblck/boards`) |
| `dependency-review` | `dependabot`: Dependabot PR review: real diff, advisory reachability, supply-chain vetting, one verdict comment | Matt |
| `repo-setup` | `repo-setup`: the baseline every repo gets, with workflow and settings templates | Matt |
| `side-projects` | `new-project`, `portfolio-tool`, `project-tickets` | Matt's claude.ai skills |
| `web-design-guidelines` | `web-design-guidelines`: UI and accessibility review | vendored from [vercel-labs](https://github.com/vercel-labs/web-interface-guidelines), MIT |
| `frontend-design` | `frontend-design`: distinctive frontend design direction | upstream [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official), Apache-2.0 |
| `commit-commands` | `/commit`, `/commit-push-pr`, `/clean_gone` | upstream anthropics/claude-plugins-official, Apache-2.0 |
| `ui-ux-pro-max` | searchable styles, palettes, fonts, UX rules per stack | upstream [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), MIT |
| `interface-design` | design engineering and design review, decisions kept across sessions | upstream [Dammyjay93/interface-design](https://github.com/Dammyjay93/interface-design), MIT |
| `superpowers` | brainstorm, plan, execute; TDD, systematic debugging, verification before completion, code review, worktrees | upstream [obra/superpowers](https://github.com/obra/superpowers), MIT |

**Vendored** plugins are copied into `plugins/` with their license and a README
saying what changed. **Upstream** plugins are only an entry in
`.claude-plugin/marketplace.json`, pinned to a commit `sha`; nothing is copied,
and bumping the `sha` is the update. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

`superpowers` is on by default: its SessionStart hook tells Claude to look for
a matching skill before acting, which is what makes the brainstorm, plan and
TDD workflow kick in by itself. It costs some tokens per session; that's the
intended trade.

Plugin skills are namespaced: `/pr-review:review`, `/repo-setup:repo-setup`,
`/side-projects:new-project`, and so on. Claude also picks them up from their
descriptions without the slash command.

## Use it on your machine

Once, for every project:

```
/plugin marketplace add mtblck/claude-marketplace
/plugin install pr-review@mtblck
/plugin install dependency-review@mtblck
/plugin install side-projects@mtblck
/plugin install superpowers@mtblck
```

The repo is public, so no credentials are needed to install or auto-update it.

## Enable it in a project repo

Commit `.claude/settings.json` in the repo (the `repo-setup` skill does this; the
template is [`plugins/repo-setup/skills/repo-setup/templates/settings.json`](plugins/repo-setup/skills/repo-setup/templates/settings.json)):

```json
{
  "extraKnownMarketplaces": {
    "mtblck": {
      "source": { "source": "github", "repo": "mtblck/claude-marketplace" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "pr-review@mtblck": true,
    "dependency-review@mtblck": true,
    "repo-setup@mtblck": true,
    "side-projects@mtblck": true,
    "superpowers@mtblck": true
  }
}
```

Add `"frontend-design@mtblck": true`, `"web-design-guidelines@mtblck": true` and so on
per repo as they fit. Claude Code offers to install the marketplace and plugins
when the folder is trusted. `claude plugin marketplace add mtblck/claude-marketplace --scope project`
writes the marketplace half for you.

**Claude's cloud sessions** (claude.ai/code) read the same `.claude/settings.json`
from the cloned repo and install the marketplace from GitHub. It's public, so
the session needs no extra repository access.

## Use it in the GitHub Action

[`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action)
takes `plugin_marketplaces` (git URLs or local paths, newline-separated) and
`plugins` (`name@marketplace`, newline-separated). This marketplace is public,
so the workflows pass its git URL and need no token for it:

```yaml
      - uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          plugin_marketplaces: https://github.com/mtblck/claude-marketplace.git
          plugins: pr-review@mtblck
          prompt: "/pr-review:review --comment ${{ github.repository }}/pull/${{ github.event.pull_request.number }}"
```

Full workflows to copy into a repo's `.github/workflows/`:

- [`claude-review.yml`](plugins/repo-setup/skills/repo-setup/templates/claude-review.yml):
  reviews a PR when it's opened as non-draft or marked ready (or by hand with a
  PR number). Skips fork PRs, keeps the repo's `.claude/` from the default
  branch so a PR can't change its own review settings, and skips with a notice
  until the secret exists.
- [`claude-dependabot.yml`](plugins/repo-setup/skills/repo-setup/templates/claude-dependabot.yml):
  reviews every Dependabot PR with `dependency-review` and posts (then updates) one
  verdict comment. Never merges or installs anything. Needs the token as a
  Dependabot secret too.
- [`claude.yml`](plugins/repo-setup/skills/repo-setup/templates/claude.yml):
  `@claude` on demand, only from the owner, members and collaborators.

### Secrets, once per repo

1. Install the [Claude GitHub App](https://github.com/apps/claude) on the repo.
2. `CLAUDE_CODE_OAUTH_TOKEN`: run `claude setup-token` locally and save it as a
   repo secret (Settings → Secrets and variables → Actions), and again under
   Dependabot in the same menu for the Dependabot review. For API billing
   instead, save `ANTHROPIC_API_KEY` and swap the input to `anthropic_api_key`.

The marketplace needs no secret: it's public (it holds no credentials, only skills,
account names and IDs), which is what lets every repo load it without a per-repo token.
Keep it that way: nothing secret goes in this repo.

## Repo layout

```
.claude-plugin/marketplace.json   the catalog: one entry per plugin
plugins/<name>/                   vendored or Matt's own plugins
  .claude-plugin/plugin.json      manifest (name, version, author, license)
  skills/<skill>/SKILL.md         the skills, with any supporting files beside them
  README.md                       what it is, and for vendored ones what changed
```

## Changing things

- Edit a skill, bump `version` in its `plugin.json` (installed copies only
  update when the version changes), open a PR. CI runs `claude plugin validate .`.
- Add a plugin: a folder under `plugins/` plus an entry in `marketplace.json`,
  or just an entry with a `github` / `git-subdir` source and a pinned `sha` for
  something that lives upstream. Check the license first; vendor only MIT,
  Apache-2.0 or BSD content and keep its LICENSE file.
- Matt's claude.ai skills (`side-projects`) are copies. When one changes on
  claude.ai, copy it here too (or the other way round).
- Test locally: `claude --plugin-dir plugins/<name>` loads one plugin for a
  session; `claude plugin marketplace add ./` adds the whole checkout.
