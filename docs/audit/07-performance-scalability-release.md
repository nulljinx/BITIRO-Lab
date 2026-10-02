# 07 - Performance, scalability and release-readiness audit

Baseline: branch `audit/claude-bitiro`, package version 8.00.0. Date of run: 2026-10-02.
Classification: CONFIRMED (measured or read in source), RISK (plausible, not demonstrated), RECOMMENDATION.
No application code, migrations, data or configuration were changed. No dependency was installed, nothing was deployed or committed.
Supabase MCP was not used. `.env*` was not read (the build itself loads `.env.local` through Vite).

This report was closed early on a coordinator instruction ("stop measuring, write now"). The soak test and the
Supabase static review were NOT completed. Section 14 lists every area that is unverified. Do not read an absence of
findings in sections 4 and 6 as evidence that those areas are healthy.

## 1. Executive summary

The production build is healthy in structure: the entry bundle is separate from Monaco and from the simulator, the
heavy code is lazy, no source maps ship, hashed assets are served `immutable`, and the typed worker protocol keeps
the engine off the main thread. Landing and login render quickly in local measurements.

The most serious finding is not performance but release safety. Nothing in `package.json`, `tools/` or
`.github/workflows/ci.yml` compares the repository's migrations with the live database, and the deploy pipeline
(Netlify `pnpm build`) never touches Supabase. The repository has 7 migrations while the live project had 5, and no
automated step could have failed because of it (section 8).

Confirmed findings: 0 critical, 1 high, 2 medium, 5 low. Risks: 11. Recommendations: 8.

| ID | Severity | Summary |
|---|---|---|
| F1 | high | No migration-parity guard in CI or deploy; repo/live drift (7 vs 5) is undetectable by the release process |
| F2 | medium | Login page ships a 15-layer mascot of 1.27 MB, about 80% of the page's transferred bytes |
| F3 | medium | Release gates never exercise the configured-Supabase (institutional) build in a browser |
| F4 | low | CSP blocks the Google Fonts `@import`; console error on every page; Poppins never applies |
| F5 | low | Entry chunk carries mentor/institution page code; mentor solutions ship in the student editor chunk |
| F6 | low | `supabase/tests/rls.test.mjs` hard-codes the migration list |
| F7 | low | `pnpm build` rewrites a tracked file; `sourceHash` covers only `src/`; `verify-release.mjs` is not wired |
| F8 | low | Engine and all track data are duplicated between main thread and worker; cost grows per session |

## 2. Build and bundle measurements

Command: `rm -rf dist && pnpm build` (tsc, release metadata, Vite 7.3.5). Result: success in about 20 s, 2596 modules.
Vite warns that `CodeEditor` exceeds the configured 650 kB warning limit (`vite.config.ts`: `chunkSizeWarningLimit:650`,
`target:'es2022'`).

Total `dist`: 11,884,352 bytes (12 MB). `dist/assets` is about 3.9 MB; the rest (about 7.9 MB by subtraction) is copied
`public/` media. Source maps: 0 files in `dist`.

| Asset | Raw | gzip -9 | Loaded by |
|---|---|---|---|
| `index-*.js` (entry) | 581,476 | 168,318 | every page |
| `index-*.css` | 289,478 | 47,744 | every page, render-blocking |
| `CodeEditor-*.js` (Monaco + editor + mentor solutions) | 2,328,178 | 600,224 | any session route |
| `CodeEditor-*.css` | 66,405 | 11,040 | any session route |
| `editor.worker-*.js` (Monaco worker) | 231,288 | 70,383 | session route |
| `Simulator-*.js` | 158,254 | 50,477 | session route with simulator |
| `simulator.worker-*.js` | 96,324 | 30,699 | session route with simulator |
| `AuthPages`, `AccountPage`, `AdminPage`, `ContentPages`, `cpp`, 2 icon chunks | 37,611 total | about 14 K | on demand |
| 8 font files (woff + woff2 both emitted) | 168,772 | n/a | browsers fetch woff2 only (71,024 measured) |

