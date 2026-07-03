import type { AiConfig, AiProvider } from './types'
import { AnthropicProvider } from './providers/anthropic'
import { getAiRequestTimeoutMs } from './env'
import { GeminiProvider } from './providers/gemini'
import { OpenAiProvider } from './providers/openai'
import { OllamaProvider } from './providers/ollama'
import {
  AI_PROVIDER_IDS,
  getDefaultBaseUrl,
  getProviderDefinition,
  isAiProviderName,
  type AiProviderName,
  type AiReasoningEffort,
} from './provider-registry'

const DEFAULT_PROVIDER: AiProviderName = 'openai'
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_MAX_TOKENS = 2048

export function createProvider(): AiProvider {
  const config = getAiConfig()

  return createProviderFromConfig(config)
}

export function createProviderFromConfig(config: AiConfig): AiProvider {
  switch (config.provider) {
    case 'openai':
    case 'deepseek':
    case 'qwen':
    case 'kimi':
    case 'glm':
    case 'custom':
      return new OpenAiProvider(config)
    case 'anthropic':
      return new AnthropicProvider(config)
    case 'gemini':
      return new GeminiProvider(config)
    case 'ollama':
      return new OllamaProvider(config)
    default:
      return assertNever(config.provider)
  }
}

export function getAiConfig(): AiConfig {
  const provider = parseProvider(process.env.AI_PROVIDER)
  const providerDefinition = getProviderDefinition(provider)
  const apiKey = normalizeEnv(process.env.AI_API_KEY) ?? ''
  const model = normalizeEnv(process.env.AI_MODEL)
  const baseUrl = normalizeEnv(process.env.AI_BASE_URL) ?? getDefaultBaseUrl(provider)
  const temperature = parseOptionalNumber(process.env.AI_TEMPERATURE, DEFAULT_TEMPERATURE, 'AI_TEMPERATURE')
  const maxTokens = parseOptionalInteger(process.env.AI_MAX_TOKENS, DEFAULT_MAX_TOKENS, 'AI_MAX_TOKENS')
  const reasoningEffort = parseOptionalReasoningEffort(process.env.AI_REASONING_EFFORT)
  const enableThinking = parseOptionalBoolean(process.env.AI_ENABLE_THINKING, 'AI_ENABLE_THINKING')
  const requestTimeoutMs = getAiRequestTimeoutMs()

  if (!model) {
    throw new Error(`AI_MODEL is required for ${provider} provider.`)
  }

  if (providerDefinition.requiresApiKey && !apiKey) {
    throw new Error(`AI_API_KEY is required for ${provider} provider.`)
  }

  const config: AiConfig = {
    provider,
    apiKey,
    baseUrl,
    model,
    temperature,
    maxTokens,
    requestTimeoutMs,
  }

  if (reasoningEffort !== undefined) {
    config.reasoningEffort = reasoningEffort
  }

  if (enableThinking !== undefined) {
    config.enableThinking = enableThinking
  }

  return config
}

function parseProvider(value: string | undefined): AiProviderName {
  const normalized = normalizeEnv(value)?.toLowerCase() ?? DEFAULT_PROVIDER

  if (isAiProviderName(normalized)) {
    return normalized
  }

  throw new Error(
    `Unsupported AI_PROVIDER "${normalized}". Supported providers: ${AI_PROVIDER_IDS.join(', ')}.`,
  )
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

function parseOptionalReasoningEffort(value: string | undefined): AiReasoningEffort | undefined {
  const normalized = normalizeEnv(value)?.toLowerCase()

  if (!normalized) {
    return undefined
  }

  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized
  }

  throw new Error('AI_REASONING_EFFORT must be one of: low, medium, high.')
}

function parseOptionalBoolean(value: string | undefined, envName: string): boolean | undefined {
  const normalized = normalizeEnv(value)?.toLowerCase()

  if (!normalized) {
    return undefined
  }

  if (normalized === 'true') {
    return true
  }

  if (normalized === 'false') {
    return false
  }

  throw new Error(`${envName} must be true or false.`)
}

function normalizeEnv(value: string | undefined): string | undefined {
  const normalized = value?.trim()

  return normalized && normalized.length > 0 ? normalized : undefined
}

function assertNever(value: never): never {
  throw new Error(`Unsupported AI provider: ${String(value)}`)
}
