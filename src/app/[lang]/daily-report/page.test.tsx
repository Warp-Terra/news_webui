import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { generateDailyReport } from '@/lib/api'
import { renderWithI18n } from '@/test/renderWithI18n'
import DailyReportPage from './page'

vi.mock('@/lib/api', () => ({
  generateDailyReport: vi.fn(),
}))

const mockedGenerateDailyReport = vi.mocked(generateDailyReport)

describe('DailyReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGenerateDailyReport.mockResolvedValue({
      markdown: '# 全球情报日报\n\n- AI 出口管制升级',
      newsCount: 6,
      tokensIn: 120,
      tokensOut: 80,
    })
  })

  it('页面渲染标题、日期选择器和生成日报按钮', () => {
    renderWithI18n(<DailyReportPage />)

    expect(screen.getByRole('heading', { name: 'AI 日报' })).toBeInTheDocument()
    expect(screen.getByLabelText('日报日期')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /生成日报/ })).toBeInTheDocument()
  })

  it('点击生成日报成功后显示 markdown 内容、新闻数量和 token 消耗', async () => {
    const user = userEvent.setup()
    renderWithI18n(<DailyReportPage />)

    await user.click(screen.getByRole('button', { name: /生成日报/ }))

    await waitFor(() => expect(mockedGenerateDailyReport).toHaveBeenCalled())
    expect(await screen.findByText(/全球情报日报/)).toBeInTheDocument()
    expect(screen.getByText('6 条')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('生成日报失败时显示错误信息', async () => {
    const user = userEvent.setup()
    mockedGenerateDailyReport.mockRejectedValueOnce(new Error('daily report failed'))
    renderWithI18n(<DailyReportPage />)

    await user.click(screen.getByRole('button', { name: /生成日报/ }))

    expect(await screen.findByText('daily report failed')).toBeInTheDocument()
  })

  it('英文语言下显示英文日报页面文案', () => {
    renderWithI18n(<DailyReportPage />, { locale: 'en-US' })

    expect(screen.getByText('AI Daily Report')).toBeInTheDocument()
    expect(screen.getByText('Generate Daily Report')).toBeInTheDocument()
  })
})
