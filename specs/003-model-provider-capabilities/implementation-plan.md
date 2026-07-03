# AI Model Provider Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 AI 配置与调用链增加统一 Provider Registry、模型能力元数据和 provider-specific request mapping，第一批支持 `qwen`、`kimi`、`glm`、`deepseek` 加现有 provider。

**Architecture:** 新增一个无副作用的 `src/lib/ai/provider-registry.ts` 作为 provider/model/capability 单一事实来源，后端 API、环境变量解析、前端配置页都从该 registry 读取 provider 列表、默认 Base URL、默认模型和能力。OpenAI-compatible 的厂商继续复用 `OpenAiProvider`，但请求体由模型能力决定是否发送 `temperature`、使用 `max_tokens` 或 `max_completion_tokens`、以及如何映射 `reasoning_effort`、`enable_thinking`、`thinking`。SQLite `ai_settings` 继续作为单例配置表，新增可空推理相关字段以保存 capability-based UI 暴露的配置。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、SQLite（`better-sqlite3`）、Vitest、Testing Library。

---

## 文件结构

- 新增：`src/lib/ai/provider-registry.ts`
- 新增：`src/lib/ai/provider-registry.test.ts`
- 修改：`src/lib/ai/types.ts`
- 修改：`src/lib/ai/settings.ts`
- 修改：`src/lib/ai/provider.ts`
- 修改：`src/lib/ai/provider.test.ts`
- 修改：`src/lib/ai/providers/openai.ts`
- 修改：`src/lib/ai/providers/openai.test.ts`
- 修改：`src/lib/db.ts`
- 修改：`src/lib/db.test.ts`
- 修改：`src/lib/api.ts`
- 修改：`src/app/api/ai/settings/route.ts`
- 修改：`src/app/api/ai/settings/route.test.ts`
- 修改：`src/app/api/ai/settings/test/route.ts`
- 修改：`src/app/api/ai/settings/test/route.test.ts`
- 修改：`src/app/[lang]/ai-settings/page.tsx`
- 修改：`src/app/[lang]/ai-settings/page.test.tsx`
- 修改：`src/app/i18n/dictionaries.ts`
- 修改：`README.md`
- 修改：`docs/plan.md`

职责划分：

- `provider-registry.ts` 只保存 provider/model/capability/request metadata 和纯 helper，不读取环境变量、不访问数据库、不发请求。
- `types.ts` 只保存 AI 调用链通用类型，并从 registry 复用 `AiProviderName`、`AiReasoningEffort`。
- `settings.ts` 负责默认 settings、public settings、API Key mask、DB settings 到 runtime `AiConfig` 的转换。
- `provider.ts` 负责从环境变量构造 `AiConfig`，并按 registry 的 adapter 类型创建 provider 实例。
- `providers/openai.ts` 负责 OpenAI-compatible HTTP 调用和 provider/model-specific 请求体映射。
- `db.ts` 负责 `ai_settings` schema、迁移、读写和 SQLite row mapping。
- API routes 负责校验请求、保留旧 API Key、落库、连接测试，不再维护重复 provider 列表。
- `/ai-settings` 页面负责 capability-based 表单：模型不支持的字段不显示、不校验、不提交。

## 任务 1：添加 Provider Registry 失败测试与实现

**文件：**

- 新增：`src/lib/ai/provider-registry.test.ts`
- 新增：`src/lib/ai/provider-registry.ts`

- [ ] **步骤 1：编写 provider registry 失败测试**

创建 `src/lib/ai/provider-registry.test.ts`：

```ts
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
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
npm test -- --run src/lib/ai/provider-registry.test.ts
```

预期：失败，原因是 `src/lib/ai/provider-registry.ts` 尚不存在。

- [ ] **步骤 3：实现 provider registry**

创建 `src/lib/ai/provider-registry.ts`：

```ts
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
```

- [ ] **步骤 4：运行 registry 测试确认通过**

运行：

```bash
npm test -- --run src/lib/ai/provider-registry.test.ts
```

预期：通过。

- [ ] **步骤 5：提交本任务**

```bash
git add src/lib/ai/provider-registry.ts src/lib/ai/provider-registry.test.ts
git commit -m "feat: add AI provider registry"
```

## 任务 2：扩展 AI 类型与 SQLite settings schema

**文件：**

- 修改：`src/lib/ai/types.ts`
- 修改：`src/lib/db.ts`
- 修改：`src/lib/db.test.ts`

- [ ] **步骤 1：为 DB settings 写失败测试**

在 `src/lib/db.test.ts` 的 `默认没有持久化 AI 设置，保存后可读取完整配置` 测试中，把 `upsertAiSettings` 输入扩展为：

```ts
const saved = upsertAiSettings(db, {
  provider: 'anthropic',
  apiKey: 'sk-ant-test',
  baseUrl: 'https://api.anthropic.com/v1',
  model: 'claude-3-5-sonnet-latest',
  temperature: 0.3,
  maxTokens: 4096,
  reasoningEffort: null,
  enableThinking: null,
  requestTimeoutMs: 30000,
})
```

并把后续 `expect(saved).toMatchObject` 扩展为：

```ts
expect(saved).toMatchObject({
  provider: 'anthropic',
  apiKey: 'sk-ant-test',
  baseUrl: 'https://api.anthropic.com/v1',
  model: 'claude-3-5-sonnet-latest',
  temperature: 0.3,
  maxTokens: 4096,
  reasoningEffort: null,
  enableThinking: null,
  requestTimeoutMs: 30000,
})
```

在 `重复保存 AI 设置会更新单例配置并支持 OpenAI 兼容 custom provider` 测试的两次 `upsertAiSettings` 输入中加入：

```ts
reasoningEffort: null,
enableThinking: null,
```

然后在同一测试文件末尾新增迁移测试：

```ts
it('迁移旧 ai_settings 表并保存推理相关配置', () => {
  db.exec('DROP TABLE ai_settings')
  db.exec(`
    CREATE TABLE ai_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      provider TEXT NOT NULL,
      apiKey TEXT NOT NULL DEFAULT '',
      baseUrl TEXT NOT NULL,
      model TEXT NOT NULL,
      temperature REAL NOT NULL DEFAULT 0.7,
      maxTokens INTEGER NOT NULL DEFAULT 2048,
      requestTimeoutMs INTEGER NOT NULL DEFAULT 30000,
      updatedAt TEXT NOT NULL
    );
  `)

  db.close()
  db = initDb(dbPath, { seedDefaultSources: false })

  const columns = db
    .prepare<[], { name: string }>('PRAGMA table_info(ai_settings)')
    .all()
    .map((column) => column.name)

  expect(columns).toContain('reasoningEffort')
  expect(columns).toContain('enableThinking')

  const saved = upsertAiSettings(db, {
    provider: 'glm',
    apiKey: 'glm-test-key',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    model: 'glm-4.6',
    temperature: 0.5,
    maxTokens: 4096,
    reasoningEffort: 'medium',
    enableThinking: true,
    requestTimeoutMs: 60000,
  })

  expect(getAiSettings(db)).toEqual(saved)
})
```

- [ ] **步骤 2：运行 DB 测试确认失败**

