# 07b - Data scalability closure (queries, indexes, pagination, storage growth)

Baseline: branch `audit/claude-bitiro`, 2026-10-02. Closes only section 6, R6, R7 and R10 of
`docs/audit/07-performance-scalability-release.md`. Source and migrations were read; nothing was modified, deployed,
or queried live. Supabase MCP was not used; `.env*` was not read.
Classification: CONFIRMED (read in SQL/source), RISK (plausible, depends on live size), RECOMMENDATION.
No user counts are assumed. Costs are written as formulas in participants (P), sessions (S, hard maximum 8) and versions (V).
Read: `workspace-service.ts`, `cloud-learning.ts`, `workspace-types.ts`, all 7 files in `supabase/migrations/` (1,125 lines),
`supabase/config.toml`, and the call sites in `WorkspaceProvider.tsx`, `WorkspacePages.tsx`, `CodeEditor.tsx`, `App.tsx`.

## 1. Executive summary

The data model is small and mostly well keyed: every learning read/write is a single-row primary-key access, every
list surface is closed behind an RPC, size caps exist on the heavy columns (32 KiB source, 8 KiB evidence), and there is
no N+1 pattern. The mentor dashboard issues a constant 5 parallel RPCs and cost grows linearly (not super-linearly) in P.

What is not bounded: (a) the mentor roster and learning RPCs have no limit or pagination; (b) the per-user storage ceiling
is 1000 times higher than the app intends because `activity_version` accepts 1..1000 while the client always sends 1;
(c) `institution_audit_events` and the access-code tables are append-only with no retention and one is missing an index
for its real query; (d) a repeat redemption by an existing member writes an audit row every call and escapes the rate limit.

Confirmed: 0 critical, 0 high, 1 medium, 5 low. Risks: 8. Recommendations: 9.
Everything below is verified against the repository SQL only. 07 F1 states the live project lacked the two learning
migrations at the time of that audit, so none of these tables may exist live yet (section 11).

| ID | Severity | Summary |
|---|---|---|
| D1 | medium | Cloud code/progress storage ceiling is V=1000 times the intended per-user bound; save RPCs are unthrottled |
| D2 | low | Mentor roster and learning RPCs return the whole cohort in one jsonb: no limit, no pagination |
| D3 | low | No index on `private.workspace_access_codes(cohort_id)`; table is append-only |
| D4 | low | `institution_audit_events`: no retention, no index, repeat redemptions append events and bypass the throttle |
| D5 | low | Redundant and amplified requests: full 5-RPC reload per release toggle, no-op row rewrites |
| D6 | low | No global retention for `workspace_code_attempts`/`rate_limits`; cleanup only runs for that same user |

## 2. Query/RPC patterns

All institutional data is reached through `supabase.rpc(...)` (grep over `src/`: only `sites`, `profiles`, `memberships`
use `.from()`, all by primary key or a small catalogue, `auth-service.ts` L13-20). Clients have no table grants on cohort tables.

| Flow | RPC | Shape | Bounded? | Scaling |
|---|---|---|---|---|
| Workspace list | `list_my_workspaces` (`...0180002` L102) | `jsonb_agg` over caller's memberships, 6 joins by PK | by caller's own memberships | O(memberships of one user) |
| Open session | `get_my_cohort_learning` (`...0190001` L45) | 2 PK selects | 1 doc (<=32 KiB) + 1 progress | O(1) |
| Autosave | `save_my_cohort_code` L65 | CAS update by full PK | 1 row, <=32 KiB | O(1), plus auth helpers |
| Mark visit/attempt | `mark_my_cohort_activity` (`...0190002` L48) | upsert by PK | 1 row | O(1) |
| Submit mission | `submit_my_formative_mission` L16 | upsert by PK | evidence <=8 KiB, 4 checks | O(1) |
| Session releases | `list_workspace_sessions` (`...0180002` L272) | `generate_series(1,8)` left join `content_releases` | fixed 8 rows | O(1) |
| Mentor counts | `mentor_workspace_overview` (`...0180003`) | two `count(*)` by `cohort_id` | scalar result | O(P) index range scan, server-side |
| Roster | `mentor_list_participants` (`...0180004` L122) | `jsonb_agg` over all active participants, `order by lower(display_name)` | NO | O(P log P), payload O(P) |
| Learning matrix | `mentor_cohort_learning` (`...0190001` L115) | `jsonb_agg` over participants x progress rows | NO | rows <= P x S x 1; payload O(P x S) |
| Invite lookup | `mentor_get_participant_invite` L20 | `where cohort_id,role,active ... order by created_at desc limit 1` | 1 row | seq scan (D3) |
| Admin members | `list_visible_members` (`...0170001` L158) | paginated, `limit` clamped 1..100, `offset` clamped, returns `total` | yes | see R1 |

