# 09 - Remediation roadmap

Date: 2026-10-02. Companion of `docs/audit/08-master-audit.md` (IDs, root causes, sources and priorities are defined there; this file
adds order, tests and definitions of done). Nothing here is implemented. No finding is added: anything not supported by documents
00-07b is labelled "not established". 45 work packages: P0 = 5, P1 = 12, P2 = 19, P3 = 9. Each package is one commit (a migration
package may add one migration file) and can be implemented, tested and reviewed independently once its dependency is merged.

## 1. Rules for remediation

1. **Authorization first (CLAUDE.md).** No migration, RLS, Supabase data or dashboard change, push, merge or dependency install without
   explicit approval. Packages marked "needs authorization" stop at the pull request until it is given.
2. **One package, one commit, one concern.** Do not mix a behaviour change with a refactor. Refactor packages (SYNC-2, ARCH-1..5) must
   leave behaviour byte-for-byte equal and be protected by TST-1 and the headless suites first.
3. **Forward-only SQL.** Never edit a migration that may have been applied anywhere; add a new file (decision D1). Every `create or replace`
   keeps `set search_path=''`, schema-qualified names and `revoke ... from public, anon` plus `grant ... to authenticated` (03 P2-P3).
4. **Expand, switch, contract** for any RPC or contract change (SEC-1, DB-4): ship the new path, move the client, then remove the old path.
5. **Preserve the section 2 controls of 08** (worker lifecycle, adapter seam, headless tests, scope isolation, CAS and monotone status,
   formative wording, lazy boundaries, pedagogical constraints, accessibility base). A package that needs to weaken one stops and escalates.
6. **Do not give the answer.** Feedback and glossary copy may hint, never reveal code (`PRODUCT.md` rule cited in 03 C1).
7. **A green test is not pedagogical proof** (CLAUDE.md). Mission and feedback packages need a browser check of the learning outcome.
8. **Verify before optimising.** Performance packages start from a measurement; nothing that audit 07 did not measure is "fixed" blindly.
9. **No new dependencies** unless authorized (for example jsdom or a testing library for component tests); prefer native `inert`, `dialog`.
10. After each package run only the relevant suites, then the full gate (section 7) at each phase end. Update the audit docs' status lines.

## 2. Phase ordering

Order follows dependency and repeated-edit minimisation, not audit numbers. Priority and phase differ when a dependency forces it.

| Phase | Theme | Packages (in order) |
|---|---|---|
| 0 | Decisions and authorizations (no code) | D1-D8 below |
| 1 | Release / database parity | REL-1, REL-4, TST-1, OPS-1, SYNC-1, DB-1, DB-2, DB-3, REL-3, REL-2 |
| 2 | Keyboard / accessibility | A11Y-1, A11Y-2, A11Y-3 |
| 3 | Mission correctness and feedback | MIS-1, FB-1, FB-2, GLOS-1, FB-3 |
| 4 | Calibration consistency | CAL-1, CAL-2 |
| 5 | Cloud sync and data boundaries | SEC-1, LOC-1, SYNC-2, ARCH-1, ARCH-2, PRIV-1 |
| 6 | Mobile / layout / readability | TYPE-1, MOB-1, CAL-3, FONT-1, A11Y-4, LAB-1, VIS-1 |
| 7 | Performance, bundle, data scalability | PERF-1, PERF-2, REL-5, DB-4, PERF-4, SEC-2 |
| 8 | Architecture / session modularity | ARCH-3, ARCH-4, ARCH-5 |
| 9 | Backlog hardening | RT-1, OPS-2, DB-5 |

Minimum path to the rollout gate (08 section 11): Phase 1 (REL-1, REL-2, OPS-1, REL-3), Phase 2 (A11Y-1, A11Y-2), MIS-1, SEC-1 or a recorded
risk acceptance, D4. Phases 2, 3 and 4 do not depend on Phase 1 and may run in parallel with it (different files: `SimulatorTour.tsx`,
`CodeEditor.tsx` options, `MissionPanel.tsx`, calibration panels versus CI and SQL). Shared-file hot spots to serialise:
`CodeEditor.tsx` (A11Y-2, SEC-1, LOC-1, SYNC-2), `MissionPanel.tsx` (MIS-1, SYNC-1 client, FB-3, ARCH-1), `FeedbackPanel.tsx` (FB-2, FB-3, TYPE-1, ARCH-3),
`Guide.tsx` (A11Y-3, GLOS-1), `Simulator.tsx` (CAL-1, CAL-2, ARCH-2), `ci.yml` (REL-1, REL-3, REL-4, OPS-2).

**Phase 0 decisions** (not findings; each blocks the named packages):
- D1 Migration policy: forward-only new migrations (recommended) versus amending `202609190001/2`, which 04 shows are not live; whether any staging copy has them applied is not established. Blocks SYNC-1, DB-1, DB-2, DB-3.
- D2 Completion semantics: does a passed mission stop or freeze the run, and what stays visible after Detener/Restablecer. Blocks MIS-1.
- D3 Mentor solutions: delivery mechanism and policy for unreleased starter/guide content (03 R6), or recorded pilot risk acceptance. Blocks SEC-1.
- D4 Whether S03-S05 are submitted to the server in this rollout and how a mission declares its completion rule. Blocks SYNC-1, ARCH-1.
- D5 Calibration scope: shared across S02-S05, per user or per cohort, S01 separate. Blocks CAL-1, ARCH-2.
- D6 S04/S05 scaffolding fade and the S05 comment mapping (curriculum owners). Blocks FB-3.
- D7 Editor Tab behaviour: keep Tab-indent plus a visible keyboard-navigation toggle (recommended). Blocks A11Y-2.
- D8 Authorizations: read-only CI Supabase token, disposable staging project, live apply, dashboard changes, any dev dependency.