运行：

```bash
npm test -- --run src/lib/db.test.ts
```

预期：失败，原因包括 `glm` provider 类型不支持、`reasoningEffort`/`enableThinking` 字段不存在。

- [ ] **步骤 3：更新 AI runtime 类型**

把 `src/lib/ai/types.ts` 顶部加入：

```ts
import type { AiProviderName, AiReasoningEffort } from './provider-registry'
```

把 `AiConfig` 改为：

```ts
export interface AiConfig {
  provider: AiProviderName
  apiKey: string
  baseUrl?: string
  model: string
  temperature?: number
  maxTokens?: number
  reasoningEffort?: AiReasoningEffort
  enableThinking?: boolean
  requestTimeoutMs?: number
}
```

- [ ] **步骤 4：更新 DB 类型与 schema**

在 `src/lib/db.ts` 顶部 import 区加入：

```ts
import type { AiProviderName, AiReasoningEffort } from './ai/provider-registry'
```

删除现有本地定义：

```ts
export type AiProviderName = 'openai' | 'deepseek' | 'anthropic' | 'gemini' | 'ollama' | 'custom'
```

并改为重新导出 registry 类型：

```ts
export type { AiProviderName }
```

把 `AiSettings` 改为：

```ts
export interface AiSettings {
  provider: AiProviderName
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  reasoningEffort: AiReasoningEffort | null
  enableThinking: boolean | null
  requestTimeoutMs: number
  updatedAt: string
}
```

把 `AiSettingsRow` 扩展为：

```ts
interface AiSettingsRow {
  id: number
  provider: string
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  reasoningEffort: string | null
  enableThinking: number | null
  requestTimeoutMs: number
  updatedAt: string
}
```

把 `AI_SETTINGS_TABLE_SQL` 改为包含新增列：

```ts
const AI_SETTINGS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ai_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  provider TEXT NOT NULL,
  apiKey TEXT NOT NULL DEFAULT '',
  baseUrl TEXT NOT NULL,
  model TEXT NOT NULL,
  temperature REAL NOT NULL DEFAULT 0.7,
  maxTokens INTEGER NOT NULL DEFAULT 2048,
  reasoningEffort TEXT,
  enableThinking INTEGER,
  requestTimeoutMs INTEGER NOT NULL DEFAULT 30000,
  updatedAt TEXT NOT NULL
);
`
```

把 `migrateAiSettingsTable` 改为：

```ts
function migrateAiSettingsTable(db: Database): void {
  addAiSettingsColumnIfMissing(db, 'requestTimeoutMs INTEGER NOT NULL DEFAULT 30000')
  addAiSettingsColumnIfMissing(db, 'reasoningEffort TEXT')
  addAiSettingsColumnIfMissing(db, 'enableThinking INTEGER')
}

function addAiSettingsColumnIfMissing(db: Database, columnSql: string): void {
  try {
    db.exec(`ALTER TABLE ai_settings ADD COLUMN ${columnSql};`)
  } catch {
    // Column already exists; ignore error.
  }
}
```

把 `upsertAiSettings` 中 INSERT/UPDATE 列表加入 `reasoningEffort` 和 `enableThinking`，并把 `.run()` params 改为包含：

```ts
reasoningEffort: settings.reasoningEffort,
enableThinking: settings.enableThinking === null ? null : settings.enableThinking ? 1 : 0,
```

把 `mapAiSettingsRow` 改为：

```ts
function mapAiSettingsRow(row: AiSettingsRow): AiSettings {
  return {
    provider: row.provider as AiProviderName,
    apiKey: row.apiKey,
    baseUrl: row.baseUrl,
    model: row.model,
    temperature: row.temperature,
    maxTokens: row.maxTokens,
    reasoningEffort: row.reasoningEffort as AiReasoningEffort | null,
    enableThinking: row.enableThinking === null ? null : row.enableThinking === 1,
    requestTimeoutMs: row.requestTimeoutMs,
    updatedAt: row.updatedAt,
  }
}
```

- [ ] **步骤 5：运行 DB 测试确认通过**

运行：

```bash
npm test -- --run src/lib/db.test.ts
```

预期：通过。

- [ ] **步骤 6：提交本任务**

```bash
git add src/lib/ai/types.ts src/lib/db.ts src/lib/db.test.ts
git commit -m "feat: persist AI model capability settings"
```

## 任务 3：让环境变量和 provider factory 使用 registry

**文件：**

- 修改：`src/lib/ai/provider.ts`
- 修改：`src/lib/ai/provider.test.ts`

- [ ] **步骤 1：更新 provider factory 失败测试**

在 `src/lib/ai/provider.test.ts` 的 `AI_ENV_KEYS` 中加入：

```ts
'AI_REASONING_EFFORT',
'AI_ENABLE_THINKING',
```

在 `getAiConfig` describe 内新增：

```ts
it('正确解析 Qwen provider 与 enable thinking 环境变量', () => {
  setAiEnv({
    AI_PROVIDER: 'qwen',
    AI_API_KEY: 'dashscope-key',
    AI_MODEL: 'qwen-plus',
    AI_ENABLE_THINKING: 'true',
  })

  expect(getAiConfig()).toMatchObject({
    provider: 'qwen',
    apiKey: 'dashscope-key',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    enableThinking: true,
  })
})

it('正确解析 GLM provider 与 reasoning effort 环境变量', () => {
  setAiEnv({
    AI_PROVIDER: 'glm',
    AI_API_KEY: 'glm-key',
    AI_MODEL: 'glm-4.6',
    AI_REASONING_EFFORT: 'high',
  })

  expect(getAiConfig()).toMatchObject({
    provider: 'glm',
    apiKey: 'glm-key',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    model: 'glm-4.6',
    reasoningEffort: 'high',
  })
})

it('支持 Kimi provider 并使用 Moonshot 默认 baseUrl', () => {
  setAiEnv({
    AI_PROVIDER: 'kimi',
    AI_API_KEY: 'moonshot-key',
    AI_MODEL: 'kimi-k2.7',
  })

  expect(getAiConfig()).toMatchObject({
    provider: 'kimi',
    apiKey: 'moonshot-key',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'kimi-k2.7',
  })
})
```

在 `createProvider` describe 内新增：

```ts
it.each(['qwen', 'kimi', 'glm'] as const)('%s provider 复用 OpenAI 兼容 Provider', (provider) => {
  setAiEnv({
    AI_PROVIDER: provider,
    AI_API_KEY: `${provider}-key`,
    AI_MODEL: provider === 'qwen' ? 'qwen-plus' : provider === 'kimi' ? 'kimi-k2.7' : 'glm-4.6',
  })

  expect(createProvider()).toBeInstanceOf(OpenAiProvider)
})
```

- [ ] **步骤 2：运行 provider factory 测试确认失败**

运行：

```bash
npm test -- --run src/lib/ai/provider.test.ts
```

预期：失败，原因是 `qwen`、`kimi`、`glm` 和新环境变量尚未支持。

- [ ] **步骤 3：更新 provider factory 实现**

在 `src/lib/ai/provider.ts` 中引入 registry：

```ts
import {
  getDefaultBaseUrl,
  getProviderDefinition,
  isAiProviderName,
  type AiProviderName,
  type AiReasoningEffort,
} from './provider-registry'
```

删除本文件内的 `SUPPORTED_PROVIDERS`、`DEFAULT_BASE_URLS` 和 `type SupportedProvider` 定义，把 `DEFAULT_PROVIDER` 改为：

```ts
const DEFAULT_PROVIDER: AiProviderName = 'openai'
```

在 `createProviderFromConfig` 的 OpenAI-compatible 分支加入：

```ts
    case 'qwen':
    case 'kimi':
    case 'glm':
