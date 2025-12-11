'use client'

import { useToast } from '@/components/ui/use-toast'
import { X } from 'lucide-react'

export function GlobalToaster() {
  const { toasts, dismiss } = useToast()

  if (!toasts.length) {
    return null
  }

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast: any) => (
        <div
          key={toast.id}
          className="pointer-events-auto rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
              {toast.description && (
                <p className="text-sm text-gray-600">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
