# I18N 国际化第一版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Dashboard 增加第一版国际化能力，支持默认中文 `zh-CN` 和英文 `en-US` 两种系统 UI 语言。

**Architecture:** 使用 Next.js 16 App Router 官方推荐的 `app/[lang]` 子路径路由，`/` 默认重定向到 `/zh-CN`。API 路由继续保留在 `/api/...`，不进入语言前缀；系统 UI 文案通过本地字典和客户端 I18N Provider 注入，新闻标题、RSS 摘要、AI 生成日报正文不在本迭代自动翻译。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Zustand、Vitest、Testing Library、原生 `Intl` 日期和货币格式化。

---

## 文件结构

- 新增：`src/app/i18n/routing.ts`
- 新增：`src/app/i18n/routing.test.ts`
- 新增：`src/app/i18n/dictionaries.ts`
- 新增：`src/app/i18n/I18nProvider.tsx`
- 新增：`src/app/i18n/I18nProvider.test.tsx`
- 新增：`src/app/i18n/format.ts`
- 新增：`src/app/i18n/format.test.ts`
- 新增：`src/app/components/layout/LanguageSwitcher.tsx`
- 新增：`src/app/components/layout/LanguageSwitcher.test.tsx`
- 新增：`src/test/renderWithI18n.tsx`
- 新增：`src/proxy.ts`
- 移动：`src/app/layout.tsx` -> `src/app/[lang]/layout.tsx`
- 移动：`src/app/page.tsx` -> `src/app/[lang]/page.tsx`
- 移动：`src/app/daily-report/page.tsx` -> `src/app/[lang]/daily-report/page.tsx`
- 移动：`src/app/ai-usage/page.tsx` -> `src/app/[lang]/ai-usage/page.tsx`
- 移动：`src/app/ai-settings/page.tsx` -> `src/app/[lang]/ai-settings/page.tsx`
- 移动：`src/app/sources/page.tsx` -> `src/app/[lang]/sources/page.tsx`
- 移动对应页面测试到同级 `[lang]` 目录，或更新 import 到新路径。
- 修改：`src/app/components/layout/Header.tsx`
- 修改：`src/app/components/layout/Sidebar.tsx`
- 修改：`src/app/components/news/NewsList.tsx`
- 修改：`src/app/components/news/NewsCard.tsx`
- 修改：`src/app/components/news/NewsDetail.tsx`
- 修改：相关组件和页面测试。

职责划分：

- `routing.ts` 只负责语言常量、路径生成、路径切换和默认语言重定向判断。
- `dictionaries.ts` 只保存 `zh-CN` 和 `en-US` 两套纯对象字典，不包含函数，保证可以从 Server Component 传给 Client Component。
- `I18nProvider.tsx` 是客户端 Context，提供 `locale`、`t` 和字符串插值函数 `formatMessage()`。
- `format.ts` 封装日期、时间、美元金额格式化，避免组件里硬编码 `zh-CN`。
- `LanguageSwitcher.tsx` 只负责当前路径下切换语言，并保持当前页面路径。
- `[lang]/layout.tsx` 校验 locale、设置 `<html lang>`、加载字典、包裹 `ThemeProvider` 和 `I18nProvider`。

## 任务 1：添加语言路由核心失败测试

**文件：**

- 新增：`src/app/i18n/routing.test.ts`
- 后续新增：`src/app/i18n/routing.ts`

- [ ] **步骤 1：编写 `routing.test.ts`**

创建 `src/app/i18n/routing.test.ts`，内容如下：

```ts
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
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
npm test -- --run src/app/i18n/routing.test.ts
```

预期：失败，原因是 `src/app/i18n/routing.ts` 尚不存在。

## 任务 2：实现语言路由核心和默认重定向

**文件：**

- 新增：`src/app/i18n/routing.ts`
- 新增：`src/proxy.ts`
- 测试：`src/app/i18n/routing.test.ts`

- [ ] **步骤 1：创建 `src/app/i18n/routing.ts`**

创建文件，内容如下：

```ts
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
```

- [ ] **步骤 2：创建 `src/proxy.ts`**

创建文件，内容如下：

```ts
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
```

- [ ] **步骤 3：运行语言路由测试确认通过**

运行：

```bash
npm test -- --run src/app/i18n/routing.test.ts
```

预期：`routing.test.ts` 全部通过。

- [ ] **步骤 4：提交语言路由核心**

运行：

```bash
git add src/app/i18n/routing.ts src/app/i18n/routing.test.ts src/proxy.ts
git commit -m "添加国际化路由基础"
```

## 任务 3：添加字典、I18N Provider 和测试工具

**文件：**

- 新增：`src/app/i18n/dictionaries.ts`
- 新增：`src/app/i18n/I18nProvider.tsx`
- 新增：`src/app/i18n/I18nProvider.test.tsx`
- 新增：`src/test/renderWithI18n.tsx`
- 测试：`src/app/i18n/I18nProvider.test.tsx`

- [ ] **步骤 1：编写 Provider 失败测试**

创建 `src/app/i18n/I18nProvider.test.tsx`，内容如下：

```tsx
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
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
npm test -- --run src/app/i18n/I18nProvider.test.tsx
```

预期：失败，原因是 `dictionaries.ts` 和 `I18nProvider.tsx` 尚不存在。

- [ ] **步骤 3：创建 `src/app/i18n/dictionaries.ts`**

创建文件，内容如下。第一版字典必须覆盖 Dashboard、新闻详情、日报、AI 用量、AI 配置、数据源管理这几组 UI 文案。

