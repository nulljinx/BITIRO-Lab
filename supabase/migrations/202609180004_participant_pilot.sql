-- BITIRO Lab 6.4.2: mentor-managed participant invites and cohort roster.
-- Mentors can issue one active participant code per cohort without database-console access.
begin;

create or replace function private.new_workspace_participant_code() returns text
language plpgsql volatile security definer set search_path='' as $$
declare
 raw text;
 candidate text;
begin
 loop
  raw=upper(replace(gen_random_uuid()::text,'-',''));
  candidate=substr(raw,1,4)||'-'||substr(raw,5,4)||'-'||substr(raw,9,4);
  exit when not exists(select 1 from private.workspace_access_codes where code=candidate);
 end loop;
 return candidate;
end; $$;
revoke all on function private.new_workspace_participant_code() from public,anon,authenticated;

create or replace function public.mentor_get_participant_invite(p_cohort_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 invite private.workspace_access_codes%rowtype;
begin
 if auth.uid() is null or not private.can_manage_cohort(p_cohort_id) then
  raise exception 'Mentor permission required' using errcode='42501';
 end if;

 select * into invite
 from private.workspace_access_codes
 where cohort_id=p_cohort_id
   and role='participant'
   and active
   and (expires_at is null or expires_at>now())
   and (max_uses is null or uses<max_uses)
 order by created_at desc
 limit 1;

 if not found then return null; end if;
 return jsonb_build_object(
  'code',invite.code,
  'max_uses',invite.max_uses,
  'uses',invite.uses,
  'expires_at',invite.expires_at,
  'remaining_uses',case when invite.max_uses is null then null else greatest(invite.max_uses-invite.uses,0) end
 );
end; $$;
revoke all on function public.mentor_get_participant_invite(text) from public,anon;
grant execute on function public.mentor_get_participant_invite(text) to authenticated;

create or replace function public.mentor_create_participant_invite(
 p_cohort_id text,
 p_max_uses integer default 40,
 p_valid_days integer default 14
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 new_code text;
 expiry timestamptz;
 org_id text;
begin
 if auth.uid() is null or not private.can_manage_cohort(p_cohort_id) then
  raise exception 'Mentor permission required' using errcode='42501';
 end if;
 if p_max_uses is null or p_max_uses not between 1 and 200 then
  raise exception 'Invalid max uses' using errcode='22023';
 end if;
 if p_valid_days is null or p_valid_days not between 1 and 60 then
  raise exception 'Invalid validity' using errcode='22023';
 end if;

 perform pg_advisory_xact_lock(hashtext('bitiro-participant-invite:'||p_cohort_id));
 select organization_id into org_id from public.cohorts where id=p_cohort_id and active;
 if org_id is null then raise exception 'Cohort unavailable' using errcode='22023'; end if;

 update private.workspace_access_codes
 set active=false
 where cohort_id=p_cohort_id and role='participant' and active;

 new_code=private.new_workspace_participant_code();
 expiry=now()+make_interval(days=>p_valid_days);
 insert into private.workspace_access_codes(code,cohort_id,role,label,active,expires_at,max_uses,uses)
 values(new_code,p_cohort_id,'participant','Código de participantes generado por mentor',true,expiry,p_max_uses,0);

 insert into public.institution_audit_events(actor_id,organization_id,cohort_id,event_type,details)
 values(auth.uid(),org_id,p_cohort_id,'participant_invite_created',jsonb_build_object('max_uses',p_max_uses,'valid_days',p_valid_days));

 return jsonb_build_object(
  'code',new_code,
  'max_uses',p_max_uses,
  'uses',0,
  'expires_at',expiry,
  'remaining_uses',p_max_uses
 );
end; $$;
revoke all on function public.mentor_create_participant_invite(text,integer,integer) from public,anon;
grant execute on function public.mentor_create_participant_invite(text,integer,integer) to authenticated;

create or replace function public.mentor_revoke_participant_invite(p_cohort_id text) returns void
language plpgsql security definer set search_path='' as $$
declare
 org_id text;
 revoked integer;
begin
 if auth.uid() is null or not private.can_manage_cohort(p_cohort_id) then
  raise exception 'Mentor permission required' using errcode='42501';
 end if;
 select organization_id into org_id from public.cohorts where id=p_cohort_id and active;
 if org_id is null then raise exception 'Cohort unavailable' using errcode='22023'; end if;

 update private.workspace_access_codes
 set active=false
 where cohort_id=p_cohort_id and role='participant' and active;
 get diagnostics revoked=row_count;

 insert into public.institution_audit_events(actor_id,organization_id,cohort_id,event_type,details)
 values(auth.uid(),org_id,p_cohort_id,'participant_invite_revoked',jsonb_build_object('revoked_codes',revoked));
end; $$;
revoke all on function public.mentor_revoke_participant_invite(text) from public,anon;
grant execute on function public.mentor_revoke_participant_invite(text) to authenticated;

create or replace function public.mentor_list_participants(p_cohort_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 result jsonb;
begin
 if auth.uid() is null or not private.can_manage_cohort(p_cohort_id) then
  raise exception 'Mentor permission required' using errcode='42501';
 end if;

 select coalesce(jsonb_agg(jsonb_build_object(
   'user_id',cm.user_id,
   'display_name',p.display_name,
   'joined_at',cm.joined_at
  ) order by lower(p.display_name),cm.joined_at),'[]'::jsonb)
 into result
 from public.cohort_memberships cm
 join public.profiles p on p.id=cm.user_id
 join public.cohorts c on c.id=cm.cohort_id and c.active
 join public.organization_memberships om on om.user_id=cm.user_id and om.organization_id=c.organization_id and om.active
 where cm.cohort_id=p_cohort_id and cm.active and cm.role='participant';

 return result;
end; $$;
revoke all on function public.mentor_list_participants(text) from public,anon;
grant execute on function public.mentor_list_participants(text) to authenticated;

commit;