Authorization overhead per call: every learning RPC runs `private.can_open_learning` -> `can_access_cohort` (6-table join, all
PK/FK lookups) + `can_manage_cohort` (5-table join) + `content_releases` lookup (`...0190001` L31-41; helpers in `...0180002`
L58-90). This is a constant number of index probes per call, not a growth in P, but it is paid on every autosave (R4).

N+1: none. `MentorWorkspacePage.load` (`WorkspacePages.tsx` L221-227) fans out 5 RPCs with `Promise.all`; per-participant
aggregation is done client-side from the matrix rows (`learningByParticipant`, L240-246), not by one request per participant.
Server-side aggregation exists only for counts (`mentor_workspace_overview`). The per-participant visited/attempted/completed
tally is client-side over rows the server already materialized (acceptable at <=8 rows per participant).

## 3. Index coverage

Indexes derived from actual query patterns only.

| Query pattern | Supporting index | Verdict |
|---|---|---|
| user -> workspaces/memberships (`list_my_workspaces`, helpers) | `organization_memberships` PK(user_id,organization_id); `cohort_memberships` PK(user_id,cohort_id) | covered |
| cohort -> roster/counts (`mentor_list_participants`, overview, learning) | `cohort_memberships_cohort_idx(cohort_id)` (`...0180001` L69); `active`/`role` filtered on fetched rows | covered; per-cohort scan is the intended cost |
| `cohorts` by org | `cohorts_org_idx` | covered |
| cohort code documents (get/save) | PK(user_id,cohort_id,session_id,activity_version), always full key | covered; no mentor read of documents exists |
| learning progress (user/session) | PK same shape; extra `cohort_learning_progress_cohort_idx(cohort_id,session_id)` | covered. The mentor RPC joins from `cohort_memberships` by user then PK prefix (user_id,cohort_id); `session_id` is unconstrained so the 4th key column is a filter on <=8 entries per user. The extra index is currently not needed by any RPC; keep only if per-session aggregation is added |
| `content_releases` by cohort/session | PK(cohort_id,session_id) | covered |
| access-code redeem by `code` | PK(code), `for update` | covered |
| access-code by cohort (`mentor_get_participant_invite`, create/revoke `update ... where cohort_id=..`) | none | GAP (D3) |
| attempts count/delete by user and time | `workspace_code_attempts_user_time_idx(user_id,attempted_at)`; `outcome` filtered on few rows | covered |
| audit events by cohort/time | none on `institution_audit_events`; none on `membership_audit` | gap, latent (D4): no client reader in `src/` |
| profiles search by name (`list_visible_members`) | none for `position(...)` filter or `order by display_name` | not indexable as written (R1) |
| FK cascades (cohort/profile delete) | user_id FKs are PK prefixes; `access_codes.cohort_id`, `content_releases.released_by`, `programs.organization_id`, `sites.organization_id` unindexed | tiny catalogue tables except access codes; only matters on deletes |

No index is recommended merely because a column appears in a WHERE clause: the sessions, programs, organizations, sites
tables are catalogue-sized by design (S<=8 per cohort, constants).

## 4. Pagination and result bounds

- `config.toml`: `max_rows = 1000` (local file; live value NOT VERIFIED). PostgREST applies it to returned rows. Every
  list RPC here returns ONE scalar jsonb row, so `max_rows` never truncates them. Consequence: no silent truncation, but also
  no server cap at all; the only cap is the 15 s client `AbortSignal.timeout` (`workspace-service.ts`).
