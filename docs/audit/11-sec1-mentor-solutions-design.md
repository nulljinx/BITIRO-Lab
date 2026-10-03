# 11 - SEC-1 design: mentor solutions served from the database (PROPOSAL, not implemented)

Status: design only. No migration, code or test for SEC-1 exists yet. This repository is PUBLIC, so this document,
the migration, tests, fixtures and seeds must never contain real solution content.

## Premise

The current S01-S05 reference solutions were already published in a public repository and in the shipped bundle
(`dist/assets/CodeEditor-*.js`, see 10). Treat them as COMPROMISED. Moving them to the server does not make them
secret retroactively. The control only protects NEW solutions: author new, materially different S01-S05 solutions
rather than copying the current ones into the database.

## Architecture

- `private.mentor_solutions(session_id pk check ^s0[1-8]$, title, note, source, revision, content_sha256 generated
  from source, updated_at)`. RLS enabled, no policies, `revoke all` from public/anon/authenticated (RPC-only).
  The migration creates it EMPTY.
- `public.mentor_get_solution(p_cohort_id text, p_session_id text) returns jsonb`: SECURITY DEFINER,
  `search_path=''`, STABLE. Order: `auth.uid()` required (42501); `session_id` matches `^s0[1-8]$` (22023);
  `private.can_manage_cohort(cohort)` AND cohort exists and is active, otherwise one generic 42501; row missing
  gives P0002. Returns only the requested solution. `revoke ... from public, anon`; `grant execute ... to authenticated`.
- Expected results: anon 42501 (HTTP 401); participant and mentor of another cohort 42501 (403); mentor of the
  cohort allowed.
- Platform admin: ALLOWED, explicit decision. `can_manage_cohort` already includes platform admins, who can already
  manage every cohort and edit the staff allowlist, so denying them adds no security. The explicit active-cohort
  check exists because the admin branch of `can_manage_cohort` does not verify the cohort exists.
- No read audit (the function stays STABLE). Optional: insert into `institution_audit_events` and drop STABLE.
- Both `session_id` alone is insufficient: `can_manage_cohort` authorizes per cohort, so the RPC takes the cohort.

## Frontend

- Delete `src/content/mentor-solutions.ts`; remove the import and `mentorSolutionFor` use in `CodeEditor.tsx`.
- New panel component fetches only when the mentor opens "Solución de referencia": idle, loading, ready, error.
  Every failure shows one generic message. AbortController plus request token to ignore stale responses.
- Content lives only in component state; discarded on close, session change, unmount and sign-out.
  No preload, no `localStorage`/`sessionStorage`, no global store, no telemetry.
- Verify `cloudContext` carries the cohort id to `CodeEditor`.

## Loading content outside Git

- Source of truth: files outside the repository (for example `~/bitiro-private/solutions/`), encrypted backup with
  `age`/`gpg` plus a second private store (password manager or a separate private repository).
- `tools/load-mentor-solutions.mjs` (versioned, contains no content): reads `BITIRO_SOLUTIONS_DIR` and
  `SUPABASE_DB_URL` from the environment, validates shape, parameterized upsert incrementing `revision`,
  `--dry-run` prints only session, length and sha256, never the text, nothing logged.
- Do not use the Dashboard SQL Editor (keeps query history), seeds, migrations or `supabase db push`.
- Verify by comparing `content_sha256` with the private manifest.
- Supabase backups/PITR will contain the solutions; project access is part of the perimeter.

## Tests

DB (`supabase/tests/rls.test.mjs`) with a DUMMY row marked test-only (no real content): anon, participant, other-cohort
mentor, unknown cohort and inactive cohort get 42501; own-cohort mentor and platform admin succeed; invalid session ids
(`s09`, `S01`, null) get 22023; missing row gets P0002; direct table access is denied; RLS on, zero policies, zero
grants; the table is EMPTY after all migrations and seeds; response has only the expected keys.

Dist gate (`tools/audit-dist-solutions.mjs`, run after `pnpm build`, wired into `verify`), three layers, none holding
solution code in Git: (1) generic markers (the "Solución de referencia" title, `.map` files, a `mentor-solutions` module
name); (2) committed SHA-256 hashes of distinctive lines of the already-public solutions (reveal nothing new); the
script hashes each line of every `dist` JS file; (3) optional private markers from `BITIRO_SOLUTION_MARKERS_FILE`
(outside Git) for the new solutions, for local or private CI. Includes a negative control on a synthetic `dist`.

Unit test of the panel with a mocked RPC: loading, ready, generic error, nothing written to web storage.

## Decision required: tests that currently import the solutions

`mentor-solutions.test.ts`, `s01-reference.test.ts`, `s05-evaluator.test.ts`, `s01-initial-ir.test.ts`,
`s02-initial-signal.test.ts`, `mission-evaluation.test.ts`, `mission-partial-attempt.test.ts`,
`mission-terminal.test.ts`. Proposal: evaluator tests move to synthetic states and traces; end-to-end full-program tests
move to a private suite reading `BITIRO_SOLUTIONS_DIR`, skipped with a visible warning in public CI. Do not write new
"witness" programs in the repository: they would be equivalent solutions.

## Risks

- Public CI loses full-mission coverage; the private suite must run before each release.
- Old solutions stay public in history, forks and caches; rewriting history does not fix it.
- A mentor can still share a solution; the design prevents unauthorized reads only.
- Platform admins and anyone with Supabase project access can read the table; keep that group small.
- Mentor UX now depends on the network and needs loading/error states.
- Forgetting the load step leaves the table empty and the panel on its generic error; include it in the deploy checklist.
- The line-hash gate misses reformatted variants of old solutions, hence layer 3.
