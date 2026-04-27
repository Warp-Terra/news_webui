import { summarizeNews } from '@/lib/ai/summarize'
import { getNewsById, updateNewsAiFields } from '@/lib/db'

import { jsonError, readJsonObject, withDb } from '../../route-utils'
import {
  getErrorMessage,
  hasStoredAiSummary,
  recordAiUsage,
  toExistingAiSummaryResult,
  toNewsAiFields,
} from '../route-helpers'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonObject(request)
  const id = body?.id

  if (typeof id !== 'string' || id.trim().length === 0) {
    return jsonError('Invalid news id', 400)
  }

  const newsId = id.trim()

  return withDb(async (db) => {
    const news = getNewsById(db, newsId)

    if (!news) {
      return jsonError('News not found', 404)
    }

    if (hasStoredAiSummary(news)) {
      return Response.json({ success: true, result: toExistingAiSummaryResult(news) })
    }

    try {
      const result = await summarizeNews(news)
      updateNewsAiFields(db, newsId, toNewsAiFields(result))
      recordAiUsage(db, {
        newsId,
        operation: 'summarize',
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
      })

      return Response.json({ success: true, result })
    } catch (error) {
      return jsonError(getErrorMessage(error), 500)
    }
  })
}
