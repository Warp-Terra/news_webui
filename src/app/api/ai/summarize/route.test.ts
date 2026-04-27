import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AiSummaryResult } from '@/lib/ai/summarize'
import { getAiUsage, getNewsById, type Database } from '@/lib/db'

import {
  createRouteTestDb,
  insertTestNews,
  jsonRequest,
  useTestDatabasePath,
  type RouteTestDb,
} from '../../test-utils'

const { summarizeNewsMock } = vi.hoisted(() => ({
  summarizeNewsMock: vi.fn(),
}))

vi.mock('@/lib/ai/summarize', () => ({
  summarizeNews: summarizeNewsMock,
}))

import { POST } from './route'

function makeAiResult(overrides: Partial<AiSummaryResult> = {}): AiSummaryResult {
  return {
    summary: 'AI 生成的中文摘要',
    keyPoints: ['关键点一', '关键点二'],
    impact: '该事件可能影响全球供应链。',
    importance: 'high',
    tags: ['AI', '供应链'],
    tokensIn: 120,
    tokensOut: 35,
    ...overrides,
  }
}

describe('/api/ai/summarize route handler', () => {
  let testDb: RouteTestDb
  let db: Database
  let restoreDbPath: () => void
  let originalAiProvider: string | undefined
  let originalAiModel: string | undefined

  beforeEach(() => {
    testDb = createRouteTestDb('gni-api-ai-summarize-')
    db = testDb.db
    restoreDbPath = useTestDatabasePath(testDb.db.name)
    originalAiProvider = process.env.AI_PROVIDER
    originalAiModel = process.env.AI_MODEL
    process.env.AI_PROVIDER = 'openai'
    process.env.AI_MODEL = 'gpt-test'
    summarizeNewsMock.mockReset()
  })

  afterEach(() => {
    restoreEnv('AI_PROVIDER', originalAiProvider)
    restoreEnv('AI_MODEL', originalAiModel)
    restoreDbPath()
    testDb.cleanup()
  })

  it('POST 成功生成摘要并更新新闻 AI 字段', async () => {
    const news = insertRawNews({ id: 'raw-news-001', sourceUrl: 'https://example.com/raw-news-001' })
    const aiResult = makeAiResult()
    summarizeNewsMock.mockResolvedValue(aiResult)

    const response = await POST(jsonRequest('http://localhost/api/ai/summarize', 'POST', { id: news.id }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ success: true, result: aiResult })
    expect(summarizeNewsMock).toHaveBeenCalledTimes(1)
    expect(summarizeNewsMock).toHaveBeenCalledWith(expect.objectContaining({ id: news.id, title: news.title }))
    expect(getNewsById(db, news.id)).toMatchObject({
      summary: aiResult.summary,
      keyPoints: aiResult.keyPoints,
      impact: aiResult.impact,
      importance: aiResult.importance,
      tags: aiResult.tags,
    })
  })

  it('POST 在新闻不存在时返回 404', async () => {
    const response = await POST(jsonRequest('http://localhost/api/ai/summarize', 'POST', { id: 'missing-news' }))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({ error: 'News not found' })
    expect(summarizeNewsMock).not.toHaveBeenCalled()
  })

  it('POST 对已有 AI 摘要的新闻返回已有结果且不重复调用 AI', async () => {
    const news = insertTestNews(db, { id: 'enriched-news-001', sourceUrl: 'https://example.com/enriched-news-001' })

    const response = await POST(jsonRequest('http://localhost/api/ai/summarize', 'POST', { id: news.id }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      success: true,
      result: {
        summary: news.summary,
        keyPoints: news.keyPoints,
        impact: news.impact,
        importance: news.importance,
        tags: news.tags,
        tokensIn: 0,
        tokensOut: 0,
      },
    })
    expect(summarizeNewsMock).not.toHaveBeenCalled()
    expect(getAiUsage(db, '2000-01-01', '2100-01-01')).toEqual([])
  })

  it('POST 在 AI 调用失败时返回 500', async () => {
    const news = insertRawNews({ id: 'raw-news-failing', sourceUrl: 'https://example.com/raw-news-failing' })
    summarizeNewsMock.mockRejectedValue(new Error('provider down'))

    const response = await POST(jsonRequest('http://localhost/api/ai/summarize', 'POST', { id: news.id }))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'provider down' })
    expect(getNewsById(db, news.id)).toMatchObject({ keyPoints: [], tags: [], impact: '', importance: 'medium' })
    expect(getAiUsage(db, '2000-01-01', '2100-01-01')).toEqual([])
  })

  it('POST 记录摘要生成的 token 消耗', async () => {
    const news = insertRawNews({ id: 'raw-news-usage', sourceUrl: 'https://example.com/raw-news-usage' })
    summarizeNewsMock.mockResolvedValue(makeAiResult({ tokensIn: 321, tokensOut: 89 }))

    const response = await POST(jsonRequest('http://localhost/api/ai/summarize', 'POST', { id: news.id }))

    expect(response.status).toBe(200)
    expect(getAiUsage(db, '2000-01-01', '2100-01-01')).toMatchObject([
      {
        model: 'gpt-test',
        provider: 'openai',
        tokensIn: 321,
        tokensOut: 89,
        costUsd: 0,
        newsId: news.id,
        operation: 'summarize',
      },
    ])
  })

  function insertRawNews(overrides: Parameters<typeof insertTestNews>[1] = {}) {
    return insertTestNews(db, {
      keyPoints: [],
      tags: [],
      impact: undefined,
      importance: 'medium',
      ...overrides,
    })
  }
})

function restoreEnv(key: 'AI_PROVIDER' | 'AI_MODEL', value: string | undefined) {
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }
}
