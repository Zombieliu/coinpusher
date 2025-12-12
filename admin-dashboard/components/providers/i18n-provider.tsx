'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  defaultLocale,
  formatMessage,
  getMessage,
  getSupportedLocales,
  type Locale,
  type TranslationValues,
} from '@/lib/i18n'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  translate: (key: string, values?: TranslationValues) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
  translate: (key) => key,
})

const STORAGE_KEY = 'oops_admin_locale'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored && getSupportedLocales().some((item) => item.value === stored)) {
      setLocaleState(stored)
      document.documentElement.lang = stored === 'zh' ? 'zh-CN' : 'en'
    } else {
      document.documentElement.lang = defaultLocale === 'zh' ? 'zh-CN' : 'en'
    }
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en'
    }
  }, [])

  const translate = useCallback(
    (key: string, values?: TranslationValues) => {
      const raw = getMessage(locale, key)
      return formatMessage(raw, values)
    },
    [locale]
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      translate,
    }),
    [locale, setLocale, translate]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}

export function useTranslation(prefix?: string) {
  const { translate, ...rest } = useI18n()
  const t = useCallback(
    (key: string, values?: TranslationValues) =>
      translate(prefix ? `${prefix}.${key}` : key, values),
    [prefix, translate]
  )

  return {
    t,
    ...rest,
  }
}
