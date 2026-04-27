import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import Home from './page'
import { resetNewsStore } from '@/test/resetNewsStore'

const themeMock = vi.hoisted(() => ({
  setTheme: vi.fn(),
  resolvedTheme: 'light',
}))

vi.mock('next-themes', () => ({
  useTheme: () => themeMock,
}))

describe('Dashboard page', () => {
  beforeEach(() => {
    resetNewsStore({ newsList: [], totalCount: 0 })
    themeMock.setTheme.mockClear()
    themeMock.resolvedTheme = 'light'

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('加载时调用 fetchNews 初始化新闻列表', async () => {
    const fetchNews = vi.fn().mockResolvedValue(undefined)
    resetNewsStore({ newsList: [], totalCount: 0, fetchNews })

    render(<Home />)

    await waitFor(() => expect(fetchNews).toHaveBeenCalledTimes(1))
  })

  it('无新闻时显示空状态', async () => {
    const fetchNews = vi.fn().mockResolvedValue(undefined)
    resetNewsStore({ newsList: [], totalCount: 0, fetchNews })

    render(<Home />)

    expect(await screen.findByText('没有找到匹配的新闻')).toBeInTheDocument()
    expect(screen.getByText('请尝试调整搜索关键词、地区、分类或重要程度筛选条件。')).toBeInTheDocument()
  })

  it('RSS 刷新按钮存在且点击后触发抓取并重新加载新闻', async () => {
    const user = userEvent.setup()
    const fetchNews = vi.fn().mockResolvedValue(undefined)
    const triggerFetch = vi.fn().mockResolvedValue({ fetched: 3, errors: [] })
    resetNewsStore({ newsList: [], totalCount: 0, fetchNews, triggerFetch })

    render(<Home />)
    await waitFor(() => expect(fetchNews).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('button', { name: '刷新 RSS' }))

    await waitFor(() => expect(triggerFetch).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(fetchNews).toHaveBeenCalledTimes(2))
    expect(screen.getByText('RSS 刷新完成，新增 3 条新闻。')).toBeInTheDocument()
  })
})
