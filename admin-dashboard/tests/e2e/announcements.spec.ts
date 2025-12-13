import { test, expect } from '@playwright/test';
import { mockApi, setAdminSession } from './utils';
import { buildAnnouncement } from './fixtures/dataBuilder';

test('公告列表展示并支持创建新公告', async ({ page }) => {
  await setAdminSession(page);

  const now = Date.now();
  const announcements = [buildAnnouncement({ title: '系统维护通知', startTime: now - 3600000, endTime: now + 3600000 })];

  await mockApi(page, 'admin/GetAnnouncements', () => ({
    isSucc: true,
    res: {
      success: true,
      list: announcements,
      total: announcements.length
    }
  }));

  await mockApi(page, 'admin/CreateAnnouncement', body => {
    const nextId = `ann_${announcements.length + 1}`;
    announcements.push({
      announcementId: nextId,
      type: body.type,
      title: body.title,
      content: body.content,
      startTime: body.startTime,
      endTime: body.endTime,
      priority: body.priority ?? 0,
      active: true
    });
    return {
      isSucc: true,
      res: {
        success: true,
        announcementId: nextId
      }
    };
  });

  await page.goto('/dashboard/announcements');

  await expect(page.getByText('系统维护通知')).toBeVisible();

  await page.getByRole('button', { name: '发布公告' }).click();
  await expect(page.getByText('发布新公告')).toBeVisible();

  const start = '2025-12-01T10:00';
  const end = '2025-12-07T10:00';

  await page.getByLabel('标题').fill('双旦活动公告');
  await page.getByLabel('内容').fill('双旦期间登录送福利。');
  await page.getByLabel('开始时间').fill(start);
  await page.getByLabel('结束时间').fill(end);
  await page.getByRole('button', { name: '保存' }).click();

  await expect(page.getByText('双旦活动公告')).toBeVisible();
});

test('公告支援上下架与删除操作', async ({ page }) => {
  await setAdminSession(page);

  const announcements = [
    buildAnnouncement({ announcementId: 'ann_toggle', title: '周年庆活动', priority: 2 }),
    buildAnnouncement({ announcementId: 'ann_temp', title: '临时公告', type: 'scroll' })
  ];

  const response = () => ({
    isSucc: true,
    res: {
      success: true,
      list: announcements,
      total: announcements.length
    }
  });

  await mockApi(page, 'admin/GetAnnouncements', response);

  await mockApi(page, 'admin/UpdateAnnouncement', body => {
    const target = announcements.find(a => a.announcementId === body.announcementId);
    if (target && body.updates?.active !== undefined) {
      target.active = body.updates.active;
    }
    return { isSucc: true, res: { success: true } };
  });

  await mockApi(page, 'admin/DeleteAnnouncement', body => {
    const index = announcements.findIndex(a => a.announcementId === body.announcementId);
    if (index >= 0) {
      announcements.splice(index, 1);
    }
    return { isSucc: true, res: { success: true } };
  });

  await page.goto('/dashboard/announcements');
  await expect(page.getByText('周年庆活动')).toBeVisible();

  await page.getByTestId('announcement-toggle').first().click();
  await expect(page.getByText('已下架').first()).toBeVisible();

  page.once('dialog', dialog => dialog.accept());
  await page.getByTestId('announcement-delete').first().click();
  await expect(page.getByText('周年庆活动')).not.toBeVisible();
});
