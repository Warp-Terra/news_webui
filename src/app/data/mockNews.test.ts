import { describe, expect, it } from 'vitest'

import { mockNews } from './mockNews'
import type { Category, ImportanceLevel, NewsItem, Region } from '../types/news'

const expectedRegions = ['US', 'CN', 'EU', 'JP', 'Global'] as const satisfies readonly Region[]
const expectedCategories = [
  'Economy',
  'Technology',
  'Politics',
  'Military',
  'Energy',
] as const satisfies readonly Category[]
const expectedImportanceLevels = [
  'low',
  'medium',
  'high',
  'critical',
] as const satisfies readonly ImportanceLevel[]

const requiredFields: Array<keyof NewsItem> = [
  'id',
  'title',
  'source',
  'region',
  'category',
  'tags',
  'publishedAt',
  'summary',
  'keyPoints',
  'impact',
  'importance',
]

const iso8601UtcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

describe('mockNews', () => {
  it('包含至少 20 条新闻', () => {
    expect(mockNews.length).toBeGreaterThanOrEqual(20)
  })

  it('每条数据都包含所有必需字段且字段类型正确', () => {
    mockNews.forEach((item) => {
      requiredFields.forEach((field) => {
        expect(item).toHaveProperty(field)
      })

      expect(typeof item.id).toBe('string')
      expect(item.id).not.toHaveLength(0)
      expect(typeof item.title).toBe('string')
      expect(item.title).not.toHaveLength(0)
      expect(typeof item.source).toBe('string')
      expect(item.source).not.toHaveLength(0)
      expect(expectedRegions).toContain(item.region)
      expect(expectedCategories).toContain(item.category)
      expect(Array.isArray(item.tags)).toBe(true)
      expect(item.tags.length).toBeGreaterThan(0)
      expect(item.tags.every((tag) => typeof tag === 'string' && tag.length > 0)).toBe(true)
      expect(typeof item.publishedAt).toBe('string')
      expect(typeof item.summary).toBe('string')
      expect(item.summary).not.toHaveLength(0)
      expect(Array.isArray(item.keyPoints)).toBe(true)
      expect(item.keyPoints.length).toBeGreaterThan(0)
      expect(
        item.keyPoints.every((point) => typeof point === 'string' && point.length > 0),
      ).toBe(true)
      expect(typeof item.impact).toBe('string')
      expect(item.impact).not.toHaveLength(0)
      expect(expectedImportanceLevels).toContain(item.importance)

      if (item.sourceUrl !== undefined) {
        expect(typeof item.sourceUrl).toBe('string')
        expect(item.sourceUrl).toMatch(/^https?:\/\//)
      }
    })
  })

  it('覆盖所有地区', () => {
    const regions = new Set(mockNews.map((item) => item.region))

    expectedRegions.forEach((region) => {
      expect(regions.has(region)).toBe(true)
    })
  })

  it('覆盖所有分类', () => {
    const categories = new Set(mockNews.map((item) => item.category))

    expectedCategories.forEach((category) => {
      expect(categories.has(category)).toBe(true)
    })
  })

  it('覆盖所有重要程度', () => {
    const importanceLevels = new Set(mockNews.map((item) => item.importance))

    expectedImportanceLevels.forEach((importance) => {
      expect(importanceLevels.has(importance)).toBe(true)
    })
  })

  it('publishedAt 使用有效的 ISO 8601 UTC 格式', () => {
    mockNews.forEach((item) => {
      expect(item.publishedAt).toMatch(iso8601UtcRegex)
      expect(Number.isNaN(Date.parse(item.publishedAt))).toBe(false)
    })
  })
})
