import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { NewsItem } from '@/app/types/news'
import type { Database, Source } from '@/lib/db'
import { initDb, insertNews, insertSource } from '@/lib/db'

export interface RouteTestDb {
  db: Database
  tempDir: string
  cleanup: () => void
}

export function createRouteTestDb(prefix = 'gni-route-'): RouteTestDb {
  const tempDir = mkdtempSync(path.join(tmpdir(), prefix))
  const db = initDb(path.join(tempDir, 'news.db'))

  return {
    db,
    tempDir,
    cleanup: () => {
      db.close()
      rmSync(tempDir, { recursive: true, force: true })
    },
  }
}

export function useTestDatabasePath(dbPath: string) {
  const originalDbPath = process.env.NEWS_DB_PATH
  process.env.NEWS_DB_PATH = dbPath

  return () => {
    if (originalDbPath === undefined) {
      delete process.env.NEWS_DB_PATH
    } else {
      process.env.NEWS_DB_PATH = originalDbPath
    }
  }
}

export function makeNews(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: 'news-001',
    title: 'Fed signals slower path for rate cuts',
    source: 'Reuters',
    sourceUrl: 'https://www.reuters.com/markets/us/fed-rate-cuts',
    region: 'US',
    category: 'Economy',
    tags: ['Federal Reserve', 'inflation'],
    publishedAt: '2026-04-23T14:30:00.000Z',
    summary: 'Officials emphasized data dependence while services inflation remains sticky.',
    keyPoints: ['Treasury yields moved higher.', 'Financial stocks outperformed.'],
    impact: 'Higher-for-longer expectations could tighten global liquidity.',
    importance: 'high',
    ...overrides,
  }
}

export function makeSource(overrides: Partial<Omit<Source, 'id'>> = {}): Omit<Source, 'id'> {
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

export function insertTestNews(db: Database, overrides: Partial<NewsItem> = {}): NewsItem {
  const news = makeNews(overrides)
  insertNews(db, news)

  return news
}

export function insertTestSource(db: Database, overrides: Partial<Omit<Source, 'id'>> = {}): Source {
  const source = makeSource(overrides)
  const id = insertSource(db, source)

  return { id, ...source }
}

export function jsonRequest(url: string, method: 'POST' | 'PATCH', body: unknown): Request {
  return new Request(url, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function routeContext(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}
