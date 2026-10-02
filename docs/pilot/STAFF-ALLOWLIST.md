# Staff allowlist (teachers)

Teachers get access only from `private.staff_allowlist` (migration `202609200003_staff_allowlist.sql`, NOT applied).

- Columns: `email_normalized` (lowercase, checked), `cohort_id` (scope; org derives from it), `role` (only `mentor`), `active`,
  `created_by`, `created_at`, `updated_at`; unique per (email, cohort). RLS enabled, no policies, no browser grants.
- `public.claim_staff_access()` (no arguments) runs after sign-in (once per account per page load, in `WorkspaceProvider`).
  It reads the caller's email and `email_confirmed_at` from `auth.users`; an unverified email never matches.
  Creates/promotes the cohort `mentor` membership (plus a participant org membership if missing). Idempotent, audited
  (`staff_allowlist_claimed`). It never lifts an inactive organisation/cohort membership.
- Maintain entries with `public.admin_set_staff_allowlist(email, cohort_id, active)` (platform admin only) or SQL console:
  `select public.admin_set_staff_allowlist('profe@colegio.cl','<cohort-id>',true);`
- Deactivating an entry stops future claims. It does NOT remove a membership already granted: set
  `cohort_memberships.active=false` for that user as well (manual step; not automated in this sprint).
- Staff-role codes (`workspace_access_codes.role='mentor'`) are no longer redeemable through `redeem_workspace_code`.
- Operational requirement: email confirmation must be enabled in Supabase Auth (otherwise anyone could register with a
  teacher's address; the verified-email check relies on it). Google-verified emails count as confirmed.
