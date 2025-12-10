import { test, expect } from '@playwright/test';
import { mockApi, expectDashboardLoaded, ApiResponse } from './utils';

test.describe('后台登录流程', () => {
  test('输入账号密码后能够成功跳转至仪表盘', async ({ page }) => {
    await mockApi(page, 'admin/AdminLogin', body => {
      if (!body?.username || !body?.password) {
        return { isSucc: false, err: { message: 'missing credentials' } };
      }
      return {
        isSucc: true,
        res: {
          success: true,
          token: 'mock-token',
          admin: {
            adminId: 'mock-admin',
            username: body.username
          }
        }
      } satisfies ApiResponse;
    });

    await mockApi(page, 'admin/GetStatistics', {
      isSucc: true,
      res: {
        totalUsers: 200,
        activeUsers: 40,
        totalRevenue: 800,
        newUsersToday: 5
      }
    });

    await page.goto('/login');

    await expect(page.getByRole('heading', { name: '运营后台登录' })).toBeVisible();

    await page.getByLabel('用户名').fill('admin');
    await page.getByLabel('密码').fill('admin123');
    await page.getByRole('button', { name: /登录/ }).click();

    await page.waitForURL('**/dashboard*', { timeout: 10_000 });
    await expectDashboardLoaded(page);
  });
});
