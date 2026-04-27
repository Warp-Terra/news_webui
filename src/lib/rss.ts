import { createHash } from 'node:crypto'

import Parser from 'rss-parser'

import type { NewsItem } from '@/app/types/news'
import {
  computeDedupKey,
  getAllSources,
  insertNews,
  newsExists,
  updateLastFetched,
  type Database,
  type Source as NewsSource,
} from './db'

export type { NewsSource }

export type ParserOutput = Parser.Output<Record<string, unknown>>

export const RSS_FETCH_TIMEOUT_MS = 10_000
const DEFAULT_SUMMARY_LENGTH = 500

export async function fetchRssFeed(url: string): Promise<ParserOutput> {
  const parser = new Parser()

  try {
    return await withTimeout(parser.parseURL(url), RSS_FETCH_TIMEOUT_MS, `RSS fetch timed out for ${url}`)
  } catch (error) {
    throw new Error(`Failed to fetch RSS feed from ${url}: ${getErrorMessage(error)}`)
  }
}

export function mapRssItemToNewsItem(
  item: Parser.Item,
  source: NewsSource,
): Omit<NewsItem, 'id' | 'status'> {
  const title = item.title?.trim() ?? ''
  const sourceUrl = normalizeOptionalString(item.link)

  return {
    title,
    source: source.name,
    sourceUrl,
    region: source.region,
    category: source.category,
    tags: Array.isArray(item.categories) ? item.categories.filter((category) => typeof category === 'string') : [],
    publishedAt: normalizePublishedAt(item.isoDate ?? item.pubDate),
    summary: normalizeSummary(item.contentSnippet ?? item.content ?? '', DEFAULT_SUMMARY_LENGTH),
    keyPoints: [],
    impact: undefined,
    importance: 'medium',
  }
}

export async function fetchAllSources(db: Database): Promise<{ fetched: number; errors: string[] }> {
  const activeSources = getAllSources(db).filter((source) => source.active)
  const errors: string[] = []
  let fetched = 0

  for (const source of activeSources) {
    try {
      const feed = await fetchRssFeed(source.url)

      for (const item of feed.items) {
        const mappedItem = mapRssItemToNewsItem(item, source)
        const dedupKey = computeDedupKey(mappedItem.title, mappedItem.sourceUrl)

        if (newsExists(db, dedupKey)) {
          continue
        }

        const inserted = insertNews(db, {
          id: generateNewsId(mappedItem.sourceUrl ?? '', mappedItem.title),
          ...mappedItem,
        })

        if (inserted) {
          fetched += 1
        }
      }

      updateLastFetched(db, source.id)
    } catch (error) {
      errors.push(`${source.name}: ${getErrorMessage(error)}`)
    }
  }

  return { fetched, errors }
}

export function generateNewsId(sourceUrl: string, title: string): string {
  return createHash('sha256').update(`${sourceUrl.trim()}|${title.trim()}`).digest('hex')
}

export function normalizeSummary(content: string, maxLength: number): string {
  const normalizedLength = Math.max(0, Math.floor(maxLength))
  const cleaned = decodeHtmlEntities(stripHtmlTags(content)).trim().replace(/\s+/g, ' ')

  return cleaned.length > normalizedLength ? cleaned.slice(0, normalizedLength) : cleaned
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage))
    }, timeoutMs)

    promise.then(
      (value) => {
        clearTimeout(timeoutId)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timeoutId)
        reject(error)
      },
    )
  })
}

function normalizePublishedAt(value: string | undefined): string {
  if (!value) {
    return new Date().toISOString()
  }

  const parsedTimestamp = Date.parse(value)

  return Number.isNaN(parsedTimestamp) ? new Date().toISOString() : new Date(parsedTimestamp).toISOString()
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim()

  return normalized && normalized.length > 0 ? normalized : undefined
}

function stripHtmlTags(content: string): string {
  return content.replace(/<[^>]*>/g, ' ')
}

function decodeHtmlEntities(content: string): string {
  return content
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
