import {test,expect} from '@playwright/test';

// Most E2E tests exercise the laboratory itself, not the first-run onboarding.
// Keep the tutorial covered by its own behavior while preventing its modal guard
// from intercepting unrelated interaction tests.
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('bitiro:v7:simulator-tutorial:guest','done'));
});

test('focus mode retains the editor and switches between 2D and 3D views',async({page})=>{
 await page.goto('/intermedio/s01');
 await expect(page.locator('.monaco-editor')).toBeVisible();
 const perspective=page.getByRole('img',{name:/Vista tridimensional de S01/});
 await expect(perspective).toBeVisible();
 await page.getByRole('button',{name:'Superior',exact:true}).click();
 const top=page.getByRole('img',{name:/Pista interactiva S01/});
 await expect(top).toBeVisible();
 await page.getByRole('button',{name:'Perspectiva',exact:true}).click();
 await expect(perspective).toBeVisible();
 await page.getByRole('button',{name:'Seguir IROH'}).click();
 await expect(page.getByRole('button',{name:'Seguir IROH'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:/Ocultar código/}).click();
 await expect(page.locator('.editor-column')).toBeHidden();
 await expect(perspective).toBeVisible();
 await page.getByRole('button',{name:/Mostrar código/}).click();
 await expect(page.locator('.monaco-editor')).toBeVisible();
 await page.getByRole('button',{name:'Superior',exact:true}).click();
 await expect(top).toBeVisible();
});
