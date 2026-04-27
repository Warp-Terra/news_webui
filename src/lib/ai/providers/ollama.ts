import type { AiConfig, AiMessage, AiProvider, AiResponse } from '../types'

export const OLLAMA_REQUEST_TIMEOUT_MS = 30_000

interface OllamaChatResponse {
  model?: string
  message?: {
    content?: string
  }
  done_reason?: string
  prompt_eval_count?: number
  eval_count?: number
}

export class OllamaProvider implements AiProvider {
  constructor(private readonly defaultConfig: AiConfig) {}

  async call(messages: AiMessage[], config?: Partial<AiConfig>): Promise<AiResponse> {
    const resolvedConfig = resolveConfig(this.defaultConfig, config)
    const response = await postWithTimeout(
      getChatUrl(resolvedConfig.baseUrl),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: resolvedConfig.model,
          messages,
          stream: false,
          options: {
            temperature: resolvedConfig.temperature,
            num_predict: resolvedConfig.maxTokens,
          },
        }),
      },
      OLLAMA_REQUEST_TIMEOUT_MS,
      `Ollama provider request timed out after ${OLLAMA_REQUEST_TIMEOUT_MS}ms.`,
    )

    if (!response.ok) {
      throw new Error(`Ollama provider request failed with status ${response.status}: ${await readErrorBody(response)}`)
    }

    const data = (await response.json()) as OllamaChatResponse

    return {
      content: data.message?.content ?? '',
      tokensIn: data.prompt_eval_count ?? 0,
      tokensOut: data.eval_count ?? 0,
      model: data.model ?? resolvedConfig.model,
      finishReason: data.done_reason ?? 'unknown',
    }
  }
}

function resolveConfig(defaultConfig: AiConfig, override?: Partial<AiConfig>): AiConfig {
  const resolvedConfig = { ...defaultConfig, ...override }

  if (!resolvedConfig.model) {
    throw new Error('Ollama provider requires a model.')
  }

  if (!resolvedConfig.baseUrl) {
    throw new Error('Ollama provider requires a baseUrl.')
  }

  return resolvedConfig
}

async function postWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
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

    throw new Error(`Ollama provider request failed: ${message}`)
  }
}

function getChatUrl(baseUrl: string | undefined): string {
  return `${trimTrailingSlash(baseUrl ?? '')}/api/chat`
}

async function readErrorBody(response: Response): Promise<string> {
  const body = await response.text()
  const fallback = response.statusText || 'Unknown error'

  return body.trim() || fallback
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, '')
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
