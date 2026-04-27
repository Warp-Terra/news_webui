import type { AiConfig, AiProvider } from './types'
import { OpenAiProvider } from './providers/openai'
import { OllamaProvider } from './providers/ollama'

type SupportedProvider = AiConfig['provider']

const SUPPORTED_PROVIDERS = ['openai', 'deepseek', 'ollama'] as const satisfies readonly SupportedProvider[]
const DEFAULT_PROVIDER: SupportedProvider = 'openai'
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_MAX_TOKENS = 2048

const DEFAULT_BASE_URLS: Record<SupportedProvider, string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  ollama: 'http://localhost:11434',
}

export function createProvider(): AiProvider {
  const config = getAiConfig()

  switch (config.provider) {
    case 'openai':
    case 'deepseek':
      return new OpenAiProvider(config)
    case 'ollama':
      return new OllamaProvider(config)
    default:
      return assertNever(config.provider)
  }
}

export function getAiConfig(): AiConfig {
  const provider = parseProvider(process.env.AI_PROVIDER)
  const apiKey = normalizeEnv(process.env.AI_API_KEY) ?? ''
  const model = normalizeEnv(process.env.AI_MODEL)
  const baseUrl = normalizeEnv(process.env.AI_BASE_URL) ?? DEFAULT_BASE_URLS[provider]
  const temperature = parseOptionalNumber(process.env.AI_TEMPERATURE, DEFAULT_TEMPERATURE, 'AI_TEMPERATURE')
  const maxTokens = parseOptionalInteger(process.env.AI_MAX_TOKENS, DEFAULT_MAX_TOKENS, 'AI_MAX_TOKENS')

  if (!model) {
    throw new Error(`AI_MODEL is required for ${provider} provider.`)
  }

  if (provider !== 'ollama' && !apiKey) {
    throw new Error(`AI_API_KEY is required for ${provider} provider.`)
  }

  return {
    provider,
    apiKey,
    baseUrl,
    model,
    temperature,
    maxTokens,
  }
}

function parseProvider(value: string | undefined): SupportedProvider {
  const normalized = normalizeEnv(value)?.toLowerCase() ?? DEFAULT_PROVIDER

  if (isSupportedProvider(normalized)) {
    return normalized
  }

  throw new Error(
    `Unsupported AI_PROVIDER "${normalized}". Supported providers: ${SUPPORTED_PROVIDERS.join(', ')}.`,
  )
}

function isSupportedProvider(value: string): value is SupportedProvider {
  return SUPPORTED_PROVIDERS.includes(value as SupportedProvider)
}

function parseOptionalNumber(value: string | undefined, defaultValue: number, envName: string): number {
  const normalized = normalizeEnv(value)

  if (!normalized) {
    return defaultValue
  }

  const parsed = Number(normalized)

  if (!Number.isFinite(parsed)) {
    throw new Error(`${envName} must be a finite number.`)
  }

  return parsed
}

function parseOptionalInteger(value: string | undefined, defaultValue: number, envName: string): number {
  const parsed = parseOptionalNumber(value, defaultValue, envName)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive integer.`)
  }

  return parsed
}

function normalizeEnv(value: string | undefined): string | undefined {
  const normalized = value?.trim()

  return normalized && normalized.length > 0 ? normalized : undefined
}

function assertNever(value: never): never {
  throw new Error(`Unsupported AI provider: ${String(value)}`)
}