- Silent truncation is therefore limited to plain table selects: `sites` (`auth-service.ts` L13, `.eq('active')` order only,
  no `.limit`/`.range`). Catalogue-sized today; if it ever exceeded `max_rows` the registration site list would be cut with no error (R6).
- Callers do not defend against a large payload: `listWorkspaceParticipants` and `listCohortLearning` cast `data` and render the
  full array. There is no `limit/offset` parameter in either RPC signature.
- Payload shape (from the SQL): learning matrix rows carry `user_id, session_id, status, updated_at` (about 100-150 bytes as jsonb);
  evidence is not returned. Upper bound per participant is S=8 rows (activity_version is pinned to `p_version`, the client sends `1`,
  `App.tsx` L32). Roster rows carry `user_id, display_name, joined_at` (display name <=80 chars). So payload is linear in P
  with a small constant; the first limit to bite is likely the 15 s abort or `statement_timeout`, not row size (NOT VERIFIED live).
- Cohort size has no hard cap: an invite caps at 200 uses (`createParticipantInvite`, `...0180004` L65) but a new invite can be
  created repeatedly (each call deactivates the previous one and resets `uses`), so P per cohort is unbounded by schema.
- `list_visible_members` is the only paginated RPC (`limit` <= 100, `offset` <= 1,000,000, stable `order by display_name,id`, `total`).

## 5. Storage growth and retention

| Data | Table / location | Growth model | Bound | Retention |
|---|---|---|---|---|
| Cloud code | `cohort_code_documents` | in-place single row per key; NO revision history (confirms the 07 uncertainty); `revision` is a counter only | `users x cohorts x S x V x 32 KiB`; intended V=1, schema allows 1000 (D1) | none; only cascade on profile/cohort delete |
| Progress + evidence | `cohort_learning_progress` | single row per key, upsert; evidence overwritten, not appended | same key space; evidence <=8 KiB, only s01/s02 accepted by `submit_my_formative_mission` | none |
| Legacy code/progress | `code_documents`, `program_progress` | PK(user_id,session_id); direct table grants to `authenticated` remain; no reference in `src/` (grep) | `users x 8 x 32 KiB` | none |
| Audit (institution) | `institution_audit_events` | append-only identity table, one row per redeem success, invite create/revoke, release toggle | unbounded | none (D4) |
| Audit (membership) | `membership_audit` | append-only, trigger fires only on site/role change | unbounded but low volume | none; no reader in `src/` |
| Access codes | `private.workspace_access_codes` | one row per invite created; old ones set `active=false`, never deleted | unbounded | none (D3) |
| Code attempts | `private.workspace_code_attempts` | one row per redeem call; deleted only inside `redeem_workspace_code` for the same user after 24 h | per active user ~ 24 h window; abandoned users keep rows | partial (D6) |
| Rate-limit marker | `private.workspace_rate_limits` | one row per user who ever redeemed | `users` | none (tiny) |
| Memberships | `organization_memberships`, `cohort_memberships` | PK(user,org/cohort), soft `active` flag, no delete path in RPCs | `users x cohorts` | none |
| Releases | `content_releases` | PK(cohort,session), upsert | `cohorts x 8` | none (bounded) |

Search for purge mechanisms: `grep -i "delete from|cron|purge|retention|truncate|vacuum"` over `supabase/` finds only the two
per-user `delete from private.workspace_code_attempts` lines (`...0180001` L160, `...0180002` L161). No `pg_cron`, no retention
function, no scheduled job, no table-level autovacuum setting in the repository. Live-side Supabase defaults are NOT VERIFIED.

Update-heavy tables: both learning tables are updated in place on every autosave/mark. Each update of `source` creates a new
row version (and new TOAST chunks above the inline threshold); space is reclaimed only by autovacuum. Row count is bounded;
transient bloat depends on the write rate (R2).

## 6. Concurrency considerations

Only scalability-relevant behaviour; authorization excluded.
- Code CAS (`save_my_cohort_code`, `...0190001` L65-89): `revision=expected` update, or `insert ... on conflict do nothing` at
  revision 0. Contention is per user-row only; two tabs of one user conflict cleanly (`{ok:false}`) and the client re-fetches
  (`CodeEditor.tsx` L45-52). No cross-user contention. The conflict path costs one extra `get_my_cohort_learning`. No lost update.
