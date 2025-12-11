'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  exportInviteLeaderboard,
  fetchInviteLeaderboard,
  fetchInviteRewardConfig,
  fetchInviteRewardHistory,
  updateInviteRewardConfig
} from '@/lib/api'
import { Download, History, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

const DEFAULT_CONFIG = {
  registerReward: 5,
  registerRewardInviter: 5,
  firstChargeRate: 10,
  level10Reward: 50,
  level20Reward: 100,
  level30Reward: 200
}

export default function InvitePage() {
  const { toast } = useToast()
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [summary, setSummary] = useState({
    totalInvites: 0,
    totalRewards: 0,
    totalInviters: 0,
    todaysNewInvites: 0
  })
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [sortBy, setSortBy] = useState<'invites' | 'rewards'>('invites')
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [configVersion, setConfigVersion] = useState<number>(0)
  const [configUpdatedAt, setConfigUpdatedAt] = useState<number>(0)
  const [configUpdatedBy, setConfigUpdatedBy] = useState<string>('system')
  const [configComment, setConfigComment] = useState('')
  const [configSaving, setConfigSaving] = useState(false)

  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const lastPage = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

  const loadLeaderboard = async () => {
    setLoading(true)
    try {
      const res = await fetchInviteLeaderboard({
        page,
        limit,
        sortBy,
        search: search.trim() || undefined
      })
      if (res.isSucc && res.res) {
        setLeaderboard(res.res.list || [])
        setSummary(res.res.summary || summary)
        setTotal(res.res.total || 0)
        setConfigVersion(res.res.configVersion || configVersion)
      } else {
        toast({ title: '加载失败', description: res.err?.message, variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: '网络错误', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const loadConfig = async () => {
    try {
      const res = await fetchInviteRewardConfig()
      if (res.isSucc && res.res) {
        setConfig(res.res.config || DEFAULT_CONFIG)
        setConfigVersion(res.res.version || 0)
        setConfigUpdatedAt(res.res.updatedAt || 0)
        setConfigUpdatedBy(res.res.updatedBy?.username || 'system')
      }
    } catch (error) {
      console.error('Failed to load invite config', error)
    }
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetchInviteRewardHistory(1, 20)
      if (res.isSucc && res.res) {
        setHistory(res.res.history || [])
        setHistoryOpen(true)
      }
    } catch (error) {
      console.error('Failed to load config history', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadLeaderboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy])

  useEffect(() => {
    loadConfig()
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportInviteLeaderboard({
        limit: 500,
        sortBy,
        search: search.trim() || undefined
      })
      if (res.isSucc && res.res) {
        const csvString = atob(res.res.csvBase64)
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = res.res.fileName
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: '导出成功', description: `共 ${res.res.total} 条数据` })
      } else {
        toast({ title: '导出失败', description: res.err?.message, variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: '导出失败', description: error.message, variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  const handleConfigSave = async () => {
    setConfigSaving(true)
    try {
      const res = await updateInviteRewardConfig(config, configComment || undefined)
      if (res.isSucc && res.res?.success) {
        toast({ title: '配置已保存', description: `版本 v${res.res.version}` })
        setConfigVersion(res.res.version)
        setConfigComment('')
        loadConfig()
      } else {
        toast({ title: '保存失败', description: res.err?.message, variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: '保存失败', description: error.message, variant: 'destructive' })
    } finally {
      setConfigSaving(false)
    }
  }

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value || 0)

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A'
    return format(timestamp, 'yyyy-MM-dd HH:mm')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">邀请系统</h1>
          <p className="text-sm text-gray-500">查看邀请排行榜并调整奖励配置</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadLeaderboard}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新数据
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            导出 CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">累计邀请</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatNumber(summary.totalInvites)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">累计奖励发放</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatNumber(summary.totalRewards)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">活跃邀请人</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatNumber(summary.totalInviters)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">今日新增邀请</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatNumber(summary.todaysNewInvites)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>邀请排行榜</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="搜索用户ID / 邀请码"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Button
              onClick={() => {
                setPage(1)
                loadLeaderboard()
              }}
            >
              搜索
            </Button>
            <Select value={sortBy} onValueChange={(v: 'invites' | 'rewards') => setSortBy(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invites">按邀请人数</SelectItem>
                <SelectItem value="rewards">按累计奖励</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">排名</th>
                  <th className="p-3 text-left">用户ID</th>
                  <th className="p-3 text-left">邀请码</th>
                  <th className="p-3 text-left">邀请人数</th>
                  <th className="p-3 text-left">有效邀请</th>
                  <th className="p-3 text-left">累计奖励</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((entry) => (
                    <tr key={entry.userId} className="border-b">
                      <td className="p-3 font-semibold">{entry.rank}</td>
                      <td className="p-3 font-mono">{entry.userId}</td>
                      <td className="p-3">{entry.inviteCode}</td>
                      <td className="p-3">{entry.totalInvites}</td>
                      <td className="p-3">{entry.validInvites}</td>
                      <td className="p-3">{entry.totalRewards}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              第 {page} / {lastPage} 页，共 {total} 条
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= lastPage}
              >
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>奖励配置</CardTitle>
            <p className="text-sm text-gray-500">
              当前版本 v{configVersion} · 更新人 {configUpdatedBy} ·{' '}
              {configUpdatedAt ? formatDate(configUpdatedAt) : '未记录'}
            </p>
          </div>
          <Button variant="outline" onClick={loadHistory} disabled={historyLoading}>
            <History className="mr-2 h-4 w-4" />
            查看历史
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>注册奖励（被邀请人）</Label>
              <Input
                type="number"
                value={config.registerReward}
                onChange={(e) =>
                  setConfig({ ...config, registerReward: parseInt(e.target.value || '0', 10) })
                }
              />
            </div>
            <div>
              <Label>注册奖励（邀请人）</Label>
              <Input
                type="number"
                value={config.registerRewardInviter}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    registerRewardInviter: parseInt(e.target.value || '0', 10)
                  })
                }
              />
            </div>
            <div>
              <Label>首充返利比例 (%)</Label>
              <Input
                type="number"
                value={config.firstChargeRate}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    firstChargeRate: parseInt(e.target.value || '0', 10)
                  })
                }
              />
            </div>
          </div>

          <Tabs defaultValue="level10">
            <TabsList>
              <TabsTrigger value="level10">等级10奖励</TabsTrigger>
              <TabsTrigger value="level20">等级20奖励</TabsTrigger>
              <TabsTrigger value="level30">等级30奖励</TabsTrigger>
            </TabsList>
            <TabsContent value="level10">
              <Input
                type="number"
                value={config.level10Reward}
                onChange={(e) =>
                  setConfig({ ...config, level10Reward: parseInt(e.target.value || '0', 10) })
                }
              />
            </TabsContent>
            <TabsContent value="level20">
              <Input
                type="number"
                value={config.level20Reward}
                onChange={(e) =>
                  setConfig({ ...config, level20Reward: parseInt(e.target.value || '0', 10) })
                }
              />
            </TabsContent>
            <TabsContent value="level30">
              <Input
                type="number"
                value={config.level30Reward}
                onChange={(e) =>
                  setConfig({ ...config, level30Reward: parseInt(e.target.value || '0', 10) })
                }
              />
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>操作备注（可选）</Label>
            <Input
              placeholder="记录本次调整的原因"
              value={configComment}
              onChange={(e) => setConfigComment(e.target.value)}
            />
          </div>

          <div className="text-right">
            <Button onClick={handleConfigSave} disabled={configSaving}>
              保存配置
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>奖励配置历史</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">版本</th>
                  <th className="p-3 text-left">更新时间</th>
                  <th className="p-3 text-left">更新人</th>
                  <th className="p-3 text-left">备注</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500">
                      暂无历史记录
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.historyId} className="border-b">
                      <td className="p-3 font-semibold">v{item.version}</td>
                      <td className="p-3">{formatDate(item.updatedAt)}</td>
                      <td className="p-3">{item.updatedBy?.username || 'unknown'}</td>
                      <td className="p-3 text-gray-500">{item.comment || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
