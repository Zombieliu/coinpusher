'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchReconcileFlags, resolveReconcileFlag } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/components/providers/i18n-provider'

interface Flag {
  _id: string
  intentId: string
  type: string
  orderId?: string
  stripeStatus?: string
  dbStatus?: string
  createdAt: number
  resolved?: boolean
  resolutionMessage?: string
}

export default function ReconcilePage() {
  const { t } = useTranslation('finance')
  const [flags, setFlags] = useState<Flag[]>([])
  const [showResolved, setShowResolved] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetchReconcileFlags({ page: 1, limit: 50, resolved: showResolved ? undefined : false })
    if (res.isSucc && res.res?.flags) {
      setFlags(res.res.flags as Flag[])
    }
    setLoading(false)
  }, [showResolved])

  useEffect(() => {
    load()
  }, [load])

  async function handle(action: 'confirm' | 'close', flag: Flag) {
    const note = action === 'close' ? '手动关闭' : '补单'
    const res = await resolveReconcileFlag({ flagId: flag._id, action, note })
    if (res.isSucc && res.res?.success) {
      await load()
    } else {
      alert(res.res?.error || '操作失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Stripe 对账异常</h1>
        <div className="flex gap-2 items-center">
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> 显示已处理
          </label>
          <Button variant="outline" onClick={load} disabled={loading}>{loading ? '加载中...' : '刷新'}</Button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow divide-y">
        <div className="grid grid-cols-6 text-xs font-semibold text-gray-600 px-4 py-2">
          <span>Intent</span><span>类型</span><span>订单</span><span>Stripe状态</span><span>本地状态</span><span>操作</span>
        </div>
        {flags.length === 0 && <div className="p-4 text-sm text-gray-500">暂无异常</div>}
        {flags.map(f => (
          <div key={f._id} className="grid grid-cols-6 items-center px-4 py-2 text-sm">
            <div className="truncate" title={f.intentId}>{f.intentId}</div>
            <div>{f.type}</div>
            <div>{f.orderId || '-'}</div>
            <div>{f.stripeStatus || '-'}</div>
            <div>{f.dbStatus || '-'}</div>
            <div className="flex gap-2">
              {!f.resolved && <Button size="sm" onClick={() => handle('confirm', f)}>补单</Button>}
              {!f.resolved && <Button size="sm" variant="outline" onClick={() => handle('close', f)}>关闭</Button>}
              {f.resolved && <span className="text-green-600 text-xs">已处理</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
