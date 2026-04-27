import type { Category, ImportanceLevel, Region } from '@/app/types/news'
import { getAllNews, type NewsFilters, type NewsStatus } from '@/lib/db'
import { parseCsvParam, parseNonNegativeIntegerParam, withDb } from '../route-utils'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  const searchParams = new URL(request.url).searchParams
  const filters: NewsFilters = {
    regions: parseCsvParam(searchParams.get('regions')) as Region[] | undefined,
    categories: parseCsvParam(searchParams.get('categories')) as Category[] | undefined,
    importanceLevels: parseCsvParam(searchParams.get('importanceLevels')) as ImportanceLevel[] | undefined,
    statuses: parseCsvParam(searchParams.get('status')) as NewsStatus[] | undefined,
  }
  const search = searchParams.get('search') ?? ''
  const limit = parseNonNegativeIntegerParam(searchParams.get('limit'), 50)
  const offset = parseNonNegativeIntegerParam(searchParams.get('offset'), 0)

  return withDb((db) => Response.json(getAllNews(db, filters, search, limit, offset)))
}
