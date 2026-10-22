# dev-practices

Four standalone engineering-discipline skills from
[obra/superpowers](https://github.com/obra/superpowers) by Jesse Vincent, MIT
licensed (see `LICENSE`). Vendored from commit
`2ce8aa15d05bd57213e6f746f953aafb7ded7a8b` (superpowers 7.0.1).

| Skill | What it does |
| --- | --- |
| `systematic-debugging` | Four-phase root-cause process before any fix, with tracing, defense-in-depth and flaky-test helpers |
| `test-driven-development` | Strict red, green, refactor, plus a guide to tests that can actually fail |
| `verification-before-completion` | Run the checks and show the output before claiming anything is done or fixed |
| `receiving-code-review` | Handle review feedback with technical rigor: verify, push back when wrong, no performative agreement |

## Changes from upstream

- Only these four skills; the rest of superpowers (brainstorming, planning,
  subagent-driven development, the SessionStart hook) is available whole as
  the `superpowers` plugin in this marketplace.
- Cross-references `superpowers:<skill>` rewritten to `dev-practices:<skill>`.
- Dropped the author's pressure-test and creation-log files from
  `systematic-debugging`; they are test material, not part of the skill.

To update: copy the four skill folders from a newer superpowers commit, re-apply
the changes above, and bump the commit here and `version` in `plugin.json`.
