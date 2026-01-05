'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'

export default function PaySuccessPage() {
  const search = useSearchParams()
  const router = useRouter()
  const sessionId = search.get('sessionId') || search.get('session_id')
  const orderId = search.get('orderId') || search.get('order_id') || ''
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const returnToUrl = useMemo(() => buildReturnUrl(sessionId || '', orderId || ''), [sessionId, orderId])

  useEffect(() => {
    async function confirm() {
      if (!sessionId) {
        setMsg('缺少 sessionId')
        return
      }
      setLoading(true)
      try {
        const res = await fetch('/api/ConfirmStripePayment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, orderId })
        }).then(r => r.json())

        if (res.isSucc && res.res?.success) {
          setMsg('支付成功，奖励已发放，正在返回游戏…')
        } else {
          setMsg(res.res?.error || res.err?.message || '确认失败，已为你跳转回游戏')
        }
      } catch (e: any) {
        setMsg(e?.message || '网络错误')
      } finally {
        setLoading(false)
      }
    }
    confirm()
  }, [sessionId, orderId])

    // 无论确认是否成功，都在 1.2s 后跳回游戏
    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && window.opener) {
          window.opener.postMessage({ type: 'stripe-success', sessionId, orderId }, '*')
        }
      } catch {/* ignore */}
      if (typeof window !== 'undefined') {
        window.location.replace(returnToUrl)
      }
    }, 1200)
    return () => clearTimeout(timer)
  }, [sessionId, orderId, returnToUrl])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white text-center px-4">
      <h1 className="text-2xl font-bold mb-4">支付成功</h1>
      <p className="text-gray-600 mb-6">{msg || '确认中，请稍候...'}</p>
      <div className="flex gap-3">
        <Button onClick={() => router.push('/')}>返回首页</Button>
        <Button variant="outline" onClick={() => window.location.replace(returnToUrl)}>回到游戏</Button>
      </div>
      {loading && <p className="text-xs text-gray-400 mt-3">正在同步订单状态...</p>}
    </div>
  )
}

function buildReturnUrl(sessionId: string, orderId?: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:7457'
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const returnTo = searchParams.get('returnTo') || `${origin}/`

  const url = new URL(returnTo, origin);
  if (sessionId) url.searchParams.set('sessionId', sessionId)
  if (orderId) url.searchParams.set('orderId', orderId)
  url.searchParams.set('stripe-success', '1')
  return url.toString()
}
