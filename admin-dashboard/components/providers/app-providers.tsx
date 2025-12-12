'use client'

import { ReactNode } from 'react'
import { ApiErrorListener } from '@/components/providers/api-error-listener'
import { GlobalToaster } from '@/components/ui/global-toaster'
import { I18nProvider } from '@/components/providers/i18n-provider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ApiErrorListener />
      {children}
      <GlobalToaster />
    </I18nProvider>
  )
}
