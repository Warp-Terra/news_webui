# Default RSS Source Seeding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed a new empty deployment with editable default RSS sources so the dashboard can fetch news immediately after setup.

**Architecture:** The database layer owns one-time seeding because every route and background job already enters through `initDb()`. A new `app_metadata` table records `default_sources_seeded=true`; default RSS sources are inserted only if the marker is absent and `sources` is empty. Once seeded or intentionally skipped for a non-empty database, defaults are normal rows that users can edit, disable, or delete without the app recreating them.

**Tech Stack:** Next.js 16 App Router, TypeScript, SQLite via `better-sqlite3`, RSS parsing via `rss-parser`, Vitest.

---

## File Structure

- Create: `src/lib/defaultSources.ts`
- Modify: `src/lib/db.ts`
- Modify: `src/lib/db.test.ts`
- Modify: `src/lib/rss.test.ts`
- Modify: `src/app/api/test-utils.ts`
- Modify: `README.md`

Responsibilities:

- `src/lib/defaultSources.ts` stores the default RSS source list and its local type.
- `src/lib/db.ts` creates the metadata table and performs idempotent one-time default source seeding.
- `src/lib/db.test.ts` verifies seeding rules and prevents regressions around user deletion.
- `src/lib/rss.test.ts` keeps RSS unit tests isolated from automatic defaults.
- `src/app/api/test-utils.ts` keeps route tests isolated from automatic defaults.
- `README.md` documents default source behavior and the opt-out environment variable.

## Task 1: Add Failing Database Tests

**Files:**

- Modify: `src/lib/db.test.ts`
- Test: `src/lib/db.test.ts`

- [ ] **Step 1: Import default source fixture**

Add this import near the existing database imports in `src/lib/db.test.ts`:

```ts
import { DEFAULT_RSS_SOURCES } from './defaultSources'
```

Expected before implementation: TypeScript/Vitest fails because `src/lib/defaultSources.ts` does not exist yet.

- [ ] **Step 2: Disable default seeding in existing `beforeEach`**

Change the existing setup in `src/lib/db.test.ts` from:

```ts
db = initDb(dbPath)
```

to:

```ts
db = initDb(dbPath, { seedDefaultSources: false })
```

This preserves existing tests that assume a clean database.

- [ ] **Step 3: Expect metadata table creation**

In the test named `初始化数据库连接并创建 news 与 sources 表`, add this assertion after the existing `ai_settings` assertion:

```ts
expect(tableNames).toContain('app_metadata')
```

- [ ] **Step 4: Add first-run default source seeding test**

Add this test after the database initialization test:

```ts
it('首次启用默认源初始化时为空库写入默认 RSS 源并记录标记', () => {
  db.close()
  db = initDb(dbPath, { seedDefaultSources: true })

  const sources = getAllSources(db)

  expect(sources).toHaveLength(DEFAULT_RSS_SOURCES.length)
  expect(
    sources.map(({ name, url, region, category, active, lastFetchedAt }) => ({
      name,
      url,
      region,
      category,
      active,
      lastFetchedAt,
    })),
  ).toEqual(DEFAULT_RSS_SOURCES)

  const marker = db
    .prepare<{ key: string }, { value: string }>('SELECT value FROM app_metadata WHERE key = @key')
    .get({ key: 'default_sources_seeded' })

  expect(marker).toEqual({ value: 'true' })
})
```

- [ ] **Step 5: Add non-empty database skip test**

Add this test after the first-run seeding test:

```ts
it('已有数据源时不会补默认源但会记录已初始化标记', () => {
  const customSource = makeSource({ name: 'Custom Feed', url: 'https://example.com/rss.xml' })
  const id = insertSource(db, customSource)

  db.close()
  db = initDb(dbPath, { seedDefaultSources: true })

  expect(getAllSources(db)).toEqual([{ id, ...customSource }])

  const marker = db
    .prepare<{ key: string }, { value: string }>('SELECT value FROM app_metadata WHERE key = @key')
    .get({ key: 'default_sources_seeded' })

  expect(marker).toEqual({ value: 'true' })
})
```

- [ ] **Step 6: Add user deletion persistence test**

Add this test after the non-empty database skip test:

```ts
it('默认源被删除后再次初始化不会自动恢复', () => {
  db.close()
  db = initDb(dbPath, { seedDefaultSources: true })

  for (const source of getAllSources(db)) {
    deleteSource(db, source.id)
  }

  expect(getAllSources(db)).toEqual([])

  db.close()
  db = initDb(dbPath, { seedDefaultSources: true })

  expect(getAllSources(db)).toEqual([])
})
```

- [ ] **Step 7: Run the focused database test and confirm failure**

Run:

```bash
npm run test:run -- src/lib/db.test.ts
```

Expected: FAIL because `./defaultSources` and the `initDb(dbPath, options)` signature do not exist yet.

## Task 2: Add Default RSS Source Definitions

**Files:**

- Create: `src/lib/defaultSources.ts`
- Test: `src/lib/db.test.ts`

- [ ] **Step 1: Create `src/lib/defaultSources.ts`**

Create this file exactly:

