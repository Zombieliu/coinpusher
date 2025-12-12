'use client'

import { useState } from 'react'
import { sendMail } from '@/lib/api'
import { Send, Users, Mail } from 'lucide-react'
import { useTranslation } from '@/components/providers/i18n-provider'

export default function MailsPage() {
  const [mailType, setMailType] = useState<'single' | 'batch' | 'broadcast'>('single')
  const [userIds, setUserIds] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [gold, setGold] = useState(0)
  const [tickets, setTickets] = useState(0)
  const [expireDays, setExpireDays] = useState(7)
  const [sending, setSending] = useState(false)
  const { t } = useTranslation('mails')

  async function handleSend() {
    if (!title || !content) {
      alert(t('errors.missingContent'))
      return
    }

    if (mailType === 'single' && !userIds) {
      alert(t('errors.missingUser'))
      return
    }

    const rewards: any = {}
    if (gold > 0) rewards.gold = gold
    if (tickets > 0) rewards.tickets = tickets

    setSending(true)
    const result = await sendMail({
      type: mailType,
      userIds: mailType === 'single' ? [userIds] : userIds.split('\n').filter(Boolean),
      title,
      content,
      rewards: Object.keys(rewards).length > 0 ? rewards : undefined,
      expireAt: Date.now() + expireDays * 24 * 60 * 60 * 1000,
    })

    setSending(false)

    if (result.isSucc) {
      alert(t('success'))
      // 重置表单
      setTitle('')
      setContent('')
      setGold(0)
      setTickets(0)
      setUserIds('')
    } else {
      alert(t('errors.failed', { message: result.err?.message || '' }))
    }
  }

  return (
    <div className="space-y-6">
      {/* 邮件类型选择 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{t('typeTitle')}</h3>
        <div className="flex gap-4">
          <button
            onClick={() => setMailType('single')}
            className={`flex-1 p-4 border-2 rounded-lg transition ${
              mailType === 'single'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Mail className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-center">
              <div className="font-medium">{t('types.single.title')}</div>
              <div className="text-xs text-gray-500">{t('types.single.desc')}</div>
            </div>
          </button>
          <button
            onClick={() => setMailType('batch')}
            className={`flex-1 p-4 border-2 rounded-lg transition ${
              mailType === 'batch'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-center">
              <div className="font-medium">{t('types.batch.title')}</div>
              <div className="text-xs text-gray-500">{t('types.batch.desc')}</div>
            </div>
          </button>
          <button
            onClick={() => setMailType('broadcast')}
            className={`flex-1 p-4 border-2 rounded-lg transition ${
              mailType === 'broadcast'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Send className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-center">
              <div className="font-medium">{t('types.broadcast.title')}</div>
              <div className="text-xs text-gray-500">{t('types.broadcast.desc')}</div>
            </div>
          </button>
        </div>
      </div>

      {/* 邮件编辑器 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold">{t('editorTitle')}</h3>

        {/* 收件人 */}
        {mailType !== 'broadcast' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('recipients')} {mailType === 'batch' && t('recipientsHint')}
            </label>
            {mailType === 'single' ? (
              <input
                type="text"
                value={userIds}
                onChange={(e) => setUserIds(e.target.value)}
                placeholder={t('singlePlaceholder')}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <textarea
                value={userIds}
                onChange={(e) => setUserIds(e.target.value)}
                placeholder={t('batchPlaceholder')}
                rows={5}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        )}

        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('titleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('titlePlaceholder')}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 内容 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('contentLabel')}</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('contentPlaceholder')}
            rows={6}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 奖励 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('rewardLabel')}</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('goldLabel')}</label>
              <input
                type="number"
                value={gold}
                onChange={(e) => setGold(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">{t('ticketLabel')}</label>
              <input
                type="number"
                value={tickets}
                onChange={(e) => setTickets(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 有效期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('expireLabel')}</label>
          <input
            type="number"
            value={expireDays}
            onChange={(e) => setExpireDays(parseInt(e.target.value) || 7)}
            min="1"
            max="30"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 发送按钮 */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('sending')}
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                {t('send')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* 邮件模板 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{t('templatesTitle')}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={() => {
              setTitle(t('templates.daily.title'))
              setContent(t('templates.daily.content'))
              setGold(100)
              setTickets(1)
            }}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <div className="font-medium">{t('templates.daily.title')}</div>
            <div className="text-sm text-gray-500">{t('templates.daily.desc')}</div>
          </button>
          <button
            onClick={() => {
              setTitle(t('templates.compensation.title'))
              setContent(t('templates.compensation.content'))
              setGold(500)
              setTickets(5)
            }}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <div className="font-medium">{t('templates.compensation.title')}</div>
            <div className="text-sm text-gray-500">{t('templates.compensation.desc')}</div>
          </button>
        </div>
      </div>
    </div>
  )
}
