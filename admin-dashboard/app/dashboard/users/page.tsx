'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchUsers, banUser, unbanUser, grantReward, sendMail } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/utils'
import { Search, Filter, Ban, Gift, Mail, Layers } from 'lucide-react'
import { useTranslation } from '@/components/providers/i18n-provider'

interface User {
  userId: string
  username: string
  level: number
  gold: number
  tickets: number
  lastLoginTime: number
  totalRecharge: number
  status: 'normal' | 'banned'
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const { t } = useTranslation('users')
  const { t: tCommon } = useTranslation('common')

  useEffect(() => {
    loadUsers()
  }, [page])

  async function loadUsers() {
    setLoading(true)
    const result = await fetchUsers({ page, limit: 20, search })
    if (result.isSucc && result.res) {
      setUsers(result.res.users || [])
      setTotal(result.res.total || 0)
    }
    setLoading(false)
  }

  async function handleBan(userId: string) {
    if (!confirm(t('confirmBan'))) return
    const result = await banUser(userId, t('banReason'), 7 * 24 * 60 * 60 * 1000)
    if (result.isSucc) {
      alert(t('banSuccess'))
      loadUsers()
    } else {
      alert(t('banFailed', { message: result.err?.message || tCommon('unknownError') }))
    }
  }

  async function handleUnban(userId: string) {
    const result = await unbanUser(userId)
    if (result.isSucc) {
      alert(t('unbanSuccess'))
      loadUsers()
    }
  }

  async function handleGrant(userId: string) {
    const gold = prompt(`${t('goldPrompt')}:`)
    if (!gold) return
    const result = await grantReward(userId, { gold: parseInt(gold) })
    if (result.isSucc) {
      alert(t('grantSuccess'))
      loadUsers()
    }
  }

  async function handleSendMail(userId: string) {
    const title = prompt(t('mailTitlePrompt'), t('mailDefaultTitle'))
    if (!title) return
    const content = prompt(t('mailContentPrompt'))
    if (!content) return

    const result = await sendMail({
      type: 'single',
      userIds: [userId],
      title,
      content
    })

    if (result.isSucc) {
      alert(t('mailSuccess'))
    } else {
      alert(t('mailFailed', { message: result.err?.message || tCommon('unknownError') }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <button
            onClick={() => router.push('/dashboard/users/batch')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
        >
            <Layers size={18} />
            {t('batchAction')}
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={loadUsers}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {t('search')}
          </button>
          <button className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filter')}
          </button>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.userId')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.username')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.level')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.gold')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.recharge')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.lastLogin')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.userId} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{user.userId}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{user.username}</td>
                <td className="px-6 py-4 text-sm text-gray-900">Lv.{user.level}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{formatNumber(user.gold)}</td>
                <td className="px-6 py-4 text-sm text-gray-900">¥{user.totalRecharge}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatDate(user.lastLoginTime)}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      user.status === 'normal'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.status === 'normal' ? t('table.normal') : t('table.banned')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    {user.status === 'normal' ? (
                      <button
                        onClick={() => handleBan(user.userId)}
                        className="text-red-600 hover:text-red-800"
                        title={t('actions.ban')}
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnban(user.userId)}
                        className="text-green-600 hover:text-green-800"
                        title={t('actions.unban')}
                      >
                        {t('actions.unban')}
                      </button>
                    )}
                    <button
                      onClick={() => handleGrant(user.userId)}
                      className="text-blue-600 hover:text-blue-800"
                      title={t('actions.grant')}
                    >
                      <Gift className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleSendMail(user.userId)}
                      className="text-gray-600 hover:text-gray-800"
                      title={t('actions.mail')}
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 分页 */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {tCommon('totalRecords', { count: total, page })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('actions.paginationPrev')}
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={users.length < 20}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('actions.paginationNext')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
