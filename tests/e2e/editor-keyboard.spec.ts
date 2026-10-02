import {test,expect,type Page} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('bitiro:v7:simulator-tutorial:guest','done'));
});
const state=(page:Page)=>page.evaluate(()=>({inEditor:!!document.activeElement?.closest('.monaco-editor'),length:document.querySelector('.monaco-editor .view-lines')?.textContent?.length??0,tag:document.activeElement?.tagName??''}));
async function enterEditor(page:Page){
 await page.goto('/intermedio/s01');
 await page.locator('.monaco-editor .view-lines').first().click();
 expect((await state(page)).inEditor).toBe(true);
}

test('Tab still indents by default and Ctrl+M lets keyboard users leave and re-enter the editor',async({page})=>{
 await enterEditor(page);
 const start=await state(page);
 // Original problem (audit N5): none of these moved focus out of the editor.
 await page.keyboard.press('Tab');
 expect((await state(page)).inEditor).toBe(true);
 // Monaco renders asynchronously: poll for the inserted indentation instead of reading once.
 await expect.poll(async()=>(await state(page)).length).toBeGreaterThan(start.length);
 await page.keyboard.press('Escape');await page.keyboard.press('Tab');
 expect((await state(page)).inEditor).toBe(true);
 // The editor announces the exit path to assistive technology.
 await expect(page.locator('.monaco-editor textarea').first()).toHaveAttribute('aria-label',/Control\+M/);
 // The documented exit.
 await page.keyboard.press('Control+m');
 await expect(page.getByRole('status').filter({hasText:'Tab ahora mueve el foco'})).toHaveCount(1);
 await expect(page.getByRole('button',{name:/Navegar con Tab/})).toHaveAttribute('aria-pressed','true');
 const before=(await state(page)).length;
 await page.keyboard.press('Tab');
 const out=await state(page);
 expect(out.inEditor).toBe(false);expect(out.length).toBe(before);expect(out.tag).not.toBe('BODY');
 // Shift+Tab walks back into the editor, and the same shortcut restores indentation.
 await page.keyboard.press('Shift+Tab');
 expect((await state(page)).inEditor).toBe(true);
 await page.keyboard.press('Control+m');
 await expect(page.getByRole('button',{name:/Navegar con Tab/})).toHaveAttribute('aria-pressed','false');
 await expect(page.getByRole('status').filter({hasText:'Tab ahora inserta sangría'})).toHaveCount(1);
 const again=(await state(page)).length;
 await page.keyboard.press('Tab');
 expect((await state(page)).inEditor).toBe(true);
 await expect.poll(async()=>(await state(page)).length).toBeGreaterThan(again);
});

test('the visible toolbar switch is keyboard operable and exposes its state',async({page})=>{
 await page.goto('/intermedio/s01');
 const toggle=page.getByRole('button',{name:/Navegar con Tab/});
 await expect(toggle).toBeVisible();await expect(toggle).toHaveAttribute('aria-pressed','false');
 await expect(toggle).toContainText('Tab: sangra');
 await toggle.focus();await page.keyboard.press('Enter');
 await expect(toggle).toHaveAttribute('aria-pressed','true');await expect(toggle).toContainText('Tab: navega');
 // With the switch on, entering the editor by keyboard and pressing Tab does not trap focus.
 await page.locator('.monaco-editor .view-lines').first().click();
 const before=(await state(page)).length;
 await page.keyboard.press('Tab');
 const out=await state(page);expect(out.inEditor).toBe(false);expect(out.length).toBe(before);
 await toggle.focus();await page.keyboard.press('Space');
 await expect(toggle).toHaveAttribute('aria-pressed','false');
});
