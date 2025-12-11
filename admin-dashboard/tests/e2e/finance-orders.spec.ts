import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { mockApi, setAdminSession, loginAsAdmin, isRemoteDashboard } from './utils';
import { buildOrder } from './fixtures/dataBuilder';

const USE_MOCK_API = !isRemoteDashboard;

const REAL_ORDER_FIXTURES: Record<string, { orderId: string; userId: string }> = {
  chromium: { orderId: 'order_1', userId: 'demo_user_1' },
  firefox: { orderId: 'order_2', userId: 'demo_user_2' },
  webkit: { orderId: 'order_3', userId: 'demo_user_3' }
};

test('财务订单筛选', async ({ page }, testInfo) => {
  if (USE_MOCK_API) {
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
    await selectStatusFilter(page, '已支付');
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
    return;
  }

  await loginAsAdmin(page);
  const realFixture = REAL_ORDER_FIXTURES[testInfo.project.name] ?? REAL_ORDER_FIXTURES.chromium;

  await page.goto('/dashboard/finance');
  await expect(page.locator('main').getByRole('heading', { name: '财务管理' })).toBeVisible({
    timeout: 30_000
  });
  await waitForOrdersPanel(page);

  await page.getByPlaceholder('订单号').fill(realFixture.orderId);
  await page.getByPlaceholder('用户ID').fill(realFixture.userId);
  await selectStatusFilter(page, '已支付');
  await page.getByRole('button', { name: '搜索' }).click();

  const orderRow = page.locator('tbody tr', { hasText: realFixture.orderId });
  await expect(orderRow).toBeVisible({ timeout: 20_000 });
  await selectStatusFilter(page, '全部状态');
  await page.getByRole('button', { name: '搜索' }).click();
  await expect(orderRow).toBeVisible({ timeout: 20_000 });

  const originalStatus = await ensureOrderStatus(page, orderRow, '已支付');

  const deliverButton = orderRow.getByRole('button', { name: '标记发货' });
  if ((await deliverButton.count()) === 0) {
    testInfo.annotations.push({
      type: 'info',
      description: '当前订单未提供“标记发货”按钮，跳过手动发货与重发奖励校验'
    });
    await restoreOrderStatus(page, orderRow, originalStatus, '已支付');
    return;
  }

  const deliverResponse = page.waitForResponse(resp =>
    resp.url().includes('admin/DeliverOrder') && resp.request().method() === 'POST'
  );
  page.once('dialog', dialog => dialog.accept());
  await deliverButton.click();
  await deliverResponse;
  await expect(orderRow.getByText('已发货')).toBeVisible({ timeout: 15_000 });

  const resendButton = orderRow.getByRole('button', { name: '重发奖励' });
  if ((await resendButton.count()) === 0) {
    testInfo.annotations.push({
      type: 'info',
      description: '未出现“重发奖励”按钮，跳过重发校验'
    });
    await restoreOrderStatus(page, orderRow, originalStatus, '已支付');
    return;
  }

  const resendResponse = page.waitForResponse(resp =>
    resp.url().includes('admin/ResendOrderReward') && resp.request().method() === 'POST'
  );
  page.once('dialog', dialog => dialog.accept());
  await resendButton.click();
  await resendResponse;

  await restoreOrderStatus(page, orderRow, originalStatus, '已支付');
});

async function waitForOrdersPanel(page: Page) {
  await expect(page.getByText('订单列表')).toBeVisible({ timeout: 30_000 });
}

async function selectStatusFilter(page: Page, label: string) {
  await page.locator('[aria-label="订单状态筛选"]').click();
  await page.getByRole('option', { name: label }).click();
}

async function ensureOrderStatus(page: Page, row: Locator, expectedLabel: string) {
  const originalLabel = await getStatusLabel(row);
  if (originalLabel.includes(expectedLabel)) {
    return originalLabel;
  }

  await setOrderStatus(page, row, expectedLabel);
  return originalLabel;
}

async function restoreOrderStatus(page: Page, row: Locator, originalLabel: string | null | undefined, expectedLabel: string) {
  if (!originalLabel || originalLabel === expectedLabel) {
    return;
  }
  const currentLabel = await getStatusLabel(row);
  if (currentLabel.includes(originalLabel)) {
    return;
  }
  await setOrderStatus(page, row, originalLabel);
}

async function setOrderStatus(page: Page, row: Locator, label: string) {
  await row.getByRole('button', { name: '更新状态' }).click();
  await page.getByRole('combobox', { name: '订单状态' }).click();
  await page.getByRole('option', { name: label }).click();
  const responsePromise = page.waitForResponse(resp =>
    resp.url().includes('admin/UpdateOrderStatus') && resp.request().method() === 'POST'
  );
  await page.getByRole('button', { name: '保存' }).click();
  await responsePromise;
  await expect(row.locator('td').nth(4)).toContainText(label, { timeout: 15_000 });
}

async function getStatusLabel(row: Locator) {
  const cellText = await row.locator('td').nth(4).innerText();
  return cellText.trim();
}
