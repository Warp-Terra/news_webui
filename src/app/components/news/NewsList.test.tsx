import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { mockNews } from '../../data/mockNews'
import { resetNewsStore } from '@/test/resetNewsStore'
import { useNewsStore } from '../../store/newsStore'
import { Sidebar } from '../layout/Sidebar'
import { NewsList } from './NewsList'

describe('NewsList', () => {
  beforeEach(() => {
    resetNewsStore()
  })

  it('使用 Mock 数据正确渲染新闻列表', () => {
    render(<NewsList />)

    expect(screen.getByText('Intelligence Feed')).toBeInTheDocument()
    expect(screen.getByText(mockNews[0].title)).toBeInTheDocument()
    expect(screen.getByText(mockNews[1].title)).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(mockNews.length)
  })

  it('空状态时显示提示信息', () => {
    resetNewsStore({ newsList: [] })

    render(<NewsList />)

    expect(screen.getByText('没有找到匹配的新闻')).toBeInTheDocument()
    expect(
      screen.getByText('请尝试调整搜索关键词、地区、分类或重要程度筛选条件。'),
    ).toBeInTheDocument()
  })

  it('显示结果统计数量', () => {
    useNewsStore.getState().updateFilter('regions', 'US')

    render(<NewsList />)

    expect(screen.getByText('显示 5 / 25 条新闻')).toBeInTheDocument()
  })

  it('渲染后点击侧边栏筛选时主列表即时刷新', async () => {
    const user = userEvent.setup()

    render(
      <>
        <Sidebar />
        <NewsList />
      </>,
    )

    expect(screen.getByText('显示 25 / 25 条新闻')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'US' }))

    expect(screen.getByText('显示 5 / 25 条新闻')).toBeInTheDocument()
  })
})
