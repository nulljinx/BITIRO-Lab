# 06 - UX, pedagogy and accessibility audit

Baseline: branch `audit/claude-bitiro`, date of run 2026-10-02. Read-only audit: no application code, data,
migrations or configuration were changed, no package was installed, no commit was made.
Classification: CONFIRMED (observed in browser or read in source), RISK (plausible, not demonstrated),
RECOMMENDATION. Screenshots and temporary files were kept outside the repository (the Playwright MCP output
folder `.playwright-mcp/` is git-ignored).

IMPORTANT, scope statement. The coordinator asked to stop exploring and write what had been observed. This report
is therefore PARTIAL. Section 12 lists everything marked "NO VERIFICADO". Do not read an absence of a finding in
those areas as a clean result.

## 1. Executive summary

BITIRO has a clear, calm first impression and a sound base of accessibility work (skip link, landmarks, labelled
forms, live regions, global reduced-motion rule, no horizontal overflow at 1440, 768 and 390 px). The lab layout
(simulator left, editor right, mission goals under the simulator) directs attention reasonably, and the feedback and
goals text give direction without giving the solution.

Confirmed findings: 0 critical, 1 high, 2 medium, 5 low. Accessibility issues counted: 6 (1 high, 1 medium, 4 low).
Risks: 7. Recommendations: 5.

Main items:
- HIGH (UX-1): the first-run tutorial is `aria-modal` but never takes focus. Tab goes to the page behind it and
  into Monaco, where each Tab keystroke inserts an indentation character into the student's code. 36 Tab presses
  left 74 leading spaces in line 1 and the damaged code was saved to localStorage. Keyboard users cannot reach the
  tutorial buttons at all.
- MEDIUM (UX-2): instructional and feedback text is 8.4-9.5 px in the lab (feedback card, mission goals, run
  buttons, toolbar labels). The most important pedagogical text is the smallest.
- MEDIUM (UX-3): running the untouched starter code reports "Ejecutando - Tu programa esta en marcha" for 25 s with
  no change and no hint that `loop()` is empty. The "Revisar codigo" check also says "listo para ejecutar".
- LOW: tour card overlaps the highlighted area in some steps (UX-4), landing marquee has no pause control (UX-5),
  login lacks a skip link and keeps submit disabled (UX-6), run/stop controls are split between two panels (UX-7),
  footer links are 16 px high (UX-8).

Reused, not repeated: F1 of `05-reliability-functional.md` (misleading "Falta ';'" for unsupported constructs) is
the largest pedagogical-feedback problem found by earlier phases; this report only adds its UX interpretation
(section 7).

## 2. Personas and environments tested

Personas: (1) first-time student, (2) returning student doing S01-S05, (3) mentor/docente (source-level only, see
section 12).

Environments (Playwright MCP worked in this run; the Chromium launch failure of phase 05 did not recur):
- `http://127.0.0.1:5173` normal build, Supabase configured. Landing `/`, `/login?next=/espacios`.
- `http://127.0.0.1:5174` guest laboratory (Supabase unconfigured). `/`, `/espacios` (redirects to login),
  `/intermedio/s01` in depth, `/intermedio/s03` only for layout measurements.
- Viewports: 1440x900 (landing, login, S01 in depth), 768x1024 and 390x844 (overflow and target-size measurement
  only, no visual review).
- `prefers-reduced-motion: reduce` emulated on the landing page.
- Evaluation frameworks: web-design-guidelines (Vercel rules fetched at run time) applied to DOM evidence;
  ui-ux-pro-max not queried, no visual-style recommendation is made.
- No production URL, account, Supabase MCP, `.env*` or real student data. No login was submitted.

Note on 5174: S01-S05 are reachable without an account only because Supabase is unconfigured. In the configured
build the student reaches them through `/espacios/...` after login (see 05, section 2). Header buttons "Crear cuenta"
and "Ingresar" and the breadcrumb "Mi programa" shown in the guest lab are therefore artefacts of that test
configuration and are not scored as UX defects.

## 3. Student journey

