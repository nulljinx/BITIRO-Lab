# 06c - Visual design and consistency review

Date 2026-10-02, branch `audit/claude-bitiro`. Read-only: no code, data or config changed; no Supabase MCP; no
login submitted. `ui-ux-pro-max` loaded and used as a checklist only (no style, palette or font search: identity is
kept). Playwright MCP; screenshots in the git-ignored `.playwright-mcp/06c-*.png`. 06 and 06b were read only to
avoid duplicates; NOT repeated: small-text finding UX-2 as such, tour focus, marquee, run/stop split, axe contrast.
Font sizes below only explain hierarchy effects. CONFIRMED = observed and measured; RISK = plausible.

Environments: `127.0.0.1:5173` (landing, login), `127.0.0.1:5174` guest build (S01, S05, calibration); 1440x900 and
390x844. Guest-build header buttons ("Crear cuenta", "Mi programa") are a test artefact (06, section 2), not scored.

## 1. Summary

Identity is coherent (cream surface, deep blue accent, instrument-style lab, mascot). Confirmed: 0 high, 5 medium,
7 low (V-1 to V-12). Main pattern: type and spacing change between landing, login and lab (two families, three header gutters),
and the lab's size contrast (21-43 px titles and 17 px code vs 8-10 px controls) weakens hierarchy and grouping.
At 390 px S05 clips a toolbar button and puts the primary action about 1,580 px down the page.

## 2. Findings

### Medium

**V-1 - Primary lab action is out of first view on mobile (CONFIRMED).** S05 at 390x844: "Probar código" is at page
y=1579 (viewport 844; page 1,670 px). First screen shows header, title, three utility buttons, canvas and the
status card. Hierarchy puts "Tutorial / Ocultar código / Pantalla completa" (full-width pill row, y 147-181)
above the actions that matter. Evidence: `06c-s05-m.png`. Direction: lead with the run action or keep it sticky;
demote the utility row.

**V-2 - Simulator toolbar is clipped on 390 px (CONFIRMED).** In `.simulator-toolbar` the "Calibrar" button spans
x 326-406 inside a panel whose right edge is 378 and `overflow:hidden` (`simulation-panel`); the label reads "Cali".
`.viewport-tools` is 262 px wide inside a 364 px card next to the S05 chip and view switch. The zoom group (+/-/
fullscreen, about 180 px) is visually the heaviest control in the row while Calibrar, a primary learning step,
is the one cut off. Direction: wrap the toolbar into two rows or shrink the zoom group.

**V-3 - Lab hierarchy collapses at the control layer (CONFIRMED, desktop S01).** Titles are 20.9 px (h1) and code
is about 17 px monospace, but nearly all controls are 9-10 px (Restablecer 9, Calibrar 9, view switch 9, IZQ/DER 9,
"Ver objetivos" 8.7, feedback title 8.4 px). The eye goes to code and the 3D scene; the feedback card and the
goals row (the places that teach) sit at the bottom of the left column as the smallest, lowest-contrast items.
Goals were collapsed here ("Objetivos de la misión - 0/4 / Ver objetivos"), so not visible at first sight.
Direction: one intermediate type step for labels and feedback; keep the instrument look.

**V-4 - Grouping in the S01 right column is ambiguous (CONFIRMED).** The editor header stacks three bars: tab
(`intermedio_s01.ino` + "Guardado local"), a second bar (Arduino / IROH `local`, status pill "Listo para probar",
"Descargar .ino") and the code. The status pill ("Listo para probar", about 10 px, grey pill) sits between file
info and the download link with the same weight, so it reads as a button. "Detenido" is shown twice in the left
column (Robot header and bottom bar) and "Listo para probar" plus the feedback card repeat the same idea.
Direction: one status location; separate file metadata from run state.

**V-5 - Calibration on 390 px: action far from the thing it acts on, empty slots dominate (CONFIRMED).** S05
calibration, page 1,483 px. The map (the object to drag) is at y 314-722; the step title is at y 800; the only
action "Registrar los tres sensores" is at y 1336, about 1,000 px below the map. Between them three dashed
"Sin medir" slots, 60 px each, occupy about 190 px to display nothing. The disabled action uses
`#ECEAE5` fill and `#D9D6CF` border, the same grey family as the empty slots, so it reads as a fourth slot, not a
button. The 2D map uses a narrow strip (about 165 of 364 px wide) with large empty margins and goal labels of
about 5 px. Direction: compact empty slots into one row of three chips; keep the action next to the map.

### Low