Served with the project's `tools/serve.mjs` (brotli quality 4), `CodeEditor` transfers 593,890 bytes. Production
compression on Netlify was not measured.

Composition (source-map attribution from a diagnostic build written outside the repository, `vite build --sourcemap
--outDir <scratchpad>`; this was a second build, used only for analysis):
- Entry chunk, 581 KB: react-dom 210 KB, Supabase packages about 224 KB (auth-js 105, realtime-js 33, phoenix 26,
  storage-js 23, postgrest-js 17, supabase-js 11, iceberg-js 5, functions-js 3), react-router 40 KB, lucide 10 KB,
  application code 83 KB (of which `WorkspacePages.tsx` 38 KB, `sessions.ts` 8 KB, `App.tsx` 8 KB, `Guide.tsx` 6 KB, `api.ts` 4 KB).
- `CodeEditor` chunk: `monaco-editor` 2.28 MB of 2.33 MB; `mentor-solutions.ts` 15.4 KB; `CodeEditor.tsx` 12.7 KB.
  Only the C++ language is loaded (`cpp-*.js`, 5 KB) and only the base `editor.worker`; no TS/JSON/HTML Monaco workers.
- `Simulator` chunk: `SimulationEngine.ts` 52.8 KB, `MissionEvaluator.ts` 11.9 KB, both calibration panels 24 KB,
  `Scene3D.ts` 10.3 KB, `CanvasRenderer.ts` 5 KB. Track JSON is not attributed by the map (see F8).
- `simulator.worker`: runtime (parser, interpreter, adapter) 67 KB, `MissionEvaluator` 11.9 KB, `SimulationEngine` 9.4 KB attributed.

Public media shipped in `dist` (not all referenced): `brand/iroh/iroh-mustakis-learning-flow-approved.png` 1.53 MB,
`brand/bitiro-icon.png` 830 KB and `brand/bitiro-logo.png` 313 KB have no reference in `src/` or `index.html` (grep on the
file names found only the unrelated `cyt-talca-group.jpg`). `brand/mustakis/cyt-talca-group.jpg` is 1.6 MB and is a CSS
background in `src/styles/institution.css` (L929, L988); it was not measured in a page load. `public/tracks/s01..s05.png`
total 1.19 MB (s04 559 KB, s05 489 KB) and were not requested in the S01 or S05 measurements.

## 3. Loading and code splitting

Evidence from `src/app/App.tsx` L13-19 and the build:
- `Simulator`, `AuthPage`, `AccountPage`, `AdminPage` and the content pages are `lazy()`. `CodeEditor` (Monaco) is lazy
  inside the simulator route. Confirmed by network capture: landing requests 1 JS (entry) + 1 CSS; login adds
  `AuthPages` and a 199-byte icon chunk; neither requests Monaco, the simulator or any worker.
- `tools/verify-release.mjs` L9 additionally fails if `index.html` references `CodeEditor` or `monaco-`. The check is good
  but is not run by any script or workflow (F7). `dist/index.html` currently has one script and one stylesheet, no modulepreload.
- Monaco is therefore isolated from users who never enter a session (strength S2).
- Mentor-only code is not isolated: `WorkspacePages.tsx` (landing, spaces, mentor workspace, organization pages) is a
  static import at `App.tsx:10`, so it sits in the entry chunk for students and guests (F5). It is 38 KB raw of the 83 KB of
  application code in the entry chunk. Admin and account pages are correctly lazy.
- Session content scaling: `src/content/sessions.ts` and `src/content/api.ts` are in the entry chunk; mentor solutions
  are in the editor chunk; track JSON is imported statically by `src/content/tracks/index.ts` L2-6 and therefore
  lands in the simulator chunk and in the worker (section 7).

## 4. Runtime, worker and rendering

Reused from phase 05 (not repeated): one live worker per session (created 24, terminated 23 after 7 rapid switches),
`requestId` staleness checks, 10 s start/review deadlines, clean recovery after 10 reset/rerun cycles, no console errors.

