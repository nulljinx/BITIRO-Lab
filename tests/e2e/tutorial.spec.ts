import {test,expect} from '@playwright/test';

test('first simulator visit explains the lab, highlights Guía and stays dismissed afterwards',async({page})=>{
 await page.goto('/intermedio/s01');
 const dialog=page.getByRole('dialog',{name:/Bienvenido al laboratorio BITIRO/});
 await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'Siguiente',exact:true}).click();
 await expect(page.getByRole('heading',{name:'La Guía está siempre disponible'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Abrir guía y conceptos',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Cerrar tutorial',exact:true}).click();
 await expect(dialog).toHaveCount(0);
 await page.reload();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 await expect(page.getByRole('dialog',{name:/Bienvenido al laboratorio BITIRO/})).toBeVisible();
});

const insideTour=()=>page=>page.evaluate(()=>{const dialog=document.querySelector('.sim-tour-root');return !!dialog&&dialog.contains(document.activeElement);});

test('tutorial dialog contains focus, keeps Monaco out of reach and restores focus to its opener',async({page})=>{
 await page.goto('/intermedio/s01');
 const dialog=page.getByRole('dialog',{name:/Bienvenido al laboratorio BITIRO/});
 await expect(dialog).toBeVisible();
 // Initial focus lands on the step title, and the app behind the dialog is inert.
 await expect(dialog.getByRole('heading',{name:/Bienvenido/})).toBeFocused();
 expect(await page.evaluate(()=>document.getElementById('root')!.hasAttribute('inert'))).toBe(true);
 await expect(dialog).toContainText('Esc para cerrar');
 // Go to the editor step, so Monaco is on screen while the dialog is open.
 for(let i=0;i<5;i++)await page.getByRole('dialog').getByRole('button',{name:'Siguiente',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Escribe tu programa'})).toBeVisible();
 const view=page.locator('.monaco-editor .view-lines').first();
 await expect(view).toBeVisible();
 const before=await view.textContent();
 for(let i=0;i<40;i++){
  await page.keyboard.press(i%3===2?'Shift+Tab':'Tab');
  expect(await insideTour()(page),`focus inside dialog after key ${i}`).toBe(true);
  expect(await page.evaluate(()=>!!document.activeElement?.closest('.monaco-editor'))).toBe(false);
 }
 expect(await view.textContent()).toBe(before);
 // Forward wrap: after the last control Tab returns to the first one inside the dialog.
 await page.keyboard.press('Shift+Tab');await page.keyboard.press('Shift+Tab');
 expect(await insideTour()(page)).toBe(true);
 // Closing with Escape unblocks the app and restores focus (first-run tour has no opener, so reopen from the button).
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(await page.evaluate(()=>document.getElementById('root')!.hasAttribute('inert'))).toBe(false);
 const opener=page.getByRole('button',{name:'Tutorial',exact:true});
 await opener.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('dialog',{name:/Bienvenido/})).toBeVisible();
 await page.keyboard.press('Tab');
 expect(await insideTour()(page)).toBe(true);
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(opener).toBeFocused();
});

test('tutorial keeps focus in the dialog through the last step and returns it on finish',async({page})=>{
 await page.goto('/intermedio/s01');
 const dialog=page.getByRole('dialog',{name:/Bienvenido/});
 await expect(dialog).toBeVisible();
 for(let i=0;i<8;i++){
  await page.keyboard.press('ArrowRight');
 }
 await expect(page.getByRole('heading',{name:'Comprueba los objetivos'})).toBeVisible();
 expect(await insideTour()(page)).toBe(true);
 await page.getByRole('button',{name:'Comenzar'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(await page.evaluate(()=>document.getElementById('root')!.hasAttribute('inert'))).toBe(false);
});
