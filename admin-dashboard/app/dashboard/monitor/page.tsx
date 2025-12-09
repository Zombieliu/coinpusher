'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fetchSystemMetrics, fetchActiveAlerts } from '@/lib/api'
import { Activity, Cpu, HardDrive, Users, DollarSign, AlertTriangle, TrendingUp, Zap } from 'lucide-react'

interface ServerMetrics {
  cpu: { usage: number; cores: number; loadAverage: number[] }
  memory: { total: number; used: number; free: number; usage: number }
  requests: { qps: number; avgResponseTime: number; errorRate: number }
}

interface BusinessMetrics {
  users: { online: number; dau: number; newToday: number }
  game: { activeMatches: number; totalMatches: number }
  revenue: { todayRevenue: number; orderCount: number }
  errors: { gameErrors: number; paymentErrors: number; serverErrors: number }
}

interface Alert {
  id: string
  type: string
  level: 'info' | 'warning' | 'critical'
  title: string
  message: string
  value: number
  threshold: number
  timestamp: number
}

export default function MonitorPage() {
  const [serverMetrics, setServerMetrics] = useState<ServerMetrics | null>(null)
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadData = async () => {
    try {
      const [metricsRes, alertsRes] = await Promise.all([
        fetchSystemMetrics({}),
        fetchActiveAlerts({})
      ])

      if (metricsRes.isSucc && metricsRes.res) {
        setServerMetrics(metricsRes.res.server || null)
        setBusinessMetrics(metricsRes.res.business || null)
      }

      if (alertsRes.isSucc && alertsRes.res && alertsRes.res.alerts) {
        setAlerts(alertsRes.res.alerts)
      }
    } catch (error) {
      console.error('加载监控数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadData()
    }, 30000) // 每30秒刷新一次

    return () => clearInterval(interval)
  }, [autoRefresh])

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(2)} GB`
  }

  const formatCurrency = (amount: number) => {
    return `¥${amount.toFixed(2)}`
  }

  const getAlertBadgeColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive'
      case 'warning': return 'outline'
      default: return 'secondary'
    }
  }

  const getMetricColor = (value: number, warningThreshold: number, criticalThreshold: number) => {
    if (value >= criticalThreshold) return 'text-red-600'
    if (value >= warningThreshold) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">加载监控数据中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">系统监控</h1>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            自动刷新 (30s)
          </label>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            手动刷新
          </button>
        </div>
      </div>

      {/* 告警区域 */}
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              活动告警 ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-white rounded border">
                  <Badge variant={getAlertBadgeColor(alert.level) as any}>
                    {alert.level.toUpperCase()}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-sm text-gray-600">{alert.message}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      当前值: {alert.value.toFixed(2)} / 阈值: {alert.threshold}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 服务器指标 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">服务器指标</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CPU */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU使用率</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {serverMetrics && (
                <>
                  <div className={`text-2xl font-bold ${getMetricColor(serverMetrics.cpu.usage, 60, 80)}`}>
                    {serverMetrics.cpu.usage.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    核心数: {serverMetrics.cpu.cores}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    负载: {serverMetrics.cpu.loadAverage.map(v => v.toFixed(2)).join(', ')}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* 内存 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">内存使用</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {serverMetrics && (
                <>
                  <div className={`text-2xl font-bold ${getMetricColor(serverMetrics.memory.usage, 70, 85)}`}>
                    {serverMetrics.memory.usage.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    已用: {formatBytes(serverMetrics.memory.used)} / {formatBytes(serverMetrics.memory.total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    可用: {formatBytes(serverMetrics.memory.free)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* 请求统计 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">请求统计</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {serverMetrics && (
                <>
                  <div className="text-2xl font-bold">
                    {serverMetrics.requests.qps.toFixed(0)} QPS
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    平均响应: {serverMetrics.requests.avgResponseTime.toFixed(0)}ms
                  </p>
                  <p className={`text-xs ${getMetricColor(serverMetrics.requests.errorRate, 3, 5)}`}>
                    错误率: {serverMetrics.requests.errorRate.toFixed(2)}%
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 业务指标 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">业务指标</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 用户指标 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">在线用户</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {businessMetrics && (
                <>
                  <div className="text-2xl font-bold">
                    {businessMetrics.users.online}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    DAU: {businessMetrics.users.dau}
                  </p>
                  <p className="text-xs text-green-600">
                    今日新增: {businessMetrics.users.newToday}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* 游戏指标 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">游戏活动</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {businessMetrics && (
                <>
                  <div className="text-2xl font-bold">
                    {businessMetrics.game.activeMatches}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    活跃对局
                  </p>
                  <p className="text-xs text-muted-foreground">
                    累计: {businessMetrics.game.totalMatches}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* 收入指标 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日收入</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {businessMetrics && (
                <>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(businessMetrics.revenue.todayRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    订单数: {businessMetrics.revenue.orderCount}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* 错误统计 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">错误统计</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {businessMetrics && (
                <>
                  <div className="text-2xl font-bold text-red-600">
                    {businessMetrics.errors.gameErrors +
                     businessMetrics.errors.paymentErrors +
                     businessMetrics.errors.serverErrors}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    游戏: {businessMetrics.errors.gameErrors} |
                    支付: {businessMetrics.errors.paymentErrors}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    服务器: {businessMetrics.errors.serverErrors}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
