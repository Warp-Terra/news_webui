import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { mockNews } from '../../data/mockNews'
import { resetNewsStore } from '@/test/resetNewsStore'
import { useNewsStore } from '../../store/newsStore'
import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    resetNewsStore()
  })

  it('正确渲染所有筛选选项', () => {
    render(<Sidebar />)

    ;['US', 'CN', 'EU', 'JP', 'Global'].forEach((region) => {
      expect(screen.getByRole('button', { name: region })).toBeInTheDocument()
    })
    ;['Economy', 'Technology', 'Politics', 'Military', 'Energy'].forEach(
      (category) => {
        expect(screen.getByRole('button', { name: category })).toBeInTheDocument()
      },
    )
    ;['Low', 'Medium', 'High', 'Critical'].forEach((importance) => {
      expect(screen.getByRole('button', { name: importance })).toBeInTheDocument()
    })
  })

  it('点击筛选选项触发 updateFilter 回调', async () => {
    const user = userEvent.setup()
    const updateFilter = vi.fn()
    resetNewsStore({ updateFilter })

    render(<Sidebar />)
    await user.click(screen.getByRole('button', { name: 'US' }))
    await user.click(screen.getByRole('button', { name: 'Technology' }))
    await user.click(screen.getByRole('button', { name: 'Critical' }))

    expect(updateFilter).toHaveBeenNthCalledWith(1, 'regions', 'US')
    expect(updateFilter).toHaveBeenNthCalledWith(2, 'categories', 'Technology')
    expect(updateFilter).toHaveBeenNthCalledWith(3, 'importanceLevels', 'critical')
  })

  it('显示结果统计', () => {
    useNewsStore.getState().updateFilter('regions', 'US')

    render(<Sidebar />)

    expect(screen.getByText('Matched results')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText(`/ ${mockNews.length} 条`)).toBeInTheDocument()
  })

  it('清除筛选按钮触发 clearFilters 回调', async () => {
    const user = userEvent.setup()
    const clearFilters = vi.fn()
    resetNewsStore({
      filters: {
        regions: ['US'],
        categories: [],
        importanceLevels: [],
      },
      clearFilters,
    })

    render(<Sidebar />)
    const clearButtons = screen.getAllByRole('button', { name: '清除筛选' })
    await user.click(clearButtons[clearButtons.length - 1])

    expect(clearFilters).toHaveBeenCalledTimes(1)
  })

  it('包含数据源管理入口链接', () => {
    render(<Sidebar />)

    expect(screen.getByRole('link', { name: /数据源管理/ })).toHaveAttribute('href', '/sources')
  })

  it('包含日报和 AI 用量入口链接', () => {
    render(<Sidebar />)

    expect(screen.getByRole('link', { name: /日报/ })).toHaveAttribute('href', '/daily-report')
    expect(screen.getByRole('link', { name: /AI 用量/ })).toHaveAttribute('href', '/ai-usage')
  })

  it('包含 AI 配置入口链接', () => {
    render(<Sidebar />)

    expect(screen.getByRole('link', { name: /AI 配置/ })).toHaveAttribute('href', '/ai-settings')
  })
})
