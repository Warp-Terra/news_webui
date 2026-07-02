import { describe, expect, it } from 'vitest'

import { formatCompactDateTime, formatCurrencyUsd, formatFullDateTime } from './format'

describe('i18n format helpers', () => {
  it('formats compact date time with the selected locale', () => {
    const value = '2026-04-23T14:30:00.000Z'

    expect(formatCompactDateTime(value, 'zh-CN')).toMatch(/04/)
    expect(formatCompactDateTime(value, 'en-US')).toMatch(/04|4/)
  })

  it('formats full date time with year and time', () => {
    const value = '2026-04-23T14:30:00.000Z'

    expect(formatFullDateTime(value, 'zh-CN')).toContain('2026')
    expect(formatFullDateTime(value, 'en-US')).toContain('2026')
  })

  it('formats USD cost according to locale', () => {
    expect(formatCurrencyUsd(12.5, 'zh-CN')).toContain('US$')
    expect(formatCurrencyUsd(12.5, 'en-US')).toContain('$')
  })
})
