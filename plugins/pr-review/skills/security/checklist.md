# Security checklist

Shared by the `security` skill (whole-repo or area audits) and the security angle of
the `review` skill (one PR). Work from the attack surface, not down the list: find who
can send what to which code, then use the sections that apply to it. Skip sections for
stacks the repo doesn't use.

## Attack surface and trust boundaries

- Entry points: Vercel functions (`api/`), Next.js route handlers, server actions
  and middleware, `server/`, Supabase edge functions and RPCs, Python services,
  webhooks, cron jobs, the Tauri command bridge, browser extension messages,
  `postMessage` listeners, URL and query parameters, uploaded files.
- For each: who can reach it (anonymous, signed in, owner, admin, another service),
  what checks that, and whether anonymous gets strictly less.
- What's worth taking: service-role and API keys, other users' rows and files,
  admin actions, paid API quota (LLM, image, email), the Vercel or GitHub token in CI.

## Access control

- Every server entry point checks identity on the server, from the verified session
  (Supabase: `auth.getUser()` or verified JWT claims, not an unverified
  `getSession()` or a user id sent by the client), and checks ownership of the row
  or object it touches, not only that someone is signed in.
- Admin-only paths check the role on the server; hiding a button is not a check.
- Server actions are public POST endpoints: each one authenticates and validates
  its own arguments.
- Next.js middleware is not the only guard for a route (it can be skipped by
  matcher gaps); the handler checks too.
- IDs taken from the client can't reach rows of another user or tenant (IDOR).

## Supabase and Firebase

- RLS is enabled on every table in an exposed schema, with policies for each
  operation that compare `auth.uid()` to the owner column; no `using (true)` on
  user data. A new table or column in a migration gets its policy in the same
  migration.
- `security definer` functions set `search_path` and check the caller themselves;
  views on protected tables use `security_invoker`.
- Storage buckets: public only on purpose; object policies scoped by owner path.
- The service-role key is used only in server code, never in anything shipped to the
  browser, and a request made with it re-applies the user's authorization by hand.
- Firestore / Storage rules: no `allow read, write: if true` or `if request.auth != null`
  on user data; each rule checks `request.auth.uid` against the document's owner.

## Secrets and configuration

- No keys, tokens or passwords in code, tests, fixtures, docs or committed `.env*`.
- Anything prefixed `VITE_`, `NEXT_PUBLIC_` or read in client code is public. Only
  publishable keys (Supabase anon, Turnstile site key, Sentry DSN) belong there.
- Secrets never reach logs, error messages, analytics, Sentry breadcrumbs or API
  responses. Error responses don't leak stack traces or SQL in production.

## Injection and output

- HTML: no `dangerouslySetInnerHTML`, `innerHTML`, `v-html`, or markdown rendered
  with raw HTML enabled, on input a user or third party controls, unless sanitised
  (DOMPurify or equivalent). `href`/`src` from user input are checked for
  `javascript:` and `data:` schemes.
- SQL: parameterised queries or the query builder; no string-built SQL, `.rpc` with
  interpolated SQL, or `.or()` / `.filter()` strings built from user input.
- Shell and paths: no `exec`/`spawn` with a shell on user input; file paths from users
  are normalised and confined to their directory.
- SSRF: server code that fetches a user-supplied URL restricts scheme and host and
  can't reach internal addresses or cloud metadata (`169.254.169.254`).
- Open redirects: redirect targets from query params are checked against an
  allowlist or are relative paths only.
- LLM features: model output is untrusted (escaped before rendering, never executed);
  tools the model can call can't act beyond the current user's rights; user content in
  prompts can't unlock other users' data or the system prompt's secrets.

## Browser and HTTP

- `vercel.json` (or `next.config` headers): CSP stays at least as strict as before
  (`script-src 'self'` baseline; no new `'unsafe-inline'`, `'unsafe-eval'`, `blob:` or
  wildcard hosts without a stated reason), plus `X-Content-Type-Options`,
  `Referrer-Policy`, `frame-ancestors` / `X-Frame-Options`, HSTS. The repo's
  `hosting:check` must still cover any header it changes.
- CORS: no `*` with credentials; origins are an allowlist.
- Cookies holding sessions are `HttpOnly`, `Secure`, `SameSite`. State-changing GET
  requests don't exist.
- Third-party scripts and CDNs: pinned, with SRI where possible, and allowed by CSP on
  purpose.

## Abuse and cost

- Public endpoints that send email, call paid APIs, write data or accept uploads have
  rate limiting or a challenge (Turnstile) and size limits.
- Uploads: size and type checked on the server (by content, not the extension or
  `Content-Type` header); SVG and HTML uploads never served inline from the app's origin.
- Unbounded loops, regexes (ReDoS) or recursion on user input.

## Data and privacy

- Personal data collected only where needed, not logged, and covered by the repo's
  privacy page if it has one (`docs/privacy.md`): a change in what is collected or
  where it's sent makes that page wrong.
- Client-only tools (files processed in the browser) stay client-only: a new network
  call that sends user content anywhere is a finding.

## Desktop and extensions

- Tauri: capabilities / allowlist grant only the commands and paths needed; commands
  validate their arguments; CSP set; the updater checks signatures.
- Browser extension: minimal `permissions` and `host_permissions`; content scripts
  don't trust page messages; no remote code.

## CI and GitHub workflows

- No `pull_request_target` or `workflow_run` that checks out or runs PR code with
  secrets or a write token.
- No `${{ github.event.* }}` (titles, bodies, branch names, comments) interpolated
  straight into `run:`; pass through `env:` and quote.
- `permissions:` is set and minimal per job. Secrets aren't exposed to fork PRs.
- Third-party actions are from known owners; those running with secrets on public
  repos are pinned to a full commit SHA.
- Claude workflows keep their guards: the author-association check on `@claude`, the
  fork-PR skip, the default-branch `.claude/` swap, and narrow `--allowedTools`.

## Dependencies

- New dependencies: needed (not a one-liner the repo could own), maintained, a sane
  install-script story, licence compatible, and what they pull in transitively.
- Lockfile changes match the manifest change; `resolved` URLs stay on the public
  registry. Dependabot PRs get the `dependency-review` plugin's full vetting instead.
