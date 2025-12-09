'use client'

import { useState, useEffect } from 'react'
import { Settings, History, Save, RotateCcw, FileJson, AlertCircle } from 'lucide-react'
import { callAPI } from '@/lib/api'

interface ConfigType {
  id: string
  title: string
  desc: string
}

const configTypes: ConfigType[] = [
  { id: 'game', title: '游戏配置', desc: '等级、经验、金币倍率' },
  { id: 'payment', title: '支付配置', desc: '充值金额、VIP价格' },
  { id: 'match', title: '匹配配置', desc: '匹配超时、段位差距' },
  { id: 'shop', title: '商城配置', desc: '刷新间隔、刷新费用' },
  { id: 'mail', title: '邮件配置', desc: '邮件上限、过期时间' },
  { id: 'signin', title: '签到配置', desc: '每日签到奖励' },
]

export default function ConfigPage() {
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null)
  const [configData, setConfigData] = useState<any>(null)
  const [configJson, setConfigJson] = useState('')
  const [version, setVersion] = useState(0)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(0)
  const [lastUpdatedBy, setLastUpdatedBy] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [comment, setComment] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<any[]>([])

  async function loadConfig(configType: string) {
    setLoading(true)
    setJsonError('')

    try {
      const result = await callAPI('admin/GetConfig', { configType })

      if (result.isSucc && result.res) {
        setConfigData(result.res.config)
        setConfigJson(JSON.stringify(result.res.config, null, 2))
        setVersion(result.res.version)
        setLastUpdatedAt(result.res.lastUpdatedAt)
        setLastUpdatedBy(result.res.lastUpdatedBy || '系统')
        setSelectedConfig(configType)
      } else {
        alert(result.err?.message || '加载配置失败')
      }
    } catch (error: any) {
      alert(error.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  async function saveConfig() {
    if (!selectedConfig) return

    // 验证JSON格式
    try {
      const parsedConfig = JSON.parse(configJson)
      setSaving(true)
      setJsonError('')

      const result = await callAPI('admin/UpdateConfig', {
        configType: selectedConfig,
        config: parsedConfig,
        comment: comment || '更新配置',
      })

      if (result.isSucc && result.res?.success) {
        alert(`保存成功！新版本: v${result.res.version}`)
        setVersion(result.res.version)
        setComment('')
        // 重新加载配置
        loadConfig(selectedConfig)
      } else {
        alert(result.res?.message || result.err?.message || '保存失败')
      }
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        setJsonError('JSON格式错误: ' + error.message)
      } else {
        alert(error.message || '保存失败')
      }
    } finally {
      setSaving(false)
    }
  }

  async function loadHistory() {
    if (!selectedConfig) return

    try {
      const result = await callAPI('admin/GetConfigHistory', {
        configType: selectedConfig,
        page: 1,
        limit: 10,
      })

      if (result.isSucc && result.res) {
        setHistory(result.res.history)
        setShowHistory(true)
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  }

  async function rollbackToVersion(historyId: string, version: number) {
    if (!selectedConfig) return
    if (!confirm(`确定要回滚到版本 v${version} 吗？`)) return

    try {
      const result = await callAPI('admin/RollbackConfig', {
        configType: selectedConfig,
        historyId,
      })

      if (result.isSucc && result.res?.success) {
        alert(result.res.message)
        setShowHistory(false)
        loadConfig(selectedConfig)
      } else {
        alert(result.res?.message || '回滚失败')
      }
    } catch (error: any) {
      alert(error.message || '回滚失败')
    }
  }

  function formatJson() {
    try {
      const parsed = JSON.parse(configJson)
      setConfigJson(JSON.stringify(parsed, null, 2))
      setJsonError('')
    } catch (error: any) {
      setJsonError('JSON格式错误: ' + error.message)
    }
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  return (
    <div className="space-y-6">
      {/* 配置类型选择 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold">游戏配置管理</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {configTypes.map((config) => (
            <div
              key={config.id}
              onClick={() => loadConfig(config.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                selectedConfig === config.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <h3 className="font-medium mb-1">{config.title}</h3>
              <p className="text-sm text-gray-500">{config.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 配置编辑器 */}
      {selectedConfig && !loading && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                {configTypes.find(c => c.id === selectedConfig)?.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                版本: v{version} | 最后更新: {formatDate(lastUpdatedAt)} | 更新人: {lastUpdatedBy}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadHistory}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <History className="h-4 w-4" />
                历史版本
              </button>
              <button
                onClick={formatJson}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <FileJson className="h-4 w-4" />
                格式化
              </button>
            </div>
          </div>

          {/* JSON编辑器 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                配置JSON
              </label>
              <textarea
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                className="w-full h-96 p-4 font-mono text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入配置JSON..."
              />
              {jsonError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-600">{jsonError}</div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                修改说明 (可选)
              </label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="简要说明此次修改的内容..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => loadConfig(selectedConfig)}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
              >
                <RotateCcw className="h-4 w-4 inline mr-2" />
                重置
              </button>
              <button
                onClick={saveConfig}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 inline mr-2" />
                {saving ? '保存中...' : '保存配置'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 历史版本模态框 */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">历史版本</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="overflow-auto max-h-[60vh]">
              {history.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  暂无历史版本
                </div>
              ) : (
                <div className="divide-y">
                  {history.map((item) => (
                    <div key={item.historyId} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-sm font-medium">
                              v{item.version}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(item.savedAt)}
                            </span>
                            <span className="text-sm text-gray-500">
                              by {item.savedBy}
                            </span>
                          </div>
                          {item.comment && (
                            <p className="text-sm text-gray-600 mb-2">{item.comment}</p>
                          )}
                          <details className="text-xs">
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                              查看配置
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                              {JSON.stringify(item.config, null, 2)}
                            </pre>
                          </details>
                        </div>
                        <button
                          onClick={() => rollbackToVersion(item.historyId, item.version)}
                          className="ml-4 px-3 py-1 text-sm border rounded hover:bg-gray-50"
                        >
                          回滚
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载配置中...</p>
        </div>
      )}
    </div>
  )
}
