import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MarkdownReport } from './MarkdownReport'

describe('MarkdownReport', () => {
  it('将标题、加粗、列表和链接渲染为语义化 HTML', () => {
    render(
      <MarkdownReport
        markdown={[
          '# 全球情报日报',
          '',
          '## Global',
          '',
          '- **AI 出口管制升级**',
          '- [Source link](https://example.com/report)',
        ].join('\n')}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: '全球情报日报' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Global' })).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('AI 出口管制升级').closest('strong')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Source link' })).toHaveAttribute('href', 'https://example.com/report')
    expect(screen.getByRole('link', { name: 'Source link' })).toHaveAttribute('target', '_blank')
  })

  it('跳过 AI 返回中的原始 HTML 内容', () => {
    render(
      <MarkdownReport
        markdown={[
          '# Safe heading',
          '',
          '<script>alert("xss")</script>',
          '<strong>raw html</strong>',
        ].join('\n')}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Safe heading' })).toBeInTheDocument()
    expect(screen.queryByText(/alert/)).not.toBeInTheDocument()
    expect(screen.queryByText('raw html')).not.toBeInTheDocument()
  })
})
