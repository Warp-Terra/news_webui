# Render Daily Report Markdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AI 日报页面中的 Markdown 源码展示改为渲染后的 Markdown 预览。

**Architecture:** `DailyReportPage` 继续作为现有 Client Component 负责日期选择、调用 `/api/ai/daily-report` 和展示统计信息。新增一个纯展示组件 `MarkdownReport`，使用 `react-markdown` 渲染 `report.markdown`，通过 `skipHtml` 跳过 AI 返回中的原始 HTML，避免引入 `dangerouslySetInnerHTML`。后端 API 与 `DailyReportResult.markdown` 数据结构不变，页面只改变前端展示方式。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Tailwind CSS、`react-markdown`、Vitest、Testing Library。

---

## 文件结构

- 修改：`package.json`
- 修改：`package-lock.json`
- 新增：`src/app/components/daily-report/MarkdownReport.tsx`
- 新增：`src/app/components/daily-report/MarkdownReport.test.tsx`
- 修改：`src/app/[lang]/daily-report/page.tsx`
- 修改：`src/app/[lang]/daily-report/page.test.tsx`
- 修改：`src/app/i18n/dictionaries.ts`
- 修改：`README.md`

职责划分：

- `MarkdownReport.tsx` 只负责把 Markdown 字符串渲染成语义化 React 元素，并定义日报预览的排版样式。
- `DailyReportPage` 只负责调用接口、管理 loading/error/report 状态，并在有 `report` 时使用 `MarkdownReport`。
- `page.test.tsx` 覆盖日报页从生成到渲染预览的集成行为。
- `MarkdownReport.test.tsx` 覆盖 Markdown 渲染能力和跳过原始 HTML 的安全边界。
- `dictionaries.ts` 把 “Markdown 输出” 文案调整为 “Markdown 预览”。
- `README.md` 更新功能说明，避免继续描述为“可复制 Markdown 源码”。

## 任务 1：添加 Markdown 渲染组件失败测试

**Files:**

- 新增：`src/app/components/daily-report/MarkdownReport.test.tsx`
- 测试：`src/app/components/daily-report/MarkdownReport.test.tsx`

- [ ] **步骤 1：创建失败测试文件**

创建 `src/app/components/daily-report/MarkdownReport.test.tsx`，内容如下：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MarkdownReport } from './MarkdownReport'

