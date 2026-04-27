import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createRouteTestDb, jsonRequest, useTestDatabasePath } from '@/app/api/test-utils'
import { upsertAiSettings, type Database } from '@/lib/db'

import { POST } from './route'

describe('/api/ai/settings/test', () => {
  let db: Database
  let cleanupDb: () => void
  let restoreDbPath: () => void

  beforeEach(() => {
    const testDb = createRouteTestDb('gni-ai-settings-test-route-')
    db = testDb.db
    cleanupDb = testDb.cleanup
    restoreDbPath = useTestDatabasePath(db.name)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    restoreDbPath()
    cleanupDb()
  })

  it('使用请求中的临时配置测试连接', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            model: 'gpt-4o-mini',
            choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 1, completion_tokens: 1 },
          }),
          { status: 200 },
        ),
      ),
    )

    const response = await POST(
      jsonRequest('http://localhost/api/ai/settings/test', 'POST', {
        provider: 'openai',
        apiKey: 'sk-test',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, model: 'gpt-4o-mini' })
  })

  it('请求为空时使用已保存配置测试连接', async () => {
    upsertAiSettings(db, {
      provider: 'ollama',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1',
      temperature: 0.7,
      maxTokens: 2048,
      requestTimeoutMs: 30000,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ model: 'llama3.1', message: { content: 'ok' }, prompt_eval_count: 1, eval_count: 1 }),
          { status: 200 },
        ),
      ),
    )

    const response = await POST(jsonRequest('http://localhost/api/ai/settings/test', 'POST', {}))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, model: 'llama3.1' })
  })

  it('连接失败时返回 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad key', { status: 401 })))

    const response = await POST(
      jsonRequest('http://localhost/api/ai/settings/test', 'POST', {
        provider: 'openai',
        apiKey: 'bad-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.error).toMatch(/OpenAI provider request failed/i)
  })
})
