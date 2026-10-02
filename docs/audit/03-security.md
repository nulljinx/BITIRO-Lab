# 03 - Static security audit

Baseline: `ffa32b4` (branch `audit/claude-bitiro`). Scope: STATIC review of the repository only.
Method: `.ai-context/security.xml` was used to locate files; every finding below was verified against the
original source (line numbers refer to the original files, not the packed file). No tests were run, no live
Supabase project was contacted, no `.env*` file was read, no code was changed.

Classification: CONFIRMED (evidence in the repository), RISK (plausible, depends on facts not visible
statically), RECOMMENDATION (hardening, no defect shown).

IMPORTANT LIMITATION: nothing in this report proves that the deployed Supabase project has the same tables,
policies, grants, functions or Auth settings as `supabase/migrations/`. Items needing live verification are
marked `[LIVE]` and collected in section 8.

## 1. Executive summary

BITIRO's authorization design is sound for a pilot. The institutional surface is RPC-only: all cohort tables
have RLS enabled and every grant to `anon`/`authenticated` revoked; every `SECURITY DEFINER` function pins
`search_path=''`, re-derives the caller from `auth.uid()`, and has an explicit `revoke ... from public,anon`
plus a grant to `authenticated`. Roles come only from database tables (never from JWT claims or signup
metadata). Access-code redemption is generic-error, per-user throttled with the budget persisted, row-locked
against races, and audited. The browser never decides authorization; route guards are UX only and the code
says so.

No critical or high finding was confirmed. Confirmed findings: 1 medium, 4 low. The medium finding is not a
data breach: the mentor reference solutions for S01-S05 ship in the public JavaScript bundle and are gated
only by a client flag, which contradicts the product rule that students should not be handed the answer.
The remaining items are hygiene (forgeable "completed" status already documented as formative, unbounded
per-user storage via `activity_version`, a legacy table surface outside the RPC-only model, CSP looseness).

The untrusted-code runtime is well contained: a non-JavaScript interpreter with Map-based environments, no
dynamic property access, explicit source/token/AST/variable/call/instruction limits, and execution inside a
Web Worker. Residual runtime risks are about CPU cost per tick and worker stall detection, not escape.

Counts: CONFIRMED 5 (0 critical, 0 high, 1 medium, 4 low), RISK 7, RECOMMENDATION 8.

## 2. Threat model and trust boundaries

Attacker-controlled: browser input, participant/student input, route params, `localStorage`/`sessionStorage`,
RPC parameters, worker messages from a tampered client, browser-generated mission evidence, student source
code. The Supabase publishable key is public by design.

Boundaries (what actually enforces each):

| Boundary | Enforcer | Evidence |
|---|---|---|
| Anonymous vs authenticated | RLS + `revoke` from `anon` + `auth.uid()` checks in every RPC | migrations 0001-0006 |
| Participant vs mentor (per cohort) | `private.can_manage_cohort` inside each `mentor_*` RPC | `202609180002...sql` L75-90 |
| Cohort vs cohort / org vs org | `can_access_cohort`, composite FKs (program/site same organization) | `...0002...sql` L16-29, L58-73 |
| Participant vs platform admin | `memberships.role='admin'`, `admin_update_membership` | `...0001...sql` L57-60, L158-175 |
| Released vs unreleased session | `private.can_open_learning` (release row or manager) | `202609190001...sql` L31-41 |
| Student code vs mentor | no RPC returns participant source to anyone but the owner | `mentor_cohort_learning` L115-133 |
| Student code vs host page | Web Worker + custom interpreter | section 6 |
| Client evidence vs trusted result | not enforced; evidence is forgeable by design | C2 |

Client-only checks that are UX, not security (correctly treated as such): `StaffGate` and `MentorRoute`
(`src/app/App.tsx` L45-50, L77-85), `InstitutionSessionRoute` release check (L86-104),
`workspace.can_manage` guards in `workspace-service.ts`, `mentorMode` in `CodeEditor`.

## 3. Security controls to preserve

Do not remove or weaken these during refactors.

Database
- P1. Roles never come from `raw_user_meta_data` or JWT; `private.create_account` always inserts a
  `participant` (`...0001...sql` L116-134; later replaced with site-less variant `...0001...` workspaces L73-84).
