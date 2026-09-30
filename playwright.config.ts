import { defineConfig } from '@playwright/test';

const browserChannel = process.env.BITIRO_BROWSER_CHANNEL?.trim();

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  globalTimeout: 240_000,
  use: {
    baseURL: process.env.BITIRO_TEST_URL || 'http://127.0.0.1:5199',
    ...(browserChannel ? { channel: browserChannel } : {}),
    viewport: { width: 1600, height: 1000 },
    screenshot: 'only-on-failure',
  },
});
