# 02 - Architecture audit

Baseline: `ffa32b4` (branch `audit/claude-bitiro`). Scope: architecture only.
Sources: compact map plus targeted reads of `App.tsx`, `AuthProvider.tsx`, `WorkspaceProvider.tsx`,
`CodeEditor.tsx`, `storage.ts`, `cloud-learning.ts`, `Simulator.tsx`, `useSimulation.ts`, `simulator.worker.ts`,
`ProgramRuntime.ts`, `IrohRuntimeAdapter.ts`, `SimulationEngine.ts`, `MissionEvaluator.ts`, `actuators.ts`,
`scenario.ts`, `types.ts`, `MissionPanel.tsx`, `FeedbackPanel.tsx`, `Curriculum.tsx`, `content/sessions.ts`,
`content/tracks/index.ts`. No tests were run and no code was changed.

Classification: CONFIRMED (evidence in source), RISK (plausible, not demonstrated), RECOMMENDATION.

## 1. Executive summary

BITIRO's macro-architecture is sound. The three hardest boundaries are well drawn:
React / Web Worker, educational runtime / simulation engine, and browser / Supabase.
The headless core (`src/simulator/**` except `renderer/`) has zero imports of React, `document`, `window` or
`localStorage`, and Supabase is reached from only five files through `src/lib/supabase.ts`.

The weakness is not layering but how session-specific knowledge is distributed. Every session S01-S05 is
encoded as `track.id === 'sNN'` branches inside shared classes and components. This is the main obstacle to
S06-S08 and to any non-S0x program. A second weakness is that three stateful concerns lack a testable
owner: cloud code sync, mission progress and storage scope.

Counts: 7 confirmed findings (1 high, 4 medium, 2 low), 5 risks, 6 recommendations.
Nothing found is critical. Nothing indicates a boundary that must be rebuilt.

## 2. Architecture strengths to preserve

S1. Typed worker protocol, encapsulated lifecycle.
- `WorkerCommand` / `WorkerResponse` in `src/simulator/types.ts` is the only contract between UI and engine.
- `useSimulation.ts` owns worker creation, 10 s start/review deadlines, `requestId` staleness checks,
  terminate-and-retry (`generation`) and a degraded `engineState`. Components never touch `Worker`.
- `simulator.worker.ts` (46 lines) is a thin dispatcher. Keep it thin.

S2. Runtime pipeline and the adapter seam.
- `ProgramRuntime` -> `Parser`/`validate` -> generator `Interpreter` -> `IrohRuntimeAdapter` -> `SimulationEngine`.
- `IrohRuntimeAdapter` is the only place where Arduino-style API names (`avanzar`, `leerDistanciaSonar`, ...)
  meet engine state. `ProgramRuntime` imports `SimulationEngine` as a type only.
- Execution is slice-based with `LIMITS.instructions` and wait/loop-boundary yields, so student code cannot
  block the engine loop. Do not collapse the adapter into the engine or the interpreter.

S3. Headless, deterministic simulation core.
- Fixed `PHYSICS_STEP_MS`, no DOM access, and engine events (`emit`) as the single evidence channel.
- This is why `src/tests/runtime/*`, `engine.test.ts`, `mission-evaluation.test.ts` and
  `mentor-solutions.test.ts` (runs reference solutions against the engine) run without a browser.
  This is the project's most valuable testing asset.

S4. Tracks as data behind one registry.
- `content/tracks/index.ts` exposes `TRACKS`, `hasSimulation`, `trackForSession` over JSON files.
  Geometry, paths, finish zones, mission zones and start pose are data, not code. Extend this direction.

S5. Single Supabase boundary with a stated authority rule.
- Only `auth-service`, `admin-service`, `workspace-service`, `cloud-learning` and `AuthProvider` import `lib/supabase`.
- `cloud-learning.ts` states the browser is never authority; every call is a scoped RPC.
- `WorkspaceProvider` is a thin pass-through to `workspace-service`; keep business rules out of it.

