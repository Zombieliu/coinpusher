import { test, expect } from '@playwright/test';
import { mockApi, setAdminSession } from './utils';

test('仪表盘展示核心指标', async ({ page }) => {
  await setAdminSession(page);

  await mockApi(page, 'admin/GetStatistics', {
    isSucc: true,
    res: {
      totalUsers: 820,
      activeUsers: 120,
      totalRevenue: 760,
      newUsersToday: 12,
      dau: 320,
      mau: 980,
      todayRevenue: 260,
      arpu: 2.5,
      arppu: 5,
      payRate: 0.35,
      totalMatches: 45,
      avgSessionTime: 18
    }
  });

  await page.goto('/dashboard');

  await expect(page.getByText('日活用户 (DAU)')).toBeVisible();
  await expect(page.getByText('在线人数')).toBeVisible();
  await expect(page.getByText('用户增长')).toBeVisible();
  await expect(page.getByText('收入趋势')).toBeVisible();
});
