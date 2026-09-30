import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const browserChannel = process.env.BITIRO_BROWSER_CHANNEL?.trim();
const browser = await chromium.launch({
  ...(browserChannel ? { channel: browserChannel } : {}),
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
await mkdir('test-results/visual', { recursive: true });
for (const [name, path, width, height] of [
  ['explorer', '/intermedio', 1440, 1000],
  ['mobile', '/intermedio', 390, 844],
  ['register', '/registro', 1440, 1000],
  ['lab', '/intermedio/s01', 1440, 1000],
  ['lab-mobile', '/intermedio/s01', 390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page.goto('http://127.0.0.1:5198' + path);
  if (path.endsWith('s01')) await page.locator('.monaco-editor').waitFor();
  else await page.locator('h1').waitFor();
  await page.locator('.brand-loading').waitFor({ state: 'hidden' });
  await page.evaluate(() => document.fonts.ready);
  if (path.endsWith('s01')) {
    await page.getByRole('button', { name: 'Ejecutar en simulador', exact: true }).waitFor();
  }
  await page.screenshot({ path: `test-results/visual/${name}.png`, fullPage: true });
  await page.evaluate(await readFile('node_modules/axe-core/axe.min.js', 'utf8'));
  const accessibility = await page.evaluate(() =>
    axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }),
  );
  console.log(
    name,
    JSON.stringify({
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      violations: accessibility.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
        })),
      })),
    }),
  );
}
console.log('errors', errors);
await writeFile('test-results/visual/errors.json', JSON.stringify(errors, null, 2));
await browser.close();
