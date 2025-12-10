import { test, expect } from '@playwright/test';
import { mockApi, setAdminSession } from './utils';

test('退款处理页能列出申请并执行审批', async ({ page }) => {
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

  await mockApi(page, 'admin/GetRefunds', () => ({
    isSucc: true,
    res: {
      refunds,
      total: refunds.length
    }
  }));

  await mockApi(page, 'admin/ProcessRefund', body => {
    refunds.splice(0, refunds.length);
    return {
      isSucc: true,
      res: { success: true, refundId: body.refundId }
    };
  });

  await page.goto('/dashboard/finance');
  await page.getByRole('tab', { name: '退款处理' }).click();

  await expect(page.getByText('refund_demo_1')).toBeVisible();

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '批准' }).click();

  await expect(page.getByText('无待处理退款')).toBeVisible();
});
