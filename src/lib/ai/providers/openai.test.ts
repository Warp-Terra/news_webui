import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AiConfig, AiMessage } from '../types'
import { OPENAI_REQUEST_TIMEOUT_MS, OpenAiProvider } from './openai'

const fetchMock = vi.fn()

const messages: AiMessage[] = [
  { role: 'system', content: 'You summarize global news.' },
  { role: 'user', content: 'Summarize this article.' },
]

const baseConfig = {
  provider: 'openai',
  apiKey: 'sk-openai-test',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2048,
} satisfies AiConfig

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('OpenAiProvider', () => {
  it('按 OpenAI 兼容格式正确构造请求体', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        model: 'gpt-4o-mini',
        choices: [{ message: { content: 'Short summary' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 12, completion_tokens: 6 },
      }),
    )

    await new OpenAiProvider(baseConfig).call(messages)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer sk-openai-test',
    })
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    })
  })

  it('正确解析 OpenAI 兼容响应', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        model: 'gpt-4o-mini',
        choices: [{ message: { content: 'Market risks are rising.' }, finish_reason: 'length' }],
        usage: { prompt_tokens: 18, completion_tokens: 9 },
      }),
    )

    await expect(new OpenAiProvider(baseConfig).call(messages)).resolves.toEqual({
      content: 'Market risks are rising.',
      tokensIn: 18,
      tokensOut: 9,
      model: 'gpt-4o-mini',
      finishReason: 'length',
    })
  })

  it('4xx/5xx 响应会抛出包含 provider 名称和状态码的错误', async () => {
    fetchMock.mockResolvedValue(new Response('quota exceeded', { status: 429, statusText: 'Too Many Requests' }))

    await expect(new OpenAiProvider(baseConfig).call(messages)).rejects.toThrow(
      /OpenAI provider request failed with status 429: quota exceeded/i,
    )
  })

  it('请求超时时会抛出可诊断错误', async () => {
    vi.useFakeTimers()
    fetchMock.mockReturnValue(new Promise<Response>(() => undefined))

    const assertion = expect(new OpenAiProvider(baseConfig).call(messages)).rejects.toThrow(
      /OpenAI provider request timed out/i,
    )
    await vi.advanceTimersByTimeAsync(OPENAI_REQUEST_TIMEOUT_MS + 1)

    await assertion
  })

  it('支持通过配置覆盖请求超时时间', async () => {
    vi.useFakeTimers()
    fetchMock.mockReturnValue(new Promise<Response>(() => undefined))

    const requestTimeoutMs = 120_000
    const assertion = expect(
      new OpenAiProvider({ ...baseConfig, requestTimeoutMs }).call(messages),
    ).rejects.toThrow(`OpenAI provider request timed out after ${requestTimeoutMs}ms.`)
    await vi.advanceTimersByTimeAsync(requestTimeoutMs + 1)

    await assertion
  })

  it('调用时传入的自定义参数会覆盖默认配置', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        model: 'gpt-4.1-mini',
        choices: [{ message: { content: 'Override summary' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 3, completion_tokens: 2 },
      }),
    )

    await new OpenAiProvider(baseConfig).call(messages, {
      apiKey: 'sk-override-test',
      baseUrl: 'https://proxy.example.com/v1/',
      model: 'gpt-4.1-mini',
      temperature: 0.1,
      maxTokens: 128,
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://proxy.example.com/v1/chat/completions')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer sk-override-test',
    })
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'gpt-4.1-mini',
      temperature: 0.1,
      max_tokens: 128,
    })
  })
})

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}
