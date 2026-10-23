# repo-setup

The baseline every one of Matt's repos gets: `CLAUDE.md`, README, `docs/`,
`.claude/settings.json` enabling this marketplace, CI, Dependabot config with a
cooldown, a changelog, GitHub security settings, the Claude review,
Dependabot review, monthly docs drift check and `@claude` workflows (which load
`pr-review`, `dependency-review` and `maintenance` from this marketplace), an ADR
template in `docs/adr/`, license, and
the extra community files and prompt-injection guards for public repos.

Ask Claude to "set up this repo" or run `/repo-setup:repo-setup`. Templates are
in `skills/repo-setup/templates/`.
