import { createProviderFromConfig } from '@/lib/ai/provider'
import { getAiSettings, type AiProviderName, type AiSettings } from '@/lib/db'
import { DEFAULT_BASE_URLS, toAiConfig } from '@/lib/ai/settings'

import { jsonError, readJsonObject, withDb } from '../../../route-utils'

export const runtime = 'nodejs'

const SUPPORTED_PROVIDERS: AiProviderName[] = ['openai', 'deepseek', 'anthropic', 'gemini', 'ollama', 'custom']

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
  const apiKey = parseString(body.apiKey) ?? current?.apiKey ?? ''
  if (provider !== 'ollama' && apiKey.length === 0) {
    return { error: 'AI API key is required' }
  }

  return {
    config: {
      provider,
      apiKey,
      baseUrl: parseString(body.baseUrl) ?? DEFAULT_BASE_URLS[provider],
      model,
      temperature: parseNumber(body.temperature, current?.temperature ?? 0.7),
      maxTokens: parseInteger(body.maxTokens, current?.maxTokens ?? 2048),
    },
  }
}

function parseProvider(value: unknown): AiProviderName | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim().toLowerCase()

  return SUPPORTED_PROVIDERS.includes(normalized as AiProviderName) ? (normalized as AiProviderName) : null
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
