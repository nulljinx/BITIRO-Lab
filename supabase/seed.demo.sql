-- DEVELOPMENT / TEST ONLY.
-- Never run this file in production. It creates a demo cohort and known access codes.
insert into public.cohorts(id,organization_id,program_id,site_id,name) values
 ('mustakis-demo-talca','mustakis','mustakis-robotica-intermedia','talca','Robótica Intermedia · Grupo demo')
on conflict(id) do nothing;

insert into public.content_releases(cohort_id,session_id,released) values
 ('mustakis-demo-talca','s01',true),('mustakis-demo-talca','s02',true)
on conflict(cohort_id,session_id) do update set released=excluded.released;

insert into private.workspace_access_codes(code,cohort_id,role,label,max_uses,expires_at) values
 ('MUSTAKIS-ALUMNO-DEMO','mustakis-demo-talca','participant','Demo local alumno',1000,now()+interval '30 days'),
 ('MUSTAKIS-MENTOR-DEMO','mustakis-demo-talca','mentor','Demo local mentor',1,now()+interval '24 hours')
on conflict(code) do nothing;
