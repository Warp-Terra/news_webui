import type { AiConfig, AiMessage, AiProvider, AiResponse } from '../types'
import { DEFAULT_AI_REQUEST_TIMEOUT_MS } from '../env'

export const GEMINI_REQUEST_TIMEOUT_MS = DEFAULT_AI_REQUEST_TIMEOUT_MS

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
  }
}

export class GeminiProvider implements AiProvider {
  constructor(private readonly defaultConfig: AiConfig) {}

  async call(messages: AiMessage[], config?: Partial<AiConfig>): Promise<AiResponse> {
    const resolvedConfig = resolveConfig(this.defaultConfig, config)
    const { systemInstruction, contents } = toGeminiMessages(messages)
    const requestTimeoutMs = resolvedConfig.requestTimeoutMs ?? GEMINI_REQUEST_TIMEOUT_MS
    const response = await postWithTimeout(
      getGenerateContentUrl(resolvedConfig.baseUrl, resolvedConfig.model, resolvedConfig.apiKey),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction,
          contents,
          generationConfig: {
            temperature: resolvedConfig.temperature,
            maxOutputTokens: resolvedConfig.maxTokens,
          },
        }),
      },
      requestTimeoutMs,
      `Gemini provider request timed out after ${requestTimeoutMs}ms.`,
    )

    if (!response.ok) {
      throw new Error(`Gemini provider request failed with status ${response.status}: ${await readErrorBody(response)}`)
    }

    const data = (await response.json()) as GeminiGenerateContentResponse
    const candidate = data.candidates?.[0]

    return {
      content: candidate?.content?.parts?.map((part) => part.text ?? '').join('').trim() ?? '',
      tokensIn: data.usageMetadata?.promptTokenCount ?? 0,
      tokensOut: data.usageMetadata?.candidatesTokenCount ?? 0,
      model: resolvedConfig.model,
      finishReason: candidate?.finishReason ?? 'unknown',
    }
  }
}

function resolveConfig(defaultConfig: AiConfig, override?: Partial<AiConfig>): AiConfig {
  const resolvedConfig = { ...defaultConfig, ...override }

  if (!resolvedConfig.apiKey) {
    throw new Error('Gemini provider requires an API key.')
  }

  if (!resolvedConfig.model) {
    throw new Error('Gemini provider requires a model.')
  }

  if (!resolvedConfig.baseUrl) {
    throw new Error('Gemini provider requires a baseUrl.')
  }

  return resolvedConfig
}

function toGeminiMessages(messages: AiMessage[]): {
  systemInstruction?: { parts: Array<{ text: string }> }
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
} {
  const systemText = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n')
  const contents = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: message.content }],
    }))

  return {
    systemInstruction: systemText.length > 0 ? { parts: [{ text: systemText }] } : undefined,
    contents,
  }
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
    throw new Error(`Gemini provider request failed: ${message}`)
  }
}

function getGenerateContentUrl(baseUrl: string | undefined, model: string, apiKey: string): string {
  return `${trimTrailingSlash(baseUrl ?? '')}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
}

async function readErrorBody(response: Response): Promise<string> {
  const body = await response.text()

  return body.trim() || response.statusText || 'Unknown error'
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, '')
}
