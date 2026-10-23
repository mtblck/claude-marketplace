# Third-party notices

Everything outside the plugins listed here is Matt's own and covered by `LICENSE`.

## Vendored (copied into this repo)

| Plugin | Upstream | Commit | License | Copyright |
| --- | --- | --- | --- | --- |
| `plugins/web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) `skills/web-design-guidelines` (MIT per its README) and [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) `command.md` | `063bee94c3f4df8453406c830b0a7df0f2860278`, `434b7f91364665f2f733b310ec54809bf8f37937` | MIT (`plugins/web-design-guidelines/LICENSE`) | © 2025 Vercel Labs |
| `plugins/interaction-design` | [wshobson/agents](https://github.com/wshobson/agents) `plugins/ui-design/skills/interaction-design` | `0874a27b17a22e2b7c2e2bcd725768e0803cad06` | MIT (`plugins/interaction-design/LICENSE`) | © 2024 Seth Hobson |

Each vendored plugin's README lists what was changed from upstream.

## Referenced (installed from upstream, nothing copied)

| Plugin | Upstream | Pinned commit | License |
| --- | --- | --- | --- |
| `frontend-design` | anthropics/claude-plugins-official `plugins/frontend-design` | `465f09344424225c25d438f2e052732c3d688d2f` | Apache-2.0 |
| `commit-commands` | anthropics/claude-plugins-official `plugins/commit-commands` | `465f09344424225c25d438f2e052732c3d688d2f` | Apache-2.0 |
| `ui-ux-pro-max` | nextlevelbuilder/ui-ux-pro-max-skill | `04cfb449bd8494811ad63e94172a308fa25a551a` | MIT, © 2024 Next Level Builder |
| `interface-design` | Dammyjay93/interface-design | `2f9be3206855bcb2d1d0af262c8bae25cba6658d` | MIT, © 2026 Damola Akinleye |
| `superpowers` | obra/superpowers | `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b` | MIT, © 2025 Jesse Vincent |

Not included on purpose: `anthropics/claude-code`'s `plugins/` (all rights
reserved; the Apache-2.0 copies in claude-plugins-official are used instead) and
the docx/pdf/pptx/xlsx skills in `anthropics/skills` (source-available, not
open source).

## Ideas adapted

- `plugins/dependency-review`: the shape of the review (work out what the diff really
  changes, classify each advisory's reachability with evidence, vet every introduced
  version's supply chain, fixed verdict rules) follows a Dependabot security-update
  review prompt that a colleague of Matt's wrote for their employer's services and
  Matt shared as an example. Rewritten and generalised here; the employer-specific
  repos, registries and commands were dropped.

- `plugins/pr-review`: the rule that a spec's silence on a behaviour is not
  permission, judged by a reasonable user's expectation, is adapted from
  obra/superpowers `skills/requesting-code-review/code-reviewer.md` (MIT,
  © 2025 Jesse Vincent).
