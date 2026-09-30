import {test,expect} from '@playwright/test';
test('calibration keeps a stable fitted view and removes normal zoom controls',async({page})=>{
 await page.goto('/intermedio/s01?debug=1');
 await expect(page.locator('.manual-controls')).toBeVisible();
 await expect(page.getByRole('complementary',{name:'Calibración de sensores'})).toHaveCount(0);
 await page.getByRole('button',{name:'Calibrar',exact:true}).click();
 const panel=page.getByRole('complementary',{name:'Calibración de sensores'}),canvas=page.locator('canvas[role="img"]');
 await expect(panel).toBeVisible();await expect(panel).toContainText('Aprende a usar el umbral');
 await expect(page.getByRole('button',{name:'Acercar pista',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Alejar pista',exact:true})).toHaveCount(0);
 await expect(page.getByLabel('Zoom de pista')).toHaveCount(0);
 const before=await canvas.boundingBox();expect(before).not.toBeNull();
 const pose=page.getByTestId('robot-position'),initial=await pose.textContent();
 await canvas.focus();await page.keyboard.press('ArrowLeft');await expect.poll(()=>pose.textContent()).not.toBe(initial);
 const after=await canvas.boundingBox();expect(after?.width).toBeCloseTo(before!.width,1);expect(after?.height).toBeCloseTo(before!.height,1);
 await expect(page.getByRole('button',{name:'Guardar calibración y volver',exact:true})).toBeDisabled();
 await page.screenshot({path:'test-results/premium-calibracion.png',fullPage:true});
 await page.getByRole('button',{name:'Salir de calibración',exact:true}).click();
 await expect(panel).toHaveCount(0);await expect(page.getByRole('button',{name:'Calibrar',exact:true})).toBeVisible();
});
test('reduced motion, keyboard focus and guide stay accessible',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Ir al contenido',exact:true})).toBeFocused();
 // La guía forma parte del contexto de una sesión; la portada no expone contenidos de una sesión fuera del laboratorio.
 await expect(page.getByRole('button',{name:'Abrir guía y conceptos',exact:true})).toHaveCount(0);
 await page.goto('/intermedio/s01');await expect(page.getByRole('button',{name:'Abrir guía y conceptos',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Abrir guía y conceptos',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.screenshot({path:'test-results/premium-explorador.png',fullPage:true});
});
test('mobile executes into simulator and reports errors back at editor',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/intermedio/s01');await expect(page.locator('.monaco-editor')).toBeVisible();
 await page.getByRole('button',{name:'Probar código',exact:true}).click();await expect(page.locator('.runtime-clock .status')).toContainText('Ejecutando');await expect(page.getByRole('button',{name:'Detener la prueba',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Detener la prueba',exact:true}).click();await expect(page.locator('.runtime-clock .status')).toContainText('Detenido');
 const editor=page.getByRole('textbox',{name:/Código Arduino/});await editor.focus();await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.evaluate(()=>navigator.clipboard.writeText('void setup(){funcionInexistente();} void loop(){}'));await page.keyboard.press('Control+Home');await page.keyboard.press('Control+Shift+End');await page.keyboard.press('Control+V');
 await page.getByRole('button',{name:'Probar código',exact:true}).click();await expect(page.locator('.diagnostic')).toContainText('funcionInexistente');await expect.poll(async()=>(await page.locator('.editor-column').boundingBox())!.y).toBeLessThan(844/3);
 await page.getByRole('button',{name:'Calibrar',exact:true}).click();await expect(page.getByRole('complementary',{name:'Calibración de sensores'})).toBeVisible();await page.screenshot({path:'test-results/premium-calibracion-movil.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

