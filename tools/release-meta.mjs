import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {listMigrations,latestMigration} from './migration-contract.mjs';
const base=new URL('../',import.meta.url);
const hash=createHash('sha256');
async function collect(relative){const entries=await readdir(new URL(relative,base),{withFileTypes:true});for(const e of entries.sort((a,b)=>a.name.localeCompare(b.name))){const name=relative+e.name;if(e.isDirectory())await collect(name+'/');else{hash.update(name);hash.update(await readFile(new URL(name,base)));}}}
await collect('src/');
const {version}=JSON.parse(await readFile(new URL('package.json',base),'utf8'));
await writeFile(new URL('public/version.json',base),JSON.stringify({product:'BITIRO Lab',version,requiredMigration:latestMigration(await listMigrations()),sourceHash:hash.digest('hex'),builtAt:new Date().toISOString()},null,2));
console.log(`Release ${version}: source manifest generated`);
