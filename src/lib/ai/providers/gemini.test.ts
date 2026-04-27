import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AiConfig, AiMessage } from '../types'
import { GeminiProvider } from './gemini'

const baseConfig: AiConfig = {
  provider: 'gemini',
  apiKey: 'gemini-key',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  model: 'gemini-1.5-flash',
  temperature: 0.2,
  maxTokens: 1024,
}

const messages: AiMessage[] = [
  { role: 'system', content: '你是新闻分析助手' },
  { role: 'user', content: '生成日报' },
]

describe('GeminiProvider', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: { parts: [{ text: '# Daily Report' }] },
                finishReason: 'STOP',
              },
            ],
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
          }),
          { status: 200 },
        ),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('按 Gemini generateContent 格式构造请求并解析响应', async () => {
    const provider = new GeminiProvider(baseConfig)

    const result = await provider.call(messages)

    expect(fetch).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=gemini-key',
      expect.objectContaining({ method: 'POST' }),
    )
    const body = JSON.parse(String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body))
    expect(body).toMatchObject({
      systemInstruction: { parts: [{ text: '你是新闻分析助手' }] },
      contents: [{ role: 'user', parts: [{ text: '生成日报' }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    })
    expect(result).toEqual({
      content: '# Daily Report',
      tokensIn: 10,
      tokensOut: 20,
      model: 'gemini-1.5-flash',
      finishReason: 'STOP',
    })
  })

  it('API 返回错误状态时抛出包含 provider 和状态码的错误', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('quota exceeded', { status: 429 })))
    const provider = new GeminiProvider(baseConfig)

    await expect(provider.call(messages)).rejects.toThrow(/Gemini provider request failed with status 429/i)
  })
})
