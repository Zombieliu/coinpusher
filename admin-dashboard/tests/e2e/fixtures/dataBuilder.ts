const now = () => Date.now();

export function buildAnnouncement(overrides: Partial<any> = {}) {
  return {
    announcementId: `ann_${Math.random().toString(36).slice(2, 7)}`,
    type: 'notice',
    title: '系统维护',
    content: '服务器将在今晚维护。',
    startTime: now() - 60 * 60 * 1000,
    endTime: now() + 60 * 60 * 1000,
    priority: 1,
    active: true,
    ...overrides
  };
}

export function buildTicket(overrides: Partial<any> = {}) {
  return {
    ticketId: `ticket_${Math.random().toString(36).slice(2, 7)}`,
    userId: 'user_demo',
    subject: '无法登录游戏',
    status: 'open',
    createdAt: now(),
    messages: [
      { sender: 'user', senderName: '玩家A', content: '请帮助我解决问题' }
    ],
    ...overrides
  };
}

export function buildOrder(overrides: Partial<any> = {}) {
  return {
    orderId: `order_${Math.random().toString(36).slice(2, 7)}`,
    userId: 'user_demo',
    productName: '礼包A',
    amount: 49.9,
    currency: '¥',
    status: 'paid',
    createdAt: now(),
    ...overrides
  };
}

export function buildRefund(overrides: Partial<any> = {}) {
  return {
    refundId: `refund_${Math.random().toString(36).slice(2, 7)}`,
    userId: 'user_demo',
    orderId: 'order_demo',
    amount: 30,
    reason: '重复扣款',
    createdAt: now(),
    status: 'pending',
    ...overrides
  };
}
