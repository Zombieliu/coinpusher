'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from '@/components/providers/i18n-provider'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  createScheduledJob,
  deleteScheduledJob,
  getScheduledJobLogs,
  listScheduledJobs,
  ScheduledJobLogEntry,
  ScheduledJobStatus,
  ScheduledJobSummary,
  ScheduledJobType,
} from '@/lib/api'

type StatusFilter = 'all' | ScheduledJobStatus

const LOG_PAGE_SIZE = 10

const defaultAnnouncement = {
  title: '',
  content: '',
  priority: '0',
  duration: '24',
  type: 'notice',
  linkUrl: '',
  imageUrl: '',
  platforms: '',
}

const defaultReward = {
  userId: '',
  gold: '',
  tickets: '',
  exp: '',
  reason: '',
  items: '',
  skins: '',
  vipDays: '',
}

const defaultWebhook = {
  url: '',
  method: 'POST',
  headers: '{\n  "Content-Type": "application/json"\n}',
  body: '',
}

const defaultRetrySettings = {
  maxRetries: '',
  retryDelayMinutes: '',
}

const statusBadge: Record<ScheduledJobStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  running: 'default',
  done: 'outline',
  failed: 'destructive',
}

export default function SchedulerPage() {
  const { toast } = useToast()
  const { t } = useTranslation('scheduler')
  const [jobType, setJobType] = useState<ScheduledJobType>('announcement')
  const [runAt, setRunAt] = useState(formatLocalInputValue(Date.now() + 60 * 60 * 1000))
  const [note, setNote] = useState('')
  const [announcement, setAnnouncement] = useState(defaultAnnouncement)
  const [reward, setReward] = useState(defaultReward)
  const [webhook, setWebhook] = useState(defaultWebhook)
  const [retrySettings, setRetrySettings] = useState(defaultRetrySettings)
  const [jobs, setJobs] = useState<ScheduledJobSummary[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<ScheduledJobSummary | null>(null)
  const [jobLogs, setJobLogs] = useState<ScheduledJobLogEntry[]>([])
  const [logTotal, setLogTotal] = useState(0)
  const [logPage, setLogPage] = useState(1)
  const [logLoading, setLogLoading] = useState(false)

  const formatRetryLabel = useCallback((job: ScheduledJobSummary) => {
    if (!job.maxRetries || job.maxRetries <= 0) {
      return '-'
    }
    return `${job.retryCount ?? 0}/${job.maxRetries}`
  }, [])

  const renderLastLog = useCallback((job: ScheduledJobSummary) => {
    const log = job.logs?.[0]
    if (!log) {
      return <span className="text-xs text-muted-foreground">{t('list.noLogs')}</span>
    }
    const variant = log.result === 'success' ? 'secondary' : 'destructive'
    return (
      <div className="flex flex-col gap-0.5">
        <Badge variant={variant} className="w-fit text-xs">
          {t(`logResult.${log.result}`)} · {t('list.logAttempt', { attempt: log.attempt })}
        </Badge>
        <span className="text-xs text-muted-foreground">{formatDate(log.executedAt)}</span>
        {typeof log.httpStatus === 'number' && (
          <span className="text-xs text-muted-foreground">
            {t('logs.httpStatus', { status: log.httpStatus })}
          </span>
        )}
        {log.url && (
          <span className="text-xs text-muted-foreground truncate" title={log.url}>
            {log.url}
          </span>
        )}
        {log.message && (
          <span className="text-xs text-red-600 truncate" title={log.message}>
            {log.message}
          </span>
        )}
      </div>
    )
  }, [t])

  const loadJobs = useCallback(async (filter?: StatusFilter) => {
    setLoadingJobs(true)
    const current = filter ?? statusFilter
    const res = await listScheduledJobs(current === 'all' ? undefined : current)
    if (res.isSucc && res.res) {
      setJobs(res.res.jobs || [])
    } else {
      toast({ title: t('toast.failed'), variant: 'destructive' })
    }
    setLoadingJobs(false)
  }, [statusFilter, t, toast])

  const fetchJobLogs = useCallback(async (jobId: string, page = 1) => {
    setLogLoading(true)
    const res = await getScheduledJobLogs(jobId, { page, limit: LOG_PAGE_SIZE })
    if (res.isSucc && res.res) {
      setJobLogs(res.res.logs || [])
      setLogTotal(res.res.total || 0)
      setLogPage(page)
    } else {
      toast({ title: t('toast.failed'), variant: 'destructive' })
    }
    setLogLoading(false)
  }, [t, toast])

  const handleViewLogs = useCallback((job: ScheduledJobSummary) => {
    setSelectedJob(job)
    setJobLogs([])
    setLogTotal(0)
    setLogPage(1)
    setLogDialogOpen(true)
    fetchJobLogs(job.jobId, 1)
  }, [fetchJobLogs])

  const handleLogPageChange = useCallback((nextPage: number) => {
    if (!selectedJob) return
    fetchJobLogs(selectedJob.jobId, nextPage)
  }, [fetchJobLogs, selectedJob])

  const handleLogDialogChange = useCallback((open: boolean) => {
    setLogDialogOpen(open)
    if (!open) {
      setSelectedJob(null)
      setJobLogs([])
      setLogTotal(0)
      setLogPage(1)
      setLogLoading(false)
    }
  }, [])

  useEffect(() => {
    loadJobs(statusFilter)
  }, [loadJobs, statusFilter])

  useEffect(() => {
    setRetrySettings((prev) => {
      if (jobType === 'webhook') {
        const next = { ...prev }
        let changed = false
        if (next.maxRetries === '') {
          next.maxRetries = '3'
          changed = true
        }
        if (next.retryDelayMinutes === '') {
          next.retryDelayMinutes = '1'
          changed = true
        }
        return changed ? next : prev
      }
      return prev
    })
  }, [jobType])

  async function handleCreate() {
    setFormError(null)
    const ts = Date.parse(runAt)
    if (Number.isNaN(ts)) {
      const msg = t('toast.invalidTime')
      setFormError(msg)
      toast({ title: msg, variant: 'destructive' })
      return
    }
    if (ts - Date.now() < 60_000) {
      const msg = t('toast.futureTime')
      setFormError(msg)
      toast({ title: msg, variant: 'destructive' })
      return
    }

    try {
      const payload = buildPayload(jobType, ts)
      const retryExtras = buildRetryExtras(jobType)
      setCreating(true)

      const res = await createScheduledJob({
        type: jobType,
        runAt: ts,
        payload,
        note: note.trim() || undefined,
        ...retryExtras,
      })
      if (res.isSucc) {
        toast({ title: t('toast.created') })
        setFormError(null)
        await loadJobs(statusFilter)
      } else {
        setFormError(t('toast.failed'))
        toast({ title: t('toast.failed'), variant: 'destructive' })
      }
    } catch (err: any) {
      let msg = t('toast.failed')
      switch (err?.message) {
        case 'invalid_json':
          msg = t('toast.invalidJson')
          break
        case 'missing_fields':
          msg = t('toast.missingFields')
          break
        case 'reward_invalid':
          msg = t('toast.rewardInvalid')
          break
        case 'announcement_invalid':
          msg = t('toast.announcementInvalid')
          break
        case 'webhook_invalid':
          msg = t('toast.webhookInvalid')
          break
        case 'retry_invalid':
          msg = t('toast.retryInvalid')
          break
        default:
          break
      }
      setFormError(msg)
      toast({ title: msg, variant: 'destructive' })
      return
    } finally {
      setCreating(false)
    }
  }

  function buildPayload(type: ScheduledJobType, scheduledAt: number) {
    if (type === 'announcement') {
      if (!announcement.title.trim() || !announcement.content.trim()) {
        throw new Error('missing_fields')
      }
    const priority = Number(announcement.priority) || 0
    const durationValue = Number(announcement.duration)
    const durationHours = Number.isFinite(durationValue) && durationValue > 0 ? durationValue : 0
    if (durationHours <= 0) {
      throw new Error('announcement_invalid')
    }
    const startTime = scheduledAt
    const endTime = startTime + durationHours * 60 * 60 * 1000
      const platforms = parseCommaValues(announcement.platforms)
      return {
        title: announcement.title.trim(),
        content: announcement.content.trim(),
        type: announcement.type || 'notice',
        priority,
        startTime,
        endTime,
        linkUrl: announcement.linkUrl.trim() || undefined,
        imageUrl: announcement.imageUrl.trim() || undefined,
        platforms: platforms.length ? platforms : undefined,
      }
    }

    if (type === 'reward') {
      if (!reward.userId.trim()) {
        throw new Error('missing_fields')
      }
      const rewards: any = {}
      assignNumber(reward.gold, (v) => (rewards.gold = v))
      assignNumber(reward.tickets, (v) => (rewards.tickets = v))
      assignNumber(reward.exp, (v) => (rewards.exp = v))
      assignNumber(reward.vipDays, (v) => (rewards.vipDays = v))

      if (reward.items.trim()) {
        const parsed = safeJsonParse(reward.items)
        if (!Array.isArray(parsed) || parsed.some(item => !item || typeof item.itemId !== 'string' || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
          throw new Error('reward_invalid')
        }
        rewards.items = parsed
      }
      if (reward.skins.trim()) {
        const parsed = safeJsonParse(reward.skins)
        if (!Array.isArray(parsed) || parsed.some(item => typeof item !== 'string' || !item)) {
          throw new Error('reward_invalid')
        }
        rewards.skins = parsed
      }

      if (Object.keys(rewards).length === 0) {
        throw new Error('reward_invalid')
      }

      return {
        userId: reward.userId.trim(),
        rewards,
        reason: reward.reason.trim() || undefined,
      }
    }

    if (!webhook.url.trim()) {
      throw new Error('missing_fields')
    }
    const headers = webhook.headers.trim() ? safeJsonParse(webhook.headers) : {}
    if (typeof headers !== 'object' || Array.isArray(headers)) {
      throw new Error('webhook_invalid')
    }
    const body = webhook.body.trim() ? safeJsonParse(webhook.body) : undefined
    if (!/^https?:\/\//i.test(webhook.url.trim())) {
      throw new Error('webhook_invalid')
    }
    const method = (webhook.method || 'POST').toUpperCase()
    return {
      url: webhook.url.trim(),
      method,
      headers,
      body,
    }
  }

  function buildRetryExtras(type: ScheduledJobType) {
    const extras: { maxRetries?: number; retryDelay?: number } = {}
    const maxRetriesRaw = retrySettings.maxRetries.trim()
    if (maxRetriesRaw) {
      const parsed = Number(maxRetriesRaw)
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error('retry_invalid')
      }
      extras.maxRetries = Math.floor(parsed)
    }

    const retryDelayRaw = retrySettings.retryDelayMinutes.trim()
    if (retryDelayRaw) {
      const parsedDelay = Number(retryDelayRaw)
      if (!Number.isFinite(parsedDelay) || parsedDelay <= 0) {
        throw new Error('retry_invalid')
      }
      extras.retryDelay = Math.floor(parsedDelay * 60 * 1000)
    }

    if ((extras.maxRetries ?? 0) > 0 && !extras.retryDelay) {
      extras.retryDelay = 60_000
    }

    return extras
  }

  async function handleDelete(job: ScheduledJobSummary) {
    const confirmText = t('list.cancelConfirmWithInfo', {
      type: t(`typeOptions.${job.type}`),
      time: formatDate(job.runAt),
    })
    if (!confirm(confirmText)) return
    const res = await deleteScheduledJob(job.jobId)
    if (res.isSucc) {
      toast({ title: t('toast.deleted') })
      await loadJobs(statusFilter)
    } else {
      toast({ title: t('toast.failed'), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('create')}</CardTitle>
          <CardDescription>{t('note')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('type')}</Label>
              <Select value={jobType} onValueChange={(value: ScheduledJobType) => setJobType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">{t('typeOptions.announcement')}</SelectItem>
                  <SelectItem value="reward">{t('typeOptions.reward')}</SelectItem>
                  <SelectItem value="webhook">{t('typeOptions.webhook')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('runAt')}</Label>
              <Input type="datetime-local" value={runAt} onChange={(e) => setRunAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('note')}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('note')} />
          </div>

          {jobType === 'announcement' && (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('announcement.title')}</Label>
                  <Input value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('announcement.priority')}</Label>
                  <Input value={announcement.priority} onChange={(e) => setAnnouncement({ ...announcement, priority: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('announcement.content')}</Label>
                <Textarea rows={4} value={announcement.content} onChange={(e) => setAnnouncement({ ...announcement, content: e.target.value })} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t('announcement.duration')}</Label>
                  <Input value={announcement.duration} onChange={(e) => setAnnouncement({ ...announcement, duration: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('announcement.type')}</Label>
                  <Input value={announcement.type} onChange={(e) => setAnnouncement({ ...announcement, type: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('announcement.platforms')}</Label>
                  <Input value={announcement.platforms} onChange={(e) => setAnnouncement({ ...announcement, platforms: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('announcement.linkUrl')}</Label>
                  <Input value={announcement.linkUrl} onChange={(e) => setAnnouncement({ ...announcement, linkUrl: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('announcement.imageUrl')}</Label>
                  <Input value={announcement.imageUrl} onChange={(e) => setAnnouncement({ ...announcement, imageUrl: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {jobType === 'reward' && (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('reward.userId')}</Label>
                  <Input value={reward.userId} onChange={(e) => setReward({ ...reward, userId: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('reward.reason')}</Label>
                  <Input value={reward.reason} onChange={(e) => setReward({ ...reward, reason: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <InputWithLabel label={t('reward.gold')} value={reward.gold} onChange={(v) => setReward({ ...reward, gold: v })} />
                <InputWithLabel label={t('reward.tickets')} value={reward.tickets} onChange={(v) => setReward({ ...reward, tickets: v })} />
                <InputWithLabel label={t('reward.exp')} value={reward.exp} onChange={(v) => setReward({ ...reward, exp: v })} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <InputWithLabel label={t('reward.vipDays')} value={reward.vipDays} onChange={(v) => setReward({ ...reward, vipDays: v })} />
                <InputWithLabel label={t('reward.items')} value={reward.items} onChange={(v) => setReward({ ...reward, items: v })} />
                <InputWithLabel label={t('reward.skins')} value={reward.skins} onChange={(v) => setReward({ ...reward, skins: v })} />
              </div>
            </div>
          )}

          {jobType === 'webhook' && (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('webhook.url')}</Label>
                  <Input value={webhook.url} onChange={(e) => setWebhook({ ...webhook, url: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('webhook.method')}</Label>
                  <Input value={webhook.method} onChange={(e) => setWebhook({ ...webhook, method: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('webhook.headers')}</Label>
                <Textarea rows={3} value={webhook.headers} onChange={(e) => setWebhook({ ...webhook, headers: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('webhook.body')}</Label>
                <Textarea rows={4} value={webhook.body} onChange={(e) => setWebhook({ ...webhook, body: e.target.value })} />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t('retry.title')}</Label>
              <p className="text-xs text-muted-foreground">{t('retry.description')}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('retry.maxRetries')}</Label>
                <Input
                  type="number"
                  value={retrySettings.maxRetries}
                  onChange={(e) => setRetrySettings({ ...retrySettings, maxRetries: e.target.value })}
                  placeholder={jobType === 'webhook' ? '3' : '0'}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('retry.retryDelay')}</Label>
                <Input
                  type="number"
                  value={retrySettings.retryDelayMinutes}
                  onChange={(e) => setRetrySettings({ ...retrySettings, retryDelayMinutes: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('retry.hint')}</p>
            {jobType !== 'webhook' && (
              <p className="text-xs text-muted-foreground">{t('retry.nonWebhookTip')}</p>
            )}
          </div>

          <Button onClick={handleCreate} disabled={creating}>
            {creating ? t('creating') : t('create')}
          </Button>
          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t('list.header')}</CardTitle>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('list.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('list.filterAll')}</SelectItem>
                <SelectItem value="pending">{t('statuses.pending')}</SelectItem>
                <SelectItem value="running">{t('statuses.running')}</SelectItem>
                <SelectItem value="done">{t('statuses.done')}</SelectItem>
                <SelectItem value="failed">{t('statuses.failed')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => loadJobs(statusFilter)} disabled={loadingJobs}>
              {loadingJobs ? t('creating') : t('list.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('list.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="p-2">{t('type')}</th>
                    <th className="p-2">{t('list.status')}</th>
                    <th className="p-2">{t('list.runAt')}</th>
                  <th className="p-2">{t('list.executedAt')}</th>
                  <th className="p-2">{t('list.createdBy')}</th>
                  <th className="p-2">{t('list.createdAt')}</th>
                  <th className="p-2">{t('list.retries')}</th>
                  <th className="p-2">{t('list.lastLog')}</th>
                  <th className="p-2">{t('note')}</th>
                  <th className="p-2">{t('list.lastError')}</th>
                  <th className="p-2 text-right">{t('list.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.jobId} className="border-t">
                      <td className="p-2 font-medium">{t(`typeOptions.${job.type}`)}</td>
                      <td className="p-2">
                        <Badge variant={statusBadge[job.status]}>{t(`statuses.${job.status}`)}</Badge>
                      </td>
                      <td className="p-2">{formatDate(job.runAt)}</td>
                    <td className="p-2">{formatDate(job.executedAt)}</td>
                    <td className="p-2">{job.createdBy || '-'}</td>
                    <td className="p-2">{formatDate(job.createdAt)}</td>
                    <td className="p-2">{formatRetryLabel(job)}</td>
                    <td className="p-2">{renderLastLog(job)}</td>
                    <td className="p-2">{job.note || '-'}</td>
                    <td className="p-2 text-xs text-red-600">{job.lastError || '-'}</td>
                      <td className="p-2 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Button variant="link" size="sm" className="px-0" onClick={() => handleViewLogs(job)}>
                          {t('list.viewLogs')}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={job.status !== 'pending'} onClick={() => handleDelete(job)}>
                          {t('list.cancel')}
                        </Button>
                      </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={logDialogOpen} onOpenChange={handleLogDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('logs.title')}</DialogTitle>
            {selectedJob && (
              <p className="text-sm text-muted-foreground">
                {t('logs.subtitle', { type: t(`typeOptions.${selectedJob.type}`), time: formatDate(selectedJob.runAt) })}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t('logs.total', { total: logTotal })}</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={logPage <= 1 || logLoading}
                  onClick={() => handleLogPageChange(logPage - 1)}
                >
                  {t('logs.prev')}
                </Button>
                <span className="text-xs">
                  {logPage} / {Math.max(1, Math.ceil(Math.max(logTotal, 1) / LOG_PAGE_SIZE))}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={logLoading || logPage * LOG_PAGE_SIZE >= logTotal}
                  onClick={() => handleLogPageChange(logPage + 1)}
                >
                  {t('logs.next')}
                </Button>
              </div>
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {logLoading ? (
                <p className="text-sm text-muted-foreground">{t('logs.loading')}</p>
              ) : jobLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('logs.empty')}</p>
              ) : (
                jobLogs.map((log) => (
                  <div key={`${log.executedAt}-${log.attempt}`} className="space-y-1 rounded border p-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={log.result === 'success' ? 'secondary' : 'destructive'}>
                        {t(`logResult.${log.result}`)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t('logs.executedAt', { time: formatDate(log.executedAt) })}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t('list.logAttempt', { attempt: log.attempt })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t('logs.duration', { value: formatDuration(log.duration) })}
                    </span>
                    {typeof log.httpStatus === 'number' && (
                      <span className="text-xs text-muted-foreground">
                        {t('logs.httpStatus', { status: log.httpStatus })}
                      </span>
                    )}
                    {log.url && (
                      <span className="text-xs text-muted-foreground break-all">
                        {t('logs.url', { url: log.url })}
                      </span>
                    )}
                    {log.method && (
                      <span className="text-xs text-muted-foreground">
                        {t('logs.method', { method: log.method })}
                      </span>
                    )}
                    {log.message && (
                      <p className="text-sm text-red-600 break-words">{log.message}</p>
                    )}
                    {log.requestBodyPreview && (
                      <LogPreview label={t('logs.request')} value={log.requestBodyPreview} />
                    )}
                    {log.responseBodyPreview && (
                      <LogPreview label={t('logs.response')} value={log.responseBodyPreview} />
                    )}
                    {log.details && (
                      <LogPreview label={t('logs.details')} value={formatDetails(log.details)} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InputWithLabel({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function parseCommaValues(value: string) {
  return value.split(',').map((v) => v.trim()).filter(Boolean)
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    throw new Error('invalid_json')
  }
}

function assignNumber(raw: string, setter: (value: number) => void) {
  if (!raw || raw.trim() === '') {
    return
  }
  const num = Number(raw)
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error('reward_invalid')
  }
  setter(num)
}

function formatDate(ts?: number) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString()
}

function formatDuration(ms?: number) {
  if (!ms || ms <= 0) return '0ms'
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }
  const seconds = ms / 1000
  if (seconds < 60) {
    return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = Math.round(seconds % 60)
  if (remainSeconds === 0) {
    return `${minutes}m`
  }
  return `${minutes}m${remainSeconds}s`
}

function formatLocalInputValue(time: number) {
  const date = new Date(time)
  const offset = date.getTimezoneOffset() * 60000
  const local = new Date(date.getTime() - offset)
  return local.toISOString().slice(0, 16)
}

function formatDetails(details: any) {
  if (details == null) return ''
  if (typeof details === 'string') {
    return details
  }
  try {
    return JSON.stringify(details, null, 2)
  } catch {
    return String(details)
  }
}

function LogPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <pre className="max-h-32 overflow-y-auto rounded bg-muted p-2 text-xs whitespace-pre-wrap break-all">
        {value}
      </pre>
    </div>
  )
}