S6. Local vs institutional persistence separation.
- `storage.ts` scopes keys `bitiro:v7:<scope>:...`. Institutional scopes (`|cohort:`) never import legacy v6 or
  guest data. `App.tsx` `StorageScope` remounts the tree (`key={wanted}`) on user change, which prevents state
  bleed across accounts. Keep this isolation.

S7. Lazy loading and failure containment.
- `Simulator`, `CodeEditor` (Monaco) and secondary pages are `lazy`; `ErrorBoundary` and `EditorBoundary`
  isolate failures. Monaco global setup (`MonacoEnvironment`, theme) is confined to the lazy chunk.

S8. Formative evidence is typed as such.
- `MissionEvidence.kind: 'formative_client_simulation'` is carried through to `submitFormativeMission`.
  This keeps client evidence from silently becoming "grade" in the model.

## 3. Confirmed findings

### C1 - Session knowledge is spread across shared code via `track.id` branches (HIGH)
Affected: `MissionEvaluator.ts`, `SimulationEngine.ts`, `actuators.ts`, `FeedbackPanel.tsx`, `TelemetryPanel.tsx`,
`Simulator.tsx`, `CalibrationPanel.tsx`, `S02CalibrationPanel.tsx`, `Guide.tsx`, `Curriculum.tsx`, `storage.ts`,
`content/sessions.ts` (`starterCode`), renderers, `sensors.ts`, `types.ts` (`WorkerCommand`).

Evidence:
- A grep for `'s0N'` literals in non-test source gives 67 occurrences in 15 files. `MissionEvaluator` (13)
  and `SimulationEngine` (12) hold the most.
- `MissionEvaluator` is one class with about 45 private per-session fields (`s03Intersection*`, `s04Gap1*`,
  `s04Intersection{1,2,3}StopMs`, `s05*`). `reset()` is one line that re-zeroes every field by hand.
  `observeTick` and `evaluate` are `if(track.id==='s01'...) else if(...)` chains. S04 and S05 reuse a copy-pasted
  `zoneById`/`inside`/`allWhite` preamble.
- `SimulationEngine` holds S03 state (`s03ObstaclePoints`, `s03AutoStrike`, `s03IntersectionTurn`,
  `setS03Layout`) and S01 state (`syncS01Scenario`). `actuators.ts` hardcodes S03 servo speed, impulse and drag.
  The gap exemption `intentionalGap` names `s04`/`s05` zone IDs inside the physics tick.
- `Simulator.tsx` line 25 lists `s02|s03|s04|s05` to select the calibration panel. `FeedbackPanel.tsx` line 9 is a
  single nested ternary of per-session messages. `storage.ts` and `markExplored` validate ids with `/^s0[1-8]$/`.
- The worker protocol has session-named commands (`set-s03-layout`, `set-line-thresholds`).

Impact: adding S06 means editing the session definition, `starterCode`, the track registry, the evaluator
(fields, reset, tick, evaluate), engine, feedback, telemetry, calibration selection, guide, curriculum, mentor
solution and renderers. These edits sit in shared files that every earlier session also depends on, so any
S06 change can regress S01-S05 and the evaluator's regression surface grows with each session.

Direction: introduce a per-session mission module (keyed by track id, resolved like `trackForSession`) that
owns its evidence state and `observe*`/`checks`, and have `MissionEvaluator` delegate to it. Move
engine/actuator tuning (servo speed, impulse, drag, intentional-gap zone ids) into track data or a per-session
scenario hook. Move feedback copy and calibration kind into the same session descriptor. Do this
incrementally, S04/S05 first, protected by the existing `mission-evaluation.test.ts`.

### C2 - Domain rules duplicated between evaluator, engine and UI (MEDIUM)
Affected: `MissionEvaluator.ts`, `SimulationEngine.ts`, `FeedbackPanel.tsx`.

Evidence:
- S02 "which base does the IR/button choose" is computed three times: `observeTick` (s02 branch), `evaluate`
  (s02 branch) and `FeedbackPanel.tsx` line 7. S01's IR-to-side rule is computed in `scenario.ts`,
  `MissionEvaluator` and `FeedbackPanel`.
