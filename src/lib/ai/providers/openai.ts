import type { AiConfig, AiMessage, AiProvider, AiResponse } from '../types'
import { DEFAULT_AI_REQUEST_TIMEOUT_MS } from '../env'

export const OPENAI_REQUEST_TIMEOUT_MS = DEFAULT_AI_REQUEST_TIMEOUT_MS

interface OpenAiCompletionResponse {
  model?: string
  choices?: Array<{
    message?: {
      content?: string
    }
    finish_reason?: string | null
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
  }
}

export class OpenAiProvider implements AiProvider {
  constructor(private readonly defaultConfig: AiConfig) {}

  async call(messages: AiMessage[], config?: Partial<AiConfig>): Promise<AiResponse> {
    const resolvedConfig = resolveConfig(this.defaultConfig, config)
    const providerName = getProviderDisplayName(resolvedConfig.provider)
    const requestTimeoutMs = resolvedConfig.requestTimeoutMs ?? OPENAI_REQUEST_TIMEOUT_MS
    const response = await postWithTimeout(
      getChatCompletionsUrl(resolvedConfig.baseUrl),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resolvedConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: resolvedConfig.model,
          messages,
          temperature: resolvedConfig.temperature,
          max_tokens: resolvedConfig.maxTokens,
        }),
      },
      requestTimeoutMs,
      `${providerName} provider request timed out after ${requestTimeoutMs}ms.`,
      providerName,
    )

    if (!response.ok) {
      throw new Error(
        `${providerName} provider request failed with status ${response.status}: ${await readErrorBody(response)}`,
      )
    }

    const data = (await response.json()) as OpenAiCompletionResponse
    const choice = data.choices?.[0]

    return {
      content: choice?.message?.content ?? '',
      tokensIn: data.usage?.prompt_tokens ?? 0,
      tokensOut: data.usage?.completion_tokens ?? 0,
      model: data.model ?? resolvedConfig.model,
      finishReason: choice?.finish_reason ?? 'unknown',
    }
  }
}

function resolveConfig(defaultConfig: AiConfig, override?: Partial<AiConfig>): AiConfig {
  const resolvedConfig = { ...defaultConfig, ...override }

  if (!resolvedConfig.apiKey) {
    throw new Error(`${getProviderDisplayName(resolvedConfig.provider)} provider requires an API key.`)
  }

  if (!resolvedConfig.model) {
    throw new Error(`${getProviderDisplayName(resolvedConfig.provider)} provider requires a model.`)
  }

  if (!resolvedConfig.baseUrl) {
    throw new Error(`${getProviderDisplayName(resolvedConfig.provider)} provider requires a baseUrl.`)
  }

  return resolvedConfig
}

async function postWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
  providerName: string,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutPromise = new Promise<Response>((_, reject) => {
    setTimeout(() => {
      controller.abort()
      reject(new Error(timeoutMessage))
    }, timeoutMs)
  })

  try {
    return await Promise.race([
      fetch(url, {
        ...init,
        signal: controller.signal,
      }),
      timeoutPromise,
    ])
  } catch (error) {
    const message = getErrorMessage(error)

    if (message === timeoutMessage) {
      throw error
    }

    throw new Error(`${providerName} provider request failed: ${message}`)
  }
}

function getChatCompletionsUrl(baseUrl: string | undefined): string {
  return `${trimTrailingSlash(baseUrl ?? '')}/chat/completions`
}

async function readErrorBody(response: Response): Promise<string> {
  const body = await response.text()
  const fallback = response.statusText || 'Unknown error'

  return body.trim() || fallback
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, '')
}

function getProviderDisplayName(provider: AiConfig['provider']): string {
  switch (provider) {
    case 'deepseek':
      return 'DeepSeek'
    case 'custom':
      return 'Custom OpenAI-compatible'
    case 'ollama':
      return 'Ollama'
    case 'openai':
      return 'OpenAI'
    default:
      return 'OpenAI'
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
