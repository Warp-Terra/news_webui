'use client'

import { startTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useI18n } from '@/app/i18n/I18nProvider'
import { LOCALE_LABELS, SUPPORTED_LOCALES, switchLocalePath, type Locale } from '@/app/i18n/routing'

export function LanguageSwitcher() {
  const pathname = usePathname()
  const router = useRouter()
  const { locale, t } = useI18n()

  const handleChange = (nextLocale: Locale) => {
    if (nextLocale === locale) {
      return
    }

    startTransition(() => {
      router.replace(switchLocalePath(pathname, nextLocale))
    })
  }

  return (
    <label className="sr-only">
      {t.header.languageLabel}
      <select
        aria-label={t.header.languageLabel}
        className="h-9 rounded-md border bg-background px-2 text-sm"
        value={locale}
        onChange={(event) => handleChange(event.target.value as Locale)}
      >
        {SUPPORTED_LOCALES.map((supportedLocale) => (
          <option key={supportedLocale} value={supportedLocale}>
            {LOCALE_LABELS[supportedLocale]}
          </option>
        ))}
      </select>
    </label>
  )
}
