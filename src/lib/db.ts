import { createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

import DatabaseConstructor from 'better-sqlite3'

import type { Category, ImportanceLevel, NewsItem, Region } from '@/app/types/news'

export type Database = InstanceType<typeof DatabaseConstructor>

export type NewsStatus = 'unread' | 'read' | 'starred' | 'ignored'

export type NewsItemWithStatus = NewsItem & { status: NewsStatus }

export interface NewsFilters {
  regions?: Region[]
  categories?: Category[]
  importanceLevels?: ImportanceLevel[]
  statuses?: NewsStatus[]
}

export interface NewsQueryResult {
  items: NewsItemWithStatus[]
  count: number
}

export interface NewsAiFieldsUpdate {
  summary?: string
  keyPoints?: string[]
  impact?: string
  importance?: ImportanceLevel
  tags?: string[]
}

export type AiUsageOperation = 'summarize' | 'aggregate' | 'daily-report'

export interface AiUsageRecord {
  id?: number
  date: string
  model: string
  provider: string
  tokensIn: number
  tokensOut: number
  costUsd: number
  newsId?: string | null
  operation: AiUsageOperation
  createdAt: string
}

export interface Source {
  id: number
  name: string
  url: string
  region: Region
  category: Category
  active: boolean
  lastFetchedAt: string | null
}

type SqliteValue = string | number | bigint | null
type SqliteParams = Record<string, SqliteValue>

interface NewsRow {
  id: string
  title: string
  source: string
  sourceUrl: string | null
  region: string
  category: string
  tags: string
  publishedAt: string
  summary: string
  keyPoints: string
  impact: string | null
  importance: string
  status: string
}

interface SourceRow {
  id: number
  name: string
  url: string
  region: string
  category: string
  active: number
  lastFetchedAt: string | null
}

interface AiUsageRow {
  id: number
  date: string
  model: string
  provider: string
  tokensIn: number
  tokensOut: number
  costUsd: number
  newsId: string | null
  operation: string
  createdAt: string
}

const DEFAULT_DB_PATH = './data/news.db'

function resolveDbPath(dbPath: string): string {
  if (dbPath === ':memory:' || path.isAbsolute(dbPath)) {
    return dbPath
  }

  return dbPath === DEFAULT_DB_PATH
    ? path.join(process.cwd(), 'data', 'news.db')
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), dbPath)
}

const NEWS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  sourceUrl TEXT,
  region TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  publishedAt TEXT NOT NULL,
  summary TEXT NOT NULL,
  keyPoints TEXT NOT NULL DEFAULT '[]',
  impact TEXT,
  importance TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'unread',
  dedupKey TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
`

const SOURCES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  region TEXT NOT NULL,
  category TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  lastFetchedAt TEXT
);
`

const AI_USAGE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  tokensIn INTEGER NOT NULL DEFAULT 0,
  tokensOut INTEGER NOT NULL DEFAULT 0,
  costUsd REAL NOT NULL DEFAULT 0,
  newsId TEXT,
  operation TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
