import type { AiSettings } from '@/lib/db'

import {
  AI_PROVIDER_DEFINITIONS,
  getDefaultBaseUrl,
  type AiProviderDefinition,
  type AiReasoningEffort,
} from './provider-registry'
import type { AiConfig } from './types'

export interface PublicAiSettings {
  configured: boolean
  providers: readonly AiProviderDefinition[]
  provider: AiConfig['provider']
  apiKey: ''
  apiKeyMasked: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  reasoningEffort: AiReasoningEffort | ''
  enableThinking: boolean | null
  requestTimeoutMs: number
  updatedAt?: string
}

export const DEFAULT_AI_SETTINGS: Omit<AiSettings, 'apiKey' | 'updatedAt'> = {
  provider: 'openai',
  baseUrl: getDefaultBaseUrl('openai'),
  model: '',
  temperature: 0.7,
  maxTokens: 2048,
  reasoningEffort: null,
  enableThinking: null,
  requestTimeoutMs: 30000,
}

export const DEFAULT_BASE_URLS = Object.fromEntries(
  AI_PROVIDER_DEFINITIONS.map((provider) => [provider.id, provider.defaultBaseUrl]),
) as Record<AiConfig['provider'], string>

export function toPublicAiSettings(settings: AiSettings | null): PublicAiSettings {
  if (!settings) {
    return {
      ...DEFAULT_AI_SETTINGS,
      configured: false,
      providers: AI_PROVIDER_DEFINITIONS,
      apiKey: '',
      apiKeyMasked: '',
      reasoningEffort: '',
      enableThinking: null,
    }
  }

  return {
    configured: isAiSettingsConfigured(settings),
    providers: AI_PROVIDER_DEFINITIONS,
    provider: settings.provider,
    apiKey: '',
    apiKeyMasked: maskApiKey(settings.apiKey),
    baseUrl: settings.baseUrl,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    reasoningEffort: settings.reasoningEffort ?? '',
    enableThinking: settings.enableThinking,
    requestTimeoutMs: settings.requestTimeoutMs,
    updatedAt: settings.updatedAt,
  }
}

export function isAiSettingsConfigured(settings: Pick<AiSettings, 'provider' | 'apiKey' | 'model'>): boolean {
  return settings.model.trim().length > 0 && (settings.provider === 'ollama' || settings.apiKey.trim().length > 0)
}

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (trimmed.length === 0) {
    return ''
  }
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`
  }

  return `${trimmed.slice(0, 4)}************${trimmed.slice(-4)}`
}

export function toAiConfig(settings: AiSettings): AiConfig {
  const config: AiConfig = {
    provider: settings.provider,
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    requestTimeoutMs: settings.requestTimeoutMs,
  }

  if (settings.reasoningEffort) {
    config.reasoningEffort = settings.reasoningEffort
  }

  if (settings.enableThinking !== null) {
    config.enableThinking = settings.enableThinking
  }

  return config
}
