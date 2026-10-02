// REL-1: derives the migration set and the RPC contract from the repository. No hand-written lists.
import {readdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export const migrationsDir=path.join(root,'supabase/migrations');
export const featuresDir=path.join(root,'src/features');
const FILE=/^(\d{12,14})_([a-z0-9_]+)\.sql$/;

export async function listMigrations(dir=migrationsDir){
 const names=(await readdir(dir)).filter(n=>n.endsWith('.sql')).sort();
 const bad=names.filter(n=>!FILE.test(n));
 if(bad.length)throw new Error(`Migration file names must match <version>_<name>.sql: ${bad.join(', ')}`);
 const migrations=names.map(file=>({file,version:file.match(FILE)[1],name:file.match(FILE)[2],path:path.join(dir,file)}));
 const versions=migrations.map(m=>m.version);
 if(new Set(versions).size!==versions.length)throw new Error('Duplicate migration versions found');
 return migrations;
}
export const latestMigration=migrations=>migrations.at(-1)?.version??null;

const stripSql=sql=>sql.replace(/\/\*[\s\S]*?\*\//g,'').replace(/--[^\n]*/g,'');
const NAME='(?:"?public"?\\.)"?([a-z_][a-z0-9_]*)"?\\s*\\(';
const CREATE=new RegExp(`\\bcreate\\s+(?:or\\s+replace\\s+)?function\\s+${NAME}`,'gi');
const DROP=new RegExp(`\\bdrop\\s+function\\s+(?:if\\s+exists\\s+)?${NAME}`,'gi');

// Applies migrations in order: public functions created/replaced minus those later dropped.
export function publicFunctions(sqlByMigration){
 const fns=new Set();
 for(const sql of sqlByMigration){
  const clean=stripSql(sql),events=[];
  for(const m of clean.matchAll(CREATE))events.push([m.index,'add',m[1].toLowerCase()]);
  for(const m of clean.matchAll(DROP))events.push([m.index,'drop',m[1].toLowerCase()]);
  for(const [,kind,name] of events.sort((a,b)=>a[0]-b[0]))kind==='add'?fns.add(name):fns.delete(name);
 }
 return fns;
}
export async function migrationFunctions(migrations){
 return publicFunctions(await Promise.all(migrations.map(m=>readFile(m.path,'utf8'))));
}

const RPC=/\.rpc\(\s*(['"`])([A-Za-z_][A-Za-z0-9_]*)\1/g;
export function rpcNames(source){return [...source.matchAll(RPC)].map(m=>m[2]);}
async function walk(dir){
 const out=[];
 for(const e of await readdir(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);
  if(e.isDirectory())out.push(...await walk(p));
  else if(/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)&&!/\.(test|spec)\./.test(e.name))out.push(p);
 }
 return out;
}
export async function frontendRpcs(dir=featuresDir){
 const used=new Map();
 for(const file of await walk(dir))for(const name of rpcNames(await readFile(file,'utf8'))){
  if(!used.has(name))used.set(name,[]);used.get(name).push(path.relative(root,file));
 }
 return used;
}
export function missingRpcs(used,defined){return [...used.keys()].filter(n=>!defined.has(n.toLowerCase())).sort();}

export function compareMigrations(localVersions,live){
 const local=new Set(localVersions),liveSet=new Set(live.map(m=>m.version));
 return {
  missingLive:[...local].filter(v=>!liveSet.has(v)).sort(),
  extraLive:[...liveSet].filter(v=>!local.has(v)).sort()
 };
}