```ts
import type { Category, ImportanceLevel, Region } from '@/app/types/news'
import type { Locale } from './routing'

const zhCN = {
  common: {
    dashboard: 'Dashboard',
    backToDashboard: '返回 Dashboard',
    loading: '加载中...',
    save: '保存',
    saving: '保存中...',
    cancel: '取消',
    edit: '编辑',
    delete: '删除',
    add: '新增',
    refresh: '刷新',
    configured: '已配置',
    notConfigured: '未配置',
    active: '启用',
    inactive: '停用',
    enabled: '启用',
    disabled: '停用',
  },
  enums: {
    regions: {
      US: '美国',
      CN: '中国',
      EU: '欧盟',
      JP: '日本',
      Global: '全球',
    } satisfies Record<Region, string>,
    categories: {
      Economy: '经济',
      Technology: '科技',
      Politics: '政治',
      Military: '军事',
      Energy: '能源',
    } satisfies Record<Category, string>,
    importance: {
      low: '低',
      medium: '中',
      high: '高',
      critical: '关键',
    } satisfies Record<ImportanceLevel, string>,
  },
  header: {
    title: '全球新闻情报看板',
    subtitle: '多地区监控 · 来源情报 · 影响简报',
    searchPlaceholder: '搜索标题、摘要或来源...',
    searchLabel: '搜索新闻',
    openMobileFilters: '打开移动端筛选面板',
    collapseSidebar: '收起筛选栏',
    expandSidebar: '展开筛选栏',
    toggleTheme: '切换深色或浅色模式',
    languageLabel: '界面语言',
  },
  dashboard: {
    refreshRss: '刷新 RSS',
    refreshingRss: '刷新中...',
    rssRefreshSuccess: 'RSS 刷新完成，新增 {fetched} 条新闻。',
    rssRefreshPartial: 'RSS 刷新完成，新增 {fetched} 条新闻，{errors} 个源失败。',
    mobileFiltersTitle: '移动端筛选面板',
    mobileFiltersDescription: '按地区、分类和重要程度筛选新闻。',
    newsDetailTitle: '新闻详情',
    newsDetailDescription: '当前选中新闻的完整情报详情。',
  },
  sidebar: {
    title: '筛选器',
    subtitle: '实时多维筛选',
    matchedResults: '匹配结果',
    totalSuffix: '条',
    clearFilters: '清除筛选',
    regionFilter: '地区筛选',
    categoryFilter: '分类筛选',
    importanceFilter: '重要程度',
    dailyReport: '日报',
    aiUsage: 'AI 用量',
    aiSettings: 'AI 配置',
    sources: '数据源管理',
  },
  newsList: {
    title: '情报流',
    count: '显示 {filtered} / {total} 条新闻',
    searchBadge: '搜索：{query}',
    emptyTitle: '没有找到匹配的新闻',
    emptyDescription: '请尝试调整搜索关键词、地区、分类或重要程度筛选条件。',
  },
  newsDetail: {
    emptyTitle: '请选择一条新闻查看详情',
    emptyDescription: '从中间情报列表中选择任意新闻，右侧将展示完整摘要、关键点和影响判断。',
    fullSummary: '完整摘要',
    aiSummary: 'AI 摘要',
    keyPoints: '关键点',
    impact: '影响判断',
    aiSummaryMissing: '当前新闻还没有 AI 生成的关键点和影响判断，可按需生成摘要。',
    generatingAiSummaryLabel: '正在生成 AI 摘要',
    generatingAiSummary: '生成中...',
    generateAiSummary: '生成 AI 摘要',
    sourceInfo: '来源信息',
    source: '来源',
    openSourceLink: '打开来源链接',
  },
  dailyReport: {
    title: 'AI 日报',
    description: '选择日期后生成当日 Global News Intelligence Markdown 日报。',
    markdownOutput: 'Markdown 输出',
    tokenStats: 'Token 统计',
    generateCardTitle: '生成日报',
    dateLabel: '日报日期',
    generating: '生成中...',
    generate: '生成日报',
    contentTitle: '日报内容',
    generatingStatus: '正在生成日报...',
    emptyContent: '生成后将在这里显示 Markdown 日报内容。',
    statsTitle: '生成统计',
    newsCount: '新闻数量',
    newsCountValue: '{count} 条',
    tokensIn: '输入 Token',
    tokensOut: '输出 Token',
    totalTokens: '总 Token',
    fallbackError: '生成日报失败',
  },
  aiUsage: {
    title: 'AI 用量',
    description: '查看 AI 摘要与日报生成的 Token 消耗、成本和调用明细。',
    defaultRange: '最近 7 天默认范围',
    usdCost: 'USD 成本',
    dateRange: '日期范围',
    startDate: '开始日期',
    endDate: '结束日期',
    refreshUsage: '刷新用量',
    totalTokens: '总 Token 数',
    totalCost: '总费用（USD）',
    callCount: '调用次数',
    records: '使用记录',
    date: '日期',
    model: '模型',
    operation: '操作类型',
    tokens: 'Token 数',
    cost: '费用',
    empty: '当前日期范围暂无 AI 用量记录。',
    fallbackError: '加载 AI 用量失败',
  },
  aiSettings: {
    title: 'AI 配置',
    description: '配置 Provider、API Key、Base URL 和模型参数。',
    connectionConfig: '模型连接配置',
    connectionDescription: '支持 OpenAI、DeepSeek、Anthropic、Gemini、Ollama 和任意 OpenAI 兼容端点。',
    loadingSettings: '正在加载 AI 配置...',
    provider: 'Provider',
    apiKey: 'API Key',
    baseUrl: 'Base URL',
    model: 'Model',
    temperature: 'Temperature',
    maxTokens: 'Max Tokens',
    requestTimeoutMs: '请求超时时间（毫秒）',
    saveSettings: '保存配置',
    savingSettings: '保存中...',
    testConnection: '测试连接',
    testingConnection: '测试中...',
    saved: 'AI 配置已保存',
    testSuccess: '连接成功：{model}',
    modelRequired: '请填写 Model',
    apiKeyRequired: '请填写 API Key',
    temperatureInvalid: 'Temperature 必须是数字',
    maxTokensInvalid: 'Max Tokens 必须是正整数',
    timeoutInvalid: '请求超时时间必须是正整数',
  },
  sources: {
    title: '数据源管理',
    description: '管理 RSS 数据源，维护地区、分类和启用状态。',
    totalSources: '总计 {count} 个源',
    activeSources: '启用 {count} 个源',
    addSource: '新增数据源',
    listTitle: 'RSS 数据源',
    listDescription: '配置后的 active 数据源会参与 RSS 抓取。',
    loadingSources: '正在加载数据源...',
    emptySources: '暂无数据源，请新增 RSS 源。',
    editSource: '编辑数据源',
    createSource: '新增数据源',
    dialogDescription: '填写 RSS 源名称、地址、地区和分类。',
    name: '名称',
    url: 'RSS URL',
    region: '地区',
    category: '分类',
    active: '启用',
    inactive: '停用',
    lastFetchedAt: '上次抓取',
    neverFetched: '从未抓取',
    saveSource: '保存数据源',
    savingSource: '保存中...',
    nameRequired: '请填写名称',
    urlRequired: '请填写 RSS URL',
    urlInvalid: '请输入合法 URL',
  },
} as const

const enUS: typeof zhCN = {
  common: {
    dashboard: 'Dashboard',
    backToDashboard: 'Back to Dashboard',
    loading: 'Loading...',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    add: 'Add',
    refresh: 'Refresh',
    configured: 'Configured',
    notConfigured: 'Not configured',
    active: 'Active',
    inactive: 'Inactive',
    enabled: 'Enabled',
    disabled: 'Disabled',
  },
  enums: {
    regions: {
      US: 'United States',
      CN: 'China',
      EU: 'European Union',
      JP: 'Japan',
      Global: 'Global',
    },
    categories: {
      Economy: 'Economy',
      Technology: 'Technology',
      Politics: 'Politics',
      Military: 'Military',
      Energy: 'Energy',
    },
    importance: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
    },
  },
  header: {
    title: 'Global News Intelligence Dashboard',
    subtitle: 'Multi-region monitoring · Source intelligence · Impact briefing',
    searchPlaceholder: 'Search title, summary, or source...',
    searchLabel: 'Search news',
    openMobileFilters: 'Open mobile filters',
    collapseSidebar: 'Collapse filters',
    expandSidebar: 'Expand filters',
    toggleTheme: 'Toggle dark or light mode',
    languageLabel: 'Interface language',
  },
  dashboard: {
    refreshRss: 'Refresh RSS',
    refreshingRss: 'Refreshing...',
    rssRefreshSuccess: 'RSS refresh complete. Added {fetched} news items.',
    rssRefreshPartial: 'RSS refresh complete. Added {fetched} news items. {errors} sources failed.',
    mobileFiltersTitle: 'Mobile filters',
    mobileFiltersDescription: 'Filter news by region, category, and importance.',
    newsDetailTitle: 'News detail',
    newsDetailDescription: 'Full intelligence detail for the selected news item.',
  },
  sidebar: {
    title: 'Filters',
    subtitle: 'Real-time multidimensional filtering',
    matchedResults: 'Matched results',
    totalSuffix: 'items',
    clearFilters: 'Clear filters',
    regionFilter: 'Region',
    categoryFilter: 'Category',
    importanceFilter: 'Importance',
    dailyReport: 'Daily Report',
    aiUsage: 'AI Usage',
    aiSettings: 'AI Settings',
    sources: 'Sources',
  },
  newsList: {
    title: 'Intelligence Feed',
    count: 'Showing {filtered} / {total} news items',
    searchBadge: 'Search: {query}',
    emptyTitle: 'No matching news found',
    emptyDescription: 'Try adjusting the search query, region, category, or importance filters.',
  },
  newsDetail: {
    emptyTitle: 'Select a news item to view details',
    emptyDescription: 'Select any item from the intelligence feed. The detail panel will show the full summary, key points, and impact assessment.',
    fullSummary: 'Full Summary',
    aiSummary: 'AI Summary',
    keyPoints: 'Key Points',
    impact: 'Impact Assessment',
    aiSummaryMissing: 'This news item does not have AI-generated key points and impact assessment yet. Generate them when needed.',
    generatingAiSummaryLabel: 'Generating AI summary',
    generatingAiSummary: 'Generating...',
    generateAiSummary: 'Generate AI Summary',
    sourceInfo: 'Source Information',
    source: 'Source',
    openSourceLink: 'Open source link',
  },
  dailyReport: {
    title: 'AI Daily Report',
    description: 'Select a date to generate the Global News Intelligence Markdown daily report.',
    markdownOutput: 'Markdown Output',
    tokenStats: 'Token Stats',
    generateCardTitle: 'Generate Daily Report',
    dateLabel: 'Report Date',
    generating: 'Generating...',
    generate: 'Generate Report',
    contentTitle: 'Report Content',
    generatingStatus: 'Generating daily report...',
    emptyContent: 'The Markdown daily report will appear here after generation.',
    statsTitle: 'Generation Stats',
    newsCount: 'News Count',
    newsCountValue: '{count} items',
    tokensIn: 'Input Tokens',
    tokensOut: 'Output Tokens',
    totalTokens: 'Total Tokens',
    fallbackError: 'Failed to generate daily report',
  },
  aiUsage: {
    title: 'AI Usage',
    description: 'Review token usage, cost, and call details for AI summaries and daily reports.',
    defaultRange: 'Last 7 days by default',
    usdCost: 'USD Cost',
    dateRange: 'Date Range',
    startDate: 'Start Date',
    endDate: 'End Date',
    refreshUsage: 'Refresh Usage',
    totalTokens: 'Total Tokens',
    totalCost: 'Total Cost (USD)',
    callCount: 'Calls',
    records: 'Usage Records',
    date: 'Date',
    model: 'Model',
    operation: 'Operation',
    tokens: 'Tokens',
    cost: 'Cost',
    empty: 'No AI usage records in the selected date range.',
    fallbackError: 'Failed to load AI usage',
  },
  aiSettings: {
    title: 'AI Settings',
    description: 'Configure Provider, API Key, Base URL, and model parameters.',
    connectionConfig: 'Model Connection Settings',
    connectionDescription: 'Supports OpenAI, DeepSeek, Anthropic, Gemini, Ollama, and any OpenAI-compatible endpoint.',
    loadingSettings: 'Loading AI settings...',
    provider: 'Provider',
    apiKey: 'API Key',
    baseUrl: 'Base URL',
    model: 'Model',
    temperature: 'Temperature',
    maxTokens: 'Max Tokens',
    requestTimeoutMs: 'Request Timeout (ms)',
    saveSettings: 'Save Settings',
    savingSettings: 'Saving...',
    testConnection: 'Test Connection',
    testingConnection: 'Testing...',
    saved: 'AI settings saved',
    testSuccess: 'Connection succeeded: {model}',
    modelRequired: 'Model is required',
    apiKeyRequired: 'API Key is required',
    temperatureInvalid: 'Temperature must be a number',
    maxTokensInvalid: 'Max Tokens must be a positive integer',
    timeoutInvalid: 'Request timeout must be a positive integer',
  },
  sources: {
    title: 'Source Management',
    description: 'Manage RSS sources and maintain region, category, and active status.',
    totalSources: '{count} sources total',
    activeSources: '{count} active sources',
    addSource: 'Add Source',
    listTitle: 'RSS Sources',
    listDescription: 'Configured active sources participate in RSS fetching.',
    loadingSources: 'Loading sources...',
    emptySources: 'No sources yet. Add an RSS source.',
    editSource: 'Edit Source',
    createSource: 'Add Source',
    dialogDescription: 'Enter the RSS source name, URL, region, and category.',
    name: 'Name',
    url: 'RSS URL',
    region: 'Region',
    category: 'Category',
    active: 'Active',
    inactive: 'Inactive',
    lastFetchedAt: 'Last Fetched',
    neverFetched: 'Never fetched',
    saveSource: 'Save Source',
    savingSource: 'Saving...',
    nameRequired: 'Name is required',
    urlRequired: 'RSS URL is required',
    urlInvalid: 'Enter a valid URL',
  },
} as const

const dictionaries = {
  'zh-CN': zhCN,
  'en-US': enUS,
} satisfies Record<Locale, typeof zhCN>

export type Dictionary = typeof zhCN

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}
```

