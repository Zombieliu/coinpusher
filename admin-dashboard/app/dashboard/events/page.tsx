'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Edit, Trash2, Eye, Play, Pause } from 'lucide-react'
import { callAPI } from '@/lib/api'

const EVENT_TYPES = [
  { value: 'daily_login', label: '每日登录' },
  { value: 'recharge_bonus', label: '充值活动' },
  { value: 'rank_competition', label: '排位赛' },
  { value: 'limited_shop', label: '限时商城' },
  { value: 'festival', label: '节日活动' },
  { value: 'newcomer', label: '新手活动' },
]

interface Event {
  eventId: string
  eventType: string
  title: string
  description: string
  startTime: number
  endTime: number
  status: 'upcoming' | 'active' | 'ended'
  config: any
  rewards: any
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'active' | 'ended'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  // 表单状态
  const [formData, setFormData] = useState({
    eventType: 'daily_login',
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    config: '{}',
    rewards: '{}',
  })

  useEffect(() => {
    loadEvents()
  }, [page, statusFilter])

  async function loadEvents() {
    setLoading(true)
    try {
      const result = await callAPI('admin/GetEvents', {
        status: statusFilter,
        page,
        limit,
      })

      if (result.isSucc && result.res) {
        setEvents(result.res.events)
        setTotal(result.res.total)
      }
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    try {
      const config = JSON.parse(formData.config)
      const rewards = JSON.parse(formData.rewards)

      const result = await callAPI('admin/CreateEvent', {
        eventType: formData.eventType,
        title: formData.title,
        description: formData.description,
        startTime: new Date(formData.startTime).getTime(),
        endTime: new Date(formData.endTime).getTime(),
        config,
        rewards,
      })

      if (result.isSucc && result.res?.success) {
        alert('活动创建成功')
        setShowCreateModal(false)
        resetForm()
        loadEvents()
      } else {
        alert(result.res?.message || '创建失败')
      }
    } catch (error: any) {
      alert(error.message || '创建失败')
    }
  }

  async function handleUpdate() {
    if (!selectedEvent) return

    try {
      const config = JSON.parse(formData.config)
      const rewards = JSON.parse(formData.rewards)

      const result = await callAPI('admin/UpdateEvent', {
        eventId: selectedEvent.eventId,
        title: formData.title,
        description: formData.description,
        startTime: new Date(formData.startTime).getTime(),
        endTime: new Date(formData.endTime).getTime(),
        config,
        rewards,
      })

      if (result.isSucc && result.res?.success) {
        alert('活动更新成功')
        setShowEditModal(false)
        resetForm()
        loadEvents()
      } else {
        alert(result.res?.message || '更新失败')
      }
    } catch (error: any) {
      alert(error.message || '更新失败')
    }
  }

  async function handleDelete(eventId: string, title: string) {
    if (!confirm(`确定要删除活动"${title}"吗？`)) return

    try {
      const result = await callAPI('admin/DeleteEvent', { eventId })

      if (result.isSucc && result.res?.success) {
        alert('活动已删除')
        loadEvents()
      } else {
        alert(result.res?.message || '删除失败')
      }
    } catch (error: any) {
      alert(error.message || '删除失败')
    }
  }

  function resetForm() {
    setFormData({
      eventType: 'daily_login',
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      config: '{}',
      rewards: '{}',
    })
    setSelectedEvent(null)
  }

  function openEditModal(event: Event) {
    setSelectedEvent(event)
    setFormData({
      eventType: event.eventType,
      title: event.title,
      description: event.description,
      startTime: new Date(event.startTime).toISOString().slice(0, 16),
      endTime: new Date(event.endTime).toISOString().slice(0, 16),
      config: JSON.stringify(event.config, null, 2),
      rewards: JSON.stringify(event.rewards, null, 2),
    })
    setShowEditModal(true)
  }

  function openDetailModal(event: Event) {
    setSelectedEvent(event)
    setShowDetailModal(true)
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  function getStatusBadge(status: string) {
    const styles = {
      upcoming: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      ended: 'bg-red-100 text-red-800',
    }
    const labels = {
      upcoming: '未开始',
      active: '进行中',
      ended: '已结束',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  function getEventTypeLabel(type: string) {
    return EVENT_TYPES.find(t => t.value === type)?.label || type
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">活动管理</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">全部状态</option>
            <option value="upcoming">未开始</option>
            <option value="active">进行中</option>
            <option value="ended">已结束</option>
          </select>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          创建活动
        </button>
      </div>

      {/* 活动列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>暂无活动数据</p>
            <p className="text-sm mt-1">点击"创建活动"按钮开始配置</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">活动名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">开始时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">结束时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.eventId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-gray-500">{event.description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">{getEventTypeLabel(event.eventType)}</td>
                    <td className="px-6 py-4 text-sm">{formatDate(event.startTime)}</td>
                    <td className="px-6 py-4 text-sm">{formatDate(event.endTime)}</td>
                    <td className="px-6 py-4">{getStatusBadge(event.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDetailModal(event)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="查看详情"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(event)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="编辑"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(event.eventId, event.title)}
                          className="p-1 hover:bg-gray-100 rounded text-red-600"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 分页 */}
            {total > limit && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  共 {total} 个活动，第 {page} 页
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * limit >= total}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 创建活动模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">创建活动</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">活动类型</label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">活动标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="输入活动标题..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">活动描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                  placeholder="输入活动描述..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">开始时间</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">结束时间</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">配置 (JSON)</label>
                <textarea
                  value={formData.config}
                  onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                  rows={6}
                  placeholder='{"key": "value"}'
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">奖励 (JSON)</label>
                <textarea
                  value={formData.rewards}
                  onChange={(e) => setFormData({ ...formData, rewards: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                  rows={6}
                  placeholder='{"gold": 1000, "exp": 500}'
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-6 py-2 border rounded-lg hover:bg-gray-50">
                取消
              </button>
              <button onClick={handleCreate} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑活动模态框 */}
      {showEditModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">编辑活动</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">活动类型</label>
                <input
                  type="text"
                  value={getEventTypeLabel(formData.eventType)}
                  disabled
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">活动标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">活动描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">开始时间</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">结束时间</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">配置 (JSON)</label>
                <textarea
                  value={formData.config}
                  onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                  rows={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">奖励 (JSON)</label>
                <textarea
                  value={formData.rewards}
                  onChange={(e) => setFormData({ ...formData, rewards: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                  rows={6}
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowEditModal(false)} className="px-6 py-2 border rounded-lg hover:bg-gray-50">
                取消
              </button>
              <button onClick={handleUpdate} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 活动详情模态框 */}
      {showDetailModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">活动详情</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">活动ID</div>
                <div className="font-mono text-sm">{selectedEvent.eventId}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">活动类型</div>
                <div>{getEventTypeLabel(selectedEvent.eventType)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">活动标题</div>
                <div className="font-medium">{selectedEvent.title}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">活动描述</div>
                <div>{selectedEvent.description}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">开始时间</div>
                  <div>{formatDate(selectedEvent.startTime)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">结束时间</div>
                  <div>{formatDate(selectedEvent.endTime)}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">状态</div>
                <div>{getStatusBadge(selectedEvent.status)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-2">配置</div>
                <pre className="p-4 bg-gray-100 rounded-lg text-sm overflow-auto max-h-40">
                  {JSON.stringify(selectedEvent.config, null, 2)}
                </pre>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-2">奖励</div>
                <pre className="p-4 bg-gray-100 rounded-lg text-sm overflow-auto max-h-40">
                  {JSON.stringify(selectedEvent.rewards, null, 2)}
                </pre>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end">
              <button onClick={() => setShowDetailModal(false)} className="px-6 py-2 border rounded-lg hover:bg-gray-50">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
