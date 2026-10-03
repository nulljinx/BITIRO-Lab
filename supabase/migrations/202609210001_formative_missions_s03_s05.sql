-- Extends formative client-simulator evidence from S01-S02 to S01-S05.
-- Same guarantees as 202609190002: access via can_open_learning, authenticated
-- only, SECURITY DEFINER with empty search_path, completed formative evidence
-- whose sessionId matches and whose checks are all passed. The check count is no
-- longer pinned to 4: any non-empty array of passed checks is accepted.
begin;
create or replace function public.submit_my_formative_mission(
 p_cohort_id text,p_session_id text,p_evidence jsonb,p_version integer default 1
) returns text
language plpgsql security definer set search_path='' as $$
begin
 if not coalesce(private.can_open_learning(p_cohort_id,p_session_id,p_version),false) then
  raise exception 'Learning access denied' using errcode='42501';
 end if;
 if p_session_id not in ('s01','s02','s03','s04','s05') or p_evidence is null
   or coalesce(jsonb_typeof(p_evidence),'') <> 'object'
   or coalesce(p_evidence->>'kind','') <> 'formative_client_simulation'
   or coalesce(p_evidence->>'status','') <> 'completed'
   or coalesce(p_evidence->>'sessionId','') <> p_session_id
   or coalesce(jsonb_typeof(p_evidence->'checks'),'') <> 'array'
   or octet_length(p_evidence::text)>8192 then
  raise exception 'Invalid formative evidence' using errcode='22023';
 end if;
 if jsonb_array_length(p_evidence->'checks') < 1
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
commit;
