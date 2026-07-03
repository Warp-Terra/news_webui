export const AI_PROVIDER_IDS = [
  'openai',
  'deepseek',
  'qwen',
  'kimi',
  'glm',
  'anthropic',
  'gemini',
  'ollama',
  'custom',
] as const

export type AiProviderName = (typeof AI_PROVIDER_IDS)[number]
export type AiAdapterKind = 'openai-compatible' | 'anthropic' | 'gemini' | 'ollama'
export type AiReasoningEffort = 'low' | 'medium' | 'high'
export type MaxTokensRequestField = 'max_tokens' | 'max_completion_tokens'

export interface AiModelCapabilities {
  temperature: boolean
  maxTokens: boolean
  reasoningEffort: boolean
  enableThinking: boolean
}

export interface AiModelRequestMapping {
  maxTokensField: MaxTokensRequestField
  omitTemperature?: boolean
  reasoningEffortField?: 'reasoning_effort'
  enableThinkingField?: 'enable_thinking'
  thinkingObject?: 'type'
}

export interface AiModelDefinition {
  id: string
  label: string
  capabilities: AiModelCapabilities
  request: AiModelRequestMapping
  defaultTemperature?: number
  defaultMaxTokens?: number
}

export interface AiProviderDefinition {
  id: AiProviderName
  label: string
  description: string
  adapter: AiAdapterKind
  defaultBaseUrl: string
  defaultModel: string
  requiresApiKey: boolean
  docsUrl: string
  models: readonly AiModelDefinition[]
}

const DEFAULT_CAPABILITIES: AiModelCapabilities = {
  temperature: true,
  maxTokens: true,
  reasoningEffort: false,
  enableThinking: false,
}

const DEFAULT_OPENAI_REQUEST: AiModelRequestMapping = {
  maxTokensField: 'max_tokens',
}

const GENERIC_OPENAI_COMPATIBLE_MODEL: AiModelDefinition = {
  id: '__openai_compatible_custom__',
  label: 'Custom OpenAI-compatible model',
  capabilities: DEFAULT_CAPABILITIES,
  request: DEFAULT_OPENAI_REQUEST,
  defaultTemperature: 0.7,
  defaultMaxTokens: 2048,
}

