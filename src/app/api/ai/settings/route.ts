import { getAiSettings, upsertAiSettings, type AiProviderName, type AiSettings } from '@/lib/db'
import { DEFAULT_BASE_URLS, toPublicAiSettings } from '@/lib/ai/settings'

import { jsonError, readJsonObject, withDb } from '../../route-utils'

export const runtime = 'nodejs'

const SUPPORTED_PROVIDERS: AiProviderName[] = ['openai', 'deepseek', 'anthropic', 'gemini', 'ollama', 'custom']

export async function GET(): Promise<Response> {
  return withDb((db) => Response.json(toPublicAiSettings(getAiSettings(db))))
}

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonObject(request)

  return withDb((db) => {
    const current = getAiSettings(db)
    const parsed = parseAiSettingsInput(body, current)

    if ('error' in parsed) {
      return jsonError(parsed.error, 400)
    }

    const saved = upsertAiSettings(db, parsed.settings)

    return Response.json(toPublicAiSettings(saved))
  })
}

function parseAiSettingsInput(
  body: Record<string, unknown> | null,
  current: AiSettings | null,
): { settings: Omit<AiSettings, 'updatedAt'> } | { error: string } {
  if (!body) {
    return { error: 'Invalid request body' }
  }

  const provider = parseProvider(body.provider)
  if (!provider) {
    return { error: 'Unsupported AI provider' }
  }

  const model = parseString(body.model)
  if (!model) {
    return { error: 'AI model is required' }
  }

  const apiKeyInput = parseString(body.apiKey)
  const apiKey = apiKeyInput ?? current?.apiKey ?? ''
  if (provider !== 'ollama' && apiKey.trim().length === 0) {
    return { error: 'AI API key is required' }
  }

  const baseUrl = parseString(body.baseUrl) ?? DEFAULT_BASE_URLS[provider]
  const temperature = parseNumber(body.temperature, current?.temperature ?? 0.7)
  const maxTokens = parseInteger(body.maxTokens, current?.maxTokens ?? 2048)
  const requestTimeoutMs = parseInteger(body.requestTimeoutMs, current?.requestTimeoutMs ?? 30000)

  if (!Number.isFinite(temperature)) {
    return { error: 'AI temperature must be a finite number' }
  }

  if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
    return { error: 'AI maxTokens must be a positive integer' }
  }

  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
    return { error: 'AI requestTimeoutMs must be a positive integer' }
  }

  return {
    settings: {
      provider,
      apiKey,
      baseUrl,
      model,
      temperature,
      maxTokens,
      requestTimeoutMs,
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
  if (value === undefined) {
    return fallback
  }

  return typeof value === 'number' ? value : Number(value)
}

function parseInteger(value: unknown, fallback: number): number {
  return Math.floor(parseNumber(value, fallback))
}
