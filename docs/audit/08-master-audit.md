# 08 - Master audit (consolidation of documents 00-07b)

Date: 2026-10-02. Baseline: `ffa32b4` (branch `audit/claude-bitiro`). This document is a synthesis. It re-audited nothing: no
source, SQL, browser, Supabase or test was touched. Evidence is quoted from `00`, `02`, `03`, `04`, `05`, `06`, `06b`, `06c`, `07`, `07b`.
Status words: CONFIRMED (observed or read in the cited audit), RISK (plausible, not demonstrated), RECOMMENDATION (no defect shown).
Anything not supported by those documents is labelled "not established". Companion plan: `docs/audit/09-remediation-roadmap.md`.

Source-ID convention: `03 C1` = finding C1 of document 03. Work-item IDs (REL-1, MIS-1 ...) are defined here and reused by 09.
Tests and definition of done for every work item are in 09 under the same ID.

## 1. Executive assessment

**Is BITIRO fundamentally sound? Yes.** Four independent audits (architecture, static security, live security, reliability) found no critical
issue and no boundary that must be rebuilt. The three hardest boundaries are well drawn: React / Web Worker, runtime / engine, browser / Supabase
(02 S1-S6). Authorization is RPC-only, `SECURITY DEFINER` with `search_path=''`, derived from `auth.uid()` (03 P1-P12, confirmed live in 04 V1-V3).
The simulator lifecycle survived about 30 scripted scenarios with zero console errors, one live worker after rapid switching and clean recovery (05 §1).

**What actually needs fixing** is concentrated in three places, none of them the core engine:
1. **Release and schema sync (P0).** Live Supabase lacks migrations `202609190001` and `202609190002`; nothing in CI or deploy can detect it (07 F1, 04 L1).
   Every institutional cloud path (code sync, release gating, mission submit, mentor learning view) depends on objects absent from the live project.
2. **The student-facing state layer (P0/P1).** A passed mission can show "superado" and "0/4" at once (06b N1); the tutorial modal lets Tab edit the
   student's code and Monaco traps keyboard users (06 UX-1, 06b N5); diagnostics for unsupported constructs point to the wrong problem (05 F1).
3. **Session knowledge spread through shared code (P2, but a cost multiplier).** Every new session adds `track.id` branches to shared classes (02 C1).

**What can wait:** all scalability items (07b), visual polish (06c), CSP tightening, bundle composition, retention, most architecture refactors.
**What must not be broken:** section 2. **Biggest blind spot:** every browser audit ran the guest build; the institutional path that real students
use (login, workspace, cloud sync, release gate, mission submit, mentor view) was never exercised by any audit (05 §8, §11; 06 §12; 07 F3).

Inventory: 45 consolidated work items grouped by root cause from the findings, risks and recommendations of ten audit documents: **P0 = 5, P1 = 12, P2 = 19, P3 = 9**. No source finding was rated critical.

### 1.1 Reconciliation decisions (later evidence overrides earlier uncertainty)

| Topic | Earlier statement | Later evidence | Used here |
|---|---|---|---|
| Private-schema privileges | 03 R1 open `[LIVE]` | 04 V1: no browser privilege on `private.*`, no default ACL | Closed for privileges; explicit revoke/RLS kept as hardening (DB-2). "Exposed schemas" setting still NOT VERIFIED |
| Function EXECUTE defaults | 03 R2 open | 04 V2: all 12 repo RPCs correct; `public.rls_auto_enable()` anon-executable, not in repo | R2 closed for repo functions; new low item L2 in DB-2 |
| SECURITY DEFINER owner | 03 R5 open | 04 V3 closed | Closed |
| Legacy tables (03 C4) | Exploitability depends on data | 04 V5: both tables 0 rows, 0 admin, 0 facilitator | Downgraded to latent hygiene (DB-2) |
| Migration count | 03: "6 migrations" | 04 V4: repo has 7 | 7 |
| Drift | 03 §8.1 unknown | 04 V4/L1 live has 5 of 7; 07 F1 turns it into a process gap | Drift CONFIRMED (as of 04 run, same day; not re-verified since) |
| Cohort-learning guarantees (03 C2, C3, P4, P6, P12) | Described as live | 04 V4: objects not live | Valid for next deployment, not current live exposure |
| Cloud storage growth | 03 C3 low; 07 unsure of history | 07b D1 medium; confirms no revision history, 1000x version ceiling | Storage ceiling issue kept as DB-1 (P2) |
| Mentor solutions | 03 C1 medium; 07 F5 low | 07 F5 says disclosure rating stays with 03 | One item SEC-1 (P1); bundle size is a consequence, not a second finding |
| Objectives visible | 06 §4 "yes" | 06b G1: collapsed by default in all sessions | Corrected: count visible, wording needs a click |
| UX-R3 / UX-R4 / UX-R7 | RISK | 06b: CONFIRMED (N5, N4, review wording) | CONFIRMED |
| UX-4 tour overlap | CONFIRMED desktop | 06b: did not reproduce at 390 px | Desktop-only, P3 |
| S04/S05 generic idle guidance | RISK "scaffolding fades" | 06b: scaffolding remains in code comments; only card differs | Half true; intent decision needed (FB-3) |
| 05 F3 stale scene | CONFIRMED by DOM | 06b adds visual evidence | Same item, not double counted (CAL-2) |
| Poppins | 06c V-6 reports Poppins on landing | 07 F4: CSP blocks the Google Fonts import, Poppins never applies | NOT reconciled: 06c likely read declared family; confirm after FONT-1 |
| 02 C1 "HIGH" | Architecture-high | Affects maintenance and regression surface, not access, integrity, correctness or release today | Reclassified P2 (do before S06) |
| 06c "5 medium" | Visual items | V-1, V-2 are layout defects; V-3 same root as 06 UX-2 | Merged into MOB-1 and TYPE-1 |

