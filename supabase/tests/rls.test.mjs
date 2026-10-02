import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {listMigrations,latestMigration,migrationFunctions,publicFunctions,frontendRpcs,missingRpcs,rpcNames,compareMigrations} from '../../tools/migration-contract.mjs';

// PostgreSQL-engine integration test. Minimal auth shim, not a mocked policy evaluator.
// Supabase hosted Auth, email delivery and PostgREST are separate deployment checks.
const db=new PGlite();let checks=0;
const sqlFile=relative=>readFile(fileURLToPath(new URL(relative,import.meta.url)),'utf8');
await db.exec(`
 create role anon nologin; create role authenticated nologin;
 create schema auth;
 create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated;
`);
// REL-1: the migration set is discovered from supabase/migrations/, never listed by hand.
const migrations=await listMigrations();
for(const migration of migrations)await db.exec(await readFile(migration.path,'utf8'));
await db.exec(await sqlFile('../seed.sql'));
const productionCodes=await db.query('select count(*)::int as count from private.workspace_access_codes');
check(Number(productionCodes.rows[0].count)===0,'Production-safe seed contains no institutional access codes');
await db.exec(await sqlFile('../seed.demo.sql'));
const ids={a:'00000000-0000-4000-8000-000000000001',b:'00000000-0000-4000-8000-000000000002',f:'00000000-0000-4000-8000-000000000003',admin:'00000000-0000-4000-8000-000000000004',peer:'00000000-0000-4000-8000-000000000005'};
async function context(role,user,operation){await db.exec(`set role ${role}`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);try{return await operation();}finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");}}
const user=(id,sql,params=[])=>context('authenticated',id,()=>db.query(sql,params));
function check(condition,label){assert.ok(condition,label);checks++;console.log(`PASS ${label}`);}
async function rejects(promise,label,code){await assert.rejects(promise,error=>!code||error.code===code,label);checks++;console.log(`PASS ${label}`);}
// REL-1 contract gate: static, derived from the repository.
{
 const defined=await migrationFunctions(migrations),used=await frontendRpcs();
 check(migrations.length>0&&latestMigration(migrations)===migrations.at(-1).version,`Discovered ${migrations.length} migrations; latest ${latestMigration(migrations)}`);
 check(used.size>0,`Found ${used.size} literal RPC names in src/features`);
 const missing=missingRpcs(used,defined);
 check(missing.length===0,`Every frontend RPC is defined in migrations${missing.length?` (missing: ${missing.join(', ')})`:''}`);
 // Negative controls on synthetic input: the gate must fail for unknown and removed RPCs.
 check(missingRpcs(new Map([['no_such_rpc',[]]]),defined).join()==='no_such_rpc','Gate flags a frontend RPC that no migration defines');
 const [victim]=[...used.keys()];
 const without=publicFunctions([...await Promise.all(migrations.map(m=>readFile(m.path,'utf8'))),`drop function if exists public.${victim}(text);`]);
 check(missingRpcs(used,without).includes(victim),'Gate flags a used RPC removed from the SQL');
 check(!publicFunctions(['create function private.helper() returns int language sql as $$select 1$$;']).has('helper'),'Private functions are not part of the public contract');
 check(rpcNames("supabase.rpc('a_b',{x:1}); client\n.rpc( \"c_d\" )").join()==='a_b,c_d','RPC literal extraction handles quotes and spacing');
 const drift=compareMigrations(migrations.map(m=>m.version),migrations.slice(0,-2).map(m=>({version:m.version})));
 check(drift.missingLive.length===2&&drift.extraLive.length===0,'Parity comparison reports missing-live versions');
 check(compareMigrations(['1'],[{version:'1'},{version:'2'}]).extraLive.join()==='2','Parity comparison reports extra-live versions');
 // Parity checker end to end against simulated live responses (offline: --live-file, no credentials, no network).
 {
  const dir=mkdtempSync(join(tmpdir(),'bitiro-parity-')),names=[...used.keys()];
  const fixture=(file,fns)=>{const p=join(dir,file);writeFileSync(p,JSON.stringify({migrations:migrations.map(m=>({version:m.version,name:m.name})),functions:fns.map(proname=>({proname}))}));return p;};
  const run=(...argv)=>spawnSync(process.execPath,['tools/check-migration-parity.mjs',...argv],{cwd:fileURLToPath(new URL('../../',import.meta.url)),encoding:'utf8',env:{...process.env,SUPABASE_ACCESS_TOKEN:'',SUPABASE_PROJECT_REF:'',BITIRO_PARITY_MODE:''}});
  try{
   const ok=run('--live-file',fixture('ok.json',[...names,'unrelated_fn']));
   check(ok.status===0&&ok.stdout.includes('RPC contract OK'),'Parity checker: all RPCs present live is OK');
   const bad=fixture('bad.json',names.slice(1)),enforced=run('--live-file',bad);
   check(enforced.status===1&&enforced.stdout.includes(`MISSING LIVE (rpc): ${names[0]}`),'Parity checker: missing live RPC fails in enforcement mode');
   const report=run('--live-file',bad,'--report-only');
   check(report.status===0&&report.stdout.includes('MISSING LIVE (rpc)'),'Parity checker: missing live RPC is reported but exits 0 in report-only');
   const none=run();
   check(none.status===0&&none.stdout.includes('NOT CONFIGURED'),'Parity checker: no credentials reports NOT CONFIGURED safely');
  }finally{rmSync(dir,{recursive:true,force:true});}
 }
}
try {
 for(const [name,id] of Object.entries(ids))await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,JSON.stringify({display_name:`Persona ${name}`,role:'admin',requested_role:'admin'})]);
 await db.query("update public.memberships set site_id='recoleta' where user_id in ($1,$2,$3,$4)",[ids.a,ids.f,ids.admin,ids.peer]);
 await db.query("update public.memberships set site_id='talca' where user_id=$1",[ids.b]);
 const original=await db.query('select distinct role from public.memberships');check(original.rows.length===1&&original.rows[0].role==='participant','Signup metadata cannot elevate roles');
 await db.query("update public.memberships set role='facilitator' where user_id=$1",[ids.f]);
 await db.query("update public.memberships set role='admin' where user_id=$1",[ids.admin]);
 const sites=await context('anon',null,()=>db.query('select * from public.sites'));check(sites.rows.length===8,'Anonymous users can list eight registration sites');
 await rejects(context('anon',null,()=>db.query('select * from public.profiles')),'Anonymous profile access denied','42501');
 check((await user(ids.a,'select * from public.profiles')).rows.length===1,'Participant reads own profile only');
 check((await user(ids.f,'select * from public.profiles')).rows.length===4,'Facilitator reads own site only');
 check((await user(ids.admin,'select * from public.profiles')).rows.length===5,'Global admin reads all sites');
 const listing=async(id,limit=25,offset=0,query='',site=null)=>(await user(id,'select public.list_visible_members($1,$2,$3,$4) as page',[limit,offset,query,site])).rows[0].page;
 const first=await listing(ids.admin,2),second=await listing(ids.admin,2,2);
 check(first.total===5&&first.members.length===2&&second.members.length===2&&!first.members.some(a=>second.members.some(b=>a.profile.id===b.profile.id)),'Pagination returns stable disjoint pages and total');
 check((await listing(ids.f,25,0,'','talca')).total===0,'Cross-site pagination filter cannot bypass facilitator RLS');
 check((await listing(ids.a)).total===1,'Participant listing stays owner-scoped');
 check((await listing(ids.admin,25,0,"' OR 1=1 --")).total===0,'Search treats SQL syntax as literal text');
 await rejects(context('anon',null,()=>db.query('select public.list_visible_members()')),'Anonymous listing RPC denied','42501');
 await rejects(user(ids.a,"update public.memberships set role='admin' where user_id=$1",[ids.a]),'Participant cannot directly modify membership','42501');
 await rejects(user(ids.a,'select public.admin_update_membership($1,$2,$3)',[ids.a,'talca','admin']),'Participant cannot call admin role RPC','42501');
 await rejects(user(ids.f,'select public.admin_update_membership($1,$2,$3)',[ids.a,'recoleta','facilitator']),'Facilitator cannot grant roles','42501');
 await user(ids.a,"insert into public.code_documents(user_id,session_id,source,revision) values($1,'s01','void setup(){} void loop(){}',999)",[ids.a]);
 await user(ids.b,"insert into public.code_documents(user_id,session_id,source) values($1,'s01','// other site')",[ids.b]);
 check((await user(ids.a,'select * from public.code_documents')).rows.length===1,'Participant reads only own code');
 const own=(await user(ids.a,'select * from public.code_documents')).rows[0];check(own.revision===1,'Database controls initial code revision');
 check((await user(ids.f,'select * from public.code_documents')).rows.length===1,'Facilitator cannot read code from another site');
 await rejects(user(ids.a,"insert into public.code_documents(user_id,session_id,source) values($1,'s02','hack')",[ids.b]),'Cannot forge code owner','42501');
 check((await user(ids.a,"update public.code_documents set source='hack' where user_id=$1 returning *",[ids.b])).rows.length===0,'Cannot overwrite another participant code');
 await user(ids.a,"update public.code_documents set source='// saved',revision=500 where user_id=$1 and revision=1",[ids.a]);
 check((await user(ids.a,'select revision from public.code_documents')).rows[0].revision===2,'Database increments revision instead of trusting client');
 check((await user(ids.a,"update public.code_documents set source='// stale' where user_id=$1 and revision=1 returning *",[ids.a])).rows.length===0,'Compare-and-swap prevents stale overwrites');
 await rejects(user(ids.a,"update public.code_documents set source=$1 where user_id=$2",['x'.repeat(32769),ids.a]),'Database enforces source byte limit','23514');
 await user(ids.a,"insert into public.program_progress(user_id,session_id,status) values($1,'s01','completed')",[ids.a]);
 await rejects(user(ids.a,"insert into public.program_progress(user_id,session_id,status) values($1,'s02','verified')",[ids.a]),'Verified completion is not a client status','23514');
 await rejects(user(ids.a,"insert into public.program_progress(user_id,session_id,status) values($1,'s02','completed')",[ids.b]),'Cannot forge someone else progress','42501');
 await user(ids.a,'select public.update_my_profile($1)',['Nombre nuevo']);
 check((await user(ids.a,'select display_name from public.profiles')).rows[0].display_name==='Nombre nuevo','Participant can change own visible name');
 await rejects(user(ids.admin,'select public.admin_update_membership($1,$2,$3)',[ids.admin,'recoleta','participant']),'Last admin cannot self-demote','42501');
 await user(ids.admin,'select public.admin_update_membership($1,$2,$3)',[ids.a,'talca','facilitator']);
 check((await user(ids.f,'select * from public.profiles where id=$1',[ids.a])).rows.length===0,'Site reassignment removes previous facilitator access immediately');
 const audit=await user(ids.admin,'select * from public.membership_audit where actor_id=$1 and subject_id=$2',[ids.admin,ids.a]);check(audit.rows.length===1,'Admin role/site changes are audited');
 check((await user(ids.b,'select * from public.membership_audit')).rows.length===0,'Participant cannot read admin audit');
 await rejects(user(ids.admin,'delete from public.membership_audit'),'Admin cannot erase audit through client API','42501');

 // Institution workspace access: code redemption, release gating and mentor controls.
 const beforeWorkspace=await user(ids.a,'select public.list_my_workspaces() as spaces');
 check(beforeWorkspace.rows[0].spaces.length===0,'BITIRO account starts without institutional spaces');
 const joinedResult=(await user(ids.a,'select public.redeem_workspace_code($1) as result',['MUSTAKIS-ALUMNO-DEMO'])).rows[0].result;
 check(joinedResult.ok===true&&joinedResult.workspace.organization_id==='mustakis'&&joinedResult.workspace.role==='participant','Participant code joins Mustakis workspace without changing platform role');
 const joined=joinedResult.workspace;
 const participantSessions=(await user(ids.a,'select public.list_workspace_sessions($1) as sessions',['mustakis-demo-talca'])).rows[0].sessions;
 check(participantSessions.find(item=>item.session_id==='s01').released===true&&participantSessions.find(item=>item.session_id==='s02').released===true,'Workspace exposes only mentor-released sessions');
 await rejects(user(ids.a,'select public.mentor_set_session_release($1,$2,$3)',['mustakis-demo-talca','s03',true]),'Participant cannot release institutional content','42501');
 // Cohort learning data is RPC-only and must remain separated from legacy user+session tables.
 await rejects(user(ids.a,'select * from public.cohort_code_documents'),'Direct browser access to cohort code is denied','42501');
 await rejects(user(ids.a,'select * from public.cohort_learning_progress'),'Direct browser access to cohort progress is denied','42501');
 await rejects(context('anon',null,()=>db.query("select public.get_my_cohort_learning('mustakis-demo-talca','s01',1)")),'Anonymous cloud learning read is denied','42501');
 await rejects(user(ids.b,"select public.get_my_cohort_learning('mustakis-demo-talca','s01',1)"),'Unjoined account cannot read a cohort document','42501');
 const emptyLearning=(await user(ids.a,"select public.get_my_cohort_learning('mustakis-demo-talca','s01',1) as result")).rows[0].result;
 check(emptyLearning.document===null&&emptyLearning.progress===null,'New participant has no server document or activity');
 const cloudSaved=(await user(ids.a,"select public.save_my_cohort_code('mustakis-demo-talca','s01','// A',0,1) as result")).rows[0].result;
 check(cloudSaved.ok===true&&cloudSaved.revision===1,'Participant saves code to own cohort with revision 1');
 const stale=(await user(ids.a,"select public.save_my_cohort_code('mustakis-demo-talca','s01','// stale',0,1) as result")).rows[0].result;
 check(stale.ok===false,'Concurrent first writes return a conflict');
 const updated=(await user(ids.a,"select public.save_my_cohort_code('mustakis-demo-talca','s01','// A2',1,1) as result")).rows[0].result;
 check(updated.ok===true&&updated.revision===2,'Compare-and-swap prevents lost updates');
 const versionTwo=(await user(ids.a,"select public.save_my_cohort_code('mustakis-demo-talca','s01','// version2',0,2) as result")).rows[0].result;
 check(versionTwo.ok===true&&versionTwo.revision===1,'Activity versions have separate code documents');
 await rejects(user(ids.a,"select public.save_my_cohort_code('mustakis-demo-talca','s01',$1,0,1)",['x'.repeat(32769)]),'Cohort code enforces 32KiB source limit','22023');
 await rejects(user(ids.a,"select public.save_my_cohort_code('mustakis-demo-talca','s04','// locked',0,1)"),'Unreleased session rejects participant code writes','42501');
 await rejects(user(ids.a,"select public.mark_my_cohort_activity('mustakis-demo-talca','s01','completed',1)"),'Browser cannot claim task completion','22023');
 const visited=(await user(ids.a,"select public.mark_my_cohort_activity('mustakis-demo-talca','s01','visited',1) as status")).rows[0].status;
 check(visited==='visited','Visit is recorded when participant opens a released activity');
 const attempted=(await user(ids.a,"select public.mark_my_cohort_activity('mustakis-demo-talca','s01','attempted',1) as status")).rows[0].status;
 check(attempted==='attempted','Execution attempt becomes an attempted state');
 const monotonic=(await user(ids.a,"select public.mark_my_cohort_activity('mustakis-demo-talca','s01','visited',1) as status")).rows[0].status;
 check(monotonic==='attempted','Subsequent visits never downgrade attempted progress');
 await rejects(context('anon',null,()=>db.query("select public.submit_my_formative_mission('mustakis-demo-talca','s01','{}'::jsonb,1)")),'Anonymous users cannot submit formative missions','42501');
 await rejects(user(ids.a,"select public.submit_my_formative_mission('mustakis-demo-talca','s01','{}'::jsonb,1)"),'Malformed formative evidence is rejected','22023');
 const evidence={sessionId:'s01',status:'completed',kind:'formative_client_simulation',checks:[{key:'decision',passed:true},{key:'line',passed:true},{key:'obstacle',passed:true},{key:'finish',passed:true}]};
 await rejects(user(ids.b,'select public.submit_my_formative_mission($1,$2,$3::jsonb,$4)',['mustakis-demo-talca','s01',JSON.stringify(evidence),1]),'Unjoined account cannot submit a mission in another cohort','42501');
 check((await user(ids.a,'select public.submit_my_formative_mission($1,$2,$3::jsonb,$4) as state',['mustakis-demo-talca','s01',JSON.stringify(evidence),1])).rows[0].state==='completed','Released mission stores formative simulation result in the user cohort only');
 check((await user(ids.a,"select public.mark_my_cohort_activity('mustakis-demo-talca','s01','visited',1) as state")).rows[0].state==='completed','Opening a completed mission does not downgrade formative progress');

 await rejects(user(ids.a,"select public.mentor_cohort_learning('mustakis-demo-talca',1)"),'Participant cannot access mentor learning summary','42501');
 await rejects(user(ids.a,"select public.get_my_cohort_learning('mustakis-demo-talca','s01',null)"),'Null version does not bypass authorization','42501');
 const mentorJoin=(await user(ids.f,'select public.redeem_workspace_code($1) as result',['MUSTAKIS-MENTOR-DEMO'])).rows[0].result;
 check(mentorJoin.ok===true&&mentorJoin.workspace.role==='mentor','Single-use demo mentor code grants mentor only inside its cohort');
 const mentorSessions=(await user(ids.f,'select public.list_workspace_sessions($1) as sessions',['mustakis-demo-talca'])).rows[0].sessions;
 check(mentorSessions.every(item=>item.can_manage===true),'Mentor receives content-management capability for own cohort');
 const mentorLearning=(await user(ids.f,"select public.mentor_cohort_learning('mustakis-demo-talca',1) as result")).rows[0].result;
 check(mentorLearning.some(row=>row.user_id===ids.a&&row.session_id==='s01'&&row.status==='completed')&&!JSON.stringify(mentorLearning).includes('// A2'),'Mentor sees cohort-specific activity but never participant source');
 const mentorOwn=(await user(ids.f,"select public.get_my_cohort_learning('mustakis-demo-talca','s01',1) as result")).rows[0].result;
 check(mentorOwn.document===null,'Mentor cannot read participant source through own-document RPC');
 await user(ids.f,"select public.mentor_set_session_release('mustakis-demo-talca','s02',false)");
 await rejects(user(ids.a,"select public.get_my_cohort_learning('mustakis-demo-talca','s02',1)"),'Hidden session denies participant cloud reads','42501');
 await rejects(user(ids.a,"select public.mark_my_cohort_activity('mustakis-demo-talca','s02','visited',1)"),'Hidden session denies participant progress writes','42501');
 await user(ids.f,"select public.mentor_set_session_release('mustakis-demo-talca','s02',true)");


 await rejects(user(ids.a,'select public.mentor_create_participant_invite($1,$2,$3)',['mustakis-demo-talca',5,14]),'Participant cannot create cohort invite','42501');
 const participantInvite=(await user(ids.f,'select public.mentor_create_participant_invite($1,$2,$3) as invite',['mustakis-demo-talca',5,14])).rows[0].invite;
 check(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(participantInvite.code)&&participantInvite.max_uses===5&&participantInvite.remaining_uses===5,'Mentor creates a scoped participant invite without database-console access');
 const activeInvite=(await user(ids.f,'select public.mentor_get_participant_invite($1) as invite',['mustakis-demo-talca'])).rows[0].invite;
 check(activeInvite.code===participantInvite.code,'Mentor can recover the currently active participant invite');
 const peerJoin=(await user(ids.peer,'select public.redeem_workspace_code($1) as result',[participantInvite.code])).rows[0].result;
 check(peerJoin.ok===true&&peerJoin.workspace.role==='participant'&&peerJoin.workspace.cohort_id==='mustakis-demo-talca','Generated participant invite joins the intended cohort as participant');
 const peerDoc=(await user(ids.peer,"select public.get_my_cohort_learning('mustakis-demo-talca','s01',1) as result")).rows[0].result;
 check(peerDoc.document===null,'A second participant in the same cohort cannot read the first participant source');

 const roster=(await user(ids.f,'select public.mentor_list_participants($1) as participants',['mustakis-demo-talca'])).rows[0].participants;
 check(roster.length===2&&roster.every(item=>item.display_name)&&roster.some(item=>item.user_id===ids.peer),'Mentor roster lists active participants without exposing unrelated users');
 await rejects(user(ids.a,'select public.mentor_list_participants($1)',['mustakis-demo-talca']),'Participant cannot list cohort participants','42501');
 await user(ids.f,'select public.mentor_revoke_participant_invite($1)',['mustakis-demo-talca']);
 const revokedInvite=(await user(ids.f,'select public.mentor_get_participant_invite($1) as invite',['mustakis-demo-talca'])).rows[0].invite;
 check(revokedInvite===null,'Revoked participant invite is no longer returned as active');
 const revokedUse=(await user(ids.admin,'select public.redeem_workspace_code($1) as result',[participantInvite.code])).rows[0].result;
 check(revokedUse.ok===false,'Revoked participant invite cannot add a new member');
 await user(ids.f,'select public.mentor_set_session_release($1,$2,$3)',['mustakis-demo-talca','s03',true]);
 const afterRelease=(await user(ids.a,'select public.list_workspace_sessions($1) as sessions',['mustakis-demo-talca'])).rows[0].sessions;
 check(afterRelease.find(item=>item.session_id==='s03').released===true,'Mentor release becomes visible to participants in the cohort');
 check((await user(ids.b,'select public.list_my_workspaces() as spaces')).rows[0].spaces.length===0,'Unjoined account cannot see institutional workspace');
 await rejects(user(ids.b,'select public.list_workspace_sessions($1)',['mustakis-demo-talca']),'Unjoined account cannot query cohort releases','42501');

 // Invalid-code attempts persist because expected failures return a generic result instead of rolling back.
 for(let i=0;i<10;i++){
  const invalid=(await user(ids.b,'select public.redeem_workspace_code($1) as result',[`INVALID-${String(i).padStart(4,'0')}`])).rows[0].result;
  check(invalid.ok===false,'Invalid institutional code consumes rate-limit budget');
 }
 const blocked=(await user(ids.b,'select public.redeem_workspace_code($1) as result',['MUSTAKIS-ALUMNO-DEMO'])).rows[0].result;
 check(blocked.ok===false,'Eleventh redemption attempt is blocked by the persisted budget');
 const attemptCount=await db.query('select count(*)::int as count from private.workspace_code_attempts where user_id=$1',[ids.b]);
 check(Number(attemptCount.rows[0].count)===10,'Invalid access-code attempts remain committed');

 // Administrative suspension cannot be lifted by a shared code and revokes direct API access.
 await db.query("update public.organization_memberships set active=false where user_id=$1 and organization_id='mustakis'",[ids.a]);
 await rejects(user(ids.a,"select public.get_my_cohort_learning('mustakis-demo-talca','s01',1)"),'Suspended organization membership revokes code access','42501');
 await rejects(user(ids.a,'select public.list_workspace_sessions($1)',['mustakis-demo-talca']),'Inactive organization membership revokes cohort reads','42501');
 const suspendedRedeem=(await user(ids.a,'select public.redeem_workspace_code($1) as result',['MUSTAKIS-ALUMNO-DEMO'])).rows[0].result;
 check(suspendedRedeem.ok===false,'Shared code cannot reactivate an administratively suspended member');
 await db.query("update public.organization_memberships set active=true where user_id=$1 and organization_id='mustakis'",[ids.a]);

 await db.query("update public.cohort_memberships set active=false where user_id=$1 and cohort_id='mustakis-demo-talca'",[ids.a]);
 await rejects(user(ids.a,"select public.save_my_cohort_code('mustakis-demo-talca','s01','// suspended',2,1)"),'Suspended cohort membership revokes code writes','42501');
 await rejects(user(ids.a,'select public.list_workspace_sessions($1)',['mustakis-demo-talca']),'Inactive cohort membership revokes cohort reads','42501');
 const cohortSuspended=(await user(ids.a,'select public.redeem_workspace_code($1) as result',['MUSTAKIS-ALUMNO-DEMO'])).rows[0].result;
 check(cohortSuspended.ok===false,'Shared code cannot reactivate a suspended cohort membership');
 await db.query("update public.cohort_memberships set active=true where user_id=$1 and cohort_id='mustakis-demo-talca'",[ids.a]);

 // Mentor capability is cohort-specific: mentor in A, participant in B.
 await db.query("insert into public.cohorts(id,organization_id,program_id,site_id,name) values('mustakis-demo-talca-b','mustakis','mustakis-robotica-intermedia','talca','Grupo B')");
 await db.query("insert into public.cohort_memberships(user_id,cohort_id,role,active) values($1,'mustakis-demo-talca-b','participant',true)",[ids.f]);
 const mentorSpaces=(await user(ids.f,'select public.list_my_workspaces() as spaces')).rows[0].spaces;
 const groupA=mentorSpaces.find(item=>item.cohort_id==='mustakis-demo-talca');
 const groupB=mentorSpaces.find(item=>item.cohort_id==='mustakis-demo-talca-b');
 check(groupA.role==='mentor'&&groupA.can_manage===true,'Mentor capability is returned for the managed cohort');
 check(groupB.role==='participant'&&groupB.can_manage===false,'Mentor role does not leak into another cohort');
 await rejects(user(ids.f,"select public.save_my_cohort_code('mustakis-demo-talca-b','s01','// B',0,1)"),'Member cannot save to unreleased second cohort','42501');
 await db.query("insert into public.content_releases(cohort_id,session_id,released) values('mustakis-demo-talca-b','s01',true)");
 const crossDoc=(await user(ids.f,"select public.get_my_cohort_learning('mustakis-demo-talca-b','s01',1) as result")).rows[0].result;
 check(crossDoc.document===null,'Second cohort does not reuse code from the first cohort');
 const groupBSessions=(await user(ids.f,'select public.list_workspace_sessions($1) as sessions',['mustakis-demo-talca-b'])).rows[0].sessions;
 check(groupBSessions.every(item=>item.can_manage===false),'Participant view of second cohort has no mentor capability');
 const overview=(await user(ids.f,'select public.mentor_workspace_overview($1) as overview',['mustakis-demo-talca'])).rows[0].overview;
 check(overview.participant_count===2&&overview.mentor_count===1&&overview.released_count===3,'Mentor overview counts active cohort members and published sessions');
 await rejects(user(ids.a,'select public.mentor_workspace_overview($1)',['mustakis-demo-talca']),'Participant cannot read mentor cohort overview','42501');
 await rejects(user(ids.f,'select public.mentor_set_session_release($1,$2,$3)',['mustakis-demo-talca-b','s01',true]),'Mentor in cohort A cannot manage cohort B','42501');

 await rejects(user(ids.a,"select * from public.content_releases"),'Participant cannot bypass RPC with direct release-table access','42501');
 console.log(`\n${checks} PostgreSQL/RLS integration checks passed.`);
} finally {await db.close();}
