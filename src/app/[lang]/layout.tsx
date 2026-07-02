import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'

import { getDictionary } from '@/app/i18n/dictionaries'
import { I18nProvider } from '@/app/i18n/I18nProvider'
import { SUPPORTED_LOCALES, isSupportedLocale, type Locale } from '@/app/i18n/routing'
import '../globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const locale = isSupportedLocale(lang) ? lang : 'zh-CN'
  const dictionary = getDictionary(locale)

  return {
    title: dictionary.header.title,
    description:
      locale === 'zh-CN'
        ? '用于全球新闻监控的实时情报看板。'
        : 'A real-time intelligence dashboard for global news monitoring.',
  }
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ lang: string }>
}>) {
  const { lang } = await params

  if (!isSupportedLocale(lang)) {
    notFound()
  }

  const locale: Locale = lang
  const dictionary = getDictionary(locale)

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider locale={locale} dictionary={dictionary}>
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
