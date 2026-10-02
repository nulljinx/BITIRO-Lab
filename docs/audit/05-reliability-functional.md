# 05 - Reliability and functional audit

Baseline: `ffa32b4` (branch `audit/claude-bitiro`). Date of run: 2026-10-02.
Scope: S01-S05 availability, execute/pause/reset/re-execute lifecycle, session navigation,
calibration, guest persistence, program errors and recovery, console and network evidence.
Classification: CONFIRMED (reproduced in browser or read in source), RISK (plausible, not demonstrated),
RECOMMENDATION. No code, migrations, data or configuration were changed. No commit was made.

This report was written under a coordinator instruction to stop exploring and report what was observed.
Section 11 lists explicitly what was NOT tested. Read it before relying on any "no problem found" statement.

## 1. Executive summary

The simulator lifecycle is solid. Across about 30 scripted browser scenarios there were zero uncaught
exceptions, zero console errors or warnings, zero failed requests and zero HTTP status >= 400 (guest mode,
S01-S08 plus an invalid id). Worker management is clean: after 7 rapid session switches the number of live
workers was exactly 1 (created 24, terminated 23). Pause, resume, reset, "Probar otra vez", 10 rapid
reset/rerun cycles and a same-tick burst of reset/run clicks left the engine in a consistent state, with the
robot at its start pose and no command applied after a reset. Syntax, runtime and infinite-loop errors were
reported with line/column in Spanish, marked in Monaco, and the simulator recovered and ran a fixed program.

Confirmed findings: 0 critical, 0 high, 1 medium, 5 low. Risks: 8. Nothing found blocks use of S01-S05.

Main items:
- Medium (F1): unsupported language constructs (`String`, `do/while`, `unsigned long`, `boolean`, array
  declarations) are reported as "Falta ';'" and a missing closing brace as "Una variable no puede ser void".
  The diagnostic is understandable as text but points the student at the wrong problem.
- Low (F2): in S04 and S05 the engine receives line thresholds from the S01 calibration key, while the S02-style
  panel in those sessions displays and saves a different key. S03 sends both, in order.
- Low (F3-F6): stale state after leaving calibration without saving; silent last-writer-wins between two guest
  tabs; misleading "Guardado local" label when storage is blocked; an unhelpful "Prueba detenida" message.

Environment constraint that shaped the audit: the Playwright MCP could not start (see section 2), so browser
work used the project's own `@playwright/test` Chromium through scratch scripts. The guest flow for S01-S05 only
exists when Supabase is not configured, so a second local dev server was used for it.

## 2. Test environment

- Dev server on `http://127.0.0.1:5173` (provided): `/` renders the landing page. `/intermedio/s01` redirects to
  `/login?next=/espacios`. This is by design: `LegacySessionRoute` in `src/app/App.tsx` renders the simulator
  only when auth status is `unconfigured`, otherwise it redirects to login or `/espacios`. So in a
  Supabase-configured build, S01-S05 are reachable only through an institutional workspace route
  (`/espacios/:org/grupos/:cohort/intermedio/:sessionId`), which requires login and was not exercised.
  No console errors on the two pages loaded there.
- Playwright MCP: every call failed with "Chromium distribution 'chrome' is not found at
  /opt/google/chrome/chrome". The MCP is configured for the `chrome` channel and no install was allowed.
  Deviation: scratch Node scripts in the session scratchpad used `@playwright/test` from `node_modules` with the
  already-installed bundled Chromium (`~/.cache/ms-playwright/chromium-1243`). Accessibility snapshots from the
  MCP were therefore not produced; DOM text, roles and button states were read with `page.evaluate`.
