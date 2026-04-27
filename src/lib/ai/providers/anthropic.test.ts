import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AiConfig, AiMessage } from '../types'
import { AnthropicProvider } from './anthropic'

const baseConfig: AiConfig = {
  provider: 'anthropic',
  apiKey: 'sk-ant-test',
  baseUrl: 'https://api.anthropic.com/v1',
  model: 'claude-3-5-sonnet-latest',
  temperature: 0.4,
  maxTokens: 2048,
}

const messages: AiMessage[] = [
  { role: 'system', content: '你是新闻分析助手' },
  { role: 'user', content: '分析这条新闻' },
]

describe('AnthropicProvider', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            model: 'claude-3-5-sonnet-latest',
            content: [{ type: 'text', text: '{"summary":"ok"}' }],
            usage: { input_tokens: 12, output_tokens: 8 },
            stop_reason: 'end_turn',
          }),
          { status: 200 },
        ),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('按 Anthropic Messages API 格式构造请求并解析响应', async () => {
    const provider = new AnthropicProvider(baseConfig)

    const result = await provider.call(messages)

    expect(fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-api-key': 'sk-ant-test',
          'anthropic-version': '2023-06-01',
        }),
      }),
    )
    const body = JSON.parse(String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body))
    expect(body).toMatchObject({
      model: 'claude-3-5-sonnet-latest',
      system: '你是新闻分析助手',
      max_tokens: 2048,
      temperature: 0.4,
      messages: [{ role: 'user', content: '分析这条新闻' }],
    })
    expect(result).toEqual({
      content: '{"summary":"ok"}',
      tokensIn: 12,
      tokensOut: 8,
      model: 'claude-3-5-sonnet-latest',
      finishReason: 'end_turn',
    })
  })

  it('API 返回错误状态时抛出包含 provider 和状态码的错误', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('invalid api key', { status: 401 })))
    const provider = new AnthropicProvider(baseConfig)

    await expect(provider.call(messages)).rejects.toThrow(/Anthropic provider request failed with status 401/i)
  })
})
