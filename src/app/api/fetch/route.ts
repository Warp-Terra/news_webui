import { getAllSources } from '@/lib/db'
import { fetchAllSources } from '@/lib/rss'
import { jsonError, withDb } from '../route-utils'

export const runtime = 'nodejs'

export async function POST(): Promise<Response> {
  return withDb(async (db) => {
    const sourcesChecked = getAllSources(db).filter((source) => source.active).length

    if (sourcesChecked === 0) {
      return jsonError('No active sources configured', 400)
    }

    const result = await fetchAllSources(db)

    return Response.json({ ...result, sourcesChecked })
  })
}
