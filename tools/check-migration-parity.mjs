// REL-1: repo/live migration parity and RPC contract. Read-only; never applies or changes anything.
//
// Live access (Supabase Management API), enabled only when BOTH env vars are present:
//   SUPABASE_ACCESS_TOKEN  future secret: must be a fine-grained/scoped PAT limited to this project with
//                          read permissions for Database and Database Migrations. Never a classic PAT.
//   SUPABASE_PROJECT_REF
// Requests made (nothing else is ever called):
//   GET  /v1/projects/{ref}/database/migrations         applied migration history
//   POST /v1/projects/{ref}/database/query/read-only    SQL runs as supabase_read_only_user (a SELECT on pg_proc)
// The regular SQL endpoint (/database/query) and all migration write endpoints are deliberately not used.
//
// Flags: --report-only (report drift but exit 0; also BITIRO_PARITY_MODE=report-only)
//        --live-file <json>  offline fixture: array of {version} (legacy) or
//                            {migrations:[{version,name}], functions:[{proname}]} (simulated pg_proc rows)
//        --require-configured  exit 1 when credentials are missing
import {readFile} from 'node:fs/promises';
import {listMigrations,compareMigrations,frontendRpcs,missingRpcs} from './migration-contract.mjs';

const args=process.argv.slice(2);
const flag=n=>args.includes(n);
const reportOnly=flag('--report-only')||process.env.BITIRO_PARITY_MODE==='report-only';
const liveFile=flag('--live-file')?args[args.indexOf('--live-file')+1]:null;
const token=process.env.SUPABASE_ACCESS_TOKEN,ref=process.env.SUPABASE_PROJECT_REF;
const API='https://api.supabase.com/v1/projects';
const FUNCTIONS_SQL=`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' group by p.proname order by p.proname`;

const exit=drift=>process.exit(drift&&!reportOnly?1:0);
async function api(path,init={}){
 const res=await fetch(`${API}/${ref}${path}`,{...init,headers:{Authorization:`Bearer ${token}`,Accept:'application/json','Content-Type':'application/json'}});
 if(!res.ok)throw new Error(`Management API ${path} responded ${res.status}`);
 return res.json();
}
async function fetchLive(){
 if(liveFile){
  const data=JSON.parse(await readFile(liveFile,'utf8'));
  return Array.isArray(data)?{migrations:data,functions:null}:{migrations:data.migrations,functions:data.functions??null};
 }
 if(!token||!ref)return null;
 if(!/^[a-z0-9]{10,40}$/.test(ref))throw new Error('SUPABASE_PROJECT_REF has an unexpected format');
 const migrations=await api('/database/migrations');
 const functions=await api('/database/query/read-only',{method:'POST',body:JSON.stringify({query:FUNCTIONS_SQL})});
 return {migrations,functions};
}

const local=await listMigrations();
console.log(`Local migrations (${local.length}): ${local.map(m=>m.version).join(', ')}`);
let live;
try{live=await fetchLive();}
catch(error){console.log(`UNAVAILABLE: could not read live state (${error.message}).`);exit(true);}
if(!live){
 console.log('NOT CONFIGURED: SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF not set; live parity not checked.');
 process.exit(flag('--require-configured')&&!reportOnly?1:0);
}
const {migrations,functions}=live;
if(!Array.isArray(migrations)||migrations.some(m=>typeof m?.version!=='string')||(functions!==null&&(!Array.isArray(functions)||functions.some(f=>typeof f?.proname!=='string')))){
 console.log('UNAVAILABLE: live response had an unexpected shape.');exit(true);
}

let drift=false;
console.log(`Live migrations (${migrations.length}): ${migrations.map(m=>m.version).join(', ')}`);
const {missingLive,extraLive}=compareMigrations(local.map(m=>m.version),migrations);
if(!missingLive.length&&!extraLive.length)console.log('Migrations OK: local and live match.');
else{
 drift=true;
 for(const v of missingLive)console.log(`MISSING LIVE (migration): ${v}_${local.find(m=>m.version===v).name}`);
 for(const v of extraLive)console.log(`EXTRA LIVE (migration): ${v}_${migrations.find(m=>m.version===v).name??''}`);
}

if(functions===null)console.log('RPC contract: not checked (no live function list).');
else{
 const used=await frontendRpcs();
 const missingRpc=missingRpcs(used,new Set(functions.map(f=>f.proname.toLowerCase())));
 if(!missingRpc.length)console.log(`RPC contract OK: all ${used.size} frontend RPCs exist live.`);
 else{drift=true;for(const n of missingRpc)console.log(`MISSING LIVE (rpc): ${n} (used in ${used.get(n).join(', ')})`);}
}
console.log(drift?`DRIFT detected.${reportOnly?' (report-only: not failing)':''}`:'OK');
exit(drift);