- Guest server: a second Vite dev server on `http://127.0.0.1:5174`, started with
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_ANON_KEY` set to empty in the process
  environment (the same technique `tools/run-e2e.mjs` uses). `.env*` was not read. It does not contact
  Supabase. It was stopped at the end of the audit.
- Instrumentation: an init script wrapped `window.Worker` to count constructions and `terminate()` calls, record
  every command posted to the worker, and keep a handle to send `pose` commands during calibration checks.
  Tutorial completion key `bitiro:v7:simulator-tutorial:guest` was preset to `done` except in the
  tutorial-related checks. Viewport 1600x1000, Chromium headless.
- No production accounts, no production URL, no Supabase MCP, no real student data. Only synthetic localStorage
  values written under the guest scope in a fresh browser profile.

## 3. Functional coverage matrix S01-S05

Observed on the guest server (5174), fresh profile, desktop viewport.

| Check | S01 | S02 | S03 | S04 | S05 |
|---|---|---|---|---|---|
| Page loads, h1 correct | yes | yes | yes | yes | yes |
| Monaco editor visible | yes | yes | yes | yes | yes |
| Track canvas (`canvas[role=img]`) | yes | yes | yes | yes | yes |
| Engine ready, no notice | yes | yes | yes | yes | yes |
| Initial controls | Restablecer disabled, Revisar and Probar enabled | same | same | same | same |
| Session-specific feedback at idle | IZQ/DER stimulus | scenario IR/button | 3 obstacles, 3 intersections | generic "Listo para probar" | generic "Listo para probar" |
| Run / pause / resume / reset / rerun | tested | run only | run only | not run | run only |
| Syntax and runtime errors | tested | not run | not run | not run | review-only checks (21 cases) |
| Calibration enter, leave, run again | tested | tested | not run | enter only | tested |
| Own code persisted across reload | yes | yes | yes | not run | not run |
| No console or page errors | yes | yes | yes | yes | yes |

S06-S08: `/intermedio/s06|s07|s08` render the "Material" overview (`.session-overview`), no canvas and no worker
(created 0), editor present. `/intermedio/s99` redirects to `/`. This matches `tests/e2e/lab.spec.ts`.

Session isolation (code): codes seeded as `MARCA-S01/S02/S03` stayed with their own session through SPA
navigation, history back/forward and reload. `last-session` and `explored` tracked visits.
Mission state: after switching sessions the new session always started `Detenido`, clock `0.0 s`, no diagnostics,
and the previous run's pose did not leak (S01 y=114 while running, S02 started at its own pose 49.23/151).

Session-specific mechanics NOT exercised in the browser: S01 route/IR decision, S02 sensor strategy and IR/button
choice, S03 obstacle counting and intersection turn, S04 gap crossing, S05 right-IR counting. They are covered
headless by `src/tests/mission-evaluation.test.ts` and `src/tests/runtime/mentor-solutions.test.ts`, which were
not run in this audit (section 11) and do not prove pedagogical correctness.

## 4. Controls and lifecycle

Observed on S01 (programs seeded through localStorage; all with `?debug=1`):

| Step | Result |
|---|---|
| Probar codigo | `Ejecutando`, clock advances, pose moves (y 130 -> 111.7 in 1.5 s at speed 20) |
| Run/Review buttons while running | disabled; Pausar and Detener appear |
| Pausar | `En pausa`; pose and clock stable over 500 ms |
| Continuar | `Ejecutando`, motion resumes |
| Restablecer | `Detenido`, 0.0 s, pose back to 50/130, "Probar otra vez" appears |
| Probar otra vez | runs the loaded program again |
| 10 cycles of Detener, Restablecer, Probar otra vez | ended running, no stuck control, commands strictly alternate `reset`, `run-program` |
| 5 same-tick bursts of Detener/Restablecer/Probar otra vez/Restablecer | ended `Detenido`, pose at start, no motion after 600 ms |
| Speed 2x while running | accepted; speed is not reset by `reset` (engine `reset()` leaves `speed`) |
| Worker count after load | created 2, terminated 1 (React StrictMode dev double mount, `src/main.tsx` L10) |
| Worker count after 7 rapid SPA session switches | created 24, terminated 23: exactly one live worker |
| Switch session while running | new session idle, old worker terminated, no late snapshot applied |
| History back/forward | previous session restored from storage, idle, correct code |

Why it holds (source): `useSimulation.ts` creates one worker per `[generation, sessionId, track]` effect and
terminates it in cleanup. `requestId` is incremented on `reset`, `stop`, `stop-program` and `pose`, and
`compile-ok`/`compile-error` are accepted only for the current id. `track-ready` is filtered by `trackId`.
The worker (`src/simulator/worker/simulator.worker.ts`) is single-threaded and processes commands in order, so a
command cannot overtake a reset. `ProgramRuntime.command` cancels the generator on reset.

Not observed: frozen UI, stale telemetry, doubled worker, commands after reset, controls stuck enabled/disabled.

Runtime error handling, S01 (Probar codigo on each seeded program). UI stayed responsive in all cases (evaluate
round-trip 4-7 ms):

| Input | Diagnostic shown | Verdict |
|---|---|---|
| Missing `;` | "Linea 1, columna 39: Falta ';' despues de la instruccion." | correct |
| Unknown function `volarDron` | "no existe en la libreria IROH ni en tu programa" | correct |
| No `loop()` / empty file | "Debes definir void loop()/setup() sin parametros" | correct |
| `while(true){i=i+1;}` in loop | "demasiadas instrucciones seguidas ... Anade una pausa dentro del ciclo" after about 1 s; rerun available | correct, recoverable |
| `pausa(9999999)` | "pausa() admite entre 0 y 600000 ms" | correct |
| Unbounded recursion | "demasiadas llamadas anidadas (maximo 32)" | correct |
| `5/0`, `avanzar(-5)`, huge int | divide-by-zero / speed range / "resultado numerico demasiado grande" | correct |
| Error then edit then run | ran correctly, status `Ejecutando`, still 1 live worker | recovered |

Marker count in Monaco was 1 per diagnostic and the workspace switched to the editor tab on error.

## 5. Persistence and recovery

Guest scope keys are `bitiro:v7:guest:code:<id>`, `explored`, `last-session`, and calibration keys
(`src/features/code-editor/storage.ts`, `CalibrationPanel.tsx`, `S02CalibrationPanel.tsx`).

Observed:
- Save, reload: code persists per session, with 350 ms debounce. Three sessions kept independent documents.
- `explored` and `last-session` updated on every editor mount (also on 120 ms fast switches).
- Corrupt code documents (S01): invalid JSON, `null`, number, array, `{code:123}`, missing `code`, a 40000 byte
  code string and a `__proto__` payload all opened the editor; invalid ones silently fell back to the S01
  starter code. A document with `code:""` opens an empty editor. No exception in any case.
- Corrupt side keys: invalid `explored` JSON, `explored` containing an HTML string and ids outside `s01-s08`,
  `last-session` set to `../../etc`, calibration arrays of strings or out-of-range numbers, malformed S01
  calibration and a junk tutorial value: every page loaded; the worker received `200,200,200`
  thresholds; no tutorial dialog appeared for the junk value (any value other than `done` is not `done`, so a
  tutorial would normally be expected: not investigated further).
- `localStorage` throwing `SecurityError` on every call: editor, canvas and engine still started, the tutorial
  dialog appeared (as expected, it cannot be marked done), Escape closed it, a program ran, and typing produced
  "Sin guardar" and the warning "No se pudo guardar. Descarga tu codigo para conservarlo."
- Institutional scope (`user:<id>|cohort:<id>|activity:1`) and cloud sync were not exercised.

## 6. Confirmed findings

### F1 - Misleading diagnostics for unsupported constructs (MEDIUM)
Reproduction (guest, S05, "Revisar codigo", body inside `setup()`):
1. `String x = "a";` 2. `do { a++; } while(a<3);` 3. `unsigned long t = millis();` 4. `bool x=true; boolean y=false;`
5. `int a[3]; a[0]=1;` 6. missing closing brace of `setup()` before `void loop()`.
Expected: a message that names the unsupported construct or the real structural problem, consistent with the
existing good messages (`"." no esta admitido`, `":" no esta admitido`, `"?" no esta admitido`, `#define` ->
"solo permite la libreria del IROH").
Observed: cases 1-5 report "Falta ';' despues de la instruccion" (or "al final de la declaracion"); case 6 reports
"Linea 2, columna 1: Una variable no puede ser void".
Evidence: 21 review cases run in S05; `float`, `for`, `const int` and an IR read were accepted.
Affected: parser/validator under `src/simulator/runtime/parser/` (Parser, validate; files not read in this audit).
Likely cause: the parser treats unknown type tokens as expression statements and reports the first missing
terminator instead of the unsupported token; the unbalanced brace is detected only at the next top-level
declaration.
Why it matters: PRODUCT.md prioritises feedback comprehensible and tolerance to errors. A student adds a `;`
that is already there and still fails.
Direction: dedicated "no soportado en este simulador" diagnostics for known Arduino types and statements
(`String`, `boolean`, `unsigned`, arrays, `do`), and an unclosed-brace check. Add parser tests for each.

