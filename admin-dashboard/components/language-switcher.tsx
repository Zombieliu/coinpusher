'use client'

import { useTranslation } from '@/components/providers/i18n-provider'
import { getSupportedLocales } from '@/lib/i18n'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation('common')
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span className="hidden sm:inline">{t('language')}</span>
      <select
        aria-label={t('language')}
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {getSupportedLocales().map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
