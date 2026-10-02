# BITIRO Lab Technical Map

**Baseline:** commit `ffa32b4` (feat: complete S05 intermediate challenge and stabilize simulator tests)
**Date:** 2026-10-02

---

## 1. Application Structure

### Entry Points

- **Primary:** `/src/main.tsx` — React DOM initialization
- **App Root:** `/src/app/App.tsx` — Router setup, lazy-loaded pages, storage scope management
- **Navigation:** `/src/app/Topbar.tsx` — Header with session breadcrumbs and workspace access

### Routing Architecture

**Public (unauthenticated):**
- `/` — Landing/spaces
- `/recursos` — Resources/educational content
- `/sitios` — Site selection
- `/privacidad` — Privacy policy
- `/cuenta` — Account management
- `/admin` — Admin console

**Authenticated (student/guest):**
- `/sesion/:sessionId` — Session explorer + code editor + simulator

**Institutional:**
- `/espacios` — Workspaces list
- `/espacios/:organizationId/:cohortId` — Workspace dashboard (mentor/participant)
- `/espacios/:organizationId/:cohortId/sesiones/:sessionId` — Session within workspace

---

## 2. Authentication & Authorization

### Supabase Integration Boundary

**File:** `/src/lib/supabase.ts`
- Creates single `@supabase/supabase-js` client
- Validates public project key and URL
- Enforces: never use service key in browser

### Auth Service Layer

**Files:**
- `/src/features/auth/auth-service.ts` — Supabase API calls (signIn, signUp, password reset, profile)
- `/src/features/auth/auth-types.ts` — TypeScript interfaces for User, Profile, Membership, Role
- `/src/features/auth/AuthProvider.tsx` — React context managing auth state and callbacks
- `/src/features/auth/AuthPages.tsx` — Login/register/password-reset UI
- `/src/features/auth/InteractiveIroh.tsx` — Interactive mascot overlay on auth forms

### Role System

**Three-tier:**
1. **Platform roles** (BITIRO global)
   - `participant` — Student (default)
   - `facilitator` — Classroom instructor (legacy, rarely used)
   - `admin` — BITIRO platform operator

2. **Institutional roles** (per organization)
   - `participant` — Member of cohort
   - `mentor` — Cohort instructor
   - `org_admin` — Organization administrator

3. **Workspace roles** (per cohort)
   - `participant` — Student in cohort
   - `mentor` — Instructor in cohort

**Storage:** `public.memberships`, `public.organization_memberships`, `public.cohort_memberships`

---

## 3. Supabase Boundary & RLS

### Database Schema

**Migrations (in order):**

1. `202609170001_accounts_and_learning.sql` — Basic auth, profiles, sites, learning progress
2. `202609180001_institution_workspaces.sql` — Organizations, programs, cohorts, workspace codes
3. `202609180002_institution_hardening.sql` — RLS hardening, cohort-scoped access checks, rate limiting
4. `202609180003_mentor_workspace_polish.sql` — Mentor overview RPC
5. `202609180004_participant_pilot.sql` — Mentor participant invite codes
6. `202609190001_cohort_learning.sql` — Cohort-scoped code documents and progress (RPC-only)
7. `202609190002_formative_missions.sql` — Mission evidence submission (formative only, not certified)

### Core Tables

| Table | Purpose | RLS | Notes |
|-------|---------|-----|-------|
| `public.organizations` | Institution metadata | Public read | Theme, description, website links |
| `public.sites` | Physical locations (per org) | Public read | City, region, partner name |
| `public.profiles` | User identity | Scoped read | Display name, created_at |
| `public.memberships` | Platform membership (BITIRO) | Scoped read | Grants global role |
| `public.programs` | Educational program (per org) | RLS closed | Cohort container |
| `public.cohorts` | Class/cohort (per program) | RLS closed | Access via membership join |
| `public.organization_memberships` | Org-level role | RLS closed | participant/mentor/org_admin |
| `public.cohort_memberships` | Cohort-level role | RLS closed | participant/mentor |
| `public.content_releases` | Session availability per cohort | RLS closed | Mentor controls: released boolean |
| `public.program_progress` | Legacy individual learning | RLS scoped | visited/attempted/completed |
| `public.code_documents` | Legacy individual code | RLS scoped | 32KB limit |
| `public.cohort_code_documents` | Institutional code storage | RLS closed | Per cohort, version-tracked revision |
| `public.cohort_learning_progress` | Institutional progress | RLS closed | visited/attempted/completed + mission evidence |
| `public.institution_audit_events` | Access/privilege audit trail | Mentor/admin read | workspace code redemption, session release |
| `private.workspace_access_codes` | Redemption codes | Private | 8-64 chars, rate-limited per user |
| `private.workspace_code_attempts` | Brute-force protection | Private | 10 attempts per 15 min per user |
| `private.workspace_rate_limits` | User redemption lock | Private | Serializes 15-min budget in PostgreSQL |

