import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const axeSource=readFileSync('node_modules/axe-core/axe.min.js','utf8');
const packageVersion=JSON.parse(readFileSync('package.json','utf8')).version as string;
test('public pages, honest account state and responsive accessibility',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});
  for(const route of ['/','/espacios','/intermedio','/registro','/login','/recuperar','/recursos','/comunidad','/privacidad','/cuenta']){
   await page.goto(route);await expect(page.locator('h1')).toBeVisible();await expect(page.locator('.brand-loading')).toHaveCount(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.evaluate(axeSource);
   const violations=await page.evaluate(async()=>{const result=await (window as any).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}));});
   expect(violations,`${route} at ${width}px`).toEqual([]);
  }
 }
 await page.goto('/registro');await expect(page.getByRole('button',{name:'Crear cuenta',exact:true})).toBeDisabled();
 await expect(page.getByText(/Las cuentas no están configuradas en esta instalación/)).toBeVisible();
 await page.goto('/equipo');await expect(page).toHaveURL(/login\?next=\/equipo/);expect(errors).toEqual([]);
});
test('landing defers Monaco and simulator; missing route assets recover',async({page})=>{
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));await page.goto('/intermedio');await expect(page.locator('h1')).toBeVisible();
 expect(requests.some(url=>/monaco-|CodeEditor-|simulator\.worker|Simulator-/.test(url))).toBe(false);
 await page.route('**/assets/Simulator-*.js',route=>route.abort());
 await page.getByRole('link',{name:/Abrir S01:/}).click();await expect(page.locator('.recovery-page')).toBeVisible();
 await expect(page.locator('.recovery-page')).toContainText('guardado');
});
test('editor download failure preserves usable simulator and local code',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('bitiro:v7:guest:code:s01',JSON.stringify({code:'// preserved',lastOpenedAt:1})));
 await page.route('**/assets/CodeEditor-*.js',route=>route.abort());await page.goto('/intermedio/s01');
 await expect(page.getByRole('heading',{name:'No pudimos cargar el editor'})).toBeVisible();await expect(page.locator('canvas')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bitiro:v7:guest:code:s01')!).code)).toBe('// preserved');
});
test('worker failure offers recovery without losing the editor',async({page})=>{
 await page.route('**/assets/simulator.worker-*.js',route=>route.abort());await page.goto('/intermedio/s01');
 await expect(page.locator('.monaco-editor')).toBeVisible();await expect(page.getByRole('button',{name:'Reiniciar motor',exact:true})).toBeVisible({timeout:15000});
 await expect(page.getByRole('button',{name:'Probar código',exact:true})).toBeDisabled();
 await page.unroute('**/assets/simulator.worker-*.js');await page.getByRole('button',{name:'Reiniciar motor',exact:true}).click();
 await expect(page.getByRole('button',{name:'Probar código',exact:true})).toBeEnabled();
});
test('calibration controls remain reachable at short desktop height',async({page})=>{
 await page.setViewportSize({width:1280,height:600});await page.goto('/intermedio/s01');await page.getByRole('button',{name:'Calibrar',exact:true}).click();
 const panel=page.getByRole('complementary',{name:'Calibración de sensores'});await expect(panel).toBeVisible();
 await expect(panel.getByRole('button',{name:'Inicio',exact:true})).toBeVisible();
 await expect(panel.getByRole('button',{name:'Limpiar',exact:true})).toBeVisible();
 await expect(panel.getByRole('button',{name:'Guardar calibración y volver',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/calibracion-1280x600.png',fullPage:true});
});
test('institutional areas require an account before codes or content are available',async({page})=>{
 await page.goto('/espacios');
 await expect(page).toHaveURL(/\/registro\?next=%2Fespacios/);
 await expect(page.getByRole('heading',{name:'Un lugar para seguir aprendiendo.'})).toBeVisible();
 await expect(page.getByLabel('Código de acceso')).toHaveCount(0);
 await page.goto('/espacios/mustakis/grupos/mustakis-demo-talca');
 await expect(page).toHaveURL(/\/login\?next=/);
 await page.goto('/espacios/mustakis/grupos/mustakis-demo-talca/intermedio/s01');
 await expect(page).toHaveURL(/\/login\?next=/);
});

test('static release has security headers and does not expose missing assets as HTML',async({request})=>{
 const res=await request.get('/intermedio');expect(res.status()).toBe(200);
 const h=res.headers();expect(h['content-security-policy']).toContain("script-src 'self'");expect(h['content-security-policy']).toContain("frame-ancestors 'none'");expect(h['x-content-type-options']).toBe('nosniff');
 expect((await request.get('/assets/missing')).status()).toBe(404);expect((await request.post('/intermedio')).status()).toBe(405);
 const version=await (await request.get('/version.json')).json();expect(version.version).toBe(packageVersion);
});