Source evidence (`simulator.worker.ts`, `useSimulation.ts`, `config.ts`, `SimulationEngine.ts`):
- Physics tick: `setTimeout(tick, PHYSICS_STEP_MS = 10)` inside the worker, re-armed only while `engine.status==='running'`;
  no timer runs while idle, paused or finished. `configure` and `schedule` clear the previous timer.
- Telemetry: a snapshot is posted at most every `TELEMETRY_MS = 100` ms, on status change, and after every command.
  Measured: 9.6 and 10.3 messages per second over the first 19 s of a run (consistent with 10 Hz).
- Snapshot size is bounded: `events.slice(-12)`; the engine keeps at most 256 events (`emit`, `events.shift()`).
  Mission evidence is accumulated in fixed-size per-session fields and sets keyed by zone/intersection id.
- Cleanup: the hook terminates the worker, clears the deadline and sets `disposed` on effect cleanup.
- 2D rendering (`Arena.tsx`): redraws on each snapshot with a 100 ms tween via `requestAnimationFrame`, which stops
  once the tween ends (`running&&t<1`); there is no permanent animation loop. It skips drawing when `document.hidden`
  or the canvas has size 0. `CanvasRenderer.ts` caches `Path2D` per track in a `WeakMap`, caps DPR at 2, and resizes the
  bitmap only when its size changes.
- 3D rendering (`Arena3D.tsx` + `Scene3D.ts`, software projection on a 2D canvas, default view `perspective`): redrawn
  once per snapshot (about 10 Hz, no tween) and on resize via `ResizeObserver`. The effect depends on `snapshot`, so the
  observer is created and disconnected on every snapshot. It has no `document.hidden` guard.
- React: `useSimulation` calls `setSnapshot` for every snapshot, and `Simulator.tsx` and the panels use no `React.memo`
  (grep: only `useMemo` in calibration panels and the tour). The simulator tree therefore re-renders at about 10 Hz during a run.

Measured, partial soak (S01, 3D perspective, 1440x900, headless Chromium, custom looping program, 19 s only):
heap after forced GC 11.08 MB at start, 11.33 MB at 10 s, 11.38 MB at 19 s; DOM nodes constant at 644; event listeners
constant at 268; worker count constant at 1; main-thread task time about 8% of wall-clock with script about 3.5%.
This is too short to conclude anything about leaks. The planned 5-minute soak (3 min 3D, 1.5 min 2D, 1 min follow camera)
was stopped by instruction. Worker heap and CPU are not observable with this method and were not measured.

Conclusions: no measured bottleneck. Observations without measurement: React re-render at 10 Hz, the 3D redraw rate
(10 fps) and the unguarded hidden-tab case are theoretical optimisation points, not findings.

## 5. Browser measurements

Method: Playwright MCP (it launched this time) opening a fresh browser context per page, 1440x900, headless Chromium,
production build served by `tools/serve.mjs`, 2.5 s settle. Landing and login were taken from the Supabase-configured
build (`dist`, port 5197). S01 and S05 are only reachable as guest in a build without Supabase env (phase 05), so they
were taken from a build made with empty Supabase variables (`dist-e2e`, port 5198, the same technique `tools/run-e2e.mjs` uses).
Local numbers are comparative evidence only, not a benchmark. Transferred = `encodedBodySize` (brotli from the local server).

| Page | Requests | Transferred | Decoded | FCP | LCP | Long tasks | CLS | JS heap | DOM nodes |
|---|---|---|---|---|---|---|---|---|---|
| Landing `/` | 14 | 476 KB | 1.13 MB | 136 ms | 252 ms | 0 | 0.008 | 4 MB | 219 |
| Login `/login` | 32 | 1,588 KB | 2.25 MB | 136 ms | 540 ms | 0 | 0 | 4 MB | 85 |
| S01 `/intermedio/s01` | 18 | 1,027 KB | 3.64 MB | 184 ms | 1,108 ms | 2 (86, 58 ms) | 0.015 | 16 MB | 513 |
| S05 `/intermedio/s05` | 18 | 1,027 KB | 3.64 MB | 168 ms | 1,068 ms | 2 (91, 61 ms) | 0.021 | 16 MB | 618 |