## 2. What is already strong (and must not be broken)

Break-risk column names the work items most likely to touch the control.

| Control to preserve | Evidence | Break-risk |
|---|---|---|
| Worker lifecycle: one worker per session, `requestId` staleness, 10 s deadlines, terminate on cleanup, thin dispatcher | 02 S1; 05 §4 (24 created / 23 terminated) | PERF-2, ARCH-3/4, RT-1 |
| Runtime pipeline and adapter seam; instruction budget 8000; four-layer 32 KiB source limit; no host access from interpreter | 02 S2; 03 §6 | RT-1, FB-1, ARCH-4 |
| Headless deterministic core and its tests (`mission-evaluation.test.ts`, `mentor-solutions.test.ts`, runtime tests) | 02 S3 | SEC-1 (solutions move), ARCH-3, ARCH-4 |
| Tracks as data behind one registry | 02 S4 | PERF-2, ARCH-4 |
| Single Supabase boundary, browser never authority, RPC-only, revoke/grant pattern, `search_path=''` | 02 S5; 03 P2-P3 | every migration (SYNC-1, DB-1..5, SEC-1) |
| CAS code writes, monotone progress (`completed`/`attempted` never downgrade), 32 KiB / 8 KiB limits | 03 P6, P12; 07b §9 | SYNC-1, DB-1, DB-5, ARCH-1 |
| Redemption hardening: generic error, per-user throttle persisted by returning not raising, `FOR UPDATE` on code | 03 P8 | DB-5 |
| Storage isolation: scoped keys, institutional scopes never import guest data, tree remount on user change | 02 S6; 03 P16 | CAL-1, ARCH-2, PRIV-1 |
| Defensive local storage: try/catch reads, validation, corrupt data never blocks the editor | 05 §5, §9 | LOC-1, ARCH-2 |
| Formative honesty: evidence typed `formative_client_simulation`; UI says "autoevaluado ... no equivale a calificacion"; mentor label "autoevaluacion" | 02 S8; 03 P17; 06b §7 | MIS-1, SYNC-1, FB-3 |
| Lazy boundaries (Monaco, simulator, auth, admin), no source maps, immutable hashed assets, `script-src 'self'` | 07 §11; 03 P19 | PERF-2, SEC-2, FONT-1 |
| `safeNext` allowlist, PKCE, generic auth errors, no `dangerouslySetInnerHTML`/`eval` | 03 P13-P18 | A11Y-4, OPS-1 |
| Pedagogy: objectives and starters hint without answering; calibration makes the student choose the threshold ("no hay una unica respuesta correcta"); S03 running card with live counters; errors in Spanish with line/column and Monaco marker | 06 §10; 06b §3, §7; 05 §4 | FB-1, FB-2, CAL-1/2, MIS-1 |
| Accessibility base: skip link, landmarks, labelled auth forms, `aria-live` feedback, canvas alt text, visible 3 px focus ring, global reduced-motion, native `details`, no horizontal overflow at 390/768/1440 | 06 §5.1; 06b §5 | TYPE-1, MOB-1, LAB-1, VIS-1 |

## 3. Consolidated findings by priority

Fields per item: root cause, source IDs, components, fix, prerequisite. Priority rules: P0 = can corrupt/expose student work, block a major
accessibility path, invalidate mission completion or learning feedback, cause frontend/schema incompatibility, or be a serious security issue.
Tags: C = confirmed, R = risk, Rec = recommendation. Timing in 09 can differ from priority when a dependency forces it.

### P0 - before broader student or institutional rollout (5)

**REL-1 Migration-parity and RPC-contract gate** [P0, C]
Root cause: frontend and database ship through independent pipelines; no step in `ci.yml`, `netlify.toml`, `package.json` or `tools/` knows the live schema, and `rls.test.mjs` lists migrations by hand. Sources: 07 F1, F6, §8 guards 1-4; 04 V4, L1, §6.6; 03 §8.1. Components: `.github/workflows/ci.yml`, `tools/`, `public/version.json`, `supabase/tests/rls.test.mjs`.
Fix: CI job comparing local migration versions with the linked project's applied history (read-only token), nightly run, static test that every `.rpc('name')` in `src/features/**` exists in migrations and live `pg_proc`, `requiredMigration` in the release manifest, and `rls.test.mjs` reading the directory. Prereq: authorization for a read-only CI secret; start report-only.

**REL-2 Reconcile live schema with the repository** [P0, C]
Root cause: live project has 5 of 7 migrations; missing `cohort_code_documents`, `cohort_learning_progress`, `get_my_cohort_learning`, `save_my_cohort_code`, `mark_my_cohort_activity`, `submit_my_formative_mission`, `mentor_cohort_learning`, `private.can_open_learning`. Sources: 04 V4, L1; 07 F1; 05 §8; 07b §11. Components: Supabase project, `cloud-learning.ts`, `CodeEditor.tsx`, `MissionPanel.tsx`, `InstitutionSessionRoute`, `workspace-service` (degradation by source reading, not exercised). Which frontend build is deployed: not established.
Fix: staged apply (staging first, then production) under explicit authorization; re-run 04 V2 and V4; review `can_open_learning` and grants after apply; diff function bodies and policy expressions of the five applied migrations (04 V4 says not done). Prereq: REL-1 (report-only), backups confirmed (OPS-1), migration-amendment decision.

