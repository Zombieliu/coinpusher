'use client'

import { useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from '@/components/providers/i18n-provider'

const EVENT_NAME = 'oops-api-error'

interface ApiErrorDetail {
  method: string
  message: string
}

export function ApiErrorListener() {
  const { toast } = useToast()
  const { t } = useTranslation('api')
  const { t: tCommon } = useTranslation('common')

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ApiErrorDetail>).detail
      if (!detail) return
      const fallbackMap: Record<string, string> = {
        '接口返回错误': t('unknown'),
        '网络错误': tCommon('networkError'),
      }
      const description = fallbackMap[detail.message] || detail.message || t('unknown')
      toast({
        title: t('errorTitle'),
        description: `[${detail.method}] ${description}`,
        variant: 'destructive',
      })
    }

    window.addEventListener(EVENT_NAME, handler as EventListener)
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener)
  }, [toast])

  return null
}
