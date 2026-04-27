import type { AiConfig, AiMessage, AiProvider, AiResponse } from '../types'
import { DEFAULT_AI_REQUEST_TIMEOUT_MS } from '../env'

export const ANTHROPIC_REQUEST_TIMEOUT_MS = DEFAULT_AI_REQUEST_TIMEOUT_MS

interface AnthropicMessagesResponse {
  model?: string
  content?: Array<{ type?: string; text?: string }>
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
  stop_reason?: string | null
}

export class AnthropicProvider implements AiProvider {
  constructor(private readonly defaultConfig: AiConfig) {}

  async call(messages: AiMessage[], config?: Partial<AiConfig>): Promise<AiResponse> {
    const resolvedConfig = resolveConfig(this.defaultConfig, config)
    const { system, chatMessages } = splitSystemMessages(messages)
    const requestTimeoutMs = resolvedConfig.requestTimeoutMs ?? ANTHROPIC_REQUEST_TIMEOUT_MS
    const response = await postWithTimeout(
      getMessagesUrl(resolvedConfig.baseUrl),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': resolvedConfig.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: resolvedConfig.model,
          system,
          messages: chatMessages,
          temperature: resolvedConfig.temperature,
          max_tokens: resolvedConfig.maxTokens,
        }),
      },
      requestTimeoutMs,
      `Anthropic provider request timed out after ${requestTimeoutMs}ms.`,
    )

    if (!response.ok) {
      throw new Error(`Anthropic provider request failed with status ${response.status}: ${await readErrorBody(response)}`)
    }

    const data = (await response.json()) as AnthropicMessagesResponse

    return {
      content: data.content?.map((item) => item.text ?? '').join('').trim() ?? '',
      tokensIn: data.usage?.input_tokens ?? 0,
      tokensOut: data.usage?.output_tokens ?? 0,
      model: data.model ?? resolvedConfig.model,
      finishReason: data.stop_reason ?? 'unknown',
    }
  }
}

function resolveConfig(defaultConfig: AiConfig, override?: Partial<AiConfig>): AiConfig {
  const resolvedConfig = { ...defaultConfig, ...override }

  if (!resolvedConfig.apiKey) {
    throw new Error('Anthropic provider requires an API key.')
  }

  if (!resolvedConfig.model) {
    throw new Error('Anthropic provider requires a model.')
  }

  if (!resolvedConfig.baseUrl) {
    throw new Error('Anthropic provider requires a baseUrl.')
  }

  return resolvedConfig
}

function splitSystemMessages(messages: AiMessage[]): { system: string; chatMessages: Array<{ role: 'user' | 'assistant'; content: string }> } {
  const system = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n')
  const chatMessages = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({ role: message.role as 'user' | 'assistant', content: message.content }))

  return { system, chatMessages }
}

async function postWithTimeout(url: string, init: RequestInit, timeoutMs: number, timeoutMessage: string): Promise<Response> {
  const controller = new AbortController()
  const timeoutPromise = new Promise<Response>((_, reject) => {
    setTimeout(() => {
      controller.abort()
      reject(new Error(timeoutMessage))
    }, timeoutMs)
  })

  try {
    return await Promise.race([fetch(url, { ...init, signal: controller.signal }), timeoutPromise])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === timeoutMessage) {
      throw error
    }
    throw new Error(`Anthropic provider request failed: ${message}`)
  }
}

function getMessagesUrl(baseUrl: string | undefined): string {
  return `${trimTrailingSlash(baseUrl ?? '')}/messages`
}

async function readErrorBody(response: Response): Promise<string> {
  const body = await response.text()

  return body.trim() || response.statusText || 'Unknown error'
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, '')
}
