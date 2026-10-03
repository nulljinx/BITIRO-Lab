# 10 - Pre-pilot security hardening

Scope: repository, migrations, tests and a local build. Nothing was applied to Supabase production. Reuses 03/04/08/09.
Legend: CONFIRMED = reproduced here; RISK = plausible, not exercised; REC = recommendation.

## Findings by severity

| # | Sev | Type | Finding | Migration | Frontend/backend | Regression risk |
|---|---|---|---|---|---|---|
| H1 | Medium (High for a pilot with students) | CONFIRMED | SEC-1: all S01-S05 mentor solutions ship in `dist/assets/CodeEditor-*.js` | Yes (proposal, section 5) | Yes | Medium |
| H2 | Low | CONFIRMED (drift) | `public.rls_auto_enable()` executable by PUBLIC/anon/authenticated/service_role; not in any migration | Yes, **done** | No | Very low |
| H3 | Low | CONFIRMED | `authenticated` has EXECUTE on `private.can_access_cohort`, which nothing needs directly | Yes, **done** | No | Very low |
| H4 | Low | RISK/config | Leaked-password protection disabled (Dashboard setting) | No | No | None |
| H5 | Info | CONFIRMED | 8 tables RLS-on / no policy: intentional RPC-only deny-all | No | No | - |
| H6 | Info | CONFIRMED | ~19 SECURITY DEFINER RPCs executable by `authenticated`: all intentional with internal authorization | No | No | - |

No Critical finding. No secrets found.

## 1. rls_auto_enable (done in repo)

Evidence: `docs/audit/04-live-security.md` L2/V3 (live ACL, `search_path=pg_catalog`, event trigger `ensure_rls`); no BITIRO migration creates it.
Explotability: RISK, low. It returns `event_trigger`, which PostgreSQL refuses to call as a normal function, so the RPC cannot do work; the grant is exposure/noise (Advisor 0028/0029).
Decision: `revoke all ... from public, anon, authenticated, service_role`, guarded by `to_regprocedure` so local DBs without the function still migrate.
`service_role` can be revoked too: PostgreSQL does not check EXECUTE when an event trigger fires (only when a superuser creates it). This is proven in the test with a non-superuser role lacking EXECUTE creating a table and getting RLS. Event trigger and function body untouched; owner keeps implicit rights.
Migration: `supabase/migrations/20261003120000_harden_function_execute_grants.sql`.

## 2. SECURITY DEFINER classification (public)

All are `SECURITY DEFINER`, owner `postgres`, `search_path=''`, `revoke ... from public, anon`, `grant execute ... to authenticated` (migrations; the catalog matrix test now enforces it). Basis: migration SQL (grep of every auth check), 03 section 7, 04 V2/V3 and the existing 120+ role tests; function bodies of the staff-allowlist pair were read in full.

| Class | Function | Auth check (before any read/write) | Per-object authorization | Inputs | Decision |
|---|---|---|---|---|---|
| A | update_my_profile | auth.uid() | own row only | name length/format | keep |
| A | list_my_workspaces | auth.uid() | caller's memberships | none | keep |
| A | redeem_workspace_code / redeem_participant_code | auth.uid(); throttle 10/15 min | code row names cohort; participant role only (staff codes no longer honoured) | code text | keep |
| A | list_workspace_sessions | auth.uid() + `can_access_cohort` | caller's cohort; participants see released only | cohort id | keep |
| A | get_my_cohort_learning / save_my_cohort_code / mark_my_cohort_activity / submit_my_formative_mission | auth.uid() + `can_open_learning` (access AND released or manager) | own rows | version range, 32 KiB, evidence shape | keep |
| A | claim_staff_access | auth.uid(); no arguments | VERIFIED email must match `private.staff_allowlist`; grants `mentor` for the listed cohort only; never lifts suspension | none | keep |
| B | admin_update_membership | `private.is_admin()` | global | role/site validated, last-admin guard, audited | keep |
| B | admin_set_staff_allowlist | `auth.uid()` + `private.is_platform_admin()` | global | email regex/length, cohort must exist, audited | keep |
| B | mentor_workspace_overview, mentor_get/create/revoke_participant_invite, mentor_list_participants, mentor_cohort_learning, mentor_set_session_release | `auth.uid() is not null` AND `private.can_manage_cohort(p_cohort_id)` | cohort id supplied by caller, so IDOR is closed by the helper | ranges/ids | keep |
| C | (none in public) | | | | helpers live in `private` |
| D | (none) | no anonymous RPC exists | | | - |

