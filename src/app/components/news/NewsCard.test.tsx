import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { mockNews } from '../../data/mockNews'
import type { NewsItem } from '../../types/news'
import { resetNewsStore } from '@/test/resetNewsStore'
import { NewsCard } from './NewsCard'

function formatCardDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

describe('NewsCard', () => {
  beforeEach(() => {
    resetNewsStore()
  })

  it('正确渲染新闻标题、来源、地区、分类和发布时间', () => {
    const item = mockNews[0]

    render(<NewsCard item={item} />)

    expect(screen.getByText(item.title)).toBeInTheDocument()
    expect(screen.getByText(item.source)).toBeInTheDocument()
    expect(screen.getByText(item.region)).toBeInTheDocument()
    expect(screen.getByText(item.category)).toBeInTheDocument()
    expect(screen.getByText(formatCardDate(item.publishedAt))).toBeInTheDocument()
  })

  it('重要程度徽章显示正确且按级别使用不同颜色类名', () => {
    const highItem = mockNews.find((item) => item.importance === 'high') as NewsItem
    const criticalItem = mockNews.find(
      (item) => item.importance === 'critical',
    ) as NewsItem
    const { rerender } = render(<NewsCard item={highItem} />)

    expect(screen.getByText('high')).toHaveClass('border-amber-500/35')

    rerender(<NewsCard item={criticalItem} />)

    expect(screen.getByText('critical')).toHaveClass('border-red-500/40')
    expect(screen.getByText('critical')).not.toHaveClass('border-amber-500/35')
  })

  it('点击卡片触发 onSelect 回调并传入新闻 id', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const item = mockNews[0]

    render(<NewsCard item={item} onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: new RegExp(item.title) }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(item.id)
  })

  it('选中状态有正确的 CSS 类名和 aria-pressed 状态', () => {
    const item = mockNews[0]
    resetNewsStore({ selectedId: item.id })

    render(<NewsCard item={item} />)

    const card = screen.getByRole('button', { name: new RegExp(item.title) })
    expect(card).toHaveAttribute('aria-pressed', 'true')
    expect(card).toHaveClass('border-primary/60')
    expect(card).toHaveClass('ring-2')
  })
})