## 3. Work packages

Format: ID, priority, phase, dependency, then Goal / Resolves / Areas / Outline / Tests / Done. Source IDs are from 08.

### P0

#### REL-1 - Migration-parity and RPC-contract gate
Status 2026-10-02: IMPLEMENTED LOCALLY. Static migration discovery, repo RPC contract,
release requiredMigration and offline/live parity checker are complete and tested.
Live verification and CI secrets remain pending D8. The live gate remains report-only.
P0 | Phase 1 | Depends: D8 (token); none in code.
Goal: make repo/live drift fail CI. Resolves: 07 F1, F6; 04 V4, L1 (detection); 03 §8.1.
Areas: `.github/workflows/ci.yml`, new `tools/` check, `tools/release-meta.mjs`, `public/version.json`, `supabase/tests/rls.test.mjs` L19-25.
Outline: (1) `rls.test.mjs` reads and sorts `supabase/migrations/`, asserts count; (2) static contract test: every `.rpc('name')` in `src/features/**` is created in migrations; (3) CI job on `main` plus nightly comparing local versions with the linked project's applied history (`supabase migration list --linked` or `db push --dry-run --linked`), report-only until REL-2, then required; (4) the same job runs the live `pg_proc` check for the contract names; (5) `requiredMigration` written to the release manifest.
Tests: seed a fake migration file and a renamed RPC in a scratch branch, both must fail; `pnpm test:db` and `pnpm check` green; dry run against the live project reports the two missing versions today.
Done: gate detects the known 5-vs-7 drift; read-only secret documented; report-only flag exists and is flipped in section 5.

#### REL-2 - Reconcile live schema (needs authorization)
P0 | Phase 1 (last) | Depends: REL-1, OPS-1 (backups), D1, D8. Its staging apply (section 5 step 4) precedes REL-3; its production apply follows REL-3.
Goal: live project equals the repository. Resolves: 04 V4, L1; 07 F1; 05 §8; 07b §11.
Areas: Supabase project (staging then production), `docs/audit/04-live-security.md` closure note.
Outline: follow section 5 (staging apply, role matrix, V2/V4 re-run, production apply, flip REL-1 to required). Review `private.can_open_learning` and grants after apply. Diff function bodies and policy expressions of the five already-applied migrations (04 V4: not done).
Tests: 04 V2/V4 queries re-run (12 repo RPCs authenticated-only, 13 RLS tables plus the two new, no anon-executable repo function); `rls.test.mjs`; REL-3 on staging; manual smoke of open session, save, reload.
Done: REL-1 green and required; the six functions and two tables exist live; V2 shows only the known `rls_auto_enable` item until DB-2; written closure note.

#### MIS-1 - Mission completion state integrity
P0 | Phase 3 (first) | Depends: D2.
Goal: one truthful completion state. Resolves: 06b N1, N2, G7; 02 R2 (symptom).
Areas: `MissionPanel.tsx` L22, `FeedbackPanel.tsx`, `RuntimeBar.tsx`, `MissionEvaluator.ts`/`SimulationEngine.snapshot()` (read only unless D2 requires change).
Outline: extract a pure derivation (status, badge, counter, card text) from one source; explicit states "Superada en este intento", "Detenida", "Reiniciada"; apply D2 (stop or freeze at completion); keep the auto-submit trigger and its `submitted` guard unchanged; keep the "autoevaluado, no equivale a calificacion" line.
Tests: unit tests for the derivation matrix (running/passed/stopped/reset/evidence-reset); headless test that completion latches once; browser check per S01-S05 using the mentor reference solution at 2x: pass, Detener, Restablecer, Probar otra vez; auto-submit fires once (institutional case on staging after REL-3).
Done: no state shows "superado" with "0/4"; the three states are distinguishable; S01-S05 each verified in a browser (only S03 was before).

#### A11Y-1 - Tour dialog focus management
P0 | Phase 2 | Depends: none.
Goal: modal behaves as a modal. Resolves: 06 UX-1, 06b G4 extension, 05 R5, 06 R-B.
Areas: `src/features/simulator/SimulatorTour.tsx`, app root `inert`.
Outline: focus heading or "Siguiente" on open; trap Tab; set `inert` on the app root while open; restore focus to the opener (Tutorial button) on close; show "Flechas para navegar, Esc para cerrar"; keep Esc and arrow keys.
Tests: Playwright spec: fresh storage, 40 x Tab, assert editor text unchanged and focus inside dialog; Esc restores focus; reopen via Tutorial; axe on the open dialog; 390 px smoke.
Done: no Tab can reach or edit the editor while open; first-run and reopened tour both pass; persisted `done` key behaviour unchanged.

#### A11Y-2 - Monaco keyboard trap
P0 | Phase 2 | Depends: D7.
Goal: keyboard users can leave the editor (WCAG 2.1.2). Resolves: 06b N5, G4; 06 UX-R3.
Areas: `src/features/code-editor/CodeEditor.tsx` Monaco options, editor toolbar, Guide shortcut note.
Outline: keep Tab for indentation; add a visible, announced keyboard-navigation toggle (Monaco tab-focus mode) or documented exit with on-screen hint; mention it in the tour and Guide.
Tests: Playwright with real key events: enter editor, use the documented path, focus reaches the next control and back; indentation still works by default; manual pass with one screen reader (NVDA or VoiceOver; not done in 06b).
Done: exit path documented in UI and verified; default coding experience unchanged.

