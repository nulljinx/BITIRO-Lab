-- SEC-1: mentor reference solutions are served from the database, never shipped in the frontend bundle.
-- Forward-only. NOT applied to production by the repository work.
-- This repository is PUBLIC: the table is created EMPTY. No solution content exists in migrations, seeds or tests.
-- No content hash column: convert_to() is not immutable, so it cannot be a generated column. The loader prints the hash.
-- Solutions are loaded out of band with tools/load-mentor-solutions.mjs (reads BITIRO_SOLUTIONS_DIR).
--
-- VERSION PARITY (do not repeat the formative_missions_s03_s05 mismatch): release-meta writes this file's version
-- (20261003130000) into dist/version.json as requiredMigration, and tools/verify-release.mjs compares it offline.
--  * `supabase db push` keeps this version: nothing to change.
--  * If it is applied through an API/MCP that assigns a DIFFERENT remote timestamp, BEFORE deploying rename this file to
--    the exact remote version and rebuild (requiredMigration follows the latest local file), then confirm with
--    `node tools/check-migration-parity.mjs` against the live project.
begin;

create table private.mentor_solutions (
 session_id text primary key check (session_id ~ '^s0[1-8]$'),
 title text not null,
 note text not null default '',
 source text not null,
 revision integer not null default 1,
 updated_at timestamptz not null default now()
);
-- RPC-only: RLS on, no policies, no direct grants for browser roles.
alter table private.mentor_solutions enable row level security;
revoke all on private.mentor_solutions from public,anon,authenticated;

-- One 42501 covers "cohort missing", "cohort inactive" and "no permission", so existence is not disclosed.
-- Platform admins pass private.can_manage_cohort for ANY id, hence the explicit active-cohort check.
create function public.mentor_get_solution(p_cohort_id text,p_session_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare solution record;
begin
 if auth.uid() is null then raise exception 'Mentor permission required' using errcode='42501'; end if;
 if p_session_id is null or p_session_id !~ '^s0[1-8]$' then raise exception 'Invalid session' using errcode='22023'; end if;
 if p_cohort_id is null
  or not exists(select 1 from public.cohorts c where c.id=p_cohort_id and c.active)
  or not private.can_manage_cohort(p_cohort_id)
 then raise exception 'Mentor permission required' using errcode='42501'; end if;
 select s.session_id,s.title,s.note,s.source,s.revision into solution from private.mentor_solutions s where s.session_id=p_session_id;
 if not found then raise exception 'Solution not available' using errcode='P0002'; end if;
 return jsonb_build_object('session_id',solution.session_id,'title',solution.title,'note',solution.note,'source',solution.source,'revision',solution.revision);
end $$;

revoke all on function public.mentor_get_solution(text,text) from public,anon;
grant execute on function public.mentor_get_solution(text,text) to authenticated;

commit;
