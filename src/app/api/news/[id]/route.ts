import { deleteNews, getNewsById, updateNewsStatus, type NewsStatus } from '@/lib/db'
import { jsonError, readJsonObject, type RouteContext, withDb } from '../../route-utils'

export const runtime = 'nodejs'

const VALID_NEWS_STATUSES = new Set<NewsStatus>(['unread', 'read', 'starred', 'ignored'])

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params

  return withDb((db) => {
    const news = getNewsById(db, id)

    return news ? Response.json(news) : jsonError('News not found', 404)
  })
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params
  const body = await readJsonObject(request)
  const status = body?.status

  if (typeof status !== 'string' || !VALID_NEWS_STATUSES.has(status as NewsStatus)) {
    return jsonError('Invalid status', 400)
  }

  return withDb((db) => {
    const success = updateNewsStatus(db, id, status as NewsStatus)

    return success ? Response.json({ success }) : jsonError('News not found', 404)
  })
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params

  return withDb((db) => {
    const success = deleteNews(db, id)

    return success ? Response.json({ success }) : jsonError('News not found', 404)
  })
}