describe('MarkdownReport', () => {
  it('将标题、加粗、列表和链接渲染为语义化 HTML', () => {
    render(
      <MarkdownReport
        markdown={[
          '# 全球情报日报',
          '',
          '## Global',
          '',
          '- **AI 出口管制升级**',
          '- [Source link](https://example.com/report)',
        ].join('\n')}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: '全球情报日报' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Global' })).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('AI 出口管制升级').closest('strong')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Source link' })).toHaveAttribute('href', 'https://example.com/report')
    expect(screen.getByRole('link', { name: 'Source link' })).toHaveAttribute('target', '_blank')
  })

  it('跳过 AI 返回中的原始 HTML 内容', () => {
    render(
      <MarkdownReport
        markdown={[
          '# Safe heading',
          '',
          '<script>alert("xss")</script>',
          '<strong>raw html</strong>',
        ].join('\n')}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Safe heading' })).toBeInTheDocument()
    expect(screen.queryByText(/alert/)).not.toBeInTheDocument()
    expect(screen.queryByText('raw html')).not.toBeInTheDocument()
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
npm run test:run -- src/app/components/daily-report/MarkdownReport.test.tsx
```

预期：失败，错误包含 `Failed to resolve import "./MarkdownReport"` 或 `Cannot find module './MarkdownReport'`，因为组件尚未实现。

- [ ] **步骤 3：提交失败测试**

```bash
git add src/app/components/daily-report/MarkdownReport.test.tsx
git commit -m "test: cover daily report markdown renderer"
```

## 任务 2：安装 Markdown 渲染依赖并实现组件

**Files:**

- 修改：`package.json`
- 修改：`package-lock.json`
- 新增：`src/app/components/daily-report/MarkdownReport.tsx`
- 测试：`src/app/components/daily-report/MarkdownReport.test.tsx`

- [ ] **步骤 1：安装 `react-markdown`**

运行：

```bash
npm install react-markdown
```

预期：`package.json` 的 `dependencies` 增加 `react-markdown`，`package-lock.json` 记录对应依赖树。

- [ ] **步骤 2：实现 Markdown 渲染组件**

创建 `src/app/components/daily-report/MarkdownReport.tsx`，内容如下：

```tsx
import ReactMarkdown, { type Components } from "react-markdown";

import { cn } from "@/lib/utils";

interface MarkdownReportProps {
  markdown: string;
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="border-b pb-3 text-2xl font-semibold tracking-tight md:text-3xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 text-xl font-semibold tracking-tight">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 text-lg font-semibold tracking-tight">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="leading-7 text-foreground/90">{children}</p>,
  ul: ({ children }) => <ul className="ml-5 list-disc space-y-2 leading-7">{children}</ul>,
  ol: ({ children }) => <ol className="ml-5 list-decimal space-y-2 leading-7">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/30 bg-muted/30 py-2 pl-4 text-muted-foreground">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
    >
      {children}
    </a>
  ),
  code: ({ children, className }) => (
    <code className={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]", className)}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-lg border bg-background/80 p-3 text-sm leading-6">
      {children}
    </pre>
  ),
};

export function MarkdownReport({ markdown }: MarkdownReportProps) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4 text-sm leading-7 text-foreground shadow-sm md:p-5">
      <div className="space-y-4">
        <ReactMarkdown skipHtml components={markdownComponents}>
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
```

- [ ] **步骤 3：运行组件测试确认通过**

运行：

```bash
npm run test:run -- src/app/components/daily-report/MarkdownReport.test.tsx
```

预期：测试通过，输出包含 `2 passed`。

- [ ] **步骤 4：提交组件实现**

```bash
git add package.json package-lock.json src/app/components/daily-report/MarkdownReport.tsx src/app/components/daily-report/MarkdownReport.test.tsx
git commit -m "feat: add daily report markdown renderer"
```

## 任务 3：将日报页从源码展示改为 Markdown 预览

**Files:**

- 修改：`src/app/[lang]/daily-report/page.tsx`
- 修改：`src/app/[lang]/daily-report/page.test.tsx`
- 测试：`src/app/[lang]/daily-report/page.test.tsx`

- [ ] **步骤 1：更新日报页测试，使其要求语义化 Markdown 渲染**

把 `src/app/[lang]/daily-report/page.test.tsx` 中 `beforeEach` 的 mock 返回值改为：

```tsx
mockedGenerateDailyReport.mockResolvedValue({
  markdown: '# 全球情报日报\n\n## Global\n\n- **AI 出口管制升级**\n- [BBC](https://example.com/news)',
  newsCount: 6,
  tokensIn: 120,
  tokensOut: 80,
})
```

把 `点击生成日报成功后显示 markdown 内容、新闻数量和 token 消耗` 测试替换为：

```tsx
it('点击生成日报成功后显示渲染后的 Markdown 预览、新闻数量和 token 消耗', async () => {
  const user = userEvent.setup()
  const { container } = renderWithI18n(<DailyReportPage />)

  await user.click(screen.getByRole('button', { name: /生成日报/ }))

  await waitFor(() => expect(mockedGenerateDailyReport).toHaveBeenCalled())
  expect(await screen.findByRole('heading', { level: 1, name: '全球情报日报' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 2, name: 'Global' })).toBeInTheDocument()
  expect(screen.getByText('AI 出口管制升级').closest('strong')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'BBC' })).toHaveAttribute('href', 'https://example.com/news')
  expect(container.querySelector('pre')).not.toBeInTheDocument()
  expect(screen.getByText('6 条')).toBeInTheDocument()
  expect(screen.getByText('200')).toBeInTheDocument()
})
```

- [ ] **步骤 2：运行页面测试确认失败**

运行：

```bash
npm run test:run -- "src/app/[lang]/daily-report/page.test.tsx"
```

预期：失败，错误包含无法找到 role 为 `heading` 且 name 为 `全球情报日报` 的元素，因为页面仍使用 `<pre>` 展示 Markdown 源码。

- [ ] **步骤 3：在日报页接入 `MarkdownReport`**

在 `src/app/[lang]/daily-report/page.tsx` 的 imports 中加入：

```tsx
import { MarkdownReport } from "@/app/components/daily-report/MarkdownReport";
```

把当前 report 分支：

```tsx
<pre className="whitespace-pre-wrap rounded-xl border bg-muted/30 p-4 text-sm leading-7">
  {report.markdown}
