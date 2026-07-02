import { NextResponse, type NextRequest } from 'next/server'

import { getLocaleRedirectPathname } from '@/app/i18n/routing'

export function proxy(request: NextRequest) {
  const redirectPathname = getLocaleRedirectPathname(request.nextUrl.pathname)

  if (!redirectPathname) {
    return undefined
  }

  request.nextUrl.pathname = redirectPathname

  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
