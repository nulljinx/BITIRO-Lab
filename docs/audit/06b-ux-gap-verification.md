# 06b - UX gap verification (follow-up to 06)

Baseline: branch `audit/claude-bitiro`, run 2026-10-02. Read-only: no application code, data, migrations or
configuration changed, nothing installed, no commit, no Supabase MCP, no `.env*` read, no real account. Scratch
screenshots live in the session scratchpad, not in the repository. Playwright MCP worked in this run.
Status words: CONFIRMED / NOT CONFIRMED / PARTIALLY VERIFIED / NOT VERIFIED. Evidence class is marked as
FINDING (observed), RISK (plausible) or RECOMMENDATION. Document 06 was not modified.

The run was cut short by the coordinator; section 9 lists the gaps that stayed open and why.

## 1. Status per gap

| Gap | Status | One line |
|---|---|---|
| G1 S02-S05 educational UX | PARTIALLY VERIFIED | All four opened, starter, review, run observed; only S03 completed |
| G2 Calibration UX | PARTIALLY VERIFIED | S01 full 5-step flow, S02 and S05 first step; S04 not opened; phone view measured only |
| G3 Guide | CONFIRMED (issues) | Focus enters the dialog, Escape works; focus is lost on close; no definitions for ADC, IR, LCD |
| G4 Keyboard accessibility | PARTIALLY VERIFIED | Focus ring good; Monaco is a keyboard trap; tour focus still unmanaged when reopened |
| G5 Mobile/tablet visual | PARTIALLY VERIFIED | 390 px landing, S05, tour inspected; 768 px and 390 px calibration screenshots taken but not inspected |
| G6 Contrast and axe | PARTIALLY VERIFIED | axe-core 4.13.0 run on 3 pages; contrast failure NOT CONFIRMED for text |
| G7 Successful mission state | PARTIALLY VERIFIED | S03 mentor reference completed in browser; state after stop is contradictory |
| G8 ui-ux-pro-max | NOT VERIFIED | The skill was not loaded in this run |

New findings: 0 critical, 2 high (N1, N5), 3 medium (N2, N3, N4), 6 low (N6-N11). Details in section 9.

## 2. G1 - S02 to S05 educational UX (PARTIALLY VERIFIED)

Method: `http://127.0.0.1:5174/intermedio/s02..s05`, tutorial preset to `done`, 1440x900. Read DOM text, clicked
"Ver objetivos", "Revisar codigo", "Probar codigo" on the untouched starter and waited 6 s. Starter code was
cross-read in `src/content/sessions.ts` (L16-L178).

| Aspect | S02 | S03 | S04 | S05 |
|---|---|---|---|---|
| h1 | Tres sensores y eleccion de base | Contadores y ciclo while | Gaps y funciones | Desafio intermedio |
| Objectives | 4, collapsed behind "Ver objetivos" | 4 with counters (0/3, 0/3) | 4 | 4 |
| Idle card | "Elige un escenario S02" with the DER/IZQ/ambos mapping | "Desafio S03 listo ... 3 obstaculos y 3 intersecciones" | generic "Listo para probar" | generic "Listo para probar" |
| Starter scaffold | 5 numbered steps in `loop()`, tells the student to replace thresholds "que obtuviste al calibrar" | 6 numbered steps, names `while` | helper `leerSensores()` already written, 6 steps | helper given, 6 steps incl. base mapping by counter |
| After "Revisar codigo" | "No se encontraron errores. El codigo esta listo para ejecutar." | same | same | same |
| Card while running | generic "Ejecutando - Tu programa esta en marcha" | live "Obstaculos detectados 1/3 - intersecciones 0/3" | generic | generic |

CONFIRMED (FINDING):
- Objectives are collapsed by default in all sessions (only "Objetivos de la mision - 0/4 / Ver objetivos" shows).
  Document 06 section 4 says S01 shows "4 goals under the simulator"; in this run S01 was also collapsed after
  load. Treat 06's "objective visible: yes" as partially wrong: the count is visible, the wording needs a click.
- Terminology appears without definition at the point of use: "Estimulo IR", "ADC", "Pulsador", "LCD 16x2",
  "umbral" (S02-S05). S02 is the only starter that tells the student where thresholds come from (calibration).