`public.list_visible_members` is SECURITY INVOKER (RLS bounds it). Not changed: nothing is revoked just to silence the Advisor.
Residual REC (not changed): `mentor_get_participant_invite` returns the plaintext code and is not audited; failed redemptions are throttled but not logged (03).

## 3. private helpers (least privilege)

`authenticated` has USAGE on schema `private`; `anon` has none. RLS policy functions run as the caller, so a helper used in a policy needs EXECUTE; SECURITY DEFINER callers run as owner and do not.

| Helper | Used by policy? | authenticated EXECUTE | Decision |
|---|---|---|---|
| can_read_user | profiles/memberships/progress/code read policies | needed | keep |
| is_admin | `membership_audit` policy | needed | keep |
| is_platform_admin | `institution_audit_events` policy | needed | keep |
| can_manage_cohort | `institution_audit_events` policy | needed | keep |
| can_access_cohort | no (only inside DEFINER functions) | not needed | **revoked** |
| can_open_learning, redeem_code_impl, new_workspace_participant_code | no | already revoked | keep |
| create_account, audit_membership, touch_learning_record | triggers | PUBLIC revoked | keep |

Kept helpers only answer about the caller's own permissions (`can_read_user(x)` leaks at most "can I read x"); REC low priority, would need policy rewrites.
Test: only `can_manage_cohort, can_read_user, is_admin, is_platform_admin` may be authenticated-executable in `private`.

## 4. RLS enabled without policies: INTENTIONAL

`private.staff_allowlist`, `public.cohort_code_documents`, `cohort_learning_progress`, `cohort_memberships`, `cohorts`, `content_releases`, `organization_memberships`, `programs`: migrations `revoke all ... from anon, authenticated` (and `public` for the cohort-learning pair); the frontend only calls RPCs (`src` uses `.from()` for `sites`, `profiles`, `memberships` only). Access goes through authorized SECURITY DEFINER RPCs. Test now asserts RLS on, zero policies, no anon/authenticated privileges. Adding policies would widen the surface; the INFO lint should be accepted/documented. REC (optional): an explicit `using (false)` policy would silence the lint but changes nothing functionally; not done.

## 5. SEC-1 mentor solutions: CONFIRMED exposed (proposal only, no implementation)

Evidence (this build): `pnpm build`; the markers "Solución de referencia · S01..S05" and "Solución de referencia para mentor" each occur once in `dist/assets/CodeEditor-Drm0f1fn.js` (2.3 MB, lazy chunk imported by `src/features/simulator/Simulator.tsx` L5, statically importing `src/content/mentor-solutions.ts` via `CodeEditor.tsx`). The chunk is fetched for anyone who opens a simulator session (guest, `/intermedio/:id`, participant): the panel is gated only by the client flag `mentorMode` (`CodeEditor.tsx` L45). Source maps: none emitted (0 `.map` files), which does not matter because the code is in the minified JS in plain text. Static asset, no auth on the host by construction; not tested against the live host. Lazy loading is not authorization.
Exploitability: real. Any student can read all five solutions from DevTools > Network/Sources or `curl`. Pedagogical integrity of the pilot, not a data breach.

