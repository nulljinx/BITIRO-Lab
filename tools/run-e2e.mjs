import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';

// Browser E2E covers the unauthenticated/legacy simulation release. Do not let a
// developer's real .env.local switch those tests into institutional Auth flows.
// The authenticated mentor/participant flow is covered separately by SQL/RLS
// integration checks and the manual Supabase staging checklist.
process.env.BITIRO_E2E_BUILD = '1';
process.env.VITE_SUPABASE_URL = '';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = '';
process.env.VITE_SUPABASE_ANON_KEY = '';

process.env.PORT = '5199';
process.env.BITIRO_TEST_URL = 'http://127.0.0.1:5199';

function runNode(label,args){
  console.log(`BITIRO E2E · ${label}`);
  const result=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});
  if(result.error){
    console.error(`No se pudo iniciar ${label}: ${result.error.message}`);
    process.exit(1);
  }
  if(result.status!==0)process.exit(result.status??1);
}

// E2E valida un release estático real y separado en dist-e2e, sin tocar dist de la app autenticada.
// Esto evita falsos 500 por falta de build y no contamina un release con Supabase real.
runNode('preparando release estático',['tools/build-release.mjs']);

const explicitChannel = process.env.BITIRO_BROWSER_CHANNEL?.trim();
if (!explicitChannel) {
  const executable = chromium.executablePath();
  if (!existsSync(executable)) {
    console.log('BITIRO E2E · Chromium de Playwright no está instalado. Instalando una vez...');
    const install = spawnSync(
      process.execPath,
      ['node_modules/@playwright/test/cli.js', 'install', 'chromium'],
      { stdio: 'inherit', env: process.env },
    );
    if (install.status !== 0) {
      console.error('No se pudo instalar Chromium. Ejecuta: pnpm browser:install');
      process.exit(install.status ?? 1);
    }
  }
} else {
  console.log(`BITIRO E2E · usando canal de navegador explícito: ${explicitChannel}`);
}

const { server } = await import('./serve.mjs');
if (!server.listening) {
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
}

const child = spawn(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)],
  { stdio: 'inherit', env: process.env },
);

const shutdown = () => {
  child.kill();
  server.closeAllConnections();
  server.close();
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

const code = await new Promise((resolve) => {
  child.once('error', (error) => {
    console.error(error.message);
    resolve(1);
  });
  child.once('exit', (exitCode) => resolve(exitCode ?? 1));
});

server.closeAllConnections();
await new Promise((resolve) => server.close(resolve));
process.exitCode = Number(code);
