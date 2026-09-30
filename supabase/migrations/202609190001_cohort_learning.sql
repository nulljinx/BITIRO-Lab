-- BITIRO 6.4.3: cohort-scoped learning records. RPC-only surface, no public table grants.
-- 'attempted' is browser-reported formative activity, never verified task completion.
begin;

create table public.cohort_code_documents (
 user_id uuid not null references public.profiles(id) on delete cascade,
 cohort_id text not null references public.cohorts(id) on delete cascade,
 session_id text not null check (session_id ~ '^s0[1-8]$'),
 activity_version integer not null default 1 check(activity_version between 1 and 1000),
 source text not null check (octet_length(source)<=32768),
 revision bigint not null default 1 check (revision>=1),
 updated_at timestamptz not null default now(),
 primary key(user_id,cohort_id,session_id,activity_version)
);
create table public.cohort_learning_progress (
 user_id uuid not null references public.profiles(id) on delete cascade,
 cohort_id text not null references public.cohorts(id) on delete cascade,
 session_id text not null check (session_id ~ '^s0[1-8]$'),
 activity_version integer not null default 1 check(activity_version between 1 and 1000),
 status text not null check (status in ('visited','attempted')),
 updated_at timestamptz not null default now(),
 primary key(user_id,cohort_id,session_id,activity_version)
);
comment on table public.cohort_learning_progress is 'Formative browser-reported visits/attempts only. No client-writable completed or verified state.';
create index cohort_learning_progress_cohort_idx on public.cohort_learning_progress(cohort_id,session_id);
alter table public.cohort_code_documents enable row level security;
alter table public.cohort_learning_progress enable row level security;
revoke all on public.cohort_code_documents,public.cohort_learning_progress from public,anon,authenticated;
-- No browser role may directly query or modify records, including a user''s own.

create function private.can_open_learning(p_cohort_id text,p_session_id text,p_version integer) returns boolean
language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null
  and p_session_id ~ '^s0[1-8]$'
  and p_version between 1 and 1000
  and private.can_access_cohort(p_cohort_id)
  and (private.can_manage_cohort(p_cohort_id) or exists(
    select 1 from public.content_releases r
    where r.cohort_id=p_cohort_id and r.session_id=p_session_id and r.released
  ));
$$;
revoke all on function private.can_open_learning(text,text,integer) from public,anon,authenticated;
-- SECURITY DEFINER functions invoke the private helper internally.

create function public.get_my_cohort_learning(p_cohort_id text,p_session_id text,p_version integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.cohort_code_documents%rowtype; p public.cohort_learning_progress%rowtype;
begin
 if not coalesce(private.can_open_learning(p_cohort_id,p_session_id,p_version),false) then
  raise exception 'Learning access denied' using errcode='42501';
 end if;
 select * into d from public.cohort_code_documents
 where user_id=auth.uid() and cohort_id=p_cohort_id and session_id=p_session_id and activity_version=p_version;
 select * into p from public.cohort_learning_progress
 where user_id=auth.uid() and cohort_id=p_cohort_id and session_id=p_session_id and activity_version=p_version;
 return jsonb_build_object('document',case when d.user_id is null then null else jsonb_build_object(
  'source',d.source,'revision',d.revision,'updated_at',d.updated_at) end,
  'progress',case when p.user_id is null then null else jsonb_build_object(
  'status',p.status,'updated_at',p.updated_at) end);
end; $$;
revoke all on function public.get_my_cohort_learning(text,text,integer) from public,anon;
grant execute on function public.get_my_cohort_learning(text,text,integer) to authenticated;

-- CAS avoids silent lost updates between tabs/devices. Revision 0 means no remote document yet.
create function public.save_my_cohort_code(p_cohort_id text,p_session_id text,p_source text,p_expected_revision bigint,p_version integer default 1) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.cohort_code_documents%rowtype;
begin
 if not coalesce(private.can_open_learning(p_cohort_id,p_session_id,p_version),false) then
  raise exception 'Learning access denied' using errcode='42501';
 end if;
 if p_source is null or octet_length(p_source)>32768 or p_expected_revision is null or p_expected_revision<0 then
  raise exception 'Invalid document' using errcode='22023';
 end if;
 if p_expected_revision=0 then
  insert into public.cohort_code_documents(user_id,cohort_id,session_id,activity_version,source)
  values(auth.uid(),p_cohort_id,p_session_id,p_version,p_source)
  on conflict do nothing
  returning * into d;
 else
  update public.cohort_code_documents
  set source=p_source,revision=revision+1,updated_at=now()
  where user_id=auth.uid() and cohort_id=p_cohort_id and session_id=p_session_id
   and activity_version=p_version and revision=p_expected_revision
  returning * into d;
 end if;
 if d.user_id is null then return jsonb_build_object('ok',false,'reason','conflict'); end if;
 return jsonb_build_object('ok',true,'revision',d.revision,'updated_at',d.updated_at);
end; $$;
revoke all on function public.save_my_cohort_code(text,text,text,bigint,integer) from public,anon;
grant execute on function public.save_my_cohort_code(text,text,text,bigint,integer) to authenticated;

create function public.mark_my_cohort_activity(p_cohort_id text,p_session_id text,p_event text,p_version integer default 1) returns text
language plpgsql security definer set search_path='' as $$
declare result text;
begin
 if not coalesce(private.can_open_learning(p_cohort_id,p_session_id,p_version),false) then
  raise exception 'Learning access denied' using errcode='42501';
 end if;
 if p_event is null or p_event not in ('visited','attempted') then
  raise exception 'Unsupported learning event' using errcode='22023';
 end if;
 insert into public.cohort_learning_progress(user_id,cohort_id,session_id,activity_version,status)
 values(auth.uid(),p_cohort_id,p_session_id,p_version,p_event)
 on conflict(user_id,cohort_id,session_id,activity_version) do update
 set status=case when public.cohort_learning_progress.status='attempted' then 'attempted' else excluded.status end,
     updated_at=case when public.cohort_learning_progress.status='attempted' and excluded.status='visited'
       then public.cohort_learning_progress.updated_at else now() end
 returning status into result;
 return result;
end; $$;
revoke all on function public.mark_my_cohort_activity(text,text,text,integer) from public,anon;
grant execute on function public.mark_my_cohort_activity(text,text,text,integer) to authenticated;

create function public.mentor_cohort_learning(p_cohort_id text,p_version integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare records jsonb;
begin
 if auth.uid() is null or not coalesce(private.can_manage_cohort(p_cohort_id),false) or p_version is null or p_version not between 1 and 1000 then
  raise exception 'Mentor permission required' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'user_id',cm.user_id,'session_id',pr.session_id,'status',pr.status,'updated_at',pr.updated_at
 ) order by cm.user_id,pr.session_id),'[]'::jsonb)
 into records
 from public.cohort_memberships cm
 join public.cohorts c on c.id=cm.cohort_id and c.active
 join public.organization_memberships om on om.user_id=cm.user_id and om.organization_id=c.organization_id and om.active
 join public.profiles profile on profile.id=cm.user_id
 join public.cohort_learning_progress pr on pr.user_id=cm.user_id and pr.cohort_id=cm.cohort_id and pr.activity_version=p_version
 where cm.cohort_id=p_cohort_id and cm.active and cm.role='participant';
 return records;
end; $$;
revoke all on function public.mentor_cohort_learning(text,integer) from public,anon;
grant execute on function public.mentor_cohort_learning(text,integer) to authenticated;
commit;