```

把 `getAiConfig` 改为使用 registry，并只在用户配置时加入可选推理字段：

```ts
export function getAiConfig(): AiConfig {
  const provider = parseProvider(process.env.AI_PROVIDER)
  const providerDefinition = getProviderDefinition(provider)
  const apiKey = normalizeEnv(process.env.AI_API_KEY) ?? ''
  const model = normalizeEnv(process.env.AI_MODEL)
  const baseUrl = normalizeEnv(process.env.AI_BASE_URL) ?? getDefaultBaseUrl(provider)
  const temperature = parseOptionalNumber(process.env.AI_TEMPERATURE, DEFAULT_TEMPERATURE, 'AI_TEMPERATURE')
  const maxTokens = parseOptionalInteger(process.env.AI_MAX_TOKENS, DEFAULT_MAX_TOKENS, 'AI_MAX_TOKENS')
  const reasoningEffort = parseOptionalReasoningEffort(process.env.AI_REASONING_EFFORT)
  const enableThinking = parseOptionalBoolean(process.env.AI_ENABLE_THINKING, 'AI_ENABLE_THINKING')
  const requestTimeoutMs = getAiRequestTimeoutMs()

  if (!model) {
    throw new Error(`AI_MODEL is required for ${provider} provider.`)
  }

  if (providerDefinition.requiresApiKey && !apiKey) {
    throw new Error(`AI_API_KEY is required for ${provider} provider.`)
  }

  const config: AiConfig = {
    provider,
    apiKey,
    baseUrl,
    model,
    temperature,
    maxTokens,
    requestTimeoutMs,
  }

  if (reasoningEffort !== undefined) {
    config.reasoningEffort = reasoningEffort
  }

  if (enableThinking !== undefined) {
    config.enableThinking = enableThinking
  }

  return config
}
```

把 `parseProvider` 和错误文案改为：

```ts
function parseProvider(value: string | undefined): AiProviderName {
  const normalized = normalizeEnv(value)?.toLowerCase() ?? DEFAULT_PROVIDER

  if (isAiProviderName(normalized)) {
    return normalized
  }

  throw new Error(`Unsupported AI_PROVIDER "${normalized}". Supported providers: ${AI_PROVIDER_IDS.join(', ')}.`)
}
```

同时在 import 中加入 `AI_PROVIDER_IDS`。

在 `parseOptionalInteger` 后加入：

```ts
function parseOptionalReasoningEffort(value: string | undefined): AiReasoningEffort | undefined {
  const normalized = normalizeEnv(value)?.toLowerCase()

  if (!normalized) {
    return undefined
  }

  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized
  }

  throw new Error('AI_REASONING_EFFORT must be one of: low, medium, high.')
}

function parseOptionalBoolean(value: string | undefined, envName: string): boolean | undefined {
  const normalized = normalizeEnv(value)?.toLowerCase()

  if (!normalized) {
    return undefined
  }

  if (normalized === 'true') {
    return true
  }

  if (normalized === 'false') {
    return false
  }

  throw new Error(`${envName} must be true or false.`)
}
```

- [ ] **步骤 4：运行 provider factory 测试确认通过**

运行：

```bash
npm test -- --run src/lib/ai/provider.test.ts
```

预期：通过。

- [ ] **步骤 5：提交本任务**

```bash
git add src/lib/ai/provider.ts src/lib/ai/provider.test.ts
git commit -m "feat: create providers from registry"
```

## 任务 4：按模型能力映射 OpenAI-compatible 请求体

**文件：**

- 修改：`src/lib/ai/providers/openai.ts`
- 修改：`src/lib/ai/providers/openai.test.ts`

- [ ] **步骤 1：添加 request mapping 失败测试**

在 `src/lib/ai/providers/openai.test.ts` 的 describe 内新增：

```ts
it('Qwen 模型使用 enable_thinking 参数且保留采样温度', async () => {
  fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: 'ok' } }] }))

  await new OpenAiProvider({
    ...baseConfig,
    provider: 'qwen',
    apiKey: 'dashscope-key',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    enableThinking: true,
  }).call(messages)

  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  expect(JSON.parse(init.body as string)).toEqual({
    model: 'qwen-plus',
    messages,
    temperature: 0.7,
    max_tokens: 2048,
    enable_thinking: true,
  })
})

it('Kimi K2.7 不发送 temperature 且使用 max_completion_tokens', async () => {
  fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: 'ok' } }] }))

  await new OpenAiProvider({
    ...baseConfig,
    provider: 'kimi',
    apiKey: 'moonshot-key',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'kimi-k2.7',
    temperature: 0.9,
    maxTokens: 4096,
  }).call(messages)

  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  expect(JSON.parse(init.body as string)).toEqual({
    model: 'kimi-k2.7',
    messages,
    max_completion_tokens: 4096,
  })
})

it('GLM 映射 reasoning_effort 与 thinking.type', async () => {
  fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: 'ok' } }] }))

  await new OpenAiProvider({
    ...baseConfig,
    provider: 'glm',
    apiKey: 'glm-key',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    model: 'glm-4.6',
    reasoningEffort: 'medium',
    enableThinking: true,
  }).call(messages)

  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  expect(JSON.parse(init.body as string)).toMatchObject({
    model: 'glm-4.6',
    messages,
    temperature: 0.7,
    max_tokens: 2048,
    reasoning_effort: 'medium',
    thinking: { type: 'enabled' },
  })
})