### Authorization Helpers (Private Functions)

- `private.is_platform_admin()` — True if user has role='admin' in memberships
- `private.can_access_cohort(p_cohort_id)` — True if user is member of cohort (active) or platform admin
- `private.can_manage_cohort(p_cohort_id)` — True if user is mentor/org_admin in cohort or platform admin

### Public RPC Surface

**Authentication:**
- `public.update_my_profile(p_display_name)` — Profile display name only
- `public.admin_update_membership(p_user_id, p_site_id, p_role)` — Admin only

**Workspaces:**
- `public.list_my_workspaces()` — All workspaces where user is active member
- `public.redeem_workspace_code(p_code)` — Join cohort by code (rate-limited, audit logged)
- `public.list_workspace_sessions(p_cohort_id)` — Sessions + release status for cohort
- `public.mentor_set_session_release(p_cohort_id, p_session_id, p_released)` — Mentor-only toggle
- `public.mentor_workspace_overview(p_cohort_id)` — Participant count, mentor count, released count
- `public.mentor_get_participant_invite(p_cohort_id)` — Current invite code
- `public.mentor_create_participant_invite(p_cohort_id, p_max_uses, p_valid_days)` — Generate new code
- `public.mentor_revoke_participant_invite(p_cohort_id)` — Revoke active code
- `public.mentor_list_participants(p_cohort_id)` — Roster of active participants
- `public.mentor_cohort_learning(p_cohort_id, p_version)` — All participant progress

**Learning (Cohort-Scoped):**
- `public.get_my_cohort_learning(p_cohort_id, p_session_id, p_version)` — Read code + progress
- `public.save_my_cohort_code(p_cohort_id, p_session_id, p_source, p_expected_revision, p_version)` — CAS write (conflict detection)
- `public.mark_my_cohort_activity(p_cohort_id, p_session_id, p_event, p_version)` — visited/attempted/completed
- `public.submit_my_formative_mission(p_cohort_id, p_session_id, p_evidence, p_version)` — S01/S02 only, formative only

**Admin:**
- `public.list_visible_members(p_limit, p_offset, p_query, p_site_id)` — Member search (invoker rights)

---

## 4. Workspace & Session Management

### Workspace Types

**File:** `/src/features/workspaces/workspace-types.ts`

```typescript
WorkspaceSummary = {
  id, organization_id, organization_name, cohort_id, cohort_name,
  program_id, program_name, site_id, site_name, city, region,
  role: 'participant' | 'mentor' | 'org_admin',
  can_manage: boolean
}
```

### Workspace Service

**File:** `/src/features/workspaces/workspace-service.ts`
- `listMyWorkspaces()` — Query `public.list_my_workspaces()` RPC
- `redeemWorkspaceCode(code)` — Query `public.redeem_workspace_code(code)` RPC
- `listWorkspaceSessions(workspace)` — Query `public.list_workspace_sessions()` RPC
- `setWorkspaceSessionRelease(workspace, sessionId, released)` — Call mentor release RPC
- `getMentorWorkspaceOverview(workspace)` — Call mentor overview RPC
- `getParticipantInvite(workspace)` — Call mentor get invite RPC
- `createParticipantInvite(workspace, maxUses, validDays)` — Call mentor create invite RPC
- `revokeParticipantInvite(workspace)` — Call mentor revoke invite RPC
- `listWorkspaceParticipants(workspace)` — Call mentor list participants RPC
- `listCohortLearning(workspace)` — Call mentor cohort learning RPC

### Workspace Provider

**File:** `/src/features/workspaces/WorkspaceProvider.tsx`
- React context managing workspace list, loading state, error handling
- Refresh, code redemption, session access

### Session Definitions

**File:** `/src/content/sessions.ts`

```typescript
SessionDefinition = {
  id: 's01' | 's02' | ... | 's08',
  number: 1-8,
  title, summary, concepts[], objectives[], bonus,
  source: (starter code),
  dimensions, interactive, trackAsset?
}
```

**Tracks:** `/src/content/tracks/index.ts` — Import geometry JSONs (s01.json, s02.json, etc.) and map to sessions

### Content Discovery

