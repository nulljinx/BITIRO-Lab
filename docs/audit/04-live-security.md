# 04 - Live security verification

Date: 2026-10-02. Baseline repo: branch `audit/claude-bitiro`. Input: the `[LIVE]` items of
`docs/audit/03-security.md` (R1-R5, C4, section 8). This is NOT a new audit; the static findings are not
repeated.

Classification: CONFIRMED (observed live), RISK (plausible, not shown), RECOMMENDATION (hardening).

## 1. Scope and MCP restrictions

- Tooling: Supabase MCP, project-scoped, read-only. Used: `execute_sql` (SELECT on catalogs and aggregate
  counts only), `list_migrations`, `get_advisors(security)`. Not used: `list_tables` (redundant with catalogs),
  logs, any DDL, any RPC of the application, any Auth change.
- Not read or shown: access-code strings, emails, display names, student source, tokens, keys. Code rows were
  read only as `role / expired / max_uses / length / ttl`.
- Important caveat on the evidence: the MCP session runs as a privileged database role (it can read
  `private.*`). Therefore "can the browser read X" is answered from privilege functions
  (`has_table_privilege`, `has_function_privilege`, `has_schema_privilege` for `anon` and `authenticated`),
  ACLs and policies, NOT from an actual anon/authenticated HTTP request. Real PostgREST behavior is a dynamic
  check (section 6).
- The MCP does not expose the Auth configuration or the API "Exposed schemas" setting. Those are marked
  NOT VERIFIED where relevant; nothing was inferred from silence.
- Data observed is small: 2 auth users, 2 memberships (both `participant`), 3 access codes, 4 recorded
  code attempts, 0 storage buckets. The project looks like a pre-pilot or early-pilot instance.

## 2. Verification matrix V1-V7

| Id | Topic | Result | Closes static risk |
|---|---|---|---|
| V1 | `private.*` privileges | CONFIRMED SAFE | R1 closed at privilege level |
| V2 | Function EXECUTE grants | CONFIRMED ISSUE (low) | R2 partly closed; new item L2 |
| V3 | SECURITY DEFINER ownership | CONFIRMED SAFE | R5 closed |
| V4 | Applied database shape | CONFIRMED ISSUE (drift) | Section 8 item 1 answered: drift exists |
| V5 | Legacy surface | CONFIRMED SAFE (data state) | C4 data exposure ruled out; structure remains |
| V6 | Access-code hygiene | PARTIALLY VERIFIED | R3 partly |
| V7 | Auth/project settings | PARTIALLY VERIFIED | R4 not closed |

### V1 - Private-schema privileges: CONFIRMED SAFE

Queried: `pg_class` + `has_table_privilege('anon'|'authenticated', oid, 'select,insert,update,delete')` for
every table in `private`; `has_schema_privilege` on `private`, `public`, `graphql`, `graphql_public`; default
ACLs (`pg_default_acl`).

Result:
- `private.workspace_access_codes`, `private.workspace_code_attempts`, `private.workspace_rate_limits`:
  `anon` and `authenticated` have NO select/insert/update/delete. Owner `postgres`. RLS is off on all three
  (as the static audit said). `relacl` is NULL on the first two (owner-only defaults) and
  `{postgres=arwdDxtm/postgres}` on rate limits.
- `anon` has no USAGE on schema `private`; `authenticated` has USAGE but not CREATE (as designed, needed by
  RLS helper functions).
- No `pg_default_acl` entry exists for schema `private`, so future private tables are also created closed.
  Default ACLs in `public` for tables grant `anon`/`authenticated` only `Dxtm` (no select/insert/update/
  delete); for `public` functions only `postgres=X`.
- There are no views or materialized views in `public` or `private`.

Relation to 03: R1 asked for exactly this check. Assumption (a) "Postgres creates tables with no grants
outside `public`" is CONFIRMED. Assumption (b) "API exposes only `public, graphql_public`" is NOT VERIFIED
(the setting is not visible), but it is no longer load-bearing for code confidentiality: even if `private`
were exposed, the browser roles hold no table privilege on it.
Can the static risk be closed? Yes for privileges. RECOMMENDATION unchanged: still enable RLS on `private.*`
and add explicit `revoke` in a migration, so safety does not depend on implicit defaults.

### V2 - Function privileges: CONFIRMED ISSUE (low)

Queried: `pg_proc` + `has_function_privilege` for `anon`, `authenticated`, `public`, plus `proacl`, for all
functions in `public` and `private`.