- [ ] **步骤 4：创建 `src/app/i18n/I18nProvider.tsx`**

创建文件，内容如下：

```tsx
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
```

- [ ] **步骤 5：创建 `src/test/renderWithI18n.tsx`**

创建文件，内容如下：

```tsx
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
```

- [ ] **步骤 6：运行 Provider 测试确认通过**

运行：

```bash
npm test -- --run src/app/i18n/I18nProvider.test.tsx
```

预期：`I18nProvider.test.tsx` 全部通过。

- [ ] **步骤 7：提交字典和 Provider**

运行：

```bash
git add src/app/i18n/dictionaries.ts src/app/i18n/I18nProvider.tsx src/app/i18n/I18nProvider.test.tsx src/test/renderWithI18n.tsx
git commit -m "添加国际化字典和上下文"
```

## 任务 4：添加语言感知格式化工具

**文件：**

- 新增：`src/app/i18n/format.ts`
- 新增：`src/app/i18n/format.test.ts`

- [ ] **步骤 1：编写格式化失败测试**

创建 `src/app/i18n/format.test.ts`，内容如下：

```ts
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
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
npm test -- --run src/app/i18n/format.test.ts
```

预期：失败，原因是 `format.ts` 尚不存在。

- [ ] **步骤 3：创建 `src/app/i18n/format.ts`**

