'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch" // 需要补这个组件
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { fetchSystemConfig, setMaintenance } from '@/lib/api'
import { AlertTriangle, ShieldCheck } from 'lucide-react'

export default function MaintenancePage() {
    const { toast } = useToast()
    const [config, setConfig] = useState<any>({
        enabled: false,
        reason: '',
        whitelistIps: [],
        whitelistUsers: []
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadConfig()
    }, [])

    const loadConfig = async () => {
        const res = await fetchSystemConfig('maintenance_mode')
        if (res.isSucc && res.res?.value) {
            setConfig(res.res.value)
        }
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const res = await setMaintenance(config)
            if (res.isSucc) {
                toast({ title: "设置已更新" })
            } else {
                toast({ title: "更新失败", variant: "destructive" })
            }
        } catch (e) {
            toast({ title: "操作异常", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">系统维护</h1>
            
            <div className="grid gap-6 max-w-2xl">
                <Card className={config.enabled ? "border-red-500 bg-red-50" : ""}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className={config.enabled ? "text-red-600" : "text-gray-400"} />
                            维护模式开关
                        </CardTitle>
                        <CardDescription>
                            开启后，只有白名单用户/IP可以登录游戏。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <span className="font-medium">当前状态: {config.enabled ? '维护中 ⛔' : '正常运行 ✅'}</span>
                        <Button 
                            variant={config.enabled ? "destructive" : "default"}
                            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                        >
                            {config.enabled ? "关闭维护模式" : "开启维护模式"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>维护设置</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>维护公告内容</Label>
                            <Textarea 
                                value={config.reason}
                                onChange={e => setConfig({ ...config, reason: e.target.value })}
                                placeholder="服务器升级维护中，预计..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>白名单 IP (逗号分隔)</Label>
                            <Input 
                                value={config.whitelistIps.join(', ')}
                                onChange={e => setConfig({ ...config, whitelistIps: e.target.value.split(',').map(s => s.trim()) })}
                                placeholder="127.0.0.1, 192.168.1.1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>白名单用户ID (逗号分隔)</Label>
                            <Input 
                                value={config.whitelistUsers.join(', ')}
                                onChange={e => setConfig({ ...config, whitelistUsers: e.target.value.split(',').map(s => s.trim()) })}
                                placeholder="user_admin, user_test"
                            />
                        </div>
                        
                        <Button className="w-full" onClick={handleSave} disabled={loading}>
                            {loading ? "保存中..." : "保存设置"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
