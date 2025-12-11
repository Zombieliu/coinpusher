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
import { fetchCdkList, generateCdk, disableCdk } from '@/lib/api'
import { Plus, Search, Copy, Ban, Ticket } from 'lucide-react'
import { format } from 'date-fns'

export default function CdkPage() {
    const { toast } = useToast()
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

    useEffect(() => {
        loadData()
    }, [page])

    const handleGenerate = async () => {
        if (!formData.name) {
            toast({ title: "请输入批次名称", variant: "destructive" })
            return
        }

        const rewards: any = {}
        if (formData.rewards.gold) rewards.gold = parseInt(formData.rewards.gold)
        if (formData.rewards.tickets) rewards.tickets = parseInt(formData.rewards.tickets)
        
        if (Object.keys(rewards).length === 0) {
            toast({ title: "请设置奖励", variant: "destructive" })
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
                toast({ title: "生成成功" })
                setCreateOpen(false)
                if (res.res.codes) {
                    setGeneratedCodes(res.res.codes)
                    setResultOpen(true)
                }
                loadData()
            } else {
                toast({ title: "操作失败", description: res.err?.message, variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "操作异常", variant: "destructive" })
        }
    }

    const handleDisable = async (code: string, isBatch: boolean) => {
        if (!confirm(isBatch ? "确定要禁用该批次的所有CDK吗？" : "确定禁用该CDK吗？")) return
        try {
            const res = await disableCdk({ code, disableBatch: isBatch })
            if (res.isSucc) {
                toast({ title: "操作成功" })
                loadData()
            }
        } catch (error) {
            toast({ title: "操作异常", variant: "destructive" })
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast({ title: "已复制" })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">CDK管理</h1>
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    生成CDK
                </Button>
            </div>

            {/* 筛选栏 */}
            <Card>
                <CardContent className="p-4 flex gap-4">
                    <Input 
                        placeholder="搜索CDK..." 
                        value={searchCode}
                        onChange={e => setSearchCode(e.target.value)}
                        className="max-w-[200px]"
                    />
                    <Input 
                        placeholder="搜索批次ID..." 
                        value={searchBatch}
                        onChange={e => setSearchBatch(e.target.value)}
                        className="max-w-[200px]"
                    />
                    <Button onClick={() => { setPage(1); loadData(); }}>
                        <Search className="mr-2 h-4 w-4" />
                        搜索
                    </Button>
                </CardContent>
            </Card>

            {/* 列表 */}
            <div className="bg-white rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-3 text-left">CDK / 批次名称</th>
                            <th className="p-3 text-left">类型</th>
                            <th className="p-3 text-left">奖励内容</th>
                            <th className="p-3 text-center">使用情况</th>
                            <th className="p-3 text-left">过期时间</th>
                            <th className="p-3 text-center">状态</th>
                            <th className="p-3 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="p-8 text-center">加载中...</td></tr>
                        ) : list.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-500">暂无数据</td></tr>
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
                                        <Badge variant="outline">{item.type === 'single' ? '单次' : '通用'}</Badge>
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
                                            <Badge className="bg-green-600">生效中</Badge>
                                        ) : (
                                            <Badge variant="destructive">已失效</Badge>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        <Button size="icon" variant="ghost" title="复制" onClick={() => copyToClipboard(item.code)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => handleDisable(item.code, false)}
                                            disabled={!item.active}
                                            title="禁用此CDK"
                                        >
                                            <Ban className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>上一页</Button>
                <span className="py-2 text-sm">第 {page} 页</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={list.length < 20}>下一页</Button>
            </div>

            {/* 生成对话框 */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>生成CDK</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="cdk-name">批次名称</Label>
                            <Input id="cdk-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="例如：开服补偿" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cdk-type">类型</Label>
                                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                                    <SelectTrigger id="cdk-type"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single">单次使用 (一人一码)</SelectItem>
                                        <SelectItem value="universal">通用码 (一人一码，总数限制)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cdk-count">生成数量</Label>
                                <Input id="cdk-count" type="number" value={formData.count} onChange={e => setFormData({...formData, count: e.target.value})} disabled={formData.type === 'universal'} />
                            </div>
                        </div>
                        
                        {formData.type === 'universal' && (
                            <div className="space-y-2">
                                <Label htmlFor="cdk-usage-limit">总使用次数限制 (-1为无限)</Label>
                                <Input id="cdk-usage-limit" type="number" value={formData.usageLimit} onChange={e => setFormData({...formData, usageLimit: e.target.value})} />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cdk-gold">金币奖励</Label>
                                <Input id="cdk-gold" type="number" value={formData.rewards.gold} onChange={e => setFormData({...formData, rewards: {...formData.rewards, gold: e.target.value}})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cdk-tickets">彩票奖励</Label>
                                <Input id="cdk-tickets" type="number" value={formData.rewards.tickets} onChange={e => setFormData({...formData, rewards: {...formData.rewards, tickets: e.target.value}})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cdk-prefix">前缀 (可选)</Label>
                                <Input id="cdk-prefix" value={formData.prefix} onChange={e => setFormData({...formData, prefix: e.target.value})} placeholder="例如：VIP" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cdk-expire">有效期 (天)</Label>
                                <Input id="cdk-expire" type="number" value={formData.expireDays} onChange={e => setFormData({...formData, expireDays: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleGenerate}>确认生成</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 结果对话框 */}
            <Dialog open={resultOpen} onOpenChange={setResultOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>生成成功</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">已生成 {generatedCodes.length} 个CDK，请复制保存：</p>
                        <div className="bg-gray-50 p-4 rounded-md max-h-[300px] overflow-y-auto font-mono text-sm">
                            {generatedCodes.join('\n')}
                        </div>
                        <Button onClick={() => copyToClipboard(generatedCodes.join('\n'))} className="w-full">
                            <Copy className="mr-2 h-4 w-4" />
                            复制全部
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
