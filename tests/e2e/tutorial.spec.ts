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