### P1

#### TST-1 - Safety net for sync, hook, worker and routing
P1 | Phase 1 | Depends: none (component tests need D8 for a dependency).
Goal: protect the paths a refactor will touch. Resolves: 02 R5, R-A; 07 F3 (unit part); 05 R3.
Areas: `src/tests/`, `cloud-learning.ts`, `useSimulation.ts`, `simulator.worker.ts`, `content/tracks/index.ts`, `content/sessions.ts`.
Outline: characterization tests (no behaviour change) for cloud-learning conflict decisions (restore remote when no local draft, conflict when different, requeue after upload), `requestId` staleness and deadlines, worker dispatcher, `interactive` vs `hasSimulation` consistency, route guards; pure-function level first.
Tests: the new tests themselves; `pnpm test:unit` stays green; deliberately break each rule once to see the test fail.
Done: each listed decision has a test; no application code changed except exports needed for testing.

#### OPS-1 - Auth and project settings verification
P1 | Phase 1 | Depends: dashboard access; matrix part needs the staging apply step of REL-2.
Goal: close the dashboard-only open items. Resolves: 04 V7, L3; 03 R3, R4, §8, §10.
Areas: Supabase dashboard, staging project, `docs/audit/04-live-security.md` addendum.
Outline: record Site URL, redirect allowlist (no wildcards), email confirmation, secure password change, OTP/recovery expiry, password minimum, CAPTCHA and rate limits, admin MFA and bootstrap, "Exposed schemas" (no `private`), Edge Functions/hooks/webhooks, backups and PITR, entropy of live codes, live response headers; enable leaked-password protection; run the real-token PostgREST matrix (anon and participant against every table and RPC, including `rls_auto_enable`).
Tests: matrix script results; header scan against `netlify.toml` (CSP, HSTS, framing); bundle inspection for keys and source maps.
Done: every item recorded OPEN or CLOSED with evidence; no dashboard value changed without approval.

#### SYNC-1 - Formative submission contract (needs authorization)
P1 | Phase 1 | Depends: TST-1, D1, D4.
Goal: submission works for every session that has a mission and is honest about its evidence. Resolves: 03 C2 and note; 07b §5; 02 C4 (literal 4).
Areas: new forward migration touching `submit_my_formative_mission` and `mentor_cohort_learning`, `cloud-learning.ts`, `MissionPanel.tsx`, mentor labels in `WorkspacePages.tsx`.
Outline: accept the sessions decided in D4 and the check count from the mission contract; expose an `evidence_kind` in the mentor RPC; fix the stale comment in `202609190001`; keep monotone status and 8 KiB limit; client stops hardcoding `checks.length!==4`.
Tests: extend `rls.test.mjs` (accepted and rejected sessions, monotonicity, kind returned, size limit); unit test of the client guard; staging E2E submit for S03.
Done: S03-S05 submit or the limitation is documented per D4; mentor RPC distinguishes self-reported evidence; no browser path can write `completed` outside the RPC.

#### REL-3 - Institutional path E2E on staging
P1 | Phase 1 | Depends: staging apply step of REL-2, D8.
Goal: automate the path students actually use. Resolves: 07 F3; 05 §11; 06 §12.
Areas: `tools/run-e2e.mjs`, `tests/e2e/`, `ci.yml` (nightly or manual job), seeded staging accounts.
Outline: second E2E target built with staging Supabase env: login, join by code, open S01, type, reload (restore), second tab conflict, mission submit, mentor sees status; fail on console errors.
Tests: the job itself; run twice for flakiness; secrets only in CI.
Done: job green on staging; documented as nightly if too slow for PRs.

#### FB-1 - Diagnostics for unsupported constructs
P1 | Phase 3 | Depends: none.
Goal: name the real problem. Resolves: 05 F1; 06 §7.
Areas: `src/simulator/runtime/parser/` (Parser, validate), `src/tests/runtime/`.
Outline: known unsupported types and statements (`String`, `boolean`, `unsigned`, arrays, `do`) produce a "no soportado en este simulador" message with line and column; unclosed brace reported at its origin; keep existing good messages.
Tests: parser tests for the six 05 cases plus the remaining cases of the 21-case matrix (`float`, `for`, `const int`, IR read must stay accepted); runtime and mentor-solution suites unchanged.
Done: none of the six cases reports "Falta ';'" or "variable no puede ser void"; messages in Spanish with position and Monaco marker.

#### FB-2 - Honest run-time and review feedback
P1 | Phase 3 | Depends: MIS-1.
Goal: no silent "Ejecutando", no false reassurance. Resolves: 06 UX-3, UX-R7, R-A; 06b G1.
Areas: `FeedbackPanel.tsx`, `LearningFeedbackEngine.ts`, review result text (file not established).
Outline: inactivity hint after N seconds without an actuator command (no code revealed); keep the stimulus reminder while unset (S01, S02); review result separates "sin errores de sintaxis" from "cumple la mision".
Tests: unit tests of hint selection with synthetic snapshots; browser: untouched starter S01-S05 shows hint within the chosen window; correct program shows no hint.
Done: untouched starter and correct program produce different messages; reminders persist in S01/S02; S03 live counters unchanged.

