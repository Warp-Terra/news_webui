# 默认 RSS 源初始化实现计划

> **面向代理执行者：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务执行本计划。所有步骤使用复选框（`- [ ]`）跟踪进度。

**目标：** 让全新空数据库部署后自动拥有一组可编辑的默认 RSS 数据源，使 Dashboard 启动后即可抓取基础新闻。

**架构：** 默认源初始化由数据库层负责，因为 API 路由和后台 RSS 定时任务都会通过 `initDb()` 进入数据库。新增 `app_metadata` 表记录 `default_sources_seeded=true`；只有在该标记不存在且 `sources` 表为空时才插入默认 RSS 源。默认源插入后就是普通数据源，用户可以编辑、停用或删除，系统不会再次自动恢复。

**技术栈：** Next.js 16 App Router、TypeScript、SQLite（`better-sqlite3`）、`rss-parser`、Vitest。

---

## 文件结构

- 新增：`src/lib/defaultSources.ts`
- 修改：`src/lib/db.ts`
- 修改：`src/lib/db.test.ts`
- 修改：`src/lib/rss.test.ts`
- 修改：`src/app/api/test-utils.ts`
- 修改：`README.md`

职责划分：

- `src/lib/defaultSources.ts` 保存默认 RSS 源列表及其本地类型定义。
- `src/lib/db.ts` 创建元数据表，并执行幂等的一次性默认源初始化。
- `src/lib/db.test.ts` 验证默认源初始化规则，防止用户删除默认源后被重新恢复。
- `src/lib/rss.test.ts` 让 RSS 单元测试不受默认源自动初始化影响。
- `src/app/api/test-utils.ts` 让 API 路由测试不受默认源自动初始化影响。
- `README.md` 说明默认源行为和禁用默认源的环境变量。

## 任务 1：添加数据库层失败测试

**文件：**

- 修改：`src/lib/db.test.ts`
- 测试：`src/lib/db.test.ts`

- [ ] **步骤 1：导入默认源测试夹具**

在 `src/lib/db.test.ts` 现有数据库 import 附近加入：

```ts
import { DEFAULT_RSS_SOURCES } from './defaultSources'
```

实现前预期：TypeScript/Vitest 会失败，因为 `src/lib/defaultSources.ts` 尚不存在。

- [ ] **步骤 2：让既有 `beforeEach` 禁用默认源初始化**

把 `src/lib/db.test.ts` 现有 setup 从：

```ts
db = initDb(dbPath)
```

改为：

```ts
db = initDb(dbPath, { seedDefaultSources: false })
```

这样可以保留既有测试对空数据库的假设。

- [ ] **步骤 3：断言元数据表被创建**

在测试 `初始化数据库连接并创建 news 与 sources 表` 中，在现有 `ai_settings` 断言后加入：

```ts
expect(tableNames).toContain('app_metadata')
```

- [ ] **步骤 4：添加首次空库默认源初始化测试**

在数据库初始化测试之后加入：

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

- [ ] **步骤 5：添加已有数据源时跳过默认源插入的测试**

在首次初始化测试之后加入：

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

- [ ] **步骤 6：添加用户删除默认源后不恢复的测试**

在已有数据源跳过测试之后加入：

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

- [ ] **步骤 7：运行聚焦数据库测试并确认失败**

运行：

```bash
npm run test:run -- src/lib/db.test.ts
```

预期：失败，原因是 `./defaultSources`、`initDb(dbPath, options)` 签名和/或 `app_metadata` 表尚未实现。

## 任务 2：添加默认 RSS 源定义

**文件：**

- 新增：`src/lib/defaultSources.ts`
- 测试：`src/lib/db.test.ts`

- [ ] **步骤 1：创建 `src/lib/defaultSources.ts`**

创建文件，内容如下：

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

- [ ] **步骤 2：运行聚焦数据库测试并确认进入下一个失败点**

运行：

```bash
npm run test:run -- src/lib/db.test.ts
```

预期：失败，但不再因为缺少 `./defaultSources`；失败应来自 `initDb` 尚不支持 options 或 `app_metadata`/默认源初始化尚未实现。

## 任务 3：实现数据库元数据和一次性默认源初始化

**文件：**

- 修改：`src/lib/db.ts`
- 测试：`src/lib/db.test.ts`

- [ ] **步骤 1：导入默认源**