### F2 - Line thresholds in S04/S05 come from the S01 calibration key (LOW)
Reproduction: seed `bitiro:v7:guest:bitiro-s02-calibration-v1` = `[180,190,210]` and
`bitiro:v7:guest:bitiro-s01-calibration-v1` = `[150,160,170]`, then open each session and read worker commands.
Expected: S02-S05 sessions, which use the three-sensor panel, apply the three-sensor calibration to the engine;
S01 applies only its own.
Observed (commands posted to the worker after `track-ready`):
- S01: `150,160,170`; S02: `180,190,210`.
- S03: `150,160,170` then `180,190,210` (both hooks fire; the second wins by effect order).
- S04 and S05: `150,160,170` only. Opening the calibration panel in S04 displays the S02-style panel.
Evidence: scripts t2; commands logged by the Worker wrapper.
Affected: `src/features/simulator/CalibrationPanel.tsx` L54 (applies saved thresholds when track is not `s02`),
`S02CalibrationPanel.tsx` L76-78 (applies only for `s02`/`s03`), `Simulator.tsx` L25 (both hooks always mounted).
Likely cause: two calibration hooks run side by side in `SimulatorPanel` with different track conditions that
were not updated when S04 and S05 adopted the three-sensor panel.
Impact: the engine thresholds feed `MissionEvaluator` (`allLineSensorsBlack`, `allWhite`, lines 120-140) for S03-S05
gap and intersection evidence, which becomes formative evidence. Whether a different threshold flips a check was
not demonstrated; default sensor readings (white about 50, black about 400) tolerate a wide range, so practical
impact is probably small. Saving a calibration inside S04/S05 does send the right values until the next reload.
Direction: select the calibration hook by one predicate (`usesThreeSensorCalibration`) and apply thresholds from
only that hook. Related: S02-S05 share one stored calibration per user scope, and S01 uses a separate one; confirm
this is intended (see C5 in `02-architecture.md`).

