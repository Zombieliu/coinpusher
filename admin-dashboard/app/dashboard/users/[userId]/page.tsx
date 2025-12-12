'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
    User, Wallet, CreditCard, Calendar, Clock, Shield, 
    Ban, Mail, Gift, Package, RotateCcw, Activity 
} from 'lucide-react'
import { format } from 'date-fns'
import { fetchUserDetail, fetchOrders, banUser, unbanUser, grantReward } from '@/lib/api'
import { useToast } from "@/components/ui/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useTranslation } from '@/components/providers/i18n-provider'

export default function UserDetailPage() {
    const params = useParams()
    const userId = params.userId as string
    const router = useRouter()
    const { toast } = useToast()
    const { t } = useTranslation('users')
    const { t: tCommon } = useTranslation('common')
    
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [orders, setOrders] = useState<any[]>([])

    // 封禁/解封状态
    const [banDialogOpen, setBanDialogOpen] = useState(false)
    const [banReason, setBanReason] = useState('')
    const [banDuration, setBanDuration] = useState('24') // hours

    // 奖励状态
    const [rewardDialogOpen, setRewardDialogOpen] = useState(false)
    const [rewardGold, setRewardGold] = useState('')
    const [rewardTickets, setRewardTickets] = useState('')
    const [rewardReason, setRewardReason] = useState('')

    const loadData = async () => {
        setLoading(true)
        try {
            const [userRes, ordersRes] = await Promise.all([
                fetchUserDetail(userId),
                fetchOrders({ userId, limit: 5 })
            ])

            if (userRes.isSucc && userRes.res?.user) {
                setUser(userRes.res.user)
            } else {
                toast({ title: t('detail.fetchFailed'), variant: "destructive" })
            }

            if (ordersRes.isSucc && ordersRes.res?.orders) {
                setOrders(ordersRes.res.orders)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (userId) loadData()
    }, [userId])

    const handleBan = async () => {
        if (!banReason) {
            toast({ title: t('detail.enterBanReason'), variant: "destructive" })
            return
        }
        
        try {
            const res = await banUser(userId, banReason, parseInt(banDuration))
            if (res.isSucc) {
                toast({ title: t('detail.banSuccess') })
                setBanDialogOpen(false)
                loadData()
            } else {
                toast({ title: t('detail.actionFailed'), description: res.err?.message || tCommon('unknownError'), variant: "destructive" })
            }
        } catch (e) {
            toast({ title: t('detail.actionFailed'), variant: "destructive" })
        }
    }

    const handleUnban = async () => {
        if (!confirm(t('detail.confirmUnban'))) return
        try {
            const res = await unbanUser(userId)
            if (res.isSucc) {
                toast({ title: t('detail.unbanSuccess') })
                loadData()
            }
        } catch (e) {
            toast({ title: t('detail.actionFailed'), variant: "destructive" })
        }
    }

    const handleReward = async () => {
        try {
            const rewards: any = {}
            if (rewardGold) rewards.gold = parseInt(rewardGold)
            if (rewardTickets) rewards.tickets = parseInt(rewardTickets)
            
            if (Object.keys(rewards).length === 0) {
                toast({ title: t('detail.enterReward'), variant: "destructive" })
                return
            }

            const res = await grantReward(userId, { ...rewards, reason: rewardReason })
            if (res.isSucc) {
                toast({ title: t('detail.rewardSuccess') })
                setRewardDialogOpen(false)
                loadData()
            } else {
                toast({ title: t('detail.actionFailed'), description: res.err?.message || tCommon('unknownError'), variant: "destructive" })
            }
        } catch (e) {
            toast({ title: t('detail.actionFailed'), variant: "destructive" })
        }
    }

    if (loading) return <div>{t('detail.loading')}</div>
    if (!user) return <div>{t('detail.notFound')}</div>

    return (
        <div className="space-y-6">
            {/* 顶部概览 */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            {user.username}
                            <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                                {user.status === 'active' ? t('table.normal') : t('table.banned')}
                            </Badge>
                            {user.tags?.map((tag: string) => (
                                <Badge key={tag} variant="secondary">{tag}</Badge>
                            ))}
                        </h1>
                        <p className="text-gray-500 mt-1">ID: {user.userId}</p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" /> 
                                {t('detail.registeredAt', { date: format(user.createdAt || Date.now(), 'yyyy-MM-dd') })}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" /> 
                                {t('detail.lastLogin', { date: format(user.lastLoginTime || Date.now(), 'yyyy-MM-dd HH:mm') })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Gift className="mr-2 h-4 w-4" /> {t('detail.rewardTitle')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('detail.rewardTitle')}</DialogTitle>
                                <DialogDescription>{t('detail.rewardDescription')}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>{t('detail.goldLabel')}</Label>
                                    <Input type="number" value={rewardGold} onChange={e => setRewardGold(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('detail.ticketLabel')}</Label>
                                    <Input type="number" value={rewardTickets} onChange={e => setRewardTickets(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('detail.reasonLabel')}</Label>
                                    <Input value={rewardReason} onChange={e => setRewardReason(e.target.value)} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleReward}>{t('detail.confirmReward')}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" onClick={() => router.push(`/dashboard/mails?userId=${userId}`)}>
                        <Mail className="mr-2 h-4 w-4" /> {t('detail.mailButton')}
                    </Button>
                    
                    {user.status === 'active' ? (
                        <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="destructive">
                                    <Ban className="mr-2 h-4 w-4" /> {t('detail.banButton')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('detail.banDialogTitle')}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>{t('detail.banReasonLabel')}</Label>
                                        <Textarea value={banReason} onChange={e => setBanReason(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('detail.banDurationLabel')}</Label>
                                        <Input type="number" value={banDuration} onChange={e => setBanDuration(e.target.value)} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="destructive" onClick={handleBan}>{t('detail.confirmBan')}</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    ) : (
                        <Button variant="secondary" onClick={handleUnban}>
                            <Shield className="mr-2 h-4 w-4" /> {t('detail.unbanButton')}
                        </Button>
                    )}
                </div>
            </div>

            {/* 核心指标 */}
            <div className="grid grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('detail.cards.gold')}</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{user.gold.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('detail.cards.tickets')}</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{user.tickets.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('detail.cards.vip')}</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Lv.{user.vipLevel}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('detail.cards.recharge')}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${user.totalRecharge.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            {/* 详细信息 Tabs */}
            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">{t('detail.tabs.overview')}</TabsTrigger>
                    <TabsTrigger value="inventory">{t('detail.tabs.inventory', { count: user.inventory?.length || 0 })}</TabsTrigger>
                    <TabsTrigger value="orders">{t('detail.tabs.orders')}</TabsTrigger>
                    <TabsTrigger value="logs">{t('detail.tabs.logs')}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('detail.recentOrders')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {orders.length === 0 ? (
                                <p className="text-sm text-gray-500">{t('detail.noOrders')}</p>
                            ) : (
                                <div className="space-y-4">
                                    {orders.map((order) => (
                                        <div key={order.orderId} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                                            <div>
                                                <div className="font-medium">{order.productName}</div>
                                                <div className="text-gray-500 text-xs">{format(order.createdAt, 'yyyy-MM-dd HH:mm')}</div>
                                            </div>
                                            <div className="font-bold">${order.amount}</div>
                                        </div>
                                    ))}
                                    <Button variant="link" className="p-0 h-auto" onClick={() => router.push(`/dashboard/finance?userId=${userId}`)}>
                                        {t('detail.viewAll')}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    
                    {/* 可以添加更多概览信息，如最近登录记录等 */}
                </TabsContent>

                <TabsContent value="inventory">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-6 gap-4">
                                {user.inventory?.map((item: any, index: number) => (
                                    <div key={index} className="flex flex-col items-center p-4 border rounded-lg bg-gray-50">
                                        <Package className="h-8 w-8 mb-2 text-blue-500" />
                                        <span className="text-sm font-medium">{item.itemName}</span>
                                        <span className="text-xs text-gray-500">x{item.quantity}</span>
                                        <Badge variant="outline" className="mt-2 text-xs">{item.rarity}</Badge>
                                    </div>
                                ))}
                                {(!user.inventory || user.inventory.length === 0) && (
                                    <div className="col-span-6 text-center text-gray-500 py-8">
                                        {t('detail.inventoryEmpty')}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="orders">
                    <Card>
                        <CardContent className="pt-6">
                             <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-3 text-left">{t('detail.ordersTable.id')}</th>
                                        <th className="p-3 text-left">{t('detail.ordersTable.product')}</th>
                                        <th className="p-3 text-right">{t('detail.ordersTable.amount')}</th>
                                        <th className="p-3 text-center">{t('detail.ordersTable.status')}</th>
                                        <th className="p-3 text-right">{t('detail.ordersTable.time')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order.orderId} className="border-b">
                                            <td className="p-3">{order.orderId}</td>
                                            <td className="p-3">{order.productName}</td>
                                            <td className="p-3 text-right">${order.amount}</td>
                                            <td className="p-3 text-center">{order.status}</td>
                                            <td className="p-3 text-right">{format(order.createdAt, 'MM-dd HH:mm')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logs">
                    <Card>
                        <CardContent className="pt-6 text-center text-gray-500">
                            {t('detail.noLogs')}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