**File:** `/src/features/session-explorer/Curriculum.tsx`
- Curriculum-aware session grouping
- Progress badges (visited, attempted, completed)

**File:** `/src/features/session-explorer/Explorer.tsx`
- Session list with local progress from storage
- Last visited tracking

---

## 5. Code Editor & Persistence

### Storage (Local & Cloud)

**File:** `/src/features/code-editor/storage.ts`

**Scope System:**
- `bitiro:v7:guest` — Guest (no login)
- `bitiro:v7:user:{userId}` — Individual BITIRO user
- `bitiro:v7:workspace:{userId}:{cohortId}:{activityVersion}` — Institutional cohort storage

**Functions:**
- `loadCode(session, scope)` — Read from localStorage
- `saveCode(id, code, scope)` — Write to localStorage
- `explored(scope)` — Sessions visited in scope
- `markExplored(id, scope)` — Mark session as seen
- `lastVisited(scope)` — Last opened session ID
- `localCodeDocument(id, scope)` — Timestamp and revision info

**Legacy Migration:**
- Pre-v7 guest work can be imported once; never converted to institutional

### Cloud Learning (Institutional)

**File:** `/src/features/code-editor/cloud-learning.ts`

```typescript
CloudContext = {
  cohortId: string,
  userId: string,
  activityVersion: number  // versioning for curriculum updates
}
```

**Functions:**
- `fetchCloudLearning(context, sessionId)` — Query RPC get_my_cohort_learning
- `saveCloudCode(context, sessionId, source, expectedRevision)` — CAS write to cohort_code_documents
- `markCloudActivity(context, sessionId, event)` — Call mark_my_cohort_activity RPC
- `submitFormativeMission(context, evidence)` — Call submit_my_formative_mission RPC (S01/S02 only)

**Conflict Detection:**
- expectedRevision = 0 means no remote document yet
- expectedRevision > 0 requires matching server revision; mismatch returns 'conflict'

### Code Editor UI

**File:** `/src/features/code-editor/CodeEditor.tsx`

