import { describe, expect, it } from 'vitest'

import { extractJsonFromMarkdown, parseAggregationResult, parseAiSummary } from './parser'

describe('AI response parser', () => {
  it('从纯 JSON 文本提取对象', () => {
    expect(extractJsonFromMarkdown('{"summary":"摘要","keyPoints":["要点"]}')).toEqual({
      summary: '摘要',
      keyPoints: ['要点'],
    })
  })

  it('从 markdown json code block 提取 JSON', () => {
    const text = '```json\n{"theme":"AI 管制","summary":"综合摘要","keyPoints":["要点1"],"impact":"影响"}\n```'

    expect(extractJsonFromMarkdown(text)).toEqual({
      theme: 'AI 管制',
      summary: '综合摘要',
      keyPoints: ['要点1'],
      impact: '影响',
    })
  })

  it('处理 JSON 前后包含说明文字的 AI 返回内容', () => {
    const text = '以下是分析结果：\n{"summary":"摘要","keyPoints":["要点1"],"impact":"影响","importance":"high","tags":["AI"]}\n请查收。'

    expect(extractJsonFromMarkdown(text)).toEqual({
      summary: '摘要',
      keyPoints: ['要点1'],
      impact: '影响',
      importance: 'high',
      tags: ['AI'],
    })
  })

  it('解析失败时返回可供 fallback 使用的空对象', () => {
    expect(extractJsonFromMarkdown('无法解析的普通文本')).toEqual({})
  })

  it('parseAiSummary 验证并转换 AI 摘要必填字段', () => {
    expect(
      parseAiSummary({
        summary: '中文摘要',
        keyPoints: ['要点1', '要点2'],
        impact: '全球供应链受到影响',
        importance: 'critical',
        tags: ['供应链', '科技'],
      }),
    ).toEqual({
      summary: '中文摘要',
      keyPoints: ['要点1', '要点2'],
      impact: '全球供应链受到影响',
      importance: 'critical',
      tags: ['供应链', '科技'],
      tokensIn: 0,
      tokensOut: 0,
    })
  })

  it('parseAiSummary 对缺失或非法字段使用安全 fallback', () => {
    expect(parseAiSummary({ summary: '', keyPoints: ['要点'], importance: 'urgent', tags: [1, 'AI'] })).toEqual({
      summary: '',
      keyPoints: ['要点'],
      impact: '',
      importance: 'medium',
      tags: ['AI'],
      tokensIn: 0,
      tokensOut: 0,
    })
  })

  it('parseAggregationResult 验证聚合摘要字段', () => {
    expect(
      parseAggregationResult({
        theme: '全球 AI 芯片竞争',
        summary: '多国围绕 AI 芯片政策调整。',
        keyPoints: ['美国收紧出口', '欧盟扩大补贴'],
        impact: '技术阵营分化可能加速。',
      }),
    ).toEqual({
      theme: '全球 AI 芯片竞争',
      summary: '多国围绕 AI 芯片政策调整。',
      keyPoints: ['美国收紧出口', '欧盟扩大补贴'],
      impact: '技术阵营分化可能加速。',
    })
  })

  it('parseAggregationResult 对缺失字段使用空值 fallback', () => {
    expect(parseAggregationResult({ theme: '能源', keyPoints: ['价格回落', 42] })).toEqual({
      theme: '能源',
      summary: '',
      keyPoints: ['价格回落'],
      impact: '',
    })
  })
})
