import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type Parser from 'rss-parser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { NewsItem } from '@/app/types/news'
import {
  computeDedupKey,
  getAllNews,
  getSourceById,
  initDb,
  insertNews,
  insertSource,
  newsExists,
  type Database,
  type Source,
} from './db'

const { parseURLMock } = vi.hoisted(() => ({
  parseURLMock: vi.fn(),
}))

vi.mock('rss-parser', () => {
  const ParserMock = vi.fn().mockImplementation(function MockParser() {
    return {
    parseURL: parseURLMock,
    }
  })

  return { default: ParserMock }
})

import {
  RSS_FETCH_TIMEOUT_MS,
  fetchAllSources,
  fetchRssFeed,
  generateNewsId,
  mapRssItemToNewsItem,
  normalizeSummary,
  type ParserOutput,
} from './rss'

let db: Database | null = null
let tempDir: string | null = null

afterEach(() => {
  db?.close()
  db = null

  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }

  vi.useRealTimers()
  parseURLMock.mockReset()
})

function createTempDb(): Database {
  tempDir = mkdtempSync(path.join(tmpdir(), 'gni-rss-'))
  db = initDb(path.join(tempDir, 'news.db'))

  return db
}

function makeFeed(items: Parser.Item[] = []): ParserOutput {
  return {
    title: 'Mock RSS Feed',
    items,
  } as ParserOutput
}

function makeSource(overrides: Partial<Omit<Source, 'id'>> = {}): Omit<Source, 'id'> {
  return {
    name: 'Reuters Markets',
    url: 'https://feeds.example.com/reuters.xml',
    region: 'US',
    category: 'Economy',
    active: true,
    lastFetchedAt: null,
    ...overrides,
  }
}

function insertTestSource(currentDb: Database, overrides: Partial<Omit<Source, 'id'>> = {}): Source {
  const source = makeSource(overrides)
  const id = insertSource(currentDb, source)

  return { id, ...source }
}

function makeNews(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: 'existing-news',
    title: 'Existing headline',
    source: 'Reuters Markets',
    sourceUrl: 'https://example.com/existing-headline',
    region: 'US',
    category: 'Economy',
    tags: ['markets'],
    publishedAt: '2026-04-23T10:00:00.000Z',
    summary: 'Existing summary',
    keyPoints: [],
    impact: 'Existing impact',
    importance: 'medium',
    ...overrides,
  }
}

describe('fetchRssFeed', () => {
  it('成功解析 mock RSS XML 对应的 feed 输出且不依赖真实网络', async () => {
    const mockXml = `<?xml version="1.0"?><rss><channel><item><title>Central bank update</title></item></channel></rss>`
    const feed = makeFeed([
      {
        title: 'Central bank update',
        link: 'https://example.com/central-bank-update',
        contentSnippet: mockXml.includes('Central bank update') ? 'Policy makers held rates steady.' : '',
      },
    ])
    parseURLMock.mockResolvedValue(feed)

    await expect(fetchRssFeed('https://feeds.example.com/rss.xml')).resolves.toEqual(feed)
    expect(parseURLMock).toHaveBeenCalledWith('https://feeds.example.com/rss.xml')
  })

  it('网络错误会转换为包含原始原因的异常', async () => {
    parseURLMock.mockRejectedValue(new Error('socket hang up'))

    await expect(fetchRssFeed('https://feeds.example.com/down.xml')).rejects.toThrow(/socket hang up/)
  })

  it('超过默认超时时间时会拒绝请求', async () => {
    vi.useFakeTimers()
    parseURLMock.mockReturnValue(new Promise(() => undefined))

    const promise = expect(fetchRssFeed('https://feeds.example.com/slow.xml')).rejects.toThrow(/timed out|超时/i)
    await vi.advanceTimersByTimeAsync(RSS_FETCH_TIMEOUT_MS + 1)

    await promise
  })

  it('无效 XML 解析错误会转换为可诊断异常', async () => {
    parseURLMock.mockRejectedValue(new Error('Non-whitespace before first tag'))

    await expect(fetchRssFeed('https://feeds.example.com/invalid.xml')).rejects.toThrow(
      /Non-whitespace before first tag|Invalid RSS/i,
    )
  })
})

