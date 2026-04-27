import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getNewsById, type Database } from '@/lib/db'
import {
  createRouteTestDb,
  insertTestNews,
  jsonRequest,
  routeContext,
  useTestDatabasePath,
  type RouteTestDb,
} from '../../test-utils'
import { DELETE, GET, PATCH } from './route'

describe('/api/news/[id] route handler', () => {
  let testDb: RouteTestDb
  let db: Database
  let restoreDbPath: () => void

  beforeEach(() => {
    testDb = createRouteTestDb('gni-api-news-id-')
    db = testDb.db
    restoreDbPath = useTestDatabasePath(testDb.db.name)
  })

  afterEach(() => {
    restoreDbPath()
    testDb.cleanup()
  })

  it('GET 按 id 返回单条新闻', async () => {
    const news = insertTestNews(db)

    const response = await GET(new Request(`http://localhost/api/news/${news.id}`), routeContext(news.id))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ id: news.id, title: news.title, status: 'unread' })
  })

  it('GET 在新闻不存在时返回 404', async () => {
    const response = await GET(new Request('http://localhost/api/news/missing-news'), routeContext('missing-news'))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({ error: 'News not found' })
  })

  it('PATCH 更新新闻状态并返回 success', async () => {
    const news = insertTestNews(db)

    const response = await PATCH(
      jsonRequest(`http://localhost/api/news/${news.id}`, 'PATCH', { status: 'starred' }),
      routeContext(news.id),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ success: true })
    expect(getNewsById(db, news.id)?.status).toBe('starred')
  })

  it('PATCH 拒绝无效状态', async () => {
    const news = insertTestNews(db)

    const response = await PATCH(
      jsonRequest(`http://localhost/api/news/${news.id}`, 'PATCH', { status: 'archived' }),
      routeContext(news.id),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'Invalid status' })
    expect(getNewsById(db, news.id)?.status).toBe('unread')
  })

  it('PATCH 在新闻不存在时返回 404', async () => {
    const response = await PATCH(
      jsonRequest('http://localhost/api/news/missing-news', 'PATCH', { status: 'read' }),
      routeContext('missing-news'),
    )
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({ error: 'News not found' })
  })

  it('DELETE 删除新闻并返回 success', async () => {
    const news = insertTestNews(db)

    const response = await DELETE(new Request(`http://localhost/api/news/${news.id}`, { method: 'DELETE' }), routeContext(news.id))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ success: true })
    expect(getNewsById(db, news.id)).toBeNull()
  })

  it('DELETE 在新闻不存在时返回 404', async () => {
    const response = await DELETE(new Request('http://localhost/api/news/missing-news', { method: 'DELETE' }), routeContext('missing-news'))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({ error: 'News not found' })
  })
})
