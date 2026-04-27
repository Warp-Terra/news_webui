import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NewsItem } from '@/app/types/news'
import { getAiUsage, type Database } from '@/lib/db'

import {
  createRouteTestDb,
  insertTestNews,
  jsonRequest,
  useTestDatabasePath,
  type RouteTestDb,
} from '../../test-utils'

const { generateDailyReportMock } = vi.hoisted(() => ({
  generateDailyReportMock: vi.fn(),
}))

vi.mock('@/lib/ai/summarize', () => ({
  generateDailyReport: generateDailyReportMock,
}))

import { POST } from './route'

describe('/api/ai/daily-report route handler', () => {
  let testDb: RouteTestDb
  let db: Database
  let restoreDbPath: () => void
  let originalAiProvider: string | undefined
  let originalAiModel: string | undefined

  beforeEach(() => {
    testDb = createRouteTestDb('gni-api-ai-daily-report-')
    db = testDb.db
    restoreDbPath = useTestDatabasePath(testDb.db.name)
    originalAiProvider = process.env.AI_PROVIDER
    originalAiModel = process.env.AI_MODEL
    process.env.AI_PROVIDER = 'deepseek'
    process.env.AI_MODEL = 'deepseek-chat-test'
    generateDailyReportMock.mockReset()
  })

  afterEach(() => {
    restoreEnv('AI_PROVIDER', originalAiProvider)
    restoreEnv('AI_MODEL', originalAiModel)
    restoreDbPath()
    testDb.cleanup()
  })

  it('POST 成功生成今天的日报', async () => {
    const today = new Date().toISOString().slice(0, 10)
    insertNewsForDate(today, 3)
    generateDailyReportMock.mockResolvedValue({ markdown: '# 今日情报日报', tokensIn: 450, tokensOut: 120 })

    const response = await POST(jsonRequest('http://localhost/api/ai/daily-report', 'POST', {}))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ markdown: '# 今日情报日报', newsCount: 3, tokensIn: 450, tokensOut: 120 })
    expect(generateDailyReportMock).toHaveBeenCalledTimes(1)
    expect(generateDailyReportMock.mock.calls[0][0]).toHaveLength(3)
    expect(getAiUsage(db, '2000-01-01', '2100-01-01')).toMatchObject([
      {
        provider: 'deepseek',
        model: 'deepseek-chat-test',
        tokensIn: 450,
        tokensOut: 120,
        operation: 'daily-report',
        newsId: null,
      },
    ])
  })

  it('POST 支持指定日期生成日报', async () => {
    insertNewsForDate('2026-04-25', 3)
    insertNewsForDate('2026-04-26', 3)
    generateDailyReportMock.mockResolvedValue({ markdown: '# 2026-04-25 日报', tokensIn: 300, tokensOut: 90 })

    const response = await POST(jsonRequest('http://localhost/api/ai/daily-report', 'POST', { date: '2026-04-25' }))
    const body = await response.json()
    const passedNews = generateDailyReportMock.mock.calls[0][0] as NewsItem[]

    expect(response.status).toBe(200)
    expect(body).toEqual({ markdown: '# 2026-04-25 日报', newsCount: 3, tokensIn: 300, tokensOut: 90 })
    expect(passedNews).toHaveLength(3)
    expect(passedNews.every((item) => item.publishedAt.startsWith('2026-04-25'))).toBe(true)
  })

  it('POST 在新闻太少时返回友好提示', async () => {
    insertNewsForDate('2026-04-24', 2)

    const response = await POST(jsonRequest('http://localhost/api/ai/daily-report', 'POST', { date: '2026-04-24' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.newsCount).toBe(2)
    expect(body.tokensIn).toBe(0)
    expect(body.tokensOut).toBe(0)
    expect(body.markdown).toContain('至少需要 3 条新闻')
    expect(generateDailyReportMock).not.toHaveBeenCalled()
    expect(getAiUsage(db, '2000-01-01', '2100-01-01')).toEqual([])
  })

  it('POST 在 AI 调用失败时返回 500', async () => {
    insertNewsForDate('2026-04-23', 3)
    generateDailyReportMock.mockRejectedValue(new Error('daily report failed'))

    const response = await POST(jsonRequest('http://localhost/api/ai/daily-report', 'POST', { date: '2026-04-23' }))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'daily report failed' })
    expect(getAiUsage(db, '2000-01-01', '2100-01-01')).toEqual([])
  })

  function insertNewsForDate(date: string, count: number) {
    for (let index = 0; index < count; index += 1) {
      insertTestNews(db, {
        id: `${date}-news-${index}`,
        title: `${date} intelligence item ${index}`,
        sourceUrl: `https://example.com/${date}/news-${index}`,
        publishedAt: `${date}T0${index}:00:00.000Z`,
      })
    }
  }
})

function restoreEnv(key: 'AI_PROVIDER' | 'AI_MODEL', value: string | undefined) {
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }
}
