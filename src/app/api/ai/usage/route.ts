import { getAiUsage, getAiUsageSummary } from '@/lib/db'

import { jsonError, withDb } from '../../route-utils'
import { currentIsoDate, normalizeIsoDateInput } from '../route-helpers'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  const searchParams = new URL(request.url).searchParams
  const endDate = normalizeIsoDateInput(searchParams.get('endDate'), currentIsoDate())
  const startDate = normalizeIsoDateInput(searchParams.get('startDate'), endDate ?? currentIsoDate())

  if (!startDate || !endDate) {
    return jsonError('Invalid date range', 400)
  }

  return withDb((db) => {
    const items = getAiUsage(db, startDate, endDate)
    const summary = getAiUsageSummary(db, startDate, endDate)

    return Response.json({ items, ...summary })
  })
}
