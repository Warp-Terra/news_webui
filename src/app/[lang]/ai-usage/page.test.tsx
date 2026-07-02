import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { fetchAiUsage, type AiUsageItem } from '@/lib/api'
import AiUsagePage from './page'

vi.mock('@/lib/api', () => ({
  fetchAiUsage: vi.fn(),
}))

const mockedFetchAiUsage = vi.mocked(fetchAiUsage)

const usageItems: AiUsageItem[] = [
  {
    id: 1,
    date: '2026-04-23',
    model: 'gpt-4.1-mini',
    provider: 'openai',
    tokensIn: 120,
    tokensOut: 80,
    costUsd: 0.002,
    newsId: 'news-001',
    operation: 'summarize',
    createdAt: '2026-04-23T10:05:00.000Z',
  },
  {
    id: 2,
    date: '2026-04-24',
    model: 'gpt-4.1-mini',
    provider: 'openai',
    tokensIn: 300,
    tokensOut: 200,
    costUsd: 0.005,
    newsId: null,
    operation: 'daily-report',
    createdAt: '2026-04-24T10:05:00.000Z',
  },
]

describe('AiUsagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedFetchAiUsage.mockResolvedValue({
      items: usageItems,
      totalTokens: 700,
      totalCost: 0.007,
    })
  })

  it('页面渲染标题和日期范围选择', async () => {
    render(<AiUsagePage />)

    expect(screen.getByRole('heading', { name: 'AI 用量' })).toBeInTheDocument()
    expect(screen.getByLabelText('开始日期')).toBeInTheDocument()
    expect(screen.getByLabelText('结束日期')).toBeInTheDocument()
    await waitFor(() => expect(mockedFetchAiUsage).toHaveBeenCalled())
  })

  it('日期范围默认最近 7 天', async () => {
    render(<AiUsagePage />)

    const endDate = getLocalIsoDate(new Date())
    const start = new Date(`${endDate}T00:00:00.000`)
    start.setDate(start.getDate() - 6)

    expect(screen.getByLabelText('结束日期')).toHaveValue(endDate)
    expect(screen.getByLabelText('开始日期')).toHaveValue(getLocalIsoDate(start))
    await waitFor(() => expect(mockedFetchAiUsage).toHaveBeenCalledWith(getLocalIsoDate(start), endDate))
  })

  it('显示统计卡片', async () => {
    render(<AiUsagePage />)

    expect(await screen.findByText('总 Token 数')).toBeInTheDocument()
    expect(screen.getByText('700')).toBeInTheDocument()
    expect(screen.getByText('总费用（USD）')).toBeInTheDocument()
    expect(screen.getByText('$0.0070')).toBeInTheDocument()
    expect(screen.getByText('调用次数')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('显示使用记录表格', async () => {
    render(<AiUsagePage />)

    expect(await screen.findAllByText('gpt-4.1-mini')).toHaveLength(2)
    expect(screen.getByText('summarize')).toBeInTheDocument()
    expect(screen.getByText('daily-report')).toBeInTheDocument()
    expect(screen.getByText('2026-04-23')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('$0.0020')).toBeInTheDocument()
  })
})

function getLocalIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
