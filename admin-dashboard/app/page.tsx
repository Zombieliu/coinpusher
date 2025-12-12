'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTranslation } from '@/components/providers/i18n-provider'

export default function Home() {
  const router = useRouter()
  const { t } = useTranslation('root')

  useEffect(() => {
    router.push('/dashboard')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t('redirecting')}</h1>
      </div>
    </div>
  )
}
