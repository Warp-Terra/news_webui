import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { mockNews } from '../../data/mockNews'
import { resetNewsStore } from '@/test/resetNewsStore'
import { NewsDetail } from './NewsDetail'

describe('NewsDetail', () => {
  beforeEach(() => {
    resetNewsStore()
  })

  it('有选中新闻时正确渲染标题、摘要、关键点、影响判断和来源', () => {
    const item = mockNews[5]
    resetNewsStore({ selectedId: item.id })

    render(<NewsDetail />)

    expect(screen.getByText(item.title)).toBeInTheDocument()
    expect(screen.getByText(item.summary)).toBeInTheDocument()
    item.keyPoints.forEach((point) => {
      expect(screen.getByText(point)).toBeInTheDocument()
    })
    expect(item.impact).toBeDefined()
    expect(screen.getByText(item.impact ?? '')).toBeInTheDocument()
    expect(screen.getAllByText(item.source).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('link', { name: /打开来源链接/ })).toHaveAttribute(
      'href',
      item.sourceUrl,
    )
  })

  it('未选中新闻时显示引导信息', () => {
    render(<NewsDetail />)

    expect(screen.getByText('请选择一条新闻查看详情')).toBeInTheDocument()
    expect(
      screen.getByText('从中间情报列表中选择任意新闻，右侧将展示完整摘要、关键点和影响判断。'),
    ).toBeInTheDocument()
  })

  it('重要程度徽章正确显示并使用对应颜色类名', () => {
    const item = mockNews[5]
    resetNewsStore({ selectedId: item.id })

    render(<NewsDetail />)

    expect(screen.getByText(item.importance)).toBeInTheDocument()
    expect(screen.getByText(item.importance)).toHaveClass('border-red-500/40')
  })

  it('有 AI 摘要时显示 AI 关键点和影响判断', () => {
    const item = {
      ...mockNews[0],
      keyPoints: ['AI 提炼的第一条关键点', 'AI 提炼的第二条关键点'],
      impact: 'AI 判断该政策会提高供应链合规成本。',
    }
    resetNewsStore({ newsList: [{ ...item, status: 'unread' }], selectedId: item.id })

    render(<NewsDetail />)

    expect(screen.getByText('AI 摘要')).toBeInTheDocument()
    expect(screen.getByText('AI 提炼的第一条关键点')).toBeInTheDocument()
    expect(screen.getByText('AI 提炼的第二条关键点')).toBeInTheDocument()
    expect(screen.getByText('AI 判断该政策会提高供应链合规成本。')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /生成 AI 摘要/ })).not.toBeInTheDocument()
  })

  it('无 AI 摘要时显示生成 AI 摘要按钮', () => {
    const item = { ...mockNews[0], keyPoints: [], impact: undefined }
    resetNewsStore({ newsList: [{ ...item, status: 'unread' }], selectedId: item.id })

    render(<NewsDetail />)

    expect(screen.getByRole('button', { name: /生成 AI 摘要/ })).toBeInTheDocument()
  })

  it('点击生成 AI 摘要按钮触发 summarizeNewsItem', async () => {
    const user = userEvent.setup()
    const summarizeNewsItem = vi.fn().mockResolvedValue(undefined)
    const item = { ...mockNews[0], keyPoints: [], impact: undefined }
    resetNewsStore({
      newsList: [{ ...item, status: 'unread' }],
      selectedId: item.id,
      summarizeNewsItem,
    })

    render(<NewsDetail />)
    await user.click(screen.getByRole('button', { name: /生成 AI 摘要/ }))

    expect(summarizeNewsItem).toHaveBeenCalledWith(item.id)
  })

  it('AI 摘要生成中显示 spinner 与加载文案', () => {
    const item = { ...mockNews[0], keyPoints: [], impact: undefined }
    resetNewsStore({
      newsList: [{ ...item, status: 'unread' }],
      selectedId: item.id,
      isAiLoading: true,
    })

    render(<NewsDetail />)

    expect(screen.getByRole('status', { name: '正在生成 AI 摘要' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /生成中/ })).toBeDisabled()
  })

  it('AI 摘要失败时显示错误信息', () => {
    const item = { ...mockNews[0], keyPoints: [], impact: undefined }
    resetNewsStore({
      newsList: [{ ...item, status: 'unread' }],
      selectedId: item.id,
      aiError: 'AI provider unavailable',
    })

    render(<NewsDetail />)

    expect(screen.getByText('AI provider unavailable')).toBeInTheDocument()
  })
})
