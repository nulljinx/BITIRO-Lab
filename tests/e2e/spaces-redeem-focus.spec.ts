import {test,expect,type Page} from '@playwright/test';
import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';

// SpacesPage normally needs Supabase auth, which the E2E release does not configure.
// Bundle the real page with only its two context hooks stubbed, then type into it in Chromium.
let bundle='';
test.beforeAll(async()=>{
 const out=await build({configFile:false,logLevel:'silent',plugins:[react()],
  resolve:{alias:[
   {find:/^.*\/auth\/AuthProvider$/,replacement:resolve('tests/e2e/harness/auth-stub.tsx')},
   {find:/^\.\/WorkspaceProvider$/,replacement:resolve('tests/e2e/harness/workspaces-stub.tsx')},
  ]},
  define:{'process.env.NODE_ENV':'"production"'},
  build:{write:false,target:'es2022',minify:false,lib:{entry:resolve('tests/e2e/harness/spaces-entry.tsx'),formats:['iife'],name:'SpacesHarness',fileName:'spaces'}},
 }) as any;
 const outputs=(Array.isArray(out)?out:[out]).flatMap((o:any)=>o.output);
 bundle=outputs.find((o:any)=>o.type==='chunk').code;
});

const workspace={id:'w1',organization_id:'mustakis',organization_name:'Fundación Mustakis',role:'participant',can_manage:false,cohort_id:'c1',cohort_name:'Grupo A',program_id:'p1',program_name:'Robótica Educativa',site_name:'Sede'};
async function mount(page:Page,workspaces:unknown[]){
 await page.setContent('<!doctype html><html lang="es"><body><div id="root"></div></body></html>');
 await page.evaluate(w=>{(window as any).__BITIRO_WORKSPACES__=w;},workspaces);
 await page.addScriptTag({content:bundle});
}
async function typeConsecutively(page:Page,input:ReturnType<Page['locator']>){
 await input.click();
 await page.keyboard.type('abcd1234',{delay:20});
 await expect(input).toHaveValue('ABCD1234');
 expect(await input.evaluate(el=>el===document.activeElement)).toBe(true);
}

test('onboarding code input keeps focus while typing character by character',async({page})=>{
 await mount(page,[]);
 await typeConsecutively(page,page.locator('.redeem-panel').getByLabel('Código de acceso'));
});

test('"Vincular grupo" dialog code input keeps focus while typing character by character',async({page})=>{
 await mount(page,[workspace]);
 await page.getByRole('button',{name:'Vincular grupo'}).click();
 const input=page.getByRole('dialog').getByLabel('Código de acceso');
 await expect(input).toBeVisible();
 await typeConsecutively(page,input);
});
