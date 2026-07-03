import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AI_PROVIDER_DEFINITIONS } from '@/lib/ai/provider-registry'
import { fetchAiSettings, saveAiSettings, testAiSettings } from '@/lib/api'
import { renderWithI18n } from '@/test/renderWithI18n'

import AiSettingsPage from './page'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')

  return {
    ...actual,
    fetchAiSettings: vi.fn(),
    saveAiSettings: vi.fn(),
    testAiSettings: vi.fn(),
  }
})

const mockedFetchAiSettings = vi.mocked(fetchAiSettings)
const mockedSaveAiSettings = vi.mocked(saveAiSettings)
const mockedTestAiSettings = vi.mocked(testAiSettings)

describe('AiSettingsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedFetchAiSettings.mockResolvedValue({
      configured: false,
      providers: AI_PROVIDER_DEFINITIONS,
      provider: 'openai',
      apiKey: '',
      apiKeyMasked: '',
      baseUrl: 'https://api.openai.com/v1',
      model: '',
      temperature: 0.7,
      maxTokens: 2048,
      reasoningEffort: '',
      enableThinking: null,
      requestTimeoutMs: 30000,
    })
  })

  it('加载并展示 AI 配置表单和主流 Provider 选项', async () => {
    renderWithI18n(<AiSettingsPage />)

    expect(await screen.findByRole('heading', { name: 'AI 配置' })).toBeInTheDocument()
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
  })

  it('保存配置时调用 saveAiSettings 并显示成功提示', async () => {
    const user = userEvent.setup()
    mockedSaveAiSettings.mockResolvedValue({
      configured: true,
      providers: AI_PROVIDER_DEFINITIONS,
      provider: 'anthropic',
      apiKey: '',
      apiKeyMasked: 'sk-a************3456',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-5-sonnet-latest',
      temperature: 0.2,
      maxTokens: 4096,
      reasoningEffort: '',
      enableThinking: null,
      requestTimeoutMs: 30000,
    })
    renderWithI18n(<AiSettingsPage />)

    await user.selectOptions(await screen.findByLabelText('Provider'), 'anthropic')
    await user.clear(screen.getByLabelText('API Key'))
    await user.type(screen.getByLabelText('API Key'), 'sk-ant-abcdef123456')
    await user.clear(screen.getByLabelText('Model'))
    await user.type(screen.getByLabelText('Model'), 'claude-3-5-sonnet-latest')
    await user.click(screen.getByRole('button', { name: /保存配置/ }))

    await waitFor(() => expect(mockedSaveAiSettings).toHaveBeenCalledWith(expect.objectContaining({ provider: 'anthropic' })))
    expect(await screen.findByText(/AI 配置已保存/)).toBeInTheDocument()
  })

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
  it('测试连接时调用 testAiSettings 并显示结果', async () => {
    const user = userEvent.setup()
    mockedTestAiSettings.mockResolvedValue({ success: true, model: 'gpt-4o-mini', tokensIn: 1, tokensOut: 1 })
    renderWithI18n(<AiSettingsPage />)

    await user.clear(await screen.findByLabelText('API Key'))
    await user.type(screen.getByLabelText('API Key'), 'sk-test')
    await user.clear(screen.getByLabelText('Model'))
    await user.type(screen.getByLabelText('Model'), 'gpt-4o-mini')
    await user.click(screen.getByRole('button', { name: /测试连接/ }))

    await waitFor(() => expect(mockedTestAiSettings).toHaveBeenCalled())
    expect(await screen.findByText(/连接成功/)).toBeInTheDocument()
  })

  it('英文语言下显示英文配置页面文案', async () => {
    renderWithI18n(<AiSettingsPage />, { locale: 'en-US' })

    expect(await screen.findByText('AI Settings')).toBeInTheDocument()
    expect(screen.getByText('Model Connection Settings')).toBeInTheDocument()
  })
})
