-- BITIRO Lab 6.2: institution workspaces, cohort access codes and mentor-controlled releases.
-- Accounts belong to BITIRO first. Institutional memberships are added only through explicit access.
begin;

alter table public.memberships alter column site_id drop not null;
alter table public.organizations add column if not exists short_name text;
alter table public.organizations add column if not exists description text;
alter table public.organizations add column if not exists website_url text;
alter table public.organizations add column if not exists program_url text;
alter table public.organizations add column if not exists theme_key text;

create table public.programs (
 id text primary key check(id ~ '^[a-z0-9-]+$'),
 organization_id text not null references public.organizations(id) on delete cascade,
 name text not null check(char_length(name) between 2 and 160),
 level text,
 description text,
 active boolean not null default true,
 sort_order integer not null default 0
);
create table public.cohorts (
 id text primary key check(id ~ '^[a-z0-9-]+$'),
 organization_id text not null references public.organizations(id) on delete cascade,
 program_id text not null references public.programs(id) on delete cascade,
 site_id text references public.sites(id),
 name text not null check(char_length(name) between 2 and 160),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.organization_memberships (
 user_id uuid not null references public.profiles(id) on delete cascade,
 organization_id text not null references public.organizations(id) on delete cascade,
 role text not null default 'participant' check(role in ('participant','mentor','org_admin')),
 active boolean not null default true,
 joined_at timestamptz not null default now(),
 primary key(user_id,organization_id)
);
create table public.cohort_memberships (
 user_id uuid not null references public.profiles(id) on delete cascade,
 cohort_id text not null references public.cohorts(id) on delete cascade,
 role text not null default 'participant' check(role in ('participant','mentor')),
 joined_at timestamptz not null default now(),
 primary key(user_id,cohort_id)
);
create table public.content_releases (
 cohort_id text not null references public.cohorts(id) on delete cascade,
 session_id text not null check(session_id ~ '^s0[1-8]$'),
 released boolean not null default false,
 released_at timestamptz,
 released_by uuid references public.profiles(id),
 primary key(cohort_id,session_id)
);
create table private.workspace_access_codes (
 code text primary key check(char_length(code) between 8 and 64),
 cohort_id text not null references public.cohorts(id) on delete cascade,
 role text not null default 'participant' check(role in ('participant','mentor')),
 label text,
 active boolean not null default true,
 expires_at timestamptz,
 max_uses integer check(max_uses is null or max_uses>0),
 uses integer not null default 0 check(uses>=0),
 created_at timestamptz not null default now()
);
create table private.workspace_code_attempts (
 user_id uuid not null,
 attempted_at timestamptz not null default now()
);
create index workspace_code_attempts_user_time_idx on private.workspace_code_attempts(user_id,attempted_at);
create index cohort_memberships_cohort_idx on public.cohort_memberships(cohort_id);
create index cohorts_org_idx on public.cohorts(organization_id);

-- New accounts are BITIRO accounts. A site/program is attached only after redeeming an institutional code.
create or replace function private.create_account() returns trigger
language plpgsql security definer set search_path='' as $$
declare visible_name text;
begin
 visible_name=btrim(new.raw_user_meta_data->>'display_name');
 if visible_name is null or char_length(visible_name) not between 2 and 80 then
  raise exception 'A display name of 2–80 characters is required' using errcode='22023';
 end if;
 insert into public.profiles(id,display_name) values(new.id,visible_name);
 insert into public.memberships(user_id,site_id,role) values(new.id,null,'participant');
 return new;
end; $$;
revoke all on function private.create_account() from public;

create function private.is_platform_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships where user_id=(select auth.uid()) and role='admin');
$$;
create function private.can_access_cohort(p_cohort_id text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_platform_admin() or exists(
  select 1 from public.cohort_memberships cm
  where cm.user_id=(select auth.uid()) and cm.cohort_id=p_cohort_id
 ) or exists(
  select 1 from public.cohorts c join public.organization_memberships om on om.organization_id=c.organization_id
  where c.id=p_cohort_id and om.user_id=(select auth.uid()) and om.active and om.role='org_admin'
 );
$$;
create function private.can_manage_cohort(p_cohort_id text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_platform_admin() or exists(
  select 1 from public.cohort_memberships cm
  where cm.user_id=(select auth.uid()) and cm.cohort_id=p_cohort_id and cm.role='mentor'
 ) or exists(
  select 1 from public.cohorts c join public.organization_memberships om on om.organization_id=c.organization_id
  where c.id=p_cohort_id and om.user_id=(select auth.uid()) and om.active and om.role='org_admin'
 );
$$;
revoke all on function private.is_platform_admin() from public;
revoke all on function private.can_access_cohort(text) from public;
revoke all on function private.can_manage_cohort(text) from public;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.can_access_cohort(text) to authenticated;
grant execute on function private.can_manage_cohort(text) to authenticated;

alter table public.programs enable row level security;
alter table public.cohorts enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.cohort_memberships enable row level security;
alter table public.content_releases enable row level security;
revoke all on public.programs,public.cohorts,public.organization_memberships,public.cohort_memberships,public.content_releases from anon,authenticated;

-- RPC-only workspace surface. Direct reads remain closed to browser roles.
create function public.list_my_workspaces() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',c.id,
  'organization_id',o.id,
  'organization_name',o.name,
  'role',case when om.role='org_admin' then 'org_admin' when om.role='mentor' or cm.role='mentor' then 'mentor' else 'participant' end,
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
 join public.cohort_memberships cm on cm.user_id=om.user_id
 join public.cohorts c on c.id=cm.cohort_id and c.organization_id=om.organization_id and c.active
 join public.programs p on p.id=c.program_id and p.active
 left join public.sites s on s.id=c.site_id
 where om.user_id=(select auth.uid()) and om.active;
$$;
revoke all on function public.list_my_workspaces() from public,anon;
grant execute on function public.list_my_workspaces() to authenticated;

create function public.redeem_workspace_code(p_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare normalized text; matched private.workspace_access_codes%rowtype; c public.cohorts%rowtype; o public.organizations%rowtype; p public.programs%rowtype; s public.sites%rowtype; effective_role text; existing_cohort_role text; recent_attempts integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 normalized=upper(btrim(coalesce(p_code,'')));
 if char_length(normalized) not between 8 and 64 then raise exception 'Code unavailable' using errcode='22023'; end if;
 delete from private.workspace_code_attempts where user_id=auth.uid() and attempted_at<now()-interval '24 hours';
 select count(*) into recent_attempts from private.workspace_code_attempts where user_id=auth.uid() and attempted_at>now()-interval '15 minutes';
 if recent_attempts>=10 then raise exception 'Code unavailable' using errcode='42501'; end if;
 insert into private.workspace_code_attempts(user_id) values(auth.uid());
 select * into matched from private.workspace_access_codes where code=normalized for update;
 if not found or not matched.active or (matched.expires_at is not null and matched.expires_at<=now()) or (matched.max_uses is not null and matched.uses>=matched.max_uses) then
  raise exception 'Code unavailable' using errcode='22023';
 end if;
 select * into c from public.cohorts where id=matched.cohort_id and active;
 if not found then raise exception 'Code unavailable' using errcode='22023'; end if;
 select * into o from public.organizations where id=c.organization_id and active;
 select * into p from public.programs where id=c.program_id and active;
 select * into s from public.sites where id=c.site_id;
 if o.id is null or p.id is null then raise exception 'Code unavailable' using errcode='22023'; end if;
 select role into existing_cohort_role from public.cohort_memberships where user_id=auth.uid() and cohort_id=c.id;
 insert into public.organization_memberships(user_id,organization_id,role,active)
 values(auth.uid(),o.id,matched.role,true)
 on conflict(user_id,organization_id) do update set
  active=true,
  role=case when public.organization_memberships.role='org_admin' then 'org_admin'
            when public.organization_memberships.role='mentor' or excluded.role='mentor' then 'mentor'
            else 'participant' end;
 insert into public.cohort_memberships(user_id,cohort_id,role)
 values(auth.uid(),c.id,matched.role)
 on conflict(user_id,cohort_id) do update set role=case when public.cohort_memberships.role='mentor' or excluded.role='mentor' then 'mentor' else 'participant' end;
 if existing_cohort_role is null or (matched.role='mentor' and existing_cohort_role<>'mentor') then
  update private.workspace_access_codes set uses=uses+1 where code=normalized;
 end if;
 select case when om.role='org_admin' then 'org_admin' when om.role='mentor' or cm.role='mentor' then 'mentor' else 'participant' end into effective_role
 from public.organization_memberships om join public.cohort_memberships cm on cm.user_id=om.user_id and cm.cohort_id=c.id
 where om.user_id=auth.uid() and om.organization_id=o.id;
 return jsonb_build_object('id',c.id,'organization_id',o.id,'organization_name',o.name,'role',effective_role,'cohort_id',c.id,'cohort_name',c.name,'program_id',p.id,'program_name',p.name,'site_id',s.id,'site_name',s.name,'city',s.city,'region',s.region);
end; $$;
revoke all on function public.redeem_workspace_code(text) from public,anon;
grant execute on function public.redeem_workspace_code(text) to authenticated;

create function public.list_workspace_sessions(p_cohort_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare allowed boolean; manager boolean; result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 allowed=private.can_access_cohort(p_cohort_id);manager=private.can_manage_cohort(p_cohort_id);
 if not allowed then raise exception 'Workspace permission required' using errcode='42501'; end if;
 select jsonb_agg(jsonb_build_object('session_id','s0'||n::text,'released',coalesce(r.released,false),'can_manage',manager) order by n)
 into result
 from generate_series(1,8) n
 left join public.content_releases r on r.cohort_id=p_cohort_id and r.session_id='s0'||n::text;
 return coalesce(result,'[]'::jsonb);
end; $$;
revoke all on function public.list_workspace_sessions(text) from public,anon;
grant execute on function public.list_workspace_sessions(text) to authenticated;

create function public.mentor_set_session_release(p_cohort_id text,p_session_id text,p_released boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.can_manage_cohort(p_cohort_id) then raise exception 'Mentor permission required' using errcode='42501'; end if;
 if p_session_id !~ '^s0[1-8]$' then raise exception 'Invalid session' using errcode='22023'; end if;
 insert into public.content_releases(cohort_id,session_id,released,released_at,released_by)
 values(p_cohort_id,p_session_id,p_released,case when p_released then now() else null end,auth.uid())
 on conflict(cohort_id,session_id) do update set released=excluded.released,released_at=excluded.released_at,released_by=excluded.released_by;
end; $$;
revoke all on function public.mentor_set_session_release(text,text,boolean) from public,anon;
grant execute on function public.mentor_set_session_release(text,text,boolean) to authenticated;

commit;
