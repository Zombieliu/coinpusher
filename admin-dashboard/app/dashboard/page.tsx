'use client'

import { useEffect, useState } from 'react'
import { fetchStatistics } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { Users, DollarSign, Activity, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'

interface Stats {
  dau: number
  mau: number
  newUsers: number
  totalUsers: number
  totalRevenue: number
  todayRevenue: number
  arpu: number
  arppu: number
  payRate: number
  onlinePlayers: number
  totalMatches: number
  avgSessionTime: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    dau: 0,
    mau: 0,
    newUsers: 0,
    totalUsers: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    arpu: 0,
    arppu: 0,
    payRate: 0,
    onlinePlayers: 0,
    totalMatches: 0,
    avgSessionTime: 0,
  })
  const [loading, setLoading] = useState(true)
  const [revenueData, setRevenueData] = useState<Array<{ date: string; revenue: number }>>([])

  useEffect(() => {
    loadStats()
    loadChartData()

    // 每30秒刷新一次
    const interval = setInterval(() => {
      loadStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  async function loadStats() {
    setLoading(true)
    const result = await fetchStatistics()
    if (result.isSucc && result.res) {
      // 映射 API 响应字段到前端 state
      setStats({
        dau: result.res.dau || 0,
        mau: result.res.mau || 0,
        newUsers: result.res.newUsersToday || 0,
        totalUsers: result.res.totalUsers || 0,
        totalRevenue: result.res.totalRevenue || 0,
        todayRevenue: result.res.todayRevenue || 0,
        arpu: result.res.arpu || 0,
        arppu: result.res.arppu || 0,
        payRate: result.res.payRate || 0,
        onlinePlayers: result.res.activeUsers || 0,
        totalMatches: result.res.totalMatches || 0,
        avgSessionTime: result.res.avgSessionTime || 0,
      })
    }
    setLoading(false)
  }

  function loadChartData() {
    // 生成最近7天的模拟数据
    const data = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      data.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        revenue: Math.floor(Math.random() * 10000) + 5000
      })
    }
    setRevenueData(data)
  }

  const cards = [
    {
      title: '日活用户 (DAU)',
      value: formatNumber(stats.dau),
      subtitle: `月活 ${formatNumber(stats.mau)}`,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
      trend: 'up',
    },
    {
      title: '今日收入',
      value: `¥${formatNumber(stats.todayRevenue)}`,
      subtitle: `总收入 ¥${formatNumber(stats.totalRevenue)}`,
      icon: DollarSign,
      color: 'bg-green-500',
      change: '+23%',
      trend: 'up',
    },
    {
      title: '在线人数',
      value: formatNumber(stats.onlinePlayers),
      subtitle: `平均时长 ${stats.avgSessionTime}分钟`,
      icon: Activity,
      color: 'bg-purple-500',
      change: '实时',
      trend: 'up',
    },
    {
      title: '新增用户',
      value: formatNumber(stats.newUsers),
      subtitle: `总用户 ${formatNumber(stats.totalUsers)}`,
      icon: TrendingUp,
      color: 'bg-yellow-500',
      change: '+8%',
      trend: 'up',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${card.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {card.trend === 'up' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  {card.change}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold mb-1">{card.value}</p>
                <p className="text-xs text-gray-500">{card.subtitle}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* 图表区域 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 收入趋势 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
            收入趋势
            <span className="text-sm text-gray-500">最近7天</span>
          </h3>
          <div className="h-64">
            <SimpleBarChart data={revenueData} />
          </div>
        </div>

        {/* 用户增长 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
            用户增长
            <span className="text-sm text-gray-500">最近7天</span>
          </h3>
          <div className="h-64">
            <SimpleLineChart />
          </div>
        </div>
      </div>

      {/* 关键指标 */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">收入指标</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ARPU (人均收入)</span>
              <span className="text-xl font-bold">¥{stats.arpu.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ARPPU (付费用户人均)</span>
              <span className="text-xl font-bold">¥{stats.arppu.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">付费率</span>
              <span className="text-xl font-bold">{(stats.payRate * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">游戏数据</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">总对局数</span>
              <span className="text-xl font-bold">{formatNumber(stats.totalMatches)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">平均游戏时长</span>
              <span className="text-xl font-bold">{stats.avgSessionTime}分钟</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">当前在线</span>
              <span className="text-xl font-bold text-green-600">{formatNumber(stats.onlinePlayers)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 简单的柱状图组件
function SimpleBarChart({ data }: { data: Array<{ date: string; revenue: number }> }) {
  const maxRevenue = Math.max(...data.map(d => d.revenue))

  return (
    <div className="h-full flex items-end justify-between gap-2 px-4">
      {data.map((item, i) => {
        const height = (item.revenue / maxRevenue) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="text-xs text-gray-500">¥{(item.revenue / 1000).toFixed(1)}k</div>
            <div
              className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
              style={{ height: `${height}%` }}
              title={`${item.date}: ¥${item.revenue}`}
            />
            <div className="text-xs text-gray-600">{item.date}</div>
          </div>
        )
      })}
    </div>
  )
}

// 简单的折线图组件
function SimpleLineChart() {
  const data = [120, 150, 180, 220, 190, 240, 280]
  const maxValue = Math.max(...data)

  return (
    <div className="h-full relative">
      <svg className="w-full h-full" viewBox="0 0 100 50">
        <polyline
          points={data.map((val, i) => `${(i / (data.length - 1)) * 100},${50 - (val / maxValue) * 45}`).join(' ')}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="0.5"
        />
        {data.map((val, i) => (
          <circle
            key={i}
            cx={(i / (data.length - 1)) * 100}
            cy={50 - (val / maxValue) * 45}
            r="0.8"
            fill="#3b82f6"
          />
        ))}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-gray-500">
        {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, i) => (
          <span key={i}>{day}</span>
        ))}
      </div>
    </div>
  )
}