创建文件，内容如下：

```ts
import type { Locale } from './routing'

export function formatCompactDateTime(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

export function formatFullDateTime(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

export function formatCurrencyUsd(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    currency: 'USD',
    style: 'currency',
  }).format(value)
}
```

- [ ] **步骤 4：运行格式化测试确认通过**

运行：

```bash
npm test -- --run src/app/i18n/format.test.ts
```

预期：`format.test.ts` 全部通过。

- [ ] **步骤 5：提交格式化工具**

运行：

```bash
git add src/app/i18n/format.ts src/app/i18n/format.test.ts
git commit -m "添加国际化格式化工具"
```

## 任务 5：迁移 App Router 到 `[lang]` 并注入 Provider

**文件：**

- 移动：`src/app/layout.tsx` -> `src/app/[lang]/layout.tsx`
- 移动：`src/app/page.tsx` -> `src/app/[lang]/page.tsx`
- 移动：`src/app/daily-report/page.tsx` -> `src/app/[lang]/daily-report/page.tsx`
- 移动：`src/app/ai-usage/page.tsx` -> `src/app/[lang]/ai-usage/page.tsx`
- 移动：`src/app/ai-settings/page.tsx` -> `src/app/[lang]/ai-settings/page.tsx`
- 移动：`src/app/sources/page.tsx` -> `src/app/[lang]/sources/page.tsx`
- 修改：移动后的页面 import 路径

- [ ] **步骤 1：移动页面和布局文件**

运行：

```bash
mkdir -p src/app/[lang]/daily-report src/app/[lang]/ai-usage src/app/[lang]/ai-settings src/app/[lang]/sources
git mv src/app/layout.tsx src/app/[lang]/layout.tsx
git mv src/app/page.tsx src/app/[lang]/page.tsx
git mv src/app/daily-report/page.tsx src/app/[lang]/daily-report/page.tsx
git mv src/app/ai-usage/page.tsx src/app/[lang]/ai-usage/page.tsx
git mv src/app/ai-settings/page.tsx src/app/[lang]/ai-settings/page.tsx
git mv src/app/sources/page.tsx src/app/[lang]/sources/page.tsx
```

- [ ] **步骤 2：替换 `src/app/[lang]/layout.tsx` 内容**

将文件内容替换为：

```tsx
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
```

- [ ] **步骤 3：修正移动后的 Dashboard page import**

在 `src/app/[lang]/page.tsx` 中，把相对 app 组件 import 改为别名 import：

```ts
import { Header } from '@/app/components/layout/Header'
import { Sidebar } from '@/app/components/layout/Sidebar'
import { NewsDetail } from '@/app/components/news/NewsDetail'
import { NewsList } from '@/app/components/news/NewsList'
import { useNewsStore } from '@/app/store/newsStore'
```

保留 `Dialog`、`Button` 和 `cn` 的现有别名 import。

- [ ] **步骤 4：运行构建确认路由迁移可编译**

运行：

```bash
npm run build
```

预期：构建可能因为组件尚未接入 Provider 或测试路径尚未更新而失败；如果失败点是页面 import 路径，修正到 `@/app/components/...`、`@/app/store/newsStore` 或 `@/app/i18n/...` 后重新运行，直到构建进入下一类待改造问题。

