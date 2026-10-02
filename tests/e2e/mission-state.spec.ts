import {test,expect,type Page} from '@playwright/test';
import {mentorSolutions} from '../../src/content/mentor-solutions';

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('bitiro:v7:simulator-tutorial:guest','done'));
});
const replaceCode=async(page:Page,source:string)=>{
 const normalized=source.replaceAll('\r\n','\n');
 const editor=page.getByRole('textbox',{name:/Código Arduino/});await expect(editor).toBeVisible();await editor.focus();
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);
 await page.evaluate(text=>navigator.clipboard.writeText(text),normalized);
 await page.keyboard.press('Control+Home');await page.keyboard.press('Control+Shift+End');await page.keyboard.press('Control+V');
 await expect.poll(()=>page.evaluate(()=>{const raw=localStorage.getItem('bitiro:v7:guest:code:s01');return raw?String(JSON.parse(raw).code??'').trim():'';})).toBe(normalized.trim());
};

test('S01: a passed mission stays coherent after Detener and Restablecer starts a new attempt',async({page})=>{
 test.setTimeout(120_000);
 await page.goto('/intermedio/s01');
 const summary=page.locator('.mission-panel summary');
 await expect(summary).toContainText('0/4');await expect(summary).toContainText('Ver objetivos');
 await page.getByRole('button',{name:'IR izquierdo',exact:true}).click();
 await replaceCode(page,mentorSolutions.s01.source);
 await page.getByLabel('Velocidad').selectOption('2');
 await page.getByRole('button',{name:'Probar código',exact:true}).click();
 await expect(summary).toContainText('Intento en curso');
 await expect(summary).toContainText('Superada en este intento',{timeout:90_000});
 await expect(summary).toContainText('4/4');
 await expect(page.locator('.feedback-panel')).toContainText('Misión superada en este intento');
 // Detener: no "0/4 + superada", no downgrade of the result.
 await page.getByRole('button',{name:'Detener la prueba',exact:true}).click();
 await expect(page.locator('.runtime-clock .status')).not.toContainText('Ejecutando');
 await expect(summary).toContainText('4/4');await expect(summary).toContainText('Superada en este intento');
 await expect(page.locator('.mission-panel li svg.lucide-check')).toHaveCount(4);
 // Restablecer: a new attempt; the earlier pass is acknowledged, not erased.
 await page.getByRole('button',{name:'Restablecer',exact:true}).click();
 await expect(summary).toContainText('0/4');await expect(summary).toContainText('Reiniciada · nuevo intento');
 await expect(page.locator('.mission-panel')).toContainText('Ya superaste esta misión antes');
 await expect(summary).not.toContainText('Superada');
});
