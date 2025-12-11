import { test, expect } from '@playwright/test';
import { mockApi, setAdminSession } from './utils';

test('邀请排行榜与配置管理流程', async ({ page }) => {
  await setAdminSession(page);

  const leaderboardCalls: any[] = [];
  const updatePayloads: any[] = [];
  let exportTriggered = false;

  await mockApi(page, 'admin/GetInviteLeaderboard', body => {
    leaderboardCalls.push(body);
    return {
      isSucc: true,
      res: {
        list: [
          {
            userId: 'user_alpha',
            inviteCode: 'INV1234',
            inviteLink: 'https://example.com',
            totalInvites: 12,
            validInvites: 10,
            totalRewards: 150,
            rank: 1
          }
        ],
        total: 1,
        page: body.page || 1,
        pageSize: 20,
        summary: {
          totalInvites: 12,
          totalRewards: 150,
          totalInviters: 1,
          todaysNewInvites: 2
        },
        configVersion: 3
      }
    };
  });

  await mockApi(page, 'admin/ExportInviteLeaderboard', body => {
    exportTriggered = true;
    return {
      isSucc: true,
      res: {
        fileName: 'invite.csv',
        csvBase64: Buffer.from('rank,user').toString('base64'),
        generatedAt: Date.now(),
        total: 1
      }
    };
  });

  await mockApi(page, 'admin/GetInviteRewardConfig', {
    isSucc: true,
    res: {
      version: 3,
      updatedAt: Date.now(),
      updatedBy: { username: 'tester' },
      config: {
        registerReward: 5,
        registerRewardInviter: 5,
        firstChargeRate: 10,
        level10Reward: 50,
        level20Reward: 100,
        level30Reward: 150
      }
    }
  });

  await mockApi(page, 'admin/UpdateInviteRewardConfig', body => {
    updatePayloads.push(body);
    return {
      isSucc: true,
      res: { success: true, version: 4 }
    };
  });

  await mockApi(page, 'admin/GetInviteRewardHistory', {
    isSucc: true,
    res: {
      history: [
        {
          historyId: 'h1',
          version: 2,
          updatedAt: Date.now() - 1000,
          updatedBy: { username: 'ops' },
          comment: '旧版本'
        }
      ]
    }
  });

  await page.goto('/dashboard/invite');
  await expect(page.getByRole('heading', { name: '邀请系统', level: 1 })).toBeVisible();
  await expect(page.getByText('user_alpha')).toBeVisible();

  await page.getByPlaceholder('搜索用户ID / 邀请码').fill('alpha');
  await page.getByRole('button', { name: '搜索' }).click();
  expect(leaderboardCalls[leaderboardCalls.length - 1].search).toBe('alpha');

  await page.getByRole('button', { name: '导出 CSV' }).click({ noWaitAfter: true });
  await expect.poll(() => exportTriggered, { timeout: 5000 }).toBeTruthy();

  await page.getByRole('heading', { name: '奖励配置' }).scrollIntoViewIfNeeded();
  const registerInput = page.locator('label:has-text("注册奖励（被邀请人）")').locator('..').locator('input');
  await registerInput.waitFor({ state: 'visible', timeout: 15000 });
  await registerInput.fill('8');
  await page.getByPlaceholder('记录本次调整的原因').fill('加大注册激励');
  await page.getByRole('button', { name: '保存配置' }).click();
  expect(updatePayloads[0].config.registerReward).toBe(8);
  expect(updatePayloads[0].comment).toBe('加大注册激励');

  await page.getByRole('button', { name: '查看历史' }).click();
  await expect(page.getByRole('columnheader', { name: '版本' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '旧版本' })).toBeVisible();
});
