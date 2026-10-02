import {readFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {listMigrations,latestMigration} from './migration-contract.mjs';
const base=new URL('../',import.meta.url),hash=createHash('sha256');
async function walk(relative){const entries=await readdir(new URL(relative,base),{withFileTypes:true});for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){const name=relative+entry.name;if(entry.isDirectory())await walk(name+'/');else{hash.update(name);hash.update(await readFile(new URL(name,base)));}}}
await walk('src/');
const manifest=JSON.parse(await readFile(new URL('dist/version.json',base),'utf8'));
const pkg=JSON.parse(await readFile(new URL('package.json',base),'utf8'));
if(manifest.version!==pkg.version||manifest.sourceHash!==hash.digest('hex'))throw new Error('El build no corresponde al código fuente. Ejecuta pnpm build.');
if(manifest.requiredMigration!==latestMigration(await listMigrations()))throw new Error('El build declara una migración requerida distinta de la última en supabase/migrations. Ejecuta pnpm build.');
const html=await readFile(new URL('dist/index.html',base),'utf8');
for(const match of html.matchAll(/(?:src|href)="(\/assets\/[^"\s]+)"/g))await stat(new URL('dist'+match[1],base));
if(/(?:CodeEditor|monaco)-/.test(html))throw new Error('El editor se está precargando en la portada.');
console.log(`Release ${manifest.version} verificada: código y build coinciden; assets de entrada disponibles.`);