Reading:
- Landing: JS 169 KB, CSS 51 KB, images 177 KB (two webp 131 KB, three png 46 KB), fonts 71 KB.
- Login: JS 174 KB but 21 PNG requests totalling 1.28 MB: the layered mascot (F2).
- Session routes: 816 KB of JS transferred (Monaco dominates), 63 KB CSS, simulator worker 31 KB, S01 and S05 identical in
  bytes. LCP is about 4x the landing page's. The two long tasks fall at 250-470 ms, during chunk evaluation and first render.
- Not measured: repeated navigation and warm-cache loads, simulator ready latency separately from LCP, mobile viewports,
  CPU throttling, network throttling, mentor/organization pages, Lighthouse.
- Console: every page logged one error, the CSP block of the Poppins `@import` (F4). No other console error, page error or failed request.

## 6. Data and Supabase scalability

Not completed. The migrations (`supabase/migrations/*.sql`, 1,125 lines in total) and `cloud-learning.ts`,
`workspace-service.ts` were NOT inspected for this audit. Only the following was read:
- `supabase/config.toml`: `max_rows = 1000` for the API. This bounds any plain PostgREST `select`, but also truncates silently
  (R7).
- `supabase/tests/rls.test.mjs` shows that `public.list_visible_members(limit, offset, query, site)` is paginated and returns
  `total` (checks "Pagination returns stable disjoint pages and total"). That covers the admin member list only.
- `code_documents` carries a database-controlled `revision` column (test "Database controls initial code revision").

Everything else the brief asks for is UNVERIFIED: N+1 patterns, unbounded selects in the cohort roster and mentor
learning overview, indexes behind the cohort/user/session filters, RPC aggregation cost, repeated client requests. Any
concern here would depend on real dataset size and would be a RISK, not a finding.

Storage growth (partial):
- Guest localStorage is naturally bounded: one document per session (at most 32 KiB, `SOURCE_LIMIT`, phase 05), at most
  S01-S08, plus small keys (`explored`, `last-session`, calibration, tutorial). Corrupt values are discarded safely.
- Cloud: code appears to be one current row per participant/cohort/activity version with a revision counter, not a
  revision history; this was not confirmed in the SQL. Growth of progress/evidence, audit and access-code attempt tables
  and any retention or purge policy: NOT VERIFIED.
- Event retention in the simulator is bounded (256 in the engine, 12 per snapshot).

## 7. Content and session growth (S01-S05 toward S06-S08)

Sizes from source and build: `sessions.ts` 8.9 KB, `api.ts` 4.5 KB, `mentor-solutions.ts` 16.4 KB (S01-S05, about 3.3 KB each),
track JSON 45.6 KB (s01 29.8, s02 2.5, s03 7.6, s04 2.5, s05 3.2).
- Entry cost: `sessions.ts` and `api.ts` are in the entry chunk, so each new session adds a little to every page. The
  amount is small (about 1.7 KB of source per session in `sessions.ts`).
- Editor cost: each mentor solution adds about 3.3 KB to the editor chunk that every student downloads, plus the leak
  described in F5. A route-level or RPC-delivered mentor payload would remove it from the student path.
- Simulator cost: all five tracks are imported statically, so any new track enlarges the simulator chunk and the worker
  (the worker imports `trackForSession`). Estimate, not measured: about 9 KB raw of JSON per added track, twice.
  `track.id==='sNN'` branches in `MissionEvaluator`, `SimulationEngine` and renderers (02-architecture C1) also add code to
  the simulator chunk and to the worker for every session, loaded or not.
- Verdict: absolute growth to S08 is small relative to the 2.3 MB Monaco chunk, so initial bundle cost is not the
  scaling problem. The scaling problem is the regression surface (02-architecture C1), and the fact that content is loaded
  for all sessions rather than per session. S06-S08 currently render as "Material" without a track or worker (phase 05).

