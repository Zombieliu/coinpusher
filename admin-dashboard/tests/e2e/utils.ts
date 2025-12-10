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