- Not guarded: the update does not compare the new `source` with the stored one; identical content still bumps `revision`
  and rewrites the TOASTed value (D5). The client avoids most duplicates (debounce 1 s, 1.2 s retry; `CodeEditor.tsx` L65-72).
- Counters: `uses` is incremented after `select ... for update` on the code row (`...0180002` L179-235) and checked under the
  same lock, so max-use is exact. Cost: all redemptions of one shared code serialize on that single row for the transaction
  length, which includes the audit insert (R3). Per-user `workspace_rate_limits` upsert serializes the same user's parallel redeems.
- Invite creation takes `pg_advisory_xact_lock(hashtext('bitiro-participant-invite:'||cohort_id))` (`...0180004` L72);
  `hashtext` is 32-bit, so a collision across cohorts could add rare false serialization, harmless.
- Repeated progress updates: `mark_my_cohort_activity` never downgrades `completed`/`attempted`, so the status is monotone, but
  `attempted -> attempted` still executes an UPDATE and sets `updated_at=now()` on each Run click (the `case` only preserves
  `updated_at` for incoming `visited`; `...0190002` L65-66). Each Run click is one RPC (`CodeEditor.tsx` L195).
- `admin_update_membership` uses one global advisory lock (74218061): admin-only, rare.

## 7. Confirmed findings

### D1 - Per-user storage ceiling is 1000x the intended value; save RPCs have no write throttle (MEDIUM)
Evidence: `cohort_code_documents` and `cohort_learning_progress` have `activity_version integer ... check(activity_version between 1 and 1000)`
inside the primary key (`...0190001` L9, L19). `can_open_learning` accepts `p_version between 1 and 1000` (L35) and the save/mark/submit RPCs
insert with `p_version` unchanged. The client hard-codes `activityVersion:1` (`App.tsx` L32), but any authenticated member of an
open cohort/session can call the RPC with other values. Worst case per user per cohort: 1000 x 8 x 32 KiB = about 250 MiB of code, plus
1000 x 2 x 8 KiB evidence; a user can also enrol in several cohorts. `redeem_workspace_code` is the only RPC with a rate limit.
Scale: matters as soon as storage quota or backup size is a constraint, independent of P; the intended bound (8 x 32 KiB per user per cohort)
is only enforced by client behaviour. Flow: cloud code sync, mission submit.
Direction: pin versions server-side (reject versions not in a small allowed set, or drop the unused axis until activities are versioned),
and cap rows per user via the key space or a count check; add a minimum interval/size-delta guard on `save_my_cohort_code`.

### D2 - Mentor roster and learning RPCs are unbounded (LOW)
Evidence: `mentor_list_participants` (`...0180004` L131-141) and `mentor_cohort_learning` (`...0190001` L122-131) `jsonb_agg` every active
participant with no `limit`/`offset`; the TS wrappers (`workspace-service.ts` L62-76) take no paging arguments. Both are sorted in memory
over the full set each call. Cohort size is not capped (section 4).
Scale: cost and payload are linear in P (roster) and P x S (matrix, S<=8); because both come back as one jsonb, they are not clipped
by `max_rows` and a slow plan surfaces only as the 15 s client abort or a server timeout. The 5 RPCs also reload together (D5), so a
large cohort pays this on each reload. Flow: mentor workspace page.
Direction: keep one combined server-side summary (counts per participant per status) for the default view, and page the roster; do not
return the raw matrix when only per-participant tallies are rendered.

### D3 - `workspace_access_codes` has no index on `cohort_id` (LOW)
Evidence: only `primary key(code)` (`...0180001` L54). `mentor_get_participant_invite` filters `cohort_id,role,active` and orders by
`created_at desc limit 1` (`...0180004` L29-37); `mentor_create_participant_invite` and `mentor_revoke_participant_invite` update `where cohort_id=..
and role='participant' and active` (L76-78, L111-113). Rows are never deleted (old codes become `active=false`), so the table only grows with
invite churn across all cohorts.
Scale: each mentor page load and each invite action scans the whole table; cost is proportional to total historical codes, not to the cohort.
Direction: composite index such as `(cohort_id, role, active, created_at desc)` or a partial index on active rows; consider purging expired/inactive codes.

