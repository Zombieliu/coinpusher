'use client'

import { useState } from 'react'
import { sendMail } from '@/lib/api'
import { Send, Users, Mail } from 'lucide-react'

export default function MailsPage() {
  const [mailType, setMailType] = useState<'single' | 'batch' | 'broadcast'>('single')
  const [userIds, setUserIds] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [gold, setGold] = useState(0)
  const [tickets, setTickets] = useState(0)
  const [expireDays, setExpireDays] = useState(7)
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!title || !content) {
      alert('请填写标题和内容')
      return
    }

    if (mailType === 'single' && !userIds) {
      alert('请输入用户ID')
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
      alert('邮件发送成功！')
      // 重置表单
      setTitle('')
      setContent('')
      setGold(0)
      setTickets(0)
      setUserIds('')
    } else {
      alert(`发送失败: ${result.err?.message}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* 邮件类型选择 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">选择邮件类型</h3>
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
              <div className="font-medium">单人邮件</div>
              <div className="text-xs text-gray-500">发送给指定用户</div>
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
              <div className="font-medium">批量邮件</div>
              <div className="text-xs text-gray-500">发送给多个用户</div>
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
              <div className="font-medium">全服邮件</div>
              <div className="text-xs text-gray-500">发送给所有用户</div>
            </div>
          </button>
        </div>
      </div>

      {/* 邮件编辑器 */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold">编辑邮件</h3>

        {/* 收件人 */}
        {mailType !== 'broadcast' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              收件人 {mailType === 'batch' && '(每行一个用户ID)'}
            </label>
            {mailType === 'single' ? (
              <input
                type="text"
                value={userIds}
                onChange={(e) => setUserIds(e.target.value)}
                placeholder="输入用户ID"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <textarea
                value={userIds}
                onChange={(e) => setUserIds(e.target.value)}
                placeholder="每行一个用户ID"
                rows={5}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        )}

        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">邮件标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入邮件标题"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 内容 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">邮件内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="输入邮件内容"
            rows={6}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 奖励 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">附件奖励</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">金币</label>
              <input
                type="number"
                value={gold}
                onChange={(e) => setGold(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">彩票</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">有效期（天）</label>
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
                发送中...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                发送邮件
              </>
            )}
          </button>
        </div>
      </div>

      {/* 邮件模板 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">常用模板</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={() => {
              setTitle('每日登录奖励')
              setContent('感谢您的每日登录！这是您的专属奖励，请查收~')
              setGold(100)
              setTickets(1)
            }}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <div className="font-medium">每日登录奖励</div>
            <div className="text-sm text-gray-500">金币100 + 彩票1</div>
          </button>
          <button
            onClick={() => {
              setTitle('系统补偿')
              setContent('由于系统维护给您带来不便，这是我们的补偿奖励，感谢您的理解！')
              setGold(500)
              setTickets(5)
            }}
            className="p-4 border rounded-lg hover:bg-gray-50 text-left"
          >
            <div className="font-medium">系统补偿</div>
            <div className="text-sm text-gray-500">金币500 + 彩票5</div>
          </button>
        </div>
      </div>
    </div>
  )
}
