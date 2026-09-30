-- BITIRO Lab 6.3.2: institutional authorization hardening.
-- Cohort-scoped roles, effective-access checks and persistent access-code throttling.
begin;

alter table public.cohort_memberships
  add column if not exists active boolean not null default true;

-- Organization-level mentor was an early compatibility role. Mentor authority is now cohort-scoped.
update public.organization_memberships
set role='participant'
where role='mentor';

-- Guard against cross-organization program/site combinations in cohorts.
do $$
begin
 if not exists(select 1 from pg_constraint where conname='programs_id_organization_unique') then
  alter table public.programs add constraint programs_id_organization_unique unique(id,organization_id);
 end if;
 if not exists(select 1 from pg_constraint where conname='sites_id_organization_unique') then
  alter table public.sites add constraint sites_id_organization_unique unique(id,organization_id);
 end if;
 if not exists(select 1 from pg_constraint where conname='cohorts_program_same_organization') then
  alter table public.cohorts add constraint cohorts_program_same_organization
   foreign key(program_id,organization_id) references public.programs(id,organization_id);
 end if;
 if not exists(select 1 from pg_constraint where conname='cohorts_site_same_organization') then
  alter table public.cohorts add constraint cohorts_site_same_organization
   foreign key(site_id,organization_id) references public.sites(id,organization_id);
 end if;
end $$;

create table if not exists private.workspace_rate_limits (
 user_id uuid primary key,
 touched_at timestamptz not null default now()
);
revoke all on private.workspace_rate_limits from public,anon,authenticated;

alter table private.workspace_code_attempts
 add column if not exists outcome text not null default 'attempt'
 check(outcome in ('attempt','success'));

-- Append-only institutional security/audit events. Browser roles cannot write these rows.
create table if not exists public.institution_audit_events (
 id bigint generated always as identity primary key,
 actor_id uuid,
 subject_id uuid,
 organization_id text references public.organizations(id),
 cohort_id text references public.cohorts(id),
 event_type text not null,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.institution_audit_events enable row level security;
revoke all on public.institution_audit_events from anon,authenticated;
grant select on public.institution_audit_events to authenticated;

-- Rebuild the helpers around one effective-access model. Platform admin is the explicit exception.
create or replace function private.can_access_cohort(p_cohort_id text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_platform_admin() or exists(
  select 1
  from public.cohort_memberships cm
  join public.cohorts c on c.id=cm.cohort_id and c.active
  join public.programs p on p.id=c.program_id and p.organization_id=c.organization_id and p.active
  join public.organizations o on o.id=c.organization_id and o.active
  join public.organization_memberships om on om.user_id=cm.user_id and om.organization_id=o.id and om.active
  left join public.sites s on s.id=c.site_id and s.organization_id=o.id
  where cm.user_id=(select auth.uid())
    and cm.cohort_id=p_cohort_id
    and cm.active
    and (c.site_id is null or (s.id is not null and s.active))
 );
$$;

create or replace function private.can_manage_cohort(p_cohort_id text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_platform_admin() or exists(
  select 1
  from public.cohorts c
  join public.programs p on p.id=c.program_id and p.organization_id=c.organization_id and p.active
  join public.organizations o on o.id=c.organization_id and o.active
  join public.organization_memberships om on om.user_id=(select auth.uid()) and om.organization_id=o.id and om.active
  left join public.cohort_memberships cm on cm.user_id=om.user_id and cm.cohort_id=c.id and cm.active
  left join public.sites s on s.id=c.site_id and s.organization_id=o.id
  where c.id=p_cohort_id
    and c.active
    and (c.site_id is null or (s.id is not null and s.active))
    and (om.role='org_admin' or cm.role='mentor')
 );
$$;

revoke all on function private.can_access_cohort(text) from public;
revoke all on function private.can_manage_cohort(text) from public;
grant execute on function private.can_access_cohort(text) to authenticated;
grant execute on function private.can_manage_cohort(text) to authenticated;

create policy institution_audit_manager_read on public.institution_audit_events
 for select to authenticated
 using(private.is_platform_admin() or (cohort_id is not null and private.can_manage_cohort(cohort_id)));

-- Workspace role is cohort-specific. Organization administrator remains an explicit organization-level capability.
create or replace function public.list_my_workspaces() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',c.id,
  'organization_id',o.id,
  'organization_name',o.name,
  'role',case when om.role='org_admin' then 'org_admin' else cm.role end,
  'can_manage',case when om.role='org_admin' or cm.role='mentor' then true else false end,
  'cohort_id',c.id,
  'cohort_name',c.name,
  'program_id',p.id,
  'program_name',p.name,
  'site_id',s.id,
  'site_name',s.name,
  'city',s.city,
  'region',s.region
 ) order by o.name,c.name),'[]'::jsonb)
 from public.organization_memberships om
 join public.organizations o on o.id=om.organization_id and o.active
 join public.cohort_memberships cm on cm.user_id=om.user_id and cm.active
 join public.cohorts c on c.id=cm.cohort_id and c.organization_id=om.organization_id and c.active
 join public.programs p on p.id=c.program_id and p.organization_id=c.organization_id and p.active
 left join public.sites s on s.id=c.site_id and s.organization_id=c.organization_id
 where om.user_id=(select auth.uid()) and om.active and (c.site_id is null or (s.id is not null and s.active));
