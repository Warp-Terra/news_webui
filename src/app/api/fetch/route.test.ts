import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAllNews, getSourceById, type Database } from '@/lib/db'
import { createRouteTestDb, insertTestSource, useTestDatabasePath, type RouteTestDb } from '../test-utils'

const { parseURLMock } = vi.hoisted(() => ({
  parseURLMock: vi.fn(),
}))

vi.mock('rss-parser', () => {
  const ParserMock = vi.fn().mockImplementation(function MockParser() {
    return {
      parseURL: parseURLMock,
    }
  })

  return { default: ParserMock }
})

import { POST } from './route'

describe('/api/fetch route handler', () => {
  let testDb: RouteTestDb
  let db: Database
  let restoreDbPath: () => void

  beforeEach(() => {
    testDb = createRouteTestDb('gni-api-fetch-')
    db = testDb.db
    restoreDbPath = useTestDatabasePath(testDb.db.name)
    parseURLMock.mockReset()
  })

  afterEach(() => {
    restoreDbPath()
    testDb.cleanup()
  })

  it('POST 触发所有 active 数据源 RSS 拉取并返回统计', async () => {
    const activeSource = insertTestSource(db, {
      name: 'Active Source',
      url: 'https://feeds.example.com/active.xml',
    })
    const inactiveSource = insertTestSource(db, {
      name: 'Inactive Source',
      url: 'https://feeds.example.com/inactive.xml',
      active: false,
    })
    parseURLMock.mockResolvedValue({
      title: 'Active Feed',
      items: [
        {
          title: 'Central bank update',
          link: 'https://example.com/central-bank-update',
          isoDate: '2026-04-23T14:30:00.000Z',
          contentSnippet: 'Policy makers held rates steady.',
        },
      ],
    })

    const response = await POST(new Request('http://localhost/api/fetch', { method: 'POST' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ fetched: 1, errors: [], sourcesChecked: 1 })
    expect(parseURLMock).toHaveBeenCalledTimes(1)
    expect(parseURLMock).toHaveBeenCalledWith(activeSource.url)
    expect(getAllNews(db).count).toBe(1)
    expect(getSourceById(db, activeSource.id)?.lastFetchedAt).toEqual(expect.any(String))
    expect(getSourceById(db, inactiveSource.id)?.lastFetchedAt).toBeNull()
  })

  it('POST 在没有 active 数据源时返回 400', async () => {
    insertTestSource(db, {
      name: 'Inactive Source',
      url: 'https://feeds.example.com/inactive.xml',
      active: false,
    })

    const response = await POST(new Request('http://localhost/api/fetch', { method: 'POST' }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'No active sources configured' })
    expect(parseURLMock).not.toHaveBeenCalled()
  })

  it('POST 汇总部分 RSS 拉取错误并继续处理其他源', async () => {
    insertTestSource(db, {
      name: 'Working Source',
      url: 'https://feeds.example.com/working.xml',
    })
    insertTestSource(db, {
      name: 'Failing Source',
      url: 'https://feeds.example.com/failing.xml',
    })
    parseURLMock.mockImplementation(async (url: string) => {
      if (url === 'https://feeds.example.com/failing.xml') {
        throw new Error('network down')
      }

      return {
        title: 'Working Feed',
        items: [
          {
            title: 'Global LNG prices ease',
            link: 'https://example.com/lng-prices',
            isoDate: '2026-04-22T08:00:00.000Z',
            contentSnippet: 'Energy buyers delayed cargo purchases.',
          },
        ],
      }
    })

    const response = await POST(new Request('http://localhost/api/fetch', { method: 'POST' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.fetched).toBe(1)
    expect(body.sourcesChecked).toBe(2)
    expect(body.errors).toHaveLength(1)
    expect(body.errors[0]).toContain('Failing Source')
    expect(body.errors[0]).toContain('network down')
  })
})
