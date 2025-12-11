'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { fetchOrders, fetchRefunds, fetchFinancialStats, fetchSystemMetrics } from '@/lib/api'
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'

type HealthStatus = 'ok' | 'warning' | 'critical'

interface HealthCheck {
  id: string
  title: string
  status: HealthStatus
  description: string
  suggestion?: string
}

export default function HealthPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [checks, setChecks] = useState<HealthCheck[]>([])
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const statusStats = useMemo(() => {
    return checks.reduce(
      (acc, check) => {
        acc[check.status]++
        return acc
      },
      { ok: 0, warning: 0, critical: 0 } as Record<HealthStatus, number>,
    )
  }, [checks])

  const runHealthChecks = async () => {
    setLoading(true)
    try {
      const now = Date.now()
      const [ordersRes, refundsRes, statsRes, metricsRes] = await Promise.all([
        fetchOrders({ page: 1, limit: 100 }),
        fetchRefunds({ page: 1, limit: 100 }),
        fetchFinancialStats({
          startDate: now - 7 * 24 * 60 * 60 * 1000,
          endDate: now,
        }),
        fetchSystemMetrics({}),
      ])

      const orders = ordersRes.isSucc ? ordersRes.res?.orders || [] : []
      const refunds = refundsRes.isSucc ? refundsRes.res?.refunds || [] : []
      const pendingRefunds = refunds.filter((r: any) => r.status === 'pending')
      const stuckPaidOrders = orders.filter(
        (order: any) =>
          order.status === 'paid' &&
          order.createdAt &&
          now - order.createdAt > 2 * 60 * 60 * 1000,
      )
      const failedOrders = orders.filter((order: any) => order.status === 'failed')
      const pendingDeliveries = orders.filter(
        (order: any) =>
          order.status === 'delivered' &&
          order.updatedAt &&
          now - order.updatedAt > 24 * 60 * 60 * 1000,
      )

      const businessMetrics = metricsRes.isSucc ? metricsRes.res?.business : null
      const serverMetrics = metricsRes.isSucc ? metricsRes.res?.server : null
      const stats = statsRes.isSucc ? statsRes.res : null

      const nextChecks: HealthCheck[] = []

      nextChecks.push({
        id: 'pending-refunds',
        title: '待处理退款',
        status: pendingRefunds.length === 0 ? 'ok' : pendingRefunds.length > 5 ? 'critical' : 'warning',
        description:
          pendingRefunds.length === 0
            ? '暂无待处理退款'
            : `当前有 ${pendingRefunds.length} 条退款申请等待审批`,
        suggestion:
          pendingRefunds.length === 0
            ? undefined
            : '请尽快在“退款处理”页完成审核，避免影响玩家退款体验',
      })

      nextChecks.push({
        id: 'stuck-orders',
        title: '长时间未发货订单',
        status: stuckPaidOrders.length === 0 ? 'ok' : stuckPaidOrders.length > 5 ? 'critical' : 'warning',
        description:
          stuckPaidOrders.length === 0
            ? '所有已支付订单都在可接受的发货时限内'
            : `${stuckPaidOrders.length} 个已支付订单超过 2 小时仍未发货`,
        suggestion:
          stuckPaidOrders.length === 0
            ? undefined
            : '在“订单管理”页使用订单筛选工具定位这些订单，并手动执行发货/重试',
      })

      nextChecks.push({
        id: 'failed-orders',
        title: '失败订单监控',
        status: failedOrders.length > 10 ? 'critical' : failedOrders.length > 0 ? 'warning' : 'ok',
        description:
          failedOrders.length === 0
            ? '暂无失败订单'
            : `最近有 ${failedOrders.length} 个订单失败，建议关注渠道回调`,
        suggestion:
          failedOrders.length === 0
            ? undefined
            : '查看支付渠道日志或财务审计记录，确认是否存在大面积支付异常',
      })

      nextChecks.push({
        id: 'delivered-orders',
        title: '已发货订单追踪',
        status: pendingDeliveries.length === 0 ? 'ok' : 'warning',
        description:
          pendingDeliveries.length === 0
            ? '不存在长时间未确认收货的订单'
            : `${pendingDeliveries.length} 个订单发货超过 24 小时仍未确认，建议核对奖励派发`,
      })

      if (businessMetrics) {
        nextChecks.push({
          id: 'payment-errors',
          title: '支付错误率',
          status:
            businessMetrics.errors?.paymentErrors > 20
              ? 'critical'
              : businessMetrics.errors?.paymentErrors > 0
              ? 'warning'
              : 'ok',
          description: `近 5 分钟支付错误数：${businessMetrics.errors?.paymentErrors ?? 0}`,
          suggestion:
            businessMetrics.errors?.paymentErrors > 0
              ? '请检查支付渠道配置或联系渠道方排查波动'
              : undefined,
        })
      }

      if (serverMetrics) {
        nextChecks.push({
          id: 'error-rate',
          title: '接口错误率',
          status:
            serverMetrics.requests?.errorRate > 0.05
              ? 'critical'
              : serverMetrics.requests?.errorRate > 0.02
              ? 'warning'
              : 'ok',
          description: `当前错误率 ${(serverMetrics.requests?.errorRate * 100 || 0).toFixed(2)}%，QPS ${serverMetrics.requests?.qps || 0}`,
          suggestion:
            serverMetrics.requests?.errorRate > 0.02
              ? '请查看日志服务与监控面板，定位具体失败接口'
              : undefined,
        })
      }

      if (stats) {
        nextChecks.push({
          id: 'revenue-trend',
          title: '营收趋势',
          status: stats.todayRevenue > 0 ? 'ok' : 'warning',
          description:
            stats.todayRevenue > 0
              ? `今日收入 ¥${stats.todayRevenue.toFixed(2)}`
              : '今日收入为 0，可能是尚未开服或渠道回调异常',
          suggestion: stats.todayRevenue > 0 ? undefined : '检查支付渠道与网关服务是否正常运行',
        })
      }

      setChecks(nextChecks)
      setLastUpdated(Date.now())
    } catch (error: any) {
      toast({
        title: '健康巡检失败',
        description: error?.message || '请稍后再试',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runHealthChecks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderStatusIcon = (status: HealthStatus) => {
    if (status === 'ok') {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />
    }
    return <AlertTriangle className={status === 'critical' ? 'h-5 w-5 text-red-600' : 'h-5 w-5 text-yellow-600'} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">健康巡检</h1>
          <p className="text-sm text-gray-600 mt-1">
            快速发现财务与系统异常，涵盖订单、退款、支付渠道、接口错误率等关键指标
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              上次检测：{new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <Button onClick={runHealthChecks} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            重新巡检
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>整体状态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>正常</span>
              <Badge variant="secondary">{statusStats.ok}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>关注</span>
              <Badge variant="outline">{statusStats.warning}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>告警</span>
              <Badge variant="destructive">{statusStats.critical}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>最新建议</CardTitle>
          </CardHeader>
          <CardContent>
            {checks.filter((check) => check.suggestion).slice(0, 3).map((check) => (
              <div key={check.id} className="mb-3 last:mb-0">
                <p className="text-sm font-semibold text-gray-900">{check.title}</p>
                <p className="text-xs text-gray-600">{check.suggestion}</p>
              </div>
            ))}
            {!checks.some((check) => check.suggestion) && (
              <p className="text-sm text-gray-600">暂无需要处理的事项</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>巡检说明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>· 数据基于最近 100 条订单与退款样本。</p>
            <p>· 支付错误率来源于监控服务的 business metrics。</p>
            <p>· 若检测持续失败，请检查 API 密钥与后端服务连通性。</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">巡检中，请稍候...</div>
        ) : (
          checks.map((check) => (
            <Card key={check.id} className={check.status === 'critical' ? 'border-red-200 bg-red-50' : check.status === 'warning' ? 'border-yellow-200 bg-yellow-50' : ''}>
              <CardContent className="flex flex-col gap-2 py-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  {renderStatusIcon(check.status)}
                  <div>
                    <p className="text-lg font-semibold">{check.title}</p>
                    <p className="text-sm text-gray-700">{check.description}</p>
                  </div>
                </div>
                {check.suggestion && (
                  <p className="text-sm text-gray-600 md:max-w-md">{check.suggestion}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