**MIS-1 Mission completion state integrity** [P0, C for S03; S01/S02/S04/S05 not verified]
Root cause: `MissionPanel.tsx` L22 drives the icon, card and "Superada" label from latched `evidence.status==='completed'` while the counter reads live `checks.passed`; completion is not terminal (program keeps "Ejecutando" 286 s) and evidence resets on stop, so "superado" and "0/4" coexist; stopped, passed and reset are indistinguishable. Sources: 06b N1, N2, G7; 02 R2 (latching inside `evaluate()`). Components: `MissionPanel.tsx`, `FeedbackPanel.tsx`, `MissionEvaluator.ts`, `SimulationEngine.snapshot()`, `RuntimeBar.tsx`. Severity HIGH retained: it undermines the only signal that the learning goal was met.
Fix: derive badge, card and counter from one value; explicit states "Superada en este intento / Detenida / Reiniciada"; decide stop-or-freeze at completion; preserve the auto-submit trigger and its `submitted` guard. Prereq: decision D2 (09 phase 0).

**A11Y-1 Tour dialog focus management** [P0, C]
Root cause: `SimulatorTour.tsx` is `role="dialog" aria-modal` but never moves focus, traps Tab, sets `inert`, or restores focus; `.sim-tour-guard` is `aria-hidden` and only blocks pointer events. Sources: 06 UX-1; 06b G4 (also when reopened via "Tutorial"); 05 R5. Evidence: 36 Tab presses left 74 spaces in line 1 and the damaged code was persisted. Components: `SimulatorTour.tsx`, app root.
Fix: focus heading or first button on open, trap Tab, `inert` background, restore focus, show "Flechas para navegar, Esc para cerrar". Prereq: none.

**A11Y-2 Monaco keyboard trap** [P0, C; screen-reader behaviour not verified]
Root cause: Tab indents; Shift+Tab, Esc+Tab and Ctrl+M+Tab left focus in the textarea; `CodeEditor.tsx` sets no `tabFocusMode`/accessibility option and the UI hints no exit (WCAG 2.1.2). Sources: 06b N5, G4; 06 UX-R3. Caveat: Ctrl+M was a synthetic key. Components: `CodeEditor.tsx` (Monaco options), editor toolbar.
Fix: keep Tab-indent for coding but add a visible, announced keyboard-navigation toggle or documented exit; check with real key events and one screen-reader pass. Prereq: decision D7.

### P1 - fix soon (12)

**FB-1 Diagnostics for unsupported constructs** [P1, C]
Root cause (likely, parser files not read): unknown type tokens parse as expression statements so the first missing terminator is reported; an unclosed brace surfaces only at the next top-level declaration ("Una variable no puede ser void"). Sources: 05 F1 (21 review cases), 06 §7. Components: `src/simulator/runtime/parser/` (Parser, validate).
Fix: dedicated "no soportado en este simulador" messages for `String`, `boolean`, `unsigned`, arrays, `do`; unclosed-brace check; parser tests per case. Prereq: none.

**FB-2 Honest run-time and review feedback** [P1, C]
Root cause: running card is generic and replaces the stimulus reminder; no inactivity hint; "Revisar codigo" returns the same green message for an untouched starter and a correct program. Sources: 06 UX-3, UX-R7; 06b G1 (extends to S02, confirms R7 for S02-S05); 06 R-A. Components: `FeedbackPanel.tsx`, `LearningFeedbackEngine.ts` (18 lines), review message in `Simulator.tsx`/`RuntimeBar.tsx` (exact file not established).
Fix: after N seconds with no actuator command show a non-answer hint; keep the stimulus reminder while unset; separate "sin errores de sintaxis" from "cumple la mision". Prereq: MIS-1 (same state source).

**TYPE-1 Readable minimum for instructional text** [P1, C]
Root cause: deliberate 8-9.5 px "instrument" style applied to the pedagogical text (feedback card 8.4 px, goals 8.7 px, run buttons 9.5 px, calibration 7.5-8.5 px); heading skip h1-h3 on the feedback card. Sources: 06 UX-2; 06c V-3; 06b G2, N10. Components: `src/styles/product-polish.css` L153, `workspace.css` L2-8, `FeedbackPanel.tsx`, calibration panels.
Fix: one intermediate type step (>=12 px) for feedback, goals, run labels, calibration text; keep decoration small; change h3 to h2 together with the selector. Prereq: none.

**A11Y-3 Guide focus return** [P1, C]
Root cause: after Escape or "Cerrar guia", `document.activeElement` is `BODY` instead of the opener. Sources: 06b N3, G3. Components: `Guide.tsx`, `button.guide-button`.
Fix: restore focus to the opener on close. Prereq: none.

**GLOS-1 Concept definitions at first contact** [P1, C]
Root cause: Guide documents calls, not concepts; ADC, pulsador, estimulo, sonar absent; five S01 pills are inert spans. Sources: 06b N4, G1; 06 UX-R4, R-C. Components: `Guide.tsx`, `src/content/api.ts`, session copy.
Fix: short glossary entries, expandable pills, first-hover tooltips. Prereq: A11Y-3 (same file).

