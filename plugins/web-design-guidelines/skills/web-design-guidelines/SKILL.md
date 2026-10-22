---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance (accessibility, focus, forms, animation, typography, performance, dark mode). Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Vercel's Web Interface Guidelines.

## How it works

1. Read `guidelines.md` in this skill's directory. It holds every rule and the
   output format.
2. Read the files named in the arguments, or ask which files or pattern to review.
3. Check them against all the rules.
4. Report findings in the terse `file:line` format the guidelines specify.

The guidelines are a vendored copy, so a review works offline and does not
follow instructions fetched at run time. The latest upstream version is
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md;
see this plugin's README for how to update the copy.
