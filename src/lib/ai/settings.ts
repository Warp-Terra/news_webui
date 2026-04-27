import type { AiSettings } from '@/lib/db'

import { getAiRequestTimeoutMs } from './env'
import type { AiConfig } from './types'

export interface PublicAiSettings {
  configured: boolean
  provider: AiConfig['provider']
  apiKey: ''
  apiKeyMasked: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  requestTimeoutMs: number
  updatedAt?: string
}

export const DEFAULT_AI_SETTINGS: Omit<AiSettings, 'apiKey' | 'updatedAt'> = {
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  model: '',
  temperature: 0.7,
  maxTokens: 2048,
  requestTimeoutMs: 30000,
}

export const DEFAULT_BASE_URLS: Record<AiConfig['provider'], string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  ollama: 'http://localhost:11434',
  custom: 'https://api.openai.com/v1',
}

export function toPublicAiSettings(settings: AiSettings | null): PublicAiSettings {
  if (!settings) {
    return {
      configured: false,
      apiKey: '',
      apiKeyMasked: '',
      ...DEFAULT_AI_SETTINGS,
    }
  }

  return {
    configured: isAiSettingsConfigured(settings),
    provider: settings.provider,
    apiKey: '',
    apiKeyMasked: maskApiKey(settings.apiKey),
    baseUrl: settings.baseUrl,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
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
  return {
    provider: settings.provider,
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    requestTimeoutMs: settings.requestTimeoutMs,
  }
}
