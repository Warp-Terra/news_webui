import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AiConfig, AiMessage } from '../types'
import { OllamaProvider } from './ollama'

const fetchMock = vi.fn()

const messages: AiMessage[] = [
  { role: 'system', content: 'You summarize global news.' },
  { role: 'user', content: 'Summarize this article.' },
]

const baseConfig = {
  provider: 'ollama',
  apiKey: '',
  baseUrl: 'http://localhost:11434',
  model: 'llama3.1',
  temperature: 0.4,
  maxTokens: 512,
} satisfies AiConfig

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('OllamaProvider', () => {
  it('按 Ollama /api/chat 格式正确构造请求体', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        model: 'llama3.1',
        message: { role: 'assistant', content: 'Local summary' },
        done_reason: 'stop',
        prompt_eval_count: 11,
        eval_count: 7,
      }),
    )

    await new OllamaProvider(baseConfig).call(messages)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:11434/api/chat')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'llama3.1',
      messages,
      stream: false,
      options: {
        temperature: 0.4,
        num_predict: 512,
      },
    })
  })

  it('正确解析 Ollama 响应', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        model: 'llama3.1',
        message: { role: 'assistant', content: 'Geopolitical pressure is easing.' },
        done_reason: 'stop',
        prompt_eval_count: 14,
        eval_count: 8,
      }),
    )

    await expect(new OllamaProvider(baseConfig).call(messages)).resolves.toEqual({
      content: 'Geopolitical pressure is easing.',
      tokensIn: 14,
      tokensOut: 8,
      model: 'llama3.1',
      finishReason: 'stop',
    })
  })

  it('错误响应会抛出包含 provider 名称和状态码的错误', async () => {
    fetchMock.mockResolvedValue(new Response('ollama daemon unavailable', { status: 500, statusText: 'Server Error' }))

    await expect(new OllamaProvider(baseConfig).call(messages)).rejects.toThrow(
      /Ollama provider request failed with status 500: ollama daemon unavailable/i,
    )
  })
})

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}
