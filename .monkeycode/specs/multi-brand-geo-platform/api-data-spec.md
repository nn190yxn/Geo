# 多品牌 GEO 管理平台 API 与数据规格

## 1. 文档目标

本文件定义第一版系统的核心实体、状态枚举、API 路径、接口返回结构、权限规则和关键业务数据流。该规格用于指导前端页面、后端服务和数据库迁移的统一实现。

## 2. 通用约定

### 2.1 API 前缀

```text
/api/v1
```

### 2.2 通用返回结构

```json
{
  "success": true,
  "data": {},
  "message": "",
  "requestId": "req_123456"
}
```

### 2.3 分页返回结构

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 0
    }
  },
  "message": "",
  "requestId": "req_123456"
}
```

### 2.4 错误返回结构

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "字段校验失败",
    "fields": {
      "name": "品牌名称不能为空"
    }
  },
  "requestId": "req_123456"
}
```

## 3. 状态枚举

### 3.1 品牌状态

```text
active      启用
inactive    停用
archived    归档
```

### 3.2 用户品牌角色

```text
owner       所有者
admin       品牌管理员
operator    运营人员
analyst     数据分析人员
viewer      只读用户
```

### 3.3 AI 平台调用方式

```text
api         官方 API
manual      人工录入
semi_auto   半自动采集
mock        示例数据
```

### 3.4 监测任务状态

```text
pending          待执行
running          执行中
completed        已完成
failed           失败
review_required  待人工复核
```

### 3.5 优化任务状态

```text
todo       待处理
doing      执行中
review     待审核
retest     待复测
done       已关闭
reopened   已重开
```

### 3.6 内容生成状态

```text
pending     待生成
running     生成中
completed   已完成
failed      失败
```

### 3.7 发布状态

```text
draft      草稿
pending    待发布
published  已发布
failed     发布失败
```

## 4. 核心实体字段

### 4.1 Brand

