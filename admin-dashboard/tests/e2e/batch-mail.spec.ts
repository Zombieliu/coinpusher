import { test, expect } from '@playwright/test';
import { mockApi, setAdminSession } from './utils';

test('批量邮件发送流程', async ({ page }) => {
  await setAdminSession(page);

  const receivedPayloads: any[] = [];

  await mockApi(page, 'admin/BatchSendMail', body => {
    receivedPayloads.push(body);
    return {
      isSucc: true,
      res: { successCount: body.userIds?.length ?? 0, failCount: 0 }
    };
  });

  await page.goto('/dashboard/users/batch');
  await page.getByRole('tab', { name: '批量邮件/奖励' }).click();

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'users.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('user_a\nuser_b')
  });
  await page.getByLabel('邮件标题').fill('测试奖励');
  await page.getByLabel('邮件内容').fill('感谢参与活动');
  await page.getByLabel('附带金币 (可选)').fill('100');
  await page.getByLabel('附带彩票 (可选)').fill('5');

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: /批量发送/ }).click();

  await expect(page.getByText('发送结果')).toBeVisible();
  expect(receivedPayloads[0].userIds).toEqual(['user_a', 'user_b']);
  expect(receivedPayloads[0].rewards).toEqual({ gold: 100, tickets: 5 });
});