it('DeepSeek reasoner 不发送 temperature 且发送 reasoning_effort', async () => {
  fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: 'ok' } }] }))

  await new OpenAiProvider({
    ...baseConfig,
    provider: 'deepseek',
    apiKey: 'deepseek-key',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-reasoner',
    reasoningEffort: 'high',
  }).call(messages)

  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  const body = JSON.parse(init.body as string)

  expect(body).toEqual({
    model: 'deepseek-reasoner',
    messages,
    max_tokens: 2048,
    reasoning_effort: 'high',
  })
  expect(body).not.toHaveProperty('temperature')
})
```

在 `调用时传入的自定义参数会覆盖默认配置` 测试中，把 `provider` 保持为 `openai`，确保旧 OpenAI-compatible 行为继续通过。

- [ ] **步骤 2：运行 OpenAI provider 测试确认失败**

运行：

```bash
npm test -- --run src/lib/ai/providers/openai.test.ts
```

预期：失败，原因是当前请求体无 capability-based mapping。

- [ ] **步骤 3：实现 request body builder**

在 `src/lib/ai/providers/openai.ts` 顶部加入：

```ts
import { getModelDefinition, getProviderDefinition } from '../provider-registry'
```

把 `body: JSON.stringify({ ... })` 替换为：

```ts
body: JSON.stringify(buildOpenAiCompatibleRequestBody(resolvedConfig, messages)),
```

在 `resolveConfig` 后加入：

```ts
export function buildOpenAiCompatibleRequestBody(
  resolvedConfig: AiConfig,
  messages: AiMessage[],
): Record<string, unknown> {
  const modelDefinition = getModelDefinition(resolvedConfig.provider, resolvedConfig.model)
  const body: Record<string, unknown> = {
    model: resolvedConfig.model,
    messages,
  }

  if (modelDefinition?.capabilities.temperature && !modelDefinition.request.omitTemperature) {
    body.temperature = resolvedConfig.temperature
  }

  if (modelDefinition?.capabilities.maxTokens && resolvedConfig.maxTokens !== undefined) {
    body[modelDefinition.request.maxTokensField] = resolvedConfig.maxTokens
  }

  if (
    modelDefinition?.capabilities.reasoningEffort &&
    modelDefinition.request.reasoningEffortField &&
    resolvedConfig.reasoningEffort
  ) {
    body[modelDefinition.request.reasoningEffortField] = resolvedConfig.reasoningEffort
  }

  if (modelDefinition?.capabilities.enableThinking && resolvedConfig.enableThinking !== undefined) {
    if (modelDefinition.request.enableThinkingField) {
      body[modelDefinition.request.enableThinkingField] = resolvedConfig.enableThinking
    }

    if (modelDefinition.request.thinkingObject === 'type') {
      body.thinking = { type: resolvedConfig.enableThinking ? 'enabled' : 'disabled' }
    }
  }

  return body
}
```

把 `getProviderDisplayName` 替换为 registry 版本：

```ts
function getProviderDisplayName(provider: AiConfig['provider']): string {
  return getProviderDefinition(provider).label
}
```

- [ ] **步骤 4：运行 OpenAI provider 测试确认通过**

运行：

```bash
npm test -- --run src/lib/ai/providers/openai.test.ts
```

预期：通过。

- [ ] **步骤 5：提交本任务**

```bash
git add src/lib/ai/providers/openai.ts src/lib/ai/providers/openai.test.ts
git commit -m "feat: map OpenAI compatible requests by model capabilities"
```

## 任务 5：让 settings API 返回 registry 并校验 capability fields

**文件：**

- 修改：`src/lib/ai/settings.ts`
- 修改：`src/lib/api.ts`
- 修改：`src/app/api/ai/settings/route.ts`
- 修改：`src/app/api/ai/settings/route.test.ts`
- 修改：`src/app/api/ai/settings/test/route.ts`
- 修改：`src/app/api/ai/settings/test/route.test.ts`

- [ ] **步骤 1：添加 settings route 失败测试**

在 `src/app/api/ai/settings/route.test.ts` 的 GET 测试中加入：

```ts
expect(body.providers.map((provider: { id: string }) => provider.id)).toEqual([
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
expect(body.reasoningEffort).toBe('')
expect(body.enableThinking).toBeNull()
```

在同一文件新增：

```ts
it('POST 保存 Qwen capability 配置并使用 provider 默认 Base URL', async () => {
  const response = await POST(
    jsonRequest('http://localhost/api/ai/settings', 'POST', {
      provider: 'qwen',
      apiKey: 'dashscope-key',
      model: 'qwen-plus',
      temperature: 0.4,
      maxTokens: 3000,
      enableThinking: true,
      requestTimeoutMs: 120000,
    }),
  )
  const body = await response.json()

  expect(response.status).toBe(200)
  expect(body).toMatchObject({
    configured: true,
    provider: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    enableThinking: true,
  })
  expect(getAiSettings(db)).toMatchObject({
    provider: 'qwen',
    apiKey: 'dashscope-key',
    reasoningEffort: null,
    enableThinking: true,
  })
})

it('POST 拒绝非法 reasoningEffort', async () => {
  const response = await POST(
    jsonRequest('http://localhost/api/ai/settings', 'POST', {
      provider: 'glm',
      apiKey: 'glm-key',
      model: 'glm-4.6',
      reasoningEffort: 'extreme',
    }),
  )
  const body = await response.json()

  expect(response.status).toBe(400)
  expect(body.error).toMatch(/reasoningEffort/i)
})
```

在 `src/app/api/ai/settings/test/route.test.ts` 的 `请求为空时使用已保存配置测试连接` 中给 `upsertAiSettings` 输入加入：

```ts
reasoningEffort: null,
enableThinking: null,
```

并新增：

```ts
it('使用请求中的 Qwen 临时配置测试连接并映射 enableThinking', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        model: 'qwen-plus',
        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
      { status: 200 },
    ),
  )
  vi.stubGlobal('fetch', fetchMock)

  const response = await POST(
    jsonRequest('http://localhost/api/ai/settings/test', 'POST', {
      provider: 'qwen',
      apiKey: 'dashscope-key',
      model: 'qwen-plus',
      enableThinking: true,
    }),
  )
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]

  expect(response.status).toBe(200)
  expect(JSON.parse(init.body as string)).toMatchObject({ enable_thinking: true })
})
```

- [ ] **步骤 2：运行 settings API 测试确认失败**

运行：

```bash
npm test -- --run src/app/api/ai/settings/route.test.ts src/app/api/ai/settings/test/route.test.ts
```

预期：失败，原因是 public settings 没有 providers metadata，routes 仍使用重复 provider 列表且不解析新字段。

- [ ] **步骤 3：更新 settings helper 和前端 API 类型**

在 `src/lib/ai/settings.ts` 中引入 registry：

```ts
import {
  AI_PROVIDER_DEFINITIONS,
  getDefaultBaseUrl,
  type AiProviderDefinition,
  type AiReasoningEffort,
} from './provider-registry'
```

把 `PublicAiSettings` 扩展为：

```ts
export interface PublicAiSettings {
  configured: boolean
  providers: readonly AiProviderDefinition[]
  provider: AiConfig['provider']
  apiKey: ''
  apiKeyMasked: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  reasoningEffort: AiReasoningEffort | ''
  enableThinking: boolean | null
  requestTimeoutMs: number
  updatedAt?: string
}
```

把 `DEFAULT_AI_SETTINGS` 改为：

```ts
export const DEFAULT_AI_SETTINGS: Omit<AiSettings, 'apiKey' | 'updatedAt'> = {
  provider: 'openai',
  baseUrl: getDefaultBaseUrl('openai'),
  model: '',
  temperature: 0.7,
  maxTokens: 2048,
  reasoningEffort: null,
  enableThinking: null,
  requestTimeoutMs: 30000,
}
```

用 registry 替换 `DEFAULT_BASE_URLS`：

```ts
export const DEFAULT_BASE_URLS = Object.fromEntries(
  AI_PROVIDER_DEFINITIONS.map((provider) => [provider.id, provider.defaultBaseUrl]),
) as Record<AiConfig['provider'], string>
```

在 `toPublicAiSettings` 的两个 return 中加入：

```ts
providers: AI_PROVIDER_DEFINITIONS,
reasoningEffort: settings.reasoningEffort ?? '',
enableThinking: settings.enableThinking,
```

未配置分支使用：

```ts
providers: AI_PROVIDER_DEFINITIONS,
reasoningEffort: '',
enableThinking: null,
```

把 `toAiConfig` 改为仅携带非空可选字段：

```ts
export function toAiConfig(settings: AiSettings): AiConfig {
  const config: AiConfig = {
    provider: settings.provider,
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    requestTimeoutMs: settings.requestTimeoutMs,
  }

  if (settings.reasoningEffort) {
    config.reasoningEffort = settings.reasoningEffort
  }

  if (settings.enableThinking !== null) {
    config.enableThinking = settings.enableThinking
  }

  return config
}
```

在 `src/lib/api.ts` 中从 registry 复用类型：

```ts
import type { AiProviderDefinition, AiProviderName, AiReasoningEffort } from '@/lib/ai/provider-registry'
```

删除本地 `AiProviderName` union，并把 settings 类型扩展为：

```ts
export interface AiSettingsResponse {
  configured: boolean
  providers: readonly AiProviderDefinition[]
  provider: AiProviderName
  apiKey: ''
  apiKeyMasked: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  reasoningEffort: AiReasoningEffort | ''
  enableThinking: boolean | null
  requestTimeoutMs: number
  updatedAt?: string
}