- S03 intersection response is detected twice. The engine emits `INTERSECTION_RESPONDED` after a heading delta of
  2.55 rad within 12 cm. `MissionEvaluator.observeTick` re-derives the same turn from heading with the same 2.55 and a
  16 cm radius, and adds to the same `s03RespondedIntersections` set. The engine comment states it is the
  "source of truth", yet the evaluator keeps a second implementation.
- `lineFront` projection and "point inside zone" arithmetic are re-implemented in the engine and at least
  five places in the evaluator, while `geometry.ts` and `finish.ts` exist.
- `FeedbackPanel` (UI) decides domain states, e.g. `mission.status==='completed'&&track.id==='s03'`.

Impact: a threshold or rule change must be made in two or three places; divergence yields feedback that
contradicts mission checks. The S03 duplication already has differing radii (12 vs 16 cm).

Direction: make engine events the only evidence input (the S03 engine event already does this), put shared
geometry helpers in `geometry.ts`/`finish.ts`, and expose derived values (selected base, expected side) from
the snapshot/mission evidence so the UI renders them instead of recomputing.

### C3 - `CodeEditor` owns a cloud-sync state machine that is difficult to test in isolation (MEDIUM)
Affected: `src/features/code-editor/CodeEditor.tsx` (232 dense lines), `cloud-learning.ts`.

Evidence: one component handles Monaco setup and decorations, completion/hover providers, local debounce
(350 ms), cloud debounce and CAS revision tracking (`revisionRef`, `uploadRef`, `uploadingRef`, `cloudReady`,
`typedRef`, `aliveRef`), conflict resolution (`selectLocal`/`selectRemote`), visited/attempted progress, mentor
solution loading, and diagnostics markers. Sync decisions (restore remote when no local draft, conflict when
different, requeue after upload) live in effects and closures. `src/tests` contains no test for
`cloud-learning`, `CodeEditor` or the sync decisions; `storage.test.ts` covers only local storage.

Impact: this is the path that carries institutional student work, and its branch logic cannot be exercised
without React and Monaco. Every new feature (new activity types, autosave policy, activity versions) touches
this component.

Direction: extract a framework-free `CodeSyncController` (inputs: local doc, remote doc, revision, events;
outputs: state and actions) that `CodeEditor` subscribes to, and unit-test the conflict matrix. Split mentor
solution UI into its own component. Keep behavior unchanged during extraction.

### C4 - Mission/learning progress has no single owner; window events used as a bus (MEDIUM)
Affected: `MissionPanel.tsx`, `CodeEditor.tsx`, `storage.ts`, `cloud-learning.ts`.

Evidence:
- `LearningStatus` (visited/attempted/completed) is held in `CodeEditor` state. It is written by `markCloudActivity`
  in `CodeEditor` (visited, attempted), but "completed" is produced by `submitFormativeMission` in `MissionPanel`,
  a sibling in a different tree branch. They are connected by `window.dispatchEvent('bitiro:mission-saved')` (MissionPanel
  line 16) and an `addEventListener` in `CodeEditor` line 114.
- `MissionPanel` auto-submits from a `useEffect` and keeps its own `submitted` ref, so a presentational panel
  performs the persistence side effect.
- `cloud-learning.submitFormativeMission` hardcodes `checks.length!==4`, coupling the sync layer to the current
  mission shape (all S01-S05 happen to have four checks).
- `storage.ts` dispatches `bitiro:document-saved` and `bitiro:progress-changed`; no `addEventListener` for either
  exists under `src` (grep), so these are dead notification surface.

Impact: no component can answer "what is this participant's status for this activity" without coordinating
three modules. A future mission type with a different number of checks silently fails the sync guard.

Direction: one progress store/hook per (cohort, session) that exposes status, `markAttempted`, `submitMission`;
both CodeEditor and MissionPanel consume it; delete unused events or replace with the store. Express the
completion rule in the mission contract, not as a literal 4.

