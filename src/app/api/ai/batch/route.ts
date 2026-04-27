import { summarizeNews } from '@/lib/ai/summarize'
import { getNewsWithoutAiSummary, updateNewsAiFields } from '@/lib/db'

import { readJsonObject, withDb } from '../../route-utils'
import { getErrorMessage, normalizeLimit, recordAiUsage, toNewsAiFields } from '../route-helpers'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  const body = (await readJsonObject(request)) ?? {}
  const limit = normalizeLimit(body.limit, 10)

  return withDb(async (db) => {
    const newsList = getNewsWithoutAiSummary(db, limit)
    const errors: string[] = []
    let success = 0
    let failed = 0

    for (const news of newsList) {
      try {
        const result = await summarizeNews(news)
        updateNewsAiFields(db, news.id, toNewsAiFields(result))
        recordAiUsage(db, {
          newsId: news.id,
          operation: 'summarize',
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
        })
        success += 1
      } catch (error) {
        failed += 1
        errors.push(`${news.id}: ${getErrorMessage(error)}`)
      }
    }

    return Response.json({ processed: newsList.length, success, failed, errors })
  })
}
