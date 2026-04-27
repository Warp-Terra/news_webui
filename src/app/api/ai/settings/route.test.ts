import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createRouteTestDb, jsonRequest, useTestDatabasePath } from '@/app/api/test-utils'
import { getAiSettings, type Database } from '@/lib/db'

import { GET, POST } from './route'

describe('/api/ai/settings', () => {
  let db: Database
  let cleanupDb: () => void
  let restoreDbPath: () => void

  beforeEach(() => {
    const testDb = createRouteTestDb('gni-ai-settings-route-')
    db = testDb.db
    cleanupDb = testDb.cleanup
    restoreDbPath = useTestDatabasePath(db.name)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    restoreDbPath()
    cleanupDb()
  })

  it('GET 在未配置时返回默认空配置且不泄露密钥', async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      configured: false,
      provider: 'openai',
      apiKey: '',
      apiKeyMasked: '',
      baseUrl: 'https://api.openai.com/v1',
      model: '',
      temperature: 0.7,
      maxTokens: 2048,
    })
  })

  it('POST 保存配置并在响应中隐藏完整 API Key', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/ai/settings', 'POST', {
        provider: 'anthropic',
        apiKey: 'sk-ant-abcdef123456',
        baseUrl: 'https://api.anthropic.com/v1',
        model: 'claude-3-5-sonnet-latest',
        temperature: 0.2,
        maxTokens: 4096,
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      configured: true,
      provider: 'anthropic',
      apiKey: '',
      apiKeyMasked: 'sk-a************3456',
      model: 'claude-3-5-sonnet-latest',
    })
    expect(getAiSettings(db)).toMatchObject({
      provider: 'anthropic',
      apiKey: 'sk-ant-abcdef123456',
    })
  })

  it('POST 支持保留已有 API Key', async () => {
    await POST(
      jsonRequest('http://localhost/api/ai/settings', 'POST', {
        provider: 'openai',
        apiKey: 'sk-original',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      }),
    )

    const response = await POST(
      jsonRequest('http://localhost/api/ai/settings', 'POST', {
        provider: 'openai',
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4.1-mini',
      }),
    )

    expect(response.status).toBe(200)
    expect(getAiSettings(db)).toMatchObject({
      provider: 'openai',
      apiKey: 'sk-original',
      model: 'gpt-4.1-mini',
    })
  })

  it('POST 校验 provider、model 与 API Key', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/ai/settings', 'POST', {
        provider: 'anthropic',
        apiKey: '',
        baseUrl: 'https://api.anthropic.com/v1',
        model: '',
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/model/i)
  })
})
