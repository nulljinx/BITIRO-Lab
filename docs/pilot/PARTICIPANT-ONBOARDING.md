# Participant onboarding with the teacher's code

Flow: sign in (Google or email) → `/espacios`. One workspace → direct entry to the cohort; none → code screen; success → membership
is stored, so the code is never asked again.

- Client calls `public.redeem_participant_code(p_code)`; the only payload is the code (no role, cohort or org argument).
- Server (`202609200002_participant_code_redemption.sql`): same rate limit (10 attempts/15 min), attempt log, row lock,
  expiry, `max_uses`, revocation (`active=false`), suspension rules and audit as before, plus: a code whose row role is not
  `participant` is refused here. Repeat entry is idempotent and does not consume a seat.
- Mentor-issued codes (`mentor_create_participant_invite`, 40 seats / 14 days default) are the pilot mechanism; revoking or
  regenerating deactivates the previous one.
- `redeem_workspace_code` is kept unchanged for compatibility and still honours mentor-role code rows (see AUTH-STAFF-ALLOWLIST).