#### TYPE-1 - Readable minimum for instructional text
P1 | Phase 6 | Depends: none.
Goal: pedagogical text at 12 px or more. Resolves: 06 UX-2; 06c V-3; 06b G2, N10.
Areas: `src/styles/product-polish.css` L153, `workspace.css` L2-8, `FeedbackPanel.tsx`, calibration CSS.
Outline: one intermediate type step for feedback card, goals, run buttons, calibration text; decorative labels stay small; change the card heading h3 to h2 and update the `.feedback-panel h3` selector in the same commit.
Tests: computed-style assertion for the listed elements; axe heading-order clean; screenshots at 1440 and 390 px (no overflow, no clipping).
Done: listed text at 12 px or more; desktop lab still fits one screen or the change is accepted; no axe `heading-order` violation.

#### A11Y-3 - Guide focus return
P1 | Phase 2 | Depends: none.
Goal: focus returns to the opener. Resolves: 06b N3, G3.
Areas: `Guide.tsx`, `button.guide-button`.
Outline: restore focus on `close` (Escape and button).
Tests: Playwright: Enter, Escape, assert `activeElement` is the Guide button; same via close button.
Done: both close paths verified.

#### GLOS-1 - Concept definitions at first contact
P1 | Phase 3 | Depends: A11Y-3.
Goal: define ADC, pulsador, estimulo IR, sonar, LCD, umbral where students meet them. Resolves: 06b N4; 06 UX-R4, R-C.
Areas: `Guide.tsx`, `content/api.ts`, session copy.
Outline: glossary entries, expandable pills, optional first-hover tooltips; no solution content.
Tests: text assertions for each term; keyboard operability of pills; axe.
Done: the five S01 pills expand; each listed term has a definition.

#### MOB-1 - Mobile lab layout
P1 | Phase 6 | Depends: TYPE-1.
Goal: calibration entry readable and run action reachable at 390 px. Resolves: 06c V-1, V-2; 06b N9.
Areas: `.simulator-toolbar`, `.simulation-panel.is-3d-view`, `product-polish.css`, `workspace.css`.
Outline: wrap or scroll the toolbar; make the run action visible earlier or sticky; demote the utility row.
Tests: Playwright at 390x844 and 768x1024: "Calibrar" fully inside its panel, run action within the first scroll or sticky, no horizontal overflow; tour smoke.
Done: no clipped label; primary action reachable without scrolling past the simulator.

#### CAL-1 - Calibration threshold ownership
P1 | Phase 4 | Depends: D5.
Goal: engine and panel use the same thresholds. Resolves: 05 F2, R1; 02 C5 (calibration); 06 UX-R5.
Areas: `CalibrationPanel.tsx` L54, `S02CalibrationPanel.tsx` L76-78, `Simulator.tsx` L25, `storage.ts`.
Outline: one predicate (`usesThreeSensorCalibration`), one hook applies thresholds, storage scope per D5.
Tests: Playwright/worker-command capture with seeded S01 `[150,160,170]` and S02 `[180,190,210]` keys across S01-S05 (expected commands as in 05 F2); reference programs S04/S05 with extreme thresholds still complete.
Done: S04 and S05 apply the three-sensor key, S03 sends one value, S01 unchanged.

#### SEC-1 - Mentor solutions out of the student bundle (needs authorization for the RPC)
P1 | Phase 5 | Depends: REL-2, D3, TST-1.
Goal: solutions reach only managers. Resolves: 03 C1, R6; 07 F5, §7; 02 C3 (mentor UI split).
Areas: `CodeEditor.tsx` L13/L35, `src/content/mentor-solutions.ts`, `src/tests/runtime/mentor-solutions.test.ts`, new authenticated delivery.
Outline: expand (new RPC or endpoint checking `can_manage_cohort`), switch (lazy mentor panel fetches on demand), contract (remove static import and the solutions from the student chunk); keep the headless test fed from a non-bundled fixture.
Tests: role test (participant denied, mentor of A denied for B, mentor allowed); `grep` of the built `dist` for a solution marker returns nothing; `mentor-solutions.test.ts` green; editor chunk size drops by about 15 KB.
Done: no solution text in any student-served asset; mentor view works; D3 policy recorded. Alternative: recorded risk acceptance replaces the package.

### P2

#### CAL-2 - Calibration exit behaviour
P2 | Phase 4 | Depends: CAL-1.
Goal/Resolves: scene and feedback coherent after exit; 05 F3; 06b N7, N8.
Areas: `Simulator.tsx` L47-57, `RuntimeBar.tsx`, `useSimulation.ts` `send()`, threshold input.
Outline: reset (or enable Restablecer) on exit; confirm or label "salir sin guardar" after a passed check; inline range hint for `#student-threshold`; no "Prueba detenida" when nothing ran.
Tests: browser: S02 move robot, exit, robot at start; passed check then exit shows warning; out-of-range input shows message.
Done: three behaviours verified; save path unchanged.

#### CAL-3 - Calibration on phones
P2 | Phase 6 | Depends: CAL-1, CAL-2, MOB-1.
Goal/Resolves: action and value near the map; 06c V-5; 06b G2.
Areas: calibration panels, `workspace.css`.
Outline: compact "Sin medir" slots into one row, keep action and live value visible with the map, distinguish disabled action from slots; review steps 2-5 (not seen in 06c).
Tests: 390 px screenshots of all five steps; value and action within one screen of the map.
Done: steps 1-5 reviewed on phone.

