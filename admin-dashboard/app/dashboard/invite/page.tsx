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
import { useTranslation } from '@/components/providers/i18n-provider'

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
  const { t, locale } = useTranslation('invite')
  const { t: tCommon } = useTranslation('common')
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
        toast({ title: t('alerts.loadFailed'), description: res.err?.message, variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: t('alerts.network'), description: error.message, variant: 'destructive' })
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
        toast({
          title: t('alerts.exportSuccess'),
          description: t('alerts.exportSuccessDesc', { count: res.res.total }),
        })
      } else {
        toast({ title: t('alerts.exportFailed'), description: res.err?.message, variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: t('alerts.exportFailed'), description: error.message, variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  const handleConfigSave = async () => {
    setConfigSaving(true)
    try {
      const res = await updateInviteRewardConfig(config, configComment || undefined)
      if (res.isSucc && res.res?.success) {
        toast({
          title: t('alerts.configSaved'),
          description: t('alerts.configSavedDesc', { version: res.res.version }),
        })
        setConfigVersion(res.res.version)
        setConfigComment('')
        loadConfig()
      } else {
        toast({ title: t('alerts.saveFailed'), description: res.err?.message, variant: 'destructive' })
      }
    } catch (error: any) {
      toast({ title: t('alerts.saveFailed'), description: error.message, variant: 'destructive' })
    } finally {
      setConfigSaving(false)
    }
  }

  const formatNumber = (value: number) =>
    new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { maximumFractionDigits: 0 }).format(value || 0)

  const formatDateValue = (timestamp: number) => {
    if (!timestamp) return tCommon('none')
    return new Date(timestamp).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadLeaderboard}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('buttons.refresh')}
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {t('buttons.export')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">{t('stats.totalInvites')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatNumber(summary.totalInvites)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">{t('stats.totalRewards')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatNumber(summary.totalRewards)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">{t('stats.totalInviters')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatNumber(summary.totalInviters)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">{t('stats.todaysNew')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatNumber(summary.todaysNewInvites)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder={t('table.searchPlaceholder')}
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
              {t('table.search')}
            </Button>
            <Select value={sortBy} onValueChange={(v: 'invites' | 'rewards') => setSortBy(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('table.sortPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invites">{t('table.sortOptions.invites')}</SelectItem>
                <SelectItem value="rewards">{t('table.sortOptions.rewards')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">{t('table.headers.rank')}</th>
                  <th className="p-3 text-left">{t('table.headers.userId')}</th>
                  <th className="p-3 text-left">{t('table.headers.code')}</th>
                  <th className="p-3 text-left">{t('table.headers.invites')}</th>
                  <th className="p-3 text-left">{t('table.headers.validInvites')}</th>
                  <th className="p-3 text-left">{t('table.headers.rewards')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      {t('table.loading')}
                    </td>
                  </tr>
                ) : leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      {t('table.empty')}
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
              {t('table.pagination', { page, pages: lastPage, total })}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {tCommon('prevPage')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= lastPage}
              >
                {tCommon('nextPage')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('configSection.title')}</CardTitle>
            <p className="text-sm text-gray-500">
              {t('configSection.meta', {
                version: configVersion,
                user: configUpdatedBy,
                time: configUpdatedAt ? formatDateValue(configUpdatedAt) : tCommon('none'),
              })}
            </p>
          </div>
          <Button variant="outline" onClick={loadHistory} disabled={historyLoading}>
            <History className="mr-2 h-4 w-4" />
            {t('buttons.loadHistory')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>{t('configSection.registerInvitee')}</Label>
                <Input
                  type="number"
                  value={config.registerReward}
                onChange={(e) =>
                  setConfig({ ...config, registerReward: parseInt(e.target.value || '0', 10) })
                }
              />
              </div>
              <div>
                <Label>{t('configSection.registerInviter')}</Label>
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
                <Label>{t('configSection.firstChargeRate')}</Label>
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
              <TabsTrigger value="level10">{t('configSection.tabs.level10')}</TabsTrigger>
              <TabsTrigger value="level20">{t('configSection.tabs.level20')}</TabsTrigger>
              <TabsTrigger value="level30">{t('configSection.tabs.level30')}</TabsTrigger>
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
            <Label>{t('configSection.commentLabel')}</Label>
            <Input
              placeholder={t('configSection.commentPlaceholder')}
              value={configComment}
              onChange={(e) => setConfigComment(e.target.value)}
            />
          </div>

          <div className="text-right">
            <Button onClick={handleConfigSave} disabled={configSaving}>
              {configSaving ? t('buttons.saving') : t('buttons.saveConfig')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('rewardHistory.title')}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">{t('rewardHistory.columns.version')}</th>
                  <th className="p-3 text-left">{t('rewardHistory.columns.updatedAt')}</th>
                  <th className="p-3 text-left">{t('rewardHistory.columns.updatedBy')}</th>
                  <th className="p-3 text-left">{t('rewardHistory.columns.comment')}</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500">
                      {t('rewardHistory.empty')}
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.historyId} className="border-b">
                      <td className="p-3 font-semibold">v{item.version}</td>
                    <td className="p-3">{formatDateValue(item.updatedAt)}</td>
                      <td className="p-3">{item.updatedBy?.username || tCommon('none')}</td>
                      <td className="p-3 text-gray-500">{item.comment || tCommon('none')}</td>
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
