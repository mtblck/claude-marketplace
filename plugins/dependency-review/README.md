# dependency-review

Reviews Dependabot pull requests, security and version updates alike, in the repos
that copy the `claude-dependabot.yml` template from `repo-setup`. One skill,
`/dependency-review:dependabot`:

1. Lists what the diff really changes (grouped PRs hide transitive bumps and majors),
   and which advisories it fixes or leaves open.
2. Classifies every advisory as EXPLOITABLE, REACHABLE BUT PRECONDITION UNMET, NOT
   REACHABLE or UNDETERMINED, with `file:line` evidence. "Shipped" means bundled into
   the browser build or running on the server, not the dependencies/devDependencies
   split; build tools still matter because they run in CI and Vercel builds with secrets.
3. Vets every introduced version, transitive ones included: age (under 3 days is
   TOO NEW), publisher, provenance, install scripts / `build.rs` / `.pth`, new
   dependencies, the code diff, lockfile hygiene. npm, Cargo, PyPI and GitHub Actions.
4. Reads CI's result instead of installing anything, and posts one comment with a
   verdict: SAFE TO MERGE, HOLD: TOO NEW, DO NOT MERGE: SUPPLY-CHAIN RED FLAG or
   NEEDS HUMAN REVIEW. It updates that comment when Dependabot pushes again.

It never merges, approves or runs package code, and treats advisories, changelogs and
package source as untrusted text.

- Locally: `/dependency-review:dependabot 42` (prints only) or with `--comment`.
- In CI: `claude-dependabot.yml` from `repo-setup`. Dependabot-triggered runs only see
  Dependabot secrets, so `CLAUDE_CODE_OAUTH_TOKEN` must be added there too.

The approach (real diff first, reachability classes with evidence, per-version
supply-chain vetting, verdict rules) is adapted from a Dependabot security-update
reviewer a colleague of Matt's wrote for their own services; see
THIRD_PARTY_NOTICES.md.