#### FB-3 - Next step and scaffolding intent
P2 | Phase 3 | Depends: MIS-1, D6.
Goal/Resolves: students know what comes next and why guidance fades; 06b N6, G1; 06 UX-R1, R-D.
Areas: `FeedbackPanel.tsx`, `MissionPanel.tsx`, `content/sessions.ts`.
Outline: recap and next-session link after success (route differs between guest and institutional); S04/S05 idle cue or an explicit sentence; adjust S05 comments only if D6 says so.
Tests: browser guest and (after REL-3) staging; copy review by curriculum owners.
Done: D6 recorded and reflected; next step visible after completion.

#### SYNC-2 - Extract `CodeSyncController`
P2 | Phase 5 | Depends: TST-1, SEC-1.
Goal/Resolves: testable sync owner; 02 C3.
Areas: `CodeEditor.tsx`, `cloud-learning.ts`, new controller module.
Outline: framework-free controller (local doc, remote doc, revision, events in; state and actions out); `CodeEditor` subscribes; behaviour unchanged.
Tests: TST-1 matrix passes against the controller; REL-3 and guest E2E unchanged.
Done: sync decisions outside React; no behaviour diff.

#### ARCH-1 - Single owner for learning progress
P2 | Phase 5 | Depends: TST-1, SYNC-1, SYNC-2.
Goal/Resolves: one store per (cohort, session); 02 C4.
Areas: `MissionPanel.tsx`, `CodeEditor.tsx`, `storage.ts`, `cloud-learning.ts`.
Outline: store/hook exposing status, `markAttempted`, `submitMission`; remove `bitiro:mission-saved`, `bitiro:document-saved`, `bitiro:progress-changed` once unused; move the auto-submit effect out of the presentational panel.
Tests: store unit tests; REL-3 submit scenario; grep proves no listeners remain.
Done: both components consume the store; no `window` event bus.

#### ARCH-2 - Single storage-scope object
P2 | Phase 5 | Depends: CAL-1, TST-1, DB-1.
Goal/Resolves: one scope for all consumers; 02 C5, R4.
Areas: `storage.ts`, `App.tsx`, `Simulator.tsx`, calibration panels.
Outline: scope value object from the route via context; remove the regex on the scope string; centralise `activityVersion`; confine the module global to guest.
Tests: `storage.test.ts` extended; account-switch remount test; E2E scope isolation (institutional keys never read guest data).
Done: no consumer reads the global directly; `activityVersion` defined once.

#### ARCH-3 - One evidence source of truth
P2 | Phase 8 | Depends: MIS-1, TST-1, `mission-evaluation.test.ts`.
Goal/Resolves: no duplicated rules; 02 C2, R2.
Areas: `MissionEvaluator.ts`, `SimulationEngine.ts`, `FeedbackPanel.tsx`, `geometry.ts`, `finish.ts`.
Outline: engine events as sole evidence (S03 first), shared geometry helpers, derived values on the snapshot, latching in `observeTick`; resolve the 12 vs 16 cm radius explicitly.
Tests: characterization of S01-S05 outcomes before and after (reference solutions), `mission-evaluation.test.ts`, `mentor-solutions.test.ts`.
Done: identical outcomes for all reference runs; each rule exists once.

#### ARCH-4 - Per-session mission descriptor
P2 | Phase 8 | Depends: ARCH-3, ARCH-2, FB-3.
Goal/Resolves: session knowledge in one place; 02 C1; 07 §7.
Areas: `MissionEvaluator.ts`, `SimulationEngine.ts`, `actuators.ts`, `FeedbackPanel.tsx`, `Simulator.tsx`, `storage.ts`, calibration panels, `content/sessions.ts`.
Outline: incremental, S04 and S05 first behind existing tests, then tuning and copy; S06 is the first session written against it.
Tests: mission-evaluation and mentor-solution suites; browser smoke S01-S05 after each session migrates.
Done: `track.id==='sNN'` literals reduced per migrated session; no S01-S05 outcome change.

#### LOC-1 - Local draft integrity and honesty
P2 | Phase 5 | Depends: TST-1.
Goal/Resolves: 05 F4 (P2), F5, F6 (P3 parts).
Areas: `storage.ts`, `CodeEditor.tsx`.
Outline: `storage` event listener or local revision, writeability probe at mount, visible notice when a stored draft is discarded.
Tests: two-tab Playwright script from 05 (no silent loss); blocked storage shows "Sin guardar"; oversized draft shows notice.
Done: no silent overwrite; indicator truthful.

#### PRIV-1 - Shared-device privacy
P2 | Phase 5 | Depends: product choice (clear keys or document the behaviour).
Goal/Resolves: 03 R7.
Areas: `auth-service.ts` sign-out, `storage.ts`, privacy page.
Outline: clear `bitiro:v7:user:<id>` keys on sign-out or state the behaviour in the privacy text.
Tests: sign-out leaves no scoped keys (if clearing); guest keys untouched.
Done: behaviour chosen and verified.