### C5 - Storage scope has two mechanisms and inconsistent use (MEDIUM)
Affected: `storage.ts`, `App.tsx`, `CodeEditor.tsx`, `CalibrationPanel.tsx`, `S02CalibrationPanel.tsx`, `Simulator.tsx`.

Evidence:
- `storage.ts` keeps a module-level mutable `currentScope`, set in `App.tsx` `StorageScope` via `useLayoutEffect`.
  The code editor reads `storageScope ?? getStorageScope()`, an explicit institutional scope that overrides
  the global.
- Calibration panels call `scopedStorageKey(KEY)` and `getStorageScope()` with the global scope only. They do not
  receive the cohort scope that code and tour state receive, so calibration is saved under the user scope,
  not `user|cohort|activity`.
- `Simulator.tsx` derives the tutorial user id from the scope string with a regex (`/^user:([^|]+)/`), coupling
  UI to the scope string format. `activityVersion:1` is a literal in `App.tsx` and a default in
  `workspaceStorageScope`.

Impact: persisted data of the same feature (code vs calibration) is partitioned differently.
Whether sharing calibration across cohorts is acceptable is a product decision, but today it is accidental.
The global makes ordering matter (layout effect must run before any child reads it).

Direction: one scope value object created at the route (`AppShell`), passed or provided by context to every
storage consumer; remove the global or confine it to guest. Centralize the activity version.

### C6 - Route guard logic copy-pasted in `App.tsx`; org theme hardcoded (LOW)
Affected: `src/app/App.tsx`.

Evidence: `WorkspaceRoute`, `MentorRoute`, `InstitutionSessionRoute`, `SpacesEntryRoute`, `LegacyWorkspaceRedirect`
each repeat loading check, unauthenticated redirect with `next=`, and workspace lookup. `AppShell` also builds
`cloudContext`, chooses the page by a ternary chain and hardcodes `organization_id==='mustakis'` for the theme
(also `Topbar.tsx`), though `content/organizations.ts` exists.

Impact: each new institutional route repeats the guard and risks drifting from the others; new institutions need
code edits for theming. (Guard correctness itself is deferred to the security audit.)

Direction: a `RequireWorkspace` wrapper plus an organization theme lookup from `content/organizations.ts`.

### C7 - Two independent "is simulated" sources of truth; engine duplicated on main thread (LOW)
Affected: `content/sessions.ts` (`interactive`), `content/tracks/index.ts` (`hasSimulation`), `useSimulation.ts`, `Curriculum.tsx`.

Evidence: `Curriculum.tsx` labels rows from `session.interactive`; `Simulator.tsx` switches live/non-live from
`hasSimulation`. `tracks.test.ts` asserts only `hasSimulation`; no test cross-checks the two. Separately,
`useSimulation` imports `SimulationEngine` and builds two engines on the main thread just to compute an initial
snapshot, while the worker owns the real one. Fullscreen/escape/body-overflow logic is also copied between
`SimulatorPanel` and `Workspace` in `Simulator.tsx`.

Impact: the flags can disagree for a new session; main-thread engine import weakens the worker boundary and bundle split.

Direction: derive `interactive` from the registry; have the worker send the first snapshot (or a static idle
snapshot factory); extract a `useFullscreen` hook.

## 4. Risks to monitor

R1. Worker configuration failures are swallowed (`simulator.worker.ts`: `catch{}` on `configure-track`). The UI only
learns through the 10 s deadline in `useSimulation`. Unknown tracks are "blocked by the main UI", which
depends on C7's flag agreeing with the registry.

R2. `MissionEvaluator` is documented as a "pure evidence accumulator", but `evaluate()` mutates `completed`
(latching) and is called from `SimulationEngine.snapshot()`. Results depend on how often snapshots are taken,
so adding another snapshot call could change when completion latches. Latching belongs in `observeTick`.

R3. `session.id`-keyed regexes `^s0[1-8]$` and numeric `session.number` gating of API (`api.since<=session.number`)
assume linear numbering up to S08. Institutional programs with other sequences or more than eight activities
break these assumptions.

