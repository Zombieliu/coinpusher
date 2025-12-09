'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Ban, Mail, Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react'
import { callAPI } from '@/lib/api'

export default function BatchOperationsPage() {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState('ban')

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">批量操作</h1>
            <p className="text-gray-500">
                通过上传文件或输入ID列表，对大量用户进行批量操作。请谨慎使用。
            </p>

            <Tabs defaultValue="ban" className="space-y-4" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="ban" className="flex items-center gap-2">
                        <Ban className="h-4 w-4" />
                        批量封禁
                    </TabsTrigger>
                    <TabsTrigger value="mail" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        批量邮件/奖励
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ban">
                    <BatchBanPanel />
                </TabsContent>

                <TabsContent value="mail">
                    <BatchMailPanel />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function BatchBanPanel() {
    const { toast } = useToast()
    const [userIds, setUserIds] = useState<string[]>([])
    const [rawInput, setRawInput] = useState('')
    const [reason, setReason] = useState('')
    const [duration, setDuration] = useState('24')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            parseIds(text)
        }
        reader.readAsText(file)
    }

    const parseIds = (text: string) => {
        // 支持逗号、换行、空格分隔
        const ids = text.split(/[\n,\s]+/)
            .map(id => id.trim())
            .filter(id => id.length > 0)
        
        // 去重
        const uniqueIds = Array.from(new Set(ids))
        setUserIds(uniqueIds)
        setRawInput(uniqueIds.join('\n'))
        toast({ title: `已解析 ${uniqueIds.length} 个用户ID` })
    }

    const handleExecute = async () => {
        if (userIds.length === 0) {
            parseIds(rawInput) // 尝试从文本框解析
            if (userIds.length === 0) {
                toast({ title: "请输入或上传用户ID", variant: "destructive" })
                return
            }
        }
        if (!reason) {
            toast({ title: "请输入封禁原因", variant: "destructive" })
            return
        }

        if (!confirm(`确定要封禁 ${userIds.length} 个用户吗？此操作影响重大！`)) return

        setLoading(true)
        setResult(null)

        try {
            const res = await callAPI('admin/BatchBanUsers', {
                userIds,
                reason,
                duration: parseInt(duration)
            })

            if (res.isSucc) {
                setResult(res.res)
                toast({ title: "批量操作完成" })
            } else {
                toast({ title: "操作失败", description: res.err?.message, variant: "destructive" })
            }
        } catch (error) {
            console.error(error)
            toast({ title: "操作异常", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>1. 输入目标用户</CardTitle>
                    <CardDescription>每行一个ID，或用逗号分隔</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" className="relative">
                            <Upload className="mr-2 h-4 w-4" />
                            上传TXT/CSV
                            <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept=".txt,.csv"
                                onChange={handleFileChange}
                            />
                        </Button>
                        <span className="text-sm text-gray-500">
                            已选中: <span className="font-bold text-blue-600">{userIds.length}</span> 人
                        </span>
                    </div>
                    <Textarea 
                        placeholder="user_123456&#10;user_789012" 
                        className="h-[300px] font-mono"
                        value={rawInput}
                        onChange={e => {
                            setRawInput(e.target.value)
                            parseIds(e.target.value)
                        }}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>2. 设置封禁参数</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>封禁原因 (必填)</Label>
                        <Textarea 
                            placeholder="例如：涉及工作室刷号行为" 
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>封禁时长 (小时)</Label>
                        <Input 
                            type="number" 
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">输入 -1 表示永久封禁</p>
                    </div>

                    <div className="pt-4">
                        <Button 
                            className="w-full" 
                            variant="destructive" 
                            onClick={handleExecute}
                            disabled={loading || userIds.length === 0}
                        >
                            {loading ? "执行中..." : `执行批量封禁 (${userIds.length}人)`}
                        </Button>
                    </div>

                    {result && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                执行结果
                            </h4>
                            <div className="text-sm space-y-1">
                                <p>成功: <span className="text-green-600 font-bold">{result.successCount}</span></p>
                                <p>失败: <span className="text-red-600 font-bold">{result.failCount}</span></p>
                                {result.errors && result.errors.length > 0 && (
                                    <div className="mt-2 text-xs text-red-500 max-h-[100px] overflow-y-auto">
                                        {result.errors.map((e: any, i: number) => (
                                            <div key={i}>{e.userId}: {e.error}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function BatchMailPanel() {
    const { toast } = useToast()
    const [userIds, setUserIds] = useState<string[]>([])
    const [rawInput, setRawInput] = useState('')
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [rewards, setRewards] = useState({ gold: '', tickets: '' })
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            parseIds(text)
        }
        reader.readAsText(file)
    }

    const parseIds = (text: string) => {
        const ids = text.split(/[\n,\s]+/)
            .map(id => id.trim())
            .filter(id => id.length > 0)
        
        const uniqueIds = Array.from(new Set(ids))
        setUserIds(uniqueIds)
        setRawInput(uniqueIds.join('\n'))
    }

    const handleExecute = async () => {
        if (userIds.length === 0) {
            toast({ title: "请输入目标用户", variant: "destructive" })
            return
        }
        if (!title || !content) {
            toast({ title: "请输入标题和内容", variant: "destructive" })
            return
        }

        if (!confirm(`确定要给 ${userIds.length} 个用户发送邮件吗？`)) return

        setLoading(true)
        setResult(null)

        const rewardObj: any = {}
        if (rewards.gold) rewardObj.gold = parseInt(rewards.gold)
        if (rewards.tickets) rewardObj.tickets = parseInt(rewards.tickets)

        try {
            const res = await callAPI('admin/BatchSendMail', {
                userIds,
                title,
                content,
                rewards: Object.keys(rewardObj).length > 0 ? rewardObj : undefined
            })

            if (res.isSucc) {
                setResult(res.res)
                toast({ title: "批量发送完成" })
            } else {
                toast({ title: "操作失败", description: res.err?.message, variant: "destructive" })
            }
        } catch (error) {
            console.error(error)
            toast({ title: "操作异常", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>1. 输入目标用户</CardTitle>
                    <CardDescription>每行一个ID，或用逗号分隔</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" className="relative">
                            <Upload className="mr-2 h-4 w-4" />
                            上传TXT/CSV
                            <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept=".txt,.csv"
                                onChange={handleFileChange}
                            />
                        </Button>
                        <span className="text-sm text-gray-500">
                            已选中: <span className="font-bold text-blue-600">{userIds.length}</span> 人
                        </span>
                    </div>
                    <Textarea 
                        placeholder="user_123456&#10;user_789012" 
                        className="h-[300px] font-mono"
                        value={rawInput}
                        onChange={e => {
                            setRawInput(e.target.value)
                            parseIds(e.target.value)
                        }}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>2. 设置邮件内容</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>邮件标题</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>邮件内容</Label>
                        <Textarea 
                            value={content} 
                            onChange={e => setContent(e.target.value)}
                            className="h-[100px]"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>附带金币 (可选)</Label>
                            <Input 
                                type="number" 
                                value={rewards.gold} 
                                onChange={e => setRewards({...rewards, gold: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>附带彩票 (可选)</Label>
                            <Input 
                                type="number" 
                                value={rewards.tickets} 
                                onChange={e => setRewards({...rewards, tickets: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button 
                            className="w-full" 
                            onClick={handleExecute}
                            disabled={loading || userIds.length === 0}
                        >
                            {loading ? "发送中..." : `批量发送 (${userIds.length}人)`}
                        </Button>
                    </div>

                    {result && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                发送结果
                            </h4>
                            <div className="text-sm">
                                <p>成功发送: <span className="text-green-600 font-bold">{result.successCount}</span></p>
                                <p>失败: <span className="text-red-600 font-bold">{result.failCount}</span></p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