## 8. Release and migration safety

What exists:
- `pnpm check` = `typecheck` + `test:unit` (Vitest, `src/**/*.test.ts`, node environment) + `test:db` (PGlite) + `audit:design`.
- `pnpm build` = `tools/build-release.mjs`: tsc, `tools/release-meta.mjs` (writes `public/version.json`), Vite.
- `.github/workflows/ci.yml`: on push/PR to `main`, job `quality` (`pnpm check`, `pnpm build`) then job `e2e`
  (`pnpm browser:install:ci`, `pnpm test:e2e`). `require-lockfile: true`, timeouts 15 and 20 min, read-only permissions.
- `netlify.toml`: build `pnpm build`, publish `dist`, strict CSP and security headers, immutable cache for `/assets/*`,
  `no-cache` for the rest, hashed asset misses return the 404 page instead of `index.html`.

Detection matrix:

| Regression type | Detected by | Verdict |
|---|---|---|
| Type errors | `tsc --noEmit` in `check` and again in `build` | yes |
| Unit regressions | Vitest in `check` | yes (not run in this audit) |
| RLS/SQL regressions | `rls.test.mjs` on an in-process PGlite with a hand-written `auth` shim; the file itself says hosted Auth/PostgREST are separate checks | partial: repo SQL only, never the live DB |
| E2E regressions | `run-e2e.mjs` forces `VITE_SUPABASE_*` to empty, so only the guest build is exercised | partial (F3) |
| Design-token regressions | `audit:design` with `tools/design-token-baseline.json` in `check` | yes |
| Migration drift repo vs live | nothing | NO (F1) |
| Frontend vs schema contract (RPC names, signatures) | nothing | NO |
| Console cleanliness / CSP violations | nothing (E2E specs not reviewed) | not detected: F4 shipped |
| Bundle size or entry-purity budget | `verify-release.mjs` exists but is not invoked | NO (F7) |

How the 7-vs-5 drift could have been prevented. The pipeline has no step that knows the live schema; the frontend and
database ship independently. Candidate guards, strongest first (directions, not tested here):
1. Migration-parity gate (RECOMMENDATION, would have caught it): a CI job on `main`, required before the Netlify publish, that
   compares local `supabase/migrations/*` versions with the linked project's applied history (for example
   `supabase migration list --linked` or `supabase db push --dry-run --linked`, using a read-only access token stored as a
   CI secret) and fails if any local version is not applied remotely. Run the same job on a nightly schedule to catch drift
   introduced by manual dashboard changes.
2. Release manifest binding: add the latest migration filename to `public/version.json` as `requiredMigration`, and add a
   post-deploy smoke step that reads the live applied history (or a tiny `schema_version()` RPC) and fails when it is older.
3. Static RPC contract test: collect every `.rpc('name')` used in `src/features/**` and assert each name is created in the
   migrations; run the same list against the live `pg_proc` in the parity job. This would flag precisely the cohort-learning
   RPCs missing live (`cloud-learning.ts`), independent of version numbers.
4. Make `rls.test.mjs` read the migration directory instead of the hand-written list (F6), so a new file cannot be forgotten.
5. Gate deployment on CI: Netlify's build command does not run tests; whether it waits for GitHub checks is not
   verifiable from the repository (R8).

## 9. Confirmed findings

### F1 - No migration-parity guard; repo/live drift undetectable (HIGH)
Evidence: `.github/workflows/ci.yml` contains no Supabase step; `netlify.toml` builds with `pnpm build` only; `package.json` has
no migration scripts; `tools/` has no drift check. Repo has 7 migrations (`202609170001` to `202609190002`), the live project
had 5 (04-live-security V4/L1); the two missing ones, `202609190001_cohort_learning` and `202609190002_formative_missions`, are the
ones the cloud learning path in `cloud-learning.ts` and `MissionPanel.tsx` depends on (05-reliability section 8).
Impact: a frontend that calls RPCs absent from production can be released with every check green. Affected: release
process (`ci.yml`, `netlify.toml`), `supabase/migrations`. Direction: section 8, guards 1 to 3.

