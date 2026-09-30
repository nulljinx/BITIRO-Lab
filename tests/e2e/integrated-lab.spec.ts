import {test,expect} from '@playwright/test';

test('focus mode retains the editor and switches between 2D and 3D views',async({page})=>{
 await page.goto('/intermedio/s01');
 await expect(page.locator('.monaco-editor')).toBeVisible();
 const perspective=page.getByRole('img',{name:/Vista tridimensional de S01/});
 await expect(perspective).toBeVisible();
 await page.getByRole('button',{name:'Vista superior',exact:true}).click();
 const top=page.getByRole('img',{name:/Pista interactiva S01/});
 await expect(top).toBeVisible();
 await page.getByRole('button',{name:'Vista 3D',exact:true}).click();
 await expect(perspective).toBeVisible();
 await page.getByRole('button',{name:'Seguir IROH'}).click();
 await expect(page.getByRole('button',{name:'Seguir IROH'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:/Ocultar código/}).click();
 await expect(page.locator('.editor-column')).toBeHidden();
 await expect(perspective).toBeVisible();
 await page.getByRole('button',{name:/Mostrar código/}).click();
 await expect(page.locator('.monaco-editor')).toBeVisible();
 await page.getByRole('button',{name:'Vista superior',exact:true}).click();
 await expect(top).toBeVisible();
});