```ts
import type { Category, Region } from '@/app/types/news'

export interface DefaultRssSource {
  name: string
  url: string
  region: Region
  category: Category
  active: boolean
  lastFetchedAt: null
}

export const DEFAULT_RSS_SOURCES: DefaultRssSource[] = [
  {
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    region: 'Global',
    category: 'Politics',
    active: true,
    lastFetchedAt: null,
  },
  {
    name: 'BBC Business',
    url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    region: 'Global',
    category: 'Economy',
    active: true,
    lastFetchedAt: null,
  },
  {
    name: 'BBC Technology',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    region: 'Global',
    category: 'Technology',
    active: true,
    lastFetchedAt: null,
  },
  {
    name: 'NPR World',
    url: 'https://feeds.npr.org/1004/rss.xml',
    region: 'US',
    category: 'Politics',
    active: true,
    lastFetchedAt: null,
  },
  {
    name: 'The Guardian World',
    url: 'https://www.theguardian.com/world/rss',
    region: 'Global',
    category: 'Politics',
    active: true,
    lastFetchedAt: null,
  },
  {
    name: 'The Guardian Technology',
    url: 'https://www.theguardian.com/technology/rss',
    region: 'Global',
    category: 'Technology',
    active: true,
    lastFetchedAt: null,
  },
]
```

- [ ] **Step 2: Run the focused database test and confirm the next failure**

Run:

```bash
npm run test:run -- src/lib/db.test.ts
```

Expected: FAIL because `initDb` still accepts only one argument and does not create `app_metadata`.

## Task 3: Implement Database Metadata and One-Time Seeding

**Files:**

- Modify: `src/lib/db.ts`
- Test: `src/lib/db.test.ts`

- [ ] **Step 1: Import default sources**

At the top of `src/lib/db.ts`, add this import after the existing app type import:

```ts
import { DEFAULT_RSS_SOURCES } from './defaultSources'
```

- [ ] **Step 2: Add init options and metadata key**

After `export type Database = InstanceType<typeof DatabaseConstructor>`, add:

```ts
export interface InitDbOptions {
  seedDefaultSources?: boolean
}
```

After `const DEFAULT_DB_PATH = './data/news.db'`, add:

```ts
const DEFAULT_SOURCES_SEEDED_KEY = 'default_sources_seeded'
```

- [ ] **Step 3: Add metadata table SQL**

After `SOURCES_TABLE_SQL`, add:

