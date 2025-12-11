import { expect, Page } from '@playwright/test';

export type ApiResponder = (payload: any) => Promise<ApiResponse> | ApiResponse;

export interface ApiResponse {
  isSucc: boolean;
  res?: any;
  err?: {
    message: string;
    type?: string;
  };
}

export const isRemoteDashboard = Boolean(process.env.E2E_BASE_URL);

interface AdminCredentials {
  username?: string;
  password?: string;
}

export async function loginAsAdmin(page: Page, credentials?: AdminCredentials) {
  const username = credentials?.username || process.env.E2E_ADMIN_USERNAME || 'admin';
  const password = credentials?.password || process.env.E2E_ADMIN_PASSWORD || 'admin123';

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: '运营后台登录' })).toBeVisible({
    timeout: 30_000
  });

  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: /登录/ }).click();
  await page.waitForURL('**/dashboard*', { timeout: 30_000 });
}

export async function mockApi(
  page: Page,
  endpoint: string,
  responder: ApiResponder | ApiResponse
) {
  await page.route(`**/${endpoint}`, async route => {
    const payload = safelyParse(route);
    const body =
      typeof responder === 'function'
        ? await responder(payload)
        : responder;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body ?? { isSucc: true })
    });
  });
}

export async function setAdminSession(page: Page, username = 'admin_tester') {
  await page.addInitScript(args => {
    window.localStorage.setItem('admin_token', args.token);
    window.localStorage.setItem('admin_user', JSON.stringify(args.admin));
  }, {
    token: 'mock-token',
    admin: {
      adminId: 'admin_mock',
      username
    }
  });
}

export async function expectDashboardLoaded(page: Page) {
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText('日活用户', { exact: false })).toBeVisible();
}

function safelyParse(route: any) {
  try {
    return route.request().postDataJSON();
  } catch {
    return {};
  }
}
