# Global News Intelligence Dashboard - 分阶段执行计划

## 项目概述

**项目名称**: Global News Intelligence Dashboard  
**目标**: 构建支持多地区新闻监控、真实 RSS 数据源、本地持久化与 AI 摘要分析的情报 Dashboard。  
**当前状态**: 第四阶段（AI 摘要版）已完成

---

## 技术决策

| 技术 | 选择 | 说明 |
|:---|:---|:---|
| Next.js Router | App Router | 后续扩展 API Route 更方便，shadcn/ui 默认适配 |
| 深色模式 | 支持（含系统偏好自动切换） | Dashboard 类工具夜间使用场景多 |
| 状态管理 | Zustand | 筛选、搜索、选中新闻状态跨组件联动，Context 写多会啰嗦 |

### 推荐 shadcn 组件安装列表

```bash
npx shadcn add button card badge input select scroll-area separator
npx shadcn add dialog dropdown-menu toggle
```

### 额外依赖

```bash
npm install zustand lucide-react
```

---

## 项目结构

```
app/
├── page.tsx              # Dashboard 主页面
├── layout.tsx            # 根布局（深色模式 Provider）
├── globals.css           # Tailwind + 主题变量
├── types/
│   └── news.ts           # NewsItem 接口定义
├── data/
│   └── mockNews.ts       # 假数据（20-30条）
├── components/
│   ├── layout/
│   │   ├── Header.tsx    # 顶部栏 + 搜索 + 主题切换
│   │   └── Sidebar.tsx   # 左侧筛选栏
│   ├── news/
│   │   ├── NewsList.tsx  # 新闻列表容器
│   │   ├── NewsCard.tsx  # 单条新闻卡片
│   │   └── NewsDetail.tsx # 右侧详情面板
│   └── ui/               # shadcn 组件
├── store/
│   └── newsStore.ts      # Zustand 状态管理
└── lib/
    └── utils.ts          # 工具函数
```

---

## 数据结构定义

```ts
interface NewsItem {
  id: string;               // 唯一标识
  title: string;            // 新闻标题
  source: string;           // 新闻来源（Reuters、BBC 等）
  sourceUrl?: string;       // 来源链接（第三阶段用）
  region: 'US' | 'CN' | 'EU' | 'JP' | 'Global' | string;  // 地区
  category: 'Economy' | 'Technology' | 'Politics' | 'Military' | 'Energy';  // 分类
  tags: string[];           // 标签：AI、金融、战争、能源、供应链...
  publishedAt: string;      // 发布时间（ISO 8601）
  summary: string;          // 短摘要
  keyPoints: string[];      // 关键点列表
  impact: string;           // 影响判断
  importance: 'low' | 'medium' | 'high' | 'critical';  // 重要程度
}
```

**设计原则**: 第一阶段到第四阶段数据结构是渐进增强的，后续阶段只需扩展字段，无需推倒重来。

---

## 页面布局

```
┌─────────────────────────────────────────────────────────┐
│  Global News Intelligence Dashboard    [搜索] [主题切换] │
├──────────┬─────────────────────────────┬────────────────┤
│          │                             │                │
│ 筛选栏   │    新闻列表                 │   详情面板      │
│          │                             │                │
│ □ 地区   │  ┌─────────────────────┐   │   [重要度徽章]  │
│   ○ US   │  │ 标题...             │   │                │
│   ○ CN   │  │ 来源 · 时间 · 标签  │◄──┤   完整标题      │
│   ○ EU   │  └─────────────────────┘   │                │
│          │  ┌─────────────────────┐   │   摘要          │
│ □ 分类   │  │ 标题...             │   │                │
│   ○ 经济 │  │ 来源 · 时间 · 标签  │   │   关键点：      │
│   ○ 科技 │  └─────────────────────┘   │   • point 1    │
│          │                            │   • point 2    │
│ □ 重要度 │                            │                │
│   ○ High │                            │   影响判断      │
│          │                            │                │
│          │                            │   来源信息      │
│          │                            │                │
└──────────┴─────────────────────────────┴────────────────┘
```

---

## 执行步骤

### 1. 初始化 Next.js 项目 + TypeScript + App Router
- 使用 `create-next-app` 创建项目
- 选择 TypeScript、Tailwind CSS、App Router

