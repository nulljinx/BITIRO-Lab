import { spawnSync } from 'node:child_process';

function run(label,args){
  console.log(`BITIRO build · ${label}`);
  const result=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});
  if(result.error){
    console.error(`No se pudo iniciar ${label}: ${result.error.message}`);
    process.exit(1);
  }
  if(result.status!==0)process.exit(result.status??1);
}

run('TypeScript',['node_modules/typescript/bin/tsc','--noEmit']);
run('metadatos de release',['tools/release-meta.mjs']);
run('Vite',['node_modules/vite/bin/vite.js','build','--configLoader','runner',...(process.env.BITIRO_E2E_BUILD==='1'?['--outDir','dist-e2e']:[])]);
// SEC-1: the shipped bundle must not contain mentor reference solutions (self-test first, then the real output).
run('control negativo de soluciones',['tools/audit-dist-solutions.mjs','--self-test']);
run('auditoría de soluciones en dist',['tools/audit-dist-solutions.mjs',process.env.BITIRO_E2E_BUILD==='1'?'dist-e2e':'dist']);
