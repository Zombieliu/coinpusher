'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { fetchOrders, fetchFinancialStats, fetchRefunds, processRefund, updateOrderStatus, deliverOrder, resendOrderReward, fetchAuditLogs } from '@/lib/api'
import { DollarSign, ShoppingCart, CreditCard, RefreshCw, Search, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTranslation } from '@/components/providers/i18n-provider'

export default function FinancePage() {
    const { toast } = useToast()
    const { t } = useTranslation('finance')
    const [activeTab, setActiveTab] = useState('orders')
    const [resetDialogOpen, setResetDialogOpen] = useState(false)
    const [resetSecret, setResetSecret] = useState('')
    const [resettingDemo, setResettingDemo] = useState(false)
    const [resetTarget, setResetTarget] = useState('staging')
    const guardStatus = useFinanceGuardStatus()

    const handleDemoReset = async () => {
        if (!resetSecret) {
            toast({ title: t('alerts.emptySecret'), variant: 'destructive' })
            return
        }
        if (!resetTarget) {
            toast({ title: t('alerts.emptyTarget'), variant: 'destructive' })
            return
        }
        setResettingDemo(true)
        try {
            const response = await fetch('/api/demo-reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ secret: resetSecret, target: resetTarget })
            })
            const result = await response.json().catch(() => ({}))
            if (!response.ok || !result?.success) {
                throw new Error(result?.error || t('alerts.refreshFailed'))
            }
            toast({
                title: t('alerts.demoRefreshed'),
                description: t('alerts.demoHint')
            })
            setResetDialogOpen(false)
            setResetSecret('')
        } catch (error: any) {
            toast({
                title: t('alerts.refreshFailed'),
                description: error?.message || t('alerts.refreshFailed'),
                variant: 'destructive'
            })
        } finally {
            setResettingDemo(false)
        }
    }

    return (
        <div className="space-y-6 finance-page">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => setResetDialogOpen(true)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('refreshDemo')}
                    </Button>
                </div>
            </div>
            <FinanceGuardBanner status={guardStatus} />

            <Tabs defaultValue="orders" className="space-y-4" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="orders" className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        {t('tabs.orders')}
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="flex items-center gap-2">
                        <BarChartIcon className="h-4 w-4" />
                        {t('tabs.stats')}
                    </TabsTrigger>
                    <TabsTrigger value="refunds" className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        {t('tabs.refunds')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="orders">
                    <OrdersPanel />
                </TabsContent>

                <TabsContent value="stats">
                    <FinancialStatsPanel />
                </TabsContent>

                <TabsContent value="refunds">
                    <RefundsPanel />
                </TabsContent>
            </Tabs>

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('dialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="demo-reset-target">{t('dialog.target')}</Label>
                            <Select value={resetTarget} onValueChange={setResetTarget} disabled={resettingDemo}>
                                <SelectTrigger id="demo-reset-target">
                                    <SelectValue placeholder={t('dialog.targetPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="staging">{t('dialog.targetStaging')}</SelectItem>
                                    <SelectItem value="production">{t('dialog.targetProduction')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="demo-reset-secret">{t('dialog.secret')}</Label>
                            <Input
                                id="demo-reset-secret"
                                type="password"
                                placeholder={t('dialog.secretPlaceholder')}
                                value={resetSecret}
                                onChange={(e) => setResetSecret(e.target.value)}
                                disabled={resettingDemo}
                            />
                        </div>
                        <div className="text-sm text-gray-500">
                            {t('dialog.tips.0')}
                            <br />
                            {t('dialog.tips.1')}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetDialogOpen(false)} disabled={resettingDemo}>
                            {t('dialog.cancel')}
                        </Button>
                        <Button onClick={handleDemoReset} disabled={resettingDemo || !resetSecret}>
                            {resettingDemo ? t('dialog.loading') : t('dialog.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

const ONE_DAY = 24 * 60 * 60 * 1000
const ACTION_LIMITS = {
    deliver: Number(process.env.NEXT_PUBLIC_FINANCE_DELIVER_LIMIT || 20),
    resend: Number(process.env.NEXT_PUBLIC_FINANCE_RESEND_LIMIT || 20),
    status: Number(process.env.NEXT_PUBLIC_FINANCE_STATUS_LIMIT || 50),
    refund: Number(process.env.NEXT_PUBLIC_FINANCE_REFUND_LIMIT || 15)
}
const HIGH_VALUE_THRESHOLD = Number(process.env.NEXT_PUBLIC_FINANCE_HIGH_THRESHOLD || 500)
const ACTION_MAP: Record<string, keyof typeof ACTION_LIMITS> = {
    'admin/DeliverOrder': 'deliver',
    'admin/ResendOrderReward': 'resend',
    'admin/UpdateOrderStatus': 'status',
    'admin/ProcessRefund': 'refund'
}

function useFinanceGuardStatus() {
    const [status, setStatus] = useState<{
        counts: Record<keyof typeof ACTION_LIMITS, number>
        loading: boolean
        error?: string
    }>({
        counts: {
            deliver: 0,
            resend: 0,
            status: 0,
            refund: 0
        },
        loading: true
    })

    useEffect(() => {
        let mounted = true
        const stored = (typeof window !== 'undefined' && window.localStorage.getItem('admin_user')) || ''
        if (!stored) {
            setStatus(prev => ({ ...prev, loading: false }))
            return
        }
        let parsed: any
        try {
            parsed = JSON.parse(stored)
        } catch {
            setStatus(prev => ({ ...prev, loading: false }))
            return
        }
        const loadUsage = async () => {
            try {
                const since = Date.now() - ONE_DAY
                const result = await fetchAuditLogs({
                    adminId: parsed.adminId,
                    category: 'financial',
                    startTime: since,
                    page: 1,
                    limit: 200
                })
                if (mounted && result.isSucc && result.res?.logs) {
                    const counts = { deliver: 0, resend: 0, status: 0, refund: 0 }
                    for (const log of result.res.logs) {
                        if (log.result !== 'success') continue
                        const key = ACTION_MAP[log.action]
                        if (key) {
                            counts[key] = (counts[key] || 0) + 1
                        }
                    }
                    setStatus({ counts, loading: false })
                } else if (mounted) {
                    setStatus({ counts: { deliver: 0, resend: 0, status: 0, refund: 0 }, loading: false, error: result.err?.message || 'fetch_error' })
                }
            } catch (error: any) {
                if (mounted) {
                    setStatus(prev => ({ ...prev, loading: false, error: error.message }))
                }
            }
        }
        loadUsage()
        return () => {
            mounted = false
        }
    }, [])

    return status
}

function FinanceGuardBanner({ status }: { status: ReturnType<typeof useFinanceGuardStatus> }) {
    const { t } = useTranslation('finance')
    const usage = status.counts
    const items = [
        { key: 'deliver', count: 20 },
        { key: 'resend', count: 20 },
        { key: 'status', count: 50 },
        { key: 'refund', count: 15 }
    ]

    return (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="font-semibold text-amber-900">{t('guard.title')}</p>
                    <p className="text-amber-800 mt-1 text-xs">
                        {t('guard.description', { threshold: HIGH_VALUE_THRESHOLD })}
                    </p>
                </div>
                <p className="text-xs text-amber-700">{t('guard.syncNote')}</p>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                {items.map(item => {
                    const used = usage[item.key as keyof typeof usage] || 0
                    const limit = ACTION_LIMITS[item.key as keyof typeof ACTION_LIMITS]
                    const remaining = Math.max(limit - used, 0)
                    return (
                        <div key={item.key} className="rounded border border-amber-200 bg-white p-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-amber-900">{t(`guard.limits.${item.key}` as const)}</span>
                                <span className="text-amber-700">{used}/{limit}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-amber-600">{t('guard.limitDesc', { count: item.count })}</div>
                            <div className="mt-2 h-1.5 w-full rounded-full bg-amber-100">
                                <div
                                    className="h-1.5 rounded-full bg-amber-500 transition-all"
                                    style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
                                />
                            </div>
                            <div className="mt-1 text-[11px] text-amber-700">{t('guard.remaining', { count: remaining })}</div>
                        </div>
                    )
                })}
            </div>
            {status.error && (
                <p className="mt-2 text-xs text-red-600">
                    {status.error === 'fetch_error' ? t('guard.fetchError') : status.error}
                </p>
            )}
        </div>
    )
}

function BarChartIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="12" x2="12" y1="20" y2="10" />
            <line x1="18" x2="18" y1="20" y2="4" />
            <line x1="6" x2="6" y1="20" y2="16" />
        </svg>
    )
}

function OrdersPanel() {
    const { toast } = useToast()
    const { t } = useTranslation('finance')
    const { t: tCommon } = useTranslation('common')
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [exporting, setExporting] = useState(false)
    const [filters, setFilters] = useState({
        orderId: '',
        userId: '',
        status: 'all'
    })
    const ordersParentRef = useRef<HTMLDivElement>(null)
    const rowVirtualizer = useVirtualizer({
        count: orders.length,
        getScrollElement: () => ordersParentRef.current,
        estimateSize: () => 72,
        overscan: 8
    })
    const [statusDialog, setStatusDialog] = useState<{
        open: boolean;
        order?: any;
        status: string;
    }>({
        open: false,
        status: 'pending'
    })
    const statusLabels = {
        pending: t('orders.statusOptions.pending'),
        paid: t('orders.statusOptions.paid'),
        delivered: t('orders.statusOptions.delivered'),
        failed: t('orders.statusOptions.failed'),
        refunded: t('orders.statusOptions.refunded'),
        cancelled: t('orders.statusOptions.cancelled'),
    }

    useEffect(() => {
        const queryOrderId = searchParams.get('orderId') || ''
        const queryUserId = searchParams.get('userId') || ''
        const queryStatus = searchParams.get('status') || 'all'
        const queryPage = parseInt(searchParams.get('page') || '1', 10) || 1
        setFilters(prev => {
            if (prev.orderId === queryOrderId && prev.userId === queryUserId && prev.status === queryStatus) {
                return prev
            }
            return { orderId: queryOrderId, userId: queryUserId, status: queryStatus }
        })
        setPage(prev => (prev === queryPage ? prev : queryPage))
    }, [searchParams])

    const loadOrders = async () => {
        setLoading(true)
        try {
            const res = await fetchOrders({
                ...filters,
                status: filters.status === 'all' ? undefined : filters.status,
                page,
                limit: 100
            })
            if (res.isSucc && res.res) {
                setOrders(res.res.orders || [])
                setTotal(res.res.total || 0)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOrders()
    }, [page, filters]) // Re-fetch when page or filters change

    // Debounce search input if needed, or use a "Search" button. 
    // Here simplified: simple inputs and reload on change might be too aggressive, 
    // but for internal tools it's often OK or we add a search button.
    // Let's verify with a search button for text inputs.

    const syncQuery = (nextFilters: typeof filters, nextPage: number) => {
        const params = new URLSearchParams(searchParams.toString())
        if (nextFilters.orderId) params.set('orderId', nextFilters.orderId); else params.delete('orderId')
        if (nextFilters.userId) params.set('userId', nextFilters.userId); else params.delete('userId')
        if (nextFilters.status && nextFilters.status !== 'all') params.set('status', nextFilters.status); else params.delete('status')
        params.set('page', String(nextPage))
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const handleSearch = () => {
        const nextPage = 1
        setPage(nextPage)
        syncQuery(filters, nextPage)
        loadOrders()
    }

    const openStatusDialog = (order: any) => {
        setStatusDialog({
            open: true,
            order,
            status: order.status
        })
    }

    const handleUpdateStatus = async () => {
        if (!statusDialog.order) return
        try {
            const res = await updateOrderStatus(statusDialog.order.orderId, statusDialog.status)
            if (res.isSucc && res.res?.success) {
                toast({ title: t('orders.toast.updateSuccess') })
                setStatusDialog({ open: false, status: 'pending' })
                loadOrders()
            } else {
                toast({ title: t('orders.toast.updateFailed'), description: res.err?.message, variant: "destructive" })
            }
        } catch (error: any) {
            toast({ title: t('orders.toast.updateFailed'), description: error.message, variant: "destructive" })
        }
    }

    const handleManualDeliver = async (orderId: string) => {
        if (!confirm(t('orders.confirmDeliver'))) return
        try {
            const res = await deliverOrder(orderId)
            if (res.isSucc && res.res?.success) {
                toast({ title: t('orders.toast.deliverSuccess') })
                loadOrders()
            } else {
                toast({ title: t('orders.toast.deliverFailed'), description: res.err?.message, variant: "destructive" })
            }
        } catch (error: any) {
            toast({ title: t('orders.toast.deliverFailed'), description: error.message, variant: "destructive" })
        }
    }

    const handleResendReward = async (orderId: string) => {
        if (!confirm(t('orders.confirmResend'))) return
        try {
            const res = await resendOrderReward(orderId)
            if (res.isSucc && res.res?.success) {
                toast({ title: t('orders.toast.resendSuccess') })
            } else {
                toast({ title: t('orders.toast.resendFailed'), description: res.err?.message, variant: "destructive" })
            }
        } catch (error: any) {
            toast({ title: t('orders.toast.resendFailed'), description: error.message, variant: "destructive" })
        }
    }

    const handleExportOrders = async () => {
        setExporting(true)
        try {
            const res = await fetchOrders({
                ...filters,
                status: filters.status === 'all' ? undefined : filters.status,
                page: 1,
                limit: 200
            })
            if (!res.isSucc || !res.res?.orders?.length) {
                toast({ title: t('orders.toast.exportEmpty'), variant: 'destructive' })
                return
            }
            const csv = [
                [
                    t('orders.tableHeaders.orderId'),
                    t('orders.tableHeaders.user'),
                    t('orders.tableHeaders.product'),
                    t('orders.tableHeaders.amount'),
                    t('orders.tableHeaders.status'),
                    t('orders.tableHeaders.time'),
                ].join(',')
            ]
            res.res.orders.forEach((order: any) => {
                csv.push([
                    order.orderId,
                    order.userId,
                    order.productName,
                    `${order.currency} ${order.amount}`,
                    statusLabels[order.status] || order.status,
                    new Date(order.createdAt).toLocaleString()
                ].join(','))
            })
            const blob = new Blob(['\ufeff' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `orders-${Date.now()}.csv`
            link.click()
            URL.revokeObjectURL(url)
            toast({ title: t('orders.toast.exportSuccess'), description: t('orders.toast.exportSuccessDesc', { count: res.res.orders.length }) })
        } catch (error: any) {
            toast({ title: t('orders.toast.exportFailed'), description: error.message, variant: 'destructive' })
        } finally {
            setExporting(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('orders.title')}</CardTitle>
                <div className="flex flex-wrap gap-4 pt-4">
                    <Input 
                        placeholder={t('orders.placeholders.orderId')}
                        value={filters.orderId}
                        onChange={e => setFilters({...filters, orderId: e.target.value})}
                        className="w-[200px]"
                    />
                    <Input 
                        placeholder={t('orders.placeholders.userId')}
                        value={filters.userId}
                        onChange={e => setFilters({...filters, userId: e.target.value})}
                        className="w-[200px]"
                    />
                    <Select 
                        value={filters.status} 
                        onValueChange={v => setFilters({...filters, status: v})}
                    >
                        <SelectTrigger className="w-[150px]" aria-label={t('orders.statusFilterLabel')}>
                            <SelectValue placeholder={t('orders.statusPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('orders.statusOptions.all')}</SelectItem>
                            {ORDER_STATUS_KEYS.map(key => (
                                <SelectItem key={key} value={key}>{statusLabels[key]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleSearch}>
                        <Search className="mr-2 h-4 w-4" />
                        {t('orders.search')}
                    </Button>
                    <Button variant="outline" onClick={handleExportOrders} disabled={exporting}>
                        {exporting ? t('orders.exporting') : t('orders.export')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <div className="hidden md:grid grid-cols-[1.4fr,1fr,1fr,1fr,0.8fr,1.2fr] gap-2 border-b bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600">
                        <span>{t('orders.tableHeaders.orderId')}</span>
                        <span>{t('orders.tableHeaders.user')}</span>
                        <span>{t('orders.tableHeaders.product')}</span>
                        <span className="text-right">{t('orders.tableHeaders.amount')}</span>
                        <span className="text-center">{t('orders.tableHeaders.status')}</span>
                        <span className="text-right">{t('orders.tableHeaders.time')}</span>
                    </div>
                    <div ref={ordersParentRef} className="max-h-[520px] overflow-auto">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">{t('orders.loading')}</div>
                        ) : orders.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">{t('orders.empty')}</div>
                        ) : (
                            <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
                                {rowVirtualizer.getVirtualItems().map(virtualRow => {
                                    const order = orders[virtualRow.index]
                                    if (!order) return null
                                    return (
                                        <div
                                            key={order.orderId}
                                            className="grid grid-cols-1 gap-3 border-b px-4 py-3 text-sm md:grid-cols-[1.4fr,1fr,1fr,1fr,0.8fr,1.2fr]"
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                transform: `translateY(${virtualRow.start}px)`
                                            }}
                                        >
                                            <div className="font-mono break-all">{order.orderId}</div>
                                            <div className="font-mono break-all">{order.userId}</div>
                                            <div>{order.productName}</div>
                                            <div className="text-right font-medium">
                                                {order.currency} {order.amount}
                                            </div>
                                            <div className="text-center">
                                                <Badge variant={getStatusVariant(order.status)}>
                                                    {statusLabels[order.status] || order.status}
                                                </Badge>
                                            </div>
                                            <div className="text-right text-gray-500">
                                                <div>{format(order.createdAt, 'yyyy-MM-dd HH:mm')}</div>
                                                <div className="mt-2 flex flex-wrap justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openStatusDialog(order)}
                                                    >
                                                        {t('orders.actions.updateStatus')}
                                                    </Button>
                                                    {order.status === 'paid' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleManualDeliver(order.orderId)}
                                                        >
                                                            {t('orders.actions.deliver')}
                                                        </Button>
                                                    )}
                                                    {order.status === 'delivered' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleResendReward(order.orderId)}
                                                        >
                                                            {t('orders.actions.resend')}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
                        ...
                <div className="flex justify-end gap-2 mt-4">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={page <= 1}
                        onClick={() => {
                            const nextPage = Math.max(1, page - 1)
                            setPage(nextPage)
                            syncQuery(filters, nextPage)
                        }}
                    >
                        {t('table.prev')}
                    </Button>
                    <span className="text-sm py-2">{t('orders.pagination', { page })}</span>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={orders.length < 100}
                        onClick={() => {
                            const nextPage = page + 1
                            setPage(nextPage)
                            syncQuery(filters, nextPage)
                        }}
                    >
                        {tCommon('nextPage')}
                    </Button>
                </div>
            </CardContent>
            <Dialog open={statusDialog.open} onOpenChange={(open) => setStatusDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('orders.dialog.title')}</DialogTitle>
                        <DialogDescription>
                            {t('orders.dialog.description', { orderId: statusDialog.order?.orderId })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="order-status-select">{t('orders.dialog.statusLabel')}</Label>
                            <Select value={statusDialog.status} onValueChange={(value) => setStatusDialog(prev => ({ ...prev, status: value }))}>
                                <SelectTrigger id="order-status-select">
                                    <SelectValue placeholder={t('orders.dialog.statusPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {ORDER_STATUS_KEYS.map(key => (
                                        <SelectItem key={key} value={key}>{statusLabels[key]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStatusDialog({ open: false, status: 'pending' })}>{t('orders.dialog.cancel')}</Button>
                        <Button onClick={handleUpdateStatus}>{t('orders.dialog.save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

function FinancialStatsPanel() {
    const { t } = useTranslation('finance')
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [dateRange, setDateRange] = useState('7') // 7 days

    const loadStats = async () => {
        setLoading(true)
        try {
            const end = Date.now()
            const start = end - parseInt(dateRange) * 24 * 60 * 60 * 1000
            const res = await fetchFinancialStats({ startDate: start, endDate: end })
            if (res.isSucc && res.res) {
                setStats(res.res)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadStats()
    }, [dateRange])

    if (!stats && loading) return <div>{t('stats.loading')}</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t('stats.rangePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">{t('stats.ranges.7')}</SelectItem>
                        <SelectItem value="30">{t('stats.ranges.30')}</SelectItem>
                        <SelectItem value="90">{t('stats.ranges.90')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('stats.cards.totalRevenue')}</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats?.totalRevenue?.toFixed(2) || '0.00'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('stats.cards.totalOrders')}</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('stats.cards.avgOrderValue')}</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats?.avgOrderValue?.toFixed(2) || '0.00'}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('stats.revenueTrend')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {stats?.dailyRevenue?.map((item: any) => (
                                <div key={item.date} className="flex items-center justify-between text-sm">
                                    <span>{item.date}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-gray-500">{t('stats.ordersLabel', { count: item.orders })}</span>
                                        <span className="font-medium w-20 text-right">${item.revenue.toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('stats.topSpenders')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {stats?.topSpenders?.map((user: any, index: number) => (
                                <div key={user.userId} className="flex items-center justify-between text-sm border-b py-2 last:border-0">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                                            {index + 1}
                                        </Badge>
                                        <span className="font-mono">{user.userId}</span>
                                    </div>
                                    <span className="font-bold">${user.total.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function RefundsPanel() {
    const { toast } = useToast()
    const { t } = useTranslation('finance')
    const { t: tCommon } = useTranslation('common')
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const [refunds, setRefunds] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [exporting, setExporting] = useState(false)
    const refundsParentRef = useRef<HTMLDivElement>(null)
    const rowVirtualizer = useVirtualizer({
        count: refunds.length,
        getScrollElement: () => refundsParentRef.current,
        estimateSize: () => 72,
        overscan: 8
    })

    useEffect(() => {
        const queryPage = parseInt(searchParams.get('refundPage') || '1', 10) || 1
        setPage(prev => (prev === queryPage ? prev : queryPage))
    }, [searchParams])

    const loadRefunds = async () => {
        setLoading(true)
        try {
            const res = await fetchRefunds({ page, limit: 100, status: 'pending' })
            if (res.isSucc && res.res) {
                setRefunds(res.res.refunds || [])
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadRefunds()
    }, [page])

    const syncRefundPage = (nextPage: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('refundPage', String(nextPage))
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const handleProcess = async (refundId: string, approved: boolean) => {
        if (!confirm(approved ? t('refunds.confirmApprove') : t('refunds.confirmReject'))) return

        try {
            const res = await processRefund({ refundId, approved })
            if (res.isSucc) {
                toast({ title: approved ? t('refunds.toast.approveSuccess') : t('refunds.toast.rejectSuccess') })
                loadRefunds()
            } else {
                toast({ title: t('refunds.toast.actionFailed'), description: res.err?.message, variant: "destructive" })
            }
        } catch (error) {
            toast({ title: t('refunds.toast.actionError'), variant: "destructive" })
        }
    }

    const handleExportRefunds = async () => {
        setExporting(true)
        try {
            const res = await fetchRefunds({ page: 1, limit: 200 })
            if (!res.isSucc || !res.res?.refunds?.length) {
                toast({ title: t('refunds.toast.exportEmpty'), variant: 'destructive' })
                return
            }
            const rows = [
                [
                    t('refunds.tableHeaders.refundId'),
                    t('refunds.tableHeaders.order'),
                    t('refunds.tableHeaders.user'),
                    t('refunds.tableHeaders.amount'),
                    t('orders.tableHeaders.status'),
                    t('refunds.tableHeaders.time'),
                ].join(',')
            ]
            res.res.refunds.forEach((refund: any) => {
                rows.push([
                    refund.refundId,
                    refund.orderId,
                    refund.userId,
                    refund.amount,
                    refund.status,
                    new Date(refund.createdAt).toLocaleString()
                ].join(','))
            })
            const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `refunds-${Date.now()}.csv`
            link.click()
            URL.revokeObjectURL(url)
            toast({ title: t('refunds.toast.exportSuccess'), description: t('refunds.toast.exportSuccessDesc', { count: res.res.refunds.length }) })
        } catch (error: any) {
            toast({ title: t('refunds.toast.exportFailed'), description: error.message, variant: 'destructive' })
        } finally {
            setExporting(false)
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('refunds.title')}</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportRefunds} disabled={exporting}>
                    {exporting ? t('refunds.exporting') : t('refunds.export')}
                </Button>
            </CardHeader>
            <CardContent>
                 <div className="rounded-md border">
                    <div className="hidden md:grid grid-cols-[1.4fr,1fr,1fr,0.8fr,1.2fr,1fr] gap-2 border-b bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600">
                        <span>{t('refunds.tableHeaders.refundId')}</span>
                        <span>{t('refunds.tableHeaders.user')}</span>
                        <span>{t('refunds.tableHeaders.order')}</span>
                        <span className="text-right">{t('refunds.tableHeaders.amount')}</span>
                        <span>{t('refunds.tableHeaders.reason')}</span>
                        <span className="text-right">{t('refunds.tableHeaders.time')}</span>
                    </div>
                    <div ref={refundsParentRef} className="max-h-[500px] overflow-auto">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">{t('refunds.loading')}</div>
                        ) : refunds.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">{t('refunds.empty')}</div>
                        ) : (
                            <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
                                {rowVirtualizer.getVirtualItems().map(virtualRow => {
                                    const refund = refunds[virtualRow.index]
                                    if (!refund) return null
                                    return (
                                        <div
                                            key={refund.refundId}
                                            className="grid grid-cols-1 gap-3 border-b px-4 py-3 text-sm md:grid-cols-[1.4fr,1fr,1fr,0.8fr,1.2fr,1fr]"
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                transform: `translateY(${virtualRow.start}px)`
                                            }}
                                        >
                                            <div className="font-mono break-all">{refund.refundId}</div>
                                            <div className="font-mono break-all">{refund.userId}</div>
                                            <div className="font-mono break-all">{refund.orderId}</div>
                                            <div className="text-right font-bold">${refund.amount}</div>
                                            <div className="text-gray-600 truncate">{refund.reason}</div>
                                            <div className="text-right text-gray-500">
                                                <div>{format(refund.createdAt, 'MM-dd HH:mm')}</div>
                                                <div className="mt-2 flex flex-wrap justify-end gap-2">
                                                   <Button 
                                                       size="sm" 
                                                       className="bg-green-600 hover:bg-green-700"
                                                       onClick={() => handleProcess(refund.refundId, true)}
                                                   >
                                                        {t('refunds.approve')}
                                                   </Button>
                                                   <Button 
                                                       size="sm" 
                                                       variant="destructive"
                                                       onClick={() => handleProcess(refund.refundId, false)}
                                                   >
                                                        {t('refunds.reject')}
                                                   </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
            <CardContent>
                <div className="flex justify-end gap-2 mt-4">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={page <= 1}
                        onClick={() => {
                            const nextPage = Math.max(1, page - 1)
                            setPage(nextPage)
                            syncRefundPage(nextPage)
                        }}
                    >
                        {tCommon('prevPage')}
                    </Button>
                    <span className="text-sm py-2">{t('refunds.pagination', { page })}</span>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={refunds.length < 100}
                        onClick={() => {
                            const nextPage = page + 1
                            setPage(nextPage)
                            syncRefundPage(nextPage)
                        }}
                    >
                        {tCommon('nextPage')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

const ORDER_STATUS_KEYS = ['pending', 'paid', 'delivered', 'failed', 'refunded', 'cancelled'] as const

function getStatusVariant(status: string) {
    switch (status) {
        case 'paid': return 'default' // Using default as primary/success-ish in some themes, or create custom
        case 'delivered': return 'default' // Changed from 'success' as standard badge doesn't have it unless customized
        case 'pending': return 'secondary'
        case 'failed': return 'destructive'
        case 'refunded': return 'outline'
        default: return 'outline'
    }
}
