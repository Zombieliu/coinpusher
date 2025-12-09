'use client'

import { useEffect, useState } from 'react'
import { fetchAuditLogs, fetchAuditStatistics } from '@/lib/api'
import { Search, Filter, RefreshCw, AlertCircle, CheckCircle, Shield } from 'lucide-react'

interface AuditLog {
  logId: string
  adminId: string
  adminUsername: string
  action: string
  category: string
  targetType?: string
  targetId?: string
  targetName?: string
  details: any
  ipAddress: string
  userAgent?: string
  result: 'success' | 'failed'
  errorMessage?: string
  createdAt: number
}

const CATEGORIES = [
  { value: '', label: '全部分类' },
  { value: 'user_management', label: '用户管理' },
  { value: 'admin_management', label: '管理员管理' },
  { value: 'system_config', label: '系统配置' },
  { value: 'game_data', label: '游戏数据' },
  { value: 'financial', label: '财务相关' },
  { value: 'security', label: '安全相关' },
]

const RESULTS = [
  { value: '', label: '全部结果' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
]

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [statistics, setStatistics] = useState<any>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)

  // 筛选条件
  const [filters, setFilters] = useState({
    category: '',
    result: '',
    adminId: '',
    action: '',
    targetId: '',
    startTime: 0,
    endTime: 0,
  })

  const [showFilters, setShowFilters] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    loadLogs()
    loadStatistics()
  }, [page, filters])

  async function loadLogs() {
    setLoading(true)
    const result = await fetchAuditLogs({
      ...filters,
      category: (filters.category || undefined) as any,
      result: (filters.result || undefined) as any,
      page,
      limit: pageSize,
    })
    setLoading(false)

    if (result.isSucc && result.res?.success) {
      setLogs(result.res.logs || [])
      setTotal(result.res.total || 0)
    }
  }

  async function loadStatistics() {
    const result = await fetchAuditStatistics({})
    if (result.isSucc && result.res?.success) {
      setStatistics(result.res.data)
    }
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  function getCategoryLabel(category: string) {
    return CATEGORIES.find(c => c.value === category)?.label || category
  }

  function getActionLabel(action: string) {
    return action.replace('admin/', '')
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">总操作数</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {statistics.totalLogs.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">成功率</div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              {statistics.successRate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">最活跃管理员</div>
            <div className="text-lg font-bold text-gray-900 mt-2">
              {statistics.topAdmins[0]?.adminUsername || '-'}
            </div>
            <div className="text-xs text-gray-500">
              {statistics.topAdmins[0]?.count || 0} 次操作
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">最常见操作</div>
            <div className="text-sm font-bold text-gray-900 mt-2">
              {getActionLabel(statistics.topActions[0]?.action || '-')}
            </div>
            <div className="text-xs text-gray-500">
              {statistics.topActions[0]?.count || 0} 次
            </div>
          </div>
        </div>
      )}

      {/* 筛选和搜索 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            操作审计日志
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              筛选
            </button>
            <button
              onClick={() => {
                setPage(1)
                loadLogs()
                loadStatistics()
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              刷新
            </button>
          </div>
        </div>

        {/* 筛选条件 */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结果</label>
              <select
                value={filters.result}
                onChange={(e) => setFilters({ ...filters, result: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {RESULTS.map(res => (
                  <option key={res.value} value={res.value}>{res.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">管理员ID</label>
              <input
                type="text"
                value={filters.adminId}
                onChange={(e) => setFilters({ ...filters, adminId: e.target.value })}
                placeholder="输入管理员ID"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
              <input
                type="text"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                placeholder="例如: admin/BanUser"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目标ID</label>
              <input
                type="text"
                value={filters.targetId}
                onChange={(e) => setFilters({ ...filters, targetId: e.target.value })}
                placeholder="用户ID或其他目标ID"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({
                    category: '',
                    result: '',
                    adminId: '',
                    action: '',
                    targetId: '',
                    startTime: 0,
                    endTime: 0,
                  })
                  setPage(1)
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                清空筛选
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 日志列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无审计日志</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">管理员</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">分类</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">目标</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP地址</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">结果</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.logId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.adminUsername}</div>
                        <div className="text-xs text-gray-500">{log.adminId.substr(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getActionLabel(log.action)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {getCategoryLabel(log.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.targetName || log.targetId?.substr(0, 8) || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ipAddress}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.result === 'success' ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            成功
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            失败
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-700">
                共 {total} 条记录，第 {page} 页
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * pageSize >= total}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 详情模态框 */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">操作详情</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">操作时间</div>
                  <div className="font-medium">{formatTime(selectedLog.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">操作结果</div>
                  <div className="font-medium">
                    {selectedLog.result === 'success' ? (
                      <span className="text-green-600">成功</span>
                    ) : (
                      <span className="text-red-600">失败</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">管理员</div>
                  <div className="font-medium">{selectedLog.adminUsername}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">管理员ID</div>
                  <div className="font-medium text-xs">{selectedLog.adminId}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">操作类型</div>
                  <div className="font-medium">{getActionLabel(selectedLog.action)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">分类</div>
                  <div className="font-medium">{getCategoryLabel(selectedLog.category)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">IP地址</div>
                  <div className="font-medium">{selectedLog.ipAddress}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">目标类型</div>
                  <div className="font-medium">{selectedLog.targetType || '-'}</div>
                </div>
                {selectedLog.targetId && (
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600">目标ID</div>
                    <div className="font-medium text-xs">{selectedLog.targetId}</div>
                  </div>
                )}
              </div>

              {selectedLog.errorMessage && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">错误信息</div>
                  <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
                    {selectedLog.errorMessage}
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm text-gray-600 mb-1">操作详情</div>
                <pre className="p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>

              {selectedLog.userAgent && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">User Agent</div>
                  <div className="text-xs text-gray-700 p-2 bg-gray-50 rounded">
                    {selectedLog.userAgent}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
