# 多品牌 GEO 管理平台开发落地蓝图

## 1. 蓝图目标

本文件用于指导项目从规格阶段进入工程初始化阶段，明确推荐技术栈、代码目录、模块边界、开发里程碑、验收口径和风险控制策略。

第一版开发目标：

- 先完成多品牌、知识库、优化单元、用户意图、监测、指标和任务闭环
- 内容生成、发布中心、顾问服务按弱实现接入，保留后续增强空间
- 所有核心业务数据从第一天支持 `brand_id` 隔离
- 所有页面围绕“品牌初始化 -> GEO 监测 -> 内容策略 -> 任务复测 -> 报告”闭环组织

## 2. 推荐技术栈

### 2.1 前端

建议：

- React + TypeScript
- Vite
- React Router
- TanStack Query
- Zustand 或 React Context 管理品牌上下文
- Ant Design 或 shadcn/ui 作为后台组件基础
- ECharts 或 Recharts 处理趋势图和指标图
- React Flow 处理 GEO 画布

选择理由：

- 后台页面多、表格多、状态多，React 生态成熟
- Vite 初始化快，适合快速搭建 MVP
- TanStack Query 适合 API 驱动型后台
- React Flow 适合优化单元、用户意图和数据表现的节点关系图

### 2.2 后端

建议：

- Node.js + TypeScript
- NestJS 或 Hono/Fastify
- Prisma 或 Drizzle ORM
- PostgreSQL
- Redis 用于任务队列和缓存
- BullMQ 用于监测任务、内容生成任务和报告生成任务

选择理由：

- TypeScript 前后端共享类型成本低
- PostgreSQL 适合多关系业务和 JSON 字段混合建模
- 队列机制适合 AI 平台调用、报告生成和内容生成这类异步任务

### 2.3 第一版建议取舍

第一版更适合采用：

- 前端：React + Vite + TypeScript + Ant Design + ECharts + React Flow
- 后端：NestJS + Prisma + PostgreSQL + BullMQ

原因：

- NestJS 对模块化边界友好
- Prisma 对数据库迁移和类型生成友好
- Ant Design 能快速覆盖表格、表单、抽屉、弹窗、看板基础组件

## 3. 推荐代码结构

```text
geo-platform/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── routes/
│   │   │   ├── layouts/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   ├── stores/
│   │   │   └── styles/
│   │   └── vite.config.ts
│   └── api/
│       ├── src/
│       │   ├── main.ts
│       │   ├── modules/
│       │   ├── common/
│       │   ├── jobs/
│       │   └── config/
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
├── packages/
│   ├── shared-types/
│   ├── validation/
│   └── geo-core/
├── docs/
└── package.json
```

## 4. 前端模块划分

```text
features/
├── brand-workspace/
├── brand-knowledge/
├── optimization-units/
├── user-intents/
├── monitoring/
├── dashboards/
├── competitors/
├── citations/
├── evaluations/
├── content-assets/
├── content-generation/
├── publishing/
├── tasks/
├── reports/
└── advisor/
```

每个 feature 内建议结构：

```text
feature-name/
├── api.ts
├── components/
├── pages/
├── hooks.ts
├── types.ts
└── utils.ts
```

## 5. 后端模块划分

```text
modules/
├── auth/
├── brands/
├── permissions/
├── knowledge/
├── optimization-units/
├── intents/
├── prompts/
├── platforms/
├── monitoring/
├── analysis/
├── metrics/
├── competitors/
├── citations/
├── evaluations/
├── content/
├── generation/
├── publishing/
├── tasks/
├── reports/
└── advisor/
```

后端模块标准结构：

```text
module-name/
├── module.ts
├── controller.ts
├── service.ts
├── repository.ts
├── dto.ts
├── entities.ts
└── policies.ts
```

## 6. 核心模块边界

### 6.1 Brand Workspace

职责：

- 品牌 CRUD
- 品牌切换上下文
- 多品牌总览基础数据
- 品牌权限入口

边界：

- 不直接计算 GEO 指数
- 不直接管理 Prompt 和内容资产

### 6.2 Knowledge

职责：

- 品牌档案
- 标准表达
- 禁用表达
- FAQ
- 知识库素材导入
- 完整度评分

边界：

- 不直接生成内容
- 只提供内容生成所需素材和规则

### 6.3 Optimization Unit and Intent

职责：

- 优化单元
- 用户意图
- Prompt 模板和品牌 Prompt
- 意图与平台表现汇总

边界：

- 不直接调用 AI 平台
- 只生成可监测对象

### 6.4 Monitoring and Analysis

职责：

- 监测运行
- AI 回答记录
- 回答解析
- 平台评价
- 人工复核

边界：

- 不直接生成内容策略
- 只输出结构化分析结果

### 6.5 Metrics

职责：

- GEO 指数
- 平台指数
- 优化单元指数
- 用户意图指数
- 多品牌排名

边界：

- 不保存原始回答
- 只消费分析结果和快照数据

### 6.6 Content and Tasks

职责：

- 内容资产
- 内容策略
- 内容生成任务
- 发布记录
- 复测任务

边界：

- 内容生成第一版可以基于模板实现
- 发布中心第一版可以先记录发布结果

## 7. 开发里程碑

### Milestone 0: 项目初始化

目标：搭建可运行工程骨架。

