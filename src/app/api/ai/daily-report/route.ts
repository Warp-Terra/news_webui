import { generateDailyReport } from '@/lib/ai/summarize'
import { getNewsByDate } from '@/lib/db'

import { jsonError, readJsonObject, withDb } from '../../route-utils'
import { getErrorMessage, normalizeIsoDateInput, recordAiUsage } from '../route-helpers'

export const runtime = 'nodejs'

const MIN_DAILY_REPORT_NEWS_COUNT = 3

export async function POST(request: Request): Promise<Response> {
  const body = (await readJsonObject(request)) ?? {}
  const reportDate = normalizeIsoDateInput(body.date)

  if (!reportDate) {
    return jsonError('Invalid date', 400)
  }

  return withDb(async (db) => {
    const newsList = getNewsByDate(db, reportDate)

    if (newsList.length < MIN_DAILY_REPORT_NEWS_COUNT) {
      return Response.json({
        markdown: `当前日期 ${reportDate} 只有 ${newsList.length} 条新闻，至少需要 ${MIN_DAILY_REPORT_NEWS_COUNT} 条新闻才能生成日报。`,
        newsCount: newsList.length,
        tokensIn: 0,
        tokensOut: 0,
      })
    }

    try {
      const result = await generateDailyReport(newsList)
      recordAiUsage(db, {
        date: reportDate,
        operation: 'daily-report',
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
      })

      return Response.json({
        markdown: result.markdown,
        newsCount: newsList.length,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
      })
    } catch (error) {
      return jsonError(getErrorMessage(error), 500)
    }
  })
}
