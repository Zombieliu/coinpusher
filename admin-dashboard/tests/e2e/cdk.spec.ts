import { test, expect } from '@playwright/test';
import { mockApi, setAdminSession } from './utils';
import { buildCdk } from './fixtures/dataBuilder';

test('CDK 生成与禁用流程', async ({ page }) => {
  await setAdminSession(page);

  const records = [
    buildCdk({
      code: 'VIP-AAA111',
      name: '周年礼包',
      rewards: { gold: 150, tickets: 3 }
    })
  ];

  const generatedPayloads: any[] = [];
  const disabledCodes: string[] = [];

  await mockApi(page, 'admin/GetCdkList', () => ({
    isSucc: true,
    res: { list: records, total: records.length }
  }));

  await mockApi(page, 'admin/GenerateCdk', body => {
    generatedPayloads.push(body);
    const newCode = `VIP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    records.unshift(buildCdk({ code: newCode, name: body.name, rewards: body.rewards }));
    return {
      isSucc: true,
      res: { codes: [newCode] }
    };
  });

  await mockApi(page, 'admin/DisableCdk', body => {
    disabledCodes.push(body.code);
    const target = records.find(r => r.code === body.code);
    if (target) {
      target.active = false;
    }
    return { isSucc: true, res: { success: true } };
  });

  await page.goto('/dashboard/cdk');
  await expect(page.getByText('周年礼包')).toBeVisible();

  await page.getByRole('button', { name: '生成CDK' }).click();
  await page.getByLabel('批次名称').fill('春季礼包');
  await page.getByLabel('金币奖励').fill('200');
  await page.getByLabel('彩票奖励').fill('5');
  await page.getByLabel('前缀 (可选)').fill('SPR');
  await page.getByLabel('有效期 (天)').fill('10');

  await page.getByRole('button', { name: '确认生成' }).click();
  await page.getByRole('button', { name: '复制全部' }).click();
  expect(generatedPayloads[0]).toMatchObject({
    name: '春季礼包',
    rewards: { gold: 200, tickets: 5 }
  });
  await page.getByRole('button', { name: '复制全部' }).press('Escape');
  await expect(page.getByText('生成成功')).toBeHidden();
  const dialogHandler = (dialog: any) => {
    if (dialog.type() === 'confirm') {
      dialog.accept();
    } else if (dialog.type() === 'prompt') {
      dialog.accept('测试原因');
    } else {
      dialog.dismiss();
    }
  };
  page.on('dialog', dialogHandler);
  const targetRow = page.locator('tr', { hasText: 'VIP-AAA111' });
  await targetRow.getByTitle('禁用此CDK').click();
  await expect(page.getByText('已失效')).toBeVisible();
  page.off('dialog', dialogHandler);
  expect(disabledCodes).toContain('VIP-AAA111');
});