交付：

- 前端应用启动
- 后端 API 启动
- 数据库连接
- 统一响应结构
- 基础布局和路由
- Vite allowedHosts 配置 `.monkeycode-ai.online`

验收：

- 前端可打开登录页和空后台
- 后端健康检查接口可访问
- 数据库迁移可执行

### Milestone 1: 多品牌与知识库

目标：完成品牌初始化能力。

交付：

- 用户、品牌、权限
- 品牌切换器
- 品牌知识库
- 完整度评分
- 知识库导入记录

验收：

- 用户只能看到授权品牌
- 新品牌能完成基础档案维护
- 完整度评分能识别缺失项

### Milestone 2: 优化单元、意图和 Prompt

目标：建立 GEO 监测对象。

交付：

- 优化单元管理
- 用户意图管理
- Prompt 模板
- 品牌 Prompt 批量生成

验收：

- 一个品牌可创建多个优化单元
- 一个优化单元可关联多个用户意图
- 用户意图可生成多个平台 Prompt

### Milestone 3: 监测与解析

目标：完成首轮 GEO 监测闭环。

交付：

- AI 平台配置
- ManualInputAdapter
- MockAdapter
- 监测任务
- 原始回答录入
- 解析结果和人工复核

验收：

- 用户可手动录入 AI 回答
- 系统能保存品牌提及、排名、引用和平台评价
- 待复核记录可以人工修正

### Milestone 4: 指标与看板

目标：让管理者能看到结果。

交付：

- GEO 指数计算
- 多品牌总览
- 单品牌驾驶舱
- 用户意图表格
- GEO 画布基础版

验收：

- GEO 子分和总分处于 0-100
- 多品牌排行可按总分和变化排序
- 单品牌可看到优化单元、意图和平台表现

### Milestone 5: 分析和内容策略

目标：把监测问题转为优化建议。

交付：

- 竞品分析
- 引用分析
- 评价分析
- 内容资产
- 内容策略生成记录

验收：

- 能识别竞品压制场景
- 能查看引用来源分类
- 能从错误表达创建内容修正任务

### Milestone 6: 任务、报告和弱发布

目标：形成运营闭环。

交付：

- 任务复测
- Markdown 报告
- 发布账号记录
- 发布记录
- 顾问服务记录

验收：

- 监测问题能创建任务
- 任务完成后能关联复测
- 单品牌报告能汇总指标、问题、策略和任务

### Milestone 7: 内容生成工作台

目标：提供可演示的内容生产链路。

交付：

- 内容生成任务
- 生成步骤状态
- 模板草稿生成
- 内容编辑器
- Markdown 导出

验收：

- 内容策略能创建生成任务
- 用户能编辑并保存版本
- 内容版本能导出 Markdown

## 8. 首版验收标准

### 8.1 功能验收

- 创建至少 2 个品牌并完成切换
- 每个品牌至少创建 3 个优化单元
- 每个优化单元至少创建 3 个用户意图
- 每个用户意图至少生成 2 个平台 Prompt
- 至少完成 10 条监测记录
- 看板能展示 GEO 指数、推荐度、平均排名和引用率
- 至少能生成 1 份单品牌 Markdown 报告

### 8.2 数据验收

- 所有品牌业务数据包含 `brand_id`
- 未授权用户无法访问其他品牌数据
- 监测记录能追溯到 Prompt、用户意图、优化单元和品牌
- 任务能追溯到原始监测和复测记录

### 8.3 界面验收

- 左侧导航和品牌切换器稳定可用
- 表格支持筛选、查看详情和行内操作
- 图表支持 7 天、30 天、90 天切换
- 详情抽屉能展示原始回答、解析结果和操作入口

## 9. 风险控制

### 9.1 AI 平台接口风险

风险：不同 AI 平台接口开放程度不同。

策略：第一版使用 `ManualInputAdapter` 和 `MockAdapter`，真实 API 通过 Adapter 插件接入。

### 9.2 内容自动发布风险

风险：主流内容平台授权和发布规则复杂。

策略：第一版只做账号和发布记录管理，自动发布作为后续增强。

### 9.3 自动解析准确性风险

风险：AI 回答解析存在误判。

策略：第一版所有解析结果支持人工复核和修正。

### 9.4 范围膨胀风险

风险：GEO 画布、内容生成、发布中心和顾问服务都可能膨胀。

策略：P0 先完成监测和指标闭环，P1 完成分析和报告，P2 做生产与服务增强。

## 10. 开发启动前检查清单

- 已确认技术栈
- 已确认数据库类型
- 已确认 UI 组件库
- 已确认第一版 AI 平台接入方式
- 已确认是否需要登录系统或先用本地样例用户
- 已确认是否先做单仓库 monorepo
- 已确认是否执行可选测试任务

## 11. 与其他规格文件的关系

- `requirements.md`: 说明系统需要满足什么业务能力。
- `product-design-plan.md`: 说明产品定位、页面规划和体验方向。
- `ui-wireframes.md`: 说明页面线框、路由和组件字段。
- `design.md`: 说明服务、数据模型和正确性属性。
- `api-data-spec.md`: 说明 API、实体、权限和数据流。
- `database-schema.md`: 说明表结构、索引、约束和迁移顺序。
- `tasklist.md`: 说明开发执行任务。
