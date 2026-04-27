import type { NewsItem } from '@/app/types/news'

import type { AiMessage } from './types'

const NEWS_SUMMARY_SYSTEM_PROMPT = `你是一位专业的新闻情报分析师。请对以下新闻进行结构化分析，输出 JSON 格式。

要求输出格式：
{
  "summary": "精炼的中文摘要（200字以内）",
  "keyPoints": ["关键点1", "关键点2", "关键点3"],
  "impact": "影响判断（100字以内）",
  "importance": "low|medium|high|critical",
  "tags": ["标签1", "标签2"]
}

要求：
- summary 要涵盖新闻核心信息
- keyPoints 列出 3-5 个关键点
- impact 分析该新闻对全球政治/经济/军事/科技格局的影响
- importance 根据新闻影响力判断，只能取 low、medium、high、critical 之一
- tags 提炼 2-5 个关键词标签
- 只输出可解析的 JSON，不要输出 Markdown 代码块或额外说明`

const AGGREGATION_SYSTEM_PROMPT = `你是一位新闻情报分析师。以下是一组相关新闻，请生成一份聚合分析报告，输出 JSON 格式。

{
  "theme": "主题概括",
  "summary": "综合分析摘要",
  "keyPoints": ["要点1", "要点2"],
  "impact": "整体影响判断"
}

要求：
- theme 用一句话概括这组新闻的共同主题
- summary 综合多条新闻的共性、差异与趋势
- keyPoints 提炼 3-5 个关键观察
- impact 判断整体影响及潜在外溢效应
- 只输出可解析的 JSON，不要输出 Markdown 代码块或额外说明`

const DAILY_REPORT_SYSTEM_PROMPT = `请为以下今日新闻生成一份 Markdown 格式的情报日报。按地区分类，每个地区列出最重要的新闻，并附上简要分析。

要求：
- 使用中文撰写
- 标题使用「# 今日情报日报」
- 按地区使用二级标题分类
- 每条新闻包含标题、来源、重要程度和简要分析
- 优先突出 high 与 critical 新闻`

export function buildNewsSummaryPrompt(news: Pick<NewsItem, 'title' | 'summary' | 'source'>): AiMessage[] {
  return [
    { role: 'system', content: NEWS_SUMMARY_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `${news.title}\n${news.summary}\n来源：${news.source}`,
    },
  ]
}

export function buildAggregationPrompt(newsList: NewsItem[]): AiMessage[] {
  return [
    { role: 'system', content: AGGREGATION_SYSTEM_PROMPT },
    { role: 'user', content: formatNewsList(newsList) },
  ]
}

export function buildDailyReportPrompt(newsList: NewsItem[]): AiMessage[] {
  return [
    { role: 'system', content: DAILY_REPORT_SYSTEM_PROMPT },
    { role: 'user', content: formatNewsList(newsList) },
  ]
}

function formatNewsList(newsList: NewsItem[]): string {
  if (newsList.length === 0) {
    return '今日暂无新闻。'
  }

  return newsList.map(formatNewsListItem).join('\n\n')
}

function formatNewsListItem(news: NewsItem, index: number): string {
  const lines = [
    `${index + 1}. ${news.title}`,
    `来源：${news.source}`,
    `地区：${news.region}`,
    `分类：${news.category}`,
    `重要程度：${news.importance}`,
    `发布时间：${news.publishedAt}`,
    `摘要：${news.summary}`,
  ]

  if (news.keyPoints.length > 0) {
    lines.push(`关键点：${news.keyPoints.join('；')}`)
  }

  if (news.impact) {
    lines.push(`影响：${news.impact}`)
  }

  if (news.tags.length > 0) {
    lines.push(`标签：${news.tags.join('、')}`)
  }

  return lines.join('\n')
}