- P2. All `SECURITY DEFINER` functions use `set search_path=''` with schema-qualified references (every
  migration). Preserve this on any `create or replace`.
- P3. Every public RPC: `revoke all ... from public,anon` then `grant ... to authenticated`; internal
  `private.*` helpers that are not needed by RLS are revoked from `authenticated`
  (`can_open_learning`, `new_workspace_participant_code`).
- P4. Cohort learning tables: RLS on, all browser grants revoked (`...190001...sql` L26-28). Direct access is
  denied even to the owner; the test asserts this (`rls.test.mjs` L88-89).
- P5. Effective-access model: membership AND active org AND active cohort AND active program AND active
  site (`...0002...sql` L58-73). Administrative suspension is not lifted by a shared code (L206-217).
- P6. CAS writes: `save_my_cohort_code` uses `revision = expected`, server-incremented, 32 KiB
  `octet_length` limit in both CHECK and function (`...190001...sql` L10, L72-86).
- P7. Source never reaches mentors: `mentor_cohort_learning` returns user_id/session/status/time only;
  `mentor_list_participants` returns display name and join date only (no email).
- P8. Access-code redemption: generic `unavailable` result for every failure path, per-user advisory row
  lock via `workspace_rate_limits` upsert, 10 attempts / 15 min persisted (outcome flips to `success`),
  `FOR UPDATE` on the code row (race-safe `max_uses`), audit event on success (`...0002...sql` L132-268).
  Note the original version rolled back its own attempt rows on failure; the hardening migration fixed that
  by returning instead of raising. Keep it that way.
- P9. Generated invite codes: 48 random bits (first 12 hex chars of `gen_random_uuid()`), unique check,
  one active participant code per cohort, max 200 uses and 60 days, advisory lock, audit events
  (`...180004...sql` L5-97).
- P10. Last-admin protection and advisory lock; `membership_audit` append-only for browser roles.
- P11. `institution_audit_events`: select-only grant, policy limited to platform admin or cohort managers.
- P12. Progress monotonicity: `mark_my_cohort_activity` cannot accept `completed`; `completed` only through
  `submit_my_formative_mission`; `attempted`/`completed` are never downgraded.

Application
- P13. `safeNext` allowlist (`src/features/auth/auth-navigation.ts`): rejects `//`, backslashes and anything
  not matching an explicit route pattern. Navigation uses `react-router` `navigate`, never `location.href`.
- P14. PKCE flow, `detectSessionInUrl`, only public keys accepted in the bundle (`src/lib/supabase.ts`
  L6-12 rejects a `service_role` JWT), https-only URL except localhost, 15 s request timeout.
- P15. Generic auth error messages (no account enumeration on sign-in, sign-up, reset), 12-128 char passwords,
  email confirmation required (`config.toml` L25-29).
- P16. Storage isolation: institutional scopes never import guest/legacy data; tree remount on user change
  (`App.tsx` L22-27); localStorage reads are validated (`storage.ts` L15-20, calibration L20).
- P17. Mentor UI labels `completed` as "superadas en simulador (autoevaluación)" (`WorkspacePages.tsx` L252).
- P18. No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write`, `window.open` or
  `postMessage` to other windows in `src` (grep). External links carry `rel="noreferrer"`.
- P19. Strict CSP baseline: `script-src 'self'`, `object-src 'none'`, `base-uri 'none'`,
  `frame-ancestors 'none'`, plus `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
  (`netlify.toml` L18-27).
- P20. Production seed contains no access codes; demo codes live in a separate file marked
  "never run in production" and the test asserts the production seed is code-free
  (`seed.demo.sql` L1-2, `rls.test.mjs` L25-26, `config.toml` L14-16).
- P21. Runtime controls listed in section 6.

## 4. Confirmed findings

### C1 - Mentor reference solutions are shipped to every client (MEDIUM)
Affected: `src/content/mentor-solutions.ts` (S01-S05 full solutions, L7-666),
`src/features/code-editor/CodeEditor.tsx` L13 and L35, `src/app/App.tsx` L34.