在 `src/lib/db.ts` 顶部，在现有 app 类型 import 后加入：

```ts
import { DEFAULT_RSS_SOURCES } from './defaultSources'
```

- [ ] **步骤 2：添加初始化选项和元数据 key**

在 `export type Database = InstanceType<typeof DatabaseConstructor>` 后加入：

```ts
export interface InitDbOptions {
  seedDefaultSources?: boolean
}
```

在 `const DEFAULT_DB_PATH = './data/news.db'` 后加入：

```ts
const DEFAULT_SOURCES_SEEDED_KEY = 'default_sources_seeded'
```

- [ ] **步骤 3：添加元数据表 SQL**

在 `SOURCES_TABLE_SQL` 后加入：

```ts
const APP_METADATA_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`
```

- [ ] **步骤 4：更新 `initDb` 签名和建表流程**

把函数签名从：

```ts
export function initDb(dbPath = process.env.NEWS_DB_PATH ?? DEFAULT_DB_PATH): Database {
```

改为：

```ts
export function initDb(
  dbPath = process.env.NEWS_DB_PATH ?? DEFAULT_DB_PATH,
  options: InitDbOptions = {},
): Database {
```

在建表流程中，在：

```ts
db.exec(SOURCES_TABLE_SQL)
```

之后加入：

```ts
db.exec(APP_METADATA_TABLE_SQL)
```

在 `return db` 前加入：

```ts
if (shouldSeedDefaultSources(options)) {
  seedDefaultSourcesIfNeeded(db)
}
```

- [ ] **步骤 5：添加默认源初始化辅助函数**

在 `initDb` 之后加入：

```ts
function shouldSeedDefaultSources(options: InitDbOptions): boolean {
  if (options.seedDefaultSources !== undefined) {
    return options.seedDefaultSources
  }

  return process.env.NEWS_SEED_DEFAULT_SOURCES?.trim().toLowerCase() !== 'false'
}

function seedDefaultSourcesIfNeeded(db: Database): void {
  const seedDefaults = db.transaction(() => {
    const marker = db
      .prepare<{ key: string }, { value: string }>('SELECT value FROM app_metadata WHERE key = @key')
      .get({ key: DEFAULT_SOURCES_SEEDED_KEY })

    if (marker) {
      return
    }

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

  seedDefaults.immediate()
}
```

说明：这里使用 `seedDefaults.immediate()`，让标记检查、源数量统计、默认源插入和标记写入都运行在 `BEGIN IMMEDIATE` 事务中，避免多个 SQLite 连接并发首次初始化时同时判断“未初始化”。

- [ ] **步骤 6：运行聚焦数据库测试**

运行：

```bash
npm run test:run -- src/lib/db.test.ts
```

预期：`src/lib/db.test.ts` 全部通过。

## 任务 4：隔离既有单元测试和路由测试

**文件：**

- 修改：`src/lib/rss.test.ts`
- 修改：`src/app/api/test-utils.ts`
- 测试：`src/lib/rss.test.ts`
- 测试：`src/app/api/sources/route.test.ts`
- 测试：`src/app/api/fetch/route.test.ts`

- [ ] **步骤 1：在 RSS 单元测试数据库 setup 中禁用默认源初始化**

在 `src/lib/rss.test.ts` 中，把 `createTempDb()` 从：

```ts
db = initDb(path.join(tempDir, 'news.db'))
```

改为：

```ts
db = initDb(path.join(tempDir, 'news.db'), { seedDefaultSources: false })
```

- [ ] **步骤 2：在路由测试数据库创建中禁用默认源初始化**

在 `src/app/api/test-utils.ts` 中，把 `createRouteTestDb()` 从：

```ts
const db = initDb(path.join(tempDir, 'news.db'))
```

改为：

```ts
const db = initDb(path.join(tempDir, 'news.db'), { seedDefaultSources: false })
```

- [ ] **步骤 3：通过 `NEWS_DB_PATH` 打开的路由 handler 也禁用默认源初始化**

把 `src/app/api/test-utils.ts` 中现有 `useTestDatabasePath` 函数替换为：

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

- [ ] **步骤 4：运行受影响测试**

运行：

```bash
npm run test:run -- src/lib/rss.test.ts src/app/api/sources/route.test.ts src/app/api/fetch/route.test.ts
```

预期：三个受影响测试文件全部通过。

## 任务 5：更新默认源行为文档

**文件：**

- 修改：`README.md`

- [ ] **步骤 1：在功能概览中添加默认源说明**

在 `README.md` 的 `## 功能概览` 下加入：

```md
- 默认 RSS 源：首次初始化空数据库时自动写入一组可编辑、可停用、可删除的默认 RSS 数据源。
```

- [ ] **步骤 2：添加环境变量说明**

在环境变量表中，在 `NEWS_DB_PATH` 后加入：

```md
| `NEWS_SEED_DEFAULT_SOURCES` | 否 | `true` | 是否在首次空库初始化时写入默认 RSS 源；设为 `false` 可禁用 |
```

同时调整环境变量章节开头，避免把 `NEWS_SEED_DEFAULT_SOURCES` 误描述为 AI 配置 fallback。推荐文案：

```md
> 以下环境变量均为**可选**配置。其中 RSS 与数据库变量用于部署/本地数据行为；AI 相关变量可作为 `/ai-settings` 页面配置的 fallback，适合无页面配置或不方便使用页面时使用。
```

- [ ] **步骤 3：在本地开发章节添加首次启动说明**

在 `## 本地开发` 中，在打开 `http://localhost:3000` 的说明后加入：

```md
首次启动空数据库时，系统会自动创建默认 RSS 源。默认源可在 `/sources` 页面编辑、停用或删除；删除后系统不会自动恢复。
```

## 任务 6：完整验证

**文件：**

- 验证：整个仓库

- [ ] **步骤 1：运行聚焦测试**

运行：

```bash
npm run test:run -- src/lib/db.test.ts src/lib/rss.test.ts src/app/api/sources/route.test.ts src/app/api/fetch/route.test.ts
```

预期：所有聚焦测试通过。

- [ ] **步骤 2：运行全量测试**

运行：

```bash
npm run test:run
```

预期：完整 Vitest 测试套件通过。

- [ ] **步骤 3：运行 lint**

运行：

```bash
npm run lint
```

预期：没有 ESLint error。若存在既有 warning，需要记录但不把它当作本功能阻塞项。

- [ ] **步骤 4：运行生产构建**

运行：

```bash
npm run build
```

预期：生产构建通过。

- [ ] **步骤 5：在新数据库上手动验证默认源初始化**

先保留已有本地数据库：

```bash
mv data data.backup.default-rss-test
npm run dev
```

打开：

```text
http://localhost:3000/sources
```

预期：

- 能看到默认 RSS 源。
- 每个默认源都可以编辑。
- 每个默认源都可以停用。
- 每个默认源都可以删除。

然后打开：

```text
http://localhost:3000
```

点击 `刷新 RSS`。

预期：

- RSS 拉取会针对启用的默认源运行。
- 如果网络能访问这些 RSS 端点，新闻会出现。
- 单个源失败时，错误会按源汇总，不会阻止其他源继续处理。

- [ ] **步骤 6：手动验证删除后不恢复**

在 `/sources` 删除所有源，停止 dev server，然后重新启动：

```bash
npm run dev
```

打开：

```text
http://localhost:3000/sources
```

预期：源列表仍为空，因为 `default_sources_seeded=true` 会阻止自动恢复。

如果之前移动过本地数据库，验证后恢复：

```bash
rm -rf data
mv data.backup.default-rss-test data
```

## 实现注意事项

- 不要给“默认源”添加单独 UI 标签。默认源写入后应作为普通数据源使用。
- 用户删除所有源后，不要重新 seed。`app_metadata` 中的标记是判断是否已初始化的事实来源。
- 不要改变 RSS 拉取调度。现有 `src/instrumentation.ts` 会在 `initDb()` 后针对当前启用源执行拉取。
- 除非用户明确要求，否则不要提交。

## 自检

- 需求覆盖：计划覆盖首次空库初始化、用户编辑/删除、已有源数据库处理、测试隔离、文档更新和完整验证。
- 占位符检查：计划包含明确文件路径、代码片段、命令和预期结果。
- 类型一致性：`InitDbOptions`、`DEFAULT_RSS_SOURCES`、`DefaultRssSource`、`NEWS_SEED_DEFAULT_SOURCES`、`default_sources_seeded` 在测试、实现和文档中命名一致。
