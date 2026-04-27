import type { AiSummaryResult } from '@/lib/ai/summarize'
import {
  insertAiUsage,
  type AiUsageOperation,
  type Database,
  type NewsAiFieldsUpdate,
  type NewsItemWithStatus,
} from '@/lib/db'

interface AiUsageInput {
  date?: string
  newsId?: string
  operation: AiUsageOperation
  tokensIn: number
  tokensOut: number
}

export function hasStoredAiSummary(
  news: Pick<NewsItemWithStatus, 'keyPoints' | 'impact' | 'importance' | 'tags'>,
): boolean {
  return (
    news.keyPoints.length > 0 ||
    news.tags.length > 0 ||
    (news.impact?.trim().length ?? 0) > 0 ||
    news.importance !== 'medium'
  )
}

export function toExistingAiSummaryResult(news: NewsItemWithStatus): AiSummaryResult {
  return {
    summary: news.summary,
    keyPoints: news.keyPoints,
    impact: news.impact ?? '',
    importance: news.importance,
    tags: news.tags,
    tokensIn: 0,
    tokensOut: 0,
  }
}

export function toNewsAiFields(result: AiSummaryResult): NewsAiFieldsUpdate {
  return {
    summary: result.summary,
    keyPoints: result.keyPoints,
    impact: result.impact,
    importance: result.importance,
    tags: result.tags,
  }
}

export function recordAiUsage(db: Database, input: AiUsageInput): void {
  insertAiUsage(db, {
    date: input.date ?? currentIsoDate(),
    model: getEnvValue('AI_MODEL', 'unknown'),
    provider: getEnvValue('AI_PROVIDER', 'openai').toLowerCase(),
    tokensIn: input.tokensIn,
    tokensOut: input.tokensOut,
    costUsd: estimateCostUsd(),
    newsId: input.newsId,
    operation: input.operation,
  })
}

export function normalizeLimit(value: unknown, fallback = 10): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(0, Math.floor(value))
}

export function normalizeIsoDateInput(value: unknown, fallback = currentIsoDate()): string | null {
  if (value === undefined) {
    return fallback
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const parsed = new Date(trimmed)

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.length > 0 ? error.message : 'AI request failed'
}

export function currentIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function getEnvValue(key: 'AI_MODEL' | 'AI_PROVIDER', fallback: string): string {
  const value = process.env[key]?.trim()

  return value && value.length > 0 ? value : fallback
}

function estimateCostUsd(): number {
  return 0
}
