// SEC-1 private loader: uploads mentor reference solutions from a directory OUTSIDE the repository.
// This script contains NO solutions. It never prints, logs or writes the source text: only session id, length
// (characters), SHA-256 and the resulting revision.
//
//   BITIRO_SOLUTIONS_DIR=/path/outside/repo  SUPABASE_DB_URL=postgresql://...  node tools/load-mentor-solutions.mjs
//   node tools/load-mentor-solutions.mjs --dry-run            validate and show session/length/hash only (no DB)
//   node tools/load-mentor-solutions.mjs --only s01,s03       restrict to some sessions
//
// Input: one file per session, `<dir>/s01.json` ... `s08.json`: {"title":"...","note":"...","source":"..."}.
// Transport: the psql client (no new dependency). Values travel base64-encoded over psql's STDIN and are bound with
// psql's :'var' literal quoting, so nothing is concatenated into SQL and nothing appears in argv or logs.
// The connection URL travels in the PGDATABASE environment variable of the child process (never in argv).
// Do NOT use the Dashboard SQL editor, seeds, migrations or `supabase db push` for this: they keep history.
import {createHash} from 'node:crypto';
import {readdir,readFile,realpath} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const FILE_PATTERN=/^s0[1-8]\.json$/;
const LIMITS={title:200,note:2000,source:200_000};
const repoRoot=fileURLToPath(new URL('../',import.meta.url));

export const UPSERT_SQL=`insert into private.mentor_solutions as t(session_id,title,note,source)
values(:'session',convert_from(decode(:'title_b64','base64'),'UTF8'),convert_from(decode(:'note_b64','base64'),'UTF8'),convert_from(decode(:'source_b64','base64'),'UTF8'))
on conflict (session_id) do update
 set title=excluded.title,note=excluded.note,source=excluded.source,revision=t.revision+1,updated_at=now()
 where (t.title,t.note,t.source) is distinct from (excluded.title,excluded.note,excluded.source)
returning session_id||'|'||revision;`;

/** Validates one parsed file. Returns the entry or throws an Error whose message never contains the source. */
export function validateEntry(file,parsed){
 if(!FILE_PATTERN.test(file))throw new Error(`${file}: file name must be s01.json ... s08.json`);
 const session=file.slice(0,3);
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error(`${file}: expected a JSON object`);
 if(parsed.session_id!==undefined&&parsed.session_id!==session)throw new Error(`${file}: session_id does not match the file name`);
 for(const field of ['title','note','source']){
  if(typeof parsed[field]!=='string')throw new Error(`${file}: "${field}" must be a string`);
  if(parsed[field].length>LIMITS[field])throw new Error(`${file}: "${field}" exceeds ${LIMITS[field]} characters`);
 }
 if(!parsed.title.trim())throw new Error(`${file}: "title" is empty`);
 if(!parsed.source.trim())throw new Error(`${file}: "source" is empty`);
 const unknown=Object.keys(parsed).filter(k=>!['session_id','title','note','source'].includes(k));
 if(unknown.length)throw new Error(`${file}: unexpected field(s): ${unknown.join(', ')}`);
 return {session,title:parsed.title,note:parsed.note,source:parsed.source};
}
export const describeEntry=entry=>({session:entry.session,length:entry.source.length,sha256:createHash('sha256').update(entry.source,'utf8').digest('hex')});
const b64=text=>Buffer.from(text,'utf8').toString('base64');

/** psql script for one entry (base64 values contain no quote, backslash or newline). */
export function buildPsqlScript(entry){
 return [
  `\\set ON_ERROR_STOP on`,
  `\\set session '${entry.session}'`,
  `\\set title_b64 '${b64(entry.title)}'`,
  `\\set note_b64 '${b64(entry.note)}'`,
  `\\set source_b64 '${b64(entry.source)}'`,
  UPSERT_SQL,
  '',
 ].join('\n');
}

export async function loadEntries(dir,only){
 const names=(await readdir(dir)).filter(n=>n.endsWith('.json')).sort();
 const bad=names.filter(n=>!FILE_PATTERN.test(n));
 if(bad.length)throw new Error(`Unexpected file name(s): ${bad.join(', ')} (only s01.json ... s08.json)`);
 const selected=only?names.filter(n=>only.includes(n.slice(0,3))):names;
 if(!selected.length)throw new Error('No solution files to load.');
 const entries=[];
 for(const file of selected){
  let parsed;
  try{parsed=JSON.parse(await readFile(join(dir,file),'utf8'));}catch{throw new Error(`${file}: not valid JSON`);}
  entries.push(validateEntry(file,parsed));
 }
 return entries;
}

function runPsql(url,script){
 return new Promise((resolve,reject)=>{
  const child=spawn('psql',['-X','-q','-At','-v','VERBOSITY=terse'],{env:{...process.env,PGDATABASE:url,PGCONNECT_TIMEOUT:'15'},stdio:['pipe','pipe','ignore']});
  let out='';
  child.stdout.on('data',chunk=>{out+=chunk;});
  child.on('error',()=>reject(new Error('psql could not be started (is the PostgreSQL client installed?)')));
  child.on('close',code=>code===0?resolve(out.trim()):reject(new Error(`psql failed (exit ${code}); details are suppressed so the source is never echoed`)));
  child.stdin.end(script);
 });
}

async function main(){
 const args=process.argv.slice(2);
 const dryRun=args.includes('--dry-run');
 const onlyArg=args.includes('--only')?args[args.indexOf('--only')+1]:null;
 const only=onlyArg?onlyArg.split(',').map(s=>s.trim()):null;
 if(only&&only.some(s=>!/^s0[1-8]$/.test(s)))throw new Error('--only expects session ids like s01,s03');
 const dir=process.env.BITIRO_SOLUTIONS_DIR?.trim();
 if(!dir)throw new Error('BITIRO_SOLUTIONS_DIR is not set.');
 const real=await realpath(dir);
 if(real===repoRoot.replace(/\/$/,'')||real.startsWith(repoRoot.endsWith(sep)?repoRoot:repoRoot+sep))throw new Error('BITIRO_SOLUTIONS_DIR must be OUTSIDE the repository.');
 const entries=await loadEntries(real,only);
 const url=process.env.SUPABASE_DB_URL?.trim();
 if(!dryRun&&!url)throw new Error('SUPABASE_DB_URL is not set (use --dry-run to validate only).');
 console.log(dryRun?'DRY RUN: nothing is sent to the database.':'Loading mentor solutions.');
 for(const entry of entries){
  const info=describeEntry(entry);
  if(dryRun){console.log(`${info.session}  length=${info.length}  sha256=${info.sha256}`);continue;}
  const result=await runPsql(url,buildPsqlScript(entry));
  const revision=result.split('|')[1];
  console.log(`${info.session}  length=${info.length}  sha256=${info.sha256}  ${revision?`revision=${revision}`:'unchanged'}`);
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(error=>{console.error(`load-mentor-solutions: ${error.message}`);process.exit(1);});
