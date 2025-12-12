'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { fetchCdkList, generateCdk, disableCdk, fetchCdkHistory } from '@/lib/api'
import { Plus, Search, Copy, Ban, Ticket, History } from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from '@/components/providers/i18n-provider'

export default function CdkPage() {
    const { toast } = useToast()
    const { t } = useTranslation('cdk')
    const [list, setList] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    
    // 筛选
    const [searchCode, setSearchCode] = useState('')
    const [searchBatch, setSearchBatch] = useState('')
    
    // 生成弹窗
    const [createOpen, setCreateOpen] = useState(false)
    const [formData, setFormData] = useState<any>({
        name: '',
        type: 'single',
        rewards: { gold: '', tickets: '' },
        count: 1,
        usageLimit: 1,
        prefix: '',
        expireDays: 30
    })

    // 生成结果展示
    const [resultOpen, setResultOpen] = useState(false)
    const [generatedCodes, setGeneratedCodes] = useState<string[]>([])
    const [historyOpen, setHistoryOpen] = useState(false)
    const [historyTarget, setHistoryTarget] = useState<{ batchId?: string, code?: string, name?: string } | null>(null)
    const [usageLogs, setUsageLogs] = useState<any[]>([])
    const [actionLogs, setActionLogs] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)

    const loadData = async () => {
        setLoading(true)
        try {
            const res = await fetchCdkList({
                page,
                limit: 20,
                code: searchCode,
                batchId: searchBatch
            })
            if (res.isSucc && res.res) {
                setList(res.res.list || [])
                setTotal(res.res.total || 0)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const loadHistory = async (batchId?: string, code?: string) => {
        setHistoryLoading(true)
        try {
            const res = await fetchCdkHistory({
                batchId,
                code,
                type: 'all',
                limit: 20
            })
            if (res.isSucc && res.res) {
                setUsageLogs(res.res.usage?.list || [])
                setActionLogs(res.res.actions?.list || [])
            }
        } catch (error) {
            console.error(error)
        } finally {
            setHistoryLoading(false)
        }
    }

    const openHistory = (item: any) => {
        setHistoryTarget({ batchId: item.batchId, code: item.code, name: item.name })
        setHistoryOpen(true)
        loadHistory(item.batchId, item.code)
    }

    useEffect(() => {
        loadData()
    }, [page])

    const handleGenerate = async () => {
        if (!formData.name) {
            toast({ title: t('toast.nameRequired'), variant: "destructive" })
            return
        }

        const rewards: any = {}
        if (formData.rewards.gold) rewards.gold = parseInt(formData.rewards.gold)
        if (formData.rewards.tickets) rewards.tickets = parseInt(formData.rewards.tickets)
        
        if (Object.keys(rewards).length === 0) {
            toast({ title: t('toast.rewardRequired'), variant: "destructive" })
            return
        }

        try {
            const res = await generateCdk({
                name: formData.name,
                type: formData.type,
                rewards,
                count: parseInt(formData.count),
                usageLimit: formData.type === 'single' ? 1 : parseInt(formData.usageLimit),
                prefix: formData.prefix,
                expireAt: Date.now() + parseInt(formData.expireDays) * 24 * 60 * 60 * 1000
            })

            if (res.isSucc && res.res) {
                toast({ title: t('toast.generateSuccess') })
                setCreateOpen(false)
                if (res.res.codes) {
                    setGeneratedCodes(res.res.codes)
                    setResultOpen(true)
                }
                loadData()
            } else {
                toast({ title: t('toast.actionFailed'), description: res.err?.message, variant: "destructive" })
            }
        } catch (error) {
            toast({ title: t('toast.actionError'), variant: "destructive" })
        }
    }

    const handleDisable = async (code: string, isBatch: boolean) => {
        if (!confirm(isBatch ? t('confirm.disableBatch') : t('confirm.disableSingle'))) return
        const reason = window.prompt(t('confirm.reason'), t('confirm.reasonDefault')) || undefined
        try {
            const res = await disableCdk({ code, disableBatch: isBatch, reason })
            if (res.isSucc) {
                toast({ title: t('toast.actionSuccess') })
                loadData()
            }
        } catch (error) {
            toast({ title: t('toast.actionError'), variant: "destructive" })
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast({ title: t('toast.copy') })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('createButton')}
                </Button>
            </div>

            {/* 筛选栏 */}
            <Card>
                <CardContent className="p-4 flex gap-4">
                    <Input 
                        placeholder={t('filters.codePlaceholder')} 
                        value={searchCode}
                        onChange={e => setSearchCode(e.target.value)}
                        className="max-w-[200px]"
                    />
                    <Input 
                        placeholder={t('filters.batchPlaceholder')} 
                        value={searchBatch}
                        onChange={e => setSearchBatch(e.target.value)}
                        className="max-w-[200px]"
                    />
                    <Button onClick={() => { setPage(1); loadData(); }}>
                        <Search className="mr-2 h-4 w-4" />
                        {t('filters.search')}
                    </Button>
                </CardContent>
            </Card>

            {/* 列表 */}
            <div className="bg-white rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-3 text-left">{t('table.code')}</th>
                            <th className="p-3 text-left">{t('table.type')}</th>
                            <th className="p-3 text-left">{t('table.rewards')}</th>
                            <th className="p-3 text-center">{t('table.usage')}</th>
                            <th className="p-3 text-left">{t('table.expireAt')}</th>
                            <th className="p-3 text-center">{t('table.status')}</th>
                            <th className="p-3 text-right">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="p-8 text-center">{t('table.loading')}</td></tr>
                        ) : list.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-500">{t('table.empty')}</td></tr>
                        ) : (
                            list.map((item) => (
                                <tr key={item.code} className="border-b hover:bg-gray-50">
                                    <td className="p-3">
                                        <div className="flex flex-col">
                                            <span className="font-mono font-medium">{item.code}</span>
                                            <span className="text-xs text-gray-500">{item.name}</span>
                                            <span className="text-xs text-gray-400 font-mono" title="Batch ID">{item.batchId.slice(0, 8)}...</span>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <Badge variant="outline">{item.type === 'single' ? t('badge.single') : t('badge.universal')}</Badge>
                                    </td>
                                    <td className="p-3">
                                        <div className="space-x-2">
                                            {item.rewards.gold && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">💰 {item.rewards.gold}</Badge>}
                                            {item.rewards.tickets && <Badge variant="secondary" className="bg-blue-100 text-blue-800">🎫 {item.rewards.tickets}</Badge>}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        {item.usageCount} / {item.usageLimit === -1 ? '∞' : item.usageLimit}
                                    </td>
                                    <td className="p-3 text-gray-500">
                                        {format(item.expireAt, 'yyyy-MM-dd')}
                                    </td>
                                    <td className="p-3 text-center">
                                        {item.active ? (
                                            <Badge className="bg-green-600">{t('badge.active')}</Badge>
                                        ) : (
                                            <Badge variant="destructive">{t('badge.inactive')}</Badge>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        <Button size="icon" variant="ghost" title={t('actions.copy')} onClick={() => copyToClipboard(item.code)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            title={t('actions.disableBatch')}
                                            className="text-orange-500 hover:text-orange-600"
                                            onClick={() => handleDisable(item.batchId, true)}
                                        >
                                            <Ticket className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => handleDisable(item.code, false)}
                                            disabled={!item.active}
                                            title={t('actions.disableSingle')}
                                        >
                                            <Ban className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            title={t('actions.history')}
                                            onClick={() => openHistory(item)}
                                        >
                                            <History className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>{t('table.prev')}</Button>
                <span className="py-2 text-sm">{t('table.page', { page })}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={list.length < 20}>{t('table.next')}</Button>
            </div>

            {/* 生成对话框 */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dialog.generateTitle')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="cdk-name">{t('dialog.nameLabel')}</Label>
                            <Input id="cdk-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={t('dialog.namePlaceholder')} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cdk-type">{t('dialog.typeLabel')}</Label>
                                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                                    <SelectTrigger id="cdk-type"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single">{t('dialog.typeSingle')}</SelectItem>
                                        <SelectItem value="universal">{t('dialog.typeUniversal')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cdk-count">{t('dialog.countLabel')}</Label>
                                <Input id="cdk-count" type="number" value={formData.count} onChange={e => setFormData({...formData, count: e.target.value})} disabled={formData.type === 'universal'} />
                            </div>
                        </div>
                        
                        {formData.type === 'universal' && (
                            <div className="space-y-2">
                                <Label htmlFor="cdk-usage-limit">{t('dialog.usageLabel')}</Label>
                                <Input id="cdk-usage-limit" type="number" value={formData.usageLimit} onChange={e => setFormData({...formData, usageLimit: e.target.value})} />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cdk-gold">{t('dialog.goldLabel')}</Label>
                                <Input id="cdk-gold" type="number" value={formData.rewards.gold} onChange={e => setFormData({...formData, rewards: {...formData.rewards, gold: e.target.value}})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cdk-tickets">{t('dialog.ticketsLabel')}</Label>
                                <Input id="cdk-tickets" type="number" value={formData.rewards.tickets} onChange={e => setFormData({...formData, rewards: {...formData.rewards, tickets: e.target.value}})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cdk-prefix">{t('dialog.prefixLabel')}</Label>
                                <Input id="cdk-prefix" value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value})} placeholder={t('dialog.prefixPlaceholder')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cdk-expire">{t('dialog.expireLabel')}</Label>
                                <Input id="cdk-expire" type="number" value={formData.expireDays} onChange={e => setFormData({...formData, expireDays: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleGenerate}>{t('dialog.submit')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 结果对话框 */}
            <Dialog open={resultOpen} onOpenChange={setResultOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dialog.resultTitle')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">{t('dialog.resultDesc', { count: generatedCodes.length })}</p>
                        <div className="bg-gray-50 p-4 rounded-md max-h-[300px] overflow-y-auto font-mono text-sm">
                            {generatedCodes.join('\n')}
                        </div>
                        <Button onClick={() => copyToClipboard(generatedCodes.join('\n'))} className="w-full">
                            <Copy className="mr-2 h-4 w-4" />
                            {t('dialog.copyAll')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            {t('dialog.historyTitle', { name: historyTarget?.name || historyTarget?.batchId?.slice(0, 8) })}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 max-h-[500px] overflow-y-auto">
                        <div>
                            <h4 className="text-sm font-semibold mb-2">{t('dialog.usageTitle')}</h4>
                            <div className="border rounded-md">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-2 text-left">{t('dialog.usageColumns.user')}</th>
                                            <th className="p-2 text-left">{t('dialog.usageColumns.code')}</th>
                                            <th className="p-2 text-left">{t('dialog.usageColumns.time')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyLoading ? (
                                            <tr><td colSpan={3} className="p-4 text-center text-gray-500">{t('dialog.loading')}</td></tr>
                                        ) : usageLogs.length === 0 ? (
                                            <tr><td colSpan={3} className="p-4 text-center text-gray-500">{t('dialog.usageEmpty')}</td></tr>
                                        ) : (
                                            usageLogs.map(log => (
                                                <tr key={`${log.code}-${log.userId}-${log.usedAt}`} className="border-b">
                                                    <td className="p-2 font-mono text-xs">{log.userId}</td>
                                                    <td className="p-2 font-mono text-xs">{log.code}</td>
                                                    <td className="p-2">{format(log.usedAt, 'yyyy-MM-dd HH:mm')}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-2">{t('dialog.actionsTitle')}</h4>
                            <div className="border rounded-md">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-2 text-left">{t('dialog.actionColumns.action')}</th>
                                            <th className="p-2 text-left">{t('dialog.actionColumns.admin')}</th>
                                            <th className="p-2 text-left">{t('dialog.actionColumns.time')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyLoading ? (
                                            <tr><td colSpan={3} className="p-4 text-center text-gray-500">{t('dialog.loading')}</td></tr>
                                        ) : actionLogs.length === 0 ? (
                                            <tr><td colSpan={3} className="p-4 text-center text-gray-500">{t('dialog.actionsEmpty')}</td></tr>
                                        ) : (
                                            actionLogs.map(log => (
                                                <tr key={log.actionId} className="border-b">
                                                    <td className="p-2">{log.action}</td>
                                                    <td className="p-2">{log.adminName}</td>
                                                    <td className="p-2">{format(log.createdAt, 'yyyy-MM-dd HH:mm')}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
