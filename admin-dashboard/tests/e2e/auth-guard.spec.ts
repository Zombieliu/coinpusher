import { test, expect } from '@playwright/test';

test('未登录访问受保护页面时跳转登录', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto('/dashboard/finance');
  await page.waitForURL('**/login');
  await expect(page.getByRole('heading', { name: '运营后台登录' })).toBeVisible();
});
