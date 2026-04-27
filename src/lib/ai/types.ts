export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiConfig {
  provider: 'openai' | 'deepseek' | 'anthropic' | 'gemini' | 'ollama' | 'custom'
  apiKey: string
  baseUrl?: string
  model: string
  temperature?: number
  maxTokens?: number
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