export interface AiSettingsPayload {
  provider: AiProviderName
  apiKey?: string
  baseUrl?: string
  model: string
  temperature?: number
  maxTokens?: number
  reasoningEffort?: AiReasoningEffort | ''
  enableThinking?: boolean | null
  requestTimeoutMs?: number
}
```

- [ ] **步骤 4：更新 settings POST route 校验**

在 `src/app/api/ai/settings/route.ts` 中删除 `SUPPORTED_PROVIDERS`，引入：

```ts
import {
  getModelDefinition,
  getProviderDefinition,
  isAiProviderName,
  type AiReasoningEffort,
} from '@/lib/ai/provider-registry'
```

把 API Key 校验改为：

```ts
const providerDefinition = getProviderDefinition(provider)
if (providerDefinition.requiresApiKey && apiKey.trim().length === 0) {
  return { error: 'AI API key is required' }
}
```

在 parse 函数中加入：

```ts
const modelDefinition = getModelDefinition(provider, model)
const reasoningEffort = parseReasoningEffort(body.reasoningEffort, current?.reasoningEffort ?? null)
if ('error' in reasoningEffort) {
  return reasoningEffort
}
const enableThinking = parseNullableBoolean(body.enableThinking, current?.enableThinking ?? null)
if ('error' in enableThinking) {
  return enableThinking
}
```

并在返回 settings 中使用 capability gate：

```ts
reasoningEffort: modelDefinition?.capabilities.reasoningEffort ? reasoningEffort.value : null,
enableThinking: modelDefinition?.capabilities.enableThinking ? enableThinking.value : null,
```

把 `parseProvider` 改为：

```ts
function parseProvider(value: unknown): AiProviderName | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim().toLowerCase()

  return isAiProviderName(normalized) ? normalized : null
}
```

新增 helper：

```ts
function parseReasoningEffort(
  value: unknown,
  fallback: AiReasoningEffort | null,
): { value: AiReasoningEffort | null } | { error: string } {
  if (value === undefined || value === null || value === '') {
    return { value: fallback }
  }

  if (value === 'low' || value === 'medium' || value === 'high') {
    return { value }
  }

  return { error: 'AI reasoningEffort must be one of: low, medium, high' }
}

function parseNullableBoolean(value: unknown, fallback: boolean | null): { value: boolean | null } | { error: string } {
  if (value === undefined || value === null || value === '') {
    return { value: fallback }
  }

  if (typeof value === 'boolean') {
    return { value }
  }

  return { error: 'AI enableThinking must be a boolean' }
}
```

- [ ] **步骤 5：更新 settings test route 校验**

在 `src/app/api/ai/settings/test/route.ts` 中删除 `SUPPORTED_PROVIDERS`，并在 import 区加入：

```ts
import {
  getModelDefinition,
  getProviderDefinition,
  isAiProviderName,
  type AiReasoningEffort,
} from '@/lib/ai/provider-registry'
```

把 `parseConfigFromBody` 替换为：

```ts
function parseConfigFromBody(
  body: Record<string, unknown>,
  current: AiSettings | null,
): { config: ReturnType<typeof toAiConfig> } | { error: string } {
  const provider = parseProvider(body.provider)
  if (!provider) {
    return { error: 'Unsupported AI provider' }
  }

  const model = parseString(body.model)
  if (!model) {
    return { error: 'AI model is required' }
  }

  const providerDefinition = getProviderDefinition(provider)
  const modelDefinition = getModelDefinition(provider, model)
  const apiKey = parseString(body.apiKey) ?? current?.apiKey ?? ''
  if (providerDefinition.requiresApiKey && apiKey.length === 0) {
    return { error: 'AI API key is required' }
  }

  const reasoningEffort = parseReasoningEffort(body.reasoningEffort, current?.reasoningEffort ?? null)
  if ('error' in reasoningEffort) {
    return reasoningEffort
  }

  const enableThinking = parseNullableBoolean(body.enableThinking, current?.enableThinking ?? null)
  if ('error' in enableThinking) {
    return enableThinking
  }

  const config: ReturnType<typeof toAiConfig> = {
    provider,
    apiKey,
    baseUrl: parseString(body.baseUrl) ?? DEFAULT_BASE_URLS[provider],
    model,
    temperature: parseNumber(body.temperature, current?.temperature ?? 0.7),
    maxTokens: parseInteger(body.maxTokens, current?.maxTokens ?? 2048),
    requestTimeoutMs: parseInteger(body.requestTimeoutMs, current?.requestTimeoutMs ?? 30000),
  }

  if (modelDefinition?.capabilities.reasoningEffort && reasoningEffort.value) {
    config.reasoningEffort = reasoningEffort.value
  }

  if (modelDefinition?.capabilities.enableThinking && enableThinking.value !== null) {
    config.enableThinking = enableThinking.value
  }

  return { config }
}
```

把该文件内的 `parseProvider` 替换为：

```ts
function parseProvider(value: unknown): AiProviderName | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim().toLowerCase()

  return isAiProviderName(normalized) ? normalized : null
}
```

在 `parseInteger` 后加入：

```ts
function parseReasoningEffort(
  value: unknown,
  fallback: AiReasoningEffort | null,
): { value: AiReasoningEffort | null } | { error: string } {
  if (value === undefined || value === null || value === '') {
    return { value: fallback }
  }

  if (value === 'low' || value === 'medium' || value === 'high') {
    return { value }
  }

  return { error: 'AI reasoningEffort must be one of: low, medium, high' }
}

