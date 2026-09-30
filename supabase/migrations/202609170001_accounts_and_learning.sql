-- BITIRO Lab: public registration, least-privilege roles and site-scoped learning data.
-- Run as the database owner through Supabase migrations, never from the browser.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.organizations (
 id text primary key check (id ~ '^[a-z0-9-]+$'),
 name text not null check (char_length(name) between 2 and 160),
 active boolean not null default true
);
create table public.sites (
 id text primary key check (id ~ '^[a-z0-9-]+$'),
 organization_id text not null references public.organizations(id),
 name text not null, city text not null, region text not null, partner text not null,
 active boolean not null default true, sort_order integer not null default 0
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
 requested_role text not null default 'participant' check(requested_role in ('participant','facilitator')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.memberships (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 site_id text not null references public.sites(id),
 role text not null default 'participant' check(role in ('participant','facilitator','admin')),
 updated_at timestamptz not null default now()
);
create index memberships_site_idx on public.memberships(site_id);
create table public.program_progress (
 user_id uuid not null references public.profiles(id) on delete cascade,
 session_id text not null check(session_id ~ '^s0[1-8]$'),
 status text not null default 'visited' check(status in ('visited','inprogress','completed')),
 updated_at timestamptz not null default now(),
 primary key(user_id,session_id)
);
comment on column public.program_progress.status is 'Participant activity/self-reported completion. Not an assessment or verified achievement.';
create table public.code_documents (
 user_id uuid not null references public.profiles(id) on delete cascade,
 session_id text not null check(session_id ~ '^s0[1-8]$'),
 source text not null default '' check(octet_length(source)<=32768),
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now(),
 primary key(user_id,session_id)
);
create table public.membership_audit (
 id bigint generated always as identity primary key,
 actor_id uuid, subject_id uuid not null,
 before_value jsonb, after_value jsonb not null,
 created_at timestamptz not null default now()
);

-- These helpers read membership as the owner, preventing recursive RLS policies.
-- Roles come only from this table, never editable auth metadata or JWT custom claims.
create function private.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships where user_id=(select auth.uid()) and role='admin');
$$;
create function private.can_read_user(p_user_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select p_user_id=(select auth.uid()) or exists(
  select 1 from public.memberships actor
  where actor.user_id=(select auth.uid()) and (
   actor.role='admin' or (actor.role='facilitator' and exists(
    select 1 from public.memberships target where target.user_id=p_user_id and target.site_id=actor.site_id
   ))
  )
 );
$$;
revoke all on function private.is_admin() from public;
revoke all on function private.can_read_user(uuid) from public;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.can_read_user(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.sites enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.program_progress enable row level security;
alter table public.code_documents enable row level security;
alter table public.membership_audit enable row level security;
revoke all on public.organizations, public.sites, public.profiles, public.memberships, public.program_progress, public.code_documents, public.membership_audit from anon, authenticated;
grant select on public.organizations,public.sites to anon,authenticated;
grant select on public.profiles,public.memberships to authenticated;
grant select,insert,update,delete on public.program_progress,public.code_documents to authenticated;
grant select on public.membership_audit to authenticated;
create policy organizations_public on public.organizations for select to anon,authenticated using(active);
create policy sites_public on public.sites for select to anon,authenticated using(active);
create policy profiles_read on public.profiles for select to authenticated using(private.can_read_user(id));
create policy memberships_read on public.memberships for select to authenticated using(private.can_read_user(user_id));
create policy progress_read on public.program_progress for select to authenticated using(private.can_read_user(user_id));
create policy progress_insert on public.program_progress for insert to authenticated with check(user_id=(select auth.uid()));
create policy progress_update on public.program_progress for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy progress_delete on public.program_progress for delete to authenticated using(user_id=(select auth.uid()));
create policy code_read on public.code_documents for select to authenticated using(private.can_read_user(user_id));
create policy code_insert on public.code_documents for insert to authenticated with check(user_id=(select auth.uid()));
create policy code_update on public.code_documents for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy code_delete on public.code_documents for delete to authenticated using(user_id=(select auth.uid()));
create policy audit_admin_read on public.membership_audit for select to authenticated using(private.is_admin());

create function private.touch_learning_record() returns trigger
language plpgsql set search_path='' as $$
begin
 new.updated_at=now();
 if tg_table_name='code_documents' then
  if tg_op='INSERT' then new.revision=1; else new.revision=old.revision+1; end if;
 end if;
 return new;
end; $$;
revoke all on function private.touch_learning_record() from public;
create trigger progress_timestamp before insert or update on public.program_progress for each row execute function private.touch_learning_record();
create trigger code_revision before insert or update on public.code_documents for each row execute function private.touch_learning_record();

create function private.create_account() returns trigger
language plpgsql security definer set search_path='' as $$
declare site text; visible_name text;
begin
 site=new.raw_user_meta_data->>'site_id';
 visible_name=btrim(new.raw_user_meta_data->>'display_name');
 if visible_name is null or char_length(visible_name) not between 2 and 80 then
  raise exception 'A display name of 2–80 characters is required' using errcode='22023';
 end if;
 if not exists(select 1 from public.sites s join public.organizations o on o.id=s.organization_id where s.id=site and s.active and o.active) then
  raise exception 'Choose an active site' using errcode='22023';
 end if;
 insert into public.profiles(id,display_name) values(new.id,visible_name);
 -- Never copy role from raw_user_meta_data: signup always creates a participant.
 insert into public.memberships(user_id,site_id,role) values(new.id,site,'participant');
 return new;
end; $$;
revoke all on function private.create_account() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_account();

create function public.update_my_profile(p_display_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_display_name is null or char_length(btrim(p_display_name)) not between 2 and 80 then raise exception 'Invalid display name' using errcode='22023'; end if;
 update public.profiles set display_name=btrim(p_display_name),updated_at=now() where id=auth.uid();
end; $$;
revoke all on function public.update_my_profile(text) from public,anon;
grant execute on function public.update_my_profile(text) to authenticated;

create function private.audit_membership() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or old.site_id is distinct from new.site_id or old.role is distinct from new.role then
  insert into public.membership_audit(actor_id,subject_id,before_value,after_value)
  values(auth.uid(),new.user_id,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 end if;
 return new;
end; $$;
revoke all on function private.audit_membership() from public;
create trigger membership_change_audit after insert or update on public.memberships for each row execute function private.audit_membership();

create function public.admin_update_membership(p_user_id uuid,p_site_id text,p_role text) returns void
language plpgsql security definer set search_path='' as $$
declare previous public.memberships;
begin
 -- Serialize role changes so two concurrent requests cannot remove all admins.
 perform pg_advisory_xact_lock(74218061);
 if not private.is_admin() then raise exception 'Admin permission required' using errcode='42501'; end if;
 if p_role not in ('participant','facilitator','admin') or p_role is null then raise exception 'Invalid role' using errcode='22023'; end if;
 if not exists(select 1 from public.sites s join public.organizations o on o.id=s.organization_id where s.id=p_site_id and s.active and o.active) then raise exception 'Invalid site' using errcode='22023'; end if;
 select * into previous from public.memberships where user_id=p_user_id for update;
 if not found then raise exception 'Unknown member' using errcode='22023'; end if;
 if previous.role='admin' and p_role<>'admin' and (select count(*) from public.memberships where role='admin')<=1 then
  raise exception 'Cannot demote the last admin' using errcode='42501';
 end if;
 update public.memberships set site_id=p_site_id,role=p_role,updated_at=now() where user_id=p_user_id;
end; $$;
revoke all on function public.admin_update_membership(uuid,text,text) from public,anon;
grant execute on function public.admin_update_membership(uuid,text,text) to authenticated;

-- Invoker rights preserve RLS; filters/pagination never broaden site visibility.
create function public.list_visible_members(p_limit integer default 25,p_offset integer default 0,p_query text default '',p_site_id text default null) returns jsonb
language sql stable security invoker set search_path='' as $$
 with visible as (
  select p.id,p.display_name,p.created_at,p.requested_role,m.site_id,m.role,
   case when s.id is null then null else jsonb_build_object('id',s.id,'name',s.name,'city',s.city,'region',s.region,'partner',s.partner,'organization_id',s.organization_id) end as site
  from public.profiles p join public.memberships m on m.user_id=p.id
  left join public.sites s on s.id=m.site_id
  where (p_site_id is null or m.site_id=p_site_id)
   and position(lower(left(coalesce(p_query,''),80)) in lower(p.display_name))>0
 ), page as (
  select * from visible order by display_name,id
  limit least(100,greatest(1,coalesce(p_limit,25)))
  offset least(1000000,greatest(0,coalesce(p_offset,0)))
 )
 select jsonb_build_object('total',(select count(*) from visible),'members',coalesce((select jsonb_agg(jsonb_build_object(
  'profile',jsonb_build_object('id',id,'display_name',display_name,'requested_role',requested_role,'created_at',created_at),
  'membership',jsonb_build_object('user_id',id,'site_id',site_id,'role',role),'site',site
 ) order by display_name,id) from page),'[]'::jsonb));
$$;
revoke all on function public.list_visible_members(integer,integer,text,text) from public,anon;
grant execute on function public.list_visible_members(integer,integer,text,text) to authenticated;
commit;
