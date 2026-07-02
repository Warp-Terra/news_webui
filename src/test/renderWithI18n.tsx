import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

import { getDictionary } from '@/app/i18n/dictionaries'
import { I18nProvider } from '@/app/i18n/I18nProvider'
import type { Locale } from '@/app/i18n/routing'

interface RenderWithI18nOptions extends Omit<RenderOptions, 'wrapper'> {
  locale?: Locale
}

export function renderWithI18n(ui: ReactElement, options: RenderWithI18nOptions = {}) {
  const locale = options.locale ?? 'zh-CN'

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nProvider locale={locale} dictionary={getDictionary(locale)}>
        {children}
      </I18nProvider>
    )
  }

  return render(ui, { ...options, wrapper: Wrapper })
}
