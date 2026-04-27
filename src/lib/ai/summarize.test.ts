import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NewsItem } from '@/app/types/news'

import type { AiProvider, AiResponse } from './types'

vi.mock('./runtime', () => ({
  createRuntimeProvider: vi.fn(),
}))

import { createRuntimeProvider } from './runtime'
import { aggregateNews, generateDailyReport, summarizeNews } from './summarize'

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
    keyPoints: ['Cloud location checks are part of the proposal.'],
    impact: 'Rules could reshape global AI supply chains and cloud access.',
    importance: 'high',
    ...overrides,
  }
}

function makeProvider(content: string, overrides: Partial<AiResponse> = {}): AiProvider {
  return {
    call: vi.fn().mockResolvedValue({
      content,
      tokensIn: 123,
      tokensOut: 45,
      model: 'mock-model',
      finishReason: 'stop',
      ...overrides,
    }),
  }
}

describe('AI summarization module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('summarizeNews 使用传入 provider 并正确发送 prompt', async () => {
    const provider = makeProvider(
      JSON.stringify({
        summary: '美国推进 AI 出口筛查规则。',
        keyPoints: ['云服务商需验证客户位置', '行业寻求豁免'],
        impact: '规则可能改变全球 AI 服务访问格局。',
        importance: 'high',
        tags: ['AI', '出口管制'],
      }),
    )

    const result = await summarizeNews(
      {
        title: 'AI export screening rules advance',
        summary: 'Cloud providers may need to verify customer location.',
        source: 'The Wall Street Journal',
      },
      provider,
    )

    expect(provider.call).toHaveBeenCalledTimes(1)
    const [messages] = vi.mocked(provider.call).mock.calls[0]
    expect(messages[0].role).toBe('system')
    expect(messages[1].role).toBe('user')
    expect(messages[1].content).toContain('AI export screening rules advance')
    expect(result).toEqual({
      summary: '美国推进 AI 出口筛查规则。',
      keyPoints: ['云服务商需验证客户位置', '行业寻求豁免'],
      impact: '规则可能改变全球 AI 服务访问格局。',
      importance: 'high',
      tags: ['AI', '出口管制'],
      tokensIn: 123,
      tokensOut: 45,
    })
    expect(createRuntimeProvider).not.toHaveBeenCalled()
  })

  it('summarizeNews 未传入 provider 时调用 createRuntimeProvider 获取运行时配置 provider', async () => {
    const provider = makeProvider(
      JSON.stringify({
        summary: '摘要',
        keyPoints: ['要点'],
        impact: '影响',
        importance: 'medium',
        tags: ['标签'],
      }),
    )
    vi.mocked(createRuntimeProvider).mockReturnValue(provider)

    await expect(summarizeNews(makeNews())).resolves.toMatchObject({ summary: '摘要' })

    expect(createRuntimeProvider).toHaveBeenCalledTimes(1)
    expect(provider.call).toHaveBeenCalledTimes(1)
  })

  it('summarizeNews 处理 markdown code block 包裹的 JSON', async () => {
    const provider = makeProvider(
      '```json\n{"summary":"摘要","keyPoints":["要点1"],"impact":"影响","importance":"critical","tags":["地缘"]}\n```',
    )

    await expect(summarizeNews(makeNews(), provider)).resolves.toEqual({
      summary: '摘要',
      keyPoints: ['要点1'],
      impact: '影响',
      importance: 'critical',
      tags: ['地缘'],
      tokensIn: 123,
      tokensOut: 45,
    })
  })

  it('summarizeNews 在 AI 返回无效 JSON 时使用 fallback 摘要并保留 token 用量', async () => {
    const provider = makeProvider('模型暂时无法输出 JSON')

    await expect(summarizeNews(makeNews(), provider)).resolves.toEqual({
      summary: 'Cloud providers may need to verify customer location before granting access to advanced AI services.',
      keyPoints: [],
      impact: '',
      importance: 'medium',
      tags: [],
      tokensIn: 123,
      tokensOut: 45,
    })
  })

  it('aggregateNews 调用聚合 prompt 并解析聚合摘要', async () => {
    const provider = makeProvider(
      '分析如下：\n{"theme":"AI 出口管制","summary":"多地调整 AI 规则。","keyPoints":["美国收紧","企业应对"],"impact":"全球 AI 供应链重组。"}',
    )

    const result = await aggregateNews([makeNews(), makeNews({ id: 'news-002', title: 'EU AI funding expands' })], provider)

    expect(provider.call).toHaveBeenCalledTimes(1)
    const [messages] = vi.mocked(provider.call).mock.calls[0]
    expect(messages[0].content).toContain('聚合分析报告')
    expect(messages[1].content).toContain('1. AI export screening rules advance')
    expect(messages[1].content).toContain('2. EU AI funding expands')
    expect(result).toEqual({
      theme: 'AI 出口管制',
      summary: '多地调整 AI 规则。',
      keyPoints: ['美国收紧', '企业应对'],
      impact: '全球 AI 供应链重组。',
    })
  })

  it('generateDailyReport 调用日报 prompt 并返回 markdown 与 token 用量', async () => {
    const provider = makeProvider('# 今日情报日报\n\n## US\n- AI export screening rules advance')

    const result = await generateDailyReport([makeNews()], provider)

    expect(provider.call).toHaveBeenCalledTimes(1)
    const [messages] = vi.mocked(provider.call).mock.calls[0]
    expect(messages[0].content).toContain('Markdown 格式的情报日报')
    expect(messages[1].content).toContain('AI export screening rules advance')
    expect(result).toEqual({
      markdown: '# 今日情报日报\n\n## US\n- AI export screening rules advance',
      tokensIn: 123,
      tokensOut: 45,
    })
  })
})