### F2 - Login page ships a 1.27 MB layered mascot (MEDIUM)
Evidence: `/login` made 21 PNG requests, 1,283,918 bytes transferred of 1,587,521 (81%). They are 15 layers under
`public/brand/iroh/interactive/` (total 1,273,363 bytes; `08-torso` 324 KB, `06-relleno-articulaciones` 265 KB, `07-cabeza`
253 KB) rendered by `src/features/auth/InteractiveIroh.tsx` at about 170x126 CSS px from 478x357 px images; `loading=auto`.
Impact: login is the entry point to the institutional flow (S01-S05 only open through a workspace once Supabase is configured),
so the heaviest first visit for a student is the decorative one; LCP 540 ms locally versus 252 ms on the landing page.
Direction: ship the mascot as one optimised sprite or webp/avif at display size (or defer the layers after first paint).

### F3 - Release gates never run the configured-Supabase build in a browser (MEDIUM)
Evidence: `tools/run-e2e.mjs` L6-14 sets `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY` to empty and
builds into `dist-e2e`; its own comment says the authenticated flow is covered "by SQL/RLS integration checks and the manual
Supabase staging checklist". `src/tests` has no test for `cloud-learning`, `useSimulation` or the worker dispatcher (02-architecture R5).
Impact: login, workspace routing, release gating, cloud code sync and mission submit, the paths that carry student work,
have no automated browser protection, and the production bundle differs from the tested one (different env, different index hash;
measured `index-DiKNq9HB.js` versus `index-DierV_6U.js`). Direction: a staging-Supabase E2E job with seeded test accounts, plus unit
tests for the sync decisions.

### F4 - CSP blocks the Google Fonts import; font never applies (LOW)
Evidence: `src/styles/global.css:1` is `@import url('https://fonts.googleapis.com/css2?family=Poppins...')`, kept first in
the built CSS. `netlify.toml` and `tools/serve.mjs` send `style-src 'self' 'unsafe-inline'; font-src 'self'`. Playwright logged
"Loading the stylesheet ... violates the following Content Security Policy directive" on all four pages measured.
`src/styles/institution.css` L3, L458, L721 request `'Poppins'` for `.landing-page` and `.theme-mustakis`, which therefore fall back to
`var(--font-sans)`. Impact: one console error per page load (it hides real errors), an attempted cross-origin request in the
critical CSS chain, and the declared institutional typography is not delivered. Direction: self-host Poppins through `@fontsource`
(as done for IBM Plex) or remove the reference.

### F5 - Mentor/institution code in the entry chunk; mentor solutions in the student editor chunk (LOW)
Evidence: `App.tsx:10` statically imports `WorkspacePages`; the entry chunk contains 38,009 bytes of it (source-map attribution).
`CodeEditor.tsx:13` statically imports `mentor-solutions.ts` (S01-S05 full solutions, 15,358 bytes attributed in the
`CodeEditor` chunk); visibility is a client flag (`mentorMode`, `CodeEditor.tsx:35`). Impact: every student and guest downloads
mentor workspace code and the reference solutions; size grows by about 3.3 KB per session. The disclosure aspect is already
rated in `03-security.md` (C1) and not re-rated here. Direction: lazy-load the mentor workspace route and fetch solutions on demand from a mentor-only source.

### F6 - `rls.test.mjs` hard-codes the migration list (LOW)
Evidence: `supabase/tests/rls.test.mjs` L19-25 reads seven named files plus `seed.sql` and `seed.demo.sql`. A new migration file
is silently untested until someone edits this list. Direction: read and sort the directory; assert the count.

