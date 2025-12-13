import { test, expect } from '@playwright/test';
import { mockApi, setAdminSession, loginAsAdmin, isRemoteDashboard } from './utils';

const USE_MOCK_API = !isRemoteDashboard;
const PENDING_REFUND_ID = 'refund_demo_1';

test('退款处理页能列出申请并执行审批', async ({ page }) => {
  if (USE_MOCK_API) {
    await setAdminSession(page);

    const refunds = [
      {
        refundId: 'refund_demo_1',
        userId: 'demo_user',
        orderId: 'order_001',
        amount: 49.9,
        reason: '重复扣款',
        createdAt: Date.now(),
        status: 'pending'
      }
    ];

    let refundsLoaded = 0;
    await mockApi(page, 'admin/GetRefunds', () => {
      refundsLoaded++;
      return {
        isSucc: true,
        res: {
          refunds,
          total: refunds.length
        }
      };
    });

    await mockApi(page, 'admin/ProcessRefund', body => {
      refunds.splice(0, refunds.length);
      return {
        isSucc: true,
        res: { success: true, refundId: body.refundId }
      };
    });

    await page.goto('/dashboard/finance');
    const refundTab = page.getByRole('tab', { name: /退款处理/ });
    await expect(refundTab).toBeVisible();
    await refundTab.click();
    await expect.poll(() => refundsLoaded, { timeout: 15000 }).toBeGreaterThan(0);

    await expect(page.getByText('refund_demo_1')).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '批准' }).click();

    await expect(page.getByText('无待处理退款')).toBeVisible();
    return;
  }

  await loginAsAdmin(page);
  await page.goto('/dashboard/finance');
  await expect(page.getByRole('tab', { name: /退款处理/ })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('tab', { name: /退款处理/ }).click();
  await expect(page.getByText('待处理退款申请')).toBeVisible({ timeout: 30_000 });

  const refundRow = page.locator('[data-testid=\"refund-row\"]', { hasText: PENDING_REFUND_ID });
  await expect(refundRow).toBeVisible({ timeout: 20_000 });

  let processPayload: any;
  await page.route('**/admin/ProcessRefund', async route => {
    try {
      processPayload = route.request().postDataJSON();
    } catch {
      processPayload = undefined;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        isSucc: true,
        res: { success: true, refundId: processPayload?.refundId }
      })
    });
  });

  page.once('dialog', dialog => dialog.accept());
  await refundRow.getByRole('button', { name: '批准' }).click();
  await expect.poll(() => processPayload?.refundId ?? null, { timeout: 5000 }).toEqual(PENDING_REFUND_ID);
  expect(processPayload?.approved).toBe(true);

  await page.unroute('**/admin/ProcessRefund');
  await expect(refundRow).toBeVisible({ timeout: 15_000 });
});
