# BITIRO Lab — Compact Technical Map

Baseline: `ffa32b4`
Full reference: `docs/audit/01-project-map-full.md`

This document is the default architectural context for later audit agents.
Use the full map only when this summary is insufficient.

## 1. Application entry and routing

Primary entry:
- `src/main.tsx`

Application/root routing:
- `src/app/App.tsx`

Navigation:
- `src/app/Topbar.tsx`

Main route families:
- public/platform content
- account/authentication
- `/sesion/:sessionId`
- `/espacios`
- `/espacios/:organizationId/:cohortId`
- institutional session routes

Important:
Do not infer authorization from route existence alone.
Actual guards and authorization must be verified in source and server policies.

## 2. Main architectural areas

### Authentication

Files:
- `src/features/auth/auth-service.ts`
- `src/features/auth/auth-types.ts`
- `src/features/auth/AuthProvider.tsx`
- `src/features/auth/AuthPages.tsx`
- `src/lib/supabase.ts`

Responsibilities:
- Supabase authentication
- account/profile state
- platform membership
- login/signup/password flows

The browser Supabase boundary is centralized in:
- `src/lib/supabase.ts`

### Institutional workspaces

Files:
- `src/features/workspaces/workspace-service.ts`
- `src/features/workspaces/workspace-types.ts`
- `src/features/workspaces/WorkspaceProvider.tsx`
- `src/features/workspaces/WorkspacePages.tsx`

Responsibilities:
- organizations/programs/cohorts
- participant and mentor membership
- access-code redemption
- session releases
- participant roster
- cohort learning overview

Authorization is ultimately enforced server-side through Supabase RPC/RLS,
not by browser role state.

### Educational content

Files:
- `src/content/sessions.ts`
- `src/content/tracks/index.ts`
- `src/content/mentor-solutions.ts`
- `src/content/api.ts`

Responsibilities:
- session definitions
- track association
- mentor reference solutions
- educational API documentation

### Code editor and persistence

Files:
- `src/features/code-editor/CodeEditor.tsx`
- `src/features/code-editor/storage.ts`
- `src/features/code-editor/cloud-learning.ts`

Two persistence modes exist:

Guest/local:
- localStorage
- scoped BITIRO keys
- no cloud synchronization

Institutional:
- cohort-scoped Supabase RPCs
- revision/CAS conflict detection
- code and progress stored per participant/cohort/activity version

### Simulator UI

Files:
- `src/features/simulator/Simulator.tsx`
- `src/features/simulator/useSimulation.ts`
- `src/features/simulator/Arena.tsx`
- `src/features/simulator/Arena3D.tsx`
- calibration panels
- mission panel
- telemetry panel
- feedback panel
- simulator tour

Responsibilities:
- student-facing simulator interaction
- visualization
- calibration
- execution controls
- telemetry
- formative mission feedback

### Simulation engine

Files:
- `src/simulator/SimulationEngine.ts`
- `src/simulator/RobotPhysics.ts`
- `src/simulator/sensors.ts`
- `src/simulator/actuators.ts`
- `src/simulator/geometry.ts`
- `src/simulator/scenario.ts`
- `src/simulator/finish.ts`

Responsibilities:
- physics
- robot state
- deterministic sensors
- actuators
- collisions
- scenarios
- finish zones
- simulator events

### Educational runtime

Files:
- `src/simulator/runtime/ProgramRuntime.ts`
- `src/simulator/runtime/parser/*`
- `src/simulator/runtime/interpreter/*`
- `src/simulator/runtime/IrohRuntimeAdapter.ts`
- `src/simulator/runtime/Movement.ts`
- `src/simulator/runtime/runtime-limits.ts`

Pipeline:

student source
→ tokenize
→ parse
→ validate
→ interpret
→ IrohRuntimeAdapter
→ SimulationEngine

The runtime is generator-based and yields during execution so simulation
and UI can remain responsive.

### Worker boundary

File:
- `src/simulator/worker/simulator.worker.ts`

Responsibilities:
- program execution
- simulation stepping
- track configuration
- snapshots/telemetry
- communication with main thread

High-level flow:

React UI
→ `useSimulation.ts`
→ Web Worker
→ `ProgramRuntime`
→ `SimulationEngine`
→ snapshots/events
→ React UI

### Mission evaluation and feedback

Files:
- `src/simulator/MissionEvaluator.ts`
- `src/simulator/LearningFeedbackEngine.ts`

