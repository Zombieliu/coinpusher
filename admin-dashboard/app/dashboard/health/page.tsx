'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { fetchOrders, fetchRefunds, fetchFinancialStats, fetchSystemMetrics } from '@/lib/api'
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { useTranslation } from '@/components/providers/i18n-provider'

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
  const { t } = useTranslation('health')
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

  const runHealthChecks = useCallback(async () => {
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

      const refundsStatus = pendingRefunds.length === 0 ? 'ok' : pendingRefunds.length > 5 ? 'critical' : 'warning'
      nextChecks.push({
        id: 'pending-refunds',
        title: t('checks.pendingRefunds.title'),
        status: refundsStatus,
        description:
          pendingRefunds.length === 0
            ? t('checks.pendingRefunds.description.ok')
            : t('checks.pendingRefunds.description.warn', { count: pendingRefunds.length }),
        suggestion: pendingRefunds.length === 0 ? undefined : t('checks.pendingRefunds.suggestion'),
      })

      const stuckStatus = stuckPaidOrders.length === 0 ? 'ok' : stuckPaidOrders.length > 5 ? 'critical' : 'warning'
      nextChecks.push({
        id: 'stuck-orders',
        title: t('checks.stuckOrders.title'),
        status: stuckStatus,
        description:
          stuckPaidOrders.length === 0
            ? t('checks.stuckOrders.description.ok')
            : t('checks.stuckOrders.description.warn', { count: stuckPaidOrders.length }),
        suggestion: stuckPaidOrders.length === 0 ? undefined : t('checks.stuckOrders.suggestion'),
      })

      const failedStatus = failedOrders.length > 10 ? 'critical' : failedOrders.length > 0 ? 'warning' : 'ok'
      nextChecks.push({
        id: 'failed-orders',
        title: t('checks.failedOrders.title'),
        status: failedStatus,
        description:
          failedOrders.length === 0
            ? t('checks.failedOrders.description.ok')
            : t('checks.failedOrders.description.warn', { count: failedOrders.length }),
        suggestion: failedOrders.length === 0 ? undefined : t('checks.failedOrders.suggestion'),
      })

      nextChecks.push({
        id: 'delivered-orders',
        title: t('checks.deliveredOrders.title'),
        status: pendingDeliveries.length === 0 ? 'ok' : 'warning',
        description:
          pendingDeliveries.length === 0
            ? t('checks.deliveredOrders.description.ok')
            : t('checks.deliveredOrders.description.warn', { count: pendingDeliveries.length }),
      })

      if (businessMetrics) {
        const paymentErrors = businessMetrics.errors?.paymentErrors ?? 0
        nextChecks.push({
          id: 'payment-errors',
          title: t('checks.paymentErrors.title'),
          status: paymentErrors > 20 ? 'critical' : paymentErrors > 0 ? 'warning' : 'ok',
          description: t('checks.paymentErrors.description', { count: paymentErrors }),
          suggestion: paymentErrors > 0 ? t('checks.paymentErrors.suggestion') : undefined,
        })
      }

      if (serverMetrics) {
        const errorRateValue = serverMetrics.requests?.errorRate ?? 0
        const ratePercent = ((errorRateValue) * 100 || 0).toFixed(2)
        const qps = serverMetrics.requests?.qps || 0
        nextChecks.push({
          id: 'error-rate',
          title: t('checks.errorRate.title'),
          status: errorRateValue > 0.05 ? 'critical' : errorRateValue > 0.02 ? 'warning' : 'ok',
          description: t('checks.errorRate.description', { rate: ratePercent, qps }),
          suggestion: errorRateValue > 0.02 ? t('checks.errorRate.suggestion') : undefined,
        })
      }

      if (stats) {
        const revenueStatus = stats.todayRevenue > 0 ? 'ok' : 'warning'
        nextChecks.push({
          id: 'revenue-trend',
          title: t('checks.revenueTrend.title'),
          status: revenueStatus,
          description:
            stats.todayRevenue > 0
              ? t('checks.revenueTrend.description.ok', { value: stats.todayRevenue.toFixed(2) })
              : t('checks.revenueTrend.description.warn'),
          suggestion: stats.todayRevenue > 0 ? undefined : t('checks.revenueTrend.suggestion'),
        })
      }

      setChecks(nextChecks)
      setLastUpdated(Date.now())
    } catch (error: any) {
      toast({
        title: t('toast.failed'),
        description: error?.message || t('toast.description'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  useEffect(() => {
    runHealthChecks()
  }, [runHealthChecks])

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
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {t('description')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              {t('lastRun', { time: new Date(lastUpdated).toLocaleTimeString() })}
            </span>
          )}
          <Button onClick={runHealthChecks} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('cards.overall.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{t('cards.overall.ok')}</span>
              <Badge variant="secondary">{statusStats.ok}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{t('cards.overall.warning')}</span>
              <Badge variant="outline">{statusStats.warning}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{t('cards.overall.critical')}</span>
              <Badge variant="destructive">{statusStats.critical}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('cards.tips.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {checks.filter((check) => check.suggestion).slice(0, 3).map((check) => (
              <div key={check.id} className="mb-3 last:mb-0">
                <p className="text-sm font-semibold text-gray-900">{check.title}</p>
                <p className="text-xs text-gray-600">{check.suggestion}</p>
              </div>
            ))}
            {!checks.some((check) => check.suggestion) && (
              <p className="text-sm text-gray-600">{t('cards.tips.empty')}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('cards.notes.title')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>{t('cards.notes.line1')}</p>
            <p>{t('cards.notes.line2')}</p>
            <p>{t('cards.notes.line3')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">{t('loading')}</div>
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
