import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {afterAll,describe,expect,it} from 'vitest';
import {validateEntry} from '../../tools/load-mentor-solutions.mjs';

// TEST-ONLY fixtures in a temp dir outside the repository. No real solution anywhere.
const dir=mkdtempSync(join(tmpdir(),'bitiro-solutions-'));
afterAll(()=>rmSync(dir,{recursive:true,force:true}));
const SECRET='// TEST-ONLY secret-marker-0xC0FFEE';
writeFileSync(join(dir,'s01.json'),JSON.stringify({title:'TEST-ONLY',note:'TEST-ONLY',source:SECRET}));
const cli=(env:Record<string,string>,...args:string[])=>spawnSync(process.execPath,['tools/load-mentor-solutions.mjs',...args],{encoding:'utf8',env:{PATH:process.env.PATH??'',...env}});

describe('load-mentor-solutions',()=>{
  it('--dry-run prints only session, length and sha256, never the source',()=>{
    const r=cli({BITIRO_SOLUTIONS_DIR:dir},'--dry-run');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/s01\s+length=\d+\s+sha256=[0-9a-f]{64}/);
    expect(r.stdout+r.stderr).not.toContain('0xC0FFEE');
    expect(r.stdout+r.stderr).not.toContain('TEST-ONLY');
  });
  it('refuses to run without BITIRO_SOLUTIONS_DIR, without a DB URL (non dry-run) and inside the repository',()=>{
    expect(cli({}, '--dry-run').status).toBe(1);
    const noUrl=cli({BITIRO_SOLUTIONS_DIR:dir});
    expect(noUrl.status).toBe(1);expect(noUrl.stderr).toContain('SUPABASE_DB_URL');
    const inside=cli({BITIRO_SOLUTIONS_DIR:'src'},'--dry-run');
    expect(inside.status).toBe(1);expect(inside.stderr).toContain('OUTSIDE the repository');
  });
  it('validates shape and never echoes the source in errors',()=>{
    expect(()=>validateEntry('s09.json',{title:'t',note:'',source:SECRET})).toThrow(/file name/);
    expect(()=>validateEntry('s01.json',{title:'',note:'',source:SECRET})).toThrow(/title/);
    expect(()=>validateEntry('s01.json',{title:'t',note:'',source:' '})).toThrow(/source/);
    expect(()=>validateEntry('s01.json',{title:'t',note:'',source:SECRET,extra:1})).toThrow(/unexpected/);
    expect(()=>validateEntry('s01.json',{session_id:'s02',title:'t',note:'',source:SECRET})).toThrow(/session_id/);
    try{validateEntry('s01.json',{title:'t',note:1,source:SECRET});}catch(e){expect((e as Error).message).not.toContain('0xC0FFEE');}
    expect(validateEntry('s01.json',{title:'t',note:'',source:SECRET}).session).toBe('s01');
  });
});