**MOB-1 Mobile lab layout** [P1, C]
Root cause: on 390 px the toolbar overflows a `overflow:hidden` panel ("Calibrar" clipped to "Cali", scrollWidth 393 vs 364) and the primary run action sits at page y=1579 of 1670. Sources: 06c V-1, V-2; 06b N9, G5; 06 UX-7 (phone measure). Components: `.simulator-toolbar`, `.simulation-panel.is-3d-view`, `product-polish.css`, `workspace.css`.
Fix: wrap or scroll toolbar, surface the run action (sticky or earlier), demote utility row. Prereq: TYPE-1 (size changes affect wrapping).

**CAL-1 Calibration threshold ownership** [P1, C]
Root cause: two calibration hooks mounted side by side with different track predicates; S04/S05 engine receives the S01 key while the panel shows and saves the three-sensor key; calibration is stored under the user scope instead of `user|cohort|activity`. Sources: 05 F2, R1; 02 C5 (calibration part); 06 UX-R5. Impact on checks not demonstrated. Components: `CalibrationPanel.tsx` L54, `S02CalibrationPanel.tsx` L76-78, `Simulator.tsx` L25, `storage.ts`.
Fix: one predicate (`usesThreeSensorCalibration`), apply thresholds from one hook, regression test with extreme stored values across S01-S05. Prereq: decision D5 (sharing across cohorts).

**SEC-1 Mentor solutions out of the student bundle** [P1, C]
Root cause: `mentor-solutions.ts` (S01-S05, 15.4 KB) is statically imported by `CodeEditor.tsx` L13 and gated only by `mentorMode`, a client flag. One root cause across security, architecture and performance. Sources: 03 C1, R6; 07 F5, §7; 02 C3 (split mentor UI). Components: `CodeEditor.tsx`, `src/content/mentor-solutions.ts`, `mentor-solutions.test.ts`, new authenticated delivery.
Fix: serve through an RPC/endpoint checking `can_manage_cohort` (expand, switch, then remove the import); extract a lazy mentor panel; keep the headless test working; decide policy for unreleased starter/guide content. Prereq: REL-2, decision D3; acceptable alternative is a recorded risk acceptance for the pilot.

**SYNC-1 Formative submission contract** [P1, C by source reading; not exercised]
Root cause: `submit_my_formative_mission` accepts only `s01`/`s02` and exactly four checks while the client submits S03-S05 and `cloud-learning.ts` hardcodes `checks.length!==4`; the mentor RPC returns forgeable `completed` indistinguishable from `attempted` in kind, and a migration comment ("No client-writable completed") is stale. Sources: 03 C2 and note; 07b §5; 02 C4. Components: `202609190002_formative_missions.sql`, `cloud-learning.ts`, `MissionPanel.tsx`, `mentor_cohort_learning`, mentor UI.
Fix: forward migration accepting the sessions that have missions; completion rule in the mission contract; expose `evidence_kind`; fix the comment; never use for grades. Prereq: TST-1, decisions D1, D4.

**TST-1 Safety net for sync, hook, worker and routing** [P1, C coverage gap]
Root cause: strong headless tests, but `cloud-learning`, `CodeEditor` sync, `useSimulation`, the worker dispatcher and `App` routing have no tests; vitest runs in node. Sources: 02 R5, R-A; 07 F3; 05 R3. Components: `src/tests/`, `cloud-learning.ts`, `useSimulation.ts`, `simulator.worker.ts`, `content/tracks/index.ts`.
Fix: characterization tests for the conflict matrix, requestId staleness and deadlines, registry consistency (`interactive` vs `hasSimulation`). Component tests need jsdom or a testing library (new dev dependency: authorization required). Prereq: none.

**REL-3 Institutional path E2E on staging** [P1, C]
Root cause: `tools/run-e2e.mjs` forces empty Supabase env, so only the guest build is tested; the production bundle differs (`index-DiKNq9HB.js` vs `index-DierV_6U.js`). Sources: 07 F3; 05 §11; 06 §12; 02 R5. Components: `tools/run-e2e.mjs`, `tests/e2e/`, `ci.yml`.
Fix: staging-Supabase job with seeded accounts: login, join by code, open S01, save/restore, mission submit, mentor view; assert console cleanliness. Prereq: REL-2 on staging, disposable project, secrets.

**OPS-1 Auth and project settings verification** [P1, RISK open]
Root cause: dashboard-only settings were not visible to the MCP. Sources: 04 V7, L3, §5; 03 R3, R4, §8, §10. Items: Site URL, redirect allowlist, email confirmation, secure password change, OTP/recovery expiry, password minimum, CAPTCHA/rate limits, admin MFA, "Exposed schemas", Edge Functions/hooks/webhooks, backups/PITR, code entropy (dashboard), live headers, leaked-password protection (CONFIRMED disabled, low), admin bootstrap.
Fix: checklist run and recorded; enable leaked-password protection; PostgREST role matrix on staging. Prereq: dashboard access; REL-2 for the matrix.

### P2 - important improvement (19)

