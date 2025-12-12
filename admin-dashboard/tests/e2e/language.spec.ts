import { test, expect } from '@playwright/test'
import { mockApi, setAdminSession } from './utils'

test('语言开关可以切换管理后台文案', async ({ page }) => {
  await setAdminSession(page)

  await page.route('**/api/notifications/stream', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        connection: 'keep-alive',
      },
      body: 'event: open\ndata: {}\n\n',
    })
  })

  await mockApi(page, 'admin/GetSystemConfig', {
    isSucc: true,
    res: {
      value: {
        enabled: false,
        reason: '维护公告',
        whitelistIps: ['127.0.0.1'],
        whitelistUsers: ['tester'],
      },
    },
  })

  const payloads: any[] = []
  await mockApi(page, 'admin/SetMaintenance', (body) => {
    payloads.push(body)
    return { isSucc: true, res: { success: true } }
  })

  await page.goto('/dashboard/maintenance')

  await expect(page.getByRole('main').getByRole('heading', { name: '系统维护' })).toBeVisible()

  const languageSelect = page.getByRole('combobox', { name: '语言' })
  await languageSelect.selectOption('en')

  await expect(page.getByRole('main').getByRole('heading', { name: 'System Maintenance' })).toBeVisible()
  await expect(page.getByPlaceholder('Whitelist IPs (comma separated)')).toBeVisible()

  await page.getByRole('button', { name: 'Save settings' }).click()

  expect(payloads).toHaveLength(1)
  expect(payloads[0]).toMatchObject({
    enabled: false,
    whitelistIps: ['127.0.0.1'],
    whitelistUsers: ['tester'],
  })
})