### F3 - Leaving calibration without saving leaves stale scene state (LOW)
Reproduction: S02, "Calibrar", move the robot (pose 90,60), "Salir de calibracion" without saving.
Expected: robot returned to start or a clear control to restore it; coherent feedback.
Observed: robot stays at x=90, y=60 and the engine reports `idle`; the feedback card still shows the pre-session
text; the editor strip shows "Prueba detenida · puedes probar otra vez" although nothing was running;
"Restablecer" is disabled until a program is loaded (`canReset` requires `programLoaded`).
Recovery exists: "Probar codigo" resets the scene, and saving a calibration sends `reset`.
Affected: `Simulator.tsx` `toggleCalibration` (L47-57) vs `finishCalibration` (sends `reset`); `RuntimeBar.tsx` `canReset`;
`useSimulation.ts` `send()` message for `stop-program`.
Direction: send `reset` on exit as well, or enable Restablecer when pose differs from start; do not set the
"stopped" message when no program was running.

### F4 - Silent last-writer-wins between guest tabs (LOW)
Reproduction: open S01 in tabs A and B; type in A, then in B; type again in A; reload A.
Expected: B's work not lost silently, or a warning.
Observed: `localStorage` held B's text after B typed; A's view remained stale ("TAB-A"); after A typed again its full
text replaced B's; B's edit is gone.
Evidence: script t11. Affected: `storage.ts` `saveCode`, `CodeEditor.tsx` `change`/`flush` (no `storage` event listener).
Scope: guest/legacy mode. Institutional mode adds CAS revisions in the cloud (not tested), but the local document
key is still shared by tabs.
Direction: listen to `storage` events or store a revision with the local document.