**CAL-2 Calibration exit behaviour** [P2, C]
Root cause: `toggleCalibration` exit does not send `reset` (`finishCalibration` does); `canReset` needs `programLoaded`; stop message set when nothing ran; exit discards a passed calibration silently; no inline range message. Sources: 05 F3; 06b N7, N8. Components: `Simulator.tsx` L47-57, `RuntimeBar.tsx`, `useSimulation.ts` `send()`, threshold input.
Fix: reset or enable Restablecer on exit, confirm or label "salir sin guardar", inline range hint, no "Prueba detenida" without a run. Prereq: CAL-1.

**CAL-3 Calibration on phones** [P2, C]
Root cause: map y 314-722, step action at y 1336, live value at y ~1016; empty "Sin medir" slots dominate; disabled action shares the slot grey. Sources: 06c V-5; 06b G2. Steps 2-5 not seen. Components: calibration panels, `workspace.css`.
Fix: compact empty slots, keep action and value beside the map. Prereq: CAL-1, CAL-2, MOB-1.

**FB-3 Next step and scaffolding intent** [P2, C/R]
Root cause: no next-session link or recap after success; S04/S05 show a generic idle card with no sentence explaining the fade; S05 starter comments state the base mapping (curriculum judgement). Sources: 06b N6, G1; 06 UX-R1, R-D. Institutional next-step not verified. Components: `FeedbackPanel.tsx`, `MissionPanel.tsx`, `content/sessions.ts`.
Fix: session-specific idle cue or stated intent; recap and next-session link. Prereq: MIS-1, decision D6.

**SYNC-2 Extract `CodeSyncController`** [P2, C]
Root cause: `CodeEditor.tsx` (232 dense lines) owns Monaco, debounce, CAS revision, conflict, progress and mentor UI in effects and closures. Sources: 02 C3. Components: `CodeEditor.tsx`, `cloud-learning.ts`.
Fix: framework-free controller with a unit-tested conflict matrix; behaviour unchanged. Prereq: TST-1, SEC-1.

**ARCH-1 Single owner for learning progress** [P2, C]
Root cause: status split between `CodeEditor` and `MissionPanel`, joined by `window` event `bitiro:mission-saved`; `MissionPanel` auto-submits in an effect; `bitiro:document-saved`/`progress-changed` have no listeners. Sources: 02 C4. Components: `MissionPanel.tsx`, `CodeEditor.tsx`, `storage.ts`, `cloud-learning.ts`.
Fix: one store/hook per (cohort, session); remove dead events. Prereq: TST-1, SYNC-1, SYNC-2.

**ARCH-2 Single storage-scope object** [P2, C]
Root cause: module-level `currentScope` plus explicit scope for code only; regex on the scope string in `Simulator.tsx`; `activityVersion:1` literal in `App.tsx` and `workspaceStorageScope`. Sources: 02 C5, R4. Components: `storage.ts`, `App.tsx`, `Simulator.tsx`, calibration panels.
Fix: scope value object from the route, centralised activity version. Prereq: CAL-1, TST-1, DB-1.

**ARCH-3 One evidence source of truth** [P2, C]
Root cause: S02 base choice computed three times, S03 intersection derived in engine (12 cm) and evaluator (16 cm), geometry re-implemented in five evaluator places, domain states decided in `FeedbackPanel`; `evaluate()` mutates `completed`. Sources: 02 C2, R2. Components: `MissionEvaluator.ts`, `SimulationEngine.ts`, `FeedbackPanel.tsx`, `geometry.ts`, `finish.ts`.
Fix: engine events as sole evidence, shared geometry, derived values on the snapshot, latching in `observeTick`. Prereq: MIS-1, characterization of S01-S05 outcomes, decision on authoritative radius.

**ARCH-4 Per-session mission descriptor** [P2, C]
Root cause: 67 `'s0N'` literals in 15 files; evaluator holds about 45 per-session fields; S06 would touch 10-14 shared files. Sources: 02 C1, §5; 07 §7. Components: `MissionEvaluator.ts`, `SimulationEngine.ts`, `actuators.ts`, `FeedbackPanel.tsx`, `Simulator.tsx`, `storage.ts`, calibration panels, `content/sessions.ts`.
Fix: incremental, S04/S05 first, then tuning and copy into descriptors; S06 first session written against it. Prereq: ARCH-3, ARCH-2, FB-3.

**LOC-1 Local draft integrity and honesty** [P2 for F4, P3 for F5-F6; C]
Root cause: no `storage` event or revision on the local document (last writer wins across tabs, institutional mode too for the local key); initial `saveState='saved'`; invalid stored drafts replaced silently. Sources: 05 F4, F5, F6. Components: `storage.ts`, `CodeEditor.tsx`.
Fix: `storage` listener or revision, writeability probe, notice when a draft is discarded. Prereq: TST-1.

**PRIV-1 Shared-device privacy** [P2, R]
Root cause: `signOut` uses `scope:'local'` and student source/calibration stay in `localStorage`. Sources: 03 R7. Components: `auth-service.ts`, `storage.ts`, privacy page.
Fix: clear scoped keys on sign-out or document it. Prereq: decision on desired behaviour; ARCH-2 soft.

**DB-1 Bound the activity-version axis** [P2, C]
Root cause: `activity_version` accepts 1..1000 in the primary key, client sends 1; any cohort member can store up to about 250 MiB; no save-rate guard. Sources: 07b D1; 03 C3; 02 R4. Components: `202609190001_cohort_learning.sql`, `save_my_cohort_code`, `can_open_learning`.
Fix: allow-list or drop the axis, minimum interval or no-change guard. Prereq: decision D1; fix before real use.