| Step | Observation | Verdict |
|---|---|---|
| Land on `/` | h1 "Aprende robotica programando al IROH."; subtitle states the loop "comprende, escribe, prueba, mejora"; three-step diagram Comprende / Programa / Prueba; primary CTA "Crear cuenta", secondary "Ya tengo cuenta"; note that the mentor gives the group code | Purpose and next action are clear |
| Register / login | Labelled fields, `autocomplete`, inline `role=alert` / `role=status`; text explains that registration does not join an institution and a mentor code is needed later | Clear, honest |
| Enter a session | Header "Mision 01 - Robotica Intermedia", h1 "Seguir linea y mover obstaculo", editor, simulator and goals visible at once | Orientation good |
| First-run tutorial | 9 steps, about 25-31 words each, skippable, Escape closes, reopenable via "Tutorial" | Content good; keyboard behaviour poor (UX-1) |
| First attempt | Feedback card says "Elige el estimulo inicial: activa solo IZQ o DER" before running (S01) | Good formative cue |
| Run starter code | "Ejecutando" with no motion for 25 s, no hint | Weak (UX-3) |
| Error | Spanish message with line and column, Monaco marker, workspace returns to editor (05, section 4) | Good except F1 cases |

First-time student: the landing explains what BITIRO is for and the next step. After entering the lab, the student
sees four objectives in plain language (S01: read IR and keep the route decision; follow the line with the central
sensor and a threshold; reach the corresponding base; move the obstacle to the opposite side). Wording is
actionable but terminology such as "umbral", "ADC", "estimulo IR" and "Golpe" appears without definition at first
contact; the Guide holds definitions but was NOT opened in this run (NO VERIFICADO).

Returning student: `explored` and `last-session` keys exist and code persists per session (05). Whether the UI
visibly resumes where the student left off was not checked (NO VERIFICADO).

## 4. S01-S05 educational UX matrix

Only S01 was inspected in the browser in this phase. Other columns use phase-05 evidence (idle feedback text,
availability) and are marked accordingly. "NV" = no verificado.

| Aspect | S01 | S02 | S03 | S04 | S05 |
|---|---|---|---|---|---|
| Objective visible without scrolling at 1440x900 | yes, 4 goals under the simulator | NV | NV | NV | NV |
| Idle guidance before running | "Elige el estimulo inicial" (IR left/right) | scenario IR/button (05) | obstacles and intersections (05) | generic "Listo para probar" (05) | generic "Listo para probar" (05) |
| Concepts surfaced | line sensor, threshold, IR stimulus, button, LCD, obstacle | NV | NV | NV | NV |
| Calibration | button "Calibrar", own panel (not opened here) | S02 three-sensor panel | S02 panel | S02 panel, thresholds from S01 key (05 F2) | same as S04 |
| Difficulty progression | NV | NV | NV | NV | NV |
| Hint vs answer | hints only; no solution in UI or starter code | NV | NV | NV | NV |
| Run / review / reset distinction | present (see section 7) | same controls | same | same | same |

Observation worth carrying forward (RISK, UX-R1): S04 and S05 fall back to a generic idle message while S01-S03
give a session-specific cue. If the scaffolding fades on purpose it is a pedagogically valid choice, but nothing
in the UI says so. The intent should be confirmed with the curriculum owners. Per-session objectives, concept
introduction order and terminology consistency across S02-S05 were NOT reviewed (NO VERIFICADO).

## 5. Accessibility assessment

Method: Playwright MCP accessibility snapshots plus DOM evaluation. No automated axe-type checker was run (none
in the project was invoked). Colour contrast was not measured (NO VERIFICADO).

### 5.1 What works (CONFIRMED)

