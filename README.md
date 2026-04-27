# Global News Intelligence Dashboard

Global News Intelligence Dashboard 是一个基于 Next.js App Router 的新闻情报面板，支持真实 RSS 数据源、本地 SQLite 持久化、新闻筛选/搜索、状态管理，以及 AI 摘要、AI 日报与用量追踪。

## 功能概览

- Dashboard 三栏布局：筛选栏、新闻列表、新闻详情面板。
- 新闻检索：支持按地区、分类、重要程度、状态和关键词筛选。
- RSS 数据源：支持新增、编辑、启用/停用、删除数据源，并可手动或定时拉取新闻。
- 本地持久化：使用 SQLite 存储新闻、数据源和 AI 用量记录。
- 新闻状态：支持未读、已读、收藏、忽略和删除。
- AI 单条摘要：在新闻详情中生成中文结构化摘要、关键点、影响判断、重要程度和标签。
- AI 批量摘要：批量处理未生成 AI 摘要的新闻，并记录每次调用 token 用量。
- AI Markdown 日报：按日期生成可复制的 Markdown 情报日报。
- AI 用量页面：查看指定日期范围内的模型、provider、token、成本字段和调用明细。

## 技术栈

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS + shadcn/ui 风格组件
- Zustand 状态管理
- better-sqlite3 本地数据库
- Vitest + Testing Library 测试
- OpenAI 兼容 API / DeepSeek / Ollama AI Provider

## 环境变量

可在 `.env.local` 中配置以下变量：

| 变量 | 必填 | 默认值 | 说明 |
|:---|:---|:---|:---|
| `NEWS_DB_PATH` | 否 | `./data/news.db` | SQLite 数据库路径 |
| `AI_PROVIDER` | 否 | `openai` | 支持 `openai`、`deepseek`、`ollama` |
| `AI_MODEL` | 是 | - | AI 模型名称，例如 `gpt-4o-mini`、`deepseek-chat`、`llama3.1` |
| `AI_API_KEY` | OpenAI/DeepSeek 必填 | - | OpenAI 兼容接口 API Key；Ollama 不需要 |
| `AI_BASE_URL` | 否 | provider 默认地址 | 自定义 OpenAI 兼容接口或 Ollama 地址 |
| `AI_TEMPERATURE` | 否 | `0.7` | 生成温度 |
| `AI_MAX_TOKENS` | 否 | `2048` | 最大输出 token 数 |

示例：

```bash
AI_PROVIDER=deepseek
AI_MODEL=deepseek-chat
AI_API_KEY=your_api_key
AI_BASE_URL=https://api.deepseek.com/v1
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=2048
```

本地 Ollama 示例：

```bash
AI_PROVIDER=ollama
AI_MODEL=llama3.1
AI_BASE_URL=http://localhost:11434
```

## 本地开发

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

打开 http://localhost:3000 查看 Dashboard。

## 常用命令

```bash
npm run test:run
npm run lint
npm run build
npm run start
```

## 主要页面与 API

- `/`：新闻 Dashboard。
- `/sources`：RSS 数据源管理。
- `/daily-report`：AI Markdown 日报生成。
- `/ai-usage`：AI token 与成本用量查看。
- `/api/news`、`/api/news/[id]`：新闻列表、详情、状态更新和删除。
- `/api/sources`、`/api/sources/[id]`：数据源 CRUD。
- `/api/fetch`：手动触发 RSS 拉取。
- `/api/ai/summarize`：单条新闻 AI 摘要。
- `/api/ai/batch`：批量 AI 摘要。
- `/api/ai/daily-report`：AI 日报生成。
- `/api/ai/usage`：AI 用量查询。

## 验证状态

第四阶段最终验证已完成：

- `npm run test:run`：30 个测试文件、185 个测试全部通过。
- `npm run lint`：无 error。
- `npm run build`：生产构建通过。