Trust boundary crossed: client-side role flag -> content confidentiality. `mentorMode` is derived from
`workspace.can_manage` (UX), but the module is a static import, so the solution text is part of the public
Simulator/CodeEditor JavaScript chunk served to anyone, authenticated or not.

Scenario: a participant opens DevTools or downloads the chunk from `/assets/` and reads the S01-S05 solutions
as plain template strings. No server check is involved because none exists for this content.

Impact: defeats the product rule that the system must not hand the student the answer (`PRODUCT.md`), and
the "release by mentor" model for any content that ships in the bundle. No student data is exposed.

Direction: serve solutions through an authenticated RPC or protected endpoint that checks
`can_manage_cohort`. A client-side role check or a lazy-loaded public JavaScript chunk is not an authorization
boundary because static assets remain downloadable by participants.
Treat `starterCode` and guide hints for unreleased sessions as public too (R6).

### C2 - Server accepts browser-generated evidence as `completed` (LOW)
Affected: `submit_my_formative_mission` (`202609190002_formative_missions.sql` L16-44), column
`cohort_learning_progress.status`, `mentor_cohort_learning`.

Evidence: the function validates only shape: `kind='formative_client_simulation'`, `status='completed'`,
matching `sessionId`, an array of exactly four objects each with `passed=true`, size <= 8192 bytes. A
participant can call the RPC directly (`rpc('submit_my_formative_mission')`) for any released S01/S02 without
running a simulation; the integration test itself submits a hand-written object (`rls.test.mjs` L113-115).
`mentor_cohort_learning` returns the value as the same `status` enum as `attempted`.

