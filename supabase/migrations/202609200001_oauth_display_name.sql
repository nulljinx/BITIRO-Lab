-- BITIRO Lab pilot: let identity-provider signups (Google OAuth) create their profile.
-- Google puts the name in given_name/name/full_name, never in display_name, so the previous trigger rejected the signup.
-- Forward-only replacement of private.create_account(). Roles still never come from raw_user_meta_data:
-- every new account is a participant with no site; staff/cohort access is granted only by server-side rules.
begin;

create or replace function private.create_account() returns trigger
language plpgsql security definer set search_path='' as $$
declare
 meta jsonb := coalesce(new.raw_user_meta_data,'{}'::jsonb);
 explicit_name text := btrim(meta->>'display_name');
 visible_name text;
begin
 if explicit_name is not null then
  -- A name supplied by the BITIRO form is still validated strictly.
  if char_length(explicit_name) not between 2 and 80 then
   raise exception 'A display name of 2–80 characters is required' using errcode='22023';
  end if;
  visible_name=explicit_name;
 else
  -- Provider identity: prefer the first name (data minimisation); the user can change it in their account page.
  visible_name=coalesce(
   nullif(btrim(meta->>'given_name'),''),
   nullif(split_part(btrim(coalesce(meta->>'name',meta->>'full_name','')),' ',1),''),
   'Participante');
  visible_name=btrim(left(visible_name,80));
  if char_length(visible_name)<2 then visible_name='Participante'; end if;
 end if;
 insert into public.profiles(id,display_name) values(new.id,visible_name);
 insert into public.memberships(user_id,site_id,role) values(new.id,null,'participant');
 return new;
end; $$;
revoke all on function private.create_account() from public;

commit;
