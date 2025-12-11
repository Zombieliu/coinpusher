import { test, expect } from '@playwright/test';
import { mockApi, setAdminSession } from './utils';

test('批量封禁流程', async ({ page }) => {
  await setAdminSession(page);

  const payloads: any[] = [];

  await mockApi(page, 'admin/BatchBanUsers', body => {
    payloads.push(body);
    return {
      isSucc: true,
      res: { successCount: body.userIds?.length ?? 0, failCount: 0 }
    };
  });

  await page.goto('/dashboard/users/batch');

  await page.getByLabel('封禁用户列表').fill('cheater_1\ncheater_2');
  await page.getByLabel('封禁原因 (必填)').fill('违规刷号');
  await page.getByLabel('封禁时长 (小时)').fill('48');

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: /执行批量封禁/ }).click();

  await expect(page.getByText('执行结果')).toBeVisible();
  expect(payloads[0]).toMatchObject({
    userIds: ['cheater_1', 'cheater_2'],
    reason: '违规刷号',
    duration: 48
  });
});
