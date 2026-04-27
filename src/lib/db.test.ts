import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { Database } from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { NewsItem } from '@/app/types/news'
import {
  computeDedupKey,
  deleteNews,
  deleteSource,
  getAllNews,
  getAllSources,
  getNewsById,
  getNewsWithoutAiSummary,
  getSourceById,
  initDb,
  insertNews,
  insertSource,
  newsExists,
  updateNewsAiFields,
  updateLastFetched,
  updateNewsStatus,
  updateSource,
  type NewsFilters,
  type Source,
} from './db'

function makeNews(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: 'news-001',
    title: 'Fed signals slower path for rate cuts',
    source: 'Reuters',
    sourceUrl: 'https://www.reuters.com/markets/us/fed-rate-cuts',
    region: 'US',
    category: 'Economy',
    tags: ['Federal Reserve', 'inflation'],
    publishedAt: '2026-04-23T14:30:00Z',
    summary: 'Officials emphasized data dependence while services inflation remains sticky.',
    keyPoints: ['Treasury yields moved higher.', 'Financial stocks outperformed.'],
    impact: 'Higher-for-longer expectations could tighten global liquidity.',
    importance: 'high',
    ...overrides,
  }
}

function makeSource(overrides: Partial<Omit<Source, 'id'>> = {}): Omit<Source, 'id'> {
  return {
    name: 'Reuters Markets',
    url: 'https://www.reuters.com/markets/us/',
    region: 'US',
    category: 'Economy',
    active: true,
    lastFetchedAt: null,
    ...overrides,
  }
}