- Progression is visible in the starter code rather than in the UI: S02 introduces the scenario choice, S03
  counters and `while`, S04 a helper function and gaps, S05 combines them. The numbered comments are a plan, not
  a solution, but S05's comments state the base mapping (`contador == 1 -> Base 1 ...`), so the "challenge" is
  closer to a transcription task. Pedagogical judgement, flag to curriculum owners (RISK).
- UX-R1 of 06 refined: the generic idle card is a card-only difference. S04/S05 do keep scaffolding in code
  comments, so "guidance fades" is only half true. Still no sentence explains the fade (R-D of 06 stands).
- UX-R7 of 06 CONFIRMED for S02-S05: an untouched starter returns the same green-light message ("listo para
  ejecutar") as a correct program. Nothing says "sin errores de sintaxis no significa mision cumplida".
- UX-3 of 06 extends to S02: the scenario reminder card is replaced by the generic running card as soon as the
  program starts, so a student who forgot to choose DER/IZQ gets no cue. S03 is the good model: the running card
  carries the mission counters ("Obstaculos detectados 1/3 ...").
Mission completion: only S03 was completed (section 7). S02, S04, S05 completion NOT VERIFIED.

## 3. G2 - Calibration UX (PARTIALLY VERIFIED)

Exercised: S01 full flow (white x3, black x3, own threshold, check, save screen), S02 and S05 first step, S01
exit without saving, keyboard fine adjust. S04 not opened (S05 uses the same panel, titled "CALIBRACION S05").
S03 not opened.

CONFIRMED strengths (preserve):
- Five-step stepper (Blanco, Negro, Umbral, Probar, Guardar) with one instruction per step.
- Sensor value shown at 31 px with a text state ("Superficie NEGRO/BLANCO"); S02/S05 show three values L/C/R
  with BLANCO/NEGRO tags. Readable at a glance.
- A disabled "Registrar lectura" button always has a reason below it ("El sensor central aun no esta
  completamente sobre blanco"); each recording gets a status line ("Lectura blanca 2/3 registrada").
- The student computes the threshold: "Elige un numero mayor que 38 y menor que 401. No hay una unica respuesta
  correcta." Then verifies it ("Comprobar esta lectura") before the final screen shows `int umbral = 200;`.
  Good formative design, does not hand over the answer.
- Keyboard: the robot canvas is focusable (`tabindex=0`, role img) and arrows move it ("flechas = ajuste fino").
  8 x ArrowLeft changed the reading 410 to 404 and 8 x ArrowUp 404 to 37. A keyboard-only route exists.
- Save versus exit is labelled separately: "Guardar calibracion y volver" (panel) versus "Salir de calibracion"
  (top right).

FINDINGS (new UX evidence):
- N7 (low) Exit discards a finished calibration silently. After a passing check ("Funciona!") the top-right
  "Salir de calibracion" returned to the lab with no confirmation and nothing stored (no calibration key in
  localStorage). The two buttons are far apart and the exit has no "sin guardar" wording.
- F3 of 05 gets visual evidence: after exit the robot stays at the track fork, the central sensor reads 0, the
  feedback card shows the pre-session text and "Restablecer" is disabled. A student sees a robot that is not at
  the start with no control to put it back (only "Probar codigo" resets it).
- N8 (low) Threshold input (`#student-threshold`, `min=39 max=400`, placeholder "?") gives no inline message for an
  out-of-range value (9999 typed): the "Usar mi umbral" button simply stays disabled. Accessible label wiring of
  that input was not checked.
- Calibration text is small: minimum computed 7.5 px in S02/S05 panels (8.5 px instruction text in S01), same
  family as UX-2.
- Phone: measured (390x844) page height 1383 px, the live sensor value sits about 1016 px from the top while the
  draggable canvas starts at 314 px and is 408 px tall, so the value is out of sight while dragging (measurement
  only; screenshot not inspected, see section 9).
Stale-scene behaviour already reported in 05 F3 is not duplicated beyond the evidence above.

## 4. G3 - Guide (CONFIRMED: issues)

Facts: the Guide is a native `<dialog class="guide" aria-labelledby="guide-title">` opened by
`button.guide-button` (aria-label "Abrir guia y conceptos"; the visible label "Guia" is contained in it).

- Opening with Enter moves focus to "Cerrar guia" (CONFIRMED good). Tab then goes to the function search input
  and the `summary` rows (focus stays inside). Escape closes it (CONFIRMED good).
- N3 (medium) Focus is not returned. After Escape and after the close button, `document.activeElement` was
  `BODY`, not the "Guia" button, so a keyboard user restarts from the skip link.
- N4 (medium) The Guide does not define the first-contact terms. Content for S01: five pills "IR, Linea, LCD,
  Umbral, Variables de estado" are plain `<span>`s with no text, title or link (CONFIRMED, tabindex -1). Occurrences in
  the dialog text: "ADC" 0, "pulsador" 0, "estimulo" 0, "sonar" 0 (appears only as a function name), "IR" 3, "LCD"
  1, "umbral" 2 (one sentence: "Mide blanco y negro antes de elegir cada umbral"). The function reference is good
  (28 entries, ranges, examples, e.g. "Lectura analogica 0-1023") but it explains calls, not concepts. UX-R4 of
  06 is therefore CONFIRMED, and R-C is still the right direction.
- Positive: the "Una senal no es una orden" and "Calibra antes de comparar" cards are good conceptual framing.
- Background is not `inert`; the native dialog handles that. No focus problem inside the dialog was found.

## 5. G4 - Keyboard accessibility (PARTIALLY VERIFIED)

- Visible focus (CONFIRMED good): 14 consecutive Tab stops from "Crear cuenta" to the "Libre OFF" button all had
  `outline: 3px solid rgb(36, 88, 166)`; the "Perspectiva" toggle also has a box-shadow. No control without an
  indicator was found in that pass.
- Natural order (CONFIRMED good for the header and simulator toolbar): skip link, logo, breadcrumb, Guia, account
  links, Tutorial, Ocultar codigo, fullscreen, view buttons, zoom, Calibrar, canvas, IR buttons. Calibration mode:
  Salir de calibracion, canvas, Reiniciar mediciones, then body.
- N5 (high for keyboard-only users, CONFIRMED) Monaco is a keyboard trap. In the editor textarea: Tab inserted
  indentation (+2 characters), Shift+Tab, Escape then Tab, and Ctrl+M then Tab all left focus in the same
  textarea ("Codigo Arduino"). The only visible exits found were the mouse or going backwards through the page
  from outside. No hint about Ctrl+M or any exit shortcut exists in the UI (`CodeEditor.tsx` has no
  `tabFocusMode` or accessibility setting). WCAG 2.1.2. Caveat: Ctrl+M was sent as a synthetic key from
  Playwright; Monaco enables its screen-reader mode by detection, so a real assistive-tech session might behave
  differently (NOT VERIFIED with a screen reader). UX-R3 of 06 is upgraded from RISK to CONFIRMED.
- UX-1 extended (low): reopening the tour with the "Tutorial" button (keyboard Enter) also leaves focus on the
  "Tutorial" button behind the modal; the next Tab goes to "Ocultar codigo" in the background; Escape closes and
  focus stays there. Focus is never moved into or restored from the dialog. Same root cause as UX-1, so the
  problem is not limited to first run.
- Focus restoration after Guide: see N3. After the tutorial: trivially "restored" only because focus never left.

## 6. G5 - Mobile and tablet visual pass (PARTIALLY VERIFIED)

Inspected visually at 390x844: landing (viewport), S05 with tutorial (steps 1, 3, 5), S05 top and after run.
Measured only: page widths and heights at 390 and 768.

- Landing 390: hero, CTAs, mascot and process cards fit, no overflow (scrollWidth 390, height 2338). Looks clean.
- Tutorial card 390: pinned at the top, 328 px wide buttons 38 px high, readable at normal size; at steps 3 and 5
  the card does not cover the spotlight (UX-4 did not reproduce on phone). The telemetry becomes a collapsed
  "Sensores y telemetria" row, which is a sensible mobile adaptation.
- S05 390: single column, sticky header 72 px tall, canvas about 410-440 px, no horizontal overflow of the page.
- N9 (low, CONFIRMED) The simulator toolbar overflows its panel: the "Calibrar" button spans x=326..406 in a
  390 px viewport; `.simulation-panel.is-3d-view` is `overflow:hidden`, so the label shows as "Cali" (toolbar
  scrollWidth 393 vs clientWidth 364). A student on a phone cannot read the entry point to calibration, and the
  button is cut by about 16 px.
- UX-7 measured on phone: "Probar codigo" and "Revisar codigo" are at y=1579 on a 1654 px page; "Restablecer" is at
  y=767 and the feedback card at y=848. During a run the run button is about 800 px away from the status. After
  pressing run the page stayed at the top (scrollY 0), so the simulator is in view, which is helpful; the stop
  button wraps to a second row and falls below the fold at 844 px.
- Touch targets measured on S05 390: only the logo link (134x30) and three 24x29 buttons are below 32 px in the
  checked set. This lowers the weight of UX-R2 on phone; the dense desktop toolbar was not re-measured.
- Full-page screenshots show the sticky header and the skip link in the middle of the stitched image. That is an
  artefact of capturing a sticky/fixed layout, not reported as a defect.
- 768x1024 and the 390 px calibration screenshots exist but were not looked at before the stop order. Only layout
  numbers are claimed: 768 calibration and S01 pages had scrollWidth 768 (no overflow), height 1024.
- Fullscreen, landscape, on-screen keyboard over Monaco, touch orbit: NOT VERIFIED.

## 7. G7 - Successful mission state (PARTIALLY VERIFIED)

Method: S03 only. The existing reference program was loaded through the project's own module
(`/src/content/mentor-solutions.ts`, served by Vite) into the guest storage key for S03, then run in the UI at 2x.
No lesson was solved by hand.

Timeline (UI text): "Obstaculos detectados 1/3 ..." to "3/3 - intersecciones 2/3" then at about 110 s of
simulated time the card changes to "Desafio S03 superado - El IROH completo los cuatro criterios observables de la
mision." and the goals header to "4/4 Superada en simulador". A status line says "Resultado de practica
autoevaluado por el simulador. No equivale a una calificacion ni a validacion del mentor." (10 px). Good honesty.

FINDINGS:
- N1 (high) Completion is not a terminal state and stale success survives stop. After "superado" the program kept
  running: after 286 s of simulated time the bar still said "Ejecutando", Pausar/Detener were still shown and the
  robot kept circling. Pressing "Detener" gave status "Detenido", but the card still said "Desafio S03 superado"
  with a green check, while the goals header read "0/4 - Superada en simulador" and all four goal checkboxes were
  empty. A student cannot tell if the mission is passed or not. Source: `MissionPanel.tsx` L22 uses
  `evidence.status==='completed'` for both the icon and "Superada en simulador" but counts `checks.passed` live, so
  the two diverge as soon as evidence resets. Severity high because it undermines the one piece of feedback that
  says whether the learning goal was met (pedagogy priority 4 in `PRODUCT.md`), though no data is lost.
- N2 (medium) Stopped, completed and reset are not distinguishable. Detener keeps the green "superado" card;
  Restablecer wipes it and returns "Desafio S03 listo ... Pulsa Probar codigo" with no trace that the mission was
  passed in this session. "Probar otra vez" stays visible after both.
- N6 (low) No next step: no "Siguiente sesion" link, no summary, no prompt to review the code, no celebration; the
  main area has no links at all (guest build, institutional submit path not exercised). Institutional submit
  ("No se pudo sincronizar", `MissionPanel` auto-submit) is NOT VERIFIED here.
Strength: the running card for S03 shows live counters, which is the best formative feedback seen so far.
S01, S02, S04, S05 completions: NOT VERIFIED.

## 8. G6 and G8 - Contrast, axe and visual consistency

axe-core 4.13.0 injected from `node_modules` (no install), default rules:
- Landing (5173): 0 violations; incomplete: color-contrast 17 nodes, aria-prohibited-attr 1.
- Login (5173): 0 violations; incomplete: color-contrast 1.
- S01 (5174): 2 violations.
  - `heading-order` (moderate), CONFIRMED in DOM: the page goes `h1` to `h3` ("Elige el estimulo inicial", the
    feedback card) with no `h2` (N10, low).
  - `color-contrast` (serious), `.dimmed-line-number` fg `#404750` on `#101419`, ratio 1.96, 14 px. Examined:
    it is the dimmed Monaco line number of the trailing empty line; real but cosmetic (N11, low).
Manual check: a script that resolved the foreground over opaque ancestors for every visible non-Monaco text node on
the three pages found no text under its required ratio except the disabled "Ingresar" button on login (4.21;
disabled controls are exempt). The 17 landing "incomplete" nodes involve images or gradients that the script
cannot resolve. Result: low-contrast text is NOT CONFIRMED; hero text over images and Monaco token colours NOT
VERIFIED. Small size (UX-2) remains the actual legibility problem, not colour.

G8 NOT VERIFIED. The ui-ux-pro-max skill was not loaded. Informal observation, not a skill-backed review: the
landing, lab and 390 px lab share the same dark-navy primary, light cream surface, monospace labels and card
style; I did not see colour or component drift between them. The only evidence-backed visual issue is N9.

## 9. New findings summary

| ID | Sev | Finding | Affected | Direction (recommendation) |
|---|---|---|---|---|
| N1 | high | Mission stays "Ejecutando" after being passed; after Detener the card says superado and the header "0/4 - Superada" | every student | derive the badge from the same value as the count; stop or freeze on completion |
| N5 | high (keyboard) | Monaco traps Tab, no exit hint (WCAG 2.1.2) | keyboard, switch, screen-reader users | enable tab-focus mode or document Esc/Ctrl+M visibly |
| N2 | medium | Stopped, passed and reset are indistinguishable | students, mentors reading screens | explicit states: "Superada en este intento", "Detenida", "Reiniciada" |
| N3 | medium | Focus lost to BODY after closing the Guide | keyboard users | restore focus to the opener |
| N4 | medium | Guide lacks concept definitions (ADC, IR, LCD, pulsador, estimulo, sonar); pills are inert | first-time students | short glossary entries; make pills expandable |
| N6 | low | No next step after success | students | show next session and a short recap |
| N7 | low | Exit from calibration discards a finished calibration without warning | students | confirm or label "salir sin guardar" |
| N8 | low | Threshold input gives no message for out-of-range values | students | inline hint tied to the input |
| N9 | low | "Calibrar" clipped at 390 px | phone users | let the toolbar wrap or scroll |
| N10 | low | h1 to h3 heading skip on the feedback card | screen-reader users | use h2 |
| N11 | low | Dimmed Monaco line number 1.96:1 | none material | ignore or exclude |

Reproduction (short):
- N1/N2: S03 guest, load reference program, Probar codigo at 2x, wait about 55 s, read card, wait 60 s more, click
  Detener, read card and goals header (screenshots `s03-complete.png`, `s03-afterstop.png` in the scratchpad).
- N5: S01, click into the editor, press Tab, Shift+Tab, Esc then Tab, Ctrl+M then Tab, read `document.activeElement`.
- N3: S01, focus the Guia button, Enter, Escape, read `document.activeElement`.
- N4: open the Guide, search the dialog text for "ADC", "pulsador", "estimulo".
- N7: S01 Calibrar, complete the five steps, click "Salir de calibracion" without "Guardar".
- N9: 390x844, S05, evaluate the Calibrar bounding box.

## 10. Reconciliation with document 06

- UX-R3 (Monaco keyboard exit): RISK to CONFIRMED (N5). UX-R4 (terminology): RISK to CONFIRMED (N4).
- UX-R7 (review reads as success): CONFIRMED for S02-S05 starters. UX-R5 (S04/S05 calibration from S01 key): not
  re-tested; the S05 panel renders consistently as "CALIBRACION S05".
- UX-4 (tour card overlaps highlight): did not reproduce at 390 px steps 3 and 5; remains desktop-only.
- UX-1 extended to reopened tours (section 5).
- 06 claim "objective visible: yes": corrected in section 2.

## 11. Gaps not closed and why

- S04 and S05 mission completion, S01/S02 completion: out of time after the stop order; only S03 was run to the end.
- S04 and S03 calibration panels, calibration save path with persistence check and reload: not opened.
- 768x1024 visual review, 390 px calibration visual review, tutorial card at 768: screenshots were captured but
  not examined before the stop order. Only numbers are reported.
- Fullscreen, landscape, virtual keyboard, touch orbit, forced colors, text-spacing: not attempted.
- Screen-reader behaviour of Monaco and of live regions during a run: no screen reader available.
- Contrast of text over images (landing hero) and Monaco token colours: not measurable with the script used.
- G8 ui-ux-pro-max: not loaded, so no skill-backed visual-consistency review was made.
- Institutional paths (mentor view, mission submit, next-step in a workspace): require login, out of scope.
