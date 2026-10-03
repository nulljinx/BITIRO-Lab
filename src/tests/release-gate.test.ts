import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {afterAll,describe,expect,it} from 'vitest';

const dir=mkdtempSync(join(tmpdir(),'bitiro-gate-fixture-'));
afterAll(()=>rmSync(dir,{recursive:true,force:true}));
const gate=(env:Record<string,string>)=>spawnSync(process.execPath,['tools/release-gate.mjs','--preflight-only'],{encoding:'utf8',env:{PATH:process.env.PATH??'',...env}});

describe('release gate preflight (TEST-ONLY fixtures)',()=>{
  it('fails explicitly without BITIRO_SOLUTIONS_DIR',()=>{
    const r=gate({});
    expect(r.status).toBe(1);expect(r.stderr).toContain('RELEASE GATE FAILED');expect(r.stderr).toContain('BITIRO_SOLUTIONS_DIR is not set');
  });
  it('fails for a missing directory and for missing session files, without printing the path',()=>{
    expect(gate({BITIRO_SOLUTIONS_DIR:join(dir,'nope')}).status).toBe(1);
    writeFileSync(join(dir,'s01.json'),JSON.stringify({title:'TEST-ONLY',note:'',source:'// TEST-ONLY'}));
    const r=gate({BITIRO_SOLUTIONS_DIR:dir});
    expect(r.status).toBe(1);expect(r.stderr).toContain('s02.json');expect(r.stderr+r.stdout).not.toContain(dir);
  });
  it('passes the preflight with all five valid files and never prints content',()=>{
    for(const id of ['s02','s03','s04','s05'])writeFileSync(join(dir,`${id}.json`),JSON.stringify({title:'TEST-ONLY',note:'',source:'// TEST-ONLY'}));
    const r=gate({BITIRO_SOLUTIONS_DIR:dir});
    expect(r.status).toBe(0);expect(r.stdout+r.stderr).not.toContain('TEST-ONLY');expect(r.stdout+r.stderr).not.toContain(dir);
  });
});