- [ ] **步骤 5：提交路由迁移骨架**

运行：

```bash
git add src/app/[lang] src/proxy.ts
git add -u src/app/layout.tsx src/app/page.tsx src/app/daily-report/page.tsx src/app/ai-usage/page.tsx src/app/ai-settings/page.tsx src/app/sources/page.tsx
git commit -m "迁移页面到语言路由"
```

## 任务 6：添加语言切换器

**文件：**

- 新增：`src/app/components/layout/LanguageSwitcher.tsx`
- 新增：`src/app/components/layout/LanguageSwitcher.test.tsx`
- 修改：`src/app/components/layout/Header.tsx`
- 测试：`src/app/components/layout/Header.test.tsx`

- [ ] **步骤 1：编写语言切换器失败测试**

创建 `src/app/components/layout/LanguageSwitcher.test.tsx`，内容如下：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithI18n } from '@/test/renderWithI18n'
import { LanguageSwitcher } from './LanguageSwitcher'

const routerReplace = vi.fn()
let pathname = '/zh-CN/sources'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace: routerReplace }),
}))

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    pathname = '/zh-CN/sources'
    routerReplace.mockClear()
  })

  it('renders current locale and switches while preserving page path', async () => {
    const user = userEvent.setup()

    renderWithI18n(<LanguageSwitcher />)

    await user.selectOptions(screen.getByLabelText('界面语言'), 'en-US')

    expect(routerReplace).toHaveBeenCalledWith('/en-US/sources')
  })

  it('shows English accessible label under English locale', () => {
    renderWithI18n(<LanguageSwitcher />, { locale: 'en-US' })

    expect(screen.getByLabelText('Interface language')).toBeInTheDocument()
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
npm test -- --run src/app/components/layout/LanguageSwitcher.test.tsx
```

预期：失败，原因是 `LanguageSwitcher.tsx` 尚不存在。

- [ ] **步骤 3：创建 `LanguageSwitcher.tsx`**

创建 `src/app/components/layout/LanguageSwitcher.tsx`，内容如下：

```tsx
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
```

- [ ] **步骤 4：把语言切换器加入 Header**

在 `src/app/components/layout/Header.tsx` import 区加入：

```ts
import { useI18n } from '@/app/i18n/I18nProvider'
import { LanguageSwitcher } from './LanguageSwitcher'
```

在 `Header` 组件中加入：

```ts
const { t } = useI18n()
```

把 Header 中现有硬编码字符串替换为：

```tsx
aria-label={t.header.openMobileFilters}
aria-label={isSidebarOpen ? t.header.collapseSidebar : t.header.expandSidebar}
{t.header.title}
{t.header.subtitle}
placeholder={t.header.searchPlaceholder}
aria-label={t.header.searchLabel}
aria-label={t.header.toggleTheme}
```

在主题切换按钮前加入：

```tsx
<LanguageSwitcher />
```

- [ ] **步骤 5：运行语言切换器和 Header 测试**

运行：

```bash
npm test -- --run src/app/components/layout/LanguageSwitcher.test.tsx src/app/components/layout/Header.test.tsx
```

预期：语言切换器测试通过；Header 测试如果因为缺少 Provider 失败，使用 `renderWithI18n(<Header />)`、`renderWithI18n(<Header isSidebarOpen />)` 或 `renderWithI18n(<Header onOpenFilters={onOpenFilters} onToggleSidebar={onToggleSidebar} />)` 替换原来的 `render(...)`。

- [ ] **步骤 6：提交语言切换器**

运行：

```bash
git add src/app/components/layout/LanguageSwitcher.tsx src/app/components/layout/LanguageSwitcher.test.tsx src/app/components/layout/Header.tsx src/app/components/layout/Header.test.tsx
git commit -m "添加语言切换器"
```

## 任务 7：国际化 Dashboard、侧边栏和新闻组件

**文件：**

- 修改：`src/app/[lang]/page.tsx`
- 修改：`src/app/components/layout/Sidebar.tsx`
- 修改：`src/app/components/news/NewsList.tsx`
- 修改：`src/app/components/news/NewsCard.tsx`
- 修改：`src/app/components/news/NewsDetail.tsx`
- 修改：对应测试文件

- [ ] **步骤 1：更新 Dashboard 相关测试的渲染工具**

将以下测试文件中需要渲染使用 `useI18n()` 组件的 `render(...)` 改为 `renderWithI18n(...)`：

```text
src/app/components/layout/Sidebar.test.tsx
src/app/components/news/NewsList.test.tsx
src/app/components/news/NewsCard.test.tsx
src/app/components/news/NewsDetail.test.tsx
src/app/[lang]/page.test.tsx
```

在每个文件 import 区加入：

```ts
import { renderWithI18n } from '@/test/renderWithI18n'
```

把原来的 Testing Library `render` import 删除，保留 `screen`。

- [ ] **步骤 2：添加英文渲染断言**

在 `src/app/components/news/NewsList.test.tsx` 中新增测试：

```tsx
it('英文语言下显示英文列表文案', () => {
  renderWithI18n(<NewsList />, { locale: 'en-US' })

  expect(screen.getByText('Intelligence Feed')).toBeInTheDocument()
  expect(screen.getByText('Showing 25 / 25 news items')).toBeInTheDocument()
})
```

在 `src/app/components/layout/Sidebar.test.tsx` 中新增测试：

```tsx
it('英文语言下显示英文筛选文案', () => {
  renderWithI18n(<Sidebar />, { locale: 'en-US' })

  expect(screen.getByText('Filters')).toBeInTheDocument()
  expect(screen.getByText('Region')).toBeInTheDocument()
  expect(screen.getByText('Category')).toBeInTheDocument()
  expect(screen.getByText('Importance')).toBeInTheDocument()
})
```

- [ ] **步骤 3：运行测试确认失败**

运行：

```bash
npm test -- --run src/app/components/layout/Sidebar.test.tsx src/app/components/news/NewsList.test.tsx
```

预期：失败，原因是组件还没有使用字典，或测试还没有全部包裹 Provider。

- [ ] **步骤 4：替换 `src/app/[lang]/page.tsx` 的 Dashboard 文案**

在文件 import 区加入：

```ts
import { useI18n } from '@/app/i18n/I18nProvider'
```

在 `Home` 组件中加入：

```ts
const { formatMessage, t } = useI18n()
```

把 RSS 刷新消息替换为：

```ts
setRefreshMessage(
  result.errors.length > 0
    ? formatMessage(t.dashboard.rssRefreshPartial, {
        fetched: result.fetched,
        errors: result.errors.length,
      })
    : formatMessage(t.dashboard.rssRefreshSuccess, { fetched: result.fetched }),
)
```

把页面中的硬编码字符串替换为：

```tsx
{isLoading ? t.dashboard.refreshingRss : t.dashboard.refreshRss}
<DialogTitle>{t.dashboard.mobileFiltersTitle}</DialogTitle>
<DialogDescription>{t.dashboard.mobileFiltersDescription}</DialogDescription>
<DialogTitle>{t.dashboard.newsDetailTitle}</DialogTitle>
<DialogDescription>{t.dashboard.newsDetailDescription}</DialogDescription>
```

- [ ] **步骤 5：替换 Sidebar 文案和链接**

在 `src/app/components/layout/Sidebar.tsx` import 区加入：

```ts
import { useI18n } from '@/app/i18n/I18nProvider'
import { localizedPath } from '@/app/i18n/routing'
```

在组件内加入：

```ts
const { locale, t } = useI18n()
```

删除 `importanceLabels` 常量，使用 `t.enums.importance[importance]`。

将 Link 的 `href` 替换为：

```tsx
href={localizedPath(locale, '/daily-report')}
href={localizedPath(locale, '/ai-usage')}
href={localizedPath(locale, '/ai-settings')}
href={localizedPath(locale, '/sources')}
```

将 Sidebar 文案替换为：

```tsx
{t.sidebar.title}
{t.sidebar.subtitle}
{t.sidebar.matchedResults}
/ {totalCount} {t.sidebar.totalSuffix}
aria-label={t.sidebar.clearFilters}
<FilterSection icon={Globe2} title={t.sidebar.regionFilter}>
<FilterSection icon={Layers3} title={t.sidebar.categoryFilter}>
<FilterSection icon={CircleDot} title={t.sidebar.importanceFilter}>
{t.enums.regions[region]}
{t.enums.categories[category]}
{t.enums.importance[importance]}
{t.sidebar.dailyReport}
{t.sidebar.aiUsage}
{t.sidebar.aiSettings}
{t.sidebar.sources}
{t.sidebar.clearFilters}
```

- [ ] **步骤 6：替换 NewsList 文案**

在 `src/app/components/news/NewsList.tsx` import 区加入：

```ts
import { useI18n } from '@/app/i18n/I18nProvider'
```

组件内加入：

```ts
const { formatMessage, t } = useI18n()
```

替换文本为：

```tsx
{t.newsList.title}
{formatMessage(t.newsList.count, { filtered: filteredNews.length, total: totalCount })}
{formatMessage(t.newsList.searchBadge, { query: searchQuery.trim() })}
{t.newsList.emptyTitle}
{t.newsList.emptyDescription}
```

- [ ] **步骤 7：替换 NewsCard 日期和枚举标签**

在 `src/app/components/news/NewsCard.tsx` import 区加入：

```ts
import { formatCompactDateTime } from '@/app/i18n/format'
import { useI18n } from '@/app/i18n/I18nProvider'
```

组件内加入：

```ts
const { locale, t } = useI18n()
```

替换显示内容：

```tsx
{t.enums.importance[item.importance]}
{formatCompactDateTime(item.publishedAt, locale)}
<Badge variant="secondary">{t.enums.regions[item.region]}</Badge>
<Badge variant="outline">{t.enums.categories[item.category]}</Badge>
```

删除组件底部 `formatDate()` 函数。

- [ ] **步骤 8：替换 NewsDetail 文案、日期和枚举标签**

在 `src/app/components/news/NewsDetail.tsx` import 区加入：

```ts
import { formatFullDateTime } from '@/app/i18n/format'
import { useI18n } from '@/app/i18n/I18nProvider'
```

组件内加入：

```ts
const { locale, t } = useI18n()
```

替换文本为：

```tsx
{t.newsDetail.emptyTitle}
{t.newsDetail.emptyDescription}
{t.enums.regions[item.region]}
{t.enums.categories[item.category]}
{t.enums.importance[item.importance]}
{formatFullDateTime(item.publishedAt, locale)}
{t.newsDetail.fullSummary}
{t.newsDetail.aiSummary}
{t.newsDetail.keyPoints}
{t.newsDetail.impact}
{t.newsDetail.aiSummaryMissing}
aria-label={t.newsDetail.generatingAiSummaryLabel}
{isAiLoading ? t.newsDetail.generatingAiSummary : t.newsDetail.generateAiSummary}
{t.newsDetail.sourceInfo}
{t.newsDetail.source}
{t.newsDetail.openSourceLink}
```

删除组件底部 `formatDate()` 函数。

- [ ] **步骤 9：运行 Dashboard 相关测试确认通过**

运行：

```bash
npm test -- --run src/app/components/layout/Sidebar.test.tsx src/app/components/news/NewsList.test.tsx src/app/components/news/NewsCard.test.tsx src/app/components/news/NewsDetail.test.tsx src/app/[lang]/page.test.tsx
```

预期：全部通过。

- [ ] **步骤 10：提交 Dashboard 国际化**

运行：

```bash
git add src/app/[lang]/page.tsx src/app/components/layout/Sidebar.tsx src/app/components/news/NewsList.tsx src/app/components/news/NewsCard.tsx src/app/components/news/NewsDetail.tsx
git add src/app/components/layout/Sidebar.test.tsx src/app/components/news/NewsList.test.tsx src/app/components/news/NewsCard.test.tsx src/app/components/news/NewsDetail.test.tsx src/app/[lang]/page.test.tsx
git commit -m "国际化仪表盘界面"
```

## 任务 8：国际化日报、AI 用量、AI 配置和数据源页面

**文件：**

- 修改：`src/app/[lang]/daily-report/page.tsx`
- 修改：`src/app/[lang]/daily-report/page.test.tsx`
- 修改：`src/app/[lang]/ai-usage/page.tsx`
- 修改：`src/app/[lang]/ai-usage/page.test.tsx`
- 修改：`src/app/[lang]/ai-settings/page.tsx`
- 修改：`src/app/[lang]/ai-settings/page.test.tsx`
- 修改：`src/app/[lang]/sources/page.tsx`
- 修改：`src/app/[lang]/sources/page.test.tsx`

- [ ] **步骤 1：移动页面测试文件**

运行：

```bash
git mv src/app/daily-report/page.test.tsx src/app/[lang]/daily-report/page.test.tsx
git mv src/app/ai-usage/page.test.tsx src/app/[lang]/ai-usage/page.test.tsx
git mv src/app/ai-settings/page.test.tsx src/app/[lang]/ai-settings/page.test.tsx
git mv src/app/sources/page.test.tsx src/app/[lang]/sources/page.test.tsx
```

- [ ] **步骤 2：更新页面测试渲染工具**

在移动后的四个页面测试中使用：

```ts
import { renderWithI18n } from '@/test/renderWithI18n'
```

把渲染页面的 `render(<Page />)` 改为：

```tsx
renderWithI18n(<Page />)
```

英文断言需要使用：

```tsx
renderWithI18n(<Page />, { locale: 'en-US' })
```

- [ ] **步骤 3：为四个页面添加英文 smoke 测试**

在 `src/app/[lang]/daily-report/page.test.tsx` 中加入：

```tsx
it('英文语言下显示英文日报页面文案', () => {
  renderWithI18n(<DailyReportPage />, { locale: 'en-US' })

  expect(screen.getByText('AI Daily Report')).toBeInTheDocument()
  expect(screen.getByText('Generate Daily Report')).toBeInTheDocument()
})
```

在 `src/app/[lang]/ai-usage/page.test.tsx` 中加入：

```tsx
it('英文语言下显示英文用量页面文案', async () => {
  renderWithI18n(<AiUsagePage />, { locale: 'en-US' })

  expect(await screen.findByText('AI Usage')).toBeInTheDocument()
  expect(screen.getByText('Date Range')).toBeInTheDocument()
})
```

在 `src/app/[lang]/ai-settings/page.test.tsx` 中加入：

```tsx
it('英文语言下显示英文配置页面文案', async () => {
  renderWithI18n(<AiSettingsPage />, { locale: 'en-US' })

  expect(await screen.findByText('AI Settings')).toBeInTheDocument()
  expect(screen.getByText('Model Connection Settings')).toBeInTheDocument()
})
```

在 `src/app/[lang]/sources/page.test.tsx` 中加入：

```tsx
it('英文语言下显示英文数据源页面文案', async () => {
  renderWithI18n(<SourcesPage />, { locale: 'en-US' })

  expect(await screen.findByText('Source Management')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Add Source/ })).toBeInTheDocument()
})
```

- [ ] **步骤 4：运行四个页面测试确认失败**

运行：

```bash
npm test -- --run src/app/[lang]/daily-report/page.test.tsx src/app/[lang]/ai-usage/page.test.tsx src/app/[lang]/ai-settings/page.test.tsx src/app/[lang]/sources/page.test.tsx
```

预期：失败，原因是页面还没有使用字典，或测试尚未全部包裹 Provider。

- [ ] **步骤 5：国际化 `daily-report/page.tsx`**

在文件 import 区加入：

```ts
import { useI18n } from '@/app/i18n/I18nProvider'
import { localizedPath } from '@/app/i18n/routing'
```

组件内加入：

```ts
const { formatMessage, locale, t } = useI18n()
```

将返回 Dashboard 链接改为：

```tsx
<Link href={localizedPath(locale, '/')} className={cn(buttonVariants({ variant: 'outline' }))}>
```

把页面文本替换为 `t.dailyReport` 下对应 key；统计值使用：

```tsx
<Stat label={t.dailyReport.newsCount} value={report ? formatMessage(t.dailyReport.newsCountValue, { count: report.newsCount }) : '--'} />
<Stat label={t.dailyReport.tokensIn} value={report ? String(report.tokensIn) : '--'} />
<Stat label={t.dailyReport.tokensOut} value={report ? String(report.tokensOut) : '--'} />
<Stat label={t.dailyReport.totalTokens} value={report ? String(totalTokens) : '--'} />
```

将 `getErrorMessage()` fallback 改为接收 fallback 参数：

```ts
function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
```

catch 中使用：

```ts
setError(getErrorMessage(generateError, t.dailyReport.fallbackError))
```

- [ ] **步骤 6：国际化 `ai-usage/page.tsx`**

在文件 import 区加入：

```ts
import { formatCurrencyUsd } from '@/app/i18n/format'
import { useI18n } from '@/app/i18n/I18nProvider'
import { localizedPath } from '@/app/i18n/routing'
```

组件内加入：

```ts
const { locale, t } = useI18n()
```

将返回 Dashboard 链接改为 `localizedPath(locale, '/')`。

把页面文本替换为 `t.aiUsage` 下对应 key。

把 `formatCurrency(item.costUsd)` 替换为：

```ts
formatCurrencyUsd(item.costUsd, locale)
```

把总费用格式化替换为：

```ts
formatCurrencyUsd(usage.totalCost, locale)
```

删除页面内旧的 `formatCurrency()` 函数。

- [ ] **步骤 7：国际化 `ai-settings/page.tsx`**

在文件 import 区加入：

```ts
import { useI18n } from '@/app/i18n/I18nProvider'
import { localizedPath } from '@/app/i18n/routing'
```

组件内加入：

```ts
const { formatMessage, locale, t } = useI18n()
```

将返回 Dashboard 链接改为 `localizedPath(locale, '/')`。

把 `validate()` 中的错误文案替换为：

```ts
if (!form.model.trim()) return t.aiSettings.modelRequired
if (selectedProvider.requiresApiKey && !form.apiKey.trim() && !apiKeyMasked) return t.aiSettings.apiKeyRequired
if (!Number.isFinite(Number(form.temperature))) return t.aiSettings.temperatureInvalid
if (!Number.isInteger(Number(form.maxTokens)) || Number(form.maxTokens) <= 0) return t.aiSettings.maxTokensInvalid
if (!Number.isInteger(Number(form.requestTimeoutMs)) || Number(form.requestTimeoutMs) <= 0) return t.aiSettings.timeoutInvalid
```

把保存和测试成功消息替换为：

```ts
setMessage(t.aiSettings.saved)
setMessage(formatMessage(t.aiSettings.testSuccess, { model: result.model }))
```

把页面文本替换为 `t.aiSettings` 下对应 key。

- [ ] **步骤 8：国际化 `sources/page.tsx`**

在文件 import 区加入：

```ts
import { formatFullDateTime } from '@/app/i18n/format'
import { useI18n } from '@/app/i18n/I18nProvider'
import { localizedPath } from '@/app/i18n/routing'
```

组件内加入：

```ts
const { formatMessage, locale, t } = useI18n()
```

将返回 Dashboard 链接改为 `localizedPath(locale, '/')`。

把 `validateSourceForm(form)` 改为：

```ts
const errors = validateSourceForm(form, t)
```

把验证函数签名和实现改为：

```ts
function validateSourceForm(form: SourceFormState, t: ReturnType<typeof useI18n>['t']): FormErrors {
  const errors: FormErrors = {}

  if (!form.name.trim()) {
    errors.name = t.sources.nameRequired
  }

  if (!form.url.trim()) {
    errors.url = t.sources.urlRequired
  } else {
    try {
      new URL(form.url)
    } catch {
      errors.url = t.sources.urlInvalid
    }
  }

  return errors
}
```

把页面文本替换为 `t.sources` 下对应 key。地区、分类选项显示使用：

```tsx
{t.enums.regions[region]}
{t.enums.categories[category]}
```

上次抓取时间显示使用：

```tsx
{source.lastFetchedAt ? formatFullDateTime(source.lastFetchedAt, locale) : t.sources.neverFetched}
```

- [ ] **步骤 9：运行四个页面测试确认通过**

运行：

```bash
npm test -- --run src/app/[lang]/daily-report/page.test.tsx src/app/[lang]/ai-usage/page.test.tsx src/app/[lang]/ai-settings/page.test.tsx src/app/[lang]/sources/page.test.tsx
```

预期：全部通过。

- [ ] **步骤 10：提交二级页面国际化**

运行：

```bash
git add src/app/[lang]/daily-report src/app/[lang]/ai-usage src/app/[lang]/ai-settings src/app/[lang]/sources
git add -u src/app/daily-report/page.test.tsx src/app/ai-usage/page.test.tsx src/app/ai-settings/page.test.tsx src/app/sources/page.test.tsx
git commit -m "国际化二级页面界面"
```

## 任务 9：最终验证和文档补充

**文件：**

- 修改：`README.md`
- 测试：全量测试、lint、build

- [ ] **步骤 1：在 README 中补充国际化说明**

在 `README.md` 中加入：

```md
## 国际化