Browser-reachable `public` functions that match the design (anon = no, authenticated = yes, ACL
`{postgres=X, authenticated=X}`): `admin_update_membership`, `list_my_workspaces`, `list_visible_members`,
`list_workspace_sessions`, `mentor_create_participant_invite`, `mentor_get_participant_invite`,
`mentor_list_participants`, `mentor_revoke_participant_invite`, `mentor_set_session_release`,
`mentor_workspace_overview`, `redeem_workspace_code`, `update_my_profile` (12 functions).

`private` helpers: `can_access_cohort`, `can_manage_cohort`, `can_read_user`, `is_admin`, `is_platform_admin`
are executable by `authenticated` only (needed by RLS/RPCs; anon no). `audit_membership`, `create_account`,
`new_workspace_participant_code`, `touch_learning_record` are executable by nobody except the owner. All match
P3.

CONFIRMED ISSUE: `public.rls_auto_enable()` is executable by `anon`, `authenticated` and `public` (ACL NULL =
default PUBLIC execute). It is SECURITY DEFINER, owner `postgres`, `search_path=pg_catalog`, and is NOT in any
repository migration. It is the function behind the live event trigger `ensure_rls` (`ddl_command_end`), a
Supabase-side auto-enable-RLS helper. Its return type is `event_trigger`, which PostgreSQL does not allow to be
called as a normal function, so the Security Advisor warning (0028/0029, `/rest/v1/rpc/rls_auto_enable`) is very
likely not exploitable. Not invoked here, so exploitability is a RISK, not a confirmed exploit.
The grant does not match the repository design, and its origin is undocumented (drift, see V4).

Relation to 03: R2 verified for all repository functions; no function forgot the revoke. The "future function
forgets the revoke" part is mitigated by the default ACL (`postgres` functions in `public` default to
`postgres=X` only). Recommendation: `revoke execute on function public.rls_auto_enable() from public, anon,
authenticated` (event triggers keep working) and add a CI/DB query asserting no `anon`-executable function.

### V3 - SECURITY DEFINER ownership: CONFIRMED SAFE

Queried: `pg_proc.prosecdef`, `pg_get_userbyid(proowner)`, `proconfig`; `pg_auth_members` for `anon`,
`authenticated`, `postgres`; `pg_roles` attributes.

Result:
- All 20 SECURITY DEFINER functions (11 repository `public`, 8 `private`, plus `rls_auto_enable`) are owned by `postgres`.
  All repository functions have `search_path=""`; `rls_auto_enable` has `search_path=pg_catalog`
  (acceptable, Supabase-managed). `list_visible_members` and `private.touch_learning_record` are SECURITY
  INVOKER with `search_path=""`, as documented.
- `anon` and `authenticated` are members of no other role. The only member of `postgres` is
  `cli_login_postgres` (Supabase CLI tooling, not a browser role). `authenticator` has `inherit=false`.
- `anon`/`authenticated` have `bypassrls=false`, not superuser. `postgres`/`service_role` bypass RLS (hosted
  default). `FORCE RLS` is off everywhere, as 03 expected.

Relation to 03: R5 closed. No ownership change needed.

### V4 - Applied database shape: CONFIRMED ISSUE (drift)

Queried: `list_migrations`, `pg_class.relrowsecurity`, `pg_policies`, `pg_proc`, `pg_trigger`, `pg_extension`,
repository `ls supabase/migrations`.

Result:
- Applied migrations (5): `202609170001 accounts_and_learning`, `202609180001 institution_workspaces`,
  `202609180002 institution_hardening`, `202609180003 mentor_workspace_polish`,
  `202609180004 participant_pilot`. The repository has 7: the live project is MISSING
  `202609190001_cohort_learning` and `202609190002_formative_missions`.
- Consequently these do not exist live: tables `cohort_code_documents`, `cohort_learning_progress`; functions
  `get_my_cohort_learning`, `save_my_cohort_code`, `mark_my_cohort_activity`, `submit_my_formative_mission`,
  `mentor_cohort_learning`, `private.can_open_learning`.
