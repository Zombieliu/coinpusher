'use client'

import { useEffect, useState } from 'react'
import { fetchAdmins, createAdmin, updateAdminStatus } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { UserPlus, Shield, ShieldCheck, ShieldOff, Users } from 'lucide-react'
import { useTranslation } from '@/components/providers/i18n-provider'

interface Admin {
  adminId: string
  username: string
  role: string
  email?: string
  status: string
  createdAt: number
  lastLoginAt?: number
}

const roleColors: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-800',
  operator: 'bg-blue-100 text-blue-800',
  customer_service: 'bg-green-100 text-green-800',
  analyst: 'bg-purple-100 text-purple-800',
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    role: 'operator' as 'super_admin' | 'operator' | 'customer_service' | 'analyst',
    email: '',
  })
  const { t } = useTranslation('admins')
  const { t: tCommon } = useTranslation('common')

  useEffect(() => {
    loadAdmins()
  }, [])

  async function loadAdmins() {
    setLoading(true)
    const result = await fetchAdmins()
    if (result.isSucc && result.res) {
      setAdmins(result.res.admins || [])
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!createForm.username || !createForm.password) {
      alert(t('alerts.fillRequired'))
      return
    }

    if (createForm.username.length < 3) {
      alert(t('alerts.usernameMin'))
      return
    }

    if (createForm.password.length < 6) {
      alert(t('alerts.passwordMin'))
      return
    }

    const result = await createAdmin(createForm)
    if (result.isSucc) {
      alert(t('alerts.createSuccess'))
      setShowCreateModal(false)
      setCreateForm({ username: '', password: '', role: 'operator', email: '' })
      loadAdmins()
    } else {
      alert(t('alerts.createFailed', { message: result.err?.message || tCommon('unknownError') }))
    }
  }

  async function handleUpdateStatus(adminId: string, status: 'active' | 'disabled') {
    const isDisable = status === 'disabled'
    const confirmText = isDisable ? t('alerts.confirmDisable') : t('alerts.confirmEnable')
    if (!confirm(confirmText)) return

    const result = await updateAdminStatus(adminId, status)
    if (result.isSucc) {
      alert(isDisable ? t('alerts.disableSuccess') : t('alerts.enableSuccess'))
      loadAdmins()
    } else {
      alert(
        isDisable
          ? t('alerts.disableFailed', { message: result.err?.message || tCommon('unknownError') })
          : t('alerts.enableFailed', { message: result.err?.message || tCommon('unknownError') })
      )
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
      {/* header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold">{t('title')}</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <UserPlus className="w-5 h-5" />
            {t('createButton')}
          </button>
        </div>
      </div>

      {/* admin list */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('table.username')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('table.role')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('table.email')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('table.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('table.createdAt')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('table.lastLogin')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map((admin) => (
              <tr key={admin.adminId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="font-medium text-gray-900">{admin.username}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      roleColors[admin.role] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {t(`roles.${admin.role}` as const)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {admin.email || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {admin.status === 'active' ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <ShieldCheck className="w-4 h-4" />
                      {t('status.active')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600">
                      <ShieldOff className="w-4 h-4" />
                      {t('status.disabled')}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(admin.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {admin.status === 'active' ? (
                    <button
                      onClick={() => handleUpdateStatus(admin.adminId, 'disabled')}
                      className="text-red-600 hover:text-red-800"
                    >
                      {t('status.disabled')}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(admin.adminId, 'active')}
                      className="text-green-600 hover:text-green-800"
                    >
                      {t('status.active')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {admins.length === 0 && (
          <div className="text-center py-12 text-gray-500">{t('table.empty')}</div>
        )}
      </div>

      {/* create admin modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{t('modal.title')}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('modal.username')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('modal.usernamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('modal.password')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('modal.passwordPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('modal.role')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      role: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="operator">{t('roles.operator')}</option>
                  <option value="customer_service">{t('roles.customer_service')}</option>
                  <option value="analyst">{t('roles.analyst')}</option>
                  <option value="super_admin">{t('roles.super_admin')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal.email')}</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('modal.emailPlaceholder')}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {t('modal.confirm')}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateForm({ username: '', password: '', role: 'operator', email: '' })
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                {t('modal.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
