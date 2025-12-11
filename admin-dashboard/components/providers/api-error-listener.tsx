'use client'

import { useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'

const EVENT_NAME = 'oops-api-error'

interface ApiErrorDetail {
  method: string
  message: string
}

export function ApiErrorListener() {
  const { toast } = useToast()

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ApiErrorDetail>).detail
      if (!detail) return
      toast({
        title: '接口调用失败',
        description: `[${detail.method}] ${detail.message || '未知错误'}`,
        variant: 'destructive',
      })
    }

    window.addEventListener(EVENT_NAME, handler as EventListener)
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener)
  }, [toast])

  return null
}