### F7 - Build side effects and unwired release checks (LOW)
Evidence: after `pnpm build`, `git status` showed ` M public/version.json` (tracked file, `builtAt` timestamp changes on every
build, including CI); restored afterwards with `git checkout`. `tools/release-meta.mjs` hashes only `src/`, so changes to
`supabase/`, `package.json`, `pnpm-lock.yaml`, `public/` or `netlify.toml` do not alter `sourceHash`. `tools/verify-release.mjs` (checks hash,
entry assets exist, editor not preloaded) and `tools/visual-qa.mjs` are referenced by no script and no workflow
(grep over `package.json`, `.github`, `tools`). Direction: stop committing `version.json` (generate in build only), include the
migration list and lockfile in the hash, run `verify-release` after `build` in CI.

### F8 - Engine and track data duplicated across main thread and worker (LOW)
Evidence: the `Simulator` chunk contains `SimulationEngine.ts` (52.8 KB attributed), `MissionEvaluator.ts` (11.9 KB) and the sensor/actuator
modules, while the worker contains its own copy; `useSimulation.ts` builds engine snapshots on the main thread (02-architecture C7).
`tracks/index.ts` imports all five JSON tracks into both bundles. Impact: about 70 KB raw of duplicated code plus all track data,
and the duplication grows with every session. Not a runtime bottleneck. Direction: worker-provided first snapshot; load only the active track in each side.

## 10. Risks

R1. First session visit costs about 1.0 MB transferred and 3.6 MB decoded (S01/S05), 816 KB of it JS. On slow networks or low-end
devices this will be much slower than the local 1.1 s LCP. Not measured with throttling. The editor chunk is not prefetched while the student is on login.
R2. After a deploy, a tab opened on the previous release requests hashed chunks that no longer exist; `netlify.toml` answers them with 404.
Whether `ErrorBoundary` or `lazy` failure offers a reload was not checked.
R3. One eager 289 KB CSS (48 KB gz), including a 94 KB `workspace-advanced.css` source, blocks first render for every page. Unused-rule share not measured.
R4. Simulator re-renders at about 10 Hz without memoisation; the 3D view redraws at 10 fps; the worker keeps ticking and posting while the tab is hidden
(only the 2D canvas skips drawing). Cheap in the 19 s measured (about 8% main-thread), but long-session and low-end behaviour is unknown.
R5. Soak, memory and worker heap growth are unverified (partial 19 s only).
R6. Supabase query scalability (cohort roster, mentor overview, indexes, N+1) is unverified; it depends on real cohort sizes.
R7. `max_rows = 1000` truncates silently any plain table select that grows past 1000 rows; callers were not reviewed.
R8. CI uses `node@24` (`ci.yml`), Netlify uses `NODE_VERSION = "22"`, `engines` allows `>=22.12.0`; the build was only run on Node 24.20 here. The workflow's
action names and versions (`actions/checkout@v7`, `pnpm/setup@v3`) could not be validated offline, and CI itself was never run in this audit.
Whether Netlify waits for CI status before publishing is not visible in the repository.
R9. Browser support: `ctx.roundRect` (`CanvasRenderer.ts`) is used without a fallback and module workers are required; there is no `browserslist` and the build target is `es2022`. Older Safari or Firefox may fail.
R10. Cloud storage growth (progress/evidence, audit, access-code attempts) and retention are unverified; guest storage is bounded.
R11. The unreferenced 2.7 MB of media and the 1.6 MB institutional photo increase deploy size and, for the photo, the weight of institution pages (not measured).

## 11. Strengths to preserve

- Lazy boundaries: Monaco, simulator, auth, account, admin and content pages are separate chunks; landing and login never request them.
- Monaco is configured minimally (C++ only, base worker only), self-hosted, with no CDN loader (CSP `script-src 'self'` passes).
- No source maps in production output; hashed assets are `immutable`, HTML is `no-cache`; missing hashed files return 404 rather than HTML.
- Worker design: one worker per session, terminate on cleanup, timer only while running, 10 Hz bounded telemetry, bounded event retention, instruction budget.
- Rendering: no permanent animation loop, `Path2D` cache, DPR cap of 2, hidden-tab guard in 2D, resize only when size changes.
- Defensive, bounded guest storage with a 32 KiB source cap.
- Release tooling that exists is sensible: chained tsc + metadata + build, lockfile enforced in CI (`require-lockfile`), pinned `packageManager`, esbuild override, explicit build target, a design-token baseline, PGlite-based SQL tests that need no network.
- `verify-release.mjs` already encodes the right invariant (entry must not preload the editor); it only needs wiring.

