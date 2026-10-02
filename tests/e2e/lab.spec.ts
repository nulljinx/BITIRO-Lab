import {test,expect} from '@playwright/test';

// Most E2E tests exercise the laboratory itself, not the first-run onboarding.
// Keep the tutorial covered by its own behavior while preventing its modal guard
// from intercepting unrelated interaction tests.
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('bitiro:v7:simulator-tutorial:guest','done'));
});
test('explorer, code persistence, motion, pause, reset and guide',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/intermedio/s01?debug=1');await expect(page.locator('.monaco-editor')).toBeVisible();
 const editor=page.getByRole('textbox',{name:/Código Arduino/});await expect(editor).toBeVisible();await editor.focus();await page.keyboard.press('Control+Home');await page.keyboard.insertText('// prueba de persistencia\n');
 await expect.poll(()=>page.evaluate(()=>{const raw=localStorage.getItem('bitiro:v7:guest:code:s01');return raw?JSON.parse(raw).code:'';})).toContain('prueba de persistencia');
 const pose=page.getByTestId('robot-position');const initial=await pose.textContent();
 await page.getByRole('button',{name:'Avanzar manual',exact:true}).click();await expect.poll(()=>pose.textContent()).not.toBe(initial);
 await page.getByRole('button',{name:'Pausar',exact:true}).click();await expect(page.locator('.runtime-clock .status')).toContainText('En pausa');
 const paused=await pose.textContent();await page.waitForTimeout(250);expect(await pose.textContent()).toBe(paused);
 await page.screenshot({path:'test-results/s01-pausa.png',fullPage:true});
 await page.reload();await expect(pose).toHaveText(initial!);
await expect.poll(()=>page.evaluate(()=>{const raw=localStorage.getItem('bitiro:v7:guest:code:s01');return raw?JSON.parse(raw).code:'';})).toContain('prueba de persistencia');
 await page.getByRole('button',{name:'Abrir guía y conceptos',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('searchbox').fill('sonar');await expect(page.getByRole('dialog').locator('summary')).toHaveCount(1);await page.getByRole('dialog').locator('summary').click();await expect(page.getByRole('dialog')).toContainText('sin eco válido');
 await page.screenshot({path:'test-results/guia.png',fullPage:true});await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(errors).toEqual([]);
});
test('all sessions keep separate code and truthful availability',async({page})=>{
 for(const id of ['s02','s03','s04','s05']){await page.goto('/intermedio/'+id);await expect(page.locator('.monaco-editor')).toBeVisible();await expect(page.locator('canvas[role="img"]')).toBeVisible();}
 for(const id of ['s06','s07','s08']){await page.goto('/intermedio/'+id);await expect(page.locator('.session-overview')).toBeVisible();await expect(page.locator('.session-overview img')).toHaveCount(0);}
 await page.goto('/intermedio/no-existe');await expect(page).toHaveURL(/\/$/);
});
test('responsive layout, desktop fit, tablet tabs and mobile flow',async({page})=>{
 for(const width of [1920,1440,1280,1024,900,390]){
  await page.setViewportSize({width,height:width===1920?1080:900});await page.goto('/intermedio/s01');if(width>=768&&width<1024)await page.getByRole('button',{name:'Simulador',exact:true}).click();await expect(page.locator('canvas[role="img"]')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(width>=1024){await expect(page.locator('.simulation-panel')).toBeVisible();await expect(page.locator('.editor-column')).toBeVisible();const workspace=await page.locator('.workspace').boundingBox();expect(workspace).not.toBeNull();expect(workspace!.width).toBeLessThanOrEqual(width+1);}
  if(width>=768&&width<1024){await page.getByRole('button',{name:'Código',exact:true}).click();await expect(page.locator('.monaco-editor')).toBeVisible();await page.getByRole('button',{name:'Simulador',exact:true}).click();await expect(page.locator('canvas[role="img"]')).toBeVisible();}
  if(width<768){await expect(page.locator('.monaco-editor')).toBeVisible();await expect(page.getByRole('button',{name:/Sensores y telemetría/})).toBeVisible();}
  await page.screenshot({path:`test-results/premium-s01-${width}.png`,fullPage:true});
 }
});
