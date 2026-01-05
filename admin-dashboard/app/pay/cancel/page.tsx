'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function PayCancelPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white text-center px-4">
      <h1 className="text-2xl font-bold mb-3">已取消支付</h1>
      <p className="text-gray-600 mb-6">如果是误操作，可返回游戏重新发起支付。</p>
      <div className="flex gap-3">
        <Button onClick={() => router.push('/')}>返回首页</Button>
        <Button variant="outline" onClick={() => window.history.back()}>回到游戏</Button>
      </div>
    </div>
  )
}
