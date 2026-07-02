import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getLocaleFromPathname,
  getLocaleRedirectPathname,
  isSupportedLocale,
  localizedPath,
  switchLocalePath,
} from './routing'

describe('i18n routing', () => {
  it('defines Chinese as the default locale and supports English', () => {
    expect(DEFAULT_LOCALE).toBe('zh-CN')
    expect(SUPPORTED_LOCALES).toEqual(['zh-CN', 'en-US'])
    expect(isSupportedLocale('zh-CN')).toBe(true)
    expect(isSupportedLocale('en-US')).toBe(true)
    expect(isSupportedLocale('ja-JP')).toBe(false)
  })

  it('extracts locale from localized pathnames', () => {
    expect(getLocaleFromPathname('/zh-CN')).toBe('zh-CN')
    expect(getLocaleFromPathname('/en-US/sources')).toBe('en-US')
    expect(getLocaleFromPathname('/sources')).toBeNull()
  })

  it('builds localized internal paths', () => {
    expect(localizedPath('zh-CN', '/')).toBe('/zh-CN')
    expect(localizedPath('zh-CN', '/sources')).toBe('/zh-CN/sources')
    expect(localizedPath('en-US', '/ai-settings')).toBe('/en-US/ai-settings')
  })

  it('switches locale while preserving the current page path', () => {
    expect(switchLocalePath('/zh-CN/sources', 'en-US')).toBe('/en-US/sources')
    expect(switchLocalePath('/en-US/ai-usage', 'zh-CN')).toBe('/zh-CN/ai-usage')
    expect(switchLocalePath('/sources', 'en-US')).toBe('/en-US/sources')
  })

  it('redirects non-localized pages to the default Chinese locale', () => {
    expect(getLocaleRedirectPathname('/')).toBe('/zh-CN')
    expect(getLocaleRedirectPathname('/sources')).toBe('/zh-CN/sources')
    expect(getLocaleRedirectPathname('/zh-CN/sources')).toBeNull()
    expect(getLocaleRedirectPathname('/en-US/sources')).toBeNull()
    expect(getLocaleRedirectPathname('/api/news')).toBeNull()
    expect(getLocaleRedirectPathname('/_next/static/chunk.js')).toBeNull()
  })
})
