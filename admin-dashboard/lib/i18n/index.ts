import en from './messages/en'
import zh, { type Messages } from './messages/zh'

export type Locale = 'zh' | 'en'
export type TranslationValues = Record<string, string | number>

export const defaultLocale: Locale = 'zh'

const dictionaries: Record<Locale, Messages> = {
  zh,
  en,
}

function resolveMessage(messages: Messages, key: string): string | undefined {
  return key.split('.').reduce<any>((obj, segment) => {
    if (obj && typeof obj === 'object') {
      return obj[segment]
    }
    return undefined
  }, messages)
}

export function getMessage(locale: Locale, key: string): string {
  const messages = dictionaries[locale] ?? dictionaries[defaultLocale]
  const result = resolveMessage(messages, key)
  if (typeof result === 'string') {
    return result
  }
  return key
}

export function formatMessage(template: string, values?: TranslationValues) {
  if (!values) {
    return template
  }
  return template.replace(/\{(\w+)\}/g, (_, token) => {
    const value = values[token]
    return value === undefined || value === null ? '' : String(value)
  })
}

export function getSupportedLocales(): Array<{ value: Locale; label: string }> {
  return [
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'English' },
  ]
}
