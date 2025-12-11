import { test, expect } from '@playwright/test';
import { mockApi, setAdminSession } from './utils';
import { buildOrder } from './fixtures/dataBuilder';

test('财务订单筛选', async ({ page }) => {
  await setAdminSession(page);

  const paidOrder = buildOrder({ orderId: 'order_paid', status: 'paid', productName: '豪华礼包' });
  const deliveredOrder = buildOrder({ orderId: 'order_delivered', status: 'delivered', productName: '补给礼包' });

  let ordersLoaded = 0;
  await mockApi(page, 'admin/GetOrders', body => {
    ordersLoaded++;
    if (body?.status === 'paid') {
      return {
        isSucc: true,
        res: { orders: [paidOrder], total: 1 }
      };
    }
    return {
      isSucc: true,
      res: { orders: [paidOrder, deliveredOrder], total: 2 }
    };
  });

  let updatedPayload: any;
  await mockApi(page, 'admin/UpdateOrderStatus', body => {
    updatedPayload = body;
    return {
      isSucc: true,
      res: { success: true }
    };
  });

  let deliverPayload: any;
  await mockApi(page, 'admin/DeliverOrder', body => {
    deliverPayload = body;
    return { isSucc: true, res: { success: true } };
  });

  let resendPayload: any;
  await mockApi(page, 'admin/ResendOrderReward', body => {
    resendPayload = body;
    return { isSucc: true, res: { success: true } };
  });

  await page.goto('/dashboard/finance');
  await expect.poll(() => ordersLoaded, { timeout: 15000 }).toBeGreaterThan(0);
  await expect(page.getByText('order_paid')).toBeVisible();
  await expect(page.getByText('order_delivered')).toBeVisible();

  await page.getByPlaceholder('订单号').fill('order');
  await page.getByPlaceholder('用户ID').fill('user');
  await page.locator('[aria-label="订单状态筛选"]').click();
  await page.getByRole('option', { name: '已支付' }).click();
  await page.getByRole('button', { name: '搜索' }).click();

  await expect(page.getByText('order_paid')).toBeVisible();
  await expect(page.getByText('order_delivered')).toHaveCount(0);

  await page.getByRole('button', { name: '更新状态' }).first().click();
  await page.getByRole('combobox', { name: '订单状态' }).click();
  await page.getByRole('option', { name: '已发货' }).click();
  await page.getByRole('button', { name: '保存' }).click();

  expect(updatedPayload).toMatchObject({ orderId: paidOrder.orderId, status: 'delivered' });

  const paidRow = page.locator('tr', { hasText: 'order_paid' });
  page.once('dialog', dialog => dialog.accept());
  await paidRow.getByRole('button', { name: '标记发货' }).click();
  await page.waitForResponse(resp =>
    resp.url().includes('admin/DeliverOrder') && resp.request().method() === 'POST'
  );
  expect(deliverPayload).toMatchObject({ orderId: paidOrder.orderId });

  const deliveredRow = page.locator('tr', { hasText: 'order_delivered' });
  page.once('dialog', dialog => dialog.accept());
  await deliveredRow.getByRole('button', { name: '重发奖励' }).click();
  await page.waitForResponse(resp =>
    resp.url().includes('admin/ResendOrderReward') && resp.request().method() === 'POST'
  );
  expect(resendPayload).toMatchObject({ orderId: deliveredOrder.orderId });
});
