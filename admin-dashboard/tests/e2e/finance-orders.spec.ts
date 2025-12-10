import { test, expect } from '@playwright/test';
import { mockApi, setAdminSession } from './utils';
import { buildOrder } from './fixtures/dataBuilder';

test('财务订单筛选', async ({ page }) => {
  await setAdminSession(page);

  const paidOrder = buildOrder({ orderId: 'order_paid', status: 'paid', productName: '豪华礼包' });
  const pendingOrder = buildOrder({ orderId: 'order_pending', status: 'pending', productName: '入门礼包' });

  await mockApi(page, 'admin/GetOrders', body => {
    if (body?.status === 'paid') {
      return {
        isSucc: true,
        res: { orders: [paidOrder], total: 1 }
      };
    }
    return {
      isSucc: true,
      res: { orders: [paidOrder, pendingOrder], total: 2 }
    };
  });

  await page.goto('/dashboard/finance');

  await expect(page.getByText('order_paid')).toBeVisible();
  await expect(page.getByText('order_pending')).toBeVisible();

  await page.getByPlaceholder('订单号').fill('order');
  await page.getByPlaceholder('用户ID').fill('user');
  await page.locator('[aria-label="订单状态筛选"]').click();
  await page.getByRole('option', { name: '已支付' }).click();
  await page.getByRole('button', { name: '搜索' }).click();

  await expect(page.getByText('order_paid')).toBeVisible();
  await expect(page.getByText('order_pending')).toHaveCount(0);
});
