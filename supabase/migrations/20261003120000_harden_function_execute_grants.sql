-- BITIRO Lab security hardening (forward-only). NOT applied to production by the repository work.
--
begin;

-- 1. public.rls_auto_enable() is the Supabase-managed function behind the `ensure_rls` EVENT TRIGGER. It is not
--    created by any BITIRO migration, so it only exists on hosted projects. Its default ACL gives EXECUTE to
--    PUBLIC/anon/authenticated/service_role, which makes it appear as an RPC (/rest/v1/rpc/rls_auto_enable).
--    Nobody needs to call it: PostgreSQL does not check EXECUTE when an event trigger fires (only the superuser who
--    creates the trigger needs it), so the trigger keeps enabling RLS on new public tables. The function stays
--    SECURITY DEFINER with its own search_path; the owner (postgres) keeps its implicit privileges.
--    The event trigger is NOT dropped or disabled. Guarded so local/PGlite databases without the function still apply.
do $$
begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  revoke all on function public.rls_auto_enable() from public,anon,authenticated,service_role;
 end if;
end $$;

-- 2. private.can_access_cohort(text) LOSES direct EXECUTE for `authenticated` (and PUBLIC/anon) in this migration.
--    It is only called from SECURITY DEFINER functions (list_workspace_sessions, redeem_workspace_code,
--    private.can_open_learning), which run as the function owner, and no RLS policy uses it.
--    NOT changed here: private.can_read_user, private.is_admin, private.is_platform_admin and
--    private.can_manage_cohort KEEP EXECUTE for `authenticated`, because RLS policies evaluate them as the caller.
revoke all on function private.can_access_cohort(text) from public,anon,authenticated;

commit;