**DB-2 Privilege hardening migration** [P2, C hygiene]
Root cause: safety of `private.*` rests on implicit defaults; `rls_auto_enable()` anon-executable and not in repo; legacy tables keep browser CRUD and a facilitator read path. Sources: 03 R1, R2, C4; 04 V1, V2, V5, L2, L5; 07b R7. Components: new migration, `rls.test.mjs`.
Fix: explicit revoke and RLS on `private.*`, revoke execute on `rls_auto_enable`, revoke or drop legacy grants (re-check counts at apply time), DB assertions "no anon-executable function in `public`, no browser privilege on `private`". Prereq: REL-1, F6 part of REL-1.

**DB-3 Missing indexes** [P2, C]
Root cause: no index on `workspace_access_codes(cohort_id,...)` or `institution_audit_events(cohort_id,created_at)`. Sources: 07b D3, D4, §10.2. Components: new migration.
Fix: composite indexes; plan-regression check on a synthetic cohort. Prereq: REL-1 (test list).

**DB-4 Bound mentor RPCs and redundant reloads** [P2, C low]
Root cause: roster and learning matrix return the whole cohort in one jsonb; a release toggle reloads five RPCs; cohort size has no schema cap. Sources: 07b D2, D5. Components: `mentor_list_participants`, `mentor_cohort_learning`, `workspace-service.ts`, `WorkspacePages.tsx`.
Fix: server-side tally plus paging, one summary RPC, refresh only sessions after a toggle (expand/contract). Prereq: REL-2.

**PERF-1 Asset weight** [P2, C]
Root cause: login loads 15 mascot layers (1.27 MB, 81% of the page); 2.7 MB of `public/brand` has no reference found by grep; 1.6 MB hero photo unmeasured. Sources: 07 F2, R11. Components: `InteractiveIroh.tsx`, `public/brand/`, `institution.css`.
Fix: single optimised sprite or webp/avif, verify references before deleting. Prereq: none.

**FONT-1 Font and CSP alignment** [P2, C]
Root cause: `global.css:1` imports Google Fonts, blocked by `style-src`/`font-src 'self'`; one console error per page, Poppins never applies. Sources: 07 F4; 06c V-6, R-1. Components: `global.css`, `institution.css`, `netlify.toml`.
Fix: self-host Poppins or remove the reference; assert console cleanliness in E2E. Prereq: none.

**A11Y-4 Landing and auth accessibility hygiene** [P2, C]
Root cause: marquee without pause control (WCAG 2.2.2), no skip link on auth pages, login submit disabled without explanation, footer links 16 px high; `err.message` shown verbatim (R). Sources: 06 UX-5, UX-6, UX-8. Components: `institution.css`, `AuthPages.tsx`, landing footer.
Fix: pause control or static grid, skip link, enabled submit with inline error, padding. Prereq: none.

**REL-4 Release metadata and CI wiring** [P2, C]
Root cause: `pnpm build` rewrites tracked `public/version.json`; `sourceHash` covers `src/` only; `verify-release.mjs` and `visual-qa.mjs` are unwired; CI Node 24 vs Netlify Node 22; Netlify gating on CI not visible. Sources: 07 F7, R8, §12.4. Components: `tools/release-meta.mjs`, `tools/verify-release.mjs`, `ci.yml`, `netlify.toml`.
Fix: untrack `version.json`, hash migrations and lockfile, run `verify-release` and a chunk budget after build, align Node. Prereq: REL-1.

**REL-5 Stale-chunk recovery after deploy** [P2, R]
Root cause: hashed chunks missing after deploy return 404; whether `ErrorBoundary` or `lazy` failure offers reload is unverified. Sources: 07 R2. Components: `ErrorBoundary`, `App.tsx` lazy imports, `netlify.toml`.
Fix: verify; add reload prompt if absent. Prereq: none.

### P3 - polish and technical debt (9)

