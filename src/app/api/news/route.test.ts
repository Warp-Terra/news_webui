import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { updateNewsStatus, type Database } from '@/lib/db'
import { createRouteTestDb, insertTestNews, useTestDatabasePath, type RouteTestDb } from '../test-utils'
import { GET } from './route'

describe('/api/news route handler', () => {
  let testDb: RouteTestDb
  let db: Database
  let restoreDbPath: () => void

  beforeEach(() => {
    testDb = createRouteTestDb('gni-api-news-')
    db = testDb.db
    restoreDbPath = useTestDatabasePath(testDb.db.name)
  })

  afterEach(() => {
    restoreDbPath()
    testDb.cleanup()
  })

  it('GET 返回新闻列表、总数，并按 publishedAt 倒序排序', async () => {
    insertTestNews(db, {
      id: 'news-old',
      title: 'Older headline',
      sourceUrl: 'https://example.com/older-headline',
      publishedAt: '2026-04-21T10:00:00.000Z',
    })
    insertTestNews(db, {
      id: 'news-new',
      title: 'Newer headline',
      sourceUrl: 'https://example.com/newer-headline',
      publishedAt: '2026-04-23T10:00:00.000Z',
    })

    const response = await GET(new Request('http://localhost/api/news'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.count).toBe(2)
    expect(body.items.map((item: { id: string }) => item.id)).toEqual(['news-new', 'news-old'])
    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('GET 支持地区、分类、重要度和状态逗号分隔筛选', async () => {
    insertTestNews(db, {
      id: 'news-us-economy',
      sourceUrl: 'https://example.com/us-economy',
      region: 'US',
      category: 'Economy',
      importance: 'high',
    })
    insertTestNews(db, {
      id: 'news-cn-tech',
      title: '中国推出新一轮算力基础设施补贴',
      sourceUrl: 'https://example.com/cn-tech',
      region: 'CN',
      category: 'Technology',
      importance: 'critical',
    })
    insertTestNews(db, {
      id: 'news-eu-energy',
      title: 'EU carbon price rebounds',
      sourceUrl: 'https://example.com/eu-energy',
      region: 'EU',
      category: 'Energy',
      importance: 'medium',
    })
    updateNewsStatus(db, 'news-cn-tech', 'starred')
    updateNewsStatus(db, 'news-eu-energy', 'read')

    const response = await GET(
      new Request(
        'http://localhost/api/news?regions=CN,EU&categories=Technology,Energy&importanceLevels=critical,medium&status=starred',
      ),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.count).toBe(1)
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({ id: 'news-cn-tech', status: 'starred' })
  })

  it('GET 支持 search、limit 和 offset 分页参数', async () => {
    insertTestNews(db, {
      id: 'news-001',
      title: 'AI export screening rules advance',
      source: 'The Wall Street Journal',
      sourceUrl: 'https://example.com/ai-export-screening',
      publishedAt: '2026-04-21T16:05:00.000Z',
      summary: 'Cloud providers may need to verify customer location.',
      keyPoints: ['AI model weights are part of the proposal.'],
    })
    insertTestNews(db, {
      id: 'news-002',
      title: 'Open-source developers seek AI carve-outs',
      sourceUrl: 'https://example.com/open-source-ai-carve-outs',
      publishedAt: '2026-04-22T16:05:00.000Z',
      summary: 'Industry groups warned broad rules could slow collaboration.',
    })
    insertTestNews(db, {
      id: 'news-003',
      title: 'Global LNG prices ease',
      sourceUrl: 'https://example.com/global-lng-prices',
      publishedAt: '2026-04-23T16:05:00.000Z',
      summary: 'Energy buyers delayed cargo purchases.',
    })

    const response = await GET(new Request('http://localhost/api/news?search=AI&limit=1&offset=1'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.count).toBe(2)
    expect(body.items.map((item: { id: string }) => item.id)).toEqual(['news-001'])
  })

  it('GET 默认 limit 为 50、offset 为 0', async () => {
    db.transaction(() => {
      for (let index = 0; index < 55; index += 1) {
        insertTestNews(db, {
          id: `news-${String(index).padStart(3, '0')}`,
          title: `Headline ${index}`,
          sourceUrl: `https://example.com/headline-${index}`,
          publishedAt: `2026-04-23T10:${String(index).padStart(2, '0')}:00.000Z`,
        })
      }
    })()

    const response = await GET(new Request('http://localhost/api/news'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.count).toBe(55)
    expect(body.items).toHaveLength(50)
    expect(body.items[0].id).toBe('news-054')
  })
})
