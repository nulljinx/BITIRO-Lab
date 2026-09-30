-- BITIRO integrated laboratory. 'completed' represents FORMATIVE CLIENT-SIMULATOR
-- evidence only: it is not instructor grading, exam certification or trusted
-- server reproduction of untrusted Arduino code.
begin;
alter table public.cohort_learning_progress
 drop constraint if exists cohort_learning_progress_status_check;
alter table public.cohort_learning_progress
 add constraint cohort_learning_progress_status_check
 check (status in ('visited','attempted','completed'));
alter table public.cohort_learning_progress
 add column mission_evidence jsonb not null default '{}'::jsonb
 check(octet_length(mission_evidence::text)<=8192);
comment on column public.cohort_learning_progress.mission_evidence is
 'Formative report from a student-controlled browser; never trusted as certified achievement.';

create function public.submit_my_formative_mission(
 p_cohort_id text,p_session_id text,p_evidence jsonb,p_version integer default 1
) returns text
language plpgsql security definer set search_path='' as $$
begin
 if not coalesce(private.can_open_learning(p_cohort_id,p_session_id,p_version),false) then
  raise exception 'Learning access denied' using errcode='42501';
 end if;
 if p_session_id not in ('s01','s02') or p_evidence is null
   or coalesce(jsonb_typeof(p_evidence),'') <> 'object'
   or coalesce(p_evidence->>'kind','') <> 'formative_client_simulation'
   or coalesce(p_evidence->>'status','') <> 'completed'
   or coalesce(p_evidence->>'sessionId','') <> p_session_id
   or coalesce(jsonb_typeof(p_evidence->'checks'),'') <> 'array'
   or octet_length(p_evidence::text)>8192 then
  raise exception 'Invalid formative evidence' using errcode='22023';
 end if;
 if jsonb_array_length(p_evidence->'checks') <> 4
   or exists(select 1 from jsonb_array_elements(p_evidence->'checks') item
    where jsonb_typeof(item) <> 'object' or item->'passed' is distinct from 'true'::jsonb)
 then
  raise exception 'Invalid formative evidence' using errcode='22023';
 end if;
 insert into public.cohort_learning_progress(user_id,cohort_id,session_id,activity_version,status,mission_evidence)
 values(auth.uid(),p_cohort_id,p_session_id,p_version,'completed',p_evidence)
 on conflict(user_id,cohort_id,session_id,activity_version) do update
  set status='completed',mission_evidence=excluded.mission_evidence,updated_at=now();
 return 'completed';
end; $$;
revoke all on function public.submit_my_formative_mission(text,text,jsonb,integer) from public,anon;
grant execute on function public.submit_my_formative_mission(text,text,jsonb,integer) to authenticated;

create or replace function public.mark_my_cohort_activity(p_cohort_id text,p_session_id text,p_event text,p_version integer default 1) returns text
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
 set status=case
  when public.cohort_learning_progress.status='completed' then 'completed'
  when public.cohort_learning_progress.status='attempted' then 'attempted'
  else excluded.status end,
 updated_at=case when public.cohort_learning_progress.status in ('completed','attempted')
  and excluded.status='visited' then public.cohort_learning_progress.updated_at else now() end
 returning status into result;
 return result;
end; $$;
revoke all on function public.mark_my_cohort_activity(text,text,text,integer) from public,anon;
grant execute on function public.mark_my_cohort_activity(text,text,text,integer) to authenticated;
commit;