应用第一版支持中文和英文系统界面：

- 默认语言：中文（`zh-CN`）
- 英文路径：`/en-US`
- 中文路径：`/zh-CN`
- 根路径 `/` 会重定向到 `/zh-CN`

国际化范围包括系统 UI 文案、导航、筛选、表单、日期和金额格式化。新闻标题、RSS 摘要、来源原文和 AI 生成日报正文不会在本版本自动翻译。
```

- [ ] **步骤 2：运行聚焦测试**

运行：

```bash
npm test -- --run src/app/i18n/routing.test.ts src/app/i18n/I18nProvider.test.tsx src/app/i18n/format.test.ts src/app/components/layout/LanguageSwitcher.test.tsx
```

预期：全部通过。

- [ ] **步骤 3：运行页面和组件测试**

运行：

```bash
npm test -- --run src/app/components/layout/Header.test.tsx src/app/components/layout/Sidebar.test.tsx src/app/components/news/NewsList.test.tsx src/app/components/news/NewsCard.test.tsx src/app/components/news/NewsDetail.test.tsx src/app/[lang]/page.test.tsx src/app/[lang]/daily-report/page.test.tsx src/app/[lang]/ai-usage/page.test.tsx src/app/[lang]/ai-settings/page.test.tsx src/app/[lang]/sources/page.test.tsx
```

预期：全部通过。

- [ ] **步骤 4：运行串行全量测试**

运行：

```bash
npm test -- --run --fileParallelism=false
```

预期：全部通过。使用串行模式是因为现有 API route 测试共享测试数据库路径和环境变量，并行运行曾出现超时或互相干扰。

- [ ] **步骤 5：运行 lint**

运行：

```bash
npm run lint
```

预期：无错误。现有 `src/lib/ai/settings.ts` 可能仍有 `getAiRequestTimeoutMs` 未使用 warning；如果该 warning 仍存在且和本次改动无关，不在本计划中修复。

- [ ] **步骤 6：运行生产构建**

运行：

```bash
npm run build
```

预期：构建通过，路由列表包含 `/zh-CN`、`/en-US` 以及两种语言下的二级页面；API 路由仍为 `/api/...`。

- [ ] **步骤 7：提交最终文档和验证调整**

运行：

```bash
git add README.md
git commit -m "补充国际化使用说明"
```

## 自检清单

- [ ] 默认语言是 `zh-CN`，`/` 重定向到 `/zh-CN`。
- [ ] 英文界面路径是 `/en-US`，中文界面路径是 `/zh-CN`。
- [ ] `/api/...` 路由没有语言前缀，接口调用仍使用 `/api/...`。
- [ ] Header 右上角存在语言切换器，切换语言时保留当前页面路径。
- [ ] Dashboard、Sidebar、NewsList、NewsCard、NewsDetail 的系统 UI 文案使用字典。
- [ ] Daily Report、AI Usage、AI Settings、Sources 页面系统 UI 文案使用字典。
- [ ] 日期和美元金额格式化使用当前 locale。
- [ ] RSS 新闻标题、摘要、来源原文和 AI 生成日报正文不被自动翻译。
- [ ] 聚焦测试、串行全量测试、lint、build 均完成并记录结果。
