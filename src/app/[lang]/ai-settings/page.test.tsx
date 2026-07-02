import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { fetchAiSettings, saveAiSettings, testAiSettings } from '@/lib/api'

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
      provider: 'openai',
      apiKey: '',
      apiKeyMasked: '',
      baseUrl: 'https://api.openai.com/v1',
      model: '',
      temperature: 0.7,
      maxTokens: 2048,
      requestTimeoutMs: 30000,
    })
  })

  it('加载并展示 AI 配置表单和主流 Provider 选项', async () => {
    render(<AiSettingsPage />)

    expect(await screen.findByRole('heading', { name: 'AI 配置' })).toBeInTheDocument()
    ;['OpenAI', 'DeepSeek', 'Anthropic Claude', 'Google Gemini', 'Ollama', 'Custom OpenAI-compatible'].forEach((name) => {
      expect(screen.getByRole('option', { name })).toBeInTheDocument()
    })
  })

  it('保存配置时调用 saveAiSettings 并显示成功提示', async () => {
    const user = userEvent.setup()
    mockedSaveAiSettings.mockResolvedValue({
      configured: true,
      provider: 'anthropic',
      apiKey: '',
      apiKeyMasked: 'sk-a************3456',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-5-sonnet-latest',
      temperature: 0.2,
      maxTokens: 4096,
      requestTimeoutMs: 30000,
    })
    render(<AiSettingsPage />)

    await user.selectOptions(await screen.findByLabelText('Provider'), 'anthropic')
    await user.clear(screen.getByLabelText('API Key'))
    await user.type(screen.getByLabelText('API Key'), 'sk-ant-abcdef123456')
    await user.clear(screen.getByLabelText('Model'))
    await user.type(screen.getByLabelText('Model'), 'claude-3-5-sonnet-latest')
    await user.click(screen.getByRole('button', { name: /保存配置/ }))

    await waitFor(() => expect(mockedSaveAiSettings).toHaveBeenCalledWith(expect.objectContaining({ provider: 'anthropic' })))
    expect(await screen.findByText(/AI 配置已保存/)).toBeInTheDocument()
  })

  it('测试连接时调用 testAiSettings 并显示结果', async () => {
    const user = userEvent.setup()
    mockedTestAiSettings.mockResolvedValue({ success: true, model: 'gpt-4o-mini', tokensIn: 1, tokensOut: 1 })
    render(<AiSettingsPage />)

    await user.clear(await screen.findByLabelText('API Key'))
    await user.type(screen.getByLabelText('API Key'), 'sk-test')
    await user.clear(screen.getByLabelText('Model'))
    await user.type(screen.getByLabelText('Model'), 'gpt-4o-mini')
    await user.click(screen.getByRole('button', { name: /测试连接/ }))

    await waitFor(() => expect(mockedTestAiSettings).toHaveBeenCalled())
    expect(await screen.findByText(/连接成功/)).toBeInTheDocument()
  })
})