### F5 - "Guardado local" shown when storage is unavailable (LOW)
Reproduction: make `localStorage.getItem/setItem` throw, open any session.
Expected: indicator reflects that saving is not possible.
Observed: file bar says "Guardado local" until the first edit, after which it switches to "Sin guardar" with a
download warning. Affected: `CodeEditor.tsx` initial `saveState='saved'`.
Direction: probe writeability at mount.

### F6 - Oversized or invalid stored documents are replaced by starter code without notice (LOW)
Observed for the 40000 byte stored document and other invalid shapes (section 5): the editor shows starter code and
the user is not told that a stored draft was discarded. The UI cannot create such documents (saving above 32 KiB
is blocked and shows `SOURCE_LIMIT_MESSAGE`), so this needs manual storage corruption or a quota/limit change.
Classified low; the code does tolerate it safely. Affected: `storage.ts` `savedDocument`/`loadCode`.

## 7. Risks requiring deeper testing

R1. Hook mismatch outcome (F2): run S04/S05 reference programs with deliberately extreme S01 and S02 stored
thresholds and compare mission checks. Not done.
R2. Dev-only double worker. StrictMode produced create 2 / terminate 1 on every mount. The production bundle was
not served in this audit; `tests/e2e` runs against a release build but was not executed.
R3. Worker configuration failures are swallowed (`simulator.worker.ts` `catch{}`), so an invalid track surfaces only
after the 10 s deadline in `useSimulation.ts` (R1 in `02-architecture.md`). Not injected here;
`tests/e2e/platform.spec.ts` ("worker failure offers recovery") covers part of it.
R4. Unknown `pose`/`ir`/`button` timing: setting IR or the button during a run was not exercised.
R5. First-run tutorial overlay (`.sim-tour-guard`) intercepts pointer events on the editor and simulator controls.
Expected by design, but anyone automating or using assistive tech before dismissing it is blocked. Keyboard Escape
closes it. Belongs to the UX/accessibility audit.
R6. Institutional/cloud path (CodeEditor CAS state machine, `MissionPanel` auto-submit, release gating) was not
executed. See section 8.
R7. Explored/"visited" accounting increments on mount even for a 120 ms visit (fast switching marked s04 and s05
explored). Whether this is the desired definition of "visited" is a product question.
R8. Long wall-clock behaviour: no soak test beyond a few minutes and 10 reset cycles; memory/telemetry growth in
`events` (capped at 256) was not measured.

## 8. Deployment-drift implications

Repository migrations `202609190001_cohort_learning` and `202609190002_formative_missions` are absent from the live
database (confirmed in `04-live-security.md`, V4/L1). Nothing in this audit verifies what frontend build is deployed,
so it is NOT claimed that production is broken.

Source paths whose current behavior depends on the missing RPCs (from `02-architecture.md` and `03-security.md`;
function names were not re-read in this audit):
- `src/features/code-editor/cloud-learning.ts`: `fetchCloudLearning`, `saveCloudCode` (CAS), `markCloudActivity`,
  `submitFormativeMission`.
- `src/features/code-editor/CodeEditor.tsx`: cloud load/restore, conflict banner, visited/attempted marks (only when
  `cloudContext` exists, i.e. institutional routes).