function parseNullableBoolean(value: unknown, fallback: boolean | null): { value: boolean | null } | { error: string } {
  if (value === undefined || value === null || value === '') {
    return { value: fallback }
  }

  if (typeof value === 'boolean') {
    return { value }
  }

  return { error: 'AI enableThinking must be a boolean' }
}
```

- [ ] **步骤 6：运行 settings API 测试确认通过**

运行：

```bash
npm test -- --run src/app/api/ai/settings/route.test.ts src/app/api/ai/settings/test/route.test.ts
```

预期：通过。

- [ ] **步骤 7：提交本任务**

```bash
git add src/lib/ai/settings.ts src/lib/api.ts src/app/api/ai/settings/route.ts src/app/api/ai/settings/route.test.ts src/app/api/ai/settings/test/route.ts src/app/api/ai/settings/test/route.test.ts
git commit -m "feat: expose AI provider capabilities in settings API"
```

## 任务 6：实现 capability-based AI settings UI

**文件：**

- 修改：`src/app/[lang]/ai-settings/page.tsx`
- 修改：`src/app/[lang]/ai-settings/page.test.tsx`
- 修改：`src/app/i18n/dictionaries.ts`

- [ ] **步骤 1：添加页面失败测试**

在 `src/app/[lang]/ai-settings/page.test.tsx` 中引入 registry：

```ts
import { AI_PROVIDER_DEFINITIONS } from '@/lib/ai/provider-registry'
```

在 `mockedFetchAiSettings.mockResolvedValue` 对象中加入：

```ts
providers: AI_PROVIDER_DEFINITIONS,
reasoningEffort: '',
enableThinking: null,
```

把 provider 选项断言改为包含新增 provider：

```ts
;[
  'OpenAI',
  'DeepSeek',
  'Qwen / DashScope',
  'Kimi / Moonshot',
  'GLM / Z.AI',
  'Anthropic Claude',
  'Google Gemini',
  'Ollama',
  'Custom OpenAI-compatible',
].forEach((name) => {
  expect(screen.getByRole('option', { name })).toBeInTheDocument()
})
```

新增测试：

```ts
it('按模型能力隐藏 Kimi temperature 并提交 maxTokens', async () => {
  const user = userEvent.setup()
  mockedSaveAiSettings.mockResolvedValue({
    configured: true,
    providers: AI_PROVIDER_DEFINITIONS,
    provider: 'kimi',
    apiKey: '',
    apiKeyMasked: 'moon************-key',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'kimi-k2.7',
    temperature: 0.7,
    maxTokens: 4096,
    reasoningEffort: '',
    enableThinking: null,
    requestTimeoutMs: 30000,
  })
  renderWithI18n(<AiSettingsPage />)

  await user.selectOptions(await screen.findByLabelText('Provider'), 'kimi')
  expect(screen.queryByLabelText('采样温度')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Max Tokens')).toBeInTheDocument()

  await user.clear(screen.getByLabelText('API Key'))
  await user.type(screen.getByLabelText('API Key'), 'moonshot-key')
  await user.click(screen.getByRole('button', { name: /保存配置/ }))

  await waitFor(() => {
    expect(mockedSaveAiSettings).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'kimi',
      model: 'kimi-k2.7',
      maxTokens: 4096,
    }))
  })
  expect(mockedSaveAiSettings).toHaveBeenCalledWith(expect.not.objectContaining({ enableThinking: true }))
})

it('Qwen 显示 enableThinking 控件并提交布尔值', async () => {
  const user = userEvent.setup()
  mockedSaveAiSettings.mockResolvedValue({
    configured: true,
    providers: AI_PROVIDER_DEFINITIONS,
    provider: 'qwen',
    apiKey: '',
    apiKeyMasked: 'dash************-key',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    temperature: 0.7,
    maxTokens: 2048,
    reasoningEffort: '',
    enableThinking: true,
    requestTimeoutMs: 30000,
  })
  renderWithI18n(<AiSettingsPage />)

  await user.selectOptions(await screen.findByLabelText('Provider'), 'qwen')
  expect(screen.getByLabelText('启用 Thinking')).toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('启用 Thinking'), 'true')
  await user.clear(screen.getByLabelText('API Key'))
  await user.type(screen.getByLabelText('API Key'), 'dashscope-key')
  await user.click(screen.getByRole('button', { name: /保存配置/ }))

  await waitFor(() => {
    expect(mockedSaveAiSettings).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'qwen',
      enableThinking: true,
    }))
  })
})
```

- [ ] **步骤 2：运行页面测试确认失败**

运行：

```bash
npm test -- --run src/app/[lang]/ai-settings/page.test.tsx
```

预期：失败，原因是页面仍用本地硬编码 providerOptions，且不存在 capability 控件。

- [ ] **步骤 3：更新 i18n 文案**

在 `src/app/i18n/dictionaries.ts` 的 `zhCN.aiSettings` 中更新或新增：

```ts
description: '配置 Provider、API Key、Base URL 和模型能力参数。',
connectionDescription: '支持 OpenAI、DeepSeek、Qwen、Kimi、GLM、Anthropic、Gemini、Ollama 和任意 OpenAI 兼容端点。',
temperature: '采样温度',
reasoningEffort: '推理强度',
enableThinking: '启用 Thinking',
temperatureInvalid: '采样温度必须是数字',
reasoningEffortInvalid: '推理强度必须是 low、medium 或 high',
```

在 `enUS.aiSettings` 中保持同一 key 集合：

```ts
description: 'Configure Provider, API Key, Base URL, and model capability parameters.',
connectionDescription: 'Supports OpenAI, DeepSeek, Qwen, Kimi, GLM, Anthropic, Gemini, Ollama, and any OpenAI-compatible endpoint.',
temperature: 'Sampling Temperature',
reasoningEffort: 'Reasoning Effort',
enableThinking: 'Enable Thinking',
temperatureInvalid: 'Sampling Temperature must be a number',
reasoningEffortInvalid: 'Reasoning Effort must be low, medium, or high',
```

- [ ] **步骤 4：更新 AI settings page state 与 provider source**

在 `src/app/[lang]/ai-settings/page.tsx` 的 imports 中加入：

```ts
import type { AiProviderDefinition, AiModelDefinition, AiReasoningEffort } from '@/lib/ai/provider-registry'
```

把 `AiSettingsForm` 扩展为：

```ts
interface AiSettingsForm {
  provider: AiProviderName
  apiKey: string
  baseUrl: string
  model: string
  temperature: string
  maxTokens: string
  reasoningEffort: AiReasoningEffort | ''
  enableThinking: '' | 'true' | 'false'
  requestTimeoutMs: string
}
```

删除本地 `providerOptions` 常量。把 `defaultForm` 加入：

```ts
reasoningEffort: '',
enableThinking: '',
```

在组件 state 中加入：

```ts
const [providers, setProviders] = useState<readonly AiProviderDefinition[]>([])
```

把 `selectedProvider` 和新增 `selectedModel` 改为：

```ts
const selectedProvider = useMemo(
  () => providers.find((provider) => provider.id === form.provider) ?? providers[0],
  [form.provider, providers],
)

