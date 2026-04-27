import type { Category, Region } from '@/app/types/news'
import {
  getAllSources,
  getSourceById,
  insertSource,
  type Source,
} from '@/lib/db'
import { isSqliteUniqueConstraintError, jsonError, readJsonObject, withDb } from '../route-utils'

export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  return withDb((db) => Response.json(getAllSources(db)))
}

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonObject(request)

  if (!hasRequiredSourceFields(body)) {
    return jsonError('name and url are required', 400)
  }

  return withDb((db) => {
    if (getAllSources(db).some((source) => source.name === body.name)) {
      return jsonError('Source name already exists', 409)
    }

    try {
      const id = insertSource(db, {
        name: body.name,
        url: body.url,
        region: getStringOrDefault(body.region, 'Global') as Region,
        category: getStringOrDefault(body.category, 'Economy') as Category,
        active: true,
        lastFetchedAt: null,
      })
      const source = getSourceById(db, id)

      return Response.json(source, { status: 201 })
    } catch (error) {
      if (isSqliteUniqueConstraintError(error)) {
        return jsonError('Source name already exists', 409)
      }

      throw error
    }
  })
}

function hasRequiredSourceFields(body: Record<string, unknown> | null): body is Pick<Source, 'name' | 'url'> &
  Partial<Record<'region' | 'category', unknown>> {
  return typeof body?.name === 'string' && body.name.trim().length > 0 && typeof body.url === 'string' && body.url.trim().length > 0
}

function getStringOrDefault(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}
