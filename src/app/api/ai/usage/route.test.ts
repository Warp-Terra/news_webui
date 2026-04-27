import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { insertAiUsage, type Database } from '@/lib/db'

import { createRouteTestDb, useTestDatabasePath, type RouteTestDb } from '../../test-utils'

import { GET } from './route'

describe('/api/ai/usage route handler', () => {
  let testDb: RouteTestDb
  let db: Database
  let restoreDbPath: () => void

  beforeEach(() => {
    testDb = createRouteTestDb('gni-api-ai-usage-')
    db = testDb.db
    restoreDbPath = useTestDatabasePath(testDb.db.name)
  })

  afterEach(() => {
    restoreDbPath()
    testDb.cleanup()
  })

  it('GET 查询日期范围内的使用记录', async () => {
    insertUsage({ date: '2026-03-31', newsId: 'outside-before', tokensIn: 100, tokensOut: 10, costUsd: 0.1 })
    insertUsage({ date: '2026-04-01', newsId: 'inside-start', tokensIn: 200, tokensOut: 20, costUsd: 0.2 })
    insertUsage({ date: '2026-04-27', newsId: 'inside-end', tokensIn: 300, tokensOut: 30, costUsd: 0.3 })
    insertUsage({ date: '2026-04-28', newsId: 'outside-after', tokensIn: 400, tokensOut: 40, costUsd: 0.4 })

    const response = await GET(new Request('http://localhost/api/ai/usage?startDate=2026-04-01&endDate=2026-04-27'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.items.map((item: { newsId: string }) => item.newsId)).toEqual(['inside-start', 'inside-end'])
  })

  it('GET 统计 total tokens 与 cost', async () => {
    insertUsage({ date: '2026-04-10', tokensIn: 100, tokensOut: 25, costUsd: 0.015 })
    insertUsage({ date: '2026-04-11', tokensIn: 200, tokensOut: 75, costUsd: 0.035 })

    const response = await GET(new Request('http://localhost/api/ai/usage?startDate=2026-04-01&endDate=2026-04-30'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.totalTokens).toBe(400)
    expect(body.totalCost).toBeCloseTo(0.05)
  })

  it('GET 在无记录时返回空数组', async () => {
    const response = await GET(new Request('http://localhost/api/ai/usage?startDate=2026-04-01&endDate=2026-04-30'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ items: [], totalTokens: 0, totalCost: 0 })
  })

  function insertUsage(overrides: Partial<Parameters<typeof insertAiUsage>[1]> = {}) {
    insertAiUsage(db, {
      date: '2026-04-01',
      model: 'gpt-test',
      provider: 'openai',
      tokensIn: 10,
      tokensOut: 5,
      costUsd: 0.001,
      operation: 'summarize',
      ...overrides,
    })
  }
})
