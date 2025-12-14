import { defineConfig, devices } from '@playwright/test';

const LOCAL_URL = 'http://127.0.0.1:3003';
const BASE_URL = process.env.E2E_BASE_URL || LOCAL_URL;
const shouldStartServer = !process.env.E2E_BASE_URL;

// 本地 e2e 默认启用 mock，避免命中真实网关
if (shouldStartServer && !process.env.E2E_MOCK) {
  process.env.E2E_MOCK = '1';
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ],
  webServer: shouldStartServer
    ? {
        command: 'npx next dev --hostname 127.0.0.1 -p 3003',
        url: `${LOCAL_URL}/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          NEXT_PUBLIC_API_URL: '',
          E2E_MOCK: '1'
        }
      }
    : undefined
});
