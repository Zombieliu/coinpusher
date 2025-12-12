'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchAdvancedStats, fetchStatistics, fetchLogAnalytics } from '@/lib/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  Calendar,
  RefreshCw,
  LineChart
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { useTranslation } from '@/components/providers/i18n-provider'

// ... existing interfaces ...

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('basic')
  const { t } = useTranslation('analytics')
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basic">{t('tabs.basic')}</TabsTrigger>
          <TabsTrigger value="advanced">{t('tabs.advanced')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          <BasicAnalytics />
        </TabsContent>
        
        <TabsContent value="advanced">
          <AdvancedAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  )
}

type TimeRange = '7d' | '30d' | '90d'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalRevenue: number
  newUsersToday: number
  dau?: number
  mau?: number
  todayRevenue?: number
  arpu?: number
  arppu?: number
  payRate?: number
  totalMatches?: number
  avgSessionTime?: number
}

interface LogAnalyticsData {
  actionStats: Array<{ action: string; count: number; percentage: number }>
  adminStats: Array<{ adminId: string; adminName?: string; operationCount: number; lastOperation: number }>
  timeDistribution: Array<{ hour: number; count: number }>
  dailyTrend: Array<{ date: string; count: number }>
  totalOperations: number
  activeAdmins: number
  mostCommonAction: string
}

function BasicAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [logData, setLogData] = useState<LogAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { t, locale } = useTranslation('analytics')
  const localeCode = locale === 'zh' ? 'zh-CN' : 'en-US'
  const loadData = useCallback(async () => {
    setLoading(true)
    const now = Date.now()
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const startTime = now - days * 24 * 60 * 60 * 1000

    try {
      const [statsRes, logRes] = await Promise.all([
        fetchStatistics(),
        fetchLogAnalytics({ startTime, endTime: now })
      ])

      const errors: string[] = []

      if (statsRes.isSucc && statsRes.res) {
        setStats(statsRes.res as DashboardStats)
      } else {
        setStats(null)
        errors.push(statsRes.err?.message || t('errors.stats'))
      }

      if (logRes.isSucc && logRes.res) {
        setLogData(logRes.res as LogAnalyticsData)
      } else {
        setLogData(null)
        errors.push(logRes.err?.message || t('errors.logs'))
      }

      setError(errors.length ? errors.join(' / ') : null)
    } catch (err: any) {
      console.error(err)
      setError(err.message || t('errors.basic'))
      setStats(null)
      setLogData(null)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  const initialLoading = loading && !stats && !logData
  const actionStats = logData?.actionStats ?? []
  const adminStats = logData?.adminStats ?? []
  const timeDistribution = logData?.timeDistribution ?? []
  const dailyTrend = logData?.dailyTrend ?? []

  const hourlyMax = timeDistribution.reduce((max, item) => Math.max(max, item.count), 0) || 1
  const dailyMax = dailyTrend.reduce((max, item) => Math.max(max, item.count), 0) || 0

  const summaryCards = [
    {
      key: 'totalUsers',
      title: t('summaryCards.totalUsers.title'),
      value: formatNumber(stats?.totalUsers ?? 0),
      desc: t('summaryCards.totalUsers.desc'),
      icon: Users,
      gradient: 'from-blue-500 to-indigo-500'
    },
    {
      key: 'activeUsers',
      title: t('summaryCards.activeUsers.title'),
      value: formatNumber(stats?.activeUsers ?? 0),
      desc: t('summaryCards.activeUsers.desc'),
      icon: Clock,
      gradient: 'from-emerald-500 to-teal-500'
    },
    {
      key: 'revenue',
      title: t('summaryCards.revenue.title'),
      value: formatCurrency(stats?.totalRevenue, 0, localeCode),
      desc: t('summaryCards.revenue.desc', { value: formatCurrency(stats?.todayRevenue, 0, localeCode) }),
      icon: TrendingUp,
      gradient: 'from-orange-500 to-pink-500'
    },
    {
      key: 'newUsers',
      title: t('summaryCards.newUsers.title'),
      value: formatNumber(stats?.newUsersToday ?? 0),
      desc: t('summaryCards.newUsers.desc', { value: formatNumber(stats?.dau ?? 0) }),
      icon: Calendar,
      gradient: 'from-purple-500 to-fuchsia-500'
    }
  ]

  const kpiCards = [
    { label: 'ARPU', value: formatCurrency(stats?.arpu, 2, localeCode), helper: t('kpis.arpu') },
    { label: 'ARPPU', value: formatCurrency(stats?.arppu, 2, localeCode), helper: t('kpis.arppu') },
    { label: t('kpis.payRate'), value: formatPercent(stats?.payRate), helper: t('kpis.payRateHelper') },
    { label: t('kpis.matches'), value: formatNumber(stats?.totalMatches ?? 0), helper: t('kpis.matchesHelper') }
  ]

  const logSummary = [
    { label: t('logSummary.totalOperations'), value: formatNumber(logData?.totalOperations ?? 0) },
    { label: t('logSummary.activeAdmins'), value: formatNumber(logData?.activeAdmins ?? 0) },
    { label: t('logSummary.commonAction'), value: formatActionLabel(logData?.mostCommonAction, t('format.unknownAction')) }
  ]

  if (initialLoading) {
    return (
      <div className="py-16 text-center text-gray-500">
        {t('loadingBasic')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {['7d', '30d', '90d'].map(value => (
            <Button
              key={value}
              size="sm"
              variant={timeRange === value ? 'default' : 'outline'}
              onClick={() => setTimeRange(value as TimeRange)}
            >
              {t(`ranges.${value}` as const)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {loading && (stats || logData) && (
            <span className="text-xs text-gray-500">{t('updating')}</span>
          )}
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(card => {
          const Icon = card.icon
          return (
            <Card key={card.title} className={`text-white bg-gradient-to-r ${card.gradient}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className="h-4 w-4 opacity-80" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                <p className="text-xs text-white/80 mt-1">{card.desc}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {kpiCards.map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900">{card.value}</div>
              <p className="text-xs text-gray-500 mt-1">{card.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {logSummary.map(item => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              {t('actionDistribution.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {actionStats.length === 0 ? (
              <div className="text-sm text-gray-500">{t('actionDistribution.empty')}</div>
            ) : (
              <div className="space-y-4">
                {actionStats.map((item, index) => (
                  <div key={item.action}>
                    <div className="flex items-center justify-between text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">#{index + 1}</span>
                      <span>{formatActionLabel(item.action, t('format.unknownAction'))}</span>
                    </div>
                      <span>{t('actionDistribution.times', { count: item.count })}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${item.percentage.toFixed(1)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-green-600" />
              {t('adminActivity.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adminStats.length === 0 ? (
              <div className="text-sm text-gray-500">{t('adminActivity.empty')}</div>
            ) : (
              <div className="space-y-3">
                {adminStats.slice(0, 6).map((admin, index) => (
                  <div key={admin.adminId} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {index < 3 ? MEDALS[index] : `${index + 1}.`} {admin.adminName || admin.adminId}
                      </span>
                      <span className="text-xs text-gray-500">
                        {t('adminActivity.lastAction', { time: formatTimestamp(admin.lastOperation, localeCode) })}
                      </span>
                    </div>
                    <span className="text-gray-700">{t('adminActivity.operations', { count: admin.operationCount })}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-purple-600" />
              {t('timeDistribution.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeDistribution.length === 0 ? (
              <div className="text-sm text-gray-500">{t('timeDistribution.empty')}</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                {timeDistribution.map(item => (
                  <div key={item.hour}>
                    <div className="flex items-center justify-between text-gray-500">
                      <span>{item.hour.toString().padStart(2, '0')}:00</span>
                      <span>{item.count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-purple-500"
                        style={{ width: `${(item.count / hourlyMax) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChart className="h-4 w-4 text-indigo-600" />
              {t('trend.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyTrend.length === 0 || dailyMax === 0 ? (
              <div className="text-sm text-gray-500">{t('trend.empty')}</div>
            ) : (
              <div className="flex items-end gap-2 h-48">
                {dailyTrend.map(item => (
                  <div key={item.date} className="flex flex-col items-center gap-2">
                    <div
                      className="w-10 rounded-t bg-indigo-500 transition-all"
                      style={{
                        height: `${(item.count / dailyMax) * 100}%`
                      }}
                      title={t('trend.tooltip', { date: item.date, count: item.count })}
                    />
                    <span className="text-xs text-gray-500">{item.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const MEDALS = ['🥇', '🥈', '🥉']

function formatActionLabel(action?: string, fallback = 'Unknown action') {
  if (!action) return fallback
  return action.replace('admin/', '')
}

function formatTimestamp(timestamp: number, locale: string) {
  return new Date(timestamp).toLocaleString(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatCurrency(amount?: number, fractionDigits = 0, locale = 'zh-CN') {
  const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0
  return `¥${value.toLocaleString(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}`
}

function formatPercent(value?: number) {
  const num = typeof value === 'number' && isFinite(value) ? value : 0
  return `${(num * 100).toFixed(1)}%`
}

function AdvancedAnalytics() {
  const [ltvData, setLtvData] = useState<any[]>([])
  const [retentionData, setRetentionData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation('analytics')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [ltv, ret] = await Promise.all([
        fetchAdvancedStats({ type: 'ltv', days: 30 }),
        fetchAdvancedStats({ type: 'retention', days: 7 })
      ])
      
      if (ltv.isSucc) setLtvData(ltv.res.data || [])
      if (ret.isSucc) setRetentionData(ret.res.data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div>{t('advanced.loading')}</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{t('advanced.retentionTitle')}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3">{t('advanced.retentionHeaders.date')}</th>
                  <th className="p-3">{t('advanced.retentionHeaders.d1')}</th>
                  <th className="p-3">{t('advanced.retentionHeaders.d3')}</th>
                  <th className="p-3">{t('advanced.retentionHeaders.d7')}</th>
                </tr>
              </thead>
              <tbody>
                {retentionData.map((row) => (
                  <tr key={row.date} className="border-b">
                    <td className="p-3">{row.date}</td>
                    <td className="p-3">{row.d1.toFixed(1)}%</td>
                    <td className="p-3">{row.d3.toFixed(1)}%</td>
                    <td className="p-3">{row.d7.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('advanced.ltvTitle')}</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-end gap-2">
             {ltvData.map((row) => (
               <div key={row.date} className="flex-1 bg-blue-100 relative group hover:bg-blue-200" style={{ height: `${Math.min(row.ltv * 10, 100)}%` }}>
                 <div className="absolute bottom-0 w-full text-center text-xs transform -rotate-90 origin-bottom-left translate-x-full mb-2">
                   {row.date.slice(5)}
                 </div>
                 <div className="hidden group-hover:block absolute bottom-full bg-black text-white text-xs p-1 rounded">
                   ¥{row.ltv.toFixed(2)}
                 </div>
               </div>
             ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