R4. `activityVersion` is fixed to 1 in `App.tsx` while cloud documents are versioned by it. No migration path is
visible in the client when a session's content changes (the compact map already lists this as unverified).

R5. Test coverage is lopsided: headless runtime/engine/mission tests are strong. `useSimulation`, the worker
dispatcher, `cloud-learning`, `CodeEditor` sync and `App` routing have no tests in `src/tests`. A refactor of C1/C3 would
lack protection exactly where integration risk is highest (E2E is the only net).

## 5. Extensibility assessment

| Change | Current cost | Notes |
|---|---|---|
| New session with an existing robot API (S06-S08) | High: about 10-14 files (list in C1) | Mostly shared-file edits; regression risk to S01-S05 |
| New mission type | High | Add fields to the `MissionEvaluator` monolith and `MissionEvidence` (`progress` is S03-shaped); sync guard assumes 4 checks |
| New robot capability (sensor/actuator) | Medium | Adapter + engine + `RobotState` + renderer is a clean path; tuning is not data-driven |
| New API function for students | Low | `IrohRuntimeAdapter` switch, `content/api.ts` (`since`), signatures. Good seam |
| New track geometry | Low | JSON plus registry; geometry is data |
| New educational activity (non-simulator) | Medium-high | `Simulator`/`CodeEditor` assume one editor + one robot; `Workspace` already has a no-simulation mode |
| New institution/program | Medium | Theme literal, `organizations.ts`, hardcoded copy "Robótica Intermedia" and `/intermedio/` routes |
| New persistence target | Medium | No sync controller abstraction (C3) |

Net: S06 is feasible without redesign, but each session adds branches to shared files. The architecture
supports growth in robot capabilities better than growth in missions. The best leverage is a per-session
descriptor (C1).

## 6. Recommended architectural sequence

Order is by risk reduction per unit of effort and respects "diagnose first, refactor later".

1. Safety net first (RECOMMENDATION): add characterization tests for `cloud-learning` conflict handling and a
   registry-consistency test (`interactive` vs `hasSimulation`). No behavior change.
2. Extract `CodeSyncController` from `CodeEditor` (C3) with unit tests; then split the mentor panel.
3. Introduce a single progress store (C4) and a single scope provider (C5, including calibration and `activityVersion`).
4. Remove duplicated rules (C2): engine events as sole evidence; shared geometry helpers; derived values
   (selected base) exposed on the snapshot; move completion latching out of `evaluate()` (R2).
5. Session descriptor and mission modules (C1), beginning with S04/S05 behind existing
   `mission-evaluation.test.ts`; then move engine/actuator tuning and feedback copy into descriptors. Do this
   before building S06 so S06 is the first session written against the new shape.
6. Hygiene (C6, C7): `RequireWorkspace`, organization theme lookup, `useFullscreen`, remove dead events,
   worker-provided initial snapshot.

Recommendations R-A to R-F correspond one-to-one to steps 1-6.

## 7. Items explicitly deferred to other audits

- Security/RLS: authorization correctness of route guards (`StaffGate`, `MentorRoute`, release checks), every
  Supabase RPC/RLS policy, trust in client-generated `p_evidence`, access-code handling.
- Pedagogy: whether mission checks and thresholds (e.g. 0.3 s stop, distance minimums) measure the intended
  learning, the content of `FeedbackPanel` messages, mentor-solution exposure to students.
- Accessibility/UX: fullscreen/focus mode behavior, `aria` usage, tab/focus management, tutorial flow, dense
  inline-JSX readability beyond maintainability.
- Performance: telemetry rate, main-thread engine bundle cost (C7), software 3D renderer, Monaco chunk size.
- Cloud sync edge cases at runtime (data loss, race behavior): only the structural ownership issue (C3) is
  recorded here; dynamic verification belongs to a data-integrity or QA pass.
- Style note: files use very long single-line statements and minimal whitespace (e.g. `FeedbackPanel.tsx` line 9).
  This affects review and diff quality and is recorded as a maintainability observation only, not a finding.
