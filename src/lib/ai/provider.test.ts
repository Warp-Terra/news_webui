import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createProvider, getAiConfig } from './provider'
import { AnthropicProvider } from './providers/anthropic'
import { GeminiProvider } from './providers/gemini'
import { OpenAiProvider } from './providers/openai'
import { OllamaProvider } from './providers/ollama'

const AI_ENV_KEYS = [
  'AI_PROVIDER',
  'AI_API_KEY',
  'AI_BASE_URL',
  'AI_MODEL',
  'AI_TEMPERATURE',
  'AI_MAX_TOKENS',
  'AI_REQUEST_TIMEOUT_MS',
] as const

const originalAiEnv = new Map(AI_ENV_KEYS.map((key) => [key, process.env[key]]))

beforeEach(() => {
  clearAiEnv()
})

afterEach(() => {
  restoreAiEnv()
})

describe('getAiConfig', () => {
  it('正确解析 DeepSeek 相关环境变量', () => {
    setAiEnv({
      AI_PROVIDER: 'deepseek',
      AI_API_KEY: 'sk-deepseek-test',
      AI_BASE_URL: 'https://api.deepseek.com/v1',
      AI_MODEL: 'deepseek-chat',
      AI_TEMPERATURE: '0.2',
      AI_MAX_TOKENS: '1024',
      AI_REQUEST_TIMEOUT_MS: '120000',
    })

    expect(getAiConfig()).toEqual({
      provider: 'deepseek',
      apiKey: 'sk-deepseek-test',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      temperature: 0.2,
      maxTokens: 1024,
      requestTimeoutMs: 120000,
    })
  })

  it('在未显式配置可选项时使用默认 provider、baseUrl、temperature 和 maxTokens', () => {
    setAiEnv({
      AI_API_KEY: 'sk-openai-test',
      AI_MODEL: 'gpt-4o-mini',
    })

    expect(getAiConfig()).toEqual({
      provider: 'openai',
      apiKey: 'sk-openai-test',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 2048,
      requestTimeoutMs: 30000,
    })
  })

  it('Ollama 允许缺省 API Key 并使用本地默认 baseUrl', () => {
    setAiEnv({
      AI_PROVIDER: 'ollama',
      AI_MODEL: 'llama3.1',
    })

    expect(getAiConfig()).toEqual({
      provider: 'ollama',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1',
      temperature: 0.7,
      maxTokens: 2048,
      requestTimeoutMs: 30000,
    })
  })

  it('AI_REQUEST_TIMEOUT_MS 非正整数时抛出友好错误', () => {
    setAiEnv({
      AI_PROVIDER: 'openai',
      AI_API_KEY: 'sk-openai-test',
      AI_MODEL: 'gpt-4o-mini',
      AI_REQUEST_TIMEOUT_MS: '0',
    })

    expect(() => getAiConfig()).toThrow(/AI_REQUEST_TIMEOUT_MS must be a positive integer/i)
  })

  it('OpenAI 兼容 provider 缺失 API Key 时抛出友好错误', () => {
    setAiEnv({
      AI_PROVIDER: 'openai',
      AI_MODEL: 'gpt-4o-mini',
    })

    expect(() => getAiConfig()).toThrow(/AI_API_KEY.*openai/i)
  })

  it('缺失模型配置时抛出友好错误', () => {
    setAiEnv({
      AI_PROVIDER: 'deepseek',
      AI_API_KEY: 'sk-deepseek-test',
    })

    expect(() => getAiConfig()).toThrow(/AI_MODEL.*deepseek/i)
  })

  it('支持 Anthropic provider 并使用默认 baseUrl', () => {
    setAiEnv({
      AI_PROVIDER: 'anthropic',
      AI_API_KEY: 'sk-ant-test',
      AI_MODEL: 'claude-3-5-sonnet-latest',
    })

    expect(getAiConfig()).toMatchObject({
      provider: 'anthropic',
      apiKey: 'sk-ant-test',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-5-sonnet-latest',
    })
  })

  it('支持 Gemini provider 并使用默认 baseUrl', () => {
    setAiEnv({
      AI_PROVIDER: 'gemini',
      AI_API_KEY: 'gemini-key',
      AI_MODEL: 'gemini-1.5-flash',
    })

    expect(getAiConfig()).toMatchObject({
      provider: 'gemini',
      apiKey: 'gemini-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-1.5-flash',
    })
  })

  it('支持 custom provider 作为 OpenAI 兼容端点', () => {
    setAiEnv({
      AI_PROVIDER: 'custom',
      AI_API_KEY: 'sk-custom-test',
      AI_BASE_URL: 'https://api.siliconflow.cn/v1',
      AI_MODEL: 'Qwen/Qwen2.5-72B-Instruct',
    })

    expect(getAiConfig()).toMatchObject({
      provider: 'custom',
      apiKey: 'sk-custom-test',
      baseUrl: 'https://api.siliconflow.cn/v1',
      model: 'Qwen/Qwen2.5-72B-Instruct',
    })
  })
})

describe('createProvider', () => {
  it('OpenAI provider 返回 OpenAiProvider 实例', () => {
    setAiEnv({
      AI_PROVIDER: 'openai',
      AI_API_KEY: 'sk-openai-test',
      AI_MODEL: 'gpt-4o-mini',
    })

    expect(createProvider()).toBeInstanceOf(OpenAiProvider)
  })

  it('DeepSeek provider 复用 OpenAI 兼容 Provider', () => {
    setAiEnv({
      AI_PROVIDER: 'deepseek',
      AI_API_KEY: 'sk-deepseek-test',
      AI_MODEL: 'deepseek-chat',
    })

    expect(createProvider()).toBeInstanceOf(OpenAiProvider)
  })

  it('Ollama provider 返回 OllamaProvider 实例', () => {
    setAiEnv({
      AI_PROVIDER: 'ollama',
      AI_MODEL: 'llama3.1',
    })

    expect(createProvider()).toBeInstanceOf(OllamaProvider)
  })

  it('Anthropic provider 返回 AnthropicProvider 实例', () => {
    setAiEnv({
      AI_PROVIDER: 'anthropic',
      AI_API_KEY: 'sk-ant-test',
      AI_MODEL: 'claude-3-5-sonnet-latest',
    })

    expect(createProvider()).toBeInstanceOf(AnthropicProvider)
  })

  it('Gemini provider 返回 GeminiProvider 实例', () => {
    setAiEnv({
      AI_PROVIDER: 'gemini',
      AI_API_KEY: 'gemini-key',
      AI_MODEL: 'gemini-1.5-flash',
    })

    expect(createProvider()).toBeInstanceOf(GeminiProvider)
  })

  it('Custom provider 复用 OpenAI 兼容 Provider', () => {
    setAiEnv({
      AI_PROVIDER: 'custom',
      AI_API_KEY: 'sk-custom-test',
      AI_BASE_URL: 'https://api.siliconflow.cn/v1',
      AI_MODEL: 'Qwen/Qwen2.5-72B-Instruct',
    })

    expect(createProvider()).toBeInstanceOf(OpenAiProvider)
  })
})

function setAiEnv(values: Partial<Record<(typeof AI_ENV_KEYS)[number], string>>): void {
  clearAiEnv()

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

function clearAiEnv(): void {
  for (const key of AI_ENV_KEYS) {
    delete process.env[key]
  }
}

function restoreAiEnv(): void {
  clearAiEnv()

  for (const [key, value] of originalAiEnv) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}