### 2. 配置 Tailwind CSS 深色模式
- 在 `tailwind.config.ts` 中配置 `darkMode: "class"`
- 在 `globals.css` 中定义 CSS 变量和主题色

### 3. 初始化 shadcn/ui 并安装基础组件
- 运行 `npx shadcn@latest init`
- 安装所需组件：`button`, `card`, `badge`, `input`, `select`, `scroll-area`, `separator`, `dialog`, `dropdown-menu`, `toggle`

### 4. 定义 NewsItem TypeScript 类型和数据结构
- 在 `app/types/news.ts` 中定义 `NewsItem` 接口
- 定义辅助类型：`Region`, `Category`, `ImportanceLevel`

### 5. 创建 mock 新闻数据集 (20-30条)
- 在 `app/data/mockNews.ts` 中编写静态数据
- 覆盖多个地区、分类、重要程度的组合
- 数据应包含：标题、来源、地区、分类、标签、发布时间、摘要、关键点、影响判断、重要程度

### 6. 搭建页面基础布局
- 创建 `Header.tsx`：标题栏 + 搜索框 + 日期选择 + 主题切换按钮
- 创建 `Sidebar.tsx`：左侧筛选栏（地区、分类、重要程度）
- 主页面三栏布局：Sidebar + NewsList + NewsDetail

### 7. 实现新闻列表组件 (NewsList + NewsCard)
- `NewsList`: 列表容器，接收筛选后的新闻数据
- `NewsCard`: 单条新闻卡片，显示标题、来源、地区、分类、发布时间、重要程度标签
- 点击卡片触发选中状态

### 8. 实现新闻详情面板组件 (NewsDetail)
- 显示完整标题、重要程度徽章
- 显示完整摘要
- 显示关键点列表
- 显示影响判断
- 显示来源信息
- 未选中新闻时显示空状态提示

### 9. 实现筛选栏组件 (FilterPanel)
- 地区筛选：多选或单选（US、CN、EU、JP、Global）
- 分类筛选：多选或单选（Economy、Technology、Politics、Military、Energy）
- 重要程度筛选：多选或单选（low、medium、high、critical）
- 支持清除筛选

### 10. 实现搜索功能
- 在 Header 中添加搜索输入框
- 支持按标题、摘要、来源关键词搜索
- 搜索与筛选条件可以叠加使用

### 11. 实现筛选联动 (地区/分类/重要程度)
- 筛选条件变化时，新闻列表实时更新
- 选中新闻若不在当前筛选结果中，自动取消选中或切换到第一条
- 统计当前筛选结果数量

### 12. 添加空状态处理
- 搜索/筛选无结果时显示友好提示
- 未选中新闻时详情面板显示引导信息

### 13. 添加响应式布局 (移动端适配)
- 桌面端：三栏布局（Sidebar + NewsList + NewsDetail）
- 平板端：Sidebar 收起为图标或隐藏，NewsList 和 NewsDetail 切换显示
- 移动端：Sidebar 可滑出/收起，NewsList 全屏，点击后进入 NewsDetail 全屏

### 14. 配置 Zustand 状态管理
- 创建 `newsStore.ts`
- 状态包含：新闻列表、选中新闻ID、筛选条件、搜索关键词
- 派生状态：筛选后的新闻列表、统计信息
- 操作方法：设置选中、更新筛选、更新搜索、清除筛选

### 15. 验证验收标准
- 逐项检查验收标准是否满足

---

## 验收标准

| # | 标准 | 优先级 |
|:---|:---|:---|
| 1 | `npm run dev` 正常运行 | 必须 |
| 2 | 首页有完整 UI 布局 | 必须 |
| 3 | 点击新闻切换右侧详情 | 必须 |
| 4 | 搜索功能正常工作 | 必须 |
| 5 | 按地区/分类/重要程度筛选正常 | 必须 |
| 6 | 深色/浅色模式切换正常 | 必须 |
| 7 | 响应式布局（移动端侧边栏可收起） | 必须 |
| 8 | 筛选/搜索无结果时有空状态提示 | 必须 |
| 9 | 界面看起来像正式信息系统 | 必须 |

---

## 后续阶段规划（仅记录，暂不执行）

