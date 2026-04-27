import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getAllSources, type Database } from '@/lib/db'
import {
  createRouteTestDb,
  insertTestSource,
  jsonRequest,
  useTestDatabasePath,
  type RouteTestDb,
} from '../test-utils'
import { GET, POST } from './route'

describe('/api/sources route handler', () => {
  let testDb: RouteTestDb
  let db: Database
  let restoreDbPath: () => void

  beforeEach(() => {
    testDb = createRouteTestDb('gni-api-sources-')
    db = testDb.db
    restoreDbPath = useTestDatabasePath(testDb.db.name)
  })

  afterEach(() => {
    restoreDbPath()
    testDb.cleanup()
  })

  it('GET 返回所有数据源', async () => {
    const reuters = insertTestSource(db)
    const caixin = insertTestSource(db, {
      name: 'Caixin Tech',
      url: 'https://feeds.example.com/caixin.xml',
      region: 'CN',
      category: 'Technology',
      active: false,
    })

    const response = await GET(new Request('http://localhost/api/sources'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([reuters, caixin])
  })

  it('POST 新增数据源并返回带 id 的数据源', async () => {
    const payload = {
      name: 'Nikkei Asia',
      url: 'https://feeds.example.com/nikkei.xml',
      region: 'JP',
      category: 'Economy',
    }

    const response = await POST(jsonRequest('http://localhost/api/sources', 'POST', payload))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body).toMatchObject({ ...payload, active: true, lastFetchedAt: null })
    expect(body.id).toEqual(expect.any(Number))
    expect(getAllSources(db)).toEqual([body])
  })

  it('POST 在 name 或 url 缺失时返回 400', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/sources', 'POST', {
        name: 'Missing URL',
        region: 'US',
        category: 'Economy',
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'name and url are required' })
  })

  it('POST 在 name 重复时返回 409', async () => {
    insertTestSource(db, { name: 'Duplicate Source' })

    const response = await POST(
      jsonRequest('http://localhost/api/sources', 'POST', {
        name: 'Duplicate Source',
        url: 'https://feeds.example.com/another.xml',
        region: 'US',
        category: 'Economy',
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body).toEqual({ error: 'Source name already exists' })
    expect(getAllSources(db)).toHaveLength(1)
  })
})