**V-6 - Font family changes between surfaces (CONFIRMED).** Landing h1/h2/body are Poppins (42.9/34/15 px);
login h1, labels and inputs and the whole lab are IBM Plex Sans (login h1 43.2 px w600). Same-weight display heads
use different shapes one click apart, and the nav links on the landing are Plex while its body is Poppins. Not a
call for new fonts: assign each family one role across the three surfaces.

**V-7 - Header and content edges do not align (CONFIRMED).** Landing: logo left edge x=36, hero/section content
x=101; hero step cards reach x=1402 while the text column ends 641 and the institution card ends 1338; "Ingresar"
ends 1404. Login: logo x=49, form x=175, "Volver a BITIRO" ends about 1391. Lab: logo x=36 and content x=16.
Three different left gutters (36/49/16) for the same logo. Header background also differs: cream (landing, lab) vs
white (login).

**V-8 - Landing "Sedes participantes" logos read as disabled (CONFIRMED).** Partner logos are
`opacity:.74; filter:grayscale(1)` while the Fundación Mustakis logo is full colour; the Talca logos appear washed.
Cards are same size, but the grey treatment plus small 12 px captions makes the section recede. The note
"Los logotipos adicionales se incorporarán..." (about 11 px) is placeholder language shown to students.

**V-9 - Mobile landing: orphan nav row and card/mascot overlap (CONFIRMED).** At 390 px the single nav item
"Inicio" takes its own 40 px row under the header. The three step cards (Comprende/Programa/Prueba) overlap
the mascot and halo, and the right card's subtext wraps to two lines at about 9.5 px. The strap
"COMPRENDER - PROGRAMAR - / EXPERIMENTAR" breaks across lines mid-sequence. Evidence: `06c-landing-m.png`.

**V-10 - Login form: hierarchy and spacing (CONFIRMED).** Submit is a disabled pale lilac pill (about 116 px)
smaller than the 500 px inputs, with "Olvidé mi contraseña" aligned beside it as an equal-weight link; "¿Primera
vez? Crea tu cuenta" sits 10 px under the button, and "Privacidad y datos" 11 px. Labels are 11 px against 14 px
input text (label smaller than content). The right panel title "Continúa donde lo dejaste." starts at x=803 at y=308,
left-aligned over a centred illustration, and the two columns' text baselines do not line up (eyebrow y=299,
panel title y=308). The panel title says "continue where you left off" to a first-time visitor too.

**V-11 - Mixed control styles in lab header rows (CONFIRMED).** "Guía" (13 px, borderless, icon + text, 44 px)
and "Tutorial" (10 px, bordered, 36 px) are two help entries with different styles side by side; "Pantalla
completa" appears twice on desktop (top right and the zoom group icon) with different looks; toolbar buttons mix
bordered chips (Calibrar), borderless (view switch) and filled (zoom). At 390 px the same buttons grow to 13 px
(`06c-s05-m.png`) so desktop and mobile do not share a scale.

**V-12 - 3D canvas cropping and dead space (CONFIRMED).** Desktop S01: the board is cut by the telemetry column
at x=588 (right-hand edge not visible) and "GOLPE SIN INICIALIZAR" overlays the bottom right, while the
S05 mobile canvas shows the board filling about 40% of its height with about 200 px of empty dark area.
Overlay chips (BITIRO / S01 / 3D caption) are 9 px on a dark panel.

## 3. Working well (keep)

- Palette, rounded cards, mascot and tracked eyebrows are consistent; primary buttons are the strongest object.
- Calibration reuses the lab card/step language; the dark "Modo calibración" banner and "Salir de calibración"
  make context and exit clear. Telemetry figures (51 / 405) with a small state tag read well.
- No page-level horizontal overflow at 390 px in the screens reviewed.

## 4. Risks
R-1: the Poppins/Plex split may be intentional; confirm first. R-2: V-5 may be worse in steps 3-5 (only step 1 seen).

## 5. Recommendations (priority order)

1. Fix the clipped toolbar and surface the run action on mobile (V-2, V-1).
2. Introduce one readable minimum for feedback, goals and run labels; keep the instrument styling elsewhere (V-3).
3. Calibration mobile: compact empty slots, keep the action beside the map (V-5).
4. Define one header (background, gutter, logo position) for landing, login and lab (V-7), and one role per
   font family (V-6).
5. Single status location in the S01 editor/robot panels (V-4); unify help and utility buttons (V-11).
6. Polish: logo treatment, login spacing, mobile landing nav row (V-8, V-9, V-10, V-12).

## 6. Not verified

S02-S04; tablet; calibration steps 2-5 and desktop calibration; post-run states; dark/forced colours.