#### DB-1 - Bound the activity-version axis (needs authorization)
P2 | Phase 1 | Depends: D1.
Goal/Resolves: 07b D1; 03 C3; 02 R4 (policy).
Areas: new forward migration on `cohort_code_documents`, `cohort_learning_progress`, `can_open_learning`, `save_my_cohort_code`.
Outline: allow-list the published versions (or remove the axis) and add a minimum-interval or no-change guard on saves.
Tests: `rls.test.mjs`: versions 2..1000 rejected, version 1 works, rapid identical saves handled; client sends 1.
Done: ceiling equals 8 sessions x 32 KiB per user per cohort.

#### DB-2 - Privilege hardening migration (needs authorization)
P2 | Phase 1 | Depends: REL-1, D1.
Goal/Resolves: 03 R1, R2, C4; 04 V1, V2, V5, L2, L5; 07b R7.
Areas: new migration, `rls.test.mjs`.
Outline: explicit revoke and RLS on `private.*` tables; `revoke execute` on `public.rls_auto_enable()` from public, anon, authenticated; revoke or drop browser grants on `code_documents` and `program_progress` (re-check row counts at apply time; both were 0 in 04); remove or confirm the facilitator read path.
Tests: DB assertions (no anon-executable `public` function, no browser privilege on `private`, legacy tables unreachable); the same query in the REL-1 live job.
Done: assertions pass in PGlite and live; no event trigger regression (`ensure_rls` still fires).

#### DB-3 - Missing indexes (needs authorization)
P2 | Phase 1 | Depends: REL-1, D1.
Goal/Resolves: 07b D3, D4 (index), §10.2.
Areas: new migration, test fixtures.
Outline: index on `workspace_access_codes(cohort_id, role, active, created_at desc)` and `institution_audit_events(cohort_id, created_at desc)`; synthetic-cohort plan check for the four mentor RPCs.
Tests: `EXPLAIN` check in PGlite; `rls.test.mjs`.
Done: both indexes exist; plan check in CI.

#### DB-4 - Bound mentor RPCs and redundant reloads (needs authorization)
P2 | Phase 7 | Depends: REL-2.
Goal/Resolves: 07b D2, D5 (requests).
Areas: `mentor_list_participants`, `mentor_cohort_learning`, `workspace-service.ts`, `WorkspacePages.tsx` L221-246.
Outline: per-participant tally server side, paging for the roster, one summary RPC for sessions+overview+invite, refresh only sessions after a toggle; expand then contract.
Tests: `rls.test.mjs` for paging and authorization; synthetic large cohort timing; mentor page E2E on staging.
Done: no raw matrix returned for the default view; toggle triggers one request.

#### PERF-1 - Asset weight
P2 | Phase 7 | Depends: none.
Goal/Resolves: 07 F2, R11.
Areas: `InteractiveIroh.tsx`, `public/brand/`, `institution.css`.
Outline: one optimised sprite or webp/avif at display size; verify references then remove the 2.7 MB unreferenced files; measure the 1.6 MB hero photo.
Tests: repeat 07 login measurement (target: well below 1.59 MB transferred); visual diff of login.
Done: login transfer reduced with identical appearance; deleted files proven unreferenced.

#### FONT-1 - Font and CSP alignment
P2 | Phase 6 | Depends: none.
Goal/Resolves: 07 F4; 06c V-6 (after).
Areas: `src/styles/global.css:1`, `institution.css` L3, L458, L721, `netlify.toml`.
Outline: self-host Poppins (as done for IBM Plex) or drop the import; add a no-console-error assertion to E2E.
Tests: E2E asserting zero console errors on landing, login, S01; re-read computed families to settle V-6.
Done: no CSP console error; V-6 either confirmed or retired.

#### A11Y-4 - Landing and auth accessibility hygiene
P2 | Phase 6 | Depends: none.
Goal/Resolves: 06 UX-5, UX-6, UX-8.
Areas: `institution.css` L1236-1254, `AuthPages.tsx`, landing footer.
Outline: pause control or static sites grid; skip link on auth pages; enabled login submit with inline error; footer link padding to 24 px; map service error text to Spanish.
Tests: axe on `/`, `/login`; keyboard pause test; target-size measurement.
Done: pause available; skip link works; footer targets at least 24 px.

#### REL-4 - Release metadata and CI wiring
P2 | Phase 1 | Depends: REL-1.
Goal/Resolves: 07 F7, R8.
Areas: `tools/release-meta.mjs`, `tools/verify-release.mjs`, `tools/visual-qa.mjs`, `ci.yml`, `netlify.toml`, `package.json`.
Outline: stop tracking `public/version.json`; hash migrations and lockfile into `sourceHash`; run `verify-release` and a chunk budget after build (initial budget from 07 baseline with headroom); align Node versions; confirm whether Netlify waits for CI.
Tests: `pnpm build` leaves a clean `git status`; budget fails on a deliberately imported Monaco in entry.
Done: checks wired and green; Netlify gating status recorded (not established today).

#### REL-5 - Stale-chunk recovery after deploy
P2 | Phase 7 | Depends: none.
Goal/Resolves: 07 R2 (verify first).
Areas: `ErrorBoundary`, lazy imports in `App.tsx`, `netlify.toml`.
Outline: reproduce with an old tab against a new build; if no reload prompt exists add one.
Tests: Playwright: serve build A, load, swap to build B, navigate lazily.
Done: result recorded; reload prompt present if needed.

### P3

