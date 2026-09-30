-- BITIRO Lab 6.4: mentor workspace summary for cohort-aware institutional UX.
begin;

create or replace function public.mentor_workspace_overview(p_cohort_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 participant_count integer;
 mentor_count integer;
 released_count integer;
begin
 if auth.uid() is null or not private.can_manage_cohort(p_cohort_id) then
  raise exception 'Mentor permission required' using errcode='42501';
 end if;

 select count(*) filter(where role='participant'), count(*) filter(where role='mentor')
 into participant_count,mentor_count
 from public.cohort_memberships
 where cohort_id=p_cohort_id and active;

 select count(*) into released_count
 from public.content_releases
 where cohort_id=p_cohort_id and released;

 return jsonb_build_object(
  'participant_count',coalesce(participant_count,0),
  'mentor_count',coalesce(mentor_count,0),
  'released_count',coalesce(released_count,0)
 );
end; $$;
revoke all on function public.mentor_workspace_overview(text) from public,anon;
grant execute on function public.mentor_workspace_overview(text) to authenticated;

commit;
