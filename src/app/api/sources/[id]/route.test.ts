import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getSourceById, type Database } from '@/lib/db'
import {
  createRouteTestDb,
  insertTestSource,
  jsonRequest,
  routeContext,
  useTestDatabasePath,
  type RouteTestDb,
} from '../../test-utils'
import { DELETE, GET, PATCH } from './route'

describe('/api/sources/[id] route handler', () => {
  let testDb: RouteTestDb
  let db: Database
  let restoreDbPath: () => void

  beforeEach(() => {
    testDb = createRouteTestDb('gni-api-sources-id-')
    db = testDb.db
    restoreDbPath = useTestDatabasePath(testDb.db.name)
  })

  afterEach(() => {
    restoreDbPath()
    testDb.cleanup()
  })

  it('GET 按 id 返回单条数据源', async () => {
    const source = insertTestSource(db)

    const response = await GET(new Request(`http://localhost/api/sources/${source.id}`), routeContext(String(source.id)))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(source)
  })

  it('GET 在数据源不存在时返回 404', async () => {
    const response = await GET(new Request('http://localhost/api/sources/404'), routeContext('404'))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({ error: 'Source not found' })
  })

  it('GET 在 id 非数字时返回 400', async () => {
    const response = await GET(new Request('http://localhost/api/sources/not-a-number'), routeContext('not-a-number'))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'Invalid source id' })
  })

  it('PATCH 部分更新数据源任一字段', async () => {
    const source = insertTestSource(db)

    const response = await PATCH(
      jsonRequest(`http://localhost/api/sources/${source.id}`, 'PATCH', {
        name: 'Reuters Macro',
        active: false,
      }),
      routeContext(String(source.id)),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ success: true })
    expect(getSourceById(db, source.id)).toMatchObject({ name: 'Reuters Macro', active: false })
  })

  it('PATCH 在没有可更新字段时返回 400', async () => {
    const source = insertTestSource(db)

    const response = await PATCH(
      jsonRequest(`http://localhost/api/sources/${source.id}`, 'PATCH', { unknown: 'value' }),
      routeContext(String(source.id)),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'No valid fields to update' })
  })

  it('PATCH 在数据源不存在时返回 404', async () => {
    const response = await PATCH(
      jsonRequest('http://localhost/api/sources/404', 'PATCH', { active: false }),
      routeContext('404'),
    )
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({ error: 'Source not found' })
  })

  it('DELETE 删除数据源并返回 success', async () => {
    const source = insertTestSource(db)

    const response = await DELETE(new Request(`http://localhost/api/sources/${source.id}`, { method: 'DELETE' }), routeContext(String(source.id)))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ success: true })
    expect(getSourceById(db, source.id)).toBeNull()
  })

  it('DELETE 在数据源不存在时返回 404', async () => {
    const response = await DELETE(new Request('http://localhost/api/sources/404', { method: 'DELETE' }), routeContext('404'))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({ error: 'Source not found' })
  })
})
