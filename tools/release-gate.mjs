// SEC-1 RELEASE GATE: a real release/deploy must not pass without the private mentor-solution suite.
// Runs only through the explicit release flow (`pnpm release`); `pnpm check`, `pnpm build` and public CI never call it.
//
//   BITIRO_SOLUTIONS_DIR=/path/outside/repo node tools/release-gate.mjs [--preflight-only]
//
// 1. BITIRO_SOLUTIONS_DIR must be set, exist and hold valid s01..s05.json (shape only; content never printed).
// 2. `vitest run src/tests/private` must pass with ZERO skipped tests (skipped = the suite did not really run).
// 3. The private E2E (tests/e2e/mission-state.spec.ts) must run and pass: 0 skipped, 0 failed.
// 4. dist/version.json must declare the latest migration of supabase/migrations (offline check, no network).
// Output never includes the directory path or any solution content.
import {existsSync,mkdtempSync,readFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateEntry} from './load-mentor-solutions.mjs';

const REQUIRED=['s01','s02','s03','s04','s05'];
const fail=message=>{console.error(`RELEASE GATE FAILED: ${message}`);process.exit(1);};

export function preflight(env=process.env){
 const dir=env.BITIRO_SOLUTIONS_DIR?.trim();
 if(!dir)return 'BITIRO_SOLUTIONS_DIR is not set. A release needs the private mentor-solution suite.';
 if(!existsSync(dir)||!statSync(dir).isDirectory())return 'BITIRO_SOLUTIONS_DIR does not point to an existing directory.';
 const missing=REQUIRED.filter(id=>!existsSync(join(dir,`${id}.json`)));
 if(missing.length)return `BITIRO_SOLUTIONS_DIR is missing: ${missing.map(id=>`${id}.json`).join(', ')}.`;
 for(const id of REQUIRED){
  try{validateEntry(`${id}.json`,JSON.parse(readFileSync(join(dir,`${id}.json`),'utf8')));}
  catch(error){return `${id}.json is invalid (${error.message.replace(/^s0\d\.json: /,'')}).`;}
 }
 return null;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const problem=preflight();
 if(problem)fail(problem);
 console.log(`Release gate: private solutions present (${REQUIRED.join(', ')}).`);
 if(process.argv.includes('--preflight-only'))process.exit(0);

 const out=mkdtempSync(join(tmpdir(),'bitiro-gate-')),report=join(out,'report.json');
 try{
  const run=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','--configLoader','runner','src/tests/private','--reporter=json',`--outputFile=${report}`],{env:process.env,stdio:['ignore','ignore','inherit']});
  if(!existsSync(report))fail('the private suite produced no report.');
  const r=JSON.parse(readFileSync(report,'utf8'));
  if(run.status!==0||r.numFailedTests>0)fail(`private suite failed (${r.numFailedTests} failed test(s)). Run pnpm test:private for details.`);
  if(!r.numTotalTests||r.numPendingTests>0||r.numPassedTests!==r.numTotalTests)fail(`private suite did not fully run (${r.numPassedTests}/${r.numTotalTests} passed, ${r.numPendingTests} skipped).`);
  console.log(`Release gate: private suite passed (${r.numPassedTests} tests, 0 skipped).`);
 }finally{rmSync(out,{recursive:true,force:true});}

 const e2eOut=mkdtempSync(join(tmpdir(),'bitiro-gate-e2e-')),e2eReport=join(e2eOut,'report.json');
 try{
  const e2e=spawnSync(process.execPath,['tools/run-e2e.mjs','tests/e2e/mission-state.spec.ts','--reporter=json'],{env:{...process.env,PLAYWRIGHT_JSON_OUTPUT_NAME:e2eReport},stdio:['ignore','ignore','inherit']});
  if(!existsSync(e2eReport))fail('the private E2E produced no report.');
  const {stats}=JSON.parse(readFileSync(e2eReport,'utf8'));
  if(e2e.status!==0||stats.unexpected>0||stats.flaky>0)fail(`private E2E failed (${stats.unexpected} failed). Run it with BITIRO_SOLUTIONS_DIR set for details.`);
  if(!stats.expected||stats.skipped>0)fail(`private E2E did not run (${stats.expected} passed, ${stats.skipped} skipped).`);
  console.log(`Release gate: private E2E passed (${stats.expected} test, 0 skipped).`);
 }finally{rmSync(e2eOut,{recursive:true,force:true});}
 const verify=spawnSync(process.execPath,['tools/verify-release.mjs'],{stdio:'inherit'});
 if(verify.status!==0)fail('verify-release failed: dist does not match the source or the latest migration. Run pnpm build.');
 console.log('Release gate OK.');
}