Proposed fix (needs approval): migration + small frontend change.
1. `private.mentor_solutions(session_id text pk, version int, title text, note text, source text)`, RLS on, no grants, seeded by the migration (solution text then lives in SQL; if the repo is public, the repo itself still discloses it: decide whether the repo is private).
2. `public.mentor_get_solution(p_cohort_id text, p_session_id text)`: SECURITY DEFINER, `search_path=''`, `auth.uid()` not null else 42501, `private.can_manage_cohort(p_cohort_id)` else 42501 (a cohort is required, since `can_manage_cohort` is per cohort; `session_id` alone cannot authorize a mentor), session must be in that cohort's `content_releases`, returns only `{title,note,source}`; `revoke ... from public, anon`, `grant ... to authenticated`. Participant: 42501 (PostgREST 403); anon: 42501/401. Optional audit event `solution_viewed` (cheap, the table exists).
3. Frontend: remove the static import; mentor panel calls the RPC on demand. Move the solutions used by `mentor-solutions.test.ts`/mission tests to a test-only fixture directory that is not reachable from `src/main`.
4. Gates: DB tests (participant/other-cohort mentor/anon denied; mentor allowed; admin allowed) and a CI step `grep -rl "Solución de referencia" dist` must return nothing.
Regression risk: medium (tests currently import the file; mentor UX needs loading/error states).

## 6. Leaked password protection (no code change)

State: disabled (Security Advisor). Dashboard: Authentication > Sign In / Providers (Auth settings) > Email provider > Password strength / "Prevent use of leaked passwords", save. Plan: Supabase documents this as available on the Pro plan and above; current plan not verified here (REC: confirm in Billing). Impact: signups and password changes that match HaveIBeenPwned are rejected, with a client-visible error; existing users unaffected until they change their password. The UI should show the Auth error message clearly (verify with the signup flow after enabling). Not settable via SQL.

## 7. Secrets and frontend: no findings

- Tracked env files: only `.env.example` (placeholder, comment forbids service keys); `.env`, `.env.*` ignored.
- `git grep` (repo, excluding lockfile) for service_role values, `sb_secret_`, JWT-shaped tokens, private keys, GitHub/AWS/`sk-` tokens: no matches. The only password literal is a test fixture.
- `dist/`: no JWT-shaped strings, no private keys. The bundle contains the Supabase publishable key (`sb_publishable_...`): public by design, NOT a finding. The literal `sb_secret_` appears once, as a prefix check inside supabase-js (`startsWith("sb_secret_")`), not a key; `service_role` does not appear.
- Source maps: none. Logs: no `*.log` tracked. Git history of `.env.example` shows only the placeholder file.
- `supabase/seed.demo.sql` contains known demo access codes and is labelled never-for-production; `seed.sql` creates none (tested).

## 8. Abuse tests (`supabase/tests/rls.test.mjs`)

Added (229 checks total, 100% pass; negative control: removing the migration fails the rls_auto_enable check): catalog EXECUTE matrix for `public`/`private`; rls_auto_enable behaviour (grants, SECURITY DEFINER, search_path, event trigger enabled, real RLS auto-enable by a role without EXECUTE); anon denied on admin/mentor/learning/profile RPCs and private helpers; participant denied on every mentor RPC in own and foreign cohort, on direct `content_releases` writes and on admin RPCs; mentor of A denied on every mentor RPC for B, not platform admin, cannot administer memberships, still manages A; admin allowed (cohort B management, allowlist). "Participant cannot obtain mentor solution" is not testable until SEC-1 is implemented.
Limits: PGlite with hand-made roles. It does not cover hosted default privileges, PostgREST schema exposure or the Auth hook (04 section 5 still applies).

## Expected Advisor change after applying the migration (manual, with authorization)

- `anon_security_definer_function_executable` and `authenticated_security_definer_function_executable` for `rls_auto_enable`: gone (2 fewer warnings, ~20 to ~19 authenticated-definer warnings, all intentional).
- `rls_enabled_no_policy` (8 INFO): unchanged (accepted).
- Leaked password protection: unchanged until enabled in the Dashboard.
- `private.can_access_cohort`: not an Advisor item (schema not exposed); verify after apply with the 04 V2 query.
