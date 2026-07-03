# Global News Intelligence Dashboard

Global News Intelligence Dashboard 是一个基于 Next.js App Router 的新闻情报面板，支持真实 RSS 数据源、本地 SQLite 持久化、新闻筛选/搜索、状态管理，以及 AI 摘要、AI 日报与用量追踪。

## 功能概览

- Dashboard 三栏布局：筛选栏、新闻列表、新闻详情面板。
- 新闻检索：支持按地区、分类、重要程度、状态和关键词筛选。
- RSS 数据源：支持新增、编辑、启用/停用、删除数据源，并可手动或定时拉取新闻。
- 默认 RSS 源：首次初始化空数据库时自动写入一组可编辑、可停用、可删除的默认 RSS 数据源。
- 本地持久化：使用 SQLite 存储新闻、数据源和 AI 用量记录。
- 新闻状态：支持未读、已读、收藏、忽略和删除。
- AI 单条摘要：在新闻详情中生成中文结构化摘要、关键点、影响判断、重要程度和标签。
- AI 批量摘要：批量处理未生成 AI 摘要的新闻，并记录每次调用 token 用量。
- AI Markdown 日报：按日期生成可复制的 Markdown 情报日报。
- AI 用量页面：查看指定日期范围内的模型、provider、token、成本字段和调用明细。
- AI 配置页面：在浏览器中配置 provider、API Key、Base URL、模型、采样温度、输出 token 与推理参数，并支持测试连接。

## 国际化

应用第一版支持中文和英文系统界面：

- 默认语言：中文（`zh-CN`）
- 英文路径：`/en-US`
- 中文路径：`/zh-CN`
- 根路径 `/` 会重定向到 `/zh-CN`

国际化范围包括系统 UI 文案、导航、筛选、表单、日期和金额格式化。新闻标题、RSS 摘要、来源原文和 AI 生成日报正文不会在本版本自动翻译。

## 技术栈

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS + shadcn/ui 风格组件
- Zustand 状态管理
- better-sqlite3 本地数据库
- Vitest + Testing Library 测试
- OpenAI 兼容 API / DeepSeek / Qwen / Kimi / GLM / Anthropic Claude / Google Gemini / Ollama / Custom AI Provider

## AI 配置

推荐使用页面配置：启动后打开 `/ai-settings`，选择 provider 并填写 API Key、Base URL 与模型名称。配置会保存在本地 SQLite 的 `ai_settings` 表中，保存后无需重启服务。

支持的 provider：

| Provider | 说明 | 默认 Base URL | 示例模型 |
|:---|:---|:---|:---|
| `openai` | OpenAI 官方 Chat Completions | `https://api.openai.com/v1` | `gpt-4o-mini` |
| `deepseek` | DeepSeek，OpenAI 兼容格式 | `https://api.deepseek.com` | `deepseek-chat` / `deepseek-reasoner` |
| `qwen` | 阿里云百炼 DashScope，OpenAI 兼容格式 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| `kimi` | Moonshot Kimi，OpenAI 兼容格式 | `https://api.moonshot.cn/v1` | `kimi-k2.7` |
| `glm` | Z.AI GLM，OpenAI 兼容格式 | `https://api.z.ai/api/paas/v4` | `glm-4.6` |
| `anthropic` | Anthropic Claude Messages API | `https://api.anthropic.com/v1` | `claude-3-5-sonnet-latest` |
| `gemini` | Google Gemini generateContent API | `https://generativelanguage.googleapis.com/v1beta` | `gemini-1.5-flash` |
| `ollama` | 本地 Ollama | `http://localhost:11434` | `llama3.1` |
| `custom` | 任意 OpenAI 兼容端点，高级自定义入口 | 自行填写 | 供应商自定义模型名 |

环境变量仍可作为 fallback 使用，适合无页面配置的部署场景。

## 环境变量

> 以下环境变量均为**可选**配置。其中 RSS 与数据库变量用于部署/本地数据行为；AI 相关变量可作为 `/ai-settings` 页面配置的 fallback，适合无页面配置或不方便使用页面时使用。

可在 `.env.local` 中配置以下变量：

| 变量 | 使用环境变量时必填 | 默认值 | 说明 |
|:---|:---|:---|:---|
| `NEWS_DB_PATH` | 否 | `./data/news.db` | SQLite 数据库路径 |
| `NEWS_SEED_DEFAULT_SOURCES` | 否 | `true` | 是否在首次空库初始化时写入默认 RSS 源；设为 `false` 可禁用 |
| `AI_PROVIDER` | 否 | `openai` | 支持 `openai`、`deepseek`、`qwen`、`kimi`、`glm`、`anthropic`、`gemini`、`ollama`、`custom` |
| `AI_MODEL` | 是 | - | AI 模型名称，例如 `gpt-4o-mini`、`deepseek-chat`、`llama3.1` |
| `AI_API_KEY` | 非 Ollama 必填 | - | AI API Key；Ollama 通常不需要 |
| `AI_BASE_URL` | 否 | provider 默认地址 | 自定义 OpenAI 兼容接口或 Ollama 地址 |
| `AI_TEMPERATURE` | 否 | `0.7` | 采样温度；仅对支持该参数的模型发送，不表示推理强度 |
| `AI_MAX_TOKENS` | 否 | `2048` | 最大输出 token 数 |
| `AI_REASONING_EFFORT` | 否 | - | 推理强度，可选 `low`、`medium`、`high`；仅对支持该参数的模型发送 |
| `AI_ENABLE_THINKING` | 否 | - | 是否开启 thinking，可选 `true` 或 `false`；仅对支持该参数的模型发送 |
| `AI_REQUEST_TIMEOUT_MS` | 否 | `30000` | AI API 请求超时时间，单位毫秒；生成日报较慢时建议设为 `120000` |

示例：

> 以下仅为环境变量 fallback 示例，非必须。推荐通过 `/ai-settings` 页面配置。

```bash
AI_PROVIDER=deepseek
AI_MODEL=deepseek-chat
AI_API_KEY=your_api_key
AI_BASE_URL=https://api.deepseek.com
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=2048
AI_REQUEST_TIMEOUT_MS=120000
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

首次启动空数据库时，系统会自动创建默认 RSS 源。默认源可在 `/sources` 页面编辑、停用或删除；删除后系统不会自动恢复。

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
- `/ai-settings`：AI provider、API Key、Base URL 与模型配置。
- `/api/news`、`/api/news/[id]`：新闻列表、详情、状态更新和删除。
- `/api/sources`、`/api/sources/[id]`：数据源 CRUD。
- `/api/fetch`：手动触发 RSS 拉取。
- `/api/ai/summarize`：单条新闻 AI 摘要。
- `/api/ai/batch`：批量 AI 摘要。
- `/api/ai/daily-report`：AI 日报生成。
- `/api/ai/usage`：AI 用量查询。
- `/api/ai/settings`：AI 配置读取与保存。
- `/api/ai/settings/test`：AI 配置连接测试。

## 验证状态

第四阶段最终验证已完成：

- `npm run test:run`：35 个测试文件、215 个测试全部通过。
- `npm run lint`：无 error。
- `npm run build`：生产构建通过。
