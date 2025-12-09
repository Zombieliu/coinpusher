'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { fetchAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/lib/api'
import { Plus, Megaphone, Calendar, Trash2, Edit, Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'

export default function AnnouncementsPage() {
    const { toast } = useToast()
    const [announcements, setAnnouncements] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<any>(null)
    const [formData, setFormData] = useState<any>({
        type: 'notice',
        title: '',
        content: '',
        startTime: '',
        endTime: '',
        priority: 0,
        platforms: []
    })

    const loadData = async () => {
        setLoading(true)
        try {
            const res = await fetchAnnouncements({ limit: 50 })
            if (res.isSucc && res.res) {
                setAnnouncements(res.res.list || [])
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleCreate = () => {
        setEditingItem(null)
        setFormData({
            type: 'notice',
            title: '',
            content: '',
            startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            endTime: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
            priority: 0,
            platforms: []
        })
        setDialogOpen(true)
    }

    const handleEdit = (item: any) => {
        setEditingItem(item)
        setFormData({
            type: item.type,
            title: item.title,
            content: item.content,
            startTime: format(item.startTime, "yyyy-MM-dd'T'HH:mm"),
            endTime: format(item.endTime, "yyyy-MM-dd'T'HH:mm"),
            priority: item.priority,
            platforms: item.platforms || []
        })
        setDialogOpen(true)
    }

    const handleSubmit = async () => {
        if (!formData.title || !formData.content) {
            toast({ title: "请填写标题和内容", variant: "destructive" })
            return
        }

        const start = new Date(formData.startTime).getTime()
        const end = new Date(formData.endTime).getTime()

        try {
            if (editingItem) {
                const res = await updateAnnouncement(editingItem.announcementId, {
                    ...formData,
                    startTime: start,
                    endTime: end
                })
                if (res.isSucc) {
                    toast({ title: "更新成功" })
                    setDialogOpen(false)
                    loadData()
                } else {
                    toast({ title: "操作失败", description: res.err?.message, variant: "destructive" })
                }
            } else {
                const res = await createAnnouncement({
                    ...formData,
                    startTime: start,
                    endTime: end
                })
                if (res.isSucc) {
                    toast({ title: "创建成功" })
                    setDialogOpen(false)
                    loadData()
                } else {
                    toast({ title: "操作失败", description: res.err?.message, variant: "destructive" })
                }
            }
        } catch (error) {
            toast({ title: "操作异常", variant: "destructive" })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("确定要删除这条公告吗？")) return
        try {
            const res = await deleteAnnouncement(id)
            if (res.isSucc) {
                toast({ title: "删除成功" })
                loadData()
            }
        } catch (error) {
            toast({ title: "操作异常", variant: "destructive" })
        }
    }

    const toggleActive = async (item: any) => {
        try {
            const res = await updateAnnouncement(item.announcementId, {
                active: !item.active
            })
            if (res.isSucc) {
                toast({ title: item.active ? "已下架" : "已上架" })
                loadData()
            }
        } catch (error) {
            toast({ title: "操作异常", variant: "destructive" })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">公告管理</h1>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    发布公告
                </Button>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? '编辑公告' : '发布新公告'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>公告类型</Label>
                                <Select 
                                    value={formData.type} 
                                    onValueChange={v => setFormData({...formData, type: v})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="notice">强弹窗公告</SelectItem>
                                        <SelectItem value="scroll">跑马灯公告</SelectItem>
                                        <SelectItem value="activity">活动公告</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>优先级 (越大越前)</Label>
                                <Input 
                                    type="number" 
                                    value={formData.priority}
                                    onChange={e => setFormData({...formData, priority: parseInt(e.target.value)})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>标题</Label>
                            <Input 
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>内容</Label>
                            <Textarea 
                                className="h-[150px]"
                                value={formData.content}
                                onChange={e => setFormData({...formData, content: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>开始时间</Label>
                                <Input 
                                    type="datetime-local" 
                                    value={formData.startTime}
                                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>结束时间</Label>
                                <Input 
                                    type="datetime-local" 
                                    value={formData.endTime}
                                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                        <Button onClick={handleSubmit}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid gap-4">
                {announcements.map((item) => (
                    <Card key={item.announcementId} className={!item.active ? "opacity-60" : ""}>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={getTypeVariant(item.type)}>{getTypeLabel(item.type)}</Badge>
                                        <h3 className="font-semibold text-lg">{item.title}</h3>
                                        {!item.active && <Badge variant="outline">已下架</Badge>}
                                        {isActive(item) && item.active && <Badge variant="default" className="bg-green-600">生效中</Badge>}
                                    </div>
                                    <p className="text-gray-500 text-sm whitespace-pre-wrap line-clamp-2">
                                        {item.content}
                                    </p>
                                    <div className="flex gap-4 text-xs text-gray-400 pt-2">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(item.startTime, 'MM-dd HH:mm')} ~ {format(item.endTime, 'MM-dd HH:mm')}
                                        </span>
                                        <span>优先级: {item.priority}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="icon" variant="ghost" onClick={() => toggleActive(item)}>
                                        {item.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(item.announcementId)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {announcements.length === 0 && (
                    <div className="text-center py-10 text-gray-500">暂无公告</div>
                )}
            </div>
        </div>
    )
}

function getTypeVariant(type: string) {
    switch (type) {
        case 'notice': return 'destructive'
        case 'scroll': return 'secondary'
        case 'activity': return 'default'
        default: return 'outline'
    }
}

function getTypeLabel(type: string) {
    switch (type) {
        case 'notice': return '强弹窗'
        case 'scroll': return '跑马灯'
        case 'activity': return '活动'
        default: return type
    }
}

function isActive(item: any) {
    const now = Date.now()
    return now >= item.startTime && now <= item.endTime
}