const selectedModel = useMemo(
  () => getSelectedModel(selectedProvider, form.model),
  [form.model, selectedProvider],
)
```

在 settings load 成功时加入：

```ts
setProviders(settings.providers)
```

并给 `setForm` 加入：

```ts
reasoningEffort: settings.reasoningEffort,
enableThinking: settings.enableThinking === null ? '' : String(settings.enableThinking) as 'true' | 'false',
```

- [ ] **步骤 5：更新 provider/model change、payload 和 validation**

把 `handleProviderChange` 改为：

```ts
const handleProviderChange = (provider: AiProviderName) => {
  const nextProvider = providers.find((option) => option.id === provider) ?? providers[0]
  if (!nextProvider) return

  const nextModel = nextProvider.defaultModel || ''
  const modelDefinition = getSelectedModel(nextProvider, nextModel)

  setForm((current) => ({
    ...current,
    provider,
    baseUrl: nextProvider.defaultBaseUrl,
    model: nextModel,
    temperature: String(modelDefinition?.defaultTemperature ?? 0.7),
    maxTokens: String(modelDefinition?.defaultMaxTokens ?? 2048),
    reasoningEffort: '',
    enableThinking: '',
    apiKey: nextProvider.requiresApiKey ? current.apiKey : '',
  }))
}
```

把 `buildPayload` 改为 capability gate：

```ts
const buildPayload = (): AiSettingsPayload => {
  const payload: AiSettingsPayload = {
    provider: form.provider,
    apiKey: form.apiKey.trim(),
    baseUrl: form.baseUrl.trim(),
    model: form.model.trim(),
    requestTimeoutMs: Number(form.requestTimeoutMs),
  }

  if (selectedModel?.capabilities.temperature) {
    payload.temperature = Number(form.temperature)
  }

  if (selectedModel?.capabilities.maxTokens) {
    payload.maxTokens = Number(form.maxTokens)
  }

  if (selectedModel?.capabilities.reasoningEffort) {
    payload.reasoningEffort = form.reasoningEffort
  }

  if (selectedModel?.capabilities.enableThinking) {
    payload.enableThinking = form.enableThinking === '' ? null : form.enableThinking === 'true'
  }

  return payload
}
```

把 `validate` 中 `selectedProvider.requiresApiKey` 前加空值保护，并只校验可见字段：

```ts
if (!selectedProvider) return t.aiSettings.providerRequired
if (!form.model.trim()) return t.aiSettings.modelRequired
if (selectedProvider.requiresApiKey && !form.apiKey.trim() && !apiKeyMasked) return t.aiSettings.apiKeyRequired
if (selectedModel?.capabilities.temperature && !Number.isFinite(Number(form.temperature))) return t.aiSettings.temperatureInvalid
if (selectedModel?.capabilities.maxTokens && (!Number.isInteger(Number(form.maxTokens)) || Number(form.maxTokens) <= 0)) return t.aiSettings.maxTokensInvalid
if (selectedModel?.capabilities.reasoningEffort && form.reasoningEffort && !['low', 'medium', 'high'].includes(form.reasoningEffort)) return t.aiSettings.reasoningEffortInvalid
if (!Number.isInteger(Number(form.requestTimeoutMs)) || Number(form.requestTimeoutMs) <= 0) return t.aiSettings.timeoutInvalid
return null
```

在 i18n 字典中同步新增 `providerRequired`：中文 `请选择 Provider`，英文 `Provider is required`。

- [ ] **步骤 6：更新 JSX 为 capability-based 表单**

把 provider options 渲染改为：

```tsx
{providers.map((provider) => (
  <option key={provider.id} value={provider.id}>{provider.label}</option>
))}
```

把 API Key description 改为：

```tsx
description={selectedProvider?.requiresApiKey ? '不会回显完整密钥；留空保存时会保留已有密钥。' : '本地模型通常不需要 API Key。'}
```

把 model input 改为带 datalist：

```tsx
<FormField label={t.aiSettings.model} htmlFor="model">
  <Input
    id="model"
    aria-label={t.aiSettings.model}
    list="ai-model-options"
    value={form.model}
    placeholder={selectedProvider?.defaultModel || '输入模型名称'}
    onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
  />
  <datalist id="ai-model-options">
    {selectedProvider?.models.map((model) => (
      <option key={model.id} value={model.id}>{model.label}</option>
    ))}
  </datalist>
</FormField>
```

用 capability gate 替换温度和 max tokens 区域：

```tsx
<div className="grid gap-4 md:grid-cols-2">
  {selectedModel?.capabilities.temperature && (
    <FormField label={t.aiSettings.temperature} htmlFor="temperature">
      <Input id="temperature" aria-label={t.aiSettings.temperature} inputMode="decimal" value={form.temperature} onChange={(event) => setForm((current) => ({ ...current, temperature: event.target.value }))} />
    </FormField>
  )}
  {selectedModel?.capabilities.maxTokens && (
    <FormField label={t.aiSettings.maxTokens} htmlFor="max-tokens">
      <Input id="max-tokens" aria-label={t.aiSettings.maxTokens} inputMode="numeric" value={form.maxTokens} onChange={(event) => setForm((current) => ({ ...current, maxTokens: event.target.value }))} />
    </FormField>
  )}
  {selectedModel?.capabilities.reasoningEffort && (
    <FormField label={t.aiSettings.reasoningEffort} htmlFor="reasoning-effort">
      <select id="reasoning-effort" aria-label={t.aiSettings.reasoningEffort} className="h-10 rounded-md border bg-background px-3 text-sm" value={form.reasoningEffort} onChange={(event) => setForm((current) => ({ ...current, reasoningEffort: event.target.value as AiReasoningEffort | '' }))}>
        <option value="">Default</option>
        <option value="low">low</option>
        <option value="medium">medium</option>
        <option value="high">high</option>
      </select>
    </FormField>
  )}
  {selectedModel?.capabilities.enableThinking && (
    <FormField label={t.aiSettings.enableThinking} htmlFor="enable-thinking">
      <select id="enable-thinking" aria-label={t.aiSettings.enableThinking} className="h-10 rounded-md border bg-background px-3 text-sm" value={form.enableThinking} onChange={(event) => setForm((current) => ({ ...current, enableThinking: event.target.value as '' | 'true' | 'false' }))}>
        <option value="">Default</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    </FormField>
  )}
