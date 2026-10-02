-- BITIRO Lab pilot: staff (teacher) access is granted only from a server-side allowlist.
-- A student can never become a mentor by registering, by sending metadata or by guessing a staff code:
--  * the allowlist lives in the private schema (no browser grants, RLS enabled, no policies);
--  * public.claim_staff_access() takes NO arguments; it reads the caller's verified email from auth.users;
--  * only the explicitly allowed cohort-level role 'mentor' can be granted, only for the cohort named in the row;
--  * redeem_workspace_code no longer honours staff-role code rows (participant codes only).
-- Forward-only and not applied by the repository work.
begin;

create table private.staff_allowlist (
 id bigint generated always as identity primary key,
 email_normalized text not null check(email_normalized=lower(btrim(email_normalized)) and email_normalized ~ '^[^@\s]+@[^@\s]+$' and char_length(email_normalized)<=254),
 cohort_id text not null references public.cohorts(id) on delete cascade,
 role text not null default 'mentor' check(role in ('mentor')),
 active boolean not null default true,
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(email_normalized,cohort_id)
);
create index staff_allowlist_email_idx on private.staff_allowlist(email_normalized) where active;
alter table private.staff_allowlist enable row level security;
revoke all on private.staff_allowlist from public,anon,authenticated;

-- Staff-role codes are retired: teachers are authorized by the allowlist, never by a shareable code.
create or replace function public.redeem_workspace_code(p_code text) returns jsonb
language sql security definer set search_path='' as $$
 select private.redeem_code_impl(p_code,true);
$$;
revoke all on function public.redeem_workspace_code(text) from public,anon;
grant execute on function public.redeem_workspace_code(text) to authenticated;

-- Grants or restores the caller's mentor membership for every active allowlist row that matches their VERIFIED email.
-- No role, email or cohort is accepted from the client. An administrative suspension (inactive organization or cohort
-- membership) is never lifted here.
create or replace function public.claim_staff_access() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid := auth.uid();
 mail text;
 verified timestamptz;
 r record;
 org_found boolean;
 org_active boolean;
 cm_found boolean;
 cm_role text;
 cm_active boolean;
 granted integer := 0;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;

 select lower(btrim(u.email)),u.email_confirmed_at into mail,verified from auth.users u where u.id=uid;
 if mail is null or mail='' or verified is null then
  return jsonb_build_object('ok',true,'granted',0);
 end if;

 for r in
  select a.cohort_id,c.organization_id
  from private.staff_allowlist a
  join public.cohorts c on c.id=a.cohort_id and c.active
  join public.programs p on p.id=c.program_id and p.organization_id=c.organization_id and p.active
  join public.organizations o on o.id=c.organization_id and o.active
  left join public.sites s on s.id=c.site_id and s.organization_id=o.id
  where a.email_normalized=mail and a.active and a.role='mentor'
    and (c.site_id is null or (s.id is not null and s.active))
  order by a.cohort_id
 loop
  select om.active into org_active from public.organization_memberships om where om.user_id=uid and om.organization_id=r.organization_id;
  org_found=found;
  if org_found and not org_active then continue; end if;
  if not org_found then
   insert into public.organization_memberships(user_id,organization_id,role,active) values(uid,r.organization_id,'participant',true);
  end if;

  select cm.role,cm.active into cm_role,cm_active from public.cohort_memberships cm where cm.user_id=uid and cm.cohort_id=r.cohort_id;
  cm_found=found;
  if not cm_found then
   insert into public.cohort_memberships(user_id,cohort_id,role,active) values(uid,r.cohort_id,'mentor',true);
  elsif not cm_active then
   continue;
  elsif cm_role<>'mentor' then
   update public.cohort_memberships set role='mentor' where user_id=uid and cohort_id=r.cohort_id;
  else
   continue;
  end if;

  granted=granted+1;
  insert into public.institution_audit_events(actor_id,subject_id,organization_id,cohort_id,event_type,details)
  values(uid,uid,r.organization_id,r.cohort_id,'staff_allowlist_claimed',jsonb_build_object('role','mentor'));
 end loop;

 return jsonb_build_object('ok',true,'granted',granted);
end; $$;
revoke all on function public.claim_staff_access() from public,anon;
grant execute on function public.claim_staff_access() to authenticated;

-- Platform administrators maintain the allowlist (it is not editable by mentors, organisation admins or participants).
create or replace function public.admin_set_staff_allowlist(p_email text,p_cohort_id text,p_active boolean default true) returns void
language plpgsql security definer set search_path='' as $$
declare
 mail text := lower(btrim(coalesce(p_email,'')));
 org_id text;
begin
 if auth.uid() is null or not private.is_platform_admin() then
  raise exception 'Administrator permission required' using errcode='42501';
 end if;
 if mail !~ '^[^@\s]+@[^@\s]+$' or char_length(mail)>254 then raise exception 'Invalid email' using errcode='22023'; end if;
 select organization_id into org_id from public.cohorts where id=p_cohort_id;
 if org_id is null then raise exception 'Cohort unavailable' using errcode='22023'; end if;

 insert into private.staff_allowlist(email_normalized,cohort_id,role,active,created_by)
 values(mail,p_cohort_id,'mentor',coalesce(p_active,true),auth.uid())
 on conflict(email_normalized,cohort_id) do update set active=excluded.active,updated_at=now();

 insert into public.institution_audit_events(actor_id,organization_id,cohort_id,event_type,details)
 values(auth.uid(),org_id,p_cohort_id,'staff_allowlist_changed',jsonb_build_object('active',coalesce(p_active,true)));
end; $$;
revoke all on function public.admin_set_staff_allowlist(text,text,boolean) from public,anon;
grant execute on function public.admin_set_staff_allowlist(text,text,boolean) to authenticated;

commit;