describe('database layer', () => {
  let db: Database
  let tempDir: string
  let dbPath: string

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'gni-db-'))
    dbPath = path.join(tempDir, 'nested', 'news.db')
    db = initDb(dbPath)
  })

  afterEach(() => {
    db.close()
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('初始化数据库连接并创建 news 与 sources 表', () => {
    const tableNames = db
      .prepare<{ type: string }, { name: string }>(
        "SELECT name FROM sqlite_master WHERE type = @type ORDER BY name",
      )
      .all({ type: 'table' })
      .map((row) => row.name)

    expect(tableNames).toContain('news')
    expect(tableNames).toContain('sources')
    expect(tableNames).toContain('sqlite_sequence')
    expect(db.name).toBe(dbPath)
  })

  it('插入新闻后能按 id 查询并还原 JSON 数组字段', () => {
    const news = makeNews()

    expect(insertNews(db, news)).toBe(true)

    expect(getNewsById(db, news.id)).toMatchObject({
      ...news,
      status: 'unread',
    })
  })

  it('插入重复新闻时按 id 或去重键忽略重复数据', () => {
    const original = makeNews()
    const sameId = makeNews({ title: 'A different title with the same id' })
    const sameDedupKey = makeNews({
      id: 'news-duplicate-by-key',
      title: '  FED   signals slower PATH for RATE cuts  ',
    })

    expect(insertNews(db, original)).toBe(true)
    expect(insertNews(db, sameId)).toBe(false)
    expect(insertNews(db, sameDedupKey)).toBe(false)

    const result = getAllNews(db)
    expect(result.count).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe(original.id)
  })

  it('newsExists 根据计算出的去重键判断新闻是否存在', () => {
    const news = makeNews()
    const dedupKey = computeDedupKey(news.title, news.sourceUrl)

    expect(newsExists(db, dedupKey)).toBe(false)
    insertNews(db, news)
    expect(newsExists(db, dedupKey)).toBe(true)
  })

  it('getAllNews 支持地区、分类、重要程度、状态筛选并返回总数', () => {
    insertNews(db, makeNews({ id: 'news-001', region: 'US', category: 'Economy', importance: 'high' }))
    insertNews(
      db,
      makeNews({
        id: 'news-002',
        title: '中国推出新一轮算力基础设施补贴',
        sourceUrl: 'https://www.caixin.com/tech/compute-subsidy',
        region: 'CN',
        category: 'Technology',
        importance: 'critical',
      }),
    )
    insertNews(
      db,
      makeNews({
        id: 'news-003',
        title: 'EU carbon price rebounds',
        sourceUrl: 'https://www.politico.eu/energy/carbon-price',
        region: 'EU',
        category: 'Energy',
        importance: 'medium',
      }),
    )
    updateNewsStatus(db, 'news-002', 'starred')

    const filters: NewsFilters = {
      regions: ['CN', 'EU'],
      categories: ['Technology', 'Energy'],
      importanceLevels: ['critical', 'medium'],
      statuses: ['starred'],
    }

    const result = getAllNews(db, filters)
    expect(result.count).toBe(1)
    expect(result.items.map((item) => item.id)).toEqual(['news-002'])
  })

  it('getAllNews 支持关键词搜索、分页并按发布时间倒序排列', () => {
    insertNews(
      db,
      makeNews({
        id: 'news-001',
        title: 'AI export screening rules advance',
        source: 'The Wall Street Journal',
        sourceUrl: 'https://www.wsj.com/tech/ai-export-screening',
        publishedAt: '2026-04-21T16:05:00Z',
        summary: 'Cloud providers may need to verify customer location.',
        keyPoints: ['AI model weights are part of the proposal.'],
      }),
    )
    insertNews(
      db,
      makeNews({
        id: 'news-002',
        title: 'Open-source developers seek AI carve-outs',
        sourceUrl: 'https://example.com/open-source-ai-carve-outs',
        publishedAt: '2026-04-22T16:05:00Z',
        summary: 'Industry groups warned broad rules could slow collaboration.',
      }),
    )
    insertNews(
      db,
      makeNews({
        id: 'news-003',
        title: 'Global LNG prices ease',
        sourceUrl: 'https://www.bloomberg.com/energy/lng-prices',
        publishedAt: '2026-04-23T16:05:00Z',
        summary: 'Energy buyers delayed cargo purchases.',
      }),
    )

    const firstPage = getAllNews(db, undefined, 'AI', 1, 0)
    const secondPage = getAllNews(db, undefined, 'AI', 1, 1)

    expect(firstPage.count).toBe(2)
    expect(firstPage.items.map((item) => item.id)).toEqual(['news-002'])
    expect(secondPage.items.map((item) => item.id)).toEqual(['news-001'])
  })

  it('更新新闻状态并在查询结果中返回最新状态', () => {
    const news = makeNews()
    insertNews(db, news)

    expect(updateNewsStatus(db, news.id, 'read')).toBe(true)
    expect(getNewsById(db, news.id)).toMatchObject({ id: news.id, status: 'read' })
    expect(updateNewsStatus(db, 'missing-news', 'ignored')).toBe(false)
  })

  it('更新 AI 摘要字段并保留新闻状态', () => {
    const news = makeNews({ impact: undefined, keyPoints: [], tags: [], importance: 'medium' })
    insertNews(db, news)
    updateNewsStatus(db, news.id, 'starred')

    expect(
      updateNewsAiFields(db, news.id, {
        summary: 'AI 生成的中文摘要',
        keyPoints: ['关键点一', '关键点二'],
        impact: '该事件可能影响全球科技供应链。',
        importance: 'critical',
        tags: ['AI', '供应链'],
      }),
    ).toBe(true)
    expect(getNewsById(db, news.id)).toMatchObject({
      id: news.id,
      summary: 'AI 生成的中文摘要',
      keyPoints: ['关键点一', '关键点二'],
      impact: '该事件可能影响全球科技供应链。',
      importance: 'critical',
      tags: ['AI', '供应链'],
      status: 'starred',
    })
    expect(updateNewsAiFields(db, 'missing-news', { summary: '不存在' })).toBe(false)
  })

  it('获取未生成 AI 摘要的新闻并按发布时间倒序限制数量', () => {
    insertNews(
      db,
      makeNews({
        id: 'news-001',
        title: 'Raw news without AI summary A',
        sourceUrl: 'https://example.com/raw-a',
        publishedAt: '2026-04-21T16:05:00Z',
        keyPoints: [],
        impact: undefined,
        tags: [],
        importance: 'medium',
      }),
    )
    insertNews(
      db,
      makeNews({
        id: 'news-002',
        title: 'News already enriched by AI',
        sourceUrl: 'https://example.com/enriched',
        publishedAt: '2026-04-22T16:05:00Z',
      }),
    )
    insertNews(
      db,
      makeNews({
        id: 'news-003',
        title: 'Raw news without AI summary B',
        sourceUrl: 'https://example.com/raw-b',
        publishedAt: '2026-04-23T16:05:00Z',
        keyPoints: [],
        impact: undefined,
        tags: [],
        importance: 'medium',
      }),
    )

    expect(getNewsWithoutAiSummary(db, 1).map((item) => item.id)).toEqual(['news-003'])
    expect(getNewsWithoutAiSummary(db, 10).map((item) => item.id)).toEqual(['news-003', 'news-001'])
  })

  it('删除新闻并在记录不存在时返回 false', () => {
    const news = makeNews()
    insertNews(db, news)

    expect(deleteNews(db, news.id)).toBe(true)
    expect(getNewsById(db, news.id)).toBeNull()
    expect(deleteNews(db, news.id)).toBe(false)
  })

  it('查询不存在的新闻返回 null', () => {
    expect(getNewsById(db, 'missing-news')).toBeNull()
  })

  it('创建并查询数据源', () => {
    const sourceInput = makeSource()
    const id = insertSource(db, sourceInput)

    expect(id).toBeGreaterThan(0)
    expect(getSourceById(db, id)).toEqual({ id, ...sourceInput })
    expect(getAllSources(db)).toEqual([{ id, ...sourceInput }])
  })

  it('更新数据源部分字段并支持启用状态转换', () => {
    const id = insertSource(db, makeSource())

    expect(updateSource(db, id, { active: false, name: 'Reuters Macro' })).toBe(true)
    expect(getSourceById(db, id)).toMatchObject({
      id,
      name: 'Reuters Macro',
      active: false,
    })
    expect(updateSource(db, 9999, { active: true })).toBe(false)
  })

  it('更新数据源最后拉取时间', () => {
    const id = insertSource(db, makeSource())

    expect(getSourceById(db, id)?.lastFetchedAt).toBeNull()

    updateLastFetched(db, id)

    const updated = getSourceById(db, id)
    expect(updated?.lastFetchedAt).toEqual(expect.any(String))
    expect(Date.parse(updated?.lastFetchedAt ?? '')).not.toBeNaN()
  })

  it('删除数据源并在记录不存在时返回 false', () => {
    const id = insertSource(db, makeSource())

    expect(deleteSource(db, id)).toBe(true)
    expect(getSourceById(db, id)).toBeNull()
    expect(deleteSource(db, id)).toBe(false)
  })

  it('查询不存在的数据源返回 null', () => {
    expect(getSourceById(db, 404)).toBeNull()
  })
})