</pre>
```

替换为：

```tsx
<MarkdownReport markdown={report.markdown} />
```

- [ ] **步骤 4：运行页面测试确认通过**

运行：

```bash
npm run test:run -- "src/app/[lang]/daily-report/page.test.tsx"
```

预期：测试通过，输出包含 `4 passed`。

- [ ] **步骤 5：提交页面接入**

```bash
git add "src/app/[lang]/daily-report/page.tsx" "src/app/[lang]/daily-report/page.test.tsx"
git commit -m "feat: render daily report markdown preview"
```

## 任务 4：更新预览文案和 README 说明

**Files:**

- 修改：`src/app/i18n/dictionaries.ts`
- 修改：`src/app/[lang]/daily-report/page.test.tsx`
- 修改：`README.md`
- 测试：`src/app/[lang]/daily-report/page.test.tsx`

- [ ] **步骤 1：先更新页面测试中的中英文预览文案断言**

在 `页面渲染标题、日期选择器和生成日报按钮` 测试中加入：

```tsx
expect(screen.getByText('Markdown 预览')).toBeInTheDocument()
```

在 `英文语言下显示英文日报页面文案` 测试中加入：

```tsx
expect(screen.getByText('Markdown Preview')).toBeInTheDocument()
```

- [ ] **步骤 2：运行页面测试确认失败**

运行：

```bash
npm run test:run -- "src/app/[lang]/daily-report/page.test.tsx"
```

预期：失败，错误包含找不到 `Markdown 预览` 或 `Markdown Preview`，因为字典仍是旧文案。

- [ ] **步骤 3：更新 i18n 字典文案**

在 `src/app/i18n/dictionaries.ts` 中，把中文日报文案从：

```ts
markdownOutput: 'Markdown 输出',
```

改为：

```ts
markdownOutput: 'Markdown 预览',
```

把英文日报文案从：

```ts
markdownOutput: 'Markdown Output',
```

改为：

```ts
markdownOutput: 'Markdown Preview',
```

- [ ] **步骤 4：更新 README 功能说明**

在 `README.md` 中，把功能概览里的日报条目从：

```md
- AI Markdown 日报：按日期生成可复制的 Markdown 情报日报。
```

改为：

```md
- AI Markdown 日报：按日期生成并渲染 Markdown 情报日报预览。
```

把主要页面里的日报条目从：

```md
- `/daily-report`：AI Markdown 日报生成。
```

改为：

```md
- `/daily-report`：AI Markdown 日报生成与预览。
```

- [ ] **步骤 5：运行页面测试确认通过**

运行：

```bash
npm run test:run -- "src/app/[lang]/daily-report/page.test.tsx"
```

预期：测试通过，输出包含 `4 passed`。

- [ ] **步骤 6：提交文案和文档更新**

```bash
git add src/app/i18n/dictionaries.ts "src/app/[lang]/daily-report/page.test.tsx" README.md
git commit -m "docs: describe daily report markdown preview"
```

## 任务 5：最终验证

**Files:**

- 验证：`package.json`
- 验证：`src/app/components/daily-report/MarkdownReport.test.tsx`
- 验证：`src/app/[lang]/daily-report/page.test.tsx`

- [ ] **步骤 1：运行聚焦测试**

运行：

```bash
npm run test:run -- src/app/components/daily-report/MarkdownReport.test.tsx "src/app/[lang]/daily-report/page.test.tsx"
```

预期：测试通过，输出包含 `6 passed`。

- [ ] **步骤 2：运行全量测试**

运行：

```bash
npm run test:run
```

预期：全量 Vitest 测试通过。

- [ ] **步骤 3：运行 lint**

运行：

```bash
npm run lint
```

预期：无 ESLint error。

- [ ] **步骤 4：运行生产构建**

运行：

```bash
npm run build
```

预期：Next.js 生产构建成功。

- [ ] **步骤 5：检查工作区只包含本计划相关变更**

运行：

```bash
git status --short
```

预期：只显示本计划涉及的文件，且没有无关文件被修改。

## 实施注意事项

- 不要使用 `dangerouslySetInnerHTML` 渲染 AI 返回内容。
- 不要引入 `rehype-raw`，因为本需求不需要渲染原始 HTML。
- `DailyReportResult.markdown` 字段保持不变，避免修改 API 响应结构。
- `DailyReportPage` 已经是 Client Component；`MarkdownReport` 被它导入后属于客户端组件树，不需要额外添加 `"use client"`。
