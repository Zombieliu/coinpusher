'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { fetchSystemConfig, setMaintenance } from '@/lib/api'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from '@/components/providers/i18n-provider'

export default function MaintenancePage() {
    const { toast } = useToast()
    const { t } = useTranslation('maintenance')
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
                toast({ title: t('toast.saved') })
            } else {
                toast({ title: t('toast.saveFailed'), variant: "destructive" })
            }
        } catch (e) {
            toast({ title: t('toast.error'), variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            
            <div className="grid gap-6 max-w-2xl">
                <Card className={config.enabled ? "border-red-500 bg-red-50" : ""}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className={config.enabled ? "text-red-600" : "text-gray-400"} />
                            {t('toggle.title')}
                        </CardTitle>
                        <CardDescription>
                            {t('toggle.description')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <span className="font-medium">
                            {t('toggle.status', {
                                status: config.enabled ? t('toggle.on') : t('toggle.off')
                            })}
                        </span>
                        <Button 
                            variant={config.enabled ? "destructive" : "default"}
                            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                        >
                            {config.enabled ? t('toggle.disable') : t('toggle.enable')}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings.title')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('settings.noticeLabel')}</Label>
                            <Textarea 
                                value={config.reason}
                                onChange={e => setConfig({ ...config, reason: e.target.value })}
                                placeholder={t('settings.noticePlaceholder')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('settings.ipLabel')}</Label>
                            <Input 
                                value={config.whitelistIps.join(', ')}
                                onChange={e => setConfig({ ...config, whitelistIps: e.target.value.split(',').map(s => s.trim()) })}
                                placeholder={t('settings.ipPlaceholder')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('settings.userLabel')}</Label>
                            <Input 
                                value={config.whitelistUsers.join(', ')}
                                onChange={e => setConfig({ ...config, whitelistUsers: e.target.value.split(',').map(s => s.trim()) })}
                                placeholder={t('settings.userPlaceholder')}
                            />
                        </div>
                        
                        <Button className="w-full" onClick={handleSave} disabled={loading}>
                            {loading ? t('settings.saving') : t('settings.save')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
