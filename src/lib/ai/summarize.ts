import type { NewsItem } from '@/app/types/news'

import { extractJsonFromMarkdown, parseAggregationResult, parseAiSummary, type AggregationResult } from './parser'
import { buildAggregationPrompt, buildDailyReportPrompt, buildNewsSummaryPrompt } from './prompts'
import { createRuntimeProvider } from './runtime'
import type { AiProvider } from './types'

export interface AiSummaryResult {
  summary: string
  keyPoints: string[]
  impact: string
  importance: 'low' | 'medium' | 'high' | 'critical'
  tags: string[]
  tokensIn: number
  tokensOut: number
}

export async function summarizeNews(
  news: Pick<NewsItem, 'title' | 'summary' | 'source'>,
  provider?: AiProvider,
): Promise<AiSummaryResult> {
  const resolvedProvider = provider ?? createRuntimeProvider()
  const response = await resolvedProvider.call(buildNewsSummaryPrompt(news))
  const parsed = parseAiSummary(extractJsonFromMarkdown(response.content))

  return {
    ...parsed,
    summary: parsed.summary || news.summary,
    tokensIn: response.tokensIn,
    tokensOut: response.tokensOut,
  }
}

export async function aggregateNews(newsList: NewsItem[], provider?: AiProvider): Promise<AggregationResult> {
  const resolvedProvider = provider ?? createRuntimeProvider()
  const response = await resolvedProvider.call(buildAggregationPrompt(newsList))

  return parseAggregationResult(extractJsonFromMarkdown(response.content))
}

export async function generateDailyReport(
  newsList: NewsItem[],
  provider?: AiProvider,
): Promise<{ markdown: string; tokensIn: number; tokensOut: number }> {
  const resolvedProvider = provider ?? createRuntimeProvider()
  const response = await resolvedProvider.call(buildDailyReportPrompt(newsList))

  return {
    markdown: response.content.trim(),
    tokensIn: response.tokensIn,
    tokensOut: response.tokensOut,
  }
}