```ts
const APP_METADATA_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`
```

- [ ] **Step 4: Update `initDb` signature and schema initialization**

Change the function signature from:

```ts
export function initDb(dbPath = process.env.NEWS_DB_PATH ?? DEFAULT_DB_PATH): Database {
```

to:

```ts
export function initDb(
  dbPath = process.env.NEWS_DB_PATH ?? DEFAULT_DB_PATH,
  options: InitDbOptions = {},
): Database {
```

In the schema creation block, after:

```ts
db.exec(SOURCES_TABLE_SQL)
```

add:

```ts
db.exec(APP_METADATA_TABLE_SQL)
```

Before `return db`, add:

```ts
if (shouldSeedDefaultSources(options)) {
  seedDefaultSourcesIfNeeded(db)
}
```

- [ ] **Step 5: Add seeding helpers**

Add these helper functions after `initDb`:

```ts
function shouldSeedDefaultSources(options: InitDbOptions): boolean {
  if (options.seedDefaultSources !== undefined) {
    return options.seedDefaultSources
  }

  return process.env.NEWS_SEED_DEFAULT_SOURCES?.trim().toLowerCase() !== 'false'
}

function seedDefaultSourcesIfNeeded(db: Database): void {
  const marker = db
    .prepare<{ key: string }, { value: string }>('SELECT value FROM app_metadata WHERE key = @key')
    .get({ key: DEFAULT_SOURCES_SEEDED_KEY })

  if (marker) {
    return
  }

  const seedDefaults = db.transaction(() => {
    const sourceCount =
      db.prepare<[], { count: number }>('SELECT COUNT(*) AS count FROM sources').get()?.count ?? 0

    if (sourceCount === 0) {
      for (const source of DEFAULT_RSS_SOURCES) {
        insertSource(db, source)
      }
    }

    db.prepare<SqliteParams>(`
      INSERT INTO app_metadata (key, value, updatedAt)
      VALUES (@key, @value, @updatedAt)
      ON CONFLICT(key) DO UPDATE SET
        value = @value,
        updatedAt = @updatedAt
    `).run({
      key: DEFAULT_SOURCES_SEEDED_KEY,
      value: 'true',
      updatedAt: new Date().toISOString(),
    })
  })

  seedDefaults()
}
```

- [ ] **Step 6: Run focused database tests**

Run:

```bash
npm run test:run -- src/lib/db.test.ts
```

Expected: PASS for `src/lib/db.test.ts`.

## Task 4: Keep Existing Unit and Route Tests Isolated

**Files:**

- Modify: `src/lib/rss.test.ts`
- Modify: `src/app/api/test-utils.ts`
- Test: `src/lib/rss.test.ts`
- Test: `src/app/api/sources/route.test.ts`
- Test: `src/app/api/fetch/route.test.ts`

- [ ] **Step 1: Disable default seeding in RSS unit test database setup**

In `src/lib/rss.test.ts`, change `createTempDb()` from:

```ts
db = initDb(path.join(tempDir, 'news.db'))
```

to:

```ts
db = initDb(path.join(tempDir, 'news.db'), { seedDefaultSources: false })
```

- [ ] **Step 2: Disable default seeding in route test database creation**

In `src/app/api/test-utils.ts`, change `createRouteTestDb()` from:

```ts
const db = initDb(path.join(tempDir, 'news.db'))
```

to:

```ts
const db = initDb(path.join(tempDir, 'news.db'), { seedDefaultSources: false })
```

- [ ] **Step 3: Disable default seeding for route handlers opened through `NEWS_DB_PATH`**

Replace the existing `useTestDatabasePath` function in `src/app/api/test-utils.ts` with:

```ts
export function useTestDatabasePath(dbPath: string) {
  const originalDbPath = process.env.NEWS_DB_PATH
  const originalSeedDefaultSources = process.env.NEWS_SEED_DEFAULT_SOURCES

  process.env.NEWS_DB_PATH = dbPath
  process.env.NEWS_SEED_DEFAULT_SOURCES = 'false'

  return () => {
    if (originalDbPath === undefined) {
      delete process.env.NEWS_DB_PATH
    } else {
      process.env.NEWS_DB_PATH = originalDbPath
    }

    if (originalSeedDefaultSources === undefined) {
      delete process.env.NEWS_SEED_DEFAULT_SOURCES
    } else {
      process.env.NEWS_SEED_DEFAULT_SOURCES = originalSeedDefaultSources
    }
  }
}
```

- [ ] **Step 4: Run isolated affected tests**

Run:

```bash
npm run test:run -- src/lib/rss.test.ts src/app/api/sources/route.test.ts src/app/api/fetch/route.test.ts
```

Expected: PASS for the three affected test files.

## Task 5: Document Default Source Behavior

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Add default source behavior to feature overview**

In `README.md`, add this bullet under `## 功能概览`:

```md
- 默认 RSS 源：首次初始化空数据库时自动写入一组可编辑、可停用、可删除的默认 RSS 数据源。
```

- [ ] **Step 2: Add environment variable documentation**

In the environment variable table, add this row after `NEWS_DB_PATH`:

```md
| `NEWS_SEED_DEFAULT_SOURCES` | 否 | `true` | 是否在首次空库初始化时写入默认 RSS 源；设为 `false` 可禁用 |
```

- [ ] **Step 3: Add first-run note to local development section**

Under `## 本地开发`, after the instruction to open `http://localhost:3000`, add:

```md
首次启动空数据库时，系统会自动创建默认 RSS 源。默认源可在 `/sources` 页面编辑、停用或删除；删除后系统不会自动恢复。
```

## Task 6: Full Verification

**Files:**

- Verify: full repository

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm run test:run -- src/lib/db.test.ts src/lib/rss.test.ts src/app/api/sources/route.test.ts src/app/api/fetch/route.test.ts
```

Expected: PASS for all focused tests.

- [ ] **Step 2: Run all tests**

Run:

```bash
npm run test:run
```

Expected: PASS for the complete Vitest suite.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with no ESLint errors.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS and generate a production build.

- [ ] **Step 5: Manual local verification on a fresh database**

Preserve any existing local database before removing it:

```bash
mv data data.backup.default-rss-test
npm run dev
```

Open:

```text
http://localhost:3000/sources
```

Expected:

- Default RSS sources are visible.
- Each default source can be edited.
- Each default source can be disabled.
- Each default source can be deleted.

Then open:

```text
http://localhost:3000
```

Click `刷新 RSS`.

Expected:

- RSS fetch runs against enabled default sources.
- News appears if the network can reach those RSS endpoints.
- Any feed-specific failures are reported as per-source errors without preventing other feeds from being processed.

- [ ] **Step 6: Manual deletion persistence verification**

Delete all sources from `/sources`, stop the dev server, start it again:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/sources
```

Expected: The sources list remains empty because `default_sources_seeded=true` prevents automatic restoration.

Restore the previous local database if one was moved aside:

```bash
rm -rf data
mv data.backup.default-rss-test data
```

## Implementation Notes

- Do not add a separate UI label for “default” sources. They should behave as ordinary sources after insertion.
- Do not reseed when the user deletes all sources. The `app_metadata` marker is the source of truth.
- Do not change RSS fetch scheduling. Existing `src/instrumentation.ts` will fetch from whatever active sources exist after `initDb()`.
- Do not commit unless the user explicitly requests a commit.

## Self-Review

- Spec coverage: The plan covers first-run seeding, user edit/delete behavior, non-empty database behavior, test isolation, documentation, and verification.
- Placeholder scan: The plan contains concrete file paths, code snippets, commands, and expected outcomes.
- Type consistency: `InitDbOptions`, `DEFAULT_RSS_SOURCES`, `DefaultRssSource`, `NEWS_SEED_DEFAULT_SOURCES`, and `default_sources_seeded` are named consistently across tests, implementation, and docs.
