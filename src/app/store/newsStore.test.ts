import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NewsItemWithStatus, NewsStatus } from '@/lib/db'
import { resetNewsStore } from '@/test/resetNewsStore'
import { useNewsStore } from './newsStore'

function createNewsItem(overrides: Partial<NewsItemWithStatus> = {}): NewsItemWithStatus {
  return {
    id: 'news-001',
    title: 'AI export screening rules advance',
    source: 'Reuters',
    sourceUrl: 'https://example.com/ai-export-screening',
    region: 'US',
    category: 'Technology',
    tags: ['AI', 'export controls'],
    publishedAt: '2026-04-23T10:00:00.000Z',
    summary: 'Cloud providers may need to verify customer location.',
    keyPoints: ['AI model weights are part of the proposal.'],
    impact: 'Chip exporters face additional compliance requirements.',
    importance: 'high',
    status: 'unread',
    ...overrides,
  }
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return { promise, resolve, reject }
}

function filteredIds() {
  return useNewsStore.getState().filteredNews().map((item) => item.id)
}

describe('useNewsStore', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    resetNewsStore({ newsList: [], totalCount: 0 })
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('初始化为 API 驱动状态', () => {
    const state = useNewsStore.getState()

    expect(state.newsList).toEqual([])
    expect(state.selectedId).toBeNull()
    expect(state.filters).toEqual({
      regions: [],
      categories: [],
      importanceLevels: [],
    })
    expect(state.searchQuery).toBe('')
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.totalCount).toBe(0)
    expect(state.filteredNews()).toEqual([])
  })

  it('fetchNews 成功时填充 newsList、totalCount，并维护 isLoading', async () => {
    const item = createNewsItem()
    const deferred = createDeferred<Response>()
    fetchMock.mockReturnValueOnce(deferred.promise)
    useNewsStore.getState().updateFilter('regions', 'US')
    useNewsStore.getState().updateFilter('categories', 'Technology')
    useNewsStore.getState().updateFilter('importanceLevels', 'high')
    useNewsStore.getState().updateSearch('AI')

    const promise = useNewsStore.getState().fetchNews()

    expect(useNewsStore.getState().isLoading).toBe(true)
    expect(useNewsStore.getState().error).toBeNull()

    deferred.resolve(jsonResponse({ items: [item], count: 12 }))
    await promise

    const [url] = fetchMock.mock.calls[0] as [string]
    const searchParams = new URL(url, 'http://localhost').searchParams
    expect(new URL(url, 'http://localhost').pathname).toBe('/api/news')
    expect(searchParams.get('regions')).toBe('US')
    expect(searchParams.get('categories')).toBe('Technology')
    expect(searchParams.get('importanceLevels')).toBe('high')
    expect(searchParams.get('search')).toBe('AI')
    expect(useNewsStore.getState().newsList).toEqual([item])
    expect(useNewsStore.getState().totalCount).toBe(12)
    expect(useNewsStore.getState().isLoading).toBe(false)
    expect(useNewsStore.getState().error).toBeNull()
  })

  it('fetchNews 失败时设置 error 并恢复 isLoading', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Database unavailable' }, { status: 500 }))

    await useNewsStore.getState().fetchNews()

    expect(useNewsStore.getState().newsList).toEqual([])
    expect(useNewsStore.getState().totalCount).toBe(0)
    expect(useNewsStore.getState().isLoading).toBe(false)
    expect(useNewsStore.getState().error).toBe('Database unavailable')
  })

  it('fetchNewsItem 成功时返回单条新闻并同步本地列表', async () => {
    const existing = createNewsItem({ id: 'news-001', status: 'unread' })
    const refreshed = createNewsItem({ id: 'news-001', status: 'read' })
    resetNewsStore({ newsList: [existing] })
    fetchMock.mockResolvedValueOnce(jsonResponse(refreshed))

    const result = await useNewsStore.getState().fetchNewsItem('news-001')

    expect(fetchMock).toHaveBeenCalledWith('/api/news/news-001')
    expect(result).toEqual(refreshed)
    expect(useNewsStore.getState().newsList).toEqual([refreshed])
    expect(useNewsStore.getState().error).toBeNull()
  })

  it('fetchNewsItem 对 404 返回 null 并设置错误信息', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'News not found' }, { status: 404 }))

    const result = await useNewsStore.getState().fetchNewsItem('missing-news')

    expect(result).toBeNull()
    expect(useNewsStore.getState().error).toBe('News not found')
  })

  it('筛选与搜索基于已加载的 newsList 即时生效', () => {
    const items = [
      createNewsItem({
        id: 'news-us-ai',
        title: 'Frontier AI model weights policy advances',
        region: 'US',
        category: 'Technology',
        importance: 'critical',
      }),
      createNewsItem({
        id: 'news-cn-ai',
        title: 'China expands AI compute subsidies',
        source: 'Xinhua',
        region: 'CN',
        category: 'Technology',
        importance: 'high',
      }),
      createNewsItem({
        id: 'news-eu-energy',
        title: 'EU gas storage mandate updated',
        source: 'Financial Times',
        region: 'EU',
        category: 'Energy',
        importance: 'medium',
      }),
    ]
    resetNewsStore({ newsList: items, totalCount: items.length })

    useNewsStore.getState().updateFilter('regions', 'US')
    useNewsStore.getState().updateFilter('regions', 'CN')
    useNewsStore.getState().updateFilter('categories', 'Technology')
    useNewsStore.getState().updateSearch('  ai  ')

    expect(useNewsStore.getState().filters.regions).toEqual(['US', 'CN'])
    expect(useNewsStore.getState().filters.categories).toEqual(['Technology'])
    expect(useNewsStore.getState().searchQuery).toBe('  ai  ')
    expect(filteredIds()).toEqual(['news-us-ai', 'news-cn-ai'])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('clearFilters 清除筛选和搜索条件但保留已加载新闻', () => {
    const items = [createNewsItem(), createNewsItem({ id: 'news-002', region: 'CN' })]
    resetNewsStore({ newsList: items, totalCount: items.length })
    useNewsStore.getState().updateFilter('regions', 'US')
    useNewsStore.getState().updateSearch('Reuters')

    useNewsStore.getState().clearFilters()

    expect(useNewsStore.getState().filters).toEqual({
      regions: [],
      categories: [],
      importanceLevels: [],
    })
    expect(useNewsStore.getState().searchQuery).toBe('')
    expect(useNewsStore.getState().filteredNews()).toEqual(items)
  })

  it.each<NewsStatus>(['read', 'starred', 'ignored'])(
    'updateNewsStatus 成功时 PATCH 后更新本地状态为 %s',
    async (status) => {
      const items = [createNewsItem({ id: 'news-001' }), createNewsItem({ id: 'news-002' })]
      resetNewsStore({ newsList: items })
      fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }))

      await useNewsStore.getState().updateNewsStatus('news-001', status)

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(fetchMock.mock.calls[0][0]).toBe('/api/news/news-001')
      expect(init).toMatchObject({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      expect(useNewsStore.getState().newsList).toEqual([
        { ...items[0], status },
        items[1],
      ])
      expect(useNewsStore.getState().error).toBeNull()
    },
  )

  it('deleteNewsItem 成功时删除本地新闻并清空已删除 selectedId', async () => {
    const items = [createNewsItem({ id: 'news-001' }), createNewsItem({ id: 'news-002' })]
    resetNewsStore({ newsList: items, selectedId: 'news-001', totalCount: items.length })
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }))

    await useNewsStore.getState().deleteNewsItem('news-001')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/news/news-001')
    expect(init).toMatchObject({ method: 'DELETE' })
    expect(useNewsStore.getState().newsList).toEqual([items[1]])
    expect(useNewsStore.getState().selectedId).toBeNull()
    expect(useNewsStore.getState().totalCount).toBe(1)
    expect(useNewsStore.getState().error).toBeNull()
  })

  it('deleteNewsItem 删除非选中新闻时保留 selectedId', async () => {
    const items = [createNewsItem({ id: 'news-001' }), createNewsItem({ id: 'news-002' })]
    resetNewsStore({ newsList: items, selectedId: 'news-002', totalCount: items.length })
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }))

    await useNewsStore.getState().deleteNewsItem('news-001')

    expect(useNewsStore.getState().newsList).toEqual([items[1]])
    expect(useNewsStore.getState().selectedId).toBe('news-002')
    expect(useNewsStore.getState().totalCount).toBe(1)
  })

  it('triggerFetch 成功时 POST /api/fetch 并返回统计信息', async () => {
    const result = { fetched: 3, errors: ['Failing Source: network down'] }
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...result, sourcesChecked: 2 }))

    await expect(useNewsStore.getState().triggerFetch()).resolves.toEqual(result)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/fetch')
    expect(init).toMatchObject({ method: 'POST' })
    expect(useNewsStore.getState().error).toBeNull()
  })

  it('summarizeNewsItem 成功时乐观更新本地新闻 AI 字段', async () => {
    const existing = createNewsItem({
      id: 'news-001',
      summary: 'RSS 初始摘要',
      keyPoints: [],
      impact: undefined,
      importance: 'medium',
      tags: [],
    })
    const result = {
      summary: 'AI 生成摘要',
      keyPoints: ['第一条 AI 关键点', '第二条 AI 关键点'],
      impact: 'AI 影响判断',
      importance: 'high',
      tags: ['AI', 'Policy'],
      tokensIn: 120,
      tokensOut: 80,
    }
    resetNewsStore({ newsList: [existing], totalCount: 1 })
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, result }))

    await useNewsStore.getState().summarizeNewsItem('news-001')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/ai/summarize')
    expect(init).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'news-001' }),
    })
    expect(useNewsStore.getState().newsList).toEqual([
      {
        ...existing,
        summary: 'AI 生成摘要',
        keyPoints: ['第一条 AI 关键点', '第二条 AI 关键点'],
        impact: 'AI 影响判断',
        importance: 'high',
        tags: ['AI', 'Policy'],
      },
    ])
    expect(useNewsStore.getState().isAiLoading).toBe(false)
    expect(useNewsStore.getState().aiError).toBeNull()
  })

  it('summarizeNewsItem 失败时设置 aiError 并保留本地新闻', async () => {
    const existing = createNewsItem({ id: 'news-001', keyPoints: [], impact: undefined })
    resetNewsStore({ newsList: [existing], totalCount: 1 })
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'AI provider unavailable' }, { status: 503 }))

    await useNewsStore.getState().summarizeNewsItem('news-001')

    expect(useNewsStore.getState().newsList).toEqual([existing])
    expect(useNewsStore.getState().isAiLoading).toBe(false)
    expect(useNewsStore.getState().aiError).toBe('AI provider unavailable')
  })

  it('batchSummarize 成功时调用批量摘要 API 并清空 AI 错误', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ processed: 3, success: 3, failed: 0, errors: [] }))

    await useNewsStore.getState().batchSummarize(3)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/ai/batch')
    expect(init).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 3 }),
    })
    expect(useNewsStore.getState().isAiLoading).toBe(false)
    expect(useNewsStore.getState().aiError).toBeNull()
  })

  it('filteredNews 能在 NewsItemWithStatus 数据上兼容组件使用', () => {
    const items = [
      createNewsItem({ id: 'news-reuters', source: 'Reuters', status: 'starred' }),
      createNewsItem({
        id: 'news-energy',
        source: 'Bloomberg',
        category: 'Energy',
        summary: 'Procurement urgency eases for LNG buyers.',
        status: 'read',
      }),
    ]
    resetNewsStore({ newsList: items })

    useNewsStore.getState().updateSearch('procurement urgency')

    expect(useNewsStore.getState().filteredNews()).toEqual([items[1]])
    expect(useNewsStore.getState().filteredNews()[0].status).toBe('read')
  })
})
