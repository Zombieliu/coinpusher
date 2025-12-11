'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { fetchOrders, fetchFinancialStats, fetchRefunds, processRefund, updateOrderStatus, deliverOrder, resendOrderReward } from '@/lib/api'
import { DollarSign, ShoppingCart, CreditCard, RefreshCw, Search, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react'
import { format } from 'date-fns'

export default function FinancePage() {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState('orders')
    const [resetDialogOpen, setResetDialogOpen] = useState(false)
    const [resetSecret, setResetSecret] = useState('')
    const [resettingDemo, setResettingDemo] = useState(false)

    const handleDemoReset = async () => {
        if (!resetSecret) {
            toast({ title: '请输入安全口令', variant: 'destructive' })
            return
        }
        setResettingDemo(true)
        try {
            const response = await fetch('/api/demo-reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ secret: resetSecret })
            })
            const result = await response.json().catch(() => ({}))
            if (!response.ok || !result?.success) {
                throw new Error(result?.error || '演示数据刷新失败')
            }
            toast({
                title: '演示数据已刷新',
                description: '订单与退款样本即将重置，请稍候刷新页面'
            })
            setResetDialogOpen(false)
            setResetSecret('')
        } catch (error: any) {
            toast({
                title: '刷新失败',
                description: error?.message || '请检查服务器日志',
                variant: 'destructive'
            })
        } finally {
            setResettingDemo(false)
        }
    }

    return (
        <div className="space-y-6 finance-page">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-3xl font-bold tracking-tight">财务管理</h1>
                <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => setResetDialogOpen(true)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        刷新演示数据
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="orders" className="space-y-4" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="orders" className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        订单管理
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="flex items-center gap-2">
                        <BarChartIcon className="h-4 w-4" />
                        财务统计
                    </TabsTrigger>
                    <TabsTrigger value="refunds" className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        退款处理
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
                        <DialogTitle>刷新演示数据</DialogTitle>
                        <DialogDescription>
                            该操作会重新注入种子订单、退款、活动等样本数据，请确保当前环境允许执行。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="demo-reset-secret">安全口令</Label>
                            <Input
                                id="demo-reset-secret"
                                type="password"
                                placeholder="输入部署时约定的 DEMO_RESET_SECRET"
                                value={resetSecret}
                                onChange={(e) => setResetSecret(e.target.value)}
                                disabled={resettingDemo}
                            />
                        </div>
                        <p className="text-sm text-gray-500">
                            · 操作耗时约 5-10 秒，期间请勿重复点击。
                            <br />
                            · 如果刷新失败，请检查服务器日志或确认口令是否正确。
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetDialogOpen(false)} disabled={resettingDemo}>
                            取消
                        </Button>
                        <Button onClick={handleDemoReset} disabled={resettingDemo || !resetSecret}>
                            {resettingDemo ? '刷新中...' : '确认刷新'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
    const [statusDialog, setStatusDialog] = useState<{
        open: boolean;
        order?: any;
        status: string;
    }>({
        open: false,
        status: 'pending'
    })

    const loadOrders = async () => {
        setLoading(true)
        try {
            const res = await fetchOrders({
                ...filters,
                status: filters.status === 'all' ? undefined : filters.status,
                page,
                limit: 10
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

    const handleSearch = () => {
        setPage(1)
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
                toast({ title: "订单状态已更新" })
                setStatusDialog({ open: false, status: 'pending' })
                loadOrders()
            } else {
                toast({ title: "更新失败", description: res.err?.message, variant: "destructive" })
            }
        } catch (error: any) {
            toast({ title: "更新失败", description: error.message, variant: "destructive" })
        }
    }

    const handleManualDeliver = async (orderId: string) => {
        if (!confirm('确认标记该订单已发货并发放奖励？')) return
        try {
            const res = await deliverOrder(orderId)
            if (res.isSucc && res.res?.success) {
                toast({ title: "订单已发货" })
                loadOrders()
            } else {
                toast({ title: "操作失败", description: res.err?.message, variant: "destructive" })
            }
        } catch (error: any) {
            toast({ title: "操作失败", description: error.message, variant: "destructive" })
        }
    }

    const handleResendReward = async (orderId: string) => {
        if (!confirm('确认重发该订单的奖励吗？')) return
        try {
            const res = await resendOrderReward(orderId)
            if (res.isSucc && res.res?.success) {
                toast({ title: "奖励已重新发放" })
            } else {
                toast({ title: "操作失败", description: res.err?.message, variant: "destructive" })
            }
        } catch (error: any) {
            toast({ title: "操作失败", description: error.message, variant: "destructive" })
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
                toast({ title: '暂无可导出的订单', variant: 'destructive' })
                return
            }
            const csv = [
                ['订单号', '用户ID', '商品', '金额', '状态', '创建时间'].join(',')
            ]
            res.res.orders.forEach((order: any) => {
                csv.push([
                    order.orderId,
                    order.userId,
                    order.productName,
                    `${order.currency} ${order.amount}`,
                    getStatusText(order.status),
                    new Date(order.createdAt).toLocaleString('zh-CN')
                ].join(','))
            })
            const blob = new Blob(['\ufeff' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `orders-${Date.now()}.csv`
            link.click()
            URL.revokeObjectURL(url)
            toast({ title: '订单导出成功', description: `共导出 ${res.res.orders.length} 条记录` })
        } catch (error: any) {
            toast({ title: '导出失败', description: error.message, variant: 'destructive' })
        } finally {
            setExporting(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>订单列表</CardTitle>
                <div className="flex flex-wrap gap-4 pt-4">
                    <Input 
                        placeholder="订单号" 
                        value={filters.orderId}
                        onChange={e => setFilters({...filters, orderId: e.target.value})}
                        className="w-[200px]"
                    />
                    <Input 
                        placeholder="用户ID" 
                        value={filters.userId}
                        onChange={e => setFilters({...filters, userId: e.target.value})}
                        className="w-[200px]"
                    />
                    <Select 
                        value={filters.status} 
                        onValueChange={v => setFilters({...filters, status: v})}
                    >
                        <SelectTrigger className="w-[150px]" aria-label="订单状态筛选">
                            <SelectValue placeholder="状态" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全部状态</SelectItem>
                            <SelectItem value="pending">待支付</SelectItem>
                            <SelectItem value="paid">已支付</SelectItem>
                            <SelectItem value="delivered">已发货</SelectItem>
                            <SelectItem value="failed">失败</SelectItem>
                            <SelectItem value="refunded">已退款</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleSearch}>
                        <Search className="mr-2 h-4 w-4" />
                        搜索
                    </Button>
                    <Button variant="outline" onClick={handleExportOrders} disabled={exporting}>
                        {exporting ? '导出中...' : '导出CSV'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 text-left font-medium">订单号</th>
                                <th className="p-3 text-left font-medium">用户</th>
                                <th className="p-3 text-left font-medium">商品</th>
                                <th className="p-3 text-right font-medium">金额</th>
                                <th className="p-3 text-center font-medium">状态</th>
                                <th className="p-3 text-right font-medium">时间</th>
                                <th className="p-3 text-center font-medium">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">加载中...</td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">暂无订单</td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.orderId} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-mono">{order.orderId}</td>
                                        <td className="p-3 font-mono">{order.userId}</td>
                                        <td className="p-3">{order.productName}</td>
                                        <td className="p-3 text-right font-medium">
                                            {order.currency} {order.amount}
                                        </td>
                                        <td className="p-3 text-center">
                                            <Badge variant={getStatusVariant(order.status)}>
                                                {getStatusText(order.status)}
                                            </Badge>
                                        </td>
                                        <td className="p-3 text-right text-gray-500">
                                            {format(order.createdAt, 'yyyy-MM-dd HH:mm')}
                                        </td>
                                        <td className="p-3 text-center space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openStatusDialog(order)}
                                            >
                                                更新状态
                                            </Button>
                                            {order.status === 'paid' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleManualDeliver(order.orderId)}
                                                >
                                                    标记发货
                                                </Button>
                                            )}
                                            {order.status === 'delivered' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleResendReward(order.orderId)}
                                                >
                                                    重发奖励
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        上一页
                    </Button>
                    <span className="text-sm py-2">第 {page} 页</span>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={orders.length < 10}
                        onClick={() => setPage(p => p + 1)}
                    >
                        下一页
                    </Button>
                </div>
            </CardContent>
            <Dialog open={statusDialog.open} onOpenChange={(open) => setStatusDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>更新订单状态</DialogTitle>
                        <DialogDescription>
                            订单号：{statusDialog.order?.orderId}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="order-status-select">订单状态</Label>
                            <Select value={statusDialog.status} onValueChange={(value) => setStatusDialog(prev => ({ ...prev, status: value }))}>
                                <SelectTrigger id="order-status-select">
                                    <SelectValue placeholder="选择订单状态" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ORDER_STATUS_OPTIONS.map(option => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStatusDialog({ open: false, status: 'pending' })}>取消</Button>
                        <Button onClick={handleUpdateStatus}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

function FinancialStatsPanel() {
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

    if (!stats && loading) return <div>加载中...</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="选择时间范围" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">最近7天</SelectItem>
                        <SelectItem value="30">最近30天</SelectItem>
                        <SelectItem value="90">最近3个月</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">总营收</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats?.totalRevenue?.toFixed(2) || '0.00'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">总订单数</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">客单价</CardTitle>
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
                        <CardTitle>每日营收趋势</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {stats?.dailyRevenue?.map((item: any) => (
                                <div key={item.date} className="flex items-center justify-between text-sm">
                                    <span>{item.date}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-gray-500">{item.orders} 单</span>
                                        <span className="font-medium w-20 text-right">${item.revenue.toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>大R用户 (Top 10)</CardTitle>
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
    const [refunds, setRefunds] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [exporting, setExporting] = useState(false)

    const loadRefunds = async () => {
        setLoading(true)
        try {
            const res = await fetchRefunds({ page, limit: 10, status: 'pending' })
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

    const handleProcess = async (refundId: string, approved: boolean) => {
        if (!confirm(approved ? '确定批准退款吗？此操作不可撤销。' : '确定拒绝退款吗？')) return

        try {
            const res = await processRefund({ refundId, approved })
            if (res.isSucc) {
                toast({ title: approved ? "退款已批准" : "退款已拒绝" })
                loadRefunds()
            } else {
                toast({ title: "操作失败", description: res.err?.message, variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "操作失败", variant: "destructive" })
        }
    }

    const handleExportRefunds = async () => {
        setExporting(true)
        try {
            const res = await fetchRefunds({ page: 1, limit: 200 })
            if (!res.isSucc || !res.res?.refunds?.length) {
                toast({ title: '暂无退款记录可导出', variant: 'destructive' })
                return
            }
            const rows = [
                ['退款ID', '订单号', '用户ID', '金额', '状态', '申请时间'].join(',')
            ]
            res.res.refunds.forEach((refund: any) => {
                rows.push([
                    refund.refundId,
                    refund.orderId,
                    refund.userId,
                    refund.amount,
                    refund.status,
                    new Date(refund.createdAt).toLocaleString('zh-CN')
                ].join(','))
            })
            const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `refunds-${Date.now()}.csv`
            link.click()
            URL.revokeObjectURL(url)
            toast({ title: '退款记录已导出', description: `共 ${res.res.refunds.length} 条` })
        } catch (error: any) {
            toast({ title: '导出失败', description: error.message, variant: 'destructive' })
        } finally {
            setExporting(false)
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>待处理退款申请</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportRefunds} disabled={exporting}>
                    {exporting ? '导出中...' : '导出CSV'}
                </Button>
            </CardHeader>
            <CardContent>
                 <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 text-left font-medium">申请ID</th>
                                <th className="p-3 text-left font-medium">用户</th>
                                <th className="p-3 text-left font-medium">关联订单</th>
                                <th className="p-3 text-right font-medium">金额</th>
                                <th className="p-3 text-left font-medium">理由</th>
                                <th className="p-3 text-right font-medium">申请时间</th>
                                <th className="p-3 text-center font-medium">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center">加载中...</td></tr>
                            ) : refunds.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">无待处理退款</td></tr>
                            ) : (
                                refunds.map((refund) => (
                                    <tr key={refund.refundId} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-mono">{refund.refundId}</td>
                                        <td className="p-3 font-mono">{refund.userId}</td>
                                        <td className="p-3 font-mono">{refund.orderId}</td>
                                        <td className="p-3 text-right font-bold">${refund.amount}</td>
                                        <td className="p-3 text-gray-600 truncate max-w-[200px]">{refund.reason}</td>
                                        <td className="p-3 text-right text-gray-500">
                                            {format(refund.createdAt, 'MM-dd HH:mm')}
                                        </td>
                                        <td className="p-3 text-center space-x-2">
                                            <Button 
                                                size="sm" 
                                                className="bg-green-600 hover:bg-green-700"
                                                onClick={() => handleProcess(refund.refundId, true)}
                                            >
                                                批准
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="destructive"
                                                onClick={() => handleProcess(refund.refundId, false)}
                                            >
                                                拒绝
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}

const ORDER_STATUS_OPTIONS = [
    { value: 'pending', label: '待支付' },
    { value: 'paid', label: '已支付' },
    { value: 'delivered', label: '已发货' },
    { value: 'failed', label: '失败' },
    { value: 'cancelled', label: '已取消' },
    { value: 'refunded', label: '已退款' }
]

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

function getStatusText(status: string) {
    const map: any = {
        paid: '已支付',
        delivered: '已发货',
        pending: '待支付',
        failed: '失败',
        refunded: '已退款',
        cancelled: '已取消'
    }
    return map[status] || status
}
