import { test, expect } from '@playwright/test';
import { mockApi, setAdminSession } from './utils';
import { buildTicket } from './fixtures/dataBuilder';

test('客服工单回复并关闭', async ({ page }) => {
  await setAdminSession(page);

  const ticket = buildTicket({
    subject: '充值未到账',
    messages: [
      { sender: 'user', senderName: '玩家A', content: '请帮忙核对订单' }
    ]
  });

  await mockApi(page, 'admin/GetTickets', {
    isSucc: true,
    res: {
      tickets: [ticket],
      total: 1
    }
  });

  const replies: any[] = [];
  await mockApi(page, 'admin/ReplyTicket', body => {
    replies.push(body);
    return { isSucc: true, res: { success: true } };
  });

  await page.goto('/dashboard/support');

  await expect(page.getByText('充值未到账')).toBeVisible();
  await page.getByText('充值未到账').click();

  await page.getByPlaceholder('输入回复内容...').fill('已经处理，请查收。');
  await page.getByRole('button', { name: '回复并关闭' }).click();

  expect(replies[0]).toMatchObject({
    ticketId: ticket.ticketId,
    closeTicket: true,
    content: '已经处理，请查收。'
  });
});
