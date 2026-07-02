'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { Dictionary } from './dictionaries'
import type { Locale } from './routing'

interface I18nContextValue {
  dictionary: Dictionary
  formatMessage: (message: string, values?: Record<string, string | number>) => string
  locale: Locale
  t: Dictionary
}

const I18nContext = createContext<I18nContextValue | null>(null)

interface I18nProviderProps {
  children: ReactNode
  dictionary: Dictionary
  locale: Locale
}

export function I18nProvider({ children, dictionary, locale }: I18nProviderProps) {
  const value: I18nContextValue = {
    dictionary,
    formatMessage,
    locale,
    t: dictionary,
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }

  return context
}

function formatMessage(message: string, values: Record<string, string | number> = {}): string {
  return Object.entries(values).reduce(
    (nextMessage, [key, value]) => nextMessage.replaceAll(`{${key}}`, String(value)),
    message,
  )
}