- Everything from the five applied migrations is present. RLS is enabled on all 13 expected `public` tables
  (organizations, sites, profiles, memberships, program_progress, code_documents, membership_audit, programs,
  cohorts, organization_memberships, cohort_memberships, content_releases, institution_audit_events).
  Policies observed: SELECT on organizations/sites/profiles/memberships/audit tables and the legacy own-row
  CRUD policies on `code_documents` and `program_progress`. Five tables (programs, cohorts,
  cohort_memberships, content_releases, organization_memberships) have RLS and no policy, which matches the
  RPC-only design (advisor INFO 0008, not a defect). Grants: `anon` select on organizations/sites only;
  `authenticated` read-only on profiles/memberships/audits, CRUD on the two legacy tables; no browser grant on
  the institutional tables. This matches section 7 of 03.
- Triggers: `on_auth_user_created -> private.create_account`, `membership_change_audit`, the two legacy
  timestamp/revision triggers. Extensions: `pgcrypto`, `supabase_vault` only; no `pg_cron`, no storage
  buckets. Event triggers beyond Supabase defaults: none besides `ensure_rls`.
- Not done: no function body or policy expression diff against the repository (only existence, flags, grants,
  owners). Subtle hand edits to applied functions are therefore NOT VERIFIED. Version-name equality is the only
  integrity evidence for the five applied migrations.

Relation to 03: answers deployment check 1: drift exists. Two secondary notes: (1) 03 says "6 migrations";
the repository contains 7, so the static counts should be corrected. (2) Findings C2, C3, P4, P6, P12 and the
"student code vs mentor" boundary describe objects that are NOT live yet; they remain valid for the next
deployment but are not live exposure today. If the deployed frontend is built from this branch, cloud
learning calls will fail against this database (functional, unverified here).

### V5 - Legacy surface: CONFIRMED SAFE (data state)

Queried (counts only): `count(*)` on `public.code_documents`, `public.program_progress`; `memberships` grouped
by role.

Result: `code_documents` = 0 rows; `program_progress` = 0 rows; `memberships` with `facilitator` = 0; with
`admin` = 0 (total 2, both `participant`; 2 `auth.users`).

Relation to 03: C4's exploitability depended on legacy data `[LIVE]`. Today there is no legacy source code to
read and no facilitator or admin account that could read it, so no data exposure through that path.
The structural surface remains CONFIRMED: `authenticated` still holds select/insert/update/delete on both
tables and `private.can_read_user` still carries the facilitator/admin read path. C4 is therefore downgraded to
latent hygiene (not closed). Because both tables are empty, revoking the grants and dropping them is zero-data
-loss. Informational: with no `admin` membership, `admin_update_membership` is unusable until an admin is
bootstrapped; bootstrap must be done deliberately.

### V6 - Access-code hygiene: PARTIALLY VERIFIED

Queried (no code values returned): count, `role`, `expires_at < now()`, `expires_at is null`, `length(code)`,
`max_uses`, `expires_at - created_at`, `ilike '%demo%'` count.

Result:
- Total 3 codes, all with `active = true`: 2 `mentor`, 1 `participant`.
- Expired (by `expires_at`): 2 (both mentor, `max_uses` 1, 7-day lifetime). The 1 participant code is not
  expired: `max_uses` 40, 14-day lifetime.
- No expiry: 0. Null `max_uses`: 0. Range of `max_uses`: 1-40.
- Length: min 14, max 24; none under 12. Codes containing "demo": 0 (demo seed not applied by that
  pattern).
- Attempt log: 4 rows in `workspace_code_attempts`.

Relation to 03: R3 asked for live code review. Positive: mentor codes are single-use with short life and the
only live one is bounded. Not verifiable without reading values: entropy of the three codes (length alone is
not entropy; the hand-typed mentor codes in particular). Hygiene note: two expired mentor codes still have
`active = true`; if redemption checks `expires_at` (stated in 03, not re-verified here) they are inert, but
cleaning them removes doubt. Hosted Auth rate limits and CAPTCHA (the other half of R3) fall under V7 and were
not visible.

### V7 - Auth/project settings: PARTIALLY VERIFIED

Exposed by the current MCP: only the Security Advisor.
- CONFIRMED ISSUE (low): advisor `auth_leaked_password_protection` WARN - leaked-password protection
  (HaveIBeenPwned) is disabled.
- Site URL: NOT VERIFIED - current MCP feature scope does not expose this setting.
- Redirect allowlist: NOT VERIFIED - current MCP feature scope does not expose this setting.
- Email confirmation enforcement: NOT VERIFIED - current MCP feature scope does not expose this setting.
  (Indirect only: both existing accounts exist; their confirmation state was not queried to avoid reading
  `auth.users` content.)
