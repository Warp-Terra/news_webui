import type { AiProviderName, AiReasoningEffort } from './provider-registry'

export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiConfig {
  provider: AiProviderName
  apiKey: string
  baseUrl?: string
  model: string
  temperature?: number
  maxTokens?: number
  reasoningEffort?: AiReasoningEffort
  enableThinking?: boolean
  requestTimeoutMs?: number
}

export interface AiResponse {
  content: string
  tokensIn: number
  tokensOut: number
  model: string
  finishReason: string
}

export interface AiProvider {
  call(messages: AiMessage[], config?: Partial<AiConfig>): Promise<AiResponse>
}
