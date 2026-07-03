import { describe, expect, it } from 'vitest'

import {
  AI_PROVIDER_DEFINITIONS,
  AI_PROVIDER_IDS,
  getDefaultBaseUrl,
  getDefaultModel,
  getModelDefinition,
  getProviderDefinition,
  isAiProviderName,
} from './provider-registry'

describe('AI provider registry', () => {
  it('集中定义所有内置 provider，包含国产 OpenAI-compatible provider', () => {
    expect(AI_PROVIDER_IDS).toEqual([
      'openai',
      'deepseek',
      'qwen',
      'kimi',
      'glm',
      'anthropic',
      'gemini',
      'ollama',
      'custom',
    ])
    expect(AI_PROVIDER_DEFINITIONS.map((provider) => provider.id)).toEqual(AI_PROVIDER_IDS)
  })

  it('为 Qwen、Kimi、GLM、DeepSeek 提供独立 provider preset', () => {
    expect(getProviderDefinition('qwen')).toMatchObject({
      id: 'qwen',
      label: 'Qwen / DashScope',
      adapter: 'openai-compatible',
      defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      defaultModel: 'qwen-plus',
      requiresApiKey: true,
    })
    expect(getProviderDefinition('kimi')).toMatchObject({
      id: 'kimi',
      label: 'Kimi / Moonshot',
      adapter: 'openai-compatible',
      defaultBaseUrl: 'https://api.moonshot.cn/v1',
      defaultModel: 'kimi-k2.7',
    })
    expect(getProviderDefinition('glm')).toMatchObject({
      id: 'glm',
      label: 'GLM / Z.AI',
      adapter: 'openai-compatible',
      defaultBaseUrl: 'https://api.z.ai/api/paas/v4',
      defaultModel: 'glm-4.6',
    })
    expect(getProviderDefinition('deepseek')).toMatchObject({
      id: 'deepseek',
      defaultBaseUrl: 'https://api.deepseek.com',
      defaultModel: 'deepseek-chat',
    })
  })

  it('按模型描述采样温度、输出 token 与推理参数能力', () => {
    expect(getModelDefinition('openai', 'gpt-4o-mini')?.capabilities).toEqual({
      temperature: true,
      maxTokens: true,
      reasoningEffort: false,
      enableThinking: false,
    })
    expect(getModelDefinition('qwen', 'qwen-plus')?.capabilities).toEqual({
      temperature: true,
      maxTokens: true,
      reasoningEffort: false,
      enableThinking: true,
    })
    expect(getModelDefinition('kimi', 'kimi-k2.7')?.capabilities).toEqual({
      temperature: false,
      maxTokens: true,
      reasoningEffort: false,
      enableThinking: false,
    })
    expect(getModelDefinition('glm', 'glm-4.6')?.capabilities).toEqual({
      temperature: true,
      maxTokens: true,
      reasoningEffort: true,
      enableThinking: true,
    })
    expect(getModelDefinition('deepseek', 'deepseek-reasoner')?.capabilities).toEqual({
      temperature: false,
      maxTokens: true,
      reasoningEffort: true,
      enableThinking: false,
    })
  })

  it('暴露默认 baseUrl、默认模型和 provider name type guard', () => {
    expect(getDefaultBaseUrl('qwen')).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1')
    expect(getDefaultModel('glm')).toBe('glm-4.6')
    expect(isAiProviderName('kimi')).toBe(true)
    expect(isAiProviderName('moonshot')).toBe(false)
  })

  it('custom provider 保持高级自定义 OpenAI-compatible 入口', () => {
    const customProvider = getProviderDefinition('custom')

    expect(customProvider.adapter).toBe('openai-compatible')
    expect(customProvider.defaultModel).toBe('')
    expect(getModelDefinition('custom', 'vendor/model-name')?.id).toBe('__openai_compatible_custom__')
  })
})
