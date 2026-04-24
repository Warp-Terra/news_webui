# Global News Intelligence Dashboard - 第一阶段执行计划

## 项目概述

**项目名称**: Global News Intelligence Dashboard  
**目标**: 验证 Next.js + Tailwind + shadcn/ui 技术栈稳定性，搭建静态假数据版新闻摘要面板。  
**阶段**: 第一阶段（静态假数据版）

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

### 第三阶段：真实数据源版
- 数据源管理页
- RSS 源拉取
- 自动去重
- 新闻状态（未读、已读、收藏、忽略）

### 第四阶段：AI 摘要版
- 单条新闻 AI 摘要
- 多条新闻聚合摘要
- AI 重要性评分（1-5 分）
- 自动生成 Markdown 日报

---

## 风险与注意事项

1. **shadcn/ui 版本兼容性**: 确保 shadcn CLI 版本与 Next.js 版本兼容
2. **Zustand 与 React Server Components**: 状态管理相关组件标记为 `"use client"`
3. **深色模式闪烁**: 使用 `next-themes` 或手动实现避免 SSR 时的主题闪烁
4. **Mock 数据覆盖度**: 确保数据覆盖所有地区和分类组合，避免某些筛选条件下无结果