describe('mapRssItemToNewsItem', () => {
  const source: Source = {
    id: 1,
    ...makeSource({ name: 'Financial Times', region: 'EU', category: 'Politics' }),
  }

  it('按 RSS item 和 source 正常映射新闻字段', () => {
    const item: Parser.Item = {
      title: 'EU reaches provisional minerals deal',
      link: 'https://example.com/minerals-deal',
      categories: ['critical minerals', 'policy'],
      isoDate: '2026-04-23T14:30:00.000Z',
      pubDate: 'Wed, 22 Apr 2026 10:00:00 GMT',
      contentSnippet: 'European negotiators agreed on a stockpile framework.',
      content: 'Longer content should not win over contentSnippet.',
    }

    expect(mapRssItemToNewsItem(item, source)).toEqual({
      title: 'EU reaches provisional minerals deal',
      source: 'Financial Times',
      sourceUrl: 'https://example.com/minerals-deal',
      region: 'EU',
      category: 'Politics',
      tags: ['critical minerals', 'policy'],
      publishedAt: '2026-04-23T14:30:00.000Z',
      summary: 'European negotiators agreed on a stockpile framework.',
      keyPoints: [],
      impact: undefined,
      importance: 'medium',
    })
  })

  it('缺失字段时使用安全默认值', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-24T00:00:00.000Z'))

    expect(mapRssItemToNewsItem({}, source)).toEqual({
      title: '',
      source: 'Financial Times',
      sourceUrl: undefined,
      region: 'EU',
      category: 'Politics',
      tags: [],
      publishedAt: '2026-04-24T00:00:00.000Z',
      summary: '',
      keyPoints: [],
      impact: undefined,
      importance: 'medium',
    })
  })

  it('摘要优先使用 contentSnippet，其次使用 content', () => {
    expect(
      mapRssItemToNewsItem(
        { title: 'Snippet wins', contentSnippet: 'Snippet summary', content: 'Full content summary' },
        source,
      ).summary,
    ).toBe('Snippet summary')

    expect(mapRssItemToNewsItem({ title: 'Content fallback', content: 'Full content summary' }, source).summary).toBe(
      'Full content summary',
    )
  })

  it('摘要会截断到 500 字符', () => {
    const summary = mapRssItemToNewsItem({ title: 'Long content', contentSnippet: 'a'.repeat(520) }, source).summary

    expect(summary).toHaveLength(500)
    expect(summary).toBe('a'.repeat(500))
  })

  it('pubDate 会转换为 ISO 8601 字符串', () => {
    expect(
      mapRssItemToNewsItem({ title: 'Date conversion', pubDate: 'Wed, 23 Apr 2026 14:30:00 GMT' }, source)
        .publishedAt,
    ).toBe('2026-04-23T14:30:00.000Z')
  })
})

