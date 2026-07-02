export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'zh-CN'

export const LOCALE_LABELS: Record<Locale, string> = {
  'zh-CN': '中文',
  'en-US': 'English',
}

const PUBLIC_FILE_PATTERN = /\.[^/]+$/

export function isSupportedLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale)
}

export function getLocaleFromPathname(pathname: string): Locale | null {
  const localeSegment = pathname.split('/')[1]

  return localeSegment && isSupportedLocale(localeSegment) ? localeSegment : null
}

export function localizedPath(locale: Locale, href: string): string {
  const normalizedHref = href.startsWith('/') ? href : `/${href}`

  return normalizedHref === '/' ? `/${locale}` : `/${locale}${normalizedHref}`
}

export function switchLocalePath(pathname: string, nextLocale: Locale): string {
  const segments = pathname.split('/')
  const currentLocale = segments[1]

  if (currentLocale && isSupportedLocale(currentLocale)) {
    segments[1] = nextLocale
    return segments.join('/') || `/${nextLocale}`
  }

  return localizedPath(nextLocale, pathname)
}

export function getLocaleRedirectPathname(pathname: string): string | null {
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    PUBLIC_FILE_PATTERN.test(pathname) ||
    getLocaleFromPathname(pathname)
  ) {
    return null
  }

  return localizedPath(DEFAULT_LOCALE, pathname)
}