#### LAB-1 - Lab chrome polish
P3 | Phase 6 | Depends: MOB-1.
Goal/Resolves: 06 UX-4, UX-7, UX-R2 (check); 06c V-4, V-11, V-12.
Areas: `SimulatorTour.tsx`, `RuntimeBar.tsx`, toolbar CSS.
Outline: tour card beside target when space allows; one status location; tooltip on disabled run ("Detener para probar otra vez"); unify help and utility buttons; measure desktop toolbar targets.
Tests: rect-intersection check of tour steps; screenshots.
Done: no card/spotlight overlap at 1440 px.

#### VIS-1 - Visual consistency polish
P3 | Phase 6 | Depends: FONT-1.
Goal/Resolves: 06c V-6 to V-10.
Areas: landing, login, header CSS.
Outline: one header definition (background, gutter, logo); one role per font family; logo treatment and placeholder copy; mobile landing nav row; login hierarchy.
Tests: screenshots at 1440 and 390 px; axe.
Done: three surfaces share header and type roles.

#### ARCH-5 - Structural hygiene
P3 | Phase 8 | Depends: TST-1.
Goal/Resolves: 02 C6, C7, R1, R3.
Areas: `App.tsx` guards, `Topbar.tsx`, `content/organizations.ts`, `content/sessions.ts`, `Simulator.tsx` fullscreen logic, `simulator.worker.ts`.
Outline: `RequireWorkspace`, organization theme lookup, `interactive` derived from the registry, `useFullscreen`, surface `configure-track` failures, relax `^s0[1-8]$` assumptions.
Tests: TST-1 routing tests; registry consistency test; "worker failure offers recovery" E2E unchanged.
Done: guard written once; flags cannot disagree.

#### PERF-2 - Bundle composition
P3 | Phase 7 | Depends: SEC-1, TST-1.
Goal/Resolves: 07 F5 (workspace part), F8, §7; 02 C7.
Areas: `App.tsx:10`, `useSimulation.ts`, `content/tracks/index.ts`.
Outline: lazy `WorkspacePages`; worker-provided first snapshot; load only the active track on each side.
Tests: bundle sizes vs 07 baseline, `verify-release`, E2E guest and staging.
Done: entry chunk smaller by about 38 KB; no duplicated engine on the main thread.

#### RT-1 - Runtime hardening
P3 | Phase 9 | Depends: TST-1; measurement first.
Goal/Resolves: 03 RT1-RT3.
Areas: `ProgramRuntime.ts`, `useSimulation.ts`, worker command handlers.
Outline: measure worst-case slice; add `performance.now()` budget, running-state liveness ping, validate `pose`/thresholds/layout payloads.
Tests: deepest-legal-program benchmark, NaN pose test, runtime suites.
Done: bounded slice time; invalid payloads rejected.

#### SEC-2 - Header and CSP tightening
P3 | Phase 7 | Depends: OPS-1, FONT-1.
Goal/Resolves: 03 C5.
Areas: `netlify.toml`.
Outline: pin `connect-src` to the project host, extend HSTS, add COOP/CORP, reduce `style-src 'unsafe-inline'` where Monaco allows; report-only first.
Tests: CSP report-only across all routes including Monaco workers; header scan.
Done: no violations in report-only; Monaco works.

#### OPS-2 - Operational hardening backlog
P3 | Phase 9 | Depends: REL-2.
Goal/Resolves: 04 L4; 03 §9.7, §9.10.
Areas: SQL, `ci.yml`.
Outline: deactivate the two expired mentor codes; RPCs to suspend or remove participants; audit failed redemptions and invite views; decide hashed codes; `pnpm audit` (non-blocking) and secret scan in CI.
Tests: `rls.test.mjs` per RPC; CI step runs.
Done: each item done or explicitly declined.

#### DB-5 - Growth control
P3 | Phase 9 | Depends: DB-3.
Goal/Resolves: 07b D4, D5 (writes), D6, R2, R8.
Areas: `redeem_workspace_code`, `save_my_cohort_code`, `mark_my_cohort_activity`, retention job.
Outline: skip audit and attempt rows when redemption changes nothing; scheduled purge; retention policy for audit tables; conditional upserts.
Tests: `rls.test.mjs` (repeat redemption writes no event; throttle intact); purge dry run.
Done: repeat redemption is a no-op; retention documented.

#### PERF-4 - Complete the performance baseline
P3 | Phase 7 | Depends: none.
Goal/Resolves: 07 R1, R3-R5, R9, §14.
Areas: measurements only; output an addendum to `07`.
Outline: 5-minute soak, throttled network/CPU, mobile, hidden-tab worker, 10 Hz re-render, CSS size, browser support (`roundRect`, module workers).
Tests: the measurements.
Done: addendum states which optimisations, if any, are justified.

## 4. Tests per package

Always run (regression guard for every package): `pnpm check` (typecheck, unit, `test:db`, `audit:design`), `pnpm build`, and `pnpm test:e2e` (guest build).
Phase-end additions:

