import { test, expect } from '@playwright/test';
import { mockApi, setAdminSession } from './utils';

test('基础与高级分析均可展示数据', async ({ page }) => {
  await setAdminSession(page);

  await mockApi(page, 'admin/GetStatistics', {
    isSucc: true,
    res: {
      totalUsers: 500,
      activeUsers: 80,
      totalRevenue: 1200,
      newUsersToday: 15,
      dau: 230,
      todayRevenue: 420,
      arpu: 4.2,
      arppu: 12.5,
      payRate: 0.28,
      totalMatches: 66,
      avgSessionTime: 22
    }
  });

  await mockApi(page, 'admin/GetLogAnalytics', {
    isSucc: true,
    res: {
      actionStats: [
        { action: 'admin/GetUsers', count: 20, percentage: 50 },
        { action: 'admin/GetOrders', count: 10, percentage: 25 }
      ],
      adminStats: [
        { adminId: 'admin_1', adminName: '运营A', operationCount: 16, lastOperation: Date.now() },
        { adminId: 'admin_2', adminName: '运营B', operationCount: 8, lastOperation: Date.now() - 10000 }
      ],
      timeDistribution: Array.from({ length: 24 }, (_, hour) => ({ hour, count: hour === 9 ? 5 : 1 })),
      dailyTrend: [
        { date: '2025-12-01', count: 12 },
        { date: '2025-12-02', count: 15 }
      ],
      totalOperations: 30,
      activeAdmins: 2,
      mostCommonAction: 'admin/GetUsers'
    }
  });

  await mockApi(page, 'admin/GetAdvancedStats', body => {
    if (body?.type === 'ltv') {
      return {
        isSucc: true,
        res: {
          data: [
            { date: '2025-12-01', ltv: 1.5 },
            { date: '2025-12-02', ltv: 1.8 }
          ]
        }
      };
    }
    return {
      isSucc: true,
      res: {
        data: [
          { date: '2025-12-01', d1: 35.2, d3: 22.1, d7: 15.5 },
          { date: '2025-12-02', d1: 33.5, d3: 21.0, d7: 14.2 }
        ]
      }
    };
  });

  await page.goto('/dashboard/analytics');

  await expect(page.getByText('总用户数')).toBeVisible();
  await expect(page.getByText('操作类型分布')).toBeVisible();
  await expect(page.getByText('管理员活跃度')).toBeVisible();

  await page.getByRole('tab', { name: '高级运营 (LTV/留存)' }).click();
  await expect(page.getByText('用户留存率')).toBeVisible();
  await expect(page.getByText('LTV (30日趋势)')).toBeVisible();
});