- Landing and lab: "Ir al contenido" skip link first in tab order, `banner`, `navigation` with names ("Navegacion
  principal", "Ruta de navegacion", "Enlaces del pie de pagina"), `main#main`, one h1 per page, h2 under it.
- `lang="es"` on the document.
- Auth forms: every input has a visible `label`, `name`, correct `type`, `autocomplete` (`email`,
  `current-password`, `new-password`, `nickname`), `inputMode`, `spellCheck=false` on email, errors in
  `role="alert"`, success in `role="status"`, password visibility button with `aria-label`, no paste blocking.
  Source: `src/features/auth/AuthPages.tsx`.
- Landing images have meaningful `alt`; decorative letter marks are `aria-hidden`. The marquee duplicate set is
  `aria-hidden` and the rail has an accessible name that tells users it scrolls.
- Lab: canvas exposed as `img` with a text alternative that explains the controls ("Vista tridimensional de S01.
  Usa flechas para girar la camara..."); view switch is a `group` with `aria-pressed`; zoom value is a `status`;
  mission goals are a native `details/summary`; the feedback card is `aria-live="polite"`; the run result
  ("No se encontraron errores...") is a `status`.
- Telemetry exposes names ("Sensor de linea central", "IR izquierdo", "Libre OFF") rather than only colour.
- Tour dialog has `role="dialog"`, `aria-modal`, `aria-labelledby`, a labelled close button, a step
  counter and Escape support.
- `prefers-reduced-motion`: a global rule in `src/styles/global.css` L95 disables animation and transitions;
  the landing marquee and mascot float were running without the preference and had 0 running animations with it
  (CONFIRMED by `document.getAnimations()`); `SimulatorTour.tsx` switches `scrollIntoView` to `auto`.

### 5.2 Confirmed issues

| ID | Sev | Issue |
|---|---|---|
| UX-1 | high | Tour modal does not manage focus; Tab edits the editor behind it |
| UX-2 | medium | Text 8-9.5 px in key lab areas |
| UX-5 | low | Marquee without pause control (only hover and focus-within pause it) |
| UX-6 | low | Auth pages have no skip link; login submit is `disabled` until both fields are filled |
| UX-7 | low | Run and stop controls live in different panels |
| UX-8 | low | Footer links 16 px high |

Details are in section 8.

### 5.3 Not verified

Visible focus ring (`:focus-visible`) on lab controls, focus order after tour close, focus return after the Guide,
Monaco keyboard escape (Ctrl+M / accessibility mode), screen-reader behaviour of `aria-live` while a run is in
progress, canvas alternative for sim state while running, forced-colors and high-contrast modes, contrast ratios.

## 6. Responsive and mobile assessment

Measured on `/`, `/login`, S01 and S03 at 1440, 768 and 390 px:

| Viewport | Horizontal overflow | Lab layout | Interactive elements under 44 px | Under 24 px |
|---|---|---|---|---|
| 1440x900 | none (1440/1440) | two columns, page height equals viewport (no page scroll), canvas 572 px | S01 22, S03 20 | 1 |
| 768x1024 | none | single column, canvas 498 px | 11 | 0 |
| 390x844 | none | single column stacked, canvas 364 px, page height about 1670 px | 11 | 0 |

CONFIRMED: no horizontal page overflow in any of the 12 combinations. `.workspace-tabs` is `display:none` in CSS,
so the lab stacks panels instead of switching tabs on small screens; the tour "area" switch between simulator and
editor therefore does not need a tab control.

NOT visually reviewed (NO VERIFICADO): mobile screenshots, overlap or clipping of the sticky header, tour card
placement on a 390 px screen, calibration panel on a phone, whether the on-screen keyboard hides the editor, the
fullscreen mode, touch dragging in the 3D view, landscape orientation. Counts of targets under 44 px come from the
bounding box of `a, button, select, summary`; the 22 and 20 on desktop are mostly dense toolbar buttons (27-36 px
high by CSS in `src/styles/product-polish.css` and `workspace.css`), which is a RISK for touch use on tablets, not a
demonstrated failure (WCAG 2.2 AA minimum is 24 px; the 44 px figure is a guideline).

## 7. Pedagogical feedback and error experience

Evidence reused from 05 (not repeated): syntax, unknown function, missing `loop()`, infinite loop ("anade una
pausa"), `pausa()` range, recursion depth, divide by zero. All are reported in Spanish with line and column, marked
in Monaco, and recoverable.

Added UX reading:
- WHAT happened and WHERE: good (line and column, Monaco marker, workspace returns to the editor).
- WHY and WHAT NEXT: good for the infinite loop and unknown function; weak for unsupported constructs (05 F1 reports
  "Falta ';'" where the real problem is an unsupported type or a missing brace). For a beginner this is the
  likeliest source of frustration because the suggested fix does not work. Its UX severity is medium and it should
  stay first in the remediation order.
- Run versus review: "Revisar codigo" (static check, no motion) and "Probar codigo" (loads and runs) are clearly
  separated and the tour explains the difference. While a program runs both are disabled, and the primary
  "Probar codigo" button turns pale grey with no tooltip explaining why (CONFIRMED in screenshot).
- Reset versus complete: "Restablecer" is disabled before the first run and enabled during a run; a status line
  shows "Detenido / Ejecutando" and a clock. No explicit "Mision completada" state was observed because no mission
  was completed in this run (NO VERIFICADO). The distinction between "objectives met", "run stopped" and
  "reset" for a student was therefore not evaluated end to end.
- Formative feedback: the S01 card is anticipatory ("Elige el estimulo inicial") and then descriptive
  ("Ejecutando: setup() prepara el robot y loop() repite tus instrucciones"). Good vocabulary for beginners. It does
  not react to the situation "nothing is happening" (UX-3).
- Calibration mistake: not exercised in this run (NO VERIFICADO). 05 F3 documents stale scene state after leaving
  calibration without saving; its UX impact is a robot left at the calibration pose with "Prueba detenida" shown.

## 8. Confirmed findings

### UX-1 - Tutorial dialog does not trap or move focus; Tab edits the student's code (HIGH, CONFIRMED)
- Route/session: `http://127.0.0.1:5174/intermedio/s01`, first run (tutorial key empty), 1440x900.
- Reproduction: open the page with empty storage. Press Tab repeatedly (a keyboard user's natural action). After
  the dialog appears, `document.activeElement` is `BODY` and `dialog.contains(activeElement)` is false.
  Tab order was: skip link, logo, breadcrumb, Guide, header links, "Tutorial", "Ocultar codigo", pantalla
  completa, view buttons, zoom, calibrate, canvas, IR buttons, speed, objectives, "Descargar .ino", then the Monaco
  textarea, where focus stayed for the remaining presses. The tour buttons were never reached.
- Observed: the textarea value then began with about 74 spaces before `// BITIRO Lab`; the document stored under
  `bitiro:v7:guest:code:s01` was already modified. Pressing Escape closed the tour and set the tutorial key to
  `done`. The only keyboard routes that work are Escape and ArrowLeft/ArrowRight (window listener), which are not
  mentioned anywhere in the dialog.
- Expected: opening a modal moves focus to it (the title or first button), keeps Tab inside, and returns focus on
  close; the background is inert so typing cannot change the student's work.
- Evidence: Playwright MCP run on 2026-10-02; source `src/features/simulator/SimulatorTour.tsx`: root
  `role="dialog" aria-modal="true"`, `.sim-tour-guard` is `aria-hidden` and only blocks pointer events; no
  `focus()`, no focus trap, no `inert`.
- Affected: keyboard-only users, screen-reader users, switch users; indirectly any student who tabs through the page.
- Direction: focus the dialog heading or "Siguiente" on open, trap Tab, restore focus on close, set `inert` on the
  app root, show "Flechas para navegar, Esc para cerrar" in the card. Also see UX-R3 for Monaco.

### UX-2 - Instructional text is 8-9.5 px (MEDIUM, CONFIRMED)
- Route/session: S01, 1440x900 (same CSS applies at smaller widths).
- Reproduction: evaluate computed `font-size` of text nodes outside Monaco. Counts: 8 px (3: "ADC", "16 x 2",
  "Programacion"), 8.4 px (feedback card title and body), 8.5 px (hit direction), 8.7 px (mission goals header and
  count), 9 px (27 nodes: eyebrows, "Superior", "Perspectiva", ...), 9.5 px ("Revisar codigo", "Probar codigo"),
  10 px (13 nodes: "Tutorial", "Ocultar codigo", "Pantalla completa", ...), 11 px (2).
- Expected: reading text, labels and primary buttons for students (many 12-17 years old) at 12 px or more, or at
  least the feedback and objectives text that carries the pedagogy.
- Evidence: computed styles through Playwright; CSS `src/styles/product-polish.css` L153
  (`.feedback-panel h3,.feedback-panel p{font-size:9.5px}`), `workspace.css` L2-L8 (`.eyebrow 9.5px`,
  `.viewport-dim 9.5px`, `.editor-toolbar 9.5px`). The base body size is 15 px, so this is a deliberate dense
  "instrument" style rather than an inheritance mistake.
- Affected: all students, especially those with low vision or on projectors in classrooms.
- Direction: raise the feedback card, goals and run buttons first; keep decorative labels small if desired. Browser
  zoom works (no overflow found) but should not be the only remedy.

### UX-3 - Starter code produces an indefinite "Ejecutando" with no guidance (MEDIUM, CONFIRMED)
- Route/session: S01, untouched starter code, no IR stimulus chosen.
- Reproduction: click "Revisar codigo" (status: "No se encontraron errores. El codigo esta listo para ejecutar."),
  then "Probar codigo", wait 25 s.
- Observed: status "Ejecutando" and clock 25.3 s; feedback card still "Tu programa esta en marcha. setup() prepara
  el robot y loop() repite tus instrucciones." The robot did not move, 0/4 goals, no message about the empty loop
  or the unchosen stimulus (the "Elige el estimulo inicial" card that existed before the run was replaced).
- Expected: a gentle, non-answer hint after a few seconds without any actuator command, for example that the
  program has not moved the robot yet, plus the earlier IR reminder.
- Evidence: Playwright MCP; `src/simulator/LearningFeedbackEngine.ts` is 18 lines (the dynamic hints live in
  mission/feedback code that was not read, NO VERIFICADO).
- Affected: first-time students, the most common first click.
- Direction: add an inactivity hint (no motion or no actuator call for N seconds) and keep the stimulus reminder
  visible while the stimulus is unset. Do not reveal code.

### UX-4 - Tour card covers part of the highlighted area (LOW, CONFIRMED)
- Route/session: S01 first-run tour, 1440x900 (rects measured in step order).
- Observed: step 3 (track, spotlight 571x612), step 5 (telemetry) and step 6 (editor) have card and spotlight
  rectangles that intersect. In step 5 the card hides the lower part of the telemetry panel (LCD) that the text is
  describing; the card is placed `top` or `bottom` by target mid-height only (`SimulatorTour.tsx` `position`).
- Also: the 9 steps teach where tools are, not the sequence of a mission (stimulus, code, review, test, goals). Tour
  length (about 230 words) is acceptable and fully skippable.
- Direction: place the card beside the target when space allows. Optional: add one "your first mission" step.

### UX-5 - Landing marquee has no pause control (LOW, CONFIRMED, WCAG 2.2.2)
- `landing-sites-marquee` animates 42 s linear infinite, pausing only on hover, focus-within or active
  (`src/styles/institution.css` L1236-1254). It is correctly disabled under reduced motion with the duplicate set
  hidden. The rail contains no focusable items, so keyboard users cannot pause it.
- Direction: a visible pause button, or a static grid by default (the file already contains a 4-column grid
  variant at L35).

### UX-6 - Auth pages: no skip link, submit button disabled until filled (LOW, CONFIRMED)
- `/login`: `a[href="#main"]` absent while `main#main` exists; the `<Brand>` link and "Volver" come first. Short
  page, so impact is small. The submit "Ingresar" is `disabled` until email and password are non-empty
  (`AuthPages.tsx` `loginReady`); the guideline prefers an enabled button with an inline error. A student who
  cannot see why the button is inactive receives no explanation.
- Also (RISK): `setError(err.message)` shows the service message verbatim and may be in English; not exercised
  because no login was submitted.

### UX-7 - Run controls split across panels (LOW, CONFIRMED)
- Run and review are at the bottom right of the editor panel; Restablecer, speed, Pausar, Detener and status are at
  the bottom left of the simulator panel (1440 px). While running, the run button stays visible but disabled.
- Impact: moderate; students must look at both panels to control one action. On single-column layouts the two
  groups are far apart (page height about 1670 px at 390 px width).
- Direction: keep as is if intentional (editor owns "run", simulator owns "state"), but add a short disabled-state
  explanation or tooltip ("Detener para probar otra vez").

### UX-8 - Footer links 16 px high (LOW, CONFIRMED)
- Landing footer "Privacidad" 53x16 and "Ingresar" 41x16, all viewports. Below the 24 px WCAG 2.2 target minimum
  unless spacing exemption applies (they are separated, but not by 24 px of free space).
- Direction: add vertical padding.

## 9. Risks and recommendations

Risks (not demonstrated):
- UX-R1: S04 and S05 generic idle feedback versus S01-S03 specific cues; confirm intent (section 4).
- UX-R2: touch targets 27-36 px for toolbar buttons on tablets (section 6).
- UX-R3: Monaco captures Tab, so a keyboard-only user may be unable to leave the editor. The product exposes no
  hint about Ctrl+M or Escape behaviour; Monaco's default is that Tab indents. Not tested outside the tour.
- UX-R4: terminology without immediate definition at first contact (umbral, ADC, estimulo IR, Golpe, LCD).
- UX-R5: S04 and S05 calibration thresholds come from the S01 key (05 F2); the student sees a different
  calibration from the one the engine applies, which can make a correct reading look like a wrong program.
- UX-R6: `prefers-reduced-motion` kills all transitions globally, including the tour spotlight; harmless but means
  the reduced-motion tour has no visual continuity between steps.
- UX-R7: "No se encontraron errores" for a program with an empty loop could be read as "my solution is right".

Recommendations:
- R-A: add a short sentence to each review result separating "sin errores de sintaxis" from "cumple la mision".
- R-B: show "Atajos: flechas, Esc" in the tour; add a one-line note about leaving the editor with the keyboard.
- R-C: surface unit-free glossary tooltips for the five sensor terms on first hover or in the first tour.
- R-D: in S04 and S05 state in the card that guidance is intentionally reduced, if that is the design.
- R-E: keep the 9.5-10 px instrument style only for decoration; move text students must read to 12 px or more.

## 10. Strengths to preserve

- Intentional simplicity of the landing: one promise, one primary CTA, three-step loop, honest note that a mentor
  code is required.
- Auth forms are textbook-correct (labels, autocomplete, live regions, no paste block, explanatory copy that
  reduces anxiety about institutions and data).
- Pedagogically useful constraints: objectives in plain language that do not reveal the solution; starter code with
  comments like "Divide el desafio en tareas pequenas" instead of an answer; the IR-stimulus card before running.
- Errors in Spanish with line and column, Monaco markers and recoverable runtime (05).
- Skip link, landmark names, canvas alternative text, `aria-live` feedback, native `details` for goals, labelled
  telemetry.
- Global reduced-motion safeguard, applied to the carousel, mascot, and the tour scroll behaviour.
- No horizontal overflow at 1440, 768 and 390 px; desktop lab fits in one screen without page scroll.
- The tour is skippable, closable with Escape, reopenable ("Tutorial"), and sized at about 25-30 words per step.
- "Material" labelling for sessions without simulator (S06-S08, per 05).

## 11. Suggested improvement sequence

1. UX-1: tour focus management and inert background (small change, high value, also protects student code).
2. 05-F1 (diagnostic wording for unsupported constructs) and UX-3 (inactivity hint) as the highest pedagogical gains.
3. UX-2: raise the text size of feedback, goals and run buttons.
4. UX-R3 and R-B: document or change Monaco tab behaviour and keyboard exit.
5. UX-6, UX-7, UX-8: small hygiene (skip link, disabled-state explanation, footer padding).
6. UX-5: pause control or static sites grid.
7. Then run the untested areas in section 12, starting with S02-S05 mission flows on a phone-size viewport.

## 12. Coverage and untested areas

NO VERIFICADO (not run in this phase):
- S02, S03, S04, S05 in the browser (only S03 for layout measurement): objectives, concepts, progression, hints,
  error feedback per session, mission completion states.
- Calibration panels (S01 and S02 style), including the calibration mistake scenario.
- Guide / "Guia" dialog contents, terminology consistency, focus handling and glossary.
- Mobile and tablet visual review (no screenshots taken at 768 and 390), fixed or sticky header interaction,
  tour card on phone, fullscreen, orientation.
- Visible focus rings, focus order after closing tour, Monaco keyboard exit, screen-reader announcement timing,
  forced-colors, contrast ratios, text-spacing overrides.
- Mentor and workspace experience (`/espacios/...`, mentor view, cohort overview): requires login; not tested; only
  mentioned in source in earlier reports.
- Authentication flows beyond viewing `/login` (register, recover, update-password, error messages), `/privacidad`,
  `/comunidad`, `/cuenta`.
- 2D versus 3D toggle and "Seguir IROH" behaviour, telemetry during runs, S03 scenario panel.
- Run/pause/reset end-to-end for a successful mission (completion message, mission evidence).
- Automated accessibility checks (none were run).

Executed: 5173 landing and login (snapshots, DOM, reduced-motion emulation); 5174 landing, `/espacios`,
S01 (tour keyboard behaviour, nine tour steps measured, review, run of starter code, font-size and target
measurements, live-region inventory); overflow and target-size sweep across 4 routes by 3 viewports. Console and
failed-request logs were not re-audited here; 05 reports none.