$$;
revoke all on function public.list_my_workspaces() from public,anon;
grant execute on function public.list_my_workspaces() to authenticated;

-- Expected redemption failures return a generic result instead of raising after the attempt is logged.
-- A per-user row lock serializes the 15-minute budget inside PostgreSQL.
create or replace function public.redeem_workspace_code(p_code text) returns jsonb
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
    or (matched.max_uses is not null and matched.uses>=matched.max_uses) then
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
revoke all on function public.redeem_workspace_code(text) from public,anon;
grant execute on function public.redeem_workspace_code(text) to authenticated;

create or replace function public.list_workspace_sessions(p_cohort_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare allowed boolean; manager boolean; result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 allowed=private.can_access_cohort(p_cohort_id);
 manager=private.can_manage_cohort(p_cohort_id);
 if not allowed then raise exception 'Workspace permission required' using errcode='42501'; end if;
 select jsonb_agg(jsonb_build_object(
   'session_id','s0'||n::text,
   'released',coalesce(r.released,false),
   'can_manage',manager
  ) order by n)
 into result
 from generate_series(1,8) n
 left join public.content_releases r on r.cohort_id=p_cohort_id and r.session_id='s0'||n::text;
 return coalesce(result,'[]'::jsonb);
end; $$;
revoke all on function public.list_workspace_sessions(text) from public,anon;
grant execute on function public.list_workspace_sessions(text) to authenticated;

create or replace function public.mentor_set_session_release(p_cohort_id text,p_session_id text,p_released boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.can_manage_cohort(p_cohort_id) then
  raise exception 'Mentor permission required' using errcode='42501';
 end if;
 if p_session_id !~ '^s0[1-8]$' then raise exception 'Invalid session' using errcode='22023'; end if;
 insert into public.content_releases(cohort_id,session_id,released,released_at,released_by)
 values(p_cohort_id,p_session_id,p_released,case when p_released then now() else null end,auth.uid())
 on conflict(cohort_id,session_id) do update set
  released=excluded.released,
  released_at=excluded.released_at,
  released_by=excluded.released_by;
 insert into public.institution_audit_events(actor_id,organization_id,cohort_id,event_type,details)
 select auth.uid(),c.organization_id,c.id,'session_release_changed',jsonb_build_object('session_id',p_session_id,'released',p_released)
 from public.cohorts c where c.id=p_cohort_id;
end; $$;
revoke all on function public.mentor_set_session_release(text,text,boolean) from public,anon;
grant execute on function public.mentor_set_session_release(text,text,boolean) to authenticated;

commit;
