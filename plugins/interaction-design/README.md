# interaction-design

A motion and microinteraction skill by Seth Hobson, from
[wshobson/agents](https://github.com/wshobson/agents)
(`plugins/ui-design/skills/interaction-design`, MIT, © 2024 Seth Hobson, see
`LICENSE`; commit `0874a27b17a22e2b7c2e2bcd725768e0803cad06`). Only this one
skill is vendored, not the rest of the `ui-design` plugin, whose accessibility
and review skills overlap `pr-review` and `web-design-guidelines`.

Claude picks it up when adding hover and press feedback, loading and skeleton
states, page transitions, toasts, gestures or scroll animations, or run it with
`/interaction-design:interaction-design`.

Install it with `/plugin install interaction-design --marketplace mtblck/claude-marketplace`,
or enable `"interaction-design@mtblck": true` in a repo's `.claude/settings.json`.

## Changes from upstream

- Imports changed from `framer-motion` to `motion/react`, and "Framer Motion"
  headings renamed to Motion: the library was renamed and new projects install
  `motion`. The APIs used in the examples are unchanged.

To update: copy a newer `skills/interaction-design/` over this one, re-apply the
change above, and bump the commit here, in THIRD_PARTY_NOTICES.md and `version`
in `plugin.json`.