- Secure password change: NOT VERIFIED - current MCP feature scope does not expose this setting.
- Recovery/OTP expiry: NOT VERIFIED - current MCP feature scope does not expose this setting.
- CAPTCHA / hosted rate limits: NOT VERIFIED - current MCP feature scope does not expose this setting.
- Password minimum length (>=12 in repo config): NOT VERIFIED.
- API "Exposed schemas": NOT VERIFIED (see V1).

Relation to 03: R4 stays open.

## 3. Static risks closed

- R1 (privileges of `private.*` for browser roles): closed. No table privilege for `anon`/`authenticated`;
  `anon` has no schema USAGE. Exposure setting still unseen but not load-bearing.
- R2 (function EXECUTE defaults): closed for all repository functions; new item L2 added for the one
  non-repository function.
- R5 (owner / role membership): closed.
- C4 data exposure: ruled out today (empty tables, no facilitator/admin). Structure stays open.
- Section 8 item 6 (demo codes / seed applied): partially closed (no code matching "demo"; 3 codes only).
- Section 8 item 7 (admin/facilitator counts, legacy rows): closed (0 / 0 / 0 / 0).
- Section 8 "not found in repository, confirm none live" (Edge Functions, cron, Storage, Auth hooks): cron
  extension absent and 0 storage buckets confirmed; Edge Functions and Auth hooks NOT VERIFIED.

## 4. Live issues confirmed

| Id | Severity | Evidence | Direction (proposal only) |
|---|---|---|---|
| L1 | Medium (operational) | Migrations `202609190001` and `202609190002` absent live; 2 tables and 6 functions missing | Decide and apply with authorization; review `private.can_open_learning` and grants post-apply; re-run V2/V4 |
| L2 | Low | `public.rls_auto_enable()` executable by `anon`/`authenticated`/`public`, SECURITY DEFINER, absent from repository | Revoke execute from the three; document or capture in a migration |
| L3 | Low | Leaked-password protection disabled (advisor) | Enable in Auth settings |
| L4 | Info | 2 expired mentor codes still `active = true` | Deactivate or delete |
| L5 | Info (latent C4) | Browser CRUD grants on two empty legacy tables | Revoke grants / drop; remove facilitator read path |

L1 is classified as an operational/drift finding, not a vulnerability: the missing objects reduce today's
attack surface. It is flagged because every claim about cohort learning in 03 is not yet live.

Advisor items judged not to be defects: 11 of the 12 `authenticated_security_definer_function_executable` WARN
on the intended RPCs (the 12th is `rls_auto_enable`, L2; by design, each re-derives the caller from `auth.uid()`), and 5 `rls_enabled_no_policy` INFO
(RPC-only design).

## 5. Items still requiring dashboard/browser verification

- Auth: Site URL, redirect allowlist without wildcards, email confirmation enforced, secure password change,
  recovery/OTP expiry, password policy, CAPTCHA, signup/sign-in/recovery rate limits, MFA for admins.
- API settings: "Exposed schemas" (confirm `private` is not listed), Edge Functions, Auth hooks, database
  webhooks.
- Entropy of the three live access codes (requires reading them; do it in the dashboard, not here).
- Function body and policy expression equality against the repository for the five applied migrations.
- Backups / PITR, log retention.
- Live response headers, source maps, bundle contents (C1, C5, P14, deployment items 8-9).

## 6. Next dynamic-security checks

1. Real-token PostgREST matrix against this project (or a disposable clone): anon and an authenticated
   participant calling `rest/v1/<table>` for every table in `public` and `private`, and `rpc/<fn>` for every
   function including `rls_auto_enable` (expect denial or a harmless error). Confirms V1/V2 over HTTP.
2. After L1 is resolved, repeat V2 and V4 and run the cohort-learning role matrix from 03 section 10.
3. Access-code concurrency and throttle tests on `redeem_workspace_code` (last-use race, per-user 10 /
   15 min), only against a disposable project.
4. Auth flow tests: PKCE replay, recovery reuse and expiry, sign-up with hostile metadata (`role`) to confirm
   `private.create_account` always yields `participant` (trigger present live; behavior not exercised here).
5. Browser/bundle phase: headers, CSP report-only, source maps, C1 solution leakage.
6. Add a permanent CI/DB assertion: no `anon`-executable function in `public`, no browser table privilege in
   `private`, migration list in the database equals the repository.