## 12. Recommended sequence

1. F1: add the migration-parity gate and the RPC-contract test; make it a required check before deploy (section 8, 1 to 3). Then apply the missing live migrations through the normal process (not in scope here).
2. F3: add an automated browser path against a staging Supabase project (login, workspace, S01 save/restore, mission submit) and unit tests for cloud sync decisions.
3. F4 (one-line change) and F2: remove the blocked font import; optimise the login mascot.
4. F6, F7: derive the migration list from the directory; remove `version.json` from version control; wire `verify-release.mjs` and a simple chunk-size budget (entry, editor, simulator) into CI.
5. F5, F8, and R1/R3: lazy-load the mentor workspace, move mentor solutions out of the student bundle, give each side only its active track; consider prefetching the editor chunk after login.
6. Complete the unfinished measurements (section 14) before any broader optimisation work. Do not optimise rendering or React re-renders until a measurement shows a bottleneck.

## 13. Commands and tests executed

- `cat`/`git ls-files`/`ls` on `package.json`, `.github/workflows/ci.yml`, `netlify.toml`, `vite.config.ts`, `vitest.config.ts`, `tools/*.mjs`, `public/version.json`.
- `rm -rf dist && pnpm build` (success, about 20 s). `git status --short` afterwards showed ` M public/version.json`; restored with `git checkout public/version.json`.
- `du -sb dist`, `find dist -name "*.map"`, `stat`/`gzip -9 -c` per asset.
- Diagnostic build outside the repo: `node node_modules/vite/bin/vite.js build --configLoader runner --sourcemap --outDir <scratchpad>/dist-map --emptyOutDir`, then a scratch script that attributes bytes to sources from the source-map mappings.
- Guest build: `VITE_SUPABASE_URL= VITE_SUPABASE_PUBLISHABLE_KEY= VITE_SUPABASE_ANON_KEY= node node_modules/vite/bin/vite.js build --configLoader runner --outDir dist-e2e --emptyOutDir` (`dist-e2e` is git-ignored).
- `tools/serve.mjs` on ports 5197 (`dist`) and 5198 (`dist-e2e`); `curl -sI` with `Accept-Encoding: br` for headers and compressed size. Both servers were stopped.
- Playwright MCP: console log read, per-page cold-context measurements (landing, login, S01, S05) using `PerformanceObserver` (longtask, LCP, layout-shift), Navigation/Resource Timing, and a login image inventory.
- Scratch soak script with `@playwright/test` Chromium and CDP `Performance.getMetrics` + forced GC: ran 19 s of a planned 5.5 min, then stopped.
- Not run: `pnpm check`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:db`, `pnpm audit:design`, `pnpm test:e2e`. No claim is made about their current pass/fail status.

## 14. Untested areas

- Soak and memory growth beyond 19 s; worker heap and CPU; behaviour with the tab hidden; repeated reset/session-change under load in the production build (phase 05 covered the dev server).
- Repeated navigation and warm-cache timings; simulator ready latency measured separately; mobile viewport; CPU and network throttling; Lighthouse; mentor, organization and admin pages; the 1.6 MB institutional hero photo.
- All of section 6: migrations, RPC bodies, indexes, N+1, pagination of roster and overview, audit and attempt table growth, retention. `cloud-learning.ts` and `workspace-service.ts` were not read.
- Whether the E2E specs check console cleanliness; the CI workflow was never executed; Netlify's actual build gating and compression.
- Dependency hygiene beyond the manifest: unused production dependencies were not proven (no depcheck run); Supabase subpackages (realtime, storage, functions) are bundled by `createClient`, but whether `src/` uses them was not checked.
- Browser compatibility was assessed from source only (no Safari/Firefox run).
- Live Supabase state was not queried (no MCP), so the 5-vs-7 migration figure comes from `04-live-security.md`.