- `src/features/simulator/MissionPanel.tsx`: auto-submit of completed missions.
- `src/app/App.tsx` `InstitutionSessionRoute` and `workspace-service` `loadSessionAccess`: release gating
  (`private.can_open_learning` is defined in migration 0001).
- Cohort learning overview in `WorkspacePages` (mentor view).

Expected degradation by source reading (not exercised): editor falls back to "Guardado local · sin sincronizacion";
mission panel shows "No se pudo sincronizar" with a retry button; a failed access check shows "No pudimos comprobar el
acceso" instead of the session. The guest and unconfigured flows tested here do not use these RPCs and are unaffected.
No migration was applied.

## 9. Strengths to preserve

- One worker per session with `requestId` staleness checks, terminate on cleanup, and a 10 s deadline
  (`useSimulation.ts`). Verified under rapid switching.
- Deterministic, single-threaded worker command ordering; `reset` cancels the generator and invalidates the mission.
- Instruction budget (`LIMITS.instructions` 8000) turns a tight loop into a clear, recoverable Spanish message.
- Diagnostics carry line, column, kind and a Monaco marker; the workspace returns to the editor on error.
- Defensive local storage: every read is try/caught and validated, ids are regex-checked, calibration values
  are range-checked; blocked or corrupt storage never prevents the editor from opening.
- Per-session documents and keyed remount (`Simulator key=...` in `App.tsx`) prevent state bleed between sessions.
- Clean console and network in all runs.
- Honest labelling for sessions without a track (S06-S08 "Material").

## 10. Recommended remediation order

1. F1: dedicated diagnostics for unsupported constructs and unclosed braces (highest pedagogical payoff, low risk).
2. F2: single predicate for calibration hook selection and threshold application, plus a regression test.
3. F3: reset on calibration exit, and drop the misleading "Prueba detenida" message.
4. Run the deferred checks (section 11), starting with the existing E2E on a release build and S01/S05 in-browser
   mission completion.
5. F4-F6 hygiene: `storage` event or revision, writeability probe, notice when a draft is discarded.
6. After a decision on the drift: exercise the institutional path (CodeEditor sync, MissionPanel submit, release
   gating) with test accounts in staging, not production.

## 11. Tests executed and NOT executed

Executed (all scratch scripts live in the session scratchpad, not in the repository):
- `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173` -> 200; same for 5174 `/intermedio/s01` -> 200.
- Vite dev server on 5174 with empty Supabase env: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174
  --strictPort --configLoader runner` (started, then stopped).
- Browser scripts with `@playwright/test` Chromium: availability S01-S08 + s99 (probe t1); calibration thresholds
  (t2); lifecycle on S01 (t3); SPA navigation, back/forward, fast switching and persistence (t4); 13 execution
  error cases (t5); 21 review-only diagnostics on S05 (t6); calibration enter/leave on S01/S02/S05 (t7, t8);
  corrupt storage and blocked storage (t9, t10); two guest tabs (t11).
- Console/pageerror/requestfailed/HTTP >= 400 listeners attached in every script: no entries.

NOT executed or not completed:
- Playwright MCP, MCP accessibility snapshots (browser failed to launch).
- `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, any single Vitest file. Therefore no
  claim about their current pass/fail status is made here.
- In-browser mission completion for S01-S05 and the session mechanics listed at the end of section 3.
- Full calibration measurement and save flow through the UI (only enter, pose commands, leave); S01 calibration
  sensor readout was not parsed; calibrating in S03 and S04 was not driven to save.
- Institutional routes, login, cloud sync, CAS conflict, mission submit, release gating, mentor view.
- Mobile/tablet layouts, fullscreen, focus mode, 2D/3D switching, guided tour content, reduced motion.
- Production deployment, headers and bundle (no production URL was touched).
- Worker failure injection and network offline injection.
- S03 layout panel (`S03ScenarioPanel`), manual IR/button toggles during runs.
- Long-running soak, memory growth.