| Layer | Used by | Notes |
|---|---|---|
| Headless suites (`mission-evaluation`, `mentor-solutions`, `src/tests/runtime/*`, `engine`, `storage`) | MIS-1, FB-1, FB-2, CAL-1, SEC-1, ARCH-3/4, RT-1 | Protected assets (08 section 2); never skip |
| `supabase/tests/rls.test.mjs` (PGlite) | REL-1, SYNC-1, DB-1..5, SEC-1, OPS-2 | Does not cover default privileges or PostgREST; always pair with live checks |
| Live checks (04 V2/V4 queries, PostgREST matrix) | REL-2, DB-2, OPS-1 | Read-only on production; destructive tests on staging only |
| Playwright guest | A11Y-1..4, FB-*, CAL-*, MOB-1, TYPE-1, LAB-1, VIS-1, FONT-1, LOC-1 | Real key events for keyboard packages |
| Playwright staging (REL-3) | REL-2, SYNC-1, SEC-1, MIS-1 (submit), FB-3, DB-4, ARCH-1 | Nightly if slow |
| axe-core 4.13.0 on `/`, `/login`, S01, S03, tour and Guide dialogs | A11Y-*, TYPE-1, GLOS-1, VIS-1 | Expect only N11 as known cosmetic |
| Bundle inspection and `verify-release` | SEC-1, PERF-1, PERF-2, REL-4 | Grep `dist` for solution markers, keys, source maps |
| Manual: screen reader pass, tablet and phone visual, fullscreen, landscape | A11Y-2, MOB-1, CAL-3 | Gaps listed in 06b section 11 |

New tests proposed above are new files under `src/tests/` and `tests/e2e/`; their exact names are not established.

## 5. Migration and deployment sequencing

Rule: database first, additive only; the deployed frontend does not call the new objects (not verified which build is live), so DB-first is backward compatible.
1. REL-1 merged in report-only mode; REL-4 wiring merged. Gate shows the known 5-vs-7 drift (expected).
2. OPS-1 confirms backups/PITR and access; D1 and D8 recorded.
3. Author the forward migrations on PGlite with tests, in this order, one file each: SYNC-1, DB-1, DB-2, DB-3. Each keeps the revoke/grant and `search_path` pattern.
4. Staging (disposable project): apply `202609190001`, `202609190002`, then the forward files. Run `rls.test.mjs`, 04 V2/V4 queries, the PostgREST matrix, then REL-3.
5. Production (authorization): apply the two repository migrations first; if forward files are not ready, they follow as soon as they pass step 4 (tables are new and empty, so the order carries no data risk; the 1000-version ceiling is open only until DB-1). Re-run V2/V4 and a function-body diff.
6. Flip REL-1 to required; mark closure in 04.
7. Frontend deploys after the DB: A11Y, MIS-1, FB, CAL packages are frontend-only and independent of steps 3-6.
8. Contract changes use expand/switch/contract: SEC-1 (new delivery, client switch, remove static import), DB-4 (new summary RPC and paging parameters with defaults, client switch, then retire the old shape).
9. After each production apply, check the Security Advisor and expect no new WARN other than the known intended RPC list.

## 6. Rollback points

| Point | After | Rollback |
|---|---|---|
| RP0 | Baseline `ffa32b4` plus audit docs | Branch reset |
| RP1 | Phase 1 code (REL-1, REL-4, TST-1) | Revert commits; no runtime effect (CI and tests only). Gate can be set back to report-only |
| RP2 | Staging migration apply | Drop and recreate the disposable staging project |
| RP3 | Production apply of 190001/190002 | Forward-fix only; new objects are additive and unused by guest flows; revert the frontend if cloud calls misbehave (editor falls back to local-only per 05 §8, source-read, not exercised) |
| RP4 | Forward migrations (SYNC-1, DB-1..3) | New forward migration restoring the previous definition; no data loss expected because tables are new |
| RP5 | Each frontend package | `git revert` of its single commit |
| RP6 | SEC-1 switch | Keep the old import until the new delivery is verified in production, then contract; restoring the import is the rollback |
| RP7 | DB-4 contract | Keep the old RPC shape until the client has run in production for one release |
| RP8 | Refactors (SYNC-2, ARCH-*) | Revert; behaviour equality tests guard each step, merge one session or one module at a time |

Before any production apply: confirm a backup or PITR point exists (not established today, 04 §5).

## 7. Final acceptance gate

All must hold before declaring the audit remediated (the first block is the rollout gate of 08 section 11):
1. REL-2 closed: REL-1 required and green; live migration list equals the repository; 04 V2/V4 re-run clean; function-body diff recorded.
2. A11Y-1, A11Y-2 verified with real keyboard events; A11Y-3 verified; one screen-reader pass recorded or listed as open.
3. MIS-1: each of S01-S05 reference solutions shows a consistent state through pass, Detener, Restablecer and rerun; institutional submit verified on staging.
4. REL-3 green on staging (login, join, save/restore, conflict, submit, mentor view) with zero console errors.
5. OPS-1 table complete; PostgREST matrix shows denial for every anon request and every `private` or legacy table.
6. SEC-1 shipped (bundle grep clean) or D3 risk acceptance recorded; D4 recorded and, if in scope, SYNC-1 verified for S03-S05.
7. P1 packages merged or each carried as a named exception: FB-1 (six unsupported cases give specific messages), FB-2, TYPE-1, GLOS-1, MOB-1, CAL-1, TST-1.
8. Full suite: `pnpm check`, `pnpm build`, `pnpm test:e2e` (guest) green; `verify-release` and chunk budget green; `git status` clean after build.
9. Section 2 controls of 08 unchanged: worker count test (one live worker), instruction-budget and runtime suites, scope isolation, CAS and monotone status tests, formative wording present.
10. Browser checks at 1440, 768 and 390 px: no horizontal overflow, no clipped controls, axe has no violation other than known N11, no console errors on landing, login, S01, S05.
11. The audit documents carry a closure status per work item (CLOSED, ACCEPTED RISK with owner, or OPEN with reason). P2/P3 items still open do not block the gate if listed.
