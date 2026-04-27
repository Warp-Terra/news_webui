import { describe, expect, it } from 'vitest'

import type { NewsItem } from '@/app/types/news'

import { buildAggregationPrompt, buildDailyReportPrompt, buildNewsSummaryPrompt } from './prompts'

function makeNews(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: 'news-001',
    title: 'AI export screening rules advance',
    source: 'The Wall Street Journal',
    sourceUrl: 'https://www.wsj.com/tech/ai-export-screening',
    region: 'US',
    category: 'Technology',
    tags: ['AI', 'Export Controls'],
    publishedAt: '2026-04-23T14:30:00Z',
    summary: 'Cloud providers may need to verify customer location before granting access to advanced AI services.',
    keyPoints: ['Cloud location checks are part of the proposal.', 'Industry groups asked for clearer carve-outs.'],
    impact: 'Rules could reshape global AI supply chains and cloud access.',
    importance: 'high',
    ...overrides,
  }
}

describe('AI prompt builders', () => {
  it('buildNewsSummaryPrompt 返回 system 与 user 消息并嵌入单条新闻内容', () => {
    const messages = buildNewsSummaryPrompt({
      title: '央行扩大流动性工具覆盖范围',
      summary: '新工具将支持中小银行稳定信贷供给。',
      source: '财新',
    })

    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[1].role).toBe('user')
    expect(messages[0].content).toContain('专业的新闻情报分析师')
    expect(messages[0].content).toContain('"summary"')
    expect(messages[0].content).toContain('"importance": "low|medium|high|critical"')
    expect(messages[0].content).toContain('JSON 格式')
    expect(messages[1].content).toContain('央行扩大流动性工具覆盖范围')
    expect(messages[1].content).toContain('新工具将支持中小银行稳定信贷供给。')
    expect(messages[1].content).toContain('来源：财新')
  })

  it('buildAggregationPrompt 为多条新闻生成带编号的聚合输入', () => {
    const messages = buildAggregationPrompt([
      makeNews({ id: 'news-001', title: 'US tightens AI chip export rules', region: 'US' }),
      makeNews({ id: 'news-002', title: 'EU announces semiconductor funding', region: 'EU', source: 'Politico' }),
    ])

    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[1].role).toBe('user')
    expect(messages[0].content).toContain('聚合分析报告')
    expect(messages[0].content).toContain('"theme"')
    expect(messages[0].content).toContain('"impact"')
    expect(messages[1].content).toContain('1. US tightens AI chip export rules')
    expect(messages[1].content).toContain('地区：US')
    expect(messages[1].content).toContain('来源：The Wall Street Journal')
    expect(messages[1].content).toContain('2. EU announces semiconductor funding')
    expect(messages[1].content).toContain('地区：EU')
    expect(messages[1].content).toContain('来源：Politico')
  })

  it('buildDailyReportPrompt 要求生成 Markdown 日报并按地区分类', () => {
    const messages = buildDailyReportPrompt([
      makeNews({ id: 'news-001', title: 'Global LNG prices ease', region: 'Global', category: 'Energy' }),
      makeNews({ id: 'news-002', title: 'China expands compute subsidies', region: 'CN', category: 'Technology' }),
    ])

    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[1].role).toBe('user')
    expect(messages[0].content).toContain('Markdown 格式的情报日报')
    expect(messages[0].content).toContain('按地区分类')
    expect(messages[1].content).toContain('1. Global LNG prices ease')
    expect(messages[1].content).toContain('地区：Global')
    expect(messages[1].content).toContain('分类：Energy')
    expect(messages[1].content).toContain('2. China expands compute subsidies')
    expect(messages[1].content).toContain('地区：CN')
    expect(messages[1].content).toContain('分类：Technology')
  })
})
