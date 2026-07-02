import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { mockNews } from '../../data/mockNews'
import { resetNewsStore } from '@/test/resetNewsStore'
import { renderWithI18n } from '@/test/renderWithI18n'
import { useNewsStore } from '../../store/newsStore'
import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    resetNewsStore()
  })

  it('正确渲染所有筛选选项', () => {
    renderWithI18n(<Sidebar />)

    ;['美国', '中国', '欧盟', '日本', '全球'].forEach((region) => {
      expect(screen.getByRole('button', { name: region })).toBeInTheDocument()
    })
    ;['经济', '科技', '政治', '军事', '能源'].forEach((category) => {
      expect(screen.getByRole('button', { name: category })).toBeInTheDocument()
    })
    ;['低', '中', '高', '关键'].forEach((importance) => {
      expect(screen.getByRole('button', { name: importance })).toBeInTheDocument()
    })
  })

  it('点击筛选选项触发 updateFilter 回调', async () => {
    const user = userEvent.setup()
    const updateFilter = vi.fn()
    resetNewsStore({ updateFilter })

    renderWithI18n(<Sidebar />)
    await user.click(screen.getByRole('button', { name: '美国' }))
    await user.click(screen.getByRole('button', { name: '科技' }))
    await user.click(screen.getByRole('button', { name: '关键' }))

    expect(updateFilter).toHaveBeenNthCalledWith(1, 'regions', 'US')
    expect(updateFilter).toHaveBeenNthCalledWith(2, 'categories', 'Technology')
    expect(updateFilter).toHaveBeenNthCalledWith(3, 'importanceLevels', 'critical')
  })

  it('显示结果统计', () => {
    useNewsStore.getState().updateFilter('regions', 'US')

    renderWithI18n(<Sidebar />)

    expect(screen.getByText('匹配结果')).toBeInTheDocument()
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

    renderWithI18n(<Sidebar />)
    const clearButtons = screen.getAllByRole('button', { name: '清除筛选' })
    await user.click(clearButtons[clearButtons.length - 1])

    expect(clearFilters).toHaveBeenCalledTimes(1)
  })

  it('包含数据源管理入口链接', () => {
    renderWithI18n(<Sidebar />)

    expect(screen.getByRole('link', { name: /数据源管理/ })).toHaveAttribute('href', '/zh-CN/sources')
  })

  it('包含日报和 AI 用量入口链接', () => {
    renderWithI18n(<Sidebar />)

    expect(screen.getByRole('link', { name: /日报/ })).toHaveAttribute('href', '/zh-CN/daily-report')
    expect(screen.getByRole('link', { name: /AI 用量/ })).toHaveAttribute('href', '/zh-CN/ai-usage')
  })

  it('包含 AI 配置入口链接', () => {
    renderWithI18n(<Sidebar />)

    expect(screen.getByRole('link', { name: /AI 配置/ })).toHaveAttribute('href', '/zh-CN/ai-settings')
  })

  it('英文语言下显示英文筛选文案', () => {
    renderWithI18n(<Sidebar />, { locale: 'en-US' })

    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Region')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Importance')).toBeInTheDocument()
  })
})