**LAB-1 Lab chrome polish** [P3, C] Root cause: tour card placement by target mid-height (desktop), run controls split across panels with no disabled-state explanation, duplicate status labels, mixed help/utility button styles, canvas crop. Sources: 06 UX-4, UX-7; 06c V-4, V-11, V-12; 06 UX-R2 (risk). Components: `SimulatorTour.tsx`, `RuntimeBar.tsx`, toolbar CSS. Fix: card beside target, one status location, tooltip on disabled run, unify buttons. Prereq: MOB-1.
**VIS-1 Visual consistency polish** [P3, C] Root cause: header gutters 36/49/16 px, logos grayscale with placeholder copy, mobile landing nav row and card/mascot overlap, login hierarchy. Sources: 06c V-6 to V-10. Components: landing, login, header CSS. Fix: one header definition, one role per font family. Prereq: FONT-1.
**ARCH-5 Structural hygiene** [P3, C/R] Root cause: guard logic copied in five `App.tsx` routes, hardcoded `mustakis` theme, `interactive` vs `hasSimulation`, duplicated fullscreen logic, swallowed worker `configure-track` errors, `^s0[1-8]$` and numeric gating. Sources: 02 C6, C7, R1, R3. Fix: `RequireWorkspace`, organization theme lookup, derive flags from the registry, `useFullscreen`. Prereq: TST-1.
**PERF-2 Bundle composition** [P3, C] Root cause: `WorkspacePages` (38 KB) in the entry chunk; engine and all five tracks duplicated in `Simulator` chunk and worker; main thread builds two engines for an initial snapshot. Sources: 07 F5, F8, §7; 02 C7. Fix: lazy route, worker-provided first snapshot, active-track loading. Prereq: SEC-1, TST-1.
**RT-1 Runtime hardening** [P3, R] Root cause: instruction cap is per slice, no time budget, no running-state watchdog, `pose` NaN not rejected. Sources: 03 RT1-RT3. Fix: measure worst case first, then `performance.now()` budget, liveness ping, payload validation. Prereq: TST-1.
**SEC-2 Header and CSP tightening** [P3, C low] Root cause: `style-src 'unsafe-inline'`, wildcard `*.supabase.co` in `connect-src`, thin HSTS, no COOP/CORP. Sources: 03 C5. Fix: pin host, extend HSTS, add COOP after Monaco test. Prereq: OPS-1 (live headers), FONT-1.
**OPS-2 Operational hardening backlog** [P3, Rec] Items: deactivate two expired mentor codes still `active` (04 L4), suspend/remove-participant RPCs, audit failed redemptions and invite views, decide hashed codes, `pnpm audit` and secret scan in CI (03 §9.7, §9.10). Prereq: REL-2.
**DB-5 Growth control** [P3, C low] Root cause: repeat redemption by a member appends audit rows and escapes the throttle; attempts/rate-limit rows and audit tables have no retention; save/mark RPCs rewrite unchanged rows. Sources: 07b D4, D5, D6, R2, R8. Fix: skip no-op redemptions, scheduled purge, conditional upserts, retention policy. Prereq: DB-3.
**PERF-4 Complete the performance baseline** [P3, R] Root cause: soak (19 s of 5 min), throttled network/CPU, mobile, hidden-tab worker ticking, 10 Hz re-render, 289 KB blocking CSS, browser support (`roundRect`, module workers). Sources: 07 R1, R3-R5, R9, §14. Fix: measure first; optimise only on evidence.

## 4. Security posture

Verdict: sound for a pilot; no critical or high finding. Nothing in the audits shows data exposure today.
- **Design (03):** RLS on every table, browser grants revoked on cohort tables, RPCs re-derive `auth.uid()`, roles only from tables, redemption throttled and race-safe, source never returned to mentors (P7).
- **Live (04):** `private.*` closed to browser roles (V1), all 20 definer functions owned by `postgres` with pinned `search_path` (V3), no `admin`/`facilitator` and empty legacy tables (V5). Live data is small (2 users, 3 codes): a pre-pilot instance.
- **Confirmed issues:** SEC-1 mentor solutions in the bundle (medium); DB-1 storage ceiling (medium per 07b, low per 03; P2 because it needs a valid code and costs storage only); SYNC-1 forgeable `completed` (low, documented as formative); `rls_auto_enable` anon-executable (low, return type `event_trigger` makes exploitation very unlikely, not invoked); leaked-password protection off (low); latent legacy surface; CSP gaps (low).
- **Not live yet:** the cohort-learning guarantees (CAS, release gate, monotone status, mentor RPC) exist only in the repository until REL-2.
- **Open:** Auth settings (R4), CAPTCHA and code entropy (R3), exposed schemas, Edge Functions/hooks, shared-device privacy (PRIV-1), policy for unreleased content (R6).
- **Caveat:** 04 ran as a privileged role and answered from privilege functions, not HTTP; the PGlite suite does not cover default privileges, PostgREST exposure or hosted rate limits. The real-token PostgREST matrix (04 §6.1) is still pending.
- **Runtime:** no sandbox escape found statically (03 §6); dynamic fuzzing and worst-case CPU not done (RT-1).

## 5. Reliability and educational correctness

- **Solid:** lifecycle, recovery, error reporting and defensive storage (05). Clean console and network across about 30 scenarios.
- **Educationally risky today:** MIS-1 (state contradiction), FB-1 (wrong-problem diagnostics, "likeliest source of frustration" for beginners), FB-2 (empty program reads as success), CAL-1 (formative evidence can use a different threshold than the panel shows; effect on checks not demonstrated).
- **Coverage gap:** only S03 was completed in a browser (06b G7). S01, S02, S04, S05 completion, S01-S05 mission mechanics, and the institutional submit were not exercised. They are covered headless by `mission-evaluation.test.ts` and `mentor-solutions.test.ts`, which no audit ran; per CLAUDE.md a passing test does not prove pedagogical correctness.
- **Duplicated rules (ARCH-3):** S03 intersection radius 12 cm in engine vs 16 cm in evaluator is a documented divergence; effect on outcomes not demonstrated.
- **Formative framing is a strength** and must survive any change to submission (SYNC-1, MIS-1).

## 6. Accessibility and UX

- **Strengths:** section 2. axe-core 4.13.0 on landing and login: 0 violations; S01: 2 (heading order, one cosmetic Monaco line-number contrast 1.96:1, N11, no action). Manual contrast check found no failing text.
- **Blocking:** A11Y-1 and A11Y-2 (keyboard users cannot reach tutorial buttons, Tab edits code, Monaco traps focus).
- **Material:** TYPE-1 (8-9.5 px instructional text for students aged roughly 12-17), A11Y-3, GLOS-1, MOB-1.
- **Lower:** CAL-2/3, A11Y-4 (marquee is WCAG 2.2.2 level A on a decorative landing element), LAB-1, VIS-1. UX-R6 (reduced motion removes spotlight continuity) was judged harmless by 06.
- **Not verified:** screen-reader behaviour, forced colors, text spacing, tablet visual review, fullscreen, landscape, virtual keyboard over Monaco, touch orbit, mentor/workspace UX, auth flows beyond `/login`, Guide terminology across S02-S05 (06 §12, 06b §11, 06c §6).

