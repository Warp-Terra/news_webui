import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { mockNews } from '../../data/mockNews'
import { resetNewsStore } from '@/test/resetNewsStore'
import { useNewsStore } from '../../store/newsStore'
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
})
