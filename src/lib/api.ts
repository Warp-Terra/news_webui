import type { NewsItemWithStatus, NewsStatus, Source } from '@/lib/db'
import type { ImportanceLevel } from '@/app/types/news'

interface NewsListFilters {
  regions?: readonly string[]
  categories?: readonly string[]
  importanceLevels?: readonly string[]
  statuses?: readonly NewsStatus[]
}

interface ApiErrorBody {
  error?: unknown
}

interface RssFetchApiResponse {
  fetched: number
  errors: string[]
  sourcesChecked?: number
}

interface AiSummarizeApiResponse {
  success: boolean
  result: AiSummaryResult
}

interface AiBatchApiResponse {
  processed: number
  success: number
  failed: number
  errors?: string[]
}

export interface NewsListResponse {
  items: NewsItemWithStatus[]
  count: number
}

export interface RssFetchResult {
  fetched: number
  errors: string[]
}

export interface AiSummaryResult {
  summary: string
  keyPoints: string[]
  impact: string
  importance: ImportanceLevel
  tags: string[]
  tokensIn: number
  tokensOut: number
}

export interface AiBatchSummaryResult {
  processed: number
  success: number
  failed: number
}

export interface DailyReportResult {
  markdown: string
  newsCount: number
  tokensIn: number
  tokensOut: number
}

export type AiUsageOperation = 'summarize' | 'aggregate' | 'daily-report'

export interface AiUsageItem {
  id?: number
  date: string
  model: string
  provider: string
  tokensIn: number
  tokensOut: number
  costUsd: number
  newsId?: string | null
  operation: AiUsageOperation
  createdAt: string
}

export interface AiUsageResponse {
  items: AiUsageItem[]
  totalTokens: number
  totalCost: number
}

export type AiProviderName = 'openai' | 'deepseek' | 'anthropic' | 'gemini' | 'ollama' | 'custom'

export interface AiSettingsResponse {
  configured: boolean
  provider: AiProviderName
  apiKey: ''
  apiKeyMasked: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  requestTimeoutMs: number
  updatedAt?: string
}

export interface AiSettingsPayload {
  provider: AiProviderName
  apiKey?: string
  baseUrl?: string
  model: string
  temperature?: number
  maxTokens?: number
  requestTimeoutMs?: number
}

export interface AiConnectionTestResult {
  success: boolean
  model: string
  tokensIn: number
  tokensOut: number
}

export type NewsSource = Source

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function fetchNewsList(
  filters: NewsListFilters = {},
  searchQuery = '',
): Promise<NewsListResponse> {
  const searchParams = new URLSearchParams()
  appendCsvParam(searchParams, 'regions', filters.regions)
  appendCsvParam(searchParams, 'categories', filters.categories)
  appendCsvParam(searchParams, 'importanceLevels', filters.importanceLevels)
  appendCsvParam(searchParams, 'status', filters.statuses)

  const normalizedSearchQuery = searchQuery.trim()
  if (normalizedSearchQuery.length > 0) {
    searchParams.set('search', normalizedSearchQuery)
  }

  const query = searchParams.toString()
  const endpoint = query.length > 0 ? `/api/news?${query}` : '/api/news'

  return requestJson<NewsListResponse>(endpoint)
}

export async function fetchNewsItem(id: string): Promise<NewsItemWithStatus | null> {
  const response = await fetch(`/api/news/${encodeURIComponent(id)}`)

  if (response.status === 404) {
    return null
  }

  await assertOk(response)

  return response.json() as Promise<NewsItemWithStatus>
}

export async function updateNewsStatus(id: string, status: NewsStatus): Promise<void> {
  await requestJson<{ success: boolean }>(`/api/news/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

export async function deleteNewsItem(id: string): Promise<void> {
  await requestJson<{ success: boolean }>(`/api/news/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function triggerRssFetch(): Promise<RssFetchResult> {
  const result = await requestJson<RssFetchApiResponse>('/api/fetch', { method: 'POST' })

  return {
    fetched: result.fetched,
    errors: result.errors,
  }
}

export async function summarizeNewsItem(id: string): Promise<AiSummaryResult> {
  const response = await requestJson<AiSummarizeApiResponse>('/api/ai/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })

  return response.result
}

export async function batchSummarize(limit?: number): Promise<AiBatchSummaryResult> {
  const payload = limit === undefined ? {} : { limit }
  const result = await requestJson<AiBatchApiResponse>('/api/ai/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return {
    processed: result.processed,
    success: result.success,
    failed: result.failed,
  }
}

export async function generateDailyReport(date?: string): Promise<DailyReportResult> {
  const payload = date === undefined ? {} : { date }

  return requestJson<DailyReportResult>('/api/ai/daily-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function fetchAiUsage(startDate?: string, endDate?: string): Promise<AiUsageResponse> {
  const searchParams = new URLSearchParams()

  if (startDate) {
    searchParams.set('startDate', startDate)
  }

  if (endDate) {
    searchParams.set('endDate', endDate)
  }

  const query = searchParams.toString()
  const endpoint = query.length > 0 ? `/api/ai/usage?${query}` : '/api/ai/usage'

  return requestJson<AiUsageResponse>(endpoint)
}

export async function fetchAiSettings(): Promise<AiSettingsResponse> {
  return requestJson<AiSettingsResponse>('/api/ai/settings')
}

export async function saveAiSettings(payload: AiSettingsPayload): Promise<AiSettingsResponse> {
  return requestJson<AiSettingsResponse>('/api/ai/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function testAiSettings(payload: Partial<AiSettingsPayload> = {}): Promise<AiConnectionTestResult> {
  return requestJson<AiConnectionTestResult>('/api/ai/settings/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function fetchSourcesList(): Promise<NewsSource[]> {
  return requestJson<NewsSource[]>('/api/sources')
}

export async function createSource(data: Omit<NewsSource, 'id'>): Promise<NewsSource> {
  return requestJson<NewsSource>('/api/sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateSource(id: number, data: Partial<NewsSource>): Promise<void> {
  await requestJson<{ success: boolean }>(`/api/sources/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteSource(id: number): Promise<void> {
  await requestJson<{ success: boolean }>(`/api/sources/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  })
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = init === undefined ? await fetch(input) : await fetch(input, init)

  await assertOk(response)

  return response.json() as Promise<T>
}

async function assertOk(response: Response): Promise<void> {
  if (response.ok) {
    return
  }

  throw new ApiError(await readErrorMessage(response), response.status)
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody

    if (typeof body.error === 'string' && body.error.length > 0) {
      return body.error
    }
  } catch {
    // Ignore malformed or non-JSON error bodies and fall back to status text.
  }

  return response.statusText || `Request failed with status ${response.status}`
}

function appendCsvParam(
  searchParams: URLSearchParams,
  key: string,
  values: readonly string[] | undefined,
) {
  if (values && values.length > 0) {
    searchParams.set(key, values.join(','))
  }
}
