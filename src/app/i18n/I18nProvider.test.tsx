import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getDictionary } from './dictionaries'
import { I18nProvider, useI18n } from './I18nProvider'

function Probe() {
  const { formatMessage, locale, t } = useI18n()

  return (
    <div>
      <p>{locale}</p>
      <p>{t.header.title}</p>
      <p>{formatMessage(t.dashboard.rssRefreshSuccess, { fetched: 3 })}</p>
    </div>
  )
}

describe('I18nProvider', () => {
  it('provides locale, dictionary, and interpolation helpers', () => {
    render(
      <I18nProvider locale="zh-CN" dictionary={getDictionary('zh-CN')}>
        <Probe />
      </I18nProvider>,
    )

    expect(screen.getByText('zh-CN')).toBeInTheDocument()
    expect(screen.getByText('全球新闻情报看板')).toBeInTheDocument()
    expect(screen.getByText('RSS 刷新完成，新增 3 条新闻。')).toBeInTheDocument()
  })

  it('throws a clear error when used outside provider', () => {
    expect(() => render(<Probe />)).toThrow('useI18n must be used within I18nProvider')
  })
})