Responsibilities:
- collect simulation evidence
- evaluate session-specific checks
- expose formative mission status
- generate real-time learning feedback

Mission evidence is formative browser-generated evidence, not certified grading.

### Rendering

Files:
- `src/simulator/renderer/CanvasRenderer.ts`
- `src/simulator/renderer/Scene3D.ts`
- `src/simulator/renderer/viewport.ts`
- `src/simulator/renderer/simulation-theme.ts`

Rendering modes:
- 2D Canvas
- software-rendered 3D Canvas

## 3. Supabase / authorization boundary

Relevant migrations:
- `202609170001_accounts_and_learning.sql`
- `202609180001_institution_workspaces.sql`
- `202609180002_institution_hardening.sql`
- `202609180003_mentor_workspace_polish.sql`
- `202609180004_participant_pilot.sql`
- `202609190001_cohort_learning.sql`
- `202609190002_formative_missions.sql`

Principal authorization layers:
- platform membership
- organization membership
- cohort membership
- RLS/private authorization helpers
- RPC-only institutional operations

Important server concepts:
- participant / mentor / org_admin
- cohort access
- cohort management capability
- content release
- revision-based code writes
- access-code rate limiting
- audit events

Security auditors must inspect the SQL directly.
This map is not evidence that a policy is correct.

## 4. Principal flows

### Authentication

Browser
→ AuthProvider/auth service
→ Supabase Auth
→ account/profile/membership
→ application state

### Open educational session

Session selection
→ route
→ CodeEditor + Simulator
→ local or institutional storage scope

### Save student code

Guest:
CodeEditor
→ localStorage

Institutional:
CodeEditor
→ cloud-learning service
→ Supabase RPC
→ revision/CAS check
→ cohort code document

### Execute student code

CodeEditor
→ `useSimulation`
→ worker
→ ProgramRuntime
→ parser/interpreter
→ IrohRuntimeAdapter
→ SimulationEngine
→ telemetry/snapshot
→ simulator UI

### Evaluate mission

SimulationEngine events/ticks
→ MissionEvaluator
→ mission evidence
→ MissionPanel

For supported institutional formative missions:
MissionPanel
→ cloud-learning
→ Supabase RPC
→ cohort progress/evidence

### Workspace access

User
→ redeem access code
→ Supabase RPC
→ organization/cohort membership
→ workspace becomes visible

### Mentor session release

Mentor workspace
→ release action
→ Supabase RPC
→ `content_releases`
→ participant session availability

## 5. Important architectural boundaries

### Browser vs database authority

Browser state is not authoritative for permissions.

Authorization-sensitive behavior must be enforced by:
- RLS
- private helper functions
- scoped RPCs

### Main thread vs simulation worker

UI:
- React/main thread

Simulation/runtime:
- Web Worker

Communication:
- typed worker commands/responses and snapshots

### Educational runtime vs simulation engine

Runtime:
- understands the educational programming language

Adapter:
- translates educational API calls

Engine:
- models robot/world behavior

These responsibilities should remain separable.

### Local vs institutional persistence

Local guest state and institutional cloud state are separate scopes.

Institutional data must not silently import unrelated guest/shared data.

## 6. Testing and verification

Primary commands:

- `pnpm typecheck`
- `pnpm test:unit`
- `pnpm test:db`
- `pnpm audit:design`
- `pnpm check`
- `pnpm build`
- `pnpm test:e2e`
- `pnpm verify`

Testing areas:
- educational runtime
- simulation engine
- tracks/missions
- authentication/navigation
- storage/workspace paths
- PostgreSQL/RLS
- browser E2E
- design-token enforcement

Do not infer that passing tests proves pedagogical or UX correctness.

## 7. Areas requiring verification during later audits

The repository map alone does not establish:

- whether every route has the intended authorization guard
- whether all RLS/RPC policies are secure
- whether runtime limits cover all hostile/student input cases
- whether worker lifecycle and errors are robust
- whether local/cloud synchronization has edge cases
- whether activity-version migration strategy is complete
- whether rendering meets performance targets
- whether UI meets accessibility requirements
- whether mentor/student workflows are pedagogically clear
- whether adding future sessions remains maintainable

These questions belong to their respective audit phases.

## 8. Full-detail fallback

If an auditor needs information omitted here, consult:

`docs/audit/01-project-map-full.md`

Do not reread or rescan the entire repository merely to reconstruct
information already present there.
