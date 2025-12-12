'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Ban, Mail, Upload, CheckCircle } from 'lucide-react'
import { callAPI } from '@/lib/api'
import { useTranslation } from '@/components/providers/i18n-provider'

export default function BatchOperationsPage() {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState('ban')
    const { t } = useTranslation('users')

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">{t('batch.title')}</h1>
            <p className="text-gray-500">
                {t('batch.description')}
            </p>

            <Tabs defaultValue="ban" className="space-y-4" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="ban" className="flex items-center gap-2">
                        <Ban className="h-4 w-4" />
                        {t('batch.tabs.ban')}
                    </TabsTrigger>
                    <TabsTrigger value="mail" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {t('batch.tabs.mail')}
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
    const { t } = useTranslation('users')
    const { t: tCommon } = useTranslation('common')
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
        const ids = text.split(/[\n,\s]+/)
            .map(id => id.trim())
            .filter(id => id.length > 0)
        
        // 去重
        const uniqueIds = Array.from(new Set(ids))
        setUserIds(uniqueIds)
        setRawInput(uniqueIds.join('\n'))
        toast({ title: t('batch.parsed', { count: uniqueIds.length }) })
    }

    const handleExecute = async () => {
        if (userIds.length === 0) {
            parseIds(rawInput) // 尝试从文本框解析
            if (userIds.length === 0) {
                toast({ title: t('batch.ban.noIds'), variant: "destructive" })
                return
            }
        }
        if (!reason) {
            toast({ title: t('batch.ban.enterReason'), variant: "destructive" })
            return
        }

        if (!confirm(t('batch.ban.confirm', { count: userIds.length }))) return

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
                toast({ title: t('batch.ban.success') })
            } else {
                toast({ title: t('batch.ban.failure'), description: res.err?.message || tCommon('unknownError'), variant: "destructive" })
            }
        } catch (error) {
            console.error(error)
            toast({ title: t('batch.ban.error'), variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t('batch.ban.inputTitle')}</CardTitle>
                    <CardDescription>{t('batch.ban.inputDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" className="relative" aria-label={t('batch.ban.upload')}>
                            <Upload className="mr-2 h-4 w-4" />
                            {t('batch.ban.upload')}
                            <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept=".txt,.csv"
                                onChange={handleFileChange}
                            />
                        </Button>
                        <span className="text-sm text-gray-500">
                            {t('batch.selected', { count: userIds.length })}
                        </span>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="batch-ban-users">{t('batch.ban.listLabel')}</Label>
                        <Textarea 
                            id="batch-ban-users"
                            placeholder={`${t('batch.ban.placeholder')}\nuser_789012`} 
                            className="h-[300px] font-mono"
                            value={rawInput}
                            onChange={e => setRawInput(e.target.value)}
                            onBlur={e => parseIds(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('batch.ban.paramsTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="batch-ban-reason">{t('batch.ban.reasonLabel')}</Label>
                        <Textarea 
                            id="batch-ban-reason"
                            placeholder={t('batch.ban.reasonPlaceholder')} 
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="batch-ban-duration">{t('batch.ban.durationLabel')}</Label>
                        <Input 
                            id="batch-ban-duration"
                            type="number" 
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">{t('batch.ban.durationHint')}</p>
                    </div>

                    <div className="pt-4">
                        <Button 
                            className="w-full" 
                            variant="destructive" 
                            onClick={handleExecute}
                            disabled={loading || userIds.length === 0}
                        >
                            {loading ? t('batch.ban.executing') : t('batch.ban.execute', { count: userIds.length })}
                        </Button>
                    </div>

                    {result && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                {t('batch.ban.resultTitle')}
                            </h4>
                            <div className="text-sm space-y-1">
                                <p>{t('batch.ban.successCount', { count: result.successCount })}</p>
                                <p>{t('batch.ban.failCount', { count: result.failCount })}</p>
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
    const { t } = useTranslation('users')
    const { t: tCommon } = useTranslation('common')
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
            toast({ title: t('batch.mail.missingUsers'), variant: "destructive" })
            return
        }
        if (!title || !content) {
            toast({ title: t('batch.mail.missingContent'), variant: "destructive" })
            return
        }

        if (!confirm(t('batch.mail.confirm', { count: userIds.length }))) return

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
                toast({ title: t('batch.mail.success') })
            } else {
                toast({ title: t('batch.mail.failure'), description: res.err?.message || tCommon('unknownError'), variant: "destructive" })
            }
        } catch (error) {
            console.error(error)
            toast({ title: t('batch.mail.error'), variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t('batch.mail.inputTitle')}</CardTitle>
                    <CardDescription>{t('batch.mail.inputDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" className="relative">
                            <Upload className="mr-2 h-4 w-4" />
                            {t('batch.mail.upload')}
                            <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept=".txt,.csv"
                                onChange={handleFileChange}
                            />
                        </Button>
                        <span className="text-sm text-gray-500">
                            {t('batch.selected', { count: userIds.length })}
                        </span>
                    </div>
                    <Textarea 
                        placeholder={`${t('batch.ban.placeholder')}\nuser_789012`} 
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
                    <CardTitle>{t('batch.mail.contentTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="batch-mail-title">{t('batch.mail.titleLabel')}</Label>
                        <Input
                            id="batch-mail-title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="batch-mail-content">{t('batch.mail.contentLabel')}</Label>
                        <Textarea 
                            id="batch-mail-content"
                            value={content} 
                            onChange={e => setContent(e.target.value)}
                            className="h-[100px]"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="batch-mail-gold">{t('batch.mail.goldLabel')}</Label>
                            <Input 
                                id="batch-mail-gold"
                                type="number" 
                                value={rewards.gold} 
                                onChange={e => setRewards({...rewards, gold: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="batch-mail-tickets">{t('batch.mail.ticketLabel')}</Label>
                            <Input 
                                id="batch-mail-tickets"
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
                            {loading ? t('batch.mail.sending') : t('batch.mail.execute', { count: userIds.length })}
                        </Button>
                    </div>

                    {result && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                {t('batch.mail.resultTitle')}
                            </h4>
                            <div className="text-sm">
                                <p>{t('batch.mail.successCount', { count: result.successCount })}</p>
                                <p>{t('batch.mail.failCount', { count: result.failCount })}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