Impact: a forged `completed` row is indistinguishable from a genuine one in the mentor RPC. This is
documented in the migration header and column comment, the client labels it formative and the mentor UI says
"autoevaluación" (P17), so the integrity risk is limited as long as no one treats it as assessment.
Also: the older comment in `202609190001_cohort_learning.sql` L24 ("No client-writable completed or verified
state") is now false and misleading.

Direction: rename the status (for example `self_reported_complete`) or return a `evidence_kind` field from the
mentor RPC; fix the stale comment; never use this value for certificates, grades or ranking. Server-side
reproduction of untrusted code is out of scope for now. Note that the server accepts only `s01`/`s02`
(L24) while the client attempts S03-S05; unsupported sessions fail with an error (functional gap, not a leak).

### C3 - Per-user storage growth is unbounded through client-chosen `activity_version` (LOW)
Affected: `cohort_code_documents`, `save_my_cohort_code`, `can_open_learning`
(`202609190001_cohort_learning.sql` L9, L31-41, L65-89).

Evidence: the version is a client parameter accepted in 1..1000 and is part of the primary key; each row may
hold 32 KiB. A cohort member can create up to 8 sessions x 1000 versions x 32 KiB (~250 MiB) per cohort. No
per-user quota or save-rate limit exists. The client hard-codes version 1 (`App.tsx` L32), which does not
bind the server.

Impact: storage/cost abuse by an authenticated cohort member (requires a valid access code). Not a
confidentiality or integrity issue.

Direction: restrict `p_version` to the versions the server publishes (a content table or allowlist), or
cap rows per user/cohort; add a modest write-rate guard.

### C4 - Legacy per-user tables keep a direct-write/facilitator-read surface outside the RPC-only model (LOW)
Affected: `public.code_documents`, `public.program_progress`, `private.can_read_user`, policies
`code_read`, `progress_read` (`202609170001_accounts_and_learning.sql` L61-71, L87-100).

Evidence: `authenticated` has select/insert/update/delete on both tables (L87). Reads use
`can_read_user`, which lets a platform admin read every row and a legacy `facilitator` read all rows of users
sharing the same non-null `site_id`. A grep of `src` finds no client usage of either table, so they are dead
for the current product.

Impact: if any legacy-site facilitator or admin accounts exist, they can read participant source in these
tables through the REST API, which contradicts the later design principle that mentors never read student
code. `program_progress` also lets a user self-write `completed` (documented as self-reported, L39).
Exploitability depends on legacy data `[LIVE]`.

Direction: revoke direct grants and drop or archive the tables once data is migrated; remove the
`facilitator` source-read path from `can_read_user` or confirm it is intended.

### C5 - Deployment CSP and header gaps (LOW)
Affected: `netlify.toml` L21, L26.

Evidence: `style-src 'self' 'unsafe-inline'`; `connect-src https://*.supabase.co wss://*.supabase.co`
allows requests to any Supabase project, not only BITIRO's; `Strict-Transport-Security` has no
`includeSubDomains`/`preload`; no `Cross-Origin-Opener-Policy`; no `Cross-Origin-Resource-Policy`.

Impact: `script-src 'self'` still blocks injected scripts, so the practical effect is limited to CSS
injection and data exfiltration to an attacker-owned `*.supabase.co` project if script execution were ever
obtained. Defense in depth only.

Direction: pin `connect-src` to the project host once known, replace inline styles where Monaco permits
(nonce/hash), extend HSTS, add COOP. Verify the live response headers `[LIVE]`.

## 5. Risks requiring verification

R1 `[LIVE]` Private-schema tables have no explicit revoke and no RLS. `private.workspace_access_codes`
(plaintext codes) and `private.workspace_code_attempts` are created without `revoke` or `enable row level
security` (`202609180001...sql` L53-68); only `workspace_rate_limits` is explicitly revoked
(`...0002...sql` L36). `authenticated` has `USAGE` on schema `private` (`...0001...sql` L6). Safety rests on
(a) Postgres creating tables with no grants outside `public` and (b) the API exposing only
`public, graphql_public` (`config.toml` L6). Neither is verifiable here. If either assumption is wrong in the
live project, every access code is readable. Verify `has_table_privilege` for `anon/authenticated` on all
`private.*` tables and the hosted "Exposed schemas" setting.

R2 `[LIVE]` Default function privileges. Supabase grants EXECUTE on new `public` functions to
`anon`/`authenticated` by default. Each function here revokes from `public,anon`, which is correct, but a
future function that forgets the revoke is callable anonymously. Verify with
`has_function_privilege('anon', ...)` for every `public.*` function; add a CI query to enforce it.

R3 `[LIVE]` Access-code brute force across accounts. Throttling is per `auth.uid()` (10 / 15 min).
Signup is open with email confirmation but `config.toml` has no CAPTCHA and the hosted rate limits are not
visible. Generated codes have 48 bits so enumeration is infeasible. Codes inserted by hand (the schema only
requires 8-64 chars) may be weak, and a mentor code grants mentor in the cohort. Verify live mentor/legacy
codes for entropy, `max_uses`, `expires_at`, and Auth rate-limit/CAPTCHA settings.

R4 `[LIVE]` Auth configuration. Repository config has a localhost `site_url` and a redirect allowlist
including `https://nulljinx.com/auth/callback` (`config.toml` L20-21). Verify the hosted Site URL, redirect
allowlist (no wildcards), `secure_password_change`, email-confirmation enforcement and OTP/recovery expiry.

R5 `[LIVE]` Owner and RLS bypass. SECURITY DEFINER functions rely on the owner role bypassing RLS and
`FORCE ROW LEVEL SECURITY` is never used. This is intended, but confirm the owner of all functions and tables
and that no browser-reachable role is a member of it.

R6 Release is not a confidentiality control for content. Session text, starter code and guide copy for
unreleased sessions are bundled; `InstitutionSessionRoute` only gates the UI and the server gates cloud
code/progress. If unreleased material must stay hidden until published, it needs server delivery.

R7 Shared-device privacy. Student source and calibration remain in `localStorage` under
`bitiro:v7:user:<id>...` after sign-out (`signOut` uses `scope:'local'`, `auth-service.ts` L36; `storage.ts`
L6). On shared school computers the next person with DevTools can read it. Consider clearing scoped keys on
sign-out or documenting the behavior in the privacy page.

## 6. Untrusted-code / runtime assessment

Design: tokenizer -> parser -> `validate` -> generator interpreter -> `IrohRuntimeAdapter` -> engine, all
in a dedicated module Worker (`useSimulation.ts` L38; `simulator.worker.ts`). The language is a small
C-like subset with no property access, no indexing, no strings beyond `const char[]` literals, no
imports and no host callbacks other than the fixed adapter switch.

Controls verified (all in `src/simulator/runtime/`):
- Source size: 32768 bytes (UTF-8) checked in tokenizer (`Tokenizer.ts` L7), `isSupportedSource`
  (`source-size.ts`), local storage (`storage.ts`), cloud save (`cloud-learning.ts` L20) and database (CHECK +
  RPC). Four layers agree.
- Tokens: 16000 (`Tokenizer.ts` L12). String literal length 256 (L32). Numbers checked finite (L27).
  Only one `#include` form is accepted (L23); any other character is rejected (L38).
- Parser depth: `bounded()` limits nesting to 64 (`Parser.ts` L18) and is applied to statements,
  expressions and primaries, so prefix-operator chains and right-associative assignment chains are bounded.
- AST depth: `validate` re-checks depth iteratively with an explicit stack (`validate.ts` L10), so
  left-deep binary chains from a long `1+1+...` are rejected without native recursion.
- Calls: arity and existence validated before execution; user functions cannot redefine built-ins
  (`validate.ts` L7). `signatureFor` uses `hasOwnProperty`, so names such as `constructor`/`__proto__`
  are not resolved against the prototype (`signatures.ts` L7).
- Environments use `Map`, so identifier names cannot touch `Object.prototype`
  (`Environment.ts` L19). Variable budget is shared across child scopes: 256 (L24). Constants enforced.
- Call depth: 32 (`Interpreter.ts` L20), restored in `finally`.
- Instruction budget: every statement and expression yields an `instruction`; `ProgramRuntime.slice`
  aborts after 8000 per slice with a pedagogical error (`ProgramRuntime.ts` L27-28). `while(1){}` and
  empty `loop()` cannot hang the worker.
- Numeric bounds: `cast` rejects non-finite and values beyond `MAX_SAFE_INTEGER` (`Environment.ts` L13);
  division/modulo by zero rejected (`operators.ts` L6); `pausa` limited to 0-600000 ms (adapter L37);
  `moverServoGolpe`, LCD coordinates and speeds range-checked; speed command whitelisted to .5/1/2
  (`SimulationEngine.ts` L112); motors clamped (L113).
- Error containment: any non-`LanguageError` is mapped to a generic diagnostic (`RuntimeError.ts` L7-10), the
  program is cancelled and motors zeroed.
- Memory: engine event log capped at 256 (`SimulationEngine.ts` L69); `lcd` strings are 16 characters.
- Browser access: the interpreter has no path to `globalThis`, `fetch`, `importScripts`, DOM or storage.
  The adapter only touches `engine`/`robot`. Student source is never rendered as HTML (diagnostics are plain
  text in React). Monaco markers/hover content comes from static project strings.

Residual risks (RISK, no demonstrated defect):
- RT1 CPU cost per tick. The 8000-instruction budget is per slice, and `step()` can run several slices per
  timer tick (`ProgramRuntime.ts` L34). Each `yield*` traverses the active generator chain, whose length is
  bounded by roughly callDepth (32) x AST depth (64). A deliberately deep recursive program could make a slice
  expensive. This is self-inflicted and contained in the worker, but the UI has no running-state watchdog:
  deadlines exist only for worker start and review (`useSimulation.ts` L40, L93). Measure worst case
  (`[DYNAMIC]`) and consider a time budget per slice (`performance.now()`) in addition to the count.
- RT2 Native stack. Deep generator delegation could in principle raise `RangeError` on small stacks. It is
  caught and reported generically, so the effect is an error, not an escape. Verify with the deepest legal
  program `[DYNAMIC]`.
- RT3 Worker command trust. `set-line-thresholds` and `set-s03-layout` pass `command.values/obstacles`
  into the engine without server involvement; `pose` with `NaN` is not rejected (`SimulationEngine.ts` L117-118).
  The sender is the user's own page, so this only affects the user's own simulation; it matters only if a
  future feature shares commands between users. Validate at the worker boundary when convenient.
- RT4 Mission evidence derived from the same worker is forgeable by definition (C2); nothing in the runtime
  should be promoted to trusted evidence.

Verdict: no sandbox escape path found statically. The container is the language design plus the Worker; the
Worker itself runs same-origin code, so a future host-function addition (for example network, storage or
`eval`-like helpers) would break the model and must be security-reviewed.

## 7. Supabase / RLS assessment

Separation requested by the audit definition:

1. SQL definitions. 6 migrations define the schema. Tables with RLS enabled: organizations, sites,
   profiles, memberships, program_progress, code_documents, membership_audit, programs, cohorts,
   organization_memberships, cohort_memberships, content_releases, institution_audit_events,
   cohort_code_documents, cohort_learning_progress. NOT RLS-enabled: `private.workspace_access_codes`,
   `private.workspace_code_attempts`, `private.workspace_rate_limits` (R1).
2. Grants. Browser roles: `anon` select on `organizations`, `sites` only. `authenticated`: select on
   profiles/memberships/membership_audit/institution_audit_events (RLS-filtered), CRUD on the two legacy
   tables (C4). All institutional and cohort-learning tables: no grants. All public RPCs: execute for
   `authenticated` only (explicit `revoke ... from public,anon`).
3. RLS. Policies are read-only except legacy own-row write policies with `user_id = auth.uid()` in both
   `USING` and `WITH CHECK` (no ownership-forgery path; tested `rls.test.mjs` L60-61, L68).
4. Application assumptions. Client trusts `list_my_workspaces().can_manage` for button visibility only.
   Every mentor operation re-checks `can_manage_cohort` server-side.

Function-by-function authorization check (definition-level; execute grants verified in the SQL):
- `update_my_profile`, `list_my_workspaces`, `redeem_workspace_code`, `get_my_cohort_learning`,
  `save_my_cohort_code`, `mark_my_cohort_activity`, `submit_my_formative_mission`: scoped to `auth.uid()`;
  cohort-bound ones go through `can_open_learning` (access AND released-or-manager).
- `list_workspace_sessions`: requires `can_access_cohort`.
- `mentor_set_session_release`, `mentor_workspace_overview`, `mentor_get/create/revoke_participant_invite`,
  `mentor_list_participants`, `mentor_cohort_learning`: require `can_manage_cohort` and a non-null
  `auth.uid()`; invoked with the cohort id supplied by the caller, so IDOR is closed by the helper, not by
  UI (tested: mentor of A cannot manage B, `rls.test.mjs` L200).
- `admin_update_membership`: `is_admin()` after taking the advisory lock; role and site validated;
  last-admin guard. `list_visible_members`: `SECURITY INVOKER`, so RLS bounds visibility; `p_limit`/`p_offset`
  clamped; search is a `position()` literal match (no SQL injection).
- `mentor_revoke_participant_invite` revokes only `role='participant'` codes; mentor codes can only be
  created from the database console (no RPC). That is intentional and safer.

Observations (RECOMMENDATION): no RPC removes or suspends a participant (suspension is by direct SQL on
`active`); the mentor role code path elevates an existing participant (`...0002...sql` L228-232), noted in a
comment as "issue individually/ephemerally"; `mentor_get_participant_invite` returns the plaintext code and is
not audited; failed redemptions are throttled but not recorded as audit events; access codes are stored in
plaintext, which is compatible with the "mentor can recover the code" feature but means a database read leak
exposes live codes (hash plus display-once would be stronger, at product cost).

Test evidence (`supabase/tests/rls.test.mjs`): useful for the logic above (cross-cohort denial, release gating,
CAS, suspension, throttle persistence, mentor cannot read source), but it runs on PGlite with hand-made
`anon`/`authenticated` roles (L10-16). It therefore does NOT cover Supabase default privileges, PostgREST
exposure, the `private` schema reachability, Auth hooks, or hosted rate limits. A passing test is not proof.

## 8. Deployment checks still required

All `[LIVE]` items. None can be answered from the repository.
1. Applied migrations equal the six repository files; no hand-edited functions or policies (compare
   `pg_policies`, `pg_proc` definitions and `proacl`, `relacl`).
2. `has_table_privilege` and `has_function_privilege` for `anon` and `authenticated` on every table in
   `public` and `private` and every function (R1, R2).
3. API "Exposed schemas" does not include `private`; `graphql_public` surface is intended.
4. Owner/role membership of `SECURITY DEFINER` functions; `FORCE RLS` is not required (R5).
5. Auth settings: Site URL, redirect allowlist, email confirmation, secure password change, recovery
   expiry, password policy (>=12), CAPTCHA or rate limits for signup, sign-in and recovery (R3, R4).
6. Content of `private.workspace_access_codes` in production: no demo codes (`MUSTAKIS-*-DEMO`), no code with
   low entropy, mentor codes minimal `max_uses` and short expiry; `seed.demo.sql` was never applied.
7. Existing rows in `memberships` with role `admin`/`facilitator`, and legacy `code_documents`/
   `program_progress` rows (C4). Number of `admin` accounts and their MFA.
8. Live HTTP response headers match `netlify.toml` (CSP, HSTS, framing); no source maps exposed;
   `/assets/*` caching and the SPA fallback behave as configured (C5).
9. Confirm the browser bundle contains only the publishable/anon key (no service key) and no mentor-only
   material beyond C1.
10. Backups and PITR for the project; audit-table retention; log access.

Not found in the repository (nothing to review): Edge Functions, database webhooks, Auth hooks, Storage
buckets, `pg_cron` jobs. Confirm none exist live.

## 9. Recommended remediation order

Order is by risk reduction per unit of effort. All items are proposals; no change was made.
1. R1/R2/C4 (verification first, then SQL): confirm live privileges, then add a migration that revokes all
   on `private.*` tables from `public, anon, authenticated`, enables RLS on them, drops direct grants on
   legacy tables, and sets default privileges so new objects start closed. Add a DB test that connects
   with default-privilege roles or queries `information_schema` to forbid anon-executable functions.
2. C1: move mentor solutions behind an RPC or mentor-only fetch; remove the static import from the shared
   chunk. Decide the policy for unreleased content (R6).
3. C3: bound `activity_version` and per-user document count.
4. C2: rename or annotate the formative status in the mentor RPC; correct the stale comment; keep the
   "never certified" rule in UI copy.
5. R3/R4: enable CAPTCHA or equivalent signup friction, review hosted rate limits, and review live codes.
6. C5: tighten `connect-src`, HSTS and add COOP after testing Monaco.
7. Operational: add RPCs for suspending/removing participants and for revoking mentor codes; audit failed
   redemptions and invite views; consider hashed codes if mentor recovery is not required.
8. RT1: add a time-based budget per slice and a running-state watchdog (worker liveness ping); validate
   worker command payloads.
9. R7: clear scoped local keys on sign-out or document it.
10. Supply chain: CI (`.github/workflows/ci.yml`) has no dependency vulnerability scan or secret scan and
    the lockfile is the only pin; add `pnpm audit` (non-blocking at first) and a secret-scanning step.

## 10. Deferred dynamic testing

Not performed (static audit; tests not run per instructions). Suggested later, against a disposable
Supabase project, never production:
- PostgREST-level checks with the anon and authenticated keys: enumerate every table, view and RPC; try
  direct selects on all `private.*`, cohort and legacy tables; confirm 401/403/empty for each.
- Role-matrix test with real JWTs: participant, mentor A, mentor B, org_admin, platform admin, suspended user,
  anonymous, across two organizations. Include direct RPC calls with foreign cohort ids and null/odd
  parameters (`p_version` null, huge, negative; empty and 64-character codes).
- Access-code concurrency: parallel redemptions of the last use; parallel redemptions by one user; code
  expiry at the boundary; revocation during redemption; many accounts guessing short codes.
- Save race: two tabs with the same expected revision; very large payloads at 32768 bytes of multi-byte
  characters; `activity_version` growth (C3).
- Runtime fuzzing and benchmarks: deepest legal AST x call depth, 16000-token programs, 8000-instruction
  slices at speed 2x, memory profile over long runs, worker stall and recovery (RT1, RT2). A grammar fuzzer
  is cheap given the closed language.
- Browser security: CSP report-only run through all routes including Monaco workers; header scan on the
  deployed site; open-redirect probes against `next` with encoded, mixed-case and unicode variants;
  verify `?debug=1` has no data effect.
- Auth flows: PKCE callback replay, recovery link reuse and expiry, sign-up with hostile `display_name`
  metadata (including extra keys such as `role`) against the live trigger.
- Bundle inspection of the production build for mentor solutions, source maps and any key material (C1).