### D4 - Audit events are append-only, unindexed and amplified by repeat redemptions (LOW)
Evidence: `institution_audit_events` (`...0180002` L43-52) has only the identity PK; no `(cohort_id, created_at)` index and no purge. The select policy
calls `private.can_manage_cohort(cohort_id)` per row (L97-99). `redeem_workspace_code` inserts an audit event on every success (L247), including
when the caller is already a member (`existing_cohort` true: no membership insert, no `uses` consumption, but the event, the attempt row and the
`success` flip still happen). The 10-per-15-minute limit counts only `outcome='attempt'` rows (L164-166); success rows flip to `success` and are not counted,
so a holder of a valid code can append events without being throttled.
Scale: growth is linear in successful redeem calls, forever. Reads are not a current concern (no `src/` reader), but the first dashboard that reads this table will
need the index and will evaluate the helper per row. Flow: code redemption, future audit view.
Direction: skip the audit insert (and attempt row) when the redemption changes nothing; add `(cohort_id, created_at desc)`; define retention or archive.

### D5 - Redundant requests and no-op writes (LOW)
Evidence: `toggle()` in `MentorWorkspacePage` calls `await load()` after each release change (`WorkspacePages.tsx` L236), re-running all 5 RPCs, including the roster and the
learning matrix, to refresh one boolean. `OrganizationWorkspacePage.load` (L150-158) and `MentorWorkspacePage.load` repeat `list_workspace_sessions` +
`mentor_workspace_overview` when the mentor navigates between the two pages (no shared cache). Opening a session is two sequential RPCs (`get_my_cohort_learning`, then
`mark_my_cohort_activity('visited')`, `CodeEditor.tsx` L123 and L143). Writes: `save_my_cohort_code` and `mark_my_cohort_activity` rewrite the row (new tuple, `updated_at`, TOAST)
even when nothing changes.
Scale: constant factor per page view/click, multiplied by P through D2 for the mentor flows. Direction: refresh only the affected RPC after a toggle; combine
sessions+overview(+invite) into one summary RPC; fold the visit mark into `get_my_cohort_learning`; make the upserts conditional (`where ... is distinct from`).

### D6 - Attempt/rate-limit rows have no global retention (LOW)
Evidence: cleanup (`delete ... where user_id=auth.uid() and attempted_at<now()-interval '24 hours'`) lives inside `redeem_workspace_code` and runs for the calling user only
(`...0180002` L161-162). A user who attempts and never returns keeps their last rows; `workspace_rate_limits` has one row per user who ever redeemed and is never trimmed.
Scale: bounded per user (<=10 failed attempts per window plus success rows), so linear in distinct users over time; small rows. Direction: a scheduled purge (for example
Supabase cron) for attempts older than 24 h and stale rate-limit rows.

## 8. Risks

R1. `list_visible_members` (admin) is `security invoker`: RLS runs `private.can_read_user(id)` for each candidate row of `profiles` and `memberships`; the `visible` CTE is fully built to
compute `total` and to sort by `display_name,id`; the `position(lower(query) in lower(display_name))` filter cannot use an index; `offset` is honoured up to 1,000,000. Cost per page is O(all platform members), not O(limit).
No `EXPLAIN` was run. Admin-only flow.
R2. Autosave rewrites a row with up to 32 KiB TOASTed text on every pause in typing; steady write volume from many simultaneous editors produces dead tuples and WAL proportional to saves, not to rows. Autovacuum settings and live bloat NOT VERIFIED.
R3. Shared-code redemption serializes on one `workspace_access_codes` row; a whole group joining at the same moment queues behind the lock while each transaction also writes attempt, membership and audit rows. Not measured.
R4. Every autosave pays about 11 index probes for authorization (`can_access_cohort` + `can_manage_cohort` + release check) before the single-row write. Constant per call, but multiplied by concurrent editors; not measured.
R5. No server-side `statement_timeout` is declared in the repo; the 15 s `AbortSignal` only drops the client, the server may continue the query (platform default NOT VERIFIED). Learning calls in `cloud-learning.ts` have no client timeout at all.
R6. `sites` select has no `.limit/.range` and relies on `max_rows`; a catalogue above the limit would be cut silently (unlikely by design; live `max_rows` NOT VERIFIED).
R7. Legacy `code_documents` and `program_progress` still hold direct insert/update/delete grants to `authenticated` (`...0170001` L81) and are unused by `src/`; they are an unneeded write surface with a 32 KiB x 8 per-user ceiling.
R8. Cohort deletion/user deletion paths rely on unindexed FKs (`workspace_access_codes.cohort_id`, `content_releases.released_by`) and `institution_audit_events` FKs without `ON DELETE`; deleting a cohort that has audit rows is blocked rather than cascaded. Only matters when decommissioning data.