`

export function initDb(dbPath = process.env.NEWS_DB_PATH ?? DEFAULT_DB_PATH): Database {
  const resolvedPath = resolveDbPath(dbPath)

  if (resolvedPath !== ':memory:') {
    mkdirSync(path.dirname(resolvedPath), { recursive: true })
  }

  const db = new DatabaseConstructor(resolvedPath)
  db.pragma('foreign_keys = ON')
  db.exec(NEWS_TABLE_SQL)
  db.exec(SOURCES_TABLE_SQL)
  db.exec(AI_USAGE_TABLE_SQL)
  db.exec('CREATE INDEX IF NOT EXISTS idx_news_publishedAt ON news(publishedAt DESC);')
  db.exec('CREATE INDEX IF NOT EXISTS idx_news_region ON news(region);')
  db.exec('CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);')
  db.exec('CREATE INDEX IF NOT EXISTS idx_news_importance ON news(importance);')
  db.exec('CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);')
  db.exec('CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage(date);')
  db.exec('CREATE INDEX IF NOT EXISTS idx_ai_usage_operation ON ai_usage(operation);')
  db.exec('CREATE INDEX IF NOT EXISTS idx_ai_usage_newsId ON ai_usage(newsId);')

  return db
}

export function computeDedupKey(title: string, sourceUrl?: string | null): string {
  const normalizedTitle = title.trim().toLowerCase().replace(/\s+/g, ' ')
  const normalizedSourceUrl = sourceUrl?.trim() ?? ''

  return createHash('sha256').update(`${normalizedTitle}${normalizedSourceUrl}`).digest('hex')
}

export function newsExists(db: Database, dedupKey: string): boolean {
  const row = db
    .prepare<{ dedupKey: string }, { found: number }>(
      'SELECT 1 AS found FROM news WHERE dedupKey = @dedupKey LIMIT 1',
    )
    .get({ dedupKey })

  return row !== undefined
}

export function insertNews(db: Database, newsItem: NewsItem): boolean {
  const dedupKey = computeDedupKey(newsItem.title, newsItem.sourceUrl)
  const result = db
    .prepare<SqliteParams>(`
      INSERT OR IGNORE INTO news (
        id,
        title,
        source,
        sourceUrl,
        region,
        category,
        tags,
        publishedAt,
        summary,
        keyPoints,
        impact,
        importance,
        dedupKey
      ) VALUES (
        @id,
        @title,
        @source,
        @sourceUrl,
        @region,
        @category,
        @tags,
        @publishedAt,
        @summary,
        @keyPoints,
        @impact,
        @importance,
        @dedupKey
      )
    `)
    .run({
      id: newsItem.id,
      title: newsItem.title,
      source: newsItem.source,
      sourceUrl: newsItem.sourceUrl ?? null,
      region: newsItem.region,
      category: newsItem.category,
      tags: JSON.stringify(newsItem.tags),
      publishedAt: newsItem.publishedAt,
      summary: newsItem.summary,
      keyPoints: JSON.stringify(newsItem.keyPoints),
      impact: newsItem.impact ?? null,
      importance: newsItem.importance,
      dedupKey,
    })

  return result.changes === 1
}

export function getNewsById(db: Database, id: string): NewsItemWithStatus | null {
  const row = db.prepare<{ id: string }, NewsRow>('SELECT * FROM news WHERE id = @id').get({ id })

  return row ? mapNewsRow(row) : null
}

export function getAllNews(
  db: Database,
  filters: NewsFilters = {},
  search = '',
  limit?: number,
  offset = 0,
): NewsQueryResult {
  const params: SqliteParams = {}
  const whereClauses: string[] = []

  addInClause(whereClauses, params, 'region', filters.regions, 'region')
  addInClause(whereClauses, params, 'category', filters.categories, 'category')
  addInClause(whereClauses, params, 'importance', filters.importanceLevels, 'importance')
  addInClause(whereClauses, params, 'status', filters.statuses, 'status')

  const normalizedSearch = search.trim().toLowerCase()
  if (normalizedSearch.length > 0) {
    params.search = `%${normalizedSearch}%`
    whereClauses.push(`(
      LOWER(title) LIKE @search OR
      LOWER(source) LIKE @search OR
      LOWER(summary) LIKE @search OR
      LOWER(tags) LIKE @search OR
      LOWER(keyPoints) LIKE @search
    )`)
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''
  const countRow = db
    .prepare<SqliteParams, { count: number }>(`SELECT COUNT(*) AS count FROM news ${whereSql}`)
    .get(params)
  const count = countRow?.count ?? 0

  if (limit !== undefined) {
    params.limit = Math.max(0, Math.floor(limit))
    params.offset = Math.max(0, Math.floor(offset))
  } else if (offset > 0) {
    params.limit = -1
    params.offset = Math.floor(offset)
  }

  const paginationSql = 'limit' in params ? ' LIMIT @limit OFFSET @offset' : ''
  const rows = db
    .prepare<SqliteParams, NewsRow>(`
      SELECT * FROM news
      ${whereSql}
      ORDER BY publishedAt DESC, id ASC
      ${paginationSql}
    `)
    .all(params)

  return {
    items: rows.map(mapNewsRow),
    count,
  }
}

export function getNewsByDate(db: Database, date: string): NewsItemWithStatus[] {
  return db
    .prepare<{ date: string }, NewsRow>(`
      SELECT * FROM news
      WHERE substr(publishedAt, 1, 10) = @date
      ORDER BY publishedAt ASC, id ASC
    `)
    .all({ date })
    .map(mapNewsRow)
}

export function updateNewsStatus(db: Database, id: string, status: NewsStatus): boolean {
  const result = db
    .prepare<{ id: string; status: string; updatedAt: string }>(`
      UPDATE news
      SET status = @status, updatedAt = @updatedAt
      WHERE id = @id
    `)
    .run({ id, status, updatedAt: new Date().toISOString() })

  return result.changes === 1
}

export function updateNewsAiFields(db: Database, id: string, fields: NewsAiFieldsUpdate): boolean {
  const params: SqliteParams = { id, updatedAt: new Date().toISOString() }
  const setClauses: string[] = []

  addNewsAiUpdate(setClauses, params, 'summary', fields.summary)
  addJsonArrayUpdate(setClauses, params, 'keyPoints', fields.keyPoints)
  addNewsAiUpdate(setClauses, params, 'impact', fields.impact)
  addNewsAiUpdate(setClauses, params, 'importance', fields.importance)
  addJsonArrayUpdate(setClauses, params, 'tags', fields.tags)

  if (setClauses.length === 0) {
    return false
  }

  setClauses.push('updatedAt = @updatedAt')

  const result = db
    .prepare<SqliteParams>(`
      UPDATE news
      SET ${setClauses.join(', ')}
      WHERE id = @id
    `)
    .run(params)

  return result.changes === 1
}

export function getNewsWithoutAiSummary(db: Database, limit = 20): NewsItemWithStatus[] {
  const normalizedLimit = Math.max(0, Math.floor(limit))

  return db
    .prepare<{ limit: number }, NewsRow>(`
      SELECT * FROM news
      WHERE
        keyPoints = '[]'
        AND tags = '[]'
        AND (impact IS NULL OR TRIM(impact) = '')
        AND importance = 'medium'
      ORDER BY publishedAt DESC, id ASC
      LIMIT @limit
    `)
    .all({ limit: normalizedLimit })
    .map(mapNewsRow)
}

export function insertAiUsage(
  db: Database,
  record: Omit<AiUsageRecord, 'id' | 'createdAt'>,
): void {
  db.prepare<SqliteParams>(`
    INSERT INTO ai_usage (
      date,
      model,
      provider,
      tokensIn,
      tokensOut,
      costUsd,
      newsId,
      operation,
      createdAt
    ) VALUES (
      @date,
      @model,
      @provider,
      @tokensIn,
      @tokensOut,
      @costUsd,
      @newsId,
      @operation,
      @createdAt
    )
  `).run({
    date: record.date,
    model: record.model,
    provider: record.provider,
    tokensIn: record.tokensIn,
    tokensOut: record.tokensOut,
    costUsd: record.costUsd,
    newsId: record.newsId ?? null,
    operation: record.operation,
    createdAt: new Date().toISOString(),
  })
}

export function getAiUsage(db: Database, startDate: string, endDate: string): AiUsageRecord[] {
  return db
    .prepare<{ startDate: string; endDate: string }, AiUsageRow>(`
      SELECT * FROM ai_usage
      WHERE date BETWEEN @startDate AND @endDate
      ORDER BY date ASC, id ASC
    `)
    .all({ startDate, endDate })
    .map(mapAiUsageRow)
}

export function getAiUsageSummary(
  db: Database,
  startDate: string,
  endDate: string,
): { totalTokens: number; totalCost: number } {
  const row = db
    .prepare<{ startDate: string; endDate: string }, { totalTokens: number | null; totalCost: number | null }>(`
      SELECT
        COALESCE(SUM(tokensIn + tokensOut), 0) AS totalTokens,
        COALESCE(SUM(costUsd), 0) AS totalCost
      FROM ai_usage
      WHERE date BETWEEN @startDate AND @endDate
    `)
    .get({ startDate, endDate })

  return {
    totalTokens: row?.totalTokens ?? 0,
    totalCost: row?.totalCost ?? 0,
  }
}

export function deleteNews(db: Database, id: string): boolean {
  const result = db.prepare<{ id: string }>('DELETE FROM news WHERE id = @id').run({ id })

  return result.changes === 1
}

export function insertSource(db: Database, source: Omit<Source, 'id'>): number {
  const result = db
    .prepare<SqliteParams>(`
      INSERT INTO sources (name, url, region, category, active, lastFetchedAt)
      VALUES (@name, @url, @region, @category, @active, @lastFetchedAt)
    `)
    .run({
      name: source.name,
      url: source.url,
      region: source.region,
      category: source.category,
      active: source.active ? 1 : 0,
      lastFetchedAt: source.lastFetchedAt,
    })

  return Number(result.lastInsertRowid)
}

export function getAllSources(db: Database): Source[] {
  return db
    .prepare<[], SourceRow>('SELECT * FROM sources ORDER BY id ASC')
    .all()
    .map(mapSourceRow)
}

export function getSourceById(db: Database, id: number): Source | null {
  const row = db.prepare<{ id: number }, SourceRow>('SELECT * FROM sources WHERE id = @id').get({ id })

  return row ? mapSourceRow(row) : null
}

export function updateSource(db: Database, id: number, partial: Partial<Omit<Source, 'id'>>): boolean {
  const params: SqliteParams = { id }
  const setClauses: string[] = []

  addSourceUpdate(setClauses, params, 'name', partial.name)
  addSourceUpdate(setClauses, params, 'url', partial.url)
  addSourceUpdate(setClauses, params, 'region', partial.region)
  addSourceUpdate(setClauses, params, 'category', partial.category)

  if (partial.active !== undefined) {
    setClauses.push('active = @active')
    params.active = partial.active ? 1 : 0
  }

  if (partial.lastFetchedAt !== undefined) {
    setClauses.push('lastFetchedAt = @lastFetchedAt')
    params.lastFetchedAt = partial.lastFetchedAt
  }

  if (setClauses.length === 0) {
    return false
  }

  const result = db
    .prepare<SqliteParams>(`UPDATE sources SET ${setClauses.join(', ')} WHERE id = @id`)
    .run(params)

  return result.changes === 1
}

export function deleteSource(db: Database, id: number): boolean {
  const result = db.prepare<{ id: number }>('DELETE FROM sources WHERE id = @id').run({ id })

  return result.changes === 1
}

export function updateLastFetched(db: Database, id: number): void {
  db.prepare<{ id: number; lastFetchedAt: string }>(`
    UPDATE sources
    SET lastFetchedAt = @lastFetchedAt
    WHERE id = @id
  `).run({ id, lastFetchedAt: new Date().toISOString() })
}

function addInClause<T extends string>(
  whereClauses: string[],
  params: SqliteParams,
  columnName: string,
  values: T[] | undefined,
  paramPrefix: string,
) {
  if (!values || values.length === 0) {
    return
  }

  const placeholders = values.map((value, index) => {
    const paramName = `${paramPrefix}${index}`
    params[paramName] = value
    return `@${paramName}`
  })

  whereClauses.push(`${columnName} IN (${placeholders.join(', ')})`)
}

function addSourceUpdate(
  setClauses: string[],
  params: SqliteParams,
  field: 'name' | 'url' | 'region' | 'category',
  value: string | undefined,
) {
  if (value === undefined) {
    return
  }

  setClauses.push(`${field} = @${field}`)
  params[field] = value
}

function addNewsAiUpdate(
  setClauses: string[],
  params: SqliteParams,
  field: 'summary' | 'impact' | 'importance',
  value: string | undefined,
) {
  if (value === undefined) {
    return
  }

  setClauses.push(`${field} = @${field}`)
  params[field] = value
}

function addJsonArrayUpdate(
  setClauses: string[],
  params: SqliteParams,
  field: 'keyPoints' | 'tags',
  value: string[] | undefined,
) {
  if (value === undefined) {
    return
  }

  setClauses.push(`${field} = @${field}`)
  params[field] = JSON.stringify(value)
}

function mapNewsRow(row: NewsRow): NewsItemWithStatus {
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    sourceUrl: row.sourceUrl ?? undefined,
    region: row.region as Region,
    category: row.category as Category,
    tags: parseStringArray(row.tags),
    publishedAt: row.publishedAt,
    summary: row.summary,
    keyPoints: parseStringArray(row.keyPoints),
    impact: row.impact ?? '',
    importance: row.importance as ImportanceLevel,
    status: row.status as NewsStatus,
  }
}

function mapAiUsageRow(row: AiUsageRow): AiUsageRecord {
  return {
    id: row.id,
    date: row.date,
    model: row.model,
    provider: row.provider,
    tokensIn: row.tokensIn,
    tokensOut: row.tokensOut,
    costUsd: row.costUsd,
    newsId: row.newsId,
    operation: row.operation as AiUsageOperation,
    createdAt: row.createdAt,
  }
}

function mapSourceRow(row: SourceRow): Source {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    region: row.region as Region,
    category: row.category as Category,
    active: row.active === 1,
    lastFetchedAt: row.lastFetchedAt,
  }
}

function parseStringArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}
