import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NewsItem } from '@/app/types/news'
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
    summary: '批量 AI 摘要',
    keyPoints: ['批量关键点'],
    impact: '批量影响分析。',
    importance: 'high',
    tags: ['批量'],
    tokensIn: 80,
    tokensOut: 20,
    ...overrides,
  }
}

describe('/api/ai/batch route handler', () => {
  let testDb: RouteTestDb
  let db: Database
  let restoreDbPath: () => void
  let originalAiProvider: string | undefined
  let originalAiModel: string | undefined

  beforeEach(() => {
    testDb = createRouteTestDb('gni-api-ai-batch-')
    db = testDb.db
    restoreDbPath = useTestDatabasePath(testDb.db.name)
    originalAiProvider = process.env.AI_PROVIDER
    originalAiModel = process.env.AI_MODEL
    process.env.AI_PROVIDER = 'ollama'
    process.env.AI_MODEL = 'llama3.1-test'
    summarizeNewsMock.mockReset()
  })

  afterEach(() => {
    restoreEnv('AI_PROVIDER', originalAiProvider)
    restoreEnv('AI_MODEL', originalAiModel)
    restoreDbPath()
    testDb.cleanup()
  })

  it('POST 成功批量处理多条未摘要新闻', async () => {
    const first = insertRawNews({ id: 'raw-news-001', sourceUrl: 'https://example.com/batch-001' })
    const second = insertRawNews({ id: 'raw-news-002', sourceUrl: 'https://example.com/batch-002' })
    summarizeNewsMock.mockResolvedValue(makeAiResult())

    const response = await POST(jsonRequest('http://localhost/api/ai/batch', 'POST', { limit: 10 }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ processed: 2, success: 2, failed: 0, errors: [] })
    expect(summarizeNewsMock).toHaveBeenCalledTimes(2)
    expect(getNewsById(db, first.id)?.keyPoints).toEqual(['批量关键点'])
    expect(getNewsById(db, second.id)?.keyPoints).toEqual(['批量关键点'])
    expect(getAiUsage(db, '2000-01-01', '2100-01-01')).toHaveLength(2)
  })

  it('POST 在部分新闻失败时继续处理后续新闻', async () => {
    const first = insertRawNews({ id: 'raw-news-ok-1', title: 'Raw news ok 1', sourceUrl: 'https://example.com/raw-ok-1' })
    const failing = insertRawNews({ id: 'raw-news-fail', title: 'Raw news fail', sourceUrl: 'https://example.com/raw-fail' })
    const third = insertRawNews({ id: 'raw-news-ok-2', title: 'Raw news ok 2', sourceUrl: 'https://example.com/raw-ok-2' })
    summarizeNewsMock.mockImplementation(async (news: NewsItem) => {
      if (news.id === failing.id) {
        throw new Error('temporary provider failure')
      }

      return makeAiResult({ summary: `AI ${news.id}` })
    })

    const response = await POST(jsonRequest('http://localhost/api/ai/batch', 'POST', { limit: 10 }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.processed).toBe(3)
    expect(body.success).toBe(2)
    expect(body.failed).toBe(1)
    expect(body.errors).toHaveLength(1)
    expect(body.errors[0]).toContain(failing.id)
    expect(body.errors[0]).toContain('temporary provider failure')
    expect(getNewsById(db, first.id)?.summary).toBe(`AI ${first.id}`)
    expect(getNewsById(db, failing.id)).toMatchObject({ keyPoints: [], tags: [], impact: '', importance: 'medium' })
    expect(getNewsById(db, third.id)?.summary).toBe(`AI ${third.id}`)
    expect(getAiUsage(db, '2000-01-01', '2100-01-01')).toHaveLength(2)
  })

  it('POST 的 limit 参数限制处理数量', async () => {
    insertRawNews({ id: 'raw-news-limit-1', sourceUrl: 'https://example.com/raw-limit-1' })
    insertRawNews({ id: 'raw-news-limit-2', sourceUrl: 'https://example.com/raw-limit-2' })
    insertRawNews({ id: 'raw-news-limit-3', sourceUrl: 'https://example.com/raw-limit-3' })
    summarizeNewsMock.mockResolvedValue(makeAiResult())

    const response = await POST(jsonRequest('http://localhost/api/ai/batch', 'POST', { limit: 2 }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ processed: 2, success: 2, failed: 0, errors: [] })
    expect(summarizeNewsMock).toHaveBeenCalledTimes(2)
  })

  it('POST 在没有待处理新闻时返回 0 processed', async () => {
    insertTestNews(db, { id: 'enriched-news-001', sourceUrl: 'https://example.com/enriched-news-001' })

    const response = await POST(jsonRequest('http://localhost/api/ai/batch', 'POST', {}))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ processed: 0, success: 0, failed: 0, errors: [] })
    expect(summarizeNewsMock).not.toHaveBeenCalled()
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