## 7. Architecture and maintainability

Layering is right; knowledge distribution is the weakness (02 §1). Extending cost: new session 10-14 files (high), new mission type high, new robot capability medium, new API function low, new track low (02 §5).
Sequence respecting "diagnose first": safety net (TST-1), then sync controller and progress store (SYNC-2, ARCH-1), scope object (ARCH-2), single evidence source (ARCH-3), session descriptors (ARCH-4, before S06), hygiene (ARCH-5). Style note: very long single-line statements hamper review (02 §7); not a finding.
Two coupling risks to remember: sync guard assumes four checks (SYNC-1), and `session.id` regexes assume linear S01-S08 (ARCH-5).

## 8. Performance and scalability

- **Build (07):** entry 581 KB / 168 KB gz, `CodeEditor` 2.33 MB / 600 KB gz (Monaco 2.28 MB), Simulator 158 KB, worker 96 KB; no source maps; landing LCP 252 ms, login 540 ms, session about 1.1 s locally; 19 s soak flat (heap 11.1 to 11.4 MB). No measured bottleneck; do not optimise rendering without evidence.
- **Worth fixing:** PERF-1 (login mascot 81% of bytes), FONT-1. **Later:** PERF-2, PERF-4.
- **Data (07b):** no N+1, PK-addressed learning access, hard size limits. Costs are linear in participants. Gaps: DB-1, DB-3, DB-4, DB-5. All formulas, no measurement, no `EXPLAIN`; live row counts and `max_rows`/`statement_timeout` NOT VERIFIED; the learning tables are not live yet.
- **Content growth to S08:** small relative to Monaco; the scaling problem is regression surface (ARCH-4), not bytes.

## 9. Release readiness

Build is healthy (about 20 s, 2596 modules) and the toolchain is sensible (`pnpm check`, lockfile enforcement, design-token baseline, PGlite SQL tests). But the release process cannot prevent the exact failure observed:

| Regression | Detected today |
|---|---|
| Type errors, unit regressions, design tokens | Yes (not run by any audit) |
| RLS/SQL logic | Partial (repository SQL only, hand-written role shims) |
| Migration drift; frontend vs RPC contract | No (REL-1) |
| Institutional browser path | No (REL-3) |
| Console/CSP violations; bundle budget | No (FONT-1, REL-4) |

Status: **not release-safe for institutional rollout** until REL-1 and REL-2 are complete. No audit ran `pnpm check`, `pnpm test` or `pnpm test:e2e`; the only successful command was one `pnpm build` (07). The only test-status evidence is the self-reported pass in `00-baseline.md`.

## 10. Residual / unverified risks

- Institutional path, cloud sync, CAS conflict UI, release gate, mentor views: never exercised (05 R6; 06 §12).
- Which frontend build is deployed and whether Netlify waits for CI: not established (05 §8; 07 R8).
- Live: Auth config, exposed schemas, code entropy, function-body equality of the five applied migrations, PostgREST HTTP matrix, backups/PITR, live headers, `max_rows`, `statement_timeout`, autovacuum.
- Missions S01, S02, S04, S05 completion; S05 as a transcription task (06b, curriculum judgement); S04 calibration panel; calibration steps 2-5.
- Poppins vs Plex rendering (06c V-6 vs 07 F4) pending FONT-1.
- Runtime worst-case CPU and native stack (03 RT1, RT2); soak and worker heap; Safari/Firefox (07 R9); older-release tabs after deploy (REL-5).
- Product questions, not defects: "visited" counted on a 120 ms mount (05 R7); `activityVersion` migration path when content changes (02 R4); `sites` select without `.limit` (07b R6); FK deletion blocked by audit rows (07b R8, decommissioning only).
- No action: N11 (cosmetic Monaco line number), UX-R6.

## 11. Go/no-go conditions for broader student use

**Must hold (no-go otherwise):**
1. REL-2 done and verified: applied migrations equal the repository, 04 V2/V4 re-run clean, REL-1 gate green and required.
2. A11Y-1 and A11Y-2 shipped and verified with real key events.
3. MIS-1 shipped; each of S01-S05 reference solutions shows a consistent completed state in a browser.
4. Institutional path exercised end to end on staging at least once (REL-3, or a manual checklist if automation slips).
5. OPS-1 checklist run and recorded (Auth settings, exposed schemas, backups, code entropy, live headers).
6. SEC-1 shipped, or the product owner records acceptance that S01-S05 reference solutions are public for the pilot.
7. Decision D4 recorded: either S03-S05 server submission is in scope (SYNC-1) or the limitation is documented to mentors.

**Strongly recommended (go with mitigation):** FB-1, FB-2, TYPE-1, A11Y-3, GLOS-1, MOB-1, CAL-1, TST-1. If shipped without them, brief mentors on the known limitations.
**Can follow rollout:** all P2/P3 items.
**No-go triggers during rollout:** any regression of a section 2 control; a parity-gate failure; a new console/CSP error on any page.
