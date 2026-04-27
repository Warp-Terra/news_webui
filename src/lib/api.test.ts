import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  batchSummarize,
  createSource,
  deleteSource,
  fetchAiUsage,
  fetchSourcesList,
  generateDailyReport,
  summarizeNewsItem,
  updateSource,
  type AiSummaryResult,
  type AiUsageItem,
  type NewsSource,
} from './api'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

function createNewsSource(overrides: Partial<NewsSource> = {}): NewsSource {
  return {
    id: 1,
    name: 'Reuters Top News',
    url: 'https://www.reutersagency.com/feed/',
    region: 'Global',
    category: 'Politics',
    active: true,
    lastFetchedAt: '2026-04-23T10:00:00.000Z',
    ...overrides,
  }
}

describe('sources API client', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetchSourcesList 请求 /api/sources 并返回数据源列表', async () => {
    const sources = [createNewsSource()]
    fetchMock.mockResolvedValueOnce(jsonResponse(sources))

    await expect(fetchSourcesList()).resolves.toEqual(sources)

    expect(fetchMock).toHaveBeenCalledWith('/api/sources')
  })

  it('createSource POST 新数据源并返回创建结果', async () => {
    const payload = {
      name: 'Nikkei Asia',
      url: 'https://asia.nikkei.com/rss/feed/nar',
      region: 'JP',
      category: 'Economy',
      active: true,
      lastFetchedAt: null,
    } satisfies Omit<NewsSource, 'id'>
    const created = createNewsSource({ id: 2, ...payload })
    fetchMock.mockResolvedValueOnce(jsonResponse(created, { status: 201 }))

    await expect(createSource(payload)).resolves.toEqual(created)

    expect(fetchMock).toHaveBeenCalledWith('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  })

  it('updateSource PATCH 指定数据源', async () => {
    const partial = { name: 'Reuters World', active: false } satisfies Partial<NewsSource>
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }))

    await expect(updateSource(7, partial)).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledWith('/api/sources/7', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    })
  })

  it('deleteSource DELETE 指定数据源', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }))

    await expect(deleteSource(9)).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledWith('/api/sources/9', { method: 'DELETE' })
  })

  it('sources API 失败时抛出服务端错误信息', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Source name already exists' }, { status: 409 }))

    await expect(fetchSourcesList()).rejects.toMatchObject({
      message: 'Source name already exists',
      status: 409,
    })
  })
})

describe('AI API client', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('summarizeNewsItem POST 新闻 id 并返回 AI 摘要结果', async () => {
    const result: AiSummaryResult = {
      summary: 'AI 摘要会聚焦出口管制的新增义务。',
      keyPoints: ['云服务商需要验证客户位置', '模型权重被纳入审查范围'],
      impact: '芯片与云服务供应链需要新增合规流程。',
      importance: 'high',
      tags: ['AI', 'export controls'],
      tokensIn: 120,
      tokensOut: 80,
    }
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, result }))

    await expect(summarizeNewsItem('news-001')).resolves.toEqual(result)

    expect(fetchMock).toHaveBeenCalledWith('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'news-001' }),
    })
  })

  it('batchSummarize POST 可选 limit 并返回批处理统计', async () => {
    const result = { processed: 5, success: 4, failed: 1 }
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...result, errors: ['news-005: timeout'] }))

    await expect(batchSummarize(5)).resolves.toEqual(result)

    expect(fetchMock).toHaveBeenCalledWith('/api/ai/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 5 }),
    })
  })

  it('generateDailyReport POST 日期并返回日报内容和 token 统计', async () => {
    const result = {
      markdown: '# 2026-04-23 全球情报日报\n\n- AI 管制升级',
      newsCount: 8,
      tokensIn: 500,
      tokensOut: 300,
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(result))

    await expect(generateDailyReport('2026-04-23')).resolves.toEqual(result)

    expect(fetchMock).toHaveBeenCalledWith('/api/ai/daily-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-04-23' }),
    })
  })

  it('fetchAiUsage GET 日期范围并返回用量明细与汇总', async () => {
    const items: AiUsageItem[] = [
      {
        id: 1,
        date: '2026-04-23',
        model: 'gpt-4.1-mini',
        provider: 'openai',
        tokensIn: 120,
        tokensOut: 80,
        costUsd: 0.002,
        newsId: 'news-001',
        operation: 'summarize',
        createdAt: '2026-04-23T10:05:00.000Z',
      },
    ]
    fetchMock.mockResolvedValueOnce(jsonResponse({ items, totalTokens: 200, totalCost: 0.002 }))

    await expect(fetchAiUsage('2026-04-20', '2026-04-23')).resolves.toEqual({
      items,
      totalTokens: 200,
      totalCost: 0.002,
    })

    const [url] = fetchMock.mock.calls[0] as [string]
    const parsed = new URL(url, 'http://localhost')
    expect(parsed.pathname).toBe('/api/ai/usage')
    expect(parsed.searchParams.get('startDate')).toBe('2026-04-20')
    expect(parsed.searchParams.get('endDate')).toBe('2026-04-23')
  })

  it('AI API 失败时抛出服务端错误信息', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'AI provider unavailable' }, { status: 503 }))

    await expect(summarizeNewsItem('news-001')).rejects.toMatchObject({
      message: 'AI provider unavailable',
      status: 503,
    })
  })
})