```typescript
interface Brand {
  id: string;
  name: string;
  aliases: string[];
  industry: string;
  website?: string;
  targetCities: string[];
  businessScope: string;
  targetAudience: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 BrandProfile

```typescript
interface BrandProfile {
  brandId: string;
  intro: string;
  valueProps: string[];
  offerings: string[];
  proofPoints: string[];
  targetCustomers: string[];
  recommendedExpressions: string[];
  blockedExpressions: string[];
  contentRules: string[];
  faqs: Array<{ question: string; answer: string }>;
  completenessScore: number;
  missingFields: string[];
}
```

### 4.3 OptimizationUnit

```typescript
interface OptimizationUnit {
  id: string;
  brandId: string;
  name: string;
  type: 'brand' | 'category' | 'scenario' | 'location' | 'competitor';
  targetKeywords: string[];
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 4.4 UserIntent

```typescript
interface UserIntent {
  id: string;
  brandId: string;
  optimizationUnitId: string;
  category: 'brand_awareness' | 'category_recommendation' | 'pain_solution' | 'local_decision' | 'competitor_compare' | 'price_decision';
  text: string;
  monitoringFrequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  enabled: boolean;
}
```

### 4.5 BrandPrompt

```typescript
interface BrandPrompt {
  id: string;
  brandId: string;
  optimizationUnitId: string;
  intentId: string;
  text: string;
  targetKeywords: string[];
  platformCodes: string[];
  enabled: boolean;
}
```

### 4.6 MonitoringRun

```typescript
interface MonitoringRun {
  id: string;
  brandId: string;
  optimizationUnitId: string;
  intentId: string;
  promptId: string;
  platformCode: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'review_required';
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}
```

### 4.7 AnalysisResult

```typescript
interface AnalysisResult {
  responseId: string;
  brandMentioned: boolean;
  brandRank?: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'unknown';
  accuracyScore: number;
  citationScore: number;
  platformEvaluation: string;
  recommendationReason?: string;
  rankingReason?: string;
  expressionCompleteness: number;
  expressionDeviation?: string;
  reviewRequired: boolean;
}
```

### 4.8 ContentStrategy

```typescript
interface ContentStrategy {
  id: string;
  brandId: string;
  optimizationUnitId: string;
  intentId: string;
  type: 'gap' | 'correction' | 'enhancement' | 'authority_citation' | 'competitor_response';
  priority: 'high' | 'medium' | 'low';
  suggestedTitle: string;
  targetPlatform: string;
  targetKeywords: string[];
  relatedPromptIds: string[];
  status: 'draft' | 'task_created' | 'completed';
}
```

## 5. API 路径

### 5.1 品牌与权限

```text
GET    /api/v1/brands
POST   /api/v1/brands
GET    /api/v1/brands/:brandId
PATCH  /api/v1/brands/:brandId
GET    /api/v1/brands/:brandId/permissions
POST   /api/v1/brands/:brandId/permissions
DELETE /api/v1/brands/:brandId/permissions/:userId
```

### 5.2 品牌知识库

```text
GET    /api/v1/brands/:brandId/profile
PATCH  /api/v1/brands/:brandId/profile
GET    /api/v1/brands/:brandId/knowledge-sources
POST   /api/v1/brands/:brandId/knowledge-sources
GET    /api/v1/brands/:brandId/knowledge-sources/:sourceId
PATCH  /api/v1/brands/:brandId/knowledge-sources/:sourceId
```

### 5.3 优化单元

```text
GET    /api/v1/brands/:brandId/optimization-units
POST   /api/v1/brands/:brandId/optimization-units
GET    /api/v1/brands/:brandId/optimization-units/:unitId
PATCH  /api/v1/brands/:brandId/optimization-units/:unitId
```

### 5.4 用户意图与 Prompt

```text
GET    /api/v1/brands/:brandId/intents
POST   /api/v1/brands/:brandId/intents
PATCH  /api/v1/brands/:brandId/intents/:intentId
GET    /api/v1/brands/:brandId/prompts
POST   /api/v1/brands/:brandId/prompts:batch-generate
PATCH  /api/v1/brands/:brandId/prompts/:promptId
```

### 5.5 AI 平台配置

```text
GET    /api/v1/platforms
POST   /api/v1/platforms
PATCH  /api/v1/platforms/:platformId
POST   /api/v1/platforms/:platformId/validate
```

### 5.6 GEO 监测

```text
GET    /api/v1/brands/:brandId/monitoring-runs
POST   /api/v1/brands/:brandId/monitoring-runs
GET    /api/v1/brands/:brandId/monitoring-runs/:runId
POST   /api/v1/brands/:brandId/monitoring-runs/:runId/manual-response
PATCH  /api/v1/brands/:brandId/analysis-results/:responseId
```

### 5.7 看板与指标

```text
GET /api/v1/brands/overview
GET /api/v1/brands/:brandId/dashboard
GET /api/v1/brands/:brandId/metrics
GET /api/v1/brands/:brandId/canvas
```

### 5.8 竞品、引用与评价

```text
GET    /api/v1/brands/:brandId/competitors
POST   /api/v1/brands/:brandId/competitors
PATCH  /api/v1/brands/:brandId/competitors/:competitorId
GET    /api/v1/brands/:brandId/citations
GET    /api/v1/brands/:brandId/evaluations
POST   /api/v1/brands/:brandId/evaluations/:issueId/create-task
```

### 5.9 内容资产、策略和生成

```text
GET    /api/v1/brands/:brandId/content-assets
POST   /api/v1/brands/:brandId/content-assets
GET    /api/v1/brands/:brandId/content-strategies
POST   /api/v1/brands/:brandId/content-strategies:generate
POST   /api/v1/brands/:brandId/content-generation-tasks
GET    /api/v1/brands/:brandId/content-generation-tasks/:taskId
PATCH  /api/v1/brands/:brandId/content-versions/:versionId
POST   /api/v1/brands/:brandId/content-versions/:versionId/export
```

### 5.10 发布中心

```text
GET    /api/v1/brands/:brandId/publishing-accounts
POST   /api/v1/brands/:brandId/publishing-accounts
PATCH  /api/v1/brands/:brandId/publishing-accounts/:accountId
GET    /api/v1/brands/:brandId/publishing-records
POST   /api/v1/brands/:brandId/publishing-records
```

### 5.11 任务、报告与顾问服务

```text
GET    /api/v1/brands/:brandId/tasks
POST   /api/v1/brands/:brandId/tasks
PATCH  /api/v1/brands/:brandId/tasks/:taskId
POST   /api/v1/brands/:brandId/tasks/:taskId/retest
GET    /api/v1/brands/:brandId/reports
POST   /api/v1/brands/:brandId/reports
GET    /api/v1/brands/:brandId/advisor-records
POST   /api/v1/brands/:brandId/advisor-records
```

## 6. 关键接口示例

### 6.1 创建品牌

```http
POST /api/v1/brands
```

```json
{
  "name": "追光小牛",
  "aliases": ["追光小牛儿童体适能"],
  "industry": "儿童体适能",
  "website": "https://example.com",
  "targetCities": ["深圳"],
  "businessScope": "儿童体适能训练与少儿运动成长服务",
  "targetAudience": "3-12 岁儿童家庭"
}
```

### 6.2 批量生成品牌 Prompt

```http
POST /api/v1/brands/:brandId/prompts:batch-generate
```

```json
{
  "optimizationUnitIds": ["unit_001"],
  "intentIds": ["intent_001"],
  "platformCodes": ["doubao", "deepseek", "kimi"],
  "templateIds": ["tpl_001"]
}
```

### 6.3 创建监测任务

```http
POST /api/v1/brands/:brandId/monitoring-runs
```

```json
{
  "promptIds": ["prompt_001", "prompt_002"],
  "platformCodes": ["doubao", "deepseek"],
  "mode": "manual"
}
```

### 6.4 人工录入 AI 回答

```http
POST /api/v1/brands/:brandId/monitoring-runs/:runId/manual-response
```

```json
{
  "rawText": "推荐以下儿童体适能品牌...",
  "citations": [
    {
      "title": "品牌官网介绍",
      "url": "https://example.com/about"
    }
  ],
  "respondedAt": "2026-07-03T10:30:00Z"
}
```

### 6.5 生成内容策略

```http
POST /api/v1/brands/:brandId/content-strategies:generate
```

```json
{
  "source": "monitoring_issue",
  "optimizationUnitId": "unit_001",
  "intentId": "intent_001",
  "platformCode": "deepseek",
  "issueType": "citation_gap"
}
```

## 7. 权限规则

### 7.1 角色能力

| 角色 | 品牌配置 | 监测 | 内容 | 发布 | 报告 | 权限管理 |
|---|---|---|---|---|---|---|
| owner | 可管理 | 可管理 | 可管理 | 可管理 | 可管理 | 可管理 |
| admin | 可管理 | 可管理 | 可管理 | 可管理 | 可管理 | 可查看 |
| operator | 可查看 | 可管理 | 可管理 | 可管理 | 可查看 | 无权限 |
| analyst | 可查看 | 可查看 | 可查看 | 可查看 | 可管理 | 无权限 |
| viewer | 可查看 | 可查看 | 可查看 | 可查看 | 可查看 | 无权限 |

### 7.2 品牌数据隔离

- 所有品牌工作区接口必须校验 `brandId` 访问权限。
- 所有业务查询默认追加用户授权品牌范围。
- 生成报告、导出内容和创建任务时必须校验关联对象属于同一品牌。

## 8. 关键数据流

### 8.1 品牌初始化数据流

```text
创建品牌 -> 填写品牌知识库 -> 计算完整度 -> 创建优化单元 -> 创建用户意图 -> 批量生成 Prompt -> 启动监测
```

### 8.2 GEO 监测数据流

```text
选择 Prompt -> 创建 MonitoringRun -> 调用 Adapter 或人工录入 -> 保存 AIResponse -> 生成 AnalysisResult -> 更新 GEOMetricSnapshot
```

### 8.3 内容优化数据流

```text
发现问题 -> 生成 ContentStrategy -> 创建 ContentGenerationTask -> 保存 ContentVersion -> 创建 PublishingRecord -> 创建复测任务
```

### 8.4 报告数据流

```text
选择品牌和周期 -> 聚合指标、竞品、引用、评价、任务 -> 引用顾问记录 -> 生成 Markdown 报告 -> 导出
```

## 9. 首版实现边界

第一版必须实现：

- 所有 P0 页面所需 API
- 品牌工作区权限校验
- 手动监测和 MockAdapter
- 品牌知识库完整度评分
- GEO 指数计算
- 内容策略生成记录
- Markdown 报告导出

第一版保留接口但可弱实现：

- 内容生成服务可先基于模板生成草稿
- 发布中心可先记录发布账号和发布结果
- 顾问服务可先记录诊断、服务和规则更新
- 外部 AI 平台 API 可使用 Adapter 插件边界预留
