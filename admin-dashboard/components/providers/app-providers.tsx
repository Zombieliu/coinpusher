'use client'

import { ReactNode } from 'react'
import { ApiErrorListener } from '@/components/providers/api-error-listener'
import { GlobalToaster } from '@/components/ui/global-toaster'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <ApiErrorListener />
      {children}
      <GlobalToaster />
    </>
  )
}
