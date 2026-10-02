-- BITIRO Lab pilot: participant-only cohort onboarding.
-- The student onboarding screen must be able to create a PARTICIPANT membership and nothing else, even if a staff-role
-- code row exists. The redemption logic (rate limit, attempt log, locking, expiry, max_uses, suspension rules, audit)
-- moves unchanged into a private implementation; the public wrappers differ only in the participant_only flag.
-- Forward-only: redeem_workspace_code keeps its signature, behaviour and grants.
begin;

create or replace function private.redeem_code_impl(p_code text,p_participant_only boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 normalized text;
 matched private.workspace_access_codes%rowtype;
 c public.cohorts%rowtype;
 o public.organizations%rowtype;
 p public.programs%rowtype;
 s public.sites%rowtype;
 existing_org_role text;
 existing_org_active boolean;
 existing_org boolean := false;
 existing_cohort_role text;
 existing_cohort_active boolean;
 existing_cohort boolean := false;
 effective_role text;
 recent_attempts integer;
 attempt_time timestamptz;
 consume_use boolean := false;
begin
 if auth.uid() is null then
  raise exception 'Authentication required' using errcode='42501';
 end if;

 insert into private.workspace_rate_limits(user_id,touched_at)
 values(auth.uid(),now())
 on conflict(user_id) do update set touched_at=excluded.touched_at;
 -- The upsert takes a row-level lock for this user until the transaction ends.

 delete from private.workspace_code_attempts
 where user_id=auth.uid() and attempted_at<now()-interval '24 hours';

 select count(*) into recent_attempts
 from private.workspace_code_attempts
 where user_id=auth.uid() and attempted_at>now()-interval '15 minutes' and outcome='attempt';

 if recent_attempts>=10 then
  return jsonb_build_object('ok',false,'reason','unavailable');
 end if;

 attempt_time=clock_timestamp();
 insert into private.workspace_code_attempts(user_id,attempted_at,outcome) values(auth.uid(),attempt_time,'attempt');
 normalized=upper(btrim(coalesce(p_code,'')));
 if char_length(normalized) not between 8 and 64 then
  return jsonb_build_object('ok',false,'reason','unavailable');
 end if;

 select * into matched
 from private.workspace_access_codes
 where code=normalized
 for update;

 if not found
    or not matched.active
    or (matched.expires_at is not null and matched.expires_at<=now())
    or (matched.max_uses is not null and matched.uses>=matched.max_uses)
    -- Student onboarding never honours a staff-role code, whatever the code row says.
    or (p_participant_only and matched.role<>'participant') then
  return jsonb_build_object('ok',false,'reason','unavailable');
 end if;

 select * into c from public.cohorts where id=matched.cohort_id and active;
 if not found then return jsonb_build_object('ok',false,'reason','unavailable'); end if;
 select * into o from public.organizations where id=c.organization_id and active;
 if not found then return jsonb_build_object('ok',false,'reason','unavailable'); end if;
 select * into p from public.programs where id=c.program_id and organization_id=c.organization_id and active;
 if not found then return jsonb_build_object('ok',false,'reason','unavailable'); end if;
 if c.site_id is not null then
  select * into s from public.sites where id=c.site_id and organization_id=c.organization_id and active;
  if not found then return jsonb_build_object('ok',false,'reason','unavailable'); end if;
 end if;

 select role,active into existing_org_role,existing_org_active
 from public.organization_memberships
 where user_id=auth.uid() and organization_id=o.id;
 existing_org=found;
 if existing_org and not existing_org_active then
  -- A shared code never lifts an administrative suspension.
  return jsonb_build_object('ok',false,'reason','unavailable');
 end if;

 select role,active into existing_cohort_role,existing_cohort_active
 from public.cohort_memberships
 where user_id=auth.uid() and cohort_id=c.id;
 existing_cohort=found;
 if existing_cohort and not existing_cohort_active then
  return jsonb_build_object('ok',false,'reason','unavailable');
 end if;

 if not existing_org then
  insert into public.organization_memberships(user_id,organization_id,role,active)
  values(auth.uid(),o.id,'participant',true);
 end if;

 if not existing_cohort then
  insert into public.cohort_memberships(user_id,cohort_id,role,active)
  values(auth.uid(),c.id,matched.role,true);
  consume_use=true;
 elsif matched.role='mentor' and existing_cohort_role='participant' then
  -- Mentor codes may elevate an active member; production should issue them individually/ephemerally.
  update public.cohort_memberships set role='mentor' where user_id=auth.uid() and cohort_id=c.id and active;
  consume_use=true;
 end if;

 if consume_use then
  update private.workspace_access_codes set uses=uses+1 where code=normalized;
 end if;

 select case when om.role='org_admin' then 'org_admin' else cm.role end into effective_role
 from public.organization_memberships om
 join public.cohort_memberships cm on cm.user_id=om.user_id and cm.cohort_id=c.id and cm.active
 where om.user_id=auth.uid() and om.organization_id=o.id and om.active;

 update private.workspace_code_attempts
 set outcome='success'
 where user_id=auth.uid() and attempted_at=attempt_time;

 insert into public.institution_audit_events(actor_id,subject_id,organization_id,cohort_id,event_type,details)
 values(auth.uid(),auth.uid(),o.id,c.id,'workspace_code_redeemed',jsonb_build_object('role',effective_role));

 return jsonb_build_object(
  'ok',true,
  'workspace',jsonb_build_object(
   'id',c.id,
   'organization_id',o.id,
   'organization_name',o.name,
   'role',effective_role,
   'can_manage',(effective_role in ('mentor','org_admin')),
   'cohort_id',c.id,
   'cohort_name',c.name,
   'program_id',p.id,
   'program_name',p.name,
   'site_id',case when c.site_id is null then null else s.id end,
   'site_name',case when c.site_id is null then null else s.name end,
   'city',case when c.site_id is null then null else s.city end,
   'region',case when c.site_id is null then null else s.region end
  )
 );
end; $$;

revoke all on function private.redeem_code_impl(text,boolean) from public,anon,authenticated;

create or replace function public.redeem_workspace_code(p_code text) returns jsonb
language sql security definer set search_path='' as $$
 select private.redeem_code_impl(p_code,false);
$$;
revoke all on function public.redeem_workspace_code(text) from public,anon;
grant execute on function public.redeem_workspace_code(text) to authenticated;

create or replace function public.redeem_participant_code(p_code text) returns jsonb
language sql security definer set search_path='' as $$
 select private.redeem_code_impl(p_code,true);
$$;
revoke all on function public.redeem_participant_code(text) from public,anon;
grant execute on function public.redeem_participant_code(text) to authenticated;

commit;