export const AI_PROVIDER_DEFINITIONS = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'OpenAI Chat Completions API.',
    adapter: 'openai-compatible',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    requiresApiKey: true,
    docsUrl: 'https://platform.openai.com/docs/api-reference/chat',
    models: [
      {
        id: 'gpt-4o-mini',
        label: 'GPT-4o mini',
        capabilities: DEFAULT_CAPABILITIES,
        request: DEFAULT_OPENAI_REQUEST,
        defaultTemperature: 0.7,
        defaultMaxTokens: 2048,
      },
      {
        id: 'gpt-4.1-mini',
        label: 'GPT-4.1 mini',
        capabilities: DEFAULT_CAPABILITIES,
        request: DEFAULT_OPENAI_REQUEST,
        defaultTemperature: 0.7,
        defaultMaxTokens: 2048,
      },
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'DeepSeek OpenAI-compatible API.',
    adapter: 'openai-compatible',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    requiresApiKey: true,
    docsUrl: 'https://api-docs.deepseek.com/',
    models: [
      {
        id: 'deepseek-chat',
        label: 'DeepSeek Chat',
        capabilities: DEFAULT_CAPABILITIES,
        request: DEFAULT_OPENAI_REQUEST,
        defaultTemperature: 0.7,
        defaultMaxTokens: 2048,
      },
      {
        id: 'deepseek-reasoner',
        label: 'DeepSeek Reasoner',
        capabilities: {
          temperature: false,
          maxTokens: true,
          reasoningEffort: true,
          enableThinking: false,
        },
        request: {
          maxTokensField: 'max_tokens',
          omitTemperature: true,
          reasoningEffortField: 'reasoning_effort',
        },
        defaultMaxTokens: 4096,
      },
    ],
  },
  {
    id: 'qwen',
    label: 'Qwen / DashScope',
    description: '阿里云百炼 DashScope OpenAI-compatible API.',
    adapter: 'openai-compatible',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    requiresApiKey: true,
    docsUrl: 'https://help.aliyun.com/zh/model-studio/developer-reference/compatibility-of-openai-with-dashscope',
    models: [
      {
        id: 'qwen-plus',
        label: 'Qwen Plus',
        capabilities: {
          temperature: true,
          maxTokens: true,
          reasoningEffort: false,
          enableThinking: true,
        },
        request: {
          maxTokensField: 'max_tokens',
          enableThinkingField: 'enable_thinking',
        },
        defaultTemperature: 0.7,
        defaultMaxTokens: 2048,
      },
      {
        id: 'qwen-turbo',
        label: 'Qwen Turbo',
        capabilities: {
          temperature: true,
          maxTokens: true,
          reasoningEffort: false,
          enableThinking: true,
        },
        request: {
          maxTokensField: 'max_tokens',
          enableThinkingField: 'enable_thinking',
        },
        defaultTemperature: 0.7,
        defaultMaxTokens: 2048,
      },
    ],
  },
  {
    id: 'kimi',
    label: 'Kimi / Moonshot',
    description: 'Moonshot Kimi OpenAI-compatible API.',
    adapter: 'openai-compatible',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2.7',
    requiresApiKey: true,
    docsUrl: 'https://platform.moonshot.cn/docs/api-reference',
    models: [
      {
        id: 'kimi-k2.7',
        label: 'Kimi K2.7',
        capabilities: {
          temperature: false,
          maxTokens: true,
          reasoningEffort: false,
          enableThinking: false,
        },
        request: {
          maxTokensField: 'max_completion_tokens',
          omitTemperature: true,
        },
        defaultMaxTokens: 4096,
      },
      {
        id: 'kimi-k2.7-code',
        label: 'Kimi K2.7 Code',
        capabilities: {
          temperature: false,
          maxTokens: true,
          reasoningEffort: false,
          enableThinking: false,
        },
        request: {
          maxTokensField: 'max_completion_tokens',
          omitTemperature: true,
        },
        defaultMaxTokens: 4096,
      },
    ],
  },
  {
    id: 'glm',
    label: 'GLM / Z.AI',
    description: 'Z.AI GLM OpenAI-compatible API.',
    adapter: 'openai-compatible',
    defaultBaseUrl: 'https://api.z.ai/api/paas/v4',
    defaultModel: 'glm-4.6',
    requiresApiKey: true,
    docsUrl: 'https://docs.z.ai/',
    models: [
      {
        id: 'glm-4.6',
        label: 'GLM-4.6',
        capabilities: {
          temperature: true,
          maxTokens: true,
          reasoningEffort: true,
          enableThinking: true,
        },
        request: {
          maxTokensField: 'max_tokens',
          reasoningEffortField: 'reasoning_effort',
          thinkingObject: 'type',
        },
        defaultTemperature: 0.7,
        defaultMaxTokens: 4096,
      },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    description: 'Anthropic Messages API.',
    adapter: 'anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-latest',
    requiresApiKey: true,
    docsUrl: 'https://docs.anthropic.com/en/api/messages',
    models: [
      {
        id: 'claude-3-5-sonnet-latest',
        label: 'Claude 3.5 Sonnet',
        capabilities: DEFAULT_CAPABILITIES,
        request: DEFAULT_OPENAI_REQUEST,
        defaultTemperature: 0.7,
        defaultMaxTokens: 4096,
      },
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    description: 'Google Gemini generateContent API.',
    adapter: 'gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-1.5-flash',
    requiresApiKey: true,
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    models: [
      {
        id: 'gemini-1.5-flash',
        label: 'Gemini 1.5 Flash',
        capabilities: DEFAULT_CAPABILITIES,
        request: DEFAULT_OPENAI_REQUEST,
        defaultTemperature: 0.7,
        defaultMaxTokens: 2048,
      },
    ],
  },
  {
    id: 'ollama',
    label: 'Ollama',
    description: 'Local Ollama chat API.',
    adapter: 'ollama',
    defaultBaseUrl: 'http://localhost:11434',
    defaultModel: 'llama3.1',
    requiresApiKey: false,
    docsUrl: 'https://github.com/ollama/ollama/blob/main/docs/api.md',
    models: [
      {
        id: 'llama3.1',
        label: 'Llama 3.1',
        capabilities: DEFAULT_CAPABILITIES,
        request: DEFAULT_OPENAI_REQUEST,
        defaultTemperature: 0.7,
        defaultMaxTokens: 2048,
      },
    ],
  },
  {
    id: 'custom',
    label: 'Custom OpenAI-compatible',
    description: 'Advanced custom endpoint that follows OpenAI Chat Completions format.',
    adapter: 'openai-compatible',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: '',
    requiresApiKey: true,
    docsUrl: 'https://platform.openai.com/docs/api-reference/chat',
    models: [GENERIC_OPENAI_COMPATIBLE_MODEL],
  },
] as const satisfies readonly AiProviderDefinition[]

export function isAiProviderName(value: string): value is AiProviderName {
  return AI_PROVIDER_IDS.includes(value as AiProviderName)
}

export function getProviderDefinition(provider: AiProviderName): AiProviderDefinition {
  return AI_PROVIDER_DEFINITIONS.find((definition) => definition.id === provider) ?? AI_PROVIDER_DEFINITIONS[0]
}

export function getDefaultBaseUrl(provider: AiProviderName): string {
  return getProviderDefinition(provider).defaultBaseUrl
}

export function getDefaultModel(provider: AiProviderName): string {
  return getProviderDefinition(provider).defaultModel
}

export function getModelDefinition(provider: AiProviderName, model: string): AiModelDefinition | undefined {
  const providerDefinition = getProviderDefinition(provider)
  const normalizedModel = model.trim()

  if (provider === 'custom') {
    return GENERIC_OPENAI_COMPATIBLE_MODEL
  }

  return (
    providerDefinition.models.find((definition) => definition.id === normalizedModel) ??
    providerDefinition.models.find((definition) => definition.id === providerDefinition.defaultModel) ??
    providerDefinition.models[0]
  )
}