**State:**
- Local storage scope (auto-detected from auth)
- Cloud document (if institutional) vs local-only (if guest)
- Monaco editor with syntax highlighting
- API reference panel (function signatures)
- Mentor solution loader (readonly, doesn't affect progress)

**Signals:**
- `isSupportedSource(value)` — Max 32KB check
- `localCodeDocument(id, scope)` — Fetch local revision
- `highlighted API function names` — Visual recognition

---

## 6. Simulator UI

### Main Simulator Component

**File:** `/src/features/simulator/Simulator.tsx`

**Modes:**
1. **Arena (2D)** — Top-down canvas with track + robot + sensors
2. **Arena3D** — 3D perspective with camera control
3. **Panels:**
   - RuntimeBar (play/pause/reset)
   - RuntimeBar (play/pause/reset)
   - TelemetryPanel (sensor readings)
   - CalibrationPanel (S01, line sensor calibration)
   - S02CalibrationPanel (S02, three-sensor calibration)
   - MissionPanel (S01/S02, mission checks + submit)
   - FeedbackPanel (real-time feedback)

### Arena (2D Rendering)

**File:** `/src/features/simulator/Arena.tsx`

- Canvas refs for viewport rendering
- Pointer events map screen coords → track coords
- Visibility optimization (pause rendering when hidden)
- Thresholds passed from calibration

### Arena3D (3D Rendering)

**File:** `/src/features/simulator/Arena3D.tsx`

- Camera preset: perspective / follow / top
- Zoom and pan controls
- Keyboard shortcuts (arrow keys, +/-, =)
- Scenario intersections overlay

### Calibration (S01 & S02)

**Files:**
- `/src/features/simulator/CalibrationPanel.tsx` — Single line sensor (s01)
- `/src/features/simulator/S02CalibrationPanel.tsx` — Three sensors (s02)

**Workflow:**
1. Sample white surface → max readings
2. Sample black surface → min readings
3. Calculate thresholds (center point between black/white)
4. Store to localStorage with scope key
5. Pass to SimulationEngine for sensor reads

### Mission Panel (S01 & S02)

**File:** `/src/features/simulator/MissionPanel.tsx`

**Displays:**
- 4 checks (session-specific criteria)
- Status: in_progress / completed
- Submit button (only when all 4 passed)

**Submission:**
- Calls `submitFormativeMission(context, evidence)` RPC
- Evidence includes: sessionId, checks[], elapsedMs, finishZone, kind='formative_client_simulation'
- Server validates: s01/s02 only, all 4 checks passed, size <8KB

### Telemetry & Feedback

**File:** `/src/features/simulator/TelemetryPanel.tsx`

**Displays:**
- Robot status (idle/compiling/running/paused/finished/error)
- Line sensor readings (0-255 per sensor)
- IR readings (left/right boolean)
- Sonar distance (cm)
- Motor speeds (left/right)
- Button state
- LCD display (2 rows text)

**File:** `/src/features/simulator/FeedbackPanel.tsx`

- Real-time feedback from `LearningFeedbackEngine`
- Context-aware messages for progress

### Simulator Tour

**File:** `/src/features/simulator/SimulatorTour.tsx`

- First-run interactive guide
- 9+ steps covering: play, pause, reset, calibration, sensor readings, mission
- Modal overlays on UI elements
- Keyboard dismissal (Escape)

---

## 7. Simulation Engine

### Core Engine

**File:** `/src/simulator/SimulationEngine.ts`

**Responsibility:** Physics loop, sensor simulation, obstacle collision, event emission

**Key Methods:**
- `reset()` — Initialize robot at start position, obstacles, thresholds
- `scene()` — Build current track definition (may include S03 obstacles)
- `setLineThresholds(values)` — Update sensor calibration
- `setS03Layout(obstacles, intersections)` — Update S03 dynamic scenario
- `emit(event)` — Fire event to listeners
- `setLCD(rows)` — Update LCD display
- `readSonar()` — Get sonar distance
- `setServo(position)` — Move S03 strike servo
- `command(command)` — Motor/reset commands
- `tick()` — Step physics; returns updated robot state
- `snapshot()` — Return current observation (robot, obstacles, events, mission evidence)

### Physics

**File:** `/src/simulator/RobotPhysics.ts`

- `integrate(robot, dt)` — Euler integration of motor speeds into position/heading

**Constants (from `/src/simulator/config.ts`):**
- Robot width/length (cm)
- Motor max speed (cm/s)
- Wheel radius (cm)
- Default line sensor threshold
- Physics step interval (20ms)
- Telemetry interval (100ms)

### Sensors

**File:** `/src/simulator/sensors.ts`

**Line Sensors (0, 1, 2 = left, center, right):**
- `sensorPosition(robot, side)` — Get pixel coords of sensor
- `lineSurfaceLevels(point, track)` — Deterministic spatial reflectance (0-255)
- `lineSensorSurfaceLevels(point, track, sensor)` — Per-channel variation
- `lineReadingAt(point, track, sensor)` — Full sensor read
- `updateSensors(robot, track)` — Update all three readings on robot state

**IR (infrared, left/right pair):**
- Majority voting across 3 samples per side

**Sonar (HC-SR04 style):**
- `sonarHit(robot, track)` — Cone-based distance detection
- Deterministic beam angles (9 angles, ±30°)
- Includes 5cm suppression (like real hardware)

**Updates:**
- Called each physics tick
- Deterministic (same input = same output)

### Actuators

**File:** `/src/simulator/actuators.ts`

- `servoAngle(position)` — Map -1/0/1 to servo angle (S03 strike arm)
- `strikeTip(robot)` — Get tip position during arm sweep
- `advanceActuators(robot, boxes, track, dt, struck, emit)` — S03 obstacle interaction

### Geometry

**File:** `/src/simulator/geometry.ts`

- `distanceToSegment(p, a, b)` — Min distance from point to line segment
- `lineCoverage(p, paths)` — How much track line at position
- `intersectsCircle(p, radius, box)` — Circle-AABB collision
- `rayBox(origin, direction, box)` — Ray-AABB intersection (sonar)

### Finish Zone Detection

**File:** `/src/simulator/finish.ts`

- `isInsideFinishZone(robot, track)` — Tolerance-aware check (IEEE-754 safe)

### Scenario (S03 Intersections & Obstacles)

**File:** `/src/simulator/scenario.ts`

**S01 Obstacle Placement:**
- `s01ObstacleForIR(left, right)` — Single obstacle at chosen destination

**S03 Scenario:**
- `S03_FIXED_SCENARIO` — Predefined 3 obstacle layout
- `scenarioIntersectionPaths()` — Render intersection stripes
- `withScenarioIntersections()` — Merge intersections into track geometry

---

## 8. Educational Runtime

### Program Runtime

**File:** `/src/simulator/runtime/ProgramRuntime.ts`

**Responsibilities:** Parse, validate, interpret Iroh educational language

**Methods:**
- `review(source)` — Syntax check only (no execution)
- `run(source)` — Full parse → validate → interpret
- `command(command)` — Control from UI (pause, resume, stop, step)
- `step(ms)` — Physics tick consumed by generator

**Generator-based:**
- Each `step()` advances interpreter by small quanta
- Yields at instruction/loop boundary for UI responsiveness
- Supports pause/resume via generator protocol

### Parser

**File:** `/src/simulator/runtime/parser/Parser.ts`

**Tokenizes → Parses → Validates:**

**Tokens:** identifier, number, string, symbol, keyword, eof

**Grammar (simplified):**
```
program = declaration* function*
declaration = type identifier [= expr] [, ...]
statement = block | declaration | expr | if | while | for | return | break | continue
expr = assign | binary | unary | call | primary
```

**Validation:** `/src/simulator/runtime/parser/validate.ts`
- Function name conflicts
- Variable redeclaration
- Type consistency
- Limits (recursion depth, variable count)

### Interpreter

**File:** `/src/simulator/runtime/interpreter/Interpreter.ts`

**Generator-based execution:**
- AST walk with Environment chain
- Yields at loop boundaries to prevent hang
- Supports function calls, operators, control flow

### Environment & Type System

**File:** `/src/simulator/runtime/interpreter/Environment.ts`

**Value Types:** int, long, float, bool, string, void

**Functions:**
- `numeric(v, loc)` — Coerce to number
- `truth(v, loc)` — Coerce to bool
- `cast(v, type, loc)` — Type casting

**Operators:** `/src/simulator/runtime/interpreter/operators.ts`
- Binary: +, -, *, /, %, <, >, <=, >=, ==, !=, &&, ||, etc.
- Unary: -, !
- Assignment: =, +=, -=, etc.
- Pre/post increment: ++, --

### Error Handling

**File:** `/src/simulator/runtime/interpreter/RuntimeError.ts`

**Error Kinds:**
- SyntaxError
- UnknownFunctionError
- ArgumentError
- ExecutionLimitError
- RuntimeError

**Diagnostic Format:**
- kind, line, column, endLine, endColumn, message
- Reported to UI via compile-error / runtime-error worker messages

### Runtime Limits

**File:** `/src/simulator/runtime/runtime-limits.ts`

- Max call stack depth
- Max loop iterations
- Max variable count
- Max instruction count
- Max execution time

**File:** `/src/simulator/runtime/source-size.ts`

- Max source code: 32KB

### Signatures (IROH API)

**File:** `/src/simulator/runtime/signatures.ts`

- Function signatures for the teaching library (move, stop, readLine, etc.)

### Iroh Runtime Adapter

**File:** `/src/simulator/runtime/IrohRuntimeAdapter.ts`

**Bridges interpreter → SimulationEngine:**

- Translates educational function calls (move, stop, readLine, etc.) to simulator commands
- Implements the 8-function IROH teaching API
- Manages movement queues, sensor reads, servo control
- Integrates with Movement helper class

### Movement Coordination

**File:** `/src/simulator/runtime/Movement.ts`

- `irohSpeedToCmS(value)` — Map 0-255 speed to cm/s
- `move(mode, left, right)` — Queue motor commands
- `stop()` — Emergency stop

---

## 9. Worker Boundary

**File:** `/src/simulator/worker/simulator.worker.ts`

**Runs in dedicated Web Worker thread:**

**Handles:**
1. Track configuration (`configure-track` command)
2. Program loading (`load-program`, compilation only)
3. Program execution (`run-program`, stepping)
4. Snapshot generation (every TELEMETRY_MS)
5. State commands (motors, reset, pause, resume, stop)

**Communication:**
- Receives `WorkerCommand` via `message` event
- Posts `WorkerResponse` snapshots to main thread
- No DOM access (worker constraint)

**Performance:**
- Physics tick: PHYSICS_STEP_MS (20ms) = 50 Hz
- Telemetry: TELEMETRY_MS (100ms) = 10 Hz
- Maintains sim clock (simTimeMs) separate from wall time

---

## 10. Mission Evaluation & Learning Feedback

### Mission Evaluator

**File:** `/src/simulator/MissionEvaluator.ts`

**Evidence Tracking (formative only, not certified):**

```typescript
MissionEvidence = {
  sessionId: string,
  status: 'in_progress' | 'completed',
  checks: [
    { key, label, passed: boolean },
    ...
  ],
  elapsedMs, finishZone, progress?, kind: 'formative_client_simulation'
}
```

**Methods:**
- `reset()` — Clear evidence on new run
- `start(robot)` — Initialize at starting position
- `observeEvent(event)` — Record mission-relevant events
- `observeTick(robot)` — Per-frame observation (e.g., position checks)
- `evaluate(robot)` — Final evidence summary

**Session-Specific Checks:**
- S01: Line following, obstacle detection, strike, finish
- S02: Intersection detection, turn, stop, finish
- S03: Obstacle management (depends on layout)
- S04, S05: Context-dependent challenges

### Learning Feedback Engine

**File:** `/src/simulator/LearningFeedbackEngine.ts`

- `feedbackFor(event)` — Real-time guidance based on events
- Pedagogically appropriate messages (e.g., "Line lost—check sensor position")

---

## 11. Rendering

### 2D Canvas Renderer

**File:** `/src/simulator/renderer/CanvasRenderer.ts`

**Renders:**
- Track paths (lines)
- Obstacles (boxes)
- Robot geometry (chassis, wheels, sensors, servo)
- Start position / finish zones
- Grid overlay (debug mode)
- Sensor indicators (color-coded)

**Functions:**
- `renderCanvas(canvas, track, robot, debug?, zoom?, activeSensor?, thresholds?, viewport?)` — Main render call

### 3D Scene Renderer

**File:** `/src/simulator/renderer/Scene3D.ts`

**Software rasterizer (Canvas2D, not WebGL):**

**Camera:**
- Perspective (biased toward robot)
- Follow (centered on robot)
- Top (isometric-like)

**Objects:**
- Table/plinth
- Technical grid (10cm)
- Obstacles (3D boxes with shadow)
- Robot (accurate geometry: wheels, chassis, electronics, sensors, arm, casters)
- Paths (ribbons in 3D)
- Finish zones (labeled)

**Depth sorting:** Painter's algorithm (back to front)

### Viewport Transform

**File:** `/src/simulator/renderer/viewport.ts`

- `viewportTransform(width, height, track, zoom?, maxScale?)` — Calculate canvas→track coordinate mapping
- Handles track aspect ratio, zoom, panning

### Simulation Theme

**File:** `/src/simulator/renderer/simulation-theme.ts`

- Color palette for track, robot, obstacles, UI

---

## 12. UI Components & Utilities

### Error Boundary

**File:** `/src/components/ErrorBoundary.tsx`

- React error boundary catching render errors
- Fallback UI with refresh button

### Brand & Navigation

**File:** `/src/components/Brand.tsx` — BITIRO logo/branding

**File:** `/src/components/Controls.tsx` — Reusable icon buttons

### Account Management

**File:** `/src/features/account/AccountPage.tsx`

- Profile display name edit
- Account creation info
- Sign-out

### Admin Console

**File:** `/src/features/admin/admin-service.ts` — Admin RPC: listMembers, updateMember

**File:** `/src/features/admin/AdminPage.tsx` — Member search, role/site assignment

### Guide Panel

**File:** `/src/features/guide/Guide.tsx`

- API reference display
- In-editor help panel

### Content Pages

**File:** `/src/features/platform/ContentPages.tsx`

- Resources, privacy, etc.

### Workspace Pages

**File:** `/src/features/workspaces/WorkspacePages.tsx`

- Landing page (redeem code)
- Spaces list
- Mentor workspace (cohort dashboard)
- Participant workspace (session list)
- Invite code management
- Cohort roster

---

## 13. Content & Data

### Organizations & Sites

**File:** `/src/content/organizations.ts`

```typescript
OrganizationPresentation = {
  id, name, shortName, programName, description,
  websiteUrl, programUrl, theme: 'mustakis',
  experienceLabel, tagline, programDescription,
  logoUrl?, partnerName?, ...
}
```

**File:** `/src/content/sites.ts`

```typescript
Site = { id, name, city, region, partner }
```

**Seeded in:** `/supabase/seed.sql` (organizations, programs, sites, cohorts for Mustakis)

**Demo data:** `/supabase/seed.demo.sql` (demo cohort + access codes)

### Sessions & Tracks

**File:** `/src/content/sessions.ts`

8 sessions: s01–s08 with metadata (title, summary, concepts, objectives)

**File:** `/src/content/tracks/index.ts`

Maps sessions to track geometry (s01.json, s02.json, etc.)

```typescript
export function hasSimulation(sessionId: string): boolean
export function trackForSession(sessionId: string): TrackDefinition
```

### Mentor Solutions

**File:** `/src/content/mentor-solutions.ts`

- Reference solutions for each session
- Shown in editor as readonly reference
- Can be copied or executed privately (doesn't change progress)

### API Reference

**File:** `/src/content/api.ts`

```typescript
ApiEntry = { name, signature, description, example, since }
```

- Function documentation for IROH teaching library

---

## 14. Testing & Verification

### Unit Tests

**Config:** `/vitest.config.ts`

**Test pattern:** `src/**/*.test.ts` (excluded from compact representation)

### E2E Tests

**Config:** `/playwright.config.ts`

**Tool:** `/tools/run-e2e.mjs`

**Coverage:**
- Unauthenticated simulation flow
- Session loading
- Code editor
- Simulator execution
- Static release verification

**Note:** Institutional auth/RLS tested separately via SQL integration checks

### Database Tests

**Script:** `pnpm test:db` → `/supabase/tests/rls.test.mjs`

**Coverage:**
- RLS policies
- Access control
- Role-based visibility

### Build & Release

**Scripts:**
- `build-release.mjs` — Production build pipeline
- `verify-release.mjs` — Release artifact validation
- `release-meta.mjs` — Metadata collection
- `serve.mjs` — Local static server

### Design Token Audit

**Tool:** `/tools/audit-design-tokens.mjs`

- Enforces centralized design tokens in `tokens.css`
- Freezes legacy color debt; rejects new raw-color usage

---

## 15. Principal End-to-End Flows

### Flow 1: Authentication

1. User visits app → `/`
2. Routes to `AuthPages.tsx` (login/register)
3. `AuthProvider.tsx` manages state
4. On sign-up: `signUp()` → Supabase Auth → trigger `private.create_account()` → profiles, memberships created
5. On sign-in: `signIn()` → Supabase session established
6. Profile + role loaded via `fetchAccount()` → stored in AuthContext
7. Routes based on auth status (authenticated vs. anonymous)

### Flow 2: Opening an Educational Session

**Guest (no auth):**
1. User selects session from `Explorer.tsx`
2. `<Route path="/sesion/:sessionId">` loads Simulator + CodeEditor
3. Storage scope: `bitiro:v7:guest`
4. Code from localStorage, session progress from localStorage
5. No cloud sync

**Institutional:**
1. User redeems workspace code → `redeemWorkspaceCode()` RPC → added to cohort_memberships
2. Workspace listed in `listMyWorkspaces()` → WorkspacePages shows cohort
3. Clicks session → navigates to `/espacios/:org/:cohort/sesiones/:sessionId`
4. `App.tsx` detects workspace scope → `setStorageScope(workspaceStorageScope(userId, cohortId))`
5. CodeEditor loads via `fetchCloudLearning()` → cohort_code_documents
6. Session gated by `content_releases.released` + mentor status

### Flow 3: Loading/Saving Student Code

**Local (guest):**
1. Open session → `loadCode()` reads localStorage
2. Edit in Monaco editor
3. Throttled debounce saves to localStorage via `saveCode()`
4. No conflict checking

**Cloud (institutional):**
1. `fetchCloudLearning()` → RPC `get_my_cohort_learning()` → revision number
2. Edit in Monaco → queueCloud()
3. `saveCloudCode()` → RPC `save_my_cohort_code()` with CAS (expectedRevision)
4. Conflict → return 'conflict' → UI prompts (local vs. cloud)
5. Revision incremented server-side

### Flow 4: Executing Code in Simulator

1. User clicks **Run** in CodeEditor
2. `execute(run=true)` → `useSimulation()` dispatches worker command `run-program`
3. Worker thread:
   - `ProgramRuntime.run(source)` → parse, validate, interpret
   - Yields at loop boundaries
   - Each `step()` advances physics
   - Emits events (line lost, obstacle hit, etc.)
4. SimulationEngine updates sensors, robot state, obstacles
5. Worker posts snapshot (~10Hz telemetry)
6. Main thread renders Arena + updates panels
7. Pause/reset handled via next worker command

### Flow 5: Evaluating a Mission (S01/S02)

1. Simulator running → `MissionEvaluator` accumulates evidence
2. On every tick: `observeTick()` checks robot position vs. zones
3. On every event: `observeEvent()` logs strikes, intersections, etc.
4. User clicks **Submit Mission** → `MissionPanel` calls `submitFormativeMission()`
5. RPC `submit_my_formative_mission()`:
   - Validates evidence (4 checks, sessionId s01/s02, kind='formative_client_simulation')
   - Stores in cohort_learning_progress (mission_evidence column)
   - Updates status to 'completed'
6. **Important:** Formative only—browser evidence, not certified achievement
7. Mentor can view all participant evidence via `mentor_cohort_learning()` RPC

### Flow 6: Institutional Workspace Access

1. Mentor creates cohort in database
2. Mentor generates participant invite code → `mentor_create_participant_invite()` RPC
3. Student receives code (e.g., via QR, email, etc.)
4. Student clicks redeem → `redeemWorkspaceCode()` RPC
   - Rate-limited: 10 attempts per 15 min
   - Validates code active/not expired/not exhausted
   - Inserts into cohort_memberships (role='participant')
   - Audit logged: `institution_audit_events`
5. Student sees workspace in `/espacios`
6. Mentor sets `content_releases.released = true` for sessions
7. Student navigates to session → `get_my_cohort_learning()` RPC checks release status

### Flow 7: Mentor/Session Release Flow

1. Mentor views workspace → `/espacios/:org/:cohort`
2. Mentor dashboard shows:
   - Participant count
   - Mentor count
   - Released session count
3. Each session has toggle switch (via `mentor_set_session_release()` RPC)
4. On toggle:
   - Server updates `content_releases` table
   - Audit event logged
5. Students can now access session if mentor check passed

---

## 16. Major Components Interaction Map

```
App.tsx
├── AuthProvider
│   ├── auth-service.ts (Supabase calls)
│   └── auth-types.ts (Role system)
│
├── WorkspaceProvider
│   ├── workspace-service.ts (RPC calls)
│   └── workspace-types.ts (Workspace shape)
│
├── Router
│   ├── /sesion/:sessionId
│   │   └── Simulator.tsx
│   │       ├── Arena.tsx (2D canvas)
│   │       ├── Arena3D.tsx (3D canvas)
│   │       ├── CodeEditor.tsx
│   │       │   ├── storage.ts (localStorage)
│   │       │   └── cloud-learning.ts (RPC)
│   │       ├── useSimulation.ts (worker orchestration)
│   │       │   └── simulator.worker.ts (Web Worker)
│   │       │       ├── SimulationEngine.ts
│   │       │       ├── ProgramRuntime.ts
│   │       │       ├── sensors.ts
│   │       │       └── MissionEvaluator.ts
│   │       ├── CalibrationPanel.tsx
│   │       ├── MissionPanel.tsx
│   │       └── TelemetryPanel.tsx
│   │
│   └── /espacios/:org/:cohort
│       └── WorkspacePages.tsx (mentor/participant views)
│
└── Topbar.tsx (navigation)
```

---

## 17. Key Architectural Decisions

### Web Worker Isolation
- Physics/simulation runs in separate thread
- Main thread stays responsive for UI
- Communication via message passing (snapshots ~10Hz)

### Generator-Based Runtime
- Pauseable execution (pause/resume without thread interruption)
- Prevents UI hang during tight loops
- Integrated with async game loop

### CAS Conflict Detection
- `expectedRevision` parameter prevents silent overwrites
- Multi-tab/multi-device safety

### RLS-First Authorization
- Never trust browser role; Supabase RLS gate enforces access
- RPC-only institutional surface (no direct table reads)
- Audit logging on sensitive operations

### Formative-Only Evidence
- Mission evidence explicitly marked non-certified
- Stored but never used for grading
- Student→browser simulation boundary clear

### Spatial Determinism
- Sensor readings at same position always identical
- Encourages threshold discovery, not luck
- No frame-by-frame random noise

---

## 18. Unclear or Under-Specified Areas

1. **Rendering Performance Optimization** — No documented profiling targets; Arena3D rasterizer complexity unclear
2. **Curriculum Versioning** — `activityVersion` parameter defined but versioning strategy not documented
3. **Multi-Session Progress** — How does completing multiple missions affect cohort learning display?
4. **Mentor Grading Integration** — Evidence stored but no grading schema or mentor marking workflow
5. **Analytics/Telemetry** — No documented learning analytics pipeline
6. **Offline Mode** — Local storage works offline but no explicit sync strategy on reconnect
7. **Accessibility Compliance** — ARIA labels present but full audit status unclear

---

## Summary

BITIRO Lab is a modular educational robotics platform with clear separation:

- **Auth:** Supabase-backed, three-tier roles, RLS-enforced
- **Workspaces:** Institutional cohort support with mentor control and invite codes
- **Learning:** Dual-path (guest local storage vs. institutional cloud), code versioning, formative mission evidence
- **Simulation:** Physics engine in Web Worker, sensors/actuators deterministic, 2D+3D rendering
- **Runtime:** Custom educational language with parser, interpreter, type system, limits
- **Feedback:** Real-time event-driven + mission checks (not certified assessment)

Architecture prioritizes pedagogical clarity, security, and stability over feature velocity.
