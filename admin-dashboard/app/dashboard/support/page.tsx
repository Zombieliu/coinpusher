'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { fetchTickets, replyTicket } from '@/lib/api'
import { MessageSquare, CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

export default function SupportPage() {
    const { toast } = useToast()
    const [tickets, setTickets] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [replyOpen, setReplyOpen] = useState(false)
    const [selectedTicket, setSelectedTicket] = useState<any>(null)
    const [replyContent, setReplyContent] = useState('')

    const loadData = async () => {
        setLoading(true)
        try {
            const res = await fetchTickets({ limit: 50 })
            if (res.isSucc && res.res) {
                setTickets(res.res.tickets || [])
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

    const handleReply = async () => {
        if (!replyContent) return
        try {
            const res = await replyTicket({
                ticketId: selectedTicket.ticketId,
                content: replyContent,
                closeTicket: true // 默认回复即关闭，实际可加选项
            })
            if (res.isSucc) {
                toast({ title: "回复成功" })
                setReplyOpen(false)
                setReplyContent('')
                loadData()
            }
        } catch (e) {
            toast({ title: "操作失败", variant: "destructive" })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">客服工单</h1>
                <Button variant="outline" onClick={loadData}>刷新</Button>
            </div>

            <div className="grid gap-4">
                {tickets.length === 0 ? (
                    <Card><CardContent className="p-8 text-center text-gray-500">暂无工单</CardContent></Card>
                ) : (
                    tickets.map((ticket) => (
                        <Card key={ticket.ticketId} className="hover:bg-gray-50 cursor-pointer" onClick={() => {
                            setSelectedTicket(ticket)
                            setReplyOpen(true)
                        }}>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={ticket.status === 'open' ? 'destructive' : 'secondary'}>
                                                {ticket.status === 'open' ? '待处理' : '已关闭'}
                                            </Badge>
                                            <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                                        </div>
                                        <p className="text-sm text-gray-500">用户: {ticket.userId}</p>
                                        <p className="text-sm mt-2">{ticket.messages[0]?.content}</p>
                                    </div>
                                    <div className="text-right text-xs text-gray-400">
                                        {format(ticket.createdAt, 'yyyy-MM-dd HH:mm')}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>回复工单</DialogTitle>
                    </DialogHeader>
                    {selectedTicket && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2 max-h-[300px] overflow-y-auto">
                                {selectedTicket.messages.map((msg: any, i: number) => (
                                    <div key={i} className={`flex flex-col ${msg.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                                        <span className="text-xs text-gray-400">{msg.senderName}</span>
                                        <div className={`p-2 rounded-lg ${msg.sender === 'admin' ? 'bg-blue-100' : 'bg-white border'}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Textarea 
                                placeholder="输入回复内容..." 
                                value={replyContent}
                                onChange={e => setReplyContent(e.target.value)}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={handleReply}>回复并关闭</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
