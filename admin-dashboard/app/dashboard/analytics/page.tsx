'use client'

import { useEffect, useState } from 'react'
import { callAPI, fetchAdvancedStats } from '@/lib/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  Calendar,
  RefreshCw,
  LineChart
} from 'lucide-react'

// ... existing interfaces ...

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('basic')
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">数据分析</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basic">基础审计</TabsTrigger>
          <TabsTrigger value="advanced">高级运营 (LTV/留存)</TabsTrigger>
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

function BasicAnalytics() {
  // ... 原有的 AnalyticsPage 逻辑移到这里 ...
  // 为了简洁，这里假设原代码已封装好，但我需要把原文件的内容重构进去。
  // 由于篇幅限制，我将在下一步完全重写这个文件。
  return <div>Loading Basic Analytics...</div>
}

function AdvancedAnalytics() {
  const [ltvData, setLtvData] = useState<any[]>([])
  const [retentionData, setRetentionData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div>加载中...</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>用户留存率 (Retention)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3">日期</th>
                  <th className="p-3">次日留存</th>
                  <th className="p-3">3日留存</th>
                  <th className="p-3">7日留存</th>
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
        <CardHeader><CardTitle>LTV (30日趋势)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-end gap-2">
             {ltvData.map((row) => (
               <div key={row.date} className="flex-1 bg-blue-100 relative group hover:bg-blue-200" style={{ height: `${Math.min(row.ltv * 10, 100)}%` }}>
                 <div className="absolute bottom-0 w-full text-center text-xs transform -rotate-90 origin-bottom-left translate-x-full mb-2">
                   {row.date.slice(5)}
                 </div>
                 <div className="hidden group-hover:block absolute bottom-full bg-black text-white text-xs p-1 rounded">
                   ${row.ltv.toFixed(2)}
                 </div>
               </div>
             ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