describe('fetchAllSources', () => {
  it('只读取 active sources，成功拉取并插入新闻，同时更新 lastFetchedAt', async () => {
    const currentDb = createTempDb()
    const activeSource = insertTestSource(currentDb, {
      name: 'Active Source',
      url: 'https://feeds.example.com/active.xml',
    })
    const inactiveSource = insertTestSource(currentDb, {
      name: 'Inactive Source',
      url: 'https://feeds.example.com/inactive.xml',
      active: false,
    })
    parseURLMock.mockResolvedValue(
      makeFeed([
        {
          title: 'Fed signals slower path for cuts',
          link: 'https://example.com/fed-rate-cuts',
          categories: ['Federal Reserve'],
          isoDate: '2026-04-23T14:30:00.000Z',
          contentSnippet: 'Officials emphasized data dependence.',
        },
      ]),
    )

    const result = await fetchAllSources(currentDb)
    const news = getAllNews(currentDb)

    expect(result).toEqual({ fetched: 1, errors: [] })
    expect(parseURLMock).toHaveBeenCalledTimes(1)
    expect(parseURLMock).toHaveBeenCalledWith(activeSource.url)
    expect(news.count).toBe(1)
    expect(news.items[0]).toMatchObject({
      id: generateNewsId('https://example.com/fed-rate-cuts', 'Fed signals slower path for cuts'),
      title: 'Fed signals slower path for cuts',
      source: 'Active Source',
      sourceUrl: 'https://example.com/fed-rate-cuts',
      status: 'unread',
    })
    expect(getSourceById(currentDb, activeSource.id)?.lastFetchedAt).toEqual(expect.any(String))
    expect(getSourceById(currentDb, inactiveSource.id)?.lastFetchedAt).toBeNull()
  })

  it('已存在的新闻不会重复插入', async () => {
    const currentDb = createTempDb()
    insertTestSource(currentDb)
    insertNews(
      currentDb,
      makeNews({
        title: 'Existing headline',
        sourceUrl: 'https://example.com/existing-headline',
      }),
    )
    const dedupKey = computeDedupKey('  existing   HEADLINE ', 'https://example.com/existing-headline')
    expect(newsExists(currentDb, dedupKey)).toBe(true)
    parseURLMock.mockResolvedValue(
      makeFeed([
        {
          title: '  existing   HEADLINE ',
          link: 'https://example.com/existing-headline',
          isoDate: '2026-04-23T14:30:00.000Z',
          contentSnippet: 'Duplicate item from RSS.',
        },
      ]),
    )

    const result = await fetchAllSources(currentDb)

    expect(result).toEqual({ fetched: 0, errors: [] })
    expect(getAllNews(currentDb).count).toBe(1)
  })

  it('部分源失败时其他源继续执行并返回错误列表', async () => {
    const currentDb = createTempDb()
    const okSource = insertTestSource(currentDb, {
      name: 'Working Source',
      url: 'https://feeds.example.com/working.xml',
    })
    const failingSource = insertTestSource(currentDb, {
      name: 'Failing Source',
      url: 'https://feeds.example.com/failing.xml',
    })
    parseURLMock.mockImplementation(async (url: string) => {
      if (url === failingSource.url) {
        throw new Error('network down')
      }

      return makeFeed([
        {
          title: 'Global LNG prices ease',
          link: 'https://example.com/lng-prices',
          isoDate: '2026-04-22T08:00:00.000Z',
          contentSnippet: 'Energy buyers delayed cargo purchases.',
        },
      ])
    })

    const result = await fetchAllSources(currentDb)

    expect(result.fetched).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Failing Source')
    expect(result.errors[0]).toContain('network down')
    expect(getAllNews(currentDb).count).toBe(1)
    expect(getSourceById(currentDb, okSource.id)?.lastFetchedAt).toEqual(expect.any(String))
    expect(getSourceById(currentDb, failingSource.id)?.lastFetchedAt).toBeNull()
  })
})

describe('generateNewsId', () => {
  it('相同输入生成相同 ID', () => {
    expect(generateNewsId('https://example.com/a', 'Same title')).toBe(
      generateNewsId('https://example.com/a', 'Same title'),
    )
  })

  it('不同输入生成不同 ID', () => {
    expect(generateNewsId('https://example.com/a', 'Same title')).not.toBe(
      generateNewsId('https://example.com/b', 'Same title'),
    )
    expect(generateNewsId('https://example.com/a', 'Same title')).not.toBe(
      generateNewsId('https://example.com/a', 'Different title'),
    )
  })
})

describe('normalizeSummary', () => {
  it('短内容会清理空白且保持完整', () => {
    expect(normalizeSummary('  Officials   emphasized\n data dependence.  ', 500)).toBe(
      'Officials emphasized data dependence.',
    )
  })

  it('超长内容会按最大长度截断', () => {
    expect(normalizeSummary('abcdef', 4)).toBe('abcd')
  })

  it('会清理 HTML 标签与常见实体', () => {
    expect(normalizeSummary('<p>Hello <strong>world</strong> &amp; markets&nbsp;</p>', 500)).toBe(
      'Hello world & markets',
    )
  })
})
