import type { Category, Region } from '@/app/types/news'
import { deleteSource, getSourceById, updateSource, type Source } from '@/lib/db'
import {
  isSqliteUniqueConstraintError,
  jsonError,
  parseNumericId,
  readJsonObject,
  type RouteContext,
  withDb,
} from '../../route-utils'

export const runtime = 'nodejs'

type SourceUpdate = Partial<Omit<Source, 'id' | 'lastFetchedAt'>>

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params
  const sourceId = parseNumericId(id)

  if (sourceId === null) {
    return jsonError('Invalid source id', 400)
  }

  return withDb((db) => {
    const source = getSourceById(db, sourceId)

    return source ? Response.json(source) : jsonError('Source not found', 404)
  })
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params
  const sourceId = parseNumericId(id)

  if (sourceId === null) {
    return jsonError('Invalid source id', 400)
  }

  const body = await readJsonObject(request)
  const partial = pickSourceUpdate(body)

  if (Object.keys(partial).length === 0) {
    return jsonError('No valid fields to update', 400)
  }

  return withDb((db) => {
    if (!getSourceById(db, sourceId)) {
      return jsonError('Source not found', 404)
    }

    try {
      updateSource(db, sourceId, partial)

      return Response.json({ success: true })
    } catch (error) {
      if (isSqliteUniqueConstraintError(error)) {
        return jsonError('Source name already exists', 409)
      }

      throw error
    }
  })
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params
  const sourceId = parseNumericId(id)

  if (sourceId === null) {
    return jsonError('Invalid source id', 400)
  }

  return withDb((db) => {
    const success = deleteSource(db, sourceId)

    return success ? Response.json({ success }) : jsonError('Source not found', 404)
  })
}

function pickSourceUpdate(body: Record<string, unknown> | null): SourceUpdate {
  const partial: SourceUpdate = {}

  if (!body) {
    return partial
  }

  if (typeof body.name === 'string') {
    partial.name = body.name
  }

  if (typeof body.url === 'string') {
    partial.url = body.url
  }

  if (typeof body.region === 'string') {
    partial.region = body.region as Region
  }

  if (typeof body.category === 'string') {
    partial.category = body.category as Category
  }

  if (typeof body.active === 'boolean') {
    partial.active = body.active
  }

  return partial
}
