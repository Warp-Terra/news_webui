import { createProviderFromConfig } from '@/lib/ai/provider'
import { getAiSettings, type AiProviderName, type AiSettings } from '@/lib/db'
import { DEFAULT_BASE_URLS, toAiConfig } from '@/lib/ai/settings'
import {
  getModelDefinition,
  getProviderDefinition,
  isAiProviderName,
  type AiReasoningEffort,
} from '@/lib/ai/provider-registry'

import { jsonError, readJsonObject, withDb } from '../../../route-utils'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  const body = (await readJsonObject(request)) ?? {}

  return withDb(async (db) => {
    const config = body.provider ? parseConfigFromBody(body, getAiSettings(db)) : getSavedConfig(getAiSettings(db))
    if ('error' in config) {
      return jsonError(config.error, 400)
    }

    try {
      const provider = createProviderFromConfig(config.config)
      const result = await provider.call([{ role: 'user', content: 'Reply with ok.' }])

      return Response.json({ success: true, model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut })
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : String(error), 502)
    }
  })
}

function getSavedConfig(settings: AiSettings | null): { config: ReturnType<typeof toAiConfig> } | { error: string } {
  if (!settings) {
    return { error: 'AI settings are not configured' }
  }

  return { config: toAiConfig(settings) }
}

function parseConfigFromBody(
  body: Record<string, unknown>,
  current: AiSettings | null,
): { config: ReturnType<typeof toAiConfig> } | { error: string } {
  const provider = parseProvider(body.provider)
  if (!provider) {
    return { error: 'Unsupported AI provider' }
  }

  const model = parseString(body.model)
  if (!model) {
    return { error: 'AI model is required' }
  }

  const providerDefinition = getProviderDefinition(provider)
  const modelDefinition = getModelDefinition(provider, model)
  const apiKey = parseString(body.apiKey) ?? current?.apiKey ?? ''
  if (providerDefinition.requiresApiKey && apiKey.length === 0) {
    return { error: 'AI API key is required' }
  }

  const reasoningEffort = parseReasoningEffort(body.reasoningEffort, current?.reasoningEffort ?? null)
  if ('error' in reasoningEffort) {
    return reasoningEffort
  }

  const enableThinking = parseNullableBoolean(body.enableThinking, current?.enableThinking ?? null)
  if ('error' in enableThinking) {
    return enableThinking
  }

  const config: ReturnType<typeof toAiConfig> = {
    provider,
    apiKey,
    baseUrl: parseString(body.baseUrl) ?? DEFAULT_BASE_URLS[provider],
    model,
    temperature: parseNumber(body.temperature, current?.temperature ?? 0.7),
    maxTokens: parseInteger(body.maxTokens, current?.maxTokens ?? 2048),
    requestTimeoutMs: parseInteger(body.requestTimeoutMs, current?.requestTimeoutMs ?? 30000),
  }

  if (modelDefinition?.capabilities.reasoningEffort && reasoningEffort.value) {
    config.reasoningEffort = reasoningEffort.value
  }

  if (modelDefinition?.capabilities.enableThinking && enableThinking.value !== null) {
    config.enableThinking = enableThinking.value
  }

  return { config }
}

function parseProvider(value: unknown): AiProviderName | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim().toLowerCase()

  return isAiProviderName(normalized) ? normalized : null
}

function parseString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function parseNumber(value: unknown, fallback: number): number {
  return value === undefined ? fallback : Number(value)
}

function parseInteger(value: unknown, fallback: number): number {
  return Math.floor(parseNumber(value, fallback))
}

function parseReasoningEffort(
  value: unknown,
  fallback: AiReasoningEffort | null,
): { value: AiReasoningEffort | null } | { error: string } {
  if (value === undefined || value === null || value === '') {
    return { value: fallback }
  }

  if (value === 'low' || value === 'medium' || value === 'high') {
    return { value }
  }

  return { error: 'AI reasoningEffort must be one of: low, medium, high' }
}

function parseNullableBoolean(value: unknown, fallback: boolean | null): { value: boolean | null } | { error: string } {
  if (value === undefined || value === null || value === '') {
    return { value: fallback }
  }

  if (typeof value === 'boolean') {
    return { value }
  }

  return { error: 'AI enableThinking must be a boolean' }
}