### 第二阶段：本地数据版
- 支持导入 JSON 文件
- 支持手动新增新闻（shadcn Dialog 表单）
- 支持编辑标签
- 支持导出筛选结果为 JSON/CSV

### ✅ 第三阶段：真实数据源版（已完成）
- 本地 SQLite 持久化：使用 `data/news.db` 存储新闻与 RSS 数据源，并通过 `.gitignore` 排除本地数据目录。
- 数据源管理页：支持新增、编辑、启用/停用、删除 RSS 数据源，并显示地区、分类与最后拉取时间。
- RSS 源拉取：支持从所有 active 数据源拉取 RSS 条目，将真实新闻写入本地数据库。
- 手动刷新入口：首页提供 RSS 刷新按钮，调用后端抓取接口并重新加载新闻列表。
- 定时任务：在 Node.js runtime 中注册每 30 分钟执行一次的 RSS 抓取任务，并在启动后立即执行一次。
- 自动去重：基于标题与来源链接生成去重键，重复新闻不会重复插入。
- 新闻状态：支持未读、已读、收藏、忽略状态，并提供单条新闻状态更新与删除能力。
- API 能力：完成新闻列表/详情、状态更新、删除、数据源 CRUD、手动抓取等 Route Handler。
- 测试覆盖：补充数据库、RSS、API、页面交互与定时任务测试，最终全量 112 个测试通过。

### ✅ 第四阶段：AI 摘要版（已完成）
- AI Provider 抽象：支持 OpenAI 兼容接口（OpenAI/DeepSeek）与本地 Ollama，并通过环境变量配置 provider、model、base URL、temperature 与 max tokens。
- 单条新闻 AI 摘要：在新闻详情面板提供“生成 AI 摘要”入口，基于标题、摘要、关键点与影响判断生成中文结构化结果。
- AI 结果持久化：将 `summary`、`keyPoints`、`impact`、`importance`、`tags` 写回 SQLite，已存在 AI 摘要时直接复用，避免重复调用。
- 批量摘要接口：新增批量处理未生成 AI 摘要新闻的能力，支持 limit 限制，并在单条失败时继续处理后续新闻。
- Markdown AI 日报：新增日报页面与接口，可按日期生成 Markdown 日报，返回新闻数量与 token 统计。
- AI 用量治理：新增 `ai_usage` 表、用量查询接口与 AI 用量页面，记录调用日期、模型、provider、token 输入/输出、成本字段、新闻 ID 与操作类型。
- 前端导航整合：侧边栏增加“日报”和“AI 用量”入口，Dashboard 详情区展示 AI 摘要、关键点与影响判断。
- 测试覆盖：补充 AI provider、parser、prompts、summarize、API route、页面交互与数据库用量记录测试。
- 最终验证：`npm run test:run` 通过 30 个测试文件、185 个测试；`npm run lint` 无 error；`npm run build` 通过生产构建。

### 第五阶段：部署与运营增强（规划）
- 生产环境配置：补充 `.env.example`、部署说明、数据库路径/备份策略与启动检查。
- 调度任务增强：将 RSS 拉取、批量 AI 摘要与日报生成纳入可配置队列或后台任务，支持频率、批量大小与失败重试配置。
- AI 成本与限流：按模型维护价格表，补齐真实成本估算、调用速率限制、预算阈值告警与熔断策略。
- 多用户与权限：增加登录、角色权限、数据源管理权限与操作审计日志。
- 情报输出能力：支持日报 Markdown 复制/下载、筛选结果 CSV/JSON 导出，以及按地区/主题订阅报告。
- 可观测性：增加结构化日志、错误追踪、关键 API 指标与定时任务运行状态页面。
- 数据质量增强：扩展全文抓取、RSS 清洗规则、来源可信度评分与重复新闻聚类。

---

## 风险与注意事项

1. **shadcn/ui 版本兼容性**: 确保 shadcn CLI 版本与 Next.js 版本兼容
2. **Zustand 与 React Server Components**: 状态管理相关组件标记为 `"use client"`
3. **深色模式闪烁**: 使用 `next-themes` 或手动实现避免 SSR 时的主题闪烁
4. **Mock 数据覆盖度**: 确保数据覆盖所有地区和分类组合，避免某些筛选条件下无结果