## 9. Strengths

- Single-key access: every learning read/write is PK-addressed; no per-participant fan-out, no N+1.
- Hard size limits in both schema and RPC (32 KiB source, 8 KiB evidence, 80-char display names, 64-char codes); sessions fixed to `s01..s08`.
- Releases and session list are constant size (8 rows, `generate_series`).
- Overview counts are computed in SQL against the `cohort_id` index; roster is fetched in parallel, not sequentially.
- CAS revision on code avoids lost updates without a history table, which keeps storage flat per key.
- Statuses are monotone (`completed` and `attempted` never downgrade); progress writes are idempotent upserts.
- `list_visible_members` clamps limit and offset and returns `total`; per-user redemption throttle and per-cohort invite lock exist.
- `redeem_workspace_code` deletes aged attempt rows in the same transaction (partial retention).

## 10. Recommended actions

1. Constrain `activity_version` server-side (allow-list or remove the axis) before real use; add a minimum interval or no-change guard to `save_my_cohort_code` (D1).
2. Add `workspace_access_codes(cohort_id, role, active, created_at desc)` (D3) and `institution_audit_events(cohort_id, created_at desc)` (D4) in a new migration, through the normal process.
3. Replace the raw matrix with a server-side per-participant tally and add `limit/offset` (or keyset on `user_id`) to `mentor_list_participants` (D2).
4. Merge `list_workspace_sessions` + `mentor_workspace_overview` + invite into one mentor summary RPC; after a release toggle, refresh only the sessions (D5).
5. Skip audit and attempt rows when a repeat redemption changes nothing; count success rows in a separate, larger throttle (D4).
6. Add a scheduled purge for attempts/rate limits and an explicit retention policy for `institution_audit_events` and `membership_audit` (D4, D6).
7. Make `mark_my_cohort_activity` and `save_my_cohort_code` conditional (`where ... is distinct from`) to avoid no-op row rewrites (D5, R2).
8. Add a query-plan regression check (PGlite seed with a synthetic cohort, `EXPLAIN` of the four mentor RPCs) so index assumptions are tested; extend `rls.test.mjs` to read the migrations directory (07 F6).
9. Decide the fate of legacy `code_documents`/`program_progress` and revoke direct grants if truly unused (R7).

## 11. Unverified live-scale assumptions

- Live row counts, table sizes, bloat and the actual cohort size distribution: no live access. Every cost above is a formula, not a measurement.
- Live schema parity: 07 F1 recorded that the live project had 5 of 7 migrations at that time; `cohort_code_documents`, `cohort_learning_progress`, `mentor_cohort_learning`, `submit_my_formative_mission` may not exist live. Index and constraint state live (`pg_indexes`, `pg_constraint`) NOT VERIFIED.
- Query plans: no `EXPLAIN` was run; statements that the planner uses PK prefixes or `cohort_memberships_cohort_idx` are inferred from the SQL, not observed. PGlite in `rls.test.mjs` does not assert plans.
- Live `max_rows` (repo value 1000 is the local config), `statement_timeout`, connection pooling mode and autovacuum thresholds.
- Whether any scheduled job or dashboard-defined retention exists outside the repository.
- Real autosave rate per editor, redeem burst size, mentor refresh frequency, and cohort sizes in production.
- Size of `jsonb` payloads in practice (estimates above are derived from column widths only).
