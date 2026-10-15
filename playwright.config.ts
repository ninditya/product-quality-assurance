import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// URLs and credentials come from environment variables. A local `.env` (git-ignored) wins;
// otherwise `.env.example` supplies the public demo accounts, so a clean clone can run the suite.
// Running is not the same as passing: tests that find defects fail on purpose.
process.loadEnvFile(existsSync('.env') ? '.env' : '.env.example');

export default defineConfig({
  fullyParallel: false,
  // One worker: the demo is shared with many users and slows down under parallel load.
  workers: 1,
  forbidOnly: !!process.env.CI,
  // No local retries, so flaky tests stay visible; one retry in CI only.
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Trace only on the first retry: with a trace on every attempt, Playwright intermittently failed
    // passing tests with ENOENT on API-context trace files during teardown (seen during development).
    trace: 'on-first-retry',
    // The app exposes stable `data-test` attributes; getByTestId() uses them.
    testIdAttribute: 'data-test',
  },
  projects: [
    {
      name: 'ui',
      testDir: './ui-tests/specs',
      timeout: 120_000,
      expect: { timeout: 10_000 },
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.UI_BASE_URL,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
      },
    },
    {
      name: 'api',
      testDir: './api-tests/specs',
      timeout: 30_000,
      use: {
        baseURL: process.env.API_BASE_URL,
        extraHTTPHeaders: { Accept: 'application/json' },
      },
    },
  ],
});