</div>
```

在文件末尾 `getErrorMessage` 前加入 helper：

```ts
function getSelectedModel(
  provider: AiProviderDefinition | undefined,
  model: string,
): AiModelDefinition | undefined {
  if (!provider) {
    return undefined
  }

  return (
    provider.models.find((definition) => definition.id === model.trim()) ??
    provider.models.find((definition) => definition.id === provider.defaultModel) ??
    provider.models[0]
  )
}
```

- [ ] **步骤 7：运行页面测试确认通过**

运行：

```bash
npm test -- --run src/app/[lang]/ai-settings/page.test.tsx
```

预期：通过。

- [ ] **步骤 8：提交本任务**

```bash
git add src/app/[lang]/ai-settings/page.tsx src/app/[lang]/ai-settings/page.test.tsx src/app/i18n/dictionaries.ts
git commit -m "feat: render AI settings by model capabilities"
```

## 任务 7：更新文档中的 provider 与参数语义

**文件：**

- 修改：`README.md`
- 修改：`docs/plan.md`

- [ ] **步骤 1：更新 README provider 表**

把 `README.md` 的技术栈 provider bullet 改为：

```md
- OpenAI 兼容 API / DeepSeek / Qwen / Kimi / GLM / Anthropic Claude / Google Gemini / Ollama / Custom AI Provider
```

把 `支持的 provider` 表改为：

```md
| Provider | 说明 | 默认 Base URL | 示例模型 |
|:---|:---|:---|:---|
| `openai` | OpenAI 官方 Chat Completions | `https://api.openai.com/v1` | `gpt-4o-mini` |
| `deepseek` | DeepSeek，OpenAI 兼容格式 | `https://api.deepseek.com` | `deepseek-chat` / `deepseek-reasoner` |
| `qwen` | 阿里云百炼 DashScope，OpenAI 兼容格式 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| `kimi` | Moonshot Kimi，OpenAI 兼容格式 | `https://api.moonshot.cn/v1` | `kimi-k2.7` |
| `glm` | Z.AI GLM，OpenAI 兼容格式 | `https://api.z.ai/api/paas/v4` | `glm-4.6` |
| `anthropic` | Anthropic Claude Messages API | `https://api.anthropic.com/v1` | `claude-3-5-sonnet-latest` |
| `gemini` | Google Gemini generateContent API | `https://generativelanguage.googleapis.com/v1beta` | `gemini-1.5-flash` |
| `ollama` | 本地 Ollama | `http://localhost:11434` | `llama3.1` |
| `custom` | 任意 OpenAI 兼容端点，高级自定义入口 | 自行填写 | 供应商自定义模型名 |
```

把环境变量 provider 行改为包含新增 provider：

```md
| `AI_PROVIDER` | 否 | `openai` | 支持 `openai`、`deepseek`、`qwen`、`kimi`、`glm`、`anthropic`、`gemini`、`ollama`、`custom` |
```

把 `AI_TEMPERATURE` 说明改为：

```md
| `AI_TEMPERATURE` | 否 | `0.7` | 采样温度；仅对支持该参数的模型发送，不表示推理强度 |
```

在 `AI_MAX_TOKENS` 后加入：

```md
| `AI_REASONING_EFFORT` | 否 | - | 推理强度，可选 `low`、`medium`、`high`；仅对支持该参数的模型发送 |
| `AI_ENABLE_THINKING` | 否 | - | 是否开启 thinking，可选 `true` 或 `false`；仅对支持该参数的模型发送 |
```

- [ ] **步骤 2：更新 docs/plan.md 第四阶段描述**

把第四阶段 AI Provider 抽象 bullet 改为：

```md
- AI Provider 抽象：支持 OpenAI、DeepSeek、Qwen、Kimi、GLM、Anthropic Claude、Google Gemini、本地 Ollama 与任意 OpenAI 兼容 Custom 端点；OpenAI-compatible 厂商复用 adapter，但按 provider/model 能力映射请求参数。
```

把 AI 配置页面 bullet 改为：

```md
- AI 配置页面：新增 `/ai-settings`，可在浏览器中配置 provider、API Key、Base URL、model、采样温度、输出 token、推理强度与 thinking 开关；表单按模型能力显示字段，配置持久化到 SQLite `ai_settings` 表。
```

- [ ] **步骤 3：运行文档关键词检查**

运行：

```bash
rg "temperature 和 max tokens|生成温度|https://api.deepseek.com/v1|支持 `openai`、`deepseek`、`anthropic`" README.md docs/plan.md
```

预期：无输出。

- [ ] **步骤 4：提交本任务**

```bash
git add README.md docs/plan.md
git commit -m "docs: document AI provider capabilities"
```

## 任务 8：全量回归与构建验证

**文件：**

- 验证：`package.json` scripts
- 验证：全仓库 TypeScript、Vitest、ESLint、Next build

- [ ] **步骤 1：运行新增和相关测试**

运行：

```bash
npm test -- --run src/lib/ai/provider-registry.test.ts src/lib/ai/provider.test.ts src/lib/ai/providers/openai.test.ts src/lib/db.test.ts src/app/api/ai/settings/route.test.ts src/app/api/ai/settings/test/route.test.ts src/app/[lang]/ai-settings/page.test.tsx
```

预期：全部通过。

- [ ] **步骤 2：运行全量单元测试**

运行：

```bash
npm run test:run
```

预期：全部通过。

- [ ] **步骤 3：运行 lint**

运行：

```bash
npm run lint
```

预期：无 error。

- [ ] **步骤 4：运行生产构建**

运行：

```bash
npm run build
```

预期：构建成功。

- [ ] **步骤 5：检查工作区 diff**

运行：

```bash
git status --short
git diff -- src/lib/ai/provider-registry.ts src/lib/ai/types.ts src/lib/ai/settings.ts src/lib/ai/provider.ts src/lib/ai/providers/openai.ts src/lib/db.ts src/lib/api.ts src/app/api/ai/settings/route.ts src/app/api/ai/settings/test/route.ts src/app/[lang]/ai-settings/page.tsx src/app/i18n/dictionaries.ts README.md docs/plan.md
```

预期：只包含本计划列出的 provider capability 相关修改。

- [ ] **步骤 6：最终提交**

```bash
git add src/lib/ai/provider-registry.ts src/lib/ai/provider-registry.test.ts src/lib/ai/types.ts src/lib/ai/settings.ts src/lib/ai/provider.ts src/lib/ai/provider.test.ts src/lib/ai/providers/openai.ts src/lib/ai/providers/openai.test.ts src/lib/db.ts src/lib/db.test.ts src/lib/api.ts src/app/api/ai/settings/route.ts src/app/api/ai/settings/route.test.ts src/app/api/ai/settings/test/route.ts src/app/api/ai/settings/test/route.test.ts src/app/[lang]/ai-settings/page.tsx src/app/[lang]/ai-settings/page.test.tsx src/app/i18n/dictionaries.ts README.md docs/plan.md
git commit -m "feat: add AI provider capability registry"
```

## 验收标准

- `qwen`、`kimi`、`glm`、`deepseek`、现有 provider 和 `custom` 都来自 `provider-registry.ts`，没有重复硬编码 provider 列表。
- `/api/ai/settings` GET 返回 provider/model/capability metadata，POST 能保存新增 provider 和可空推理字段。
- `/api/ai/settings/test` 能用临时配置测试 Qwen/Kimi/GLM/DeepSeek，并通过 OpenAI-compatible adapter 发出 provider-specific 请求体。
- `temperature` 在 UI 和文档中称为“采样温度”，不再被描述为“推理强度”。
- Kimi K2.7 request body 不发送 `temperature`，使用 `max_completion_tokens`。
- Qwen request body 在配置时发送 `enable_thinking`。
- GLM request body 在配置时发送 `reasoning_effort` 和 `thinking.type`。
- DeepSeek reasoner request body 不发送 `temperature`，在配置时发送 `reasoning_effort`。
- `/ai-settings` 页面按模型能力显示字段，不支持的字段不校验、不提交。
- `npm run test:run`、`npm run lint`、`npm run build` 全部通过。
