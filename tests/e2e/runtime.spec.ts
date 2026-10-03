import {test,expect,type Page} from '@playwright/test';

// Runtime tests start after onboarding so the tutorial modal cannot intercept controls.
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('bitiro:v7:simulator-tutorial:guest','done'));
});
import {readFileSync} from 'node:fs';
const replaceCode=async(page:Page,source:string)=>{
 const normalized=source.replaceAll('\r\n','\n');
 const editor=page.getByRole('textbox',{name:/Código Arduino/});await expect(editor).toBeVisible();await editor.focus();
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);
 await page.evaluate(text=>navigator.clipboard.writeText(text),normalized);
 await page.keyboard.press('Control+Home');await page.keyboard.press('Control+Shift+End');await page.keyboard.press('Control+V');
 await expect.poll(()=>page.evaluate(()=>{const raw=localStorage.getItem('bitiro:v7:guest:code:s01');return raw?String(JSON.parse(raw).code??'').trim():'';})).toBe(normalized.trim());
};
const simple=`#include <KnightRoboticsLibs_Iroh.h>
void setup(){
 inicializarMovimiento();
 inicializarPantalla();
 borrarPantalla();
 escribirPantalla(0,0,"MI PRIMER IROH");
 inicializarGolpe();
 moverServoGolpe(1);
 pausa(700);
 avanzar(20);
}
void loop(){pausa(20);}`;
test('student code controls Worker, pause/resume and reset preserves code',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/intermedio/s01?debug=1');await replaceCode(page,simple);
 const position=page.getByTestId('robot-position'),initial=await position.textContent();
 await page.getByRole('button',{name:'Revisar código',exact:true}).click();await expect(page.locator('.runtime-diagnostics')).toHaveClass(/is-success/);await expect(page.locator('.runtime-diagnostics .diagnostic')).toHaveCount(0);expect(await position.textContent()).toBe(initial);
 await page.getByRole('button',{name:'IR izquierdo',exact:true}).click();await page.getByRole('button',{name:'Probar código',exact:true}).click();await expect(page.locator('.runtime-clock .status')).toContainText('Ejecutando');await expect.poll(()=>position.textContent()).not.toBe(initial);
 await expect(page.getByTestId('lcd')).toContainText('MI PRIMER IROH');await page.screenshot({path:'test-results/s01-runtime-ejecutando.png',fullPage:true});
 await page.getByRole('button',{name:'Pausar',exact:true}).click();await expect(page.locator('.runtime-clock .status')).toContainText('En pausa');const frozen=await position.textContent();await page.waitForTimeout(300);expect(await position.textContent()).toBe(frozen);
 await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect.poll(()=>position.textContent()).not.toBe(frozen);
 await page.getByRole('button',{name:'Restablecer',exact:true}).click();await expect(position).toHaveText(initial!);expect(await page.evaluate(()=>{const raw=localStorage.getItem('bitiro:v7:guest:code:s01');return raw?String(JSON.parse(raw).code??'').trim():'';})).toBe(simple.trim());expect(errors).toEqual([]);
});
test('invalid syntax marks Monaco without movement; infinite loop remains recoverable',async({page})=>{
 await page.goto('/intermedio/s01?debug=1');const position=page.getByTestId('robot-position');await replaceCode(page,'void setup(){\n leerSensorIRIzquierdo();\n}\nvoid loop(){}');const initial=await position.textContent();
 await page.getByRole('button',{name:'Probar código',exact:true}).click();await expect(page.locator('.runtime-diagnostics .diagnostic')).toContainText('Línea 2');await expect(page.locator('.runtime-diagnostics .diagnostic')).toContainText('leerSensorObstaculoIzquierdo');await expect(page.locator('.squiggly-error').first()).toBeVisible();expect(await position.textContent()).toBe(initial);
 await page.screenshot({path:'test-results/s01-error-compilacion.png',fullPage:true});
 await replaceCode(page,'void setup(){} void loop(){while(true){}}');await page.getByRole('button',{name:'IR izquierdo',exact:true}).click();await page.getByRole('button',{name:'Probar código',exact:true}).click();await expect(page.locator('.runtime-diagnostics .diagnostic')).toContainText('demasiadas instrucciones');await page.getByRole('button',{name:'Restablecer',exact:true}).click();await expect(page.locator('.runtime-diagnostics .diagnostic')).toHaveCount(0);
 await replaceCode(page,simple);await page.getByRole('button',{name:'Revisar código',exact:true}).click();await expect(page.locator('.runtime-diagnostics')).toHaveClass(/is-success/);await expect(page.locator('.runtime-diagnostics .diagnostic')).toHaveCount(0);await expect(page.locator('.squiggly-error')).toHaveCount(0);
});
test('LCD, animated strike and mobile student view',async({page})=>{
 await page.goto('/intermedio/s01');await expect(page.locator('.manual-controls')).toHaveCount(0);await expect.poll(async()=>(await page.locator('canvas[role="img"]').boundingBox())!.height).toBeLessThan(760);
 const irLeft=page.getByRole('button',{name:'IR izquierdo',exact:true});await irLeft.click();await expect(irLeft).toHaveAttribute('aria-pressed','true');await replaceCode(page,readFileSync('src/tests/reference-programs/s01-left.cpp','utf8'));await page.getByRole('button',{name:'Probar código',exact:true}).click();await expect(page.getByTestId('lcd')).toContainText('IR IZQUIERDO');await expect(page.getByTestId('lcd')).toHaveClass(/lcd-on/);await page.getByTestId('lcd').screenshot({path:'test-results/s01-lcd-activa.png'});
 await page.waitForTimeout(2200);await page.getByRole('button',{name:'Pausar',exact:true}).click();await expect(page.locator('.runtime-clock .status')).toContainText('En pausa');await page.screenshot({path:'test-results/s01-caja-movida.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await expect(page.locator('canvas[role="img"]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await page.locator('canvas[role="img"]').boundingBox())!.height).toBeLessThan(500);await page.screenshot({path:'test-results/s01-runtime-movil.png',fullPage:true});
 await page.getByRole('button',{name:/Sensores y telemetría/}).click();await expect(page.getByRole('dialog',{name:'Telemetría del IROH'})).toBeVisible();await expect(page.getByRole('dialog').getByRole('button',{name:'IR derecho',exact:true})).toBeEnabled();await expect(page.getByRole('dialog').getByRole('button',{name:'IR izquierdo',exact:true})).toHaveAttribute('aria-pressed','true');await page.screenshot({path:'test-results/premium-mobile-telemetry.png',fullPage:true});await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Detener la prueba',exact:true})).toBeVisible();
});
