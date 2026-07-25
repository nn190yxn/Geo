# 接口文档

## 通用响应结构

所有 API 统一使用 `ApiResponse<T>` 响应结构，定义位于 `packages/shared-types/src/index.ts`。

成功响应：

```json
{
  "success": true,
  "data": {}
}
```

失败响应：

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "REQUEST_ERROR",
    "message": "Bad request",
    "requestId": "request_demo"
  }
}
```

## 品牌上下文

前端统一通过 `x-brand-id` 请求头向后端传递当前品牌上下文。后端中间件读取该请求头并写入 `request.context.brandId`。

前端第一版同时支持品牌化路由别名。访问 `/brands/:brandId/dashboard`、`/brands/:brandId/canvas`、`/brands/:brandId/monitoring`、`/brands/:brandId/reports` 等路径时，前端会先把 `brandId` 写入当前品牌上下文，再跳转到第一版对应页面；主要页面通过 lazy route modules 加载，路由契约保持不变。

`/monitoring` 当前产品口径为“AI 回复监测”。该路由继续复用既有监测运行、监测计划和手动答案 API，页面文案强调真实 AI 原始回复获取、手动录入可信过渡路径和回复解读。

`/growth-optimization` 当前会读取 `GET /api/v1/brands/:brandId/sprints/current`、`GET /api/v1/brands/:brandId/sprints/:sprintId/alignment` 和 `GET /api/v1/brands/:brandId/sprints/:sprintId/content-gaps/tasks`，用于展示真实 AI 回复、品牌标准答案和内容资产三类对象的差异。该视图为只读诊断层，不创建新的业务对象。

`/tasks` 当前会读取 `GET /api/v1/brands/:brandId/sprints/current` 和 `GET /api/v1/brands/:brandId/sprints/:sprintId/retest-trend`，用于展示 Sprint 复测趋势。趋势看板展示计划复测任务、已完成复测、改善任务、完成率，以及提及率、推荐率、首位推荐率、引用命中率、表达准确率、风险表达数和问题覆盖率的基线、当前值和变化。

当前阶段使用本地示例用户，调试请求可通过 `x-user-id` 指定用户。未传时后端默认使用 `user_demo`。

请求头：

```http
x-brand-id: brand_demo
```

当前请求上下文结构：

```ts
type RequestContext = {
  brandId: BrandId | null;
  userId: string;
  requestId: string;
};
```

当请求携带未授权品牌 ID 时，`BrandAccessMiddleware` 会记录拒绝日志，并返回统一错误响应。

## 当前 API

### 健康检查

```http
GET /api/v1/health
```

响应：

```json
{
  "success": true,
  "data": {
    "status": "degraded",
    "service": "geo-platform-api",
    "repositoryDriver": "memory",
    "runtimeEnvironment": "development",
    "dependencies": {
      "database": "not_configured",
      "queue": "in_memory",
      "aiPlatforms": "not_configured",
      "mapProvider": "configured",
      "logging": "console"
    },
    "missingConfiguration": ["GEO_AI_PLATFORM_CONFIGURED"]
  }
}
```

`status` 为 `ok` 或 `degraded`。`dependencies.aiPlatforms` 在 `STEPFUN_API_KEY` 存在或 `GEO_AI_PLATFORM_CONFIGURED=true` 时返回 `configured`。`dependencies.mapProvider` 返回 `configured`、`fallback`、`rate_limited` 或 `disabled`。健康检查只返回缺失配置项名称和依赖状态，不返回密钥值。

### 当前品牌摘要

```http
GET /api/v1/brands/active
x-brand-id: brand_demo
```

响应：

```json
{
  "success": true,
  "data": {
    "brandId": "brand_demo",
    "name": "示例品牌",
    "status": "active"
  }
}
```

### 可访问品牌列表

```http
GET /api/v1/brands
x-user-id: user_demo
```

响应：

```json
{
  "success": true,
  "data": [
    {
      "brandId": "brand_demo",
      "name": "示例品牌",
      "status": "active",
      "role": "owner"
    }
  ]
}
```

### 品牌详情列表

```http
GET /api/v1/brands/details
```

### 创建品牌

```http
POST /api/v1/brands
```

请求：

```json
{
  "name": "新品牌",
  "aliases": ["新品牌别名"],
  "industry": "教育服务",
  "website": "https://example.com",
  "targetCities": ["深圳"],
  "businessScope": "青少年成长服务",
  "targetAudience": "家庭用户",
  "status": "active"
}
```

### 编辑品牌

```http
PATCH /api/v1/brands/:brandId
```

### 更新品牌状态

```http
PATCH /api/v1/brands/:brandId/status
```

请求：

```json
{
  "status": "inactive"
}
```

### 品牌工作区快照

```http
GET /api/v1/brands/:brandId/workspace
```

### 品牌知识库

```http
GET /api/v1/brands/:brandId/knowledge
PATCH /api/v1/brands/:brandId/knowledge
```

保存请求：

```json
{
  "intro": "品牌介绍",
  "valueProps": ["核心卖点"],
  "offerings": ["课程或产品体系"],
  "proofPoints": ["权威背书"],
  "targetCustomers": ["目标客户"],
  "recommendedExpressions": ["推荐表达"],
  "blockedExpressions": ["禁用表达"],
  "contentRules": ["内容规则"],
  "competitors": ["竞品"],
  "faqs": [
    {
      "question": "常见问题",
      "answer": "标准回答"
    }
  ]
}
```

响应会返回 `completenessScore`、`missingFields` 和 `completenessPrompts`。当前完整度评分按 8 个维度等权计算：品牌介绍、业务范围、核心卖点、FAQ、竞品、用户画像、权威背书、禁用表达。`completenessPrompts` 为每个缺失项返回字段、缺失影响和可直接填写的问题卡片，用于品牌资料完整度引导。

### 知识库导入来源

```http
GET /api/v1/brands/:brandId/knowledge-sources
POST /api/v1/brands/:brandId/knowledge-sources
POST /api/v1/brands/:brandId/knowledge-sources/upload
POST /api/v1/brands/:brandId/knowledge-sources/:sourceId/parse
POST /api/v1/brands/:brandId/knowledge-sources/:sourceId/confirm
```

创建本地文件来源：

```json
{
  "name": "品牌介绍 PDF",
  "sourceType": "file",
  "fileRef": "uploads/brand-intro.pdf"
}
```

创建链接类来源：

```json
{
  "name": "官网介绍",
  "sourceType": "webpage",
  "sourceUrl": "https://example.com/about"
}
```

当前支持 `file`、`webpage`、`wechat_article`、`external_document` 四类来源，创建后状态默认为 `pending`。

品牌资料上传入口使用 multipart 表单字段 `file`，第一版接受 Markdown、Word 和 PDF，上传成功后创建 `KnowledgeSource`，状态为 `processing`。前端品牌工作区提供“上传品牌资料”和“手动填写品牌信息”两个入口，上传后自动调用解析接口，并展示解析中、待确认、解析失败、失败原因和手动填写兜底状态。解析入口返回 `BrandImportDraft`，Markdown 可提取品牌名称、行业、城市、课程或产品、目标客户、核心卖点、权威背书、FAQ、竞品和禁用表达，并为字段标记置信度；前端确认区会展示高置信字段、待确认字段、来源片段、资料完整度进度和缺失项影响说明，用户可编辑字段后确认保存。Word 和 PDF 当前先保存文件并返回可理解的失败草稿，等待后续文档转文本能力接入。确认入口接收用户确认后的 `fields`，保存到 `Brand` 和 `BrandProfile`，并将来源状态更新为 `completed`。

品牌工作区同时展示“完成首轮监测”步骤条，固定流程为上传资料、选择监测问题、连接 AI 平台、开始监测、查看建议、执行优化、复测增长。步骤条根据品牌档案、监测问题、监测记录和内容资产数量推导当前步骤；点击步骤按钮会展示对应提示卡，并引导到品牌工作区、AI 监测、内容生成或任务复测页面。

### 监测主题

```http
GET /api/v1/brands/:brandId/test-themes
POST /api/v1/brands/:brandId/test-themes/generate
PATCH /api/v1/brands/:brandId/test-themes/:themeId
```

监测主题用于把品牌档案转成品牌方可理解的监测方向。生成入口会读取 `Brand` 与 `BrandProfile`，生成品牌词、品类词、地域词、人群年龄段、用户痛点、课程或产品、竞品对比和购买决策主题，并为每个主题返回业务解释、推荐优先级、预计监测价值、启用状态和来源资料字段。重复生成时按 `type + name` 跳过已存在主题。更新入口支持调整主题启用状态、优先级和展示文案。

前端 AI 监测页通过监测主题表格展示主题名称、类型、业务解释、推荐优先级和预计监测价值，并提供一键生成监测主题入口。

追光小牛内测品牌会追加固定首轮样例主题：贵阳儿童运动、3 到 5 岁儿童体能、少儿跑酷、快乐体操、感统发展、专注力提升、增高体能和中考体测。

### 监测问法候选

```http
GET /api/v1/brands/:brandId/test-question-candidates?themeId=theme_demo&selected=true&limit=20&offset=0
POST /api/v1/brands/:brandId/test-question-candidates/generate
PATCH /api/v1/brands/:brandId/test-question-candidates/:candidateId
POST /api/v1/brands/:brandId/test-question-candidates/selection
```

监测问法候选根据已启用监测主题、品牌基础信息和品牌档案生成。生成覆盖品牌直问、品类推荐、地域推荐、人群年龄段需求、用户痛点、课程或产品、竞品对比和购买决策场景。每个候选问题会返回 `purposes`，用于标注是否检测品牌出现、是否排第一、卖点是否准确、是否出现竞品和是否存在风险表达；候选可返回 `promptId`，用于保存监测计划后关联可执行 Prompt；默认目标平台为豆包、Kimi、DeepSeek、通义千问和阶跃星辰。重复生成时按 `themeId + question` 跳过已存在问法。列表支持按 `themeId`、`selected`、`limit` 和 `offset` 筛选，并按高、中、低优先级返回。编辑入口支持修改问题文本、监测目的、目标平台、优先级、预计价值和选择状态。批量选择入口接收 `candidateIds`、`selected` 和可选 `themeId`，用于按主题批量勾选或取消勾选候选问法。

前端默认展示 8 个高价值监测问题，并提供“查看更多问法”展开完整候选列表。候选列表展示监测问题、所属主题、监测目的、目标平台和预计监测价值；支持单题勾选、按主题全选或取消、编辑问题文本、编辑监测目的、编辑目标平台、编辑优先级和预计价值。用户点击“保存为监测计划”时，前端会把已选候选问法提交到 `POST /api/v1/brands/:brandId/test-plans`，并展示目标平台、预计耗时、连接方式摘要和需要确认的事项。用户点击“开始首轮监测”时，前端会复用已保存计划或先创建计划，再调用 `POST /api/v1/brands/:brandId/test-plans/:planId/execute`。

追光小牛默认 seed 预置三条已勾选高价值问法：“贵阳有哪些值得推荐的儿童运动成长机构？”、“贵阳哪里有适合 3-5 岁孩子的体能馆？”和“贵阳儿童增高体能课怎么选？哪些表达需要家长谨慎看待？”。这三条分别覆盖本地推荐、年龄段需求和风险表达，并关联 `prompt_demo_comparison`。

批量选择请求：

```json
{
  "themeId": "theme_demo",
  "candidateIds": ["candidate_1", "candidate_2"],
  "selected": true
}
```

### AI 可见性运营 Sprint 共享契约

共享类型已新增 AI 可见性运营 Sprint 契约，供 Sprint 工作台、API、仓储、问题雷达、标准答案对照、内容缺口任务和指标聚合复用。内存仓储和 Prisma 仓储已实现 Sprint 读写，HTTP API 已提供 Sprint 聚合读取、状态推进、问题雷达、标准答案对照、内容缺口任务生成和指标刷新入口。品牌工作区通过 `GET /api/v1/brands/:brandId/sprints/current` 读取当前 Sprint，并将 `currentStep`、`steps` 和 `metricSummary` 映射为阶段进度、下一步动作和指标摘要。

Sprint 状态：

- `draft`
- `running`
- `waiting_confirmation`
- `completed`
- `failed`
- `stopped`

Sprint 阶段：

- `question_radar`
- `ai_response_monitoring`
- `standard_answer_alignment`
- `gap_diagnosis`
- `content_asset_generation`
- `publishing_preparation`
- `retest_and_trend`
- `completed`

核心结构：

```ts
type VisibilitySprint = {
  sprintId: string;
  brandId: BrandId;
  title: string;
  goal: string;
  status: VisibilitySprintStatus;
  currentStep: VisibilitySprintStepCode;
  steps: VisibilitySprintStep[];
  metricSummary: VisibilitySprintMetricSummary;
  relatedQuestionIds: string[];
  relatedTestPlanIds: string[];
  relatedMonitoringRunIds: string[];
  relatedStandardAnswerIds: string[];
  relatedContentTaskIds: string[];
  relatedPublishingRecordIds: string[];
  relatedRetestTaskIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type QuestionRadarDashboard = {
  brandId: BrandId;
  sprintId: string;
  totalQuestionCount: number;
  inSprintQuestionCount: number;
  dedupedInSprintQuestionCount: number;
  duplicateInSprintQuestionCount: number;
  items: QuestionRadarItem[];
};

type BrandStandardAnswer = {
  answerId: string;
  brandId: BrandId;
  questionId: string;
  question: string;
  answer: string;
  keyPoints: string[];
  evidence: BrandStandardAnswerEvidence[];
  status: 'draft' | 'ready_for_review' | 'approved' | 'archived';
  reviewedBy?: string;
  reviewedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type StandardAnswerAlignmentDashboard = {
  brandId: BrandId;
  sprintId: string;
  realAnswerCount: number;
  approvedStandardAnswerCount: number;
  summary: StandardAnswerAlignmentSummary;
  items: StandardAnswerAlignmentItem[];
  updatedAt: string;
};

type SprintContentGapTaskResult = {
  brandId: BrandId;
  sprintId: string;
  createdTaskCount: number;
  skippedQuestionCount: number;
  tasks: SprintContentGapTask[];
  sprint: VisibilitySprint;
};
```

指标摘要只保存展示聚合值，包含问题覆盖率、提及率、推荐率、首位推荐率、Top 3 率、引用命中率、表达准确率、风险表达数、内容缺口数、竞品压制数和样本量。问题雷达返回问题意图、目标平台覆盖、业务价值、优先级、状态和 Sprint 关联状态，并按归一化问题文本统计同一 Sprint 内重复项。品牌标准答案独立保存问题、答案正文、关键点、证据和审核状态，用作真实回复对照基准和内容生成依据。标准答案对照看板按问题输出等待真实回答、等待标准答案、已对齐或需要处理四类状态，并计算要点覆盖、准确性、风险表达、引用缺口和竞品压制证据。内容缺口任务结果记录本次创建的内容策略、内容生成任务、来源问题、标准答案、真实回答运行和缺口类型，并把新任务 ID 合并回 Sprint 的 `relatedContentTaskIds`。Sprint 契约只保存关联 ID 和聚合状态，不保存平台密钥、cookies、storage state、浏览器 profile 路径、真实回复正文或标准答案正文。

后端仓储端口位于 `apps/api/src/modules/permissions/permissions.repository.port.ts`，已新增以下 Sprint 方法签名：

- `listVisibilitySprints(userId, brandId)`
- `getVisibilitySprint(userId, brandId, sprintId)`
- `getCurrentVisibilitySprint(userId, brandId)`
- `createVisibilitySprint(userId, brandId, input)`
- `updateVisibilitySprintStep(userId, brandId, sprintId, input)`
- `updateVisibilitySprintMetrics(userId, brandId, sprintId, input)`
- `updateVisibilitySprintRelations(userId, brandId, sprintId, input)`
- `listBrandStandardAnswers(userId, brandId, questionId?)`
- `getBrandStandardAnswer(userId, brandId, answerId)`
- `createBrandStandardAnswer(userId, brandId, input)`
- `updateBrandStandardAnswer(userId, brandId, answerId, input)`

端口输入类型包含 `VisibilitySprintCreateInput`、`VisibilitySprintStepUpdateInput`、`VisibilitySprintMetricUpdateInput`、`VisibilitySprintRelationsUpdateInput`、`BrandStandardAnswerInput` 和 `BrandStandardAnswerUpdateInput`。所有方法签名都携带 `userId` 与 `brandId`，用于后续实现层复用现有品牌访问校验。

内存仓储已实现上述方法，并预置 `visibility_sprint_demo_supercalf_first_round` 作为追光小牛演示 Sprint。默认 Sprint 当前阶段为 `content_asset_generation`，关联 `test_plan_demo_supercalf_first_round`、`run_demo_weekly_mock`、`standard_answer_demo_local_recommendation`、`generation_demo_gap`、`publishing_record_demo_gap` 和 `task_demo_growth_retest`，用于后续 Sprint API 和前端工作台读取演示数据。Prisma 仓储已通过 `visibility_sprints` 表实现同一组方法，字段包括 `steps`、`metric_summary`、`related_question_ids`、`related_test_plan_ids`、`related_monitoring_run_ids`、`related_standard_answer_ids`、`related_content_task_ids`、`related_publishing_record_ids` 和 `related_retest_task_ids`，这些 JSON 字段只保存聚合状态或关联 ID。标准答案通过 `brand_standard_answers` 表持久化，字段包括 `question_id`、`question`、`answer`、`key_points`、`evidence`、`status`、`reviewed_by` 和 `reviewed_at`。

当前 Sprint HTTP API：

```http
GET /api/v1/brands/:brandId/sprints
GET /api/v1/brands/:brandId/sprints/current
GET /api/v1/brands/:brandId/sprints/:sprintId
GET /api/v1/brands/:brandId/sprints/:sprintId/question-radar
GET /api/v1/brands/:brandId/sprints/:sprintId/standard-answers
GET /api/v1/brands/:brandId/sprints/:sprintId/alignment
GET /api/v1/brands/:brandId/sprints/:sprintId/content-gaps/tasks
GET /api/v1/brands/:brandId/sprints/:sprintId/publishing-preparation
GET /api/v1/brands/:brandId/sprints/:sprintId/retest-trend
POST /api/v1/brands/:brandId/sprints
POST /api/v1/brands/:brandId/sprints/:sprintId/start
POST /api/v1/brands/:brandId/sprints/:sprintId/stop
POST /api/v1/brands/:brandId/sprints/:sprintId/standard-answers/generate
POST /api/v1/brands/:brandId/sprints/:sprintId/standard-answers/:answerId/approve
POST /api/v1/brands/:brandId/sprints/:sprintId/content-gaps/generate
POST /api/v1/brands/:brandId/sprints/:sprintId/publishing-preparation/records
POST /api/v1/brands/:brandId/sprints/:sprintId/retest-plan
POST /api/v1/brands/:brandId/sprints/:sprintId/metrics/refresh
POST /api/v1/brands/:brandId/sprints/:sprintId/advance
```

创建 Sprint 请求：

```json
{
  "title": "首轮 AI 可见性运营",
  "goal": "打通问题到复测闭环",
  "status": "draft",
  "currentStep": "question_radar"
}
```

接口均返回统一 `ApiResponse<T>`。列表返回 `VisibilitySprint[]`，当前 Sprint、详情、创建、启动、停止、指标刷新和阶段推进返回 `VisibilitySprint`，问题雷达返回 `QuestionRadarDashboard`，对照分析返回 `StandardAnswerAlignmentDashboard`，内容缺口生成返回 `SprintContentGapTaskResult`，内容缺口任务看板返回 `SprintContentTaskDashboard`，发布准备看板返回 `SprintPublishingPreparationDashboard`，创建发布准备记录返回 `SprintPublishingPreparationResult`，复测计划创建返回 `SprintRetestPlanResult`，复测趋势看板返回 `SprintRetestTrendDashboard`。启动接口将 Sprint 聚合状态改为 `running`，停止接口将 Sprint 聚合状态改为 `stopped`；问题雷达接口读取现有监测问题候选和监测主题，输出问题意图、平台覆盖、业务价值、状态和 Sprint 关联状态，同一 Sprint 内按归一化问题文本去重；对照分析接口只读取 Sprint 关联真实监测运行、解析结果和已审核标准答案，输出覆盖、准确性、风险表达、引用缺口、竞品压制、证据和建议动作；内容缺口生成接口读取对照分析中 `needs_attention` 的问题，为每个问题创建内容策略和内容生成任务，`referenceSources` 记录 Sprint、问题、标准答案、真实回答运行和证据摘要，并把新任务 ID 写入 Sprint；内容缺口任务看板读取 Sprint 关联内容任务和当前草稿版本，输出来源问题、缺口类型、证据摘要、建议动作、复测目标和草稿可审稿状态；发布准备接口读取 Sprint 关联内容任务、当前草稿版本和发布记录，输出草稿、待人工发布、已发布和失败状态，创建记录时只写入草稿或待人工发布状态，并把发布记录 ID 写回 Sprint；复测计划接口读取 Sprint 发布记录并创建任务中心复测任务，草稿和失败发布记录会跳过，创建后把任务 ID 写回 Sprint；复测趋势接口读取 Sprint 关联复测任务和 `RetestRecord`，输出基线指标、已完成复测数、改善数、前后指标和变化值；指标刷新接口只从 Sprint 关联的真实监测运行、原始回答和解析结果计算 `metricSummary`，不把品牌标准答案或内容草稿纳入监测样本。阶段推进接口根据已有关联对象判断下一阶段：缺少问题停在 `question_radar`，缺少真实回答停在 `ai_response_monitoring` 且状态为 `waiting_confirmation`，缺少标准答案停在 `standard_answer_alignment`，指标未刷新停在 `gap_diagnosis`，后续依次检查内容任务、发布记录和复测任务，全部具备后进入 `completed`。

生成标准答案请求：

```json
{
  "questionIds": ["candidate_demo_local_recommendation"]
}
```

标准答案列表、生成和确认接口返回 `BrandStandardAnswer[]` 或 `BrandStandardAnswer`。生成接口会读取 Sprint 关联问题、品牌工作区和品牌档案，创建 `ready_for_review` 草稿并写回 Sprint 的 `relatedStandardAnswerIds`；确认接口将对应标准答案更新为 `approved`，记录 `reviewedBy` 和 `reviewedAt`，并保持标准答案与真实 AI 回复监测指标分离。

### 大模型任务共享契约

共享类型已新增 LLM 任务契约，供 `llm` API 模块、问题生成、回答解读、内容生成和优化计划增强复用。

任务类型：

- `question_generation`
- `answer_analysis`
- `content_generation`
- `optimization_planning`

统一请求结构：

```ts
type LLMTaskRequest<TInput> = {
  platformCode?: string;
  modelName?: string;
  mode?: 'sync' | 'async';
  input: TInput;
};
```

统一响应结构：

```ts
type LLMTaskResponse<TOutput> = {
  jobId?: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'needs_confirmation';
  output?: TOutput;
  auditId?: string;
  message: string;
};
```

当前已定义四类任务输入输出：`QuestionGenerationInput` / `QuestionGenerationOutput`、`AnswerAnalysisInput`、`LLMContentGenerationInput` / `LLMContentGenerationOutput`、`OptimizationPlanningInput` / `OptimizationPlanningOutput`。输出类型复用现有 `TestThemeInput`、`TestQuestionCandidateInput`、`AnalysisResultInput`、`ContentVersionInput`、`GrowthOptimizationPlanInput` 和 `ContentGenerationTaskInput`，方便后续服务层直接写入现有业务模型。

任务运行摘要结构：

```ts
type LLMTaskRun = {
  id: string;
  brandId: BrandId;
  taskType: LLMTaskType;
  status: LLMTaskStatus;
  jobId?: string;
  auditId?: string;
  inputSummary: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};
```

平台 Adapter 契约已新增可选 `runMessages` 能力。OpenAI-compatible 平台支持 system、developer、user、assistant messages，支持 `responseFormat: 'json' | 'text'`、`temperature` 和 `maxTokens`，并从 provider usage 中归一化输入和输出 token 数。旧的 `runPrompt` 仍保留，用于现有监测 worker。

大模型任务 API 已接入后端 `llm` 模块：

```http
POST /api/v1/brands/:brandId/llm/tasks/question-generation
POST /api/v1/brands/:brandId/llm/tasks/answer-analysis
POST /api/v1/brands/:brandId/llm/tasks/content-generation
POST /api/v1/brands/:brandId/llm/tasks/optimization-planning
GET /api/v1/brands/:brandId/llm/tasks/:jobId
```

同步模式会选择当前品牌中可用的 API 平台配置，调用 Adapter 并写入调用审计和 `LLMTaskRun` 任务摘要。异步模式会创建 `AsyncJob` 并写入 queued 任务摘要，查询接口返回 `queued`、`running`、`succeeded` 或 `failed` 状态。平台缺失时返回 `llm_platform_missing`，密钥缺失时返回 `llm_credential_missing`，输出不是合法 JSON 时返回 `llm_output_invalid`。`LLMTaskRun` 摘要只保存任务结构、平台 code、模型名称、输入输出形状和错误信息，不保存平台密钥或浏览器会话敏感信息。

输出校验规则：`question_generation` 必须返回 `themes`、`candidates`、`missingProfileFields` 和 `generationNotes`；`answer_analysis` 必须返回可映射到 `AnalysisResultInput` 的字段，并校验分数范围、情绪枚举和竞品结构；`content_generation` 必须返回 `title`、`body`、`complianceNotes`、`retestSuggestions`，`exportFormat` 只支持 `markdown`；`optimization_planning` 必须返回 `plan`、`contentTasks`、`retestQuestions` 和 `generationNotes`，并校验优化原因、内容建议和复测问题结构。

### AI 自动化运营员共享契约

共享类型已新增 AI 自动化运营员契约，供自动化任务包、确认队列、自动化分析摘要和平台改写版本复用。后端自动化 API 已接入第一版任务包编排能力，当前负责创建任务包、读取上下文、维护监测问题池、精选本轮监测问题、生成确认事项、确认后创建监测计划、执行已确认监测计划、汇总回答分析、生成可发布内容、生成平台改写版本、生成发布建议、确认创建发布待办、安排发布后复测、回写复测结果，并记录关键操作审计。

自动化数据层新增 `AutomationPackage`、`AutomationConfirmation`、`PlatformRewriteVersion`、`TestQuestionPoolItem` 和 `TestQuestionSourceRecord`。所有结构包含 `brandId`；平台改写保留 `contentVersionId`，问题池条目可保留 `candidateId`，来源记录保留 `sourceType`、`sourceId` 和摘要。公开 API 继续只返回自动化业务摘要、确认 payload 和脱敏平台状态，不返回真实 API Key、cookies、storage state、浏览器 profile 路径或平台敏感凭据。

前端通过 `AutomationOperatorCard` 统一调用这些接口。品牌工作区、AI 回复监测页和增长优化页提供“让 AI 帮我跑一轮”入口；内容生成页展示平台改写、发布建议和复测建议进度。卡片会读取最近一次任务包，显示当前步骤、整体进度、品牌上下文、问题池数量、监测计划数量和待确认事项，并通过抽屉收口监测问题、分析判断、内容草稿、平台改写、发布建议和手动录入确认。发布建议确认抽屉会展示平台、标题和合规提示，方便品牌方确认后创建发布待办。

当前检查点验证确认：追光小牛可启动自动化任务包，问题池会持续同步监测问题候选并精选本轮问题，监测问题确认后可创建监测计划并执行，后续流程可生成运营判断、内容草稿、平台改写版本、发布建议、发布待办、复测建议，并在复测达标后完成自动化运营闭环。

后端路由：

```http
GET /api/v1/brands/:brandId/automation/packages
POST /api/v1/brands/:brandId/automation/packages
GET /api/v1/brands/:brandId/automation/packages/:packageId
POST /api/v1/brands/:brandId/automation/packages/:packageId/start
POST /api/v1/brands/:brandId/automation/packages/:packageId/stop
POST /api/v1/brands/:brandId/automation/packages/:packageId/regenerate
POST /api/v1/brands/:brandId/automation/packages/:packageId/test-plan/execute
POST /api/v1/brands/:brandId/automation/packages/:packageId/answers/analyze
POST /api/v1/brands/:brandId/automation/packages/:packageId/content/generate
POST /api/v1/brands/:brandId/automation/packages/:packageId/platform-rewrites/generate
POST /api/v1/brands/:brandId/automation/packages/:packageId/publishing-suggestions/generate
POST /api/v1/brands/:brandId/automation/packages/:packageId/publishing-suggestions/confirm
POST /api/v1/brands/:brandId/automation/packages/:packageId/retest-suggestions/generate
POST /api/v1/brands/:brandId/automation/packages/:packageId/retest-suggestions/:taskId/records/:recordId/complete
GET /api/v1/brands/:brandId/automation/packages/:packageId/confirmations
POST /api/v1/brands/:brandId/automation/packages/:packageId/confirmations
POST /api/v1/brands/:brandId/automation/packages/:packageId/confirmations/:confirmationId
POST /api/v1/brands/:brandId/automation/packages/:packageId/steps/:stepCode/fail
```

创建任务包请求：

```json
{
  "goal": "自动完成本轮 AI 回复监测、分析、内容生成和发布建议",
  "source": "brand_workspace",
  "targetPlatforms": ["doubao", "kimi", "deepseek", "qianwen"],
  "targetPublishingPlatforms": ["zhihu", "baijiahao", "xiaohongshu", "wechat_official", "official_site_faq"]
}
```

任务包详情会在 `AutomationPackage` 基础上返回 `confirmations` 和 `context`。`context` 当前包含品牌名称、品牌档案完整度分、监测问题池数量和监测计划数量，用于让前端展示“AI 已读取哪些资料”。自动化服务公开入口会校验当前用户是否可访问 `brandId`。启动任务包会把 `context_collection` 标记为完成，调用监测主题和监测问题生成能力补齐问题池，再从最新候选问题中精选 6 个本轮问题，创建 `type: test_questions` 的 pending 确认事项，并将任务包切换为 `waiting_confirmation`。

本轮监测问题确认事项 payload：

```json
{
  "questionPoolSize": 12,
  "selectedQuestionCount": 6,
  "selectedCandidateIds": ["candidate_1", "candidate_2"],
  "selectedQuestions": [
    {
      "candidateId": "candidate_1",
      "themeId": "theme_1",
      "question": "追光小牛是做什么的？适合哪些孩子？",
      "purposes": ["brand_mentioned", "value_prop_accuracy"],
      "targetPlatforms": ["doubao", "kimi", "deepseek", "qianwen"],
      "priority": "high",
      "estimatedValue": "验证品牌基础认知是否准确。"
    }
  ],
  "generationSource": "fallback",
  "generationNotes": ["已使用基础模板生成监测问题"],
  "missingProfileFields": [],
  "nextPoolTriggers": ["new_profile_source", "test_result_gap", "competitor_change", "published_content", "retest_result"]
}
```

用户对 `test_questions` 确认事项执行 `approve` 或 `edit` 后，确认队列会使用 `selectedCandidateIds` 创建 `TestPlan`，并把生成的监测计划 ID 写入任务包 `relatedTestPlanId`。任务包随后进入 `test_plan_execution` 步骤，供自动监测执行入口继续处理。

执行已确认监测计划：

```http
POST /api/v1/brands/:brandId/automation/packages/:packageId/test-plan/execute
```

该入口要求任务包已存在 `relatedTestPlanId`，并复用现有监测计划执行编排。执行后会把 API 运行数量、浏览器队列数量、手动处理数量和配置处理数量写入 `test_plan_execution` 步骤摘要，关联监测计划 ID 和已生成的监测运行 ID。若没有阻塞项，任务包保持 `running` 并推进到 `answer_analysis`；若存在浏览器待确认、手动录入、平台配置或跳过项，会创建 `type: manual_test_required` 的 pending 确认事项，并保持在 `test_plan_execution`。

手动录入确认事项 payload：

```json
{
  "testPlanId": "test_plan_1",
  "blockingSteps": [
    {
      "question": "贵阳儿童运动机构怎么选？",
      "platformCode": "doubao",
      "method": "browser",
      "status": "needs_confirmation",
      "promptId": "prompt_1",
      "message": "需要登录或人工确认"
    }
  ],
  "apiRunCount": 1,
  "browserQueuedCount": 0,
  "manualRequiredCount": 1,
  "configurationItemCount": 1
}
```

汇总回答分析和运营判断：

```http
POST /api/v1/brands/:brandId/automation/packages/:packageId/answers/analyze
```

该入口要求任务包已关联监测计划，且监测计划已生成监测运行。服务会读取监测计划的 `monitoringRunIds`，复用现有 `AnalysisResult` 规则解析结果，缺失时调用 `parseAnalysisResult` 补齐，再汇总推荐率、第一推荐率、Top 3 率、平均准确分、平均引用分、竞品压制数量、引用缺口数量、风险确认数量和无法判断数量。分析完成后会创建 `GrowthOptimizationPlan`，并把计划 ID 写入任务包 `relatedGrowthPlanId`，作为后续内容生成上下文。

若没有需要确认的分析项，任务包会完成 `answer_analysis` 并进入 `content_generation`。若存在风险表达、排名无法判断、情绪无法判断或引用缺口，服务会创建 `type: analysis_review` 的 pending 确认事项，用户确认后任务包推进到 `content_generation`。

分析确认事项 payload：

```json
{
  "summary": {
    "testPlanId": "test_plan_1",
    "growthPlanId": "growth_plan_1",
    "sampleCount": 6,
    "recommendationRate": 83,
    "topOneRate": 50,
    "topThreeRate": 83,
    "averageAccuracyScore": 78,
    "averageCitationScore": 42,
    "competitorSuppressionCount": 2,
    "citationGapCount": 3,
    "riskReviewCount": 1,
    "unknownReviewCount": 1,
    "relatedRunIds": ["run_1"],
    "contentGaps": ["补充品牌基础介绍和高频问答"],
    "nextRecommendations": ["优先生成品牌基础 FAQ，让 AI 更容易识别品牌名称和服务范围。"]
  },
  "reviewItems": [
    {
      "runId": "run_1",
      "platformCode": "doubao",
      "brandRank": null,
      "sentiment": "unknown",
      "expressionDeviation": "需要你确认：命中高风险或禁用表达",
      "suggestedAction": "请根据原始回答确认排名、情绪或是否出现品牌。"
    }
  ],
  "growthPlanId": "growth_plan_1"
}
```

生成可发布内容：

```http
POST /api/v1/brands/:brandId/automation/packages/:packageId/content/generate
```

该入口要求任务包已存在 `relatedGrowthPlanId`，并复用增长优化计划的 `contentRecommendations` 批量创建内容生成任务。服务会调用 `ContentGenerationWorker` 处理对应 `content_generation` job，写入最新内容版本，并把内容任务 ID 写回任务包 `relatedContentTaskIds`。生成结果正文固定包含正文、引用依据、合规说明、建议发布平台和复测建议。若没有风险内容，任务包完成 `content_generation` 并进入 `platform_rewrite`；若标题或正文命中高风险表达或“需要你确认”标记，会创建 `type: content_review` 的 pending 确认事项，并保持在 `content_generation`。

内容确认事项 payload：

```json
{
  "growthPlanId": "growth_plan_1",
  "generatedContent": [
    {
      "task": {
        "id": "generation_1",
        "contentType": "wechat_article",
        "targetPlatform": "wechat_official"
      },
      "version": {
        "id": "version_1",
        "title": "追光小牛首轮 AI 高频问题 FAQ"
      },
      "suggestedPublishingPlatform": "公众号",
      "referenceSources": ["内容缺口: AI 回答缺少品牌标准表达和可引用资料"],
      "complianceNotes": ["发布前核对品牌事实、适用人群、校区信息和高风险承诺表达。"],
      "retestSuggestions": ["建议在 2026-07-27T00:00:00.000Z 后复测对应问题。"]
    }
  ],
  "reviewItems": []
}
```

生成平台改写版本：

```http
POST /api/v1/brands/:brandId/automation/packages/:packageId/platform-rewrites/generate
```

该入口要求任务包已存在可改写的 `relatedContentTaskIds` 和对应内容版本。服务会根据任务包 `targetPublishingPlatforms` 生成平台改写版本，默认覆盖知乎、百家号、小红书、公众号和官网 FAQ。每个改写版本包含标题、正文、标签、改写说明、合规提示和 `needs_review` 状态，并通过 `AutomationRepository.createRewrite` 保存。生成后任务包保持在 `platform_rewrite`，创建 `type: platform_rewrite_review` 的 pending 确认事项，等待品牌方确认后再进入发布建议。

平台改写确认事项 payload：

```json
{
  "contentVersionIds": ["version_1"],
  "targetPlatforms": ["zhihu", "baijiahao", "xiaohongshu", "wechat_official", "official_site_faq"],
  "rewrites": [
    {
      "rewriteId": "rewrite_1",
      "contentVersionId": "version_1",
      "targetPlatform": "xiaohongshu",
      "title": "追光小牛为什么适合贵阳儿童运动成长｜家长选择清单",
      "tags": ["贵阳儿童运动", "儿童体能", "少儿跑酷", "快乐体操", "运动成长课"],
      "rewriteNotes": ["改为小红书笔记标题", "使用家长视角和选择建议", "追加话题标签"],
      "complianceNotes": ["避免制造焦虑", "避免承诺具体成长结果"],
      "status": "needs_review"
    }
  ]
}
```

生成发布建议：

```http
POST /api/v1/brands/:brandId/automation/packages/:packageId/publishing-suggestions/generate
```

该入口要求任务包已存在平台改写版本，且没有 pending 确认事项。服务会读取内容版本、`PlatformRewriteVersion` 和发布中心历史记录，生成 `type: publishing_suggestion` 的 pending 确认事项。建议项包含改写版本 ID、内容任务 ID、内容版本 ID、目标平台、标题、正文、内容类型、关键词、改写说明、合规提示、历史发布记录数量和最近历史发布状态。任务包进入 `publishing_suggestion` 并等待品牌方确认。

发布建议确认事项 payload：

```json
{
  "suggestions": [
    {
      "rewriteId": "rewrite_1",
      "strategyId": "strategy_1",
      "generationTaskId": "generation_1",
      "versionId": "version_1",
      "title": "追光小牛为什么适合贵阳儿童运动成长？",
      "targetPlatform": "wechat_official",
      "targetPlatformLabel": "公众号",
      "contentType": "wechat_article",
      "targetKeywords": ["儿童运动", "贵阳体能"],
      "historicalRecordCount": 1,
      "latestHistoricalStatus": "published"
    }
  ]
}
```

确认发布建议并创建发布待办：

```http
POST /api/v1/brands/:brandId/automation/packages/:packageId/publishing-suggestions/confirm
```

请求：

```json
{
  "confirmationId": "auto_confirm_1",
  "decision": "确认创建发布待办"
}
```

该入口会先确认对应 `publishing_suggestion` 仍为 pending，并从原始 payload 或用户编辑 payload 中解析有效建议；建议为空时保持确认事项 pending，便于用户修正后重试。校验通过后，服务复用发布中心仓储为每条建议创建 `PublishingRecord`，默认状态为 `pending`，随后处理确认事项。生成的发布记录 ID 会写回任务包 `relatedPublishingRecordIds`，任务包进入 `retest_suggestion`。

生成复测建议：

```http
POST /api/v1/brands/:brandId/automation/packages/:packageId/retest-suggestions/generate
```

该入口要求任务包已关联发布记录。服务会优先读取监测计划的监测运行，缺省时读取增长优化计划的 `sourceRunIds`，复用任务复测仓储创建“发布后复测 AI 推荐表现”优化任务，并基于增长优化计划 `retestAt` 创建复测记录。复测建议会写入 `retest_suggestion` 步骤摘要。

回写复测结果：

```http
POST /api/v1/brands/:brandId/automation/packages/:packageId/retest-suggestions/:taskId/records/:recordId/complete
```

请求：

```json
{
  "actualScore": 92,
  "targetScore": 85,
  "notes": "复测达到目标"
}
```

该入口复用任务复测仓储计算复测是否达标，并将结果回写自动化任务包。达标时任务包进入 `completed`，未达标时保留在 `retest_suggestion` 并等待下一轮优化。

创建确认事项请求：

```json
{
  "type": "content_review",
  "title": "请确认内容草稿",
  "impact": "确认后会进入平台改写环节。",
  "recommendation": "建议重点检查品牌事实、风险表达和引用依据。",
  "evidenceSummary": "系统已根据本轮监测分析结果生成草稿。",
  "payload": {},
  "stepCode": "content_confirmation"
}
```

处理确认事项请求：

```json
{
  "action": "approve",
  "decision": "确认通过",
  "payload": {}
}
```

`action` 支持 `approve`、`edit`、`regenerate` 和 `skip`。`edit` 会把用户编辑内容写入 `payload.editedPayload`，`regenerate` 会把任务包切回 `question_pool_update` 的 running 状态，`skip` 会把当前步骤标记为 skipped。只要同一任务包内仍有 pending 确认事项，自动化任务包会保持 `waiting_confirmation`，阻塞继续执行。

自动化任务包状态：

- `draft`
- `waiting_confirmation`
- `running`
- `completed`
- `failed`
- `stopped`

自动化步骤 code 覆盖上下文收集、问题池更新、本轮问题筛选、监测问题确认、监测计划执行、回答分析、内容生成、平台改写、内容确认、发布建议、复测建议和完成状态。

任务包结构：

```ts
type AutomationPackage = {
  packageId: string;
  brandId: BrandId;
  status: AutomationPackageStatus;
  source: AutomationPackageSource;
  goal: string;
  targetPlatforms: Array<BeginnerFriendlyPlatform | string>;
  targetPublishingPlatforms: AutomationPublishingPlatform[];
  currentStep: AutomationStepCode;
  stepSummaries: AutomationStepSummary[];
  relatedTestPlanId?: string;
  relatedGrowthPlanId?: string;
  relatedContentTaskIds: string[];
  relatedPublishingRecordIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
```

步骤摘要结构：

```ts
type AutomationStepSummary = {
  code: AutomationStepCode;
  status: AutomationStepStatus;
  title: string;
  message: string;
  startedAt?: string;
  completedAt?: string;
  relatedConfirmationIds: string[];
  relatedEntityIds: string[];
};
```

自动化分析摘要结构：

```ts
type AutomationAnalysisSummary = {
  testPlanId: string;
  growthPlanId?: string;
  sampleCount: number;
  recommendationRate: number;
  topOneRate: number;
  topThreeRate: number;
  averageAccuracyScore: number;
  averageCitationScore: number;
  competitorSuppressionCount: number;
  citationGapCount: number;
  riskReviewCount: number;
  unknownReviewCount: number;
  relatedRunIds: string[];
  contentGaps: string[];
  nextRecommendations: string[];
};
```

确认事项结构：

```ts
type AutomationConfirmation = {
  confirmationId: string;
  packageId: string;
  brandId: BrandId;
  type: AutomationConfirmationType;
  status: AutomationConfirmationStatus;
  title: string;
  impact: string;
  recommendation: string;
  evidenceSummary: string;
  payload: Record<string, unknown>;
  decision?: string;
  decidedBy?: string;
  decidedAt?: string;
};
```

平台改写版本结构：

```ts
type PlatformRewriteVersion = {
  rewriteId: string;
  brandId: BrandId;
  contentVersionId: string;
  targetPlatform: AutomationPublishingPlatform;
  title: string;
  body: string;
  tags: string[];
  rewriteNotes: string[];
  complianceNotes: string[];
  status: PlatformRewriteStatus;
  createdAt: string;
};
```

上述结构均携带 `brandId` 和可追溯关联 ID。确认事项文案字段用于承载更专业的判断说明，同时保持品牌方可理解的表达。

### 监测主题和问题生成结果

`POST /api/v1/brands/:brandId/test-themes/generate` 和 `POST /api/v1/brands/:brandId/test-question-candidates/generate` 返回 `TestAssetGenerationResult<T>`：

```json
{
  "items": [],
  "missingProfileFields": [],
  "generationNotes": [],
  "source": "llm"
}
```

`items` 是已写入的 `TestTheme[]` 或 `TestQuestionCandidate[]`。`source` 为 `llm` 表示使用大模型生成，为 `fallback` 表示使用基础模板生成。`missingProfileFields` 会返回品牌资料缺失项，`generationNotes` 会返回生成说明，前端会在监测问题卡片中保留这些提示，方便内测用户补资料或理解基础模板 fallback。

### 回答解读解析

`POST /api/v1/brands/:brandId/monitoring-runs/:runId/analysis/parse` 仍返回 `AnalysisResult`。接口会先用规则解析原始回答并写入结果，再尝试调用 `answer_analysis` 大模型任务；调用成功时会用 LLM 输出更新 `AnalysisResult`，调用失败时保留规则解析结果。规则二次校验会强制保留品牌未出现、引用分数、未知情绪和高风险表达判断。

### 内容生成

`ContentGenerationWorker` 处理 `content_generation` 异步任务时，会默认调用统一 LLM 任务 `content_generation`。输出仍保存为 `ContentVersionInput`：

```json
{
  "title": "内容标题",
  "body": "Markdown 正文",
  "exportFormat": "markdown"
}
```

LLM 失败时使用基础模板生成草稿，避免任务中断。LLM 返回的 `complianceNotes` 和 `retestSuggestions` 会追加到 Markdown 正文的“合规说明”和“复测建议”段落中；禁用表达或高风险表达命中时，正文会追加“需要你确认”提示，前端内容编辑器会抽取这些段落并展示发布前检查提示。

### 增长优化计划生成

`POST /api/v1/brands/:brandId/growth-optimization/generate` 仍返回 `GrowthOptimizationPlan`。接口会优先调用 `optimization_planning` LLM 任务，输入包含品牌档案、监测分析结果、内容资产、发布记录和当前计划；LLM 成功时会写入优化计划、创建下一轮复测问题，并尝试创建内容生成任务。LLM 不可用或输出无效时回退到规则计划生成。

### 监测计划

```http
GET /api/v1/brands/:brandId/test-plans
GET /api/v1/brands/:brandId/test-plan-templates
POST /api/v1/brands/:brandId/test-plans
POST /api/v1/brands/:brandId/test-plans/from-template
POST /api/v1/brands/:brandId/test-plans/:planId/duplicate
POST /api/v1/brands/:brandId/test-plans/:planId/execute
```

创建监测计划时，默认读取当前品牌已勾选的监测问法候选；也可以通过 `candidateIds` 指定候选问法，或通过 `questions` 直接传入自定义问题。系统会汇总目标平台、生成连接方式摘要、估算耗时，并返回需要用户确认或补充配置的事项。

追光小牛默认 seed 内置 `test_plan_demo_supercalf_first_round`，名称为“追光小牛首轮 GEO 监测计划”，目标平台为豆包、Kimi、DeepSeek、通义千问和阶跃星辰，状态为 `needs_confirmation`，用于内测打开项目后直接查看首轮监测样例；豆包、Kimi、DeepSeek 和通义千问走浏览器辅助或手动录入路径，阶跃星辰走 API 配置或手动录入路径。

创建请求：

```json
{
  "name": "追光小牛首轮 GEO 监测计划",
  "candidateIds": ["candidate_1", "candidate_2"],
  "platformCodes": ["doubao", "kimi", "deepseek", "qianwen"]
}
```

创建响应的 `data` 为 `TestPlanCreationResult`，包含 `plan`、`questionCount`、`platformCount`、`targetPlatforms`、`estimatedDurationMinutes`、`connectionSummary` 和 `confirmationItems`。当平台尚未配置平台密钥或需要浏览器登录确认时，计划会保留为 `needs_configuration` 或 `needs_confirmation` 状态，供后续执行编排继续处理。

执行入口返回 `TestPlanExecutionResult`。系统会根据每个平台的连接摘要分流：`ready + api` 且问题关联 `promptId` 时创建监测运行并写入 `apiRuns`；浏览器可用或半自动平台会调用 browser connector，成功提取回答后创建监测运行、写入原始回答、触发自动分析，并在 `browserSteps` 返回 `queued` 状态和 `runId`；浏览器读取失败、缺少 `promptId` 或平台要求确认时写入 `needs_confirmation`；手动平台写入 `manualSteps`；未配置平台写入 `configurationItems`。当所有目标平台都缺少可用连接方式时，计划状态为 `needs_configuration`，前端可直接展示连接引导。前端执行后按 API 自动监测、浏览器辅助监测、手动录入、待配置和跳过数量展示摘要；存在确认事项时展示“需要你确认”的下一步提示。

API 平台执行成功后会保存平台、模型、监测问题、原始回答、调用审计和自动分析结果；执行失败时会记录错误码、失败原因、重试状态和人工录入兜底提示。API 平台缺少 endpoint、模型或平台密钥时会进入连接 AI 平台引导。

手动录入入口为 `POST /api/v1/brands/:brandId/test-plans/:planId/manual-answers`。请求体支持单条 `ManualTestAnswerInput` 或 `{ "answers": ManualTestAnswerInput[] }`，服务端按路径 `planId`、监测问题文本和 `platformCode` 匹配监测计划问题。匹配成功后创建或复用监测运行，写入原始回答、引用、模型名称并触发自动分析；回答为空、问题平台无法匹配、监测问题缺少 `promptId` 或监测运行创建失败时返回 `failed` 项。前端手动录入界面会展示监测计划中的问题和目标平台，提供复制问题、单条粘贴和批量粘贴。批量粘贴按空行分隔，每条使用 `平台：豆包`、`问题：原监测问题`、`回答：AI 原文` 和可选 `模型：model-name` 格式解析；提交前展示已解析数量和缺少回答数量，提交后展示匹配成功、匹配失败和失败原因。

模板列表会根据品牌行业、业务范围和城市推荐 `TestPlanTemplate`。当前内置儿童运动本地增长模板和通用品牌首轮监测模板；行业模板未命中时，通用模板会被标记为 `recommended: true`。`from-template` 会根据模板自动生成监测问题、目标平台和分析重点并保存为监测计划。`duplicate` 支持复制已有计划，传入 `retest: true` 时用于创建同题同平台复测计划。

### 监测主题

```http
GET /api/v1/brands/:brandId/optimization-units
GET /api/v1/brands/:brandId/optimization-units/:unitId
POST /api/v1/brands/:brandId/optimization-units
PATCH /api/v1/brands/:brandId/optimization-units/:unitId
```

创建请求：

```json
{
  "name": "儿童体适能品牌推荐",
  "type": "brand",
  "targetKeywords": ["儿童体适能", "少儿运动"],
  "priority": "high",
  "enabled": true
}
```

监测主题底层接口沿用 `optimization-units`。当前 `type` 支持 `brand`、`category`、`scenario`、`location`、`competitor`。当前 `priority` 支持 `high`、`medium`、`low`。响应包含 `relatedCounts`，用于后续接入监测场景、监测问题、内容策略、监测记录和优化任务。

### GEO 画布

```http
GET /api/v1/brands/:brandId/canvas
```

响应返回 `GeoCanvasWorkspace`，包含监测主题节点、用户场景节点、数据表现节点、内容策略节点、节点连线、GEO 指标看板、内容策略列表和优化任务列表。接口字段仍使用 `optimizationUnits` 与 `userIntents` 保持数据模型稳定。

```http
POST /api/v1/brands/:brandId/canvas/content-strategies
```

请求：

```json
{
  "optimizationUnitId": "unit_demo",
  "intentId": "intent_demo",
  "type": "gap",
  "priority": "high",
  "suggestedTitle": "补齐本地决策内容",
  "targetPlatform": "wechat",
  "targetKeywords": ["本地决策"],
  "relatedPromptIds": []
}
```

```http
POST /api/v1/brands/:brandId/canvas/tasks
```

请求：

```json
{
  "title": "执行内容策略优化",
  "type": "content_strategy",
  "optimizationUnitId": "unit_demo",
  "strategyId": "strategy_demo",
  "ownerId": "user_demo",
  "dueDate": "2026-07-10"
}
```

从内容策略创建任务后，内容策略状态会更新为 `task_created`。

### 内容策略中心

```http
GET /api/v1/brands/:brandId/content
GET /api/v1/brands/:brandId/content/assets
POST /api/v1/brands/:brandId/content/assets
PATCH /api/v1/brands/:brandId/content/assets/:assetId
GET /api/v1/brands/:brandId/content/strategies
POST /api/v1/brands/:brandId/content/strategies/generate
```

内容中心响应返回 `ContentCenterDashboard`，包含内容资产、内容策略、策略建议和内容覆盖率。覆盖率统计基于品牌知识库、监测主题关键词和内容资产目标关键词，返回关键词覆盖率、未覆盖关键词、已发布资产数和可复用资产数。

创建内容资产：

```json
{
  "title": "品牌官网行业方案页",
  "type": "official_page",
  "platform": "official_site",
  "url": "https://example.com/solution",
  "targetKeywords": ["GEO 管理", "内容优化"],
  "reuseOfAssetId": "asset_demo",
  "brandAdaptation": "改写为面向区域品牌的版本",
  "status": "published"
}
```

内容资产列表支持按 `type`、`platform`、`status` 和 `keyword` 筛选。策略生成会基于内容缺口、信息修正、关键词增强、权威引用和竞品回应生成 `ContentStrategy`，并保存关联优化单元、用户意图和 Prompt。

### 增长优化计划

```http
GET /api/v1/brands/:brandId/growth-optimization
POST /api/v1/brands/:brandId/growth-optimization/generate
POST /api/v1/brands/:brandId/growth-optimization/plans
POST /api/v1/brands/:brandId/growth-optimization/plans/:planId/confirm
```

生成计划会读取品牌回答分析样本，按推荐率不足、排名落后、卖点覆盖不足、竞品压制、风险表达、引用来源不足和持续内容补强生成 `GrowthOptimizationReason`；计划会写入来源运行、摘要、优先级、负责人、截止时间、建议发布平台、复测时间和 `GrowthOptimizationContentRecommendation`。

生成请求：

```json
{
  "sourceTestPlanId": "test_plan_demo"
}
```

手动创建计划请求：

```json
{
  "sourceRunIds": ["run_demo"],
  "summary": "首轮监测推荐率不足，需要补齐品牌内容和复测计划。",
  "priority": "high",
  "ownerId": "user_demo",
  "dueDate": "2026-07-20T00:00:00.000Z",
  "publishingPlatforms": ["wechat_official", "official_site"],
  "retestAt": "2026-07-27T00:00:00.000Z",
  "contentRecommendations": [
    {
      "contentType": "website_faq",
      "title": "品牌首轮 GEO 高频问题 FAQ",
      "targetPlatform": "official_site",
      "targetKeywords": ["品牌推荐"],
      "reason": "补齐 AI 容易引用的品牌基础资料。"
    }
  ]
}
```

确认计划请求：

```json
{
  "ownerId": "user_demo",
  "dueDate": "2026-07-20T00:00:00.000Z",
  "publishingPlatforms": ["wechat_official", "official_site"],
  "retestAt": "2026-07-27T00:00:00.000Z"
}
```

确认计划返回 `GrowthOptimizationPlanConfirmationResult`，包含更新后的计划和拆解出来的优化任务。任务类型覆盖内容补强、平台发布、资料补充、问法复测和负责人跟进；重复确认会返回已关联任务，避免重复创建。

`GrowthOptimizationWorkspace` 聚合当前品牌的计划列表、当前未完成计划、相关内容策略、优化任务和发布记录。内容建议第一版覆盖公众号推文、小红书图文、官网 FAQ、短视频脚本、平台介绍文案和图片创意需求，并携带目标关键词和生成原因，供后续内容任务生成和复测联动使用。默认追光小牛样例计划为 `growth_plan_demo_supercalf`，关联 `test_plan_demo_supercalf_first_round`，发布平台覆盖 `wechat_official`、`xiaohongshu`、`official_site` 和 `douyin`，复测时间为 `2026-07-27T00:00:00.000Z`。

前端 `/growth-optimization` 页面消费该工作台数据，按计划展示摘要、原因分析、优先级、负责人、截止时间、发布平台、复测时间、内容建议和关联任务，并调用确认计划、内容任务生成、任务状态更新和复测计划接口完成增长优化闭环。

增长优化计划关联的任务完成后，后端会根据任务的来源监测运行和计划复测时间自动创建 `RetestRecord`。复测完成时会对比优化前后的推荐率、品牌排名和表达准确性；若指标未提升，记录 `nextSuggestion` 并把下一轮内容补强建议追加到计划的 `contentRecommendations`。

### 内容生成工作台

```http
GET /api/v1/brands/:brandId/content/generation
GET /api/v1/brands/:brandId/content/generation?taskId=:taskId
POST /api/v1/brands/:brandId/content/generation/tasks
POST /api/v1/brands/:brandId/content/generation/growth-optimization/tasks
POST /api/v1/brands/:brandId/content/generation/tasks/:taskId/retry
POST /api/v1/brands/:brandId/content/generation/tasks/:taskId/versions
POST /api/v1/brands/:brandId/content/generation/tasks/:taskId/export
POST /api/v1/brands/:brandId/content/generation/tasks/:taskId/publish-entry
```

创建生成任务：

```json
{
  "strategyId": "strategy_demo",
  "targetPlatform": "wechat",
  "contentType": "wechat_article",
  "contentTopic": "公众号推文任务",
  "targetKeywords": ["儿童运动"],
  "referenceSources": ["内容缺口: AI 回答缺少品牌标准表达"],
  "retestAt": "2026-07-27T00:00:00.000Z"
}
```

从增长优化计划批量生成内容任务：

```json
{
  "planId": "growth_plan_demo_supercalf",
  "recommendationIndexes": [0, 1, 2]
}
```

`recommendationIndexes` 可省略；省略时会把计划内所有 `contentRecommendations` 转为内容生成任务。每个任务会写入 `growthOptimizationPlanId`、建议发布平台、内容主题、目标关键词、引用资料和复测时间。第一版内容类型覆盖 `wechat_article`、`xiaohongshu_note`、`website_faq`、`short_video_script`、`platform_profile_copy` 和 `image_creative_brief`。

创建任务后返回 `ContentGenerationWorkspace`，其中包含当前任务、生成步骤、当前版本、历史版本、导出记录和发布入口参数。第一版使用模板生成 Markdown 草稿，步骤固定包含策略解析、知识库读取、大纲生成、正文生成和 GEO 规则检查。第三阶段 repository port 已支持按 `stepKey` 更新步骤状态、消息和完成时间，并由步骤状态推导内容生成任务整体状态；生成成功后可写入最新 `ContentVersion`，导出 Markdown 和发布入口继续使用现有 API；生成失败时可记录失败步骤、错误码、错误信息和关联异步任务状态，并通过 `POST /api/v1/brands/:brandId/content/generation/tasks/:taskId/retry` 将失败任务重新入队。`ContentGenerationWorker` 当前提供后端执行边界，前端工作台展示公众号推文、小红书图文、官网 FAQ、短视频脚本、平台介绍文案和图片创意需求 6 类内容任务，并展示建议发布平台、内容主题、目标关键词、引用资料、复测时间、增长计划来源、任务状态、步骤状态、失败提示和重新入队入口。

保存编辑版本：

```json
{
  "title": "编辑后的内容标题",
  "body": "Markdown 正文内容",
  "exportFormat": "markdown"
}
```

导出 Markdown 会创建 `ContentExportRecord`，记录文件名、导出内容、创建人和品牌上下文。去发布入口返回 `PublishingEntryPayload`，包含品牌、策略、生成任务、版本、标题、正文、目标平台、内容类型和目标关键词，用于后续发布中心创建发布记录。

### 发布中心

```http
GET /api/v1/brands/:brandId/publishing
POST /api/v1/brands/:brandId/publishing/accounts
POST /api/v1/brands/:brandId/publishing/accounts/:accountId/reauthorize
PATCH /api/v1/brands/:brandId/publishing/accounts/:accountId/status
POST /api/v1/brands/:brandId/publishing/records
PATCH /api/v1/brands/:brandId/publishing/records/:recordId/status
```

发布中心响应返回 `PublishingDashboard`，包含发布平台列表、发布账号和发布记录。当前平台列表包含公众号、头条号、搜狐号和百家号，并展示每个平台的账号数量和授权异常状态。

接入发布账号：

```json
{
  "platform": "wechat",
  "accountName": "品牌公众号",
  "loginMode": "oauth",
  "authStatus": "connected"
}
```

创建发布记录：

```json
{
  "accountId": "pub_account_demo",
  "generationTaskId": "generation_demo",
  "versionId": "version_demo",
  "title": "内容标题",
  "body": "Markdown 正文内容",
  "targetPlatform": "wechat",
  "contentType": "wechat_article",
  "targetKeywords": ["GEO 内容生成"],
  "status": "pending"
}
```

创建发布记录时，后端会校验账号、内容生成任务和内容版本属于当前品牌；若请求来自内容生成发布入口且未传 `contentAssetId`，会自动创建草稿状态的内容资产，再把发布记录关联到该内容资产。授权异常可通过账号状态接口记录 `errorMessage`，重新授权接口会把账号状态恢复为 `connected` 并刷新最近授权时间。

### 任务复测

```http
GET /api/v1/brands/:brandId/tasks
POST /api/v1/brands/:brandId/tasks
PATCH /api/v1/brands/:brandId/tasks/:taskId
POST /api/v1/brands/:brandId/tasks/:taskId/retest
PATCH /api/v1/brands/:brandId/tasks/:taskId/retest/:recordId
```

任务看板返回 `TaskBoardDashboard`，包含当前品牌的 `tasks` 和按 `todo`、`doing`、`review`、`retest`、`done`、`reopened` 聚合的 `statusCounts`。

创建监测问题任务：

```json
{
  "title": "修正 AI 回答中的品牌表达问题",
  "type": "monitoring_issue",
  "ownerId": "user_demo",
  "optimizationUnitId": "unit_demo",
  "relatedPromptId": "prompt_demo",
  "relatedPlatformCode": "manual_input",
  "sourceRunId": "run_demo",
  "priority": "high",
  "dueDate": "2026-07-10"
}
```

更新任务处理信息：

```json
{
  "status": "review",
  "processingNote": "已更新内容资产并提交审核",
  "contentLink": "https://example.com/content",
  "reviewStatus": "pending"
}
```

创建复测计划：

```json
{
  "sourceRunId": "run_demo",
  "retestRunId": "run_retest_demo",
  "plannedAt": "2026-07-10T00:00:00.000Z",
  "targetScore": 85,
  "notes": "复测原始监测问题是否改善"
}
```

录入复测结果：

```json
{
  "actualScore": 72,
  "targetScore": 85,
  "notes": "复测仍低于目标"
}
```

从监测问题创建的任务会保存 `sourceRunId`。任务进入待复测时会创建 `RetestRecord` 并绑定 `retestRunId`；复测实际分低于目标分时，任务状态变为 `reopened`，并生成下一轮 `correction` 内容策略。增长优化任务的复测记录还会返回 `beforeMetrics`、`afterMetrics`、`metricDelta`、`improved` 和 `nextSuggestion`，用于展示优化前后推荐率、品牌排名和表达准确性变化。

### 用户场景与监测问题

```http
GET /api/v1/brands/:brandId/intents
POST /api/v1/brands/:brandId/intents
PATCH /api/v1/brands/:brandId/intents/:intentId
GET /api/v1/brands/:brandId/prompt-templates
POST /api/v1/brands/:brandId/prompt-templates
GET /api/v1/brands/:brandId/prompts
POST /api/v1/brands/:brandId/prompts/batch-generate
PATCH /api/v1/brands/:brandId/prompts/:promptId
```

创建用户场景：

```json
{
  "optimizationUnitId": "unit_001",
  "category": "local_decision",
  "text": "为 6 岁孩子选择运动训练机构",
  "monitoringFrequency": "weekly",
  "enabled": true
}
```

创建监测问题模板：

```json
{
  "name": "本地机构推荐",
  "industry": "儿童体适能",
  "category": "local_decision",
  "text": "请推荐{city}适合{intent}的机构，并说明{brandName}的适用场景。",
  "targetKeywords": ["机构推荐"],
  "platformCodes": ["doubao", "deepseek", "kimi"],
  "frequency": "weekly"
}
```

批量生成请求：

```json
{
  "templateId": "template_brand_recommendation",
  "intentIds": ["intent_001"]
}
```

模板生成监测问题时会替换 `{brandName}`、`{brandAlias}`、`{city}`、`{industry}`、`{intent}` 和 `{unitName}`。若模板文本未包含品牌名称或别名，后端会自动补入品牌名称，保持监测问题可追溯。

### 连接 AI 平台

```http
GET /api/v1/platforms
POST /api/v1/platforms
PATCH /api/v1/platforms/:platformId
POST /api/v1/platforms/:platformId/validate
GET /api/v1/platforms/browser-sessions
POST /api/v1/platforms/browser-sessions
PATCH /api/v1/platforms/browser-sessions/:sessionId
x-brand-id: brand_demo
```

创建请求：

```json
{
  "platformCode": "deepseek",
  "name": "DeepSeek",
  "mode": "api",
  "modelName": "deepseek-chat",
  "rateLimitPerMinute": 60,
  "credentialRef": "credential_ref_value",
  "enabled": true
}
```

当前 `mode` 支持 `api`、`manual`、`semi_auto` 和 `mock`。新建品牌会默认预置豆包、Kimi、DeepSeek、通义千问和阶跃星辰，均保存业务展示名、连接状态、OpenAI-compatible endpoint 候选、默认模型名称候选和手动录入兜底路径；系统同时保留 `manual_input` 和 `mock_ai` 作为人工录入与开发辅助平台。平台配置公共响应使用 `platformCode` 和 `name` 字段标识平台，不返回 `platformKey`。响应返回 `hasCredential` 与 `credentialRefMasked`，用于表达平台密钥配置状态；真实 `credentialRef` 只进入服务端仓储，不在 API 响应中返回。平台配置公共响应还返回 `availableMethods`、`connectionStatus`、`connectionStatusLabel` 和 `nextAction`，用于归类展示“可自动监测”“可用浏览器辅助监测”“可手动录入”“需要配置”以及下一步处理方式。前端平台连接页面优先展示第一版平台，并按上述四类分组；`needs_confirmation` 且包含浏览器能力的平台归入“可用浏览器辅助监测”，用于提示用户授权或确认。编辑弹窗中只保留平台代码、平台名称、调用方式、平台密钥和启用状态为常规字段，接口地址、模型名称、调用限制统一收纳到“高级设置”。`api` 模式校验要求接口地址、模型名称和可用平台密钥三项齐备，失败时返回业务化原因并写入 `lastValidation`。豆包、Kimi、DeepSeek、通义千问和阶跃星辰在 Adapter registry 中都有直接 OpenAI-compatible 映射，带 endpoint 的 `api` 平台会通过对应 `OpenAICompatibleAdapter` 构造 chat completions 请求，模型来自 `modelName`，平台密钥由内部 `credentialRef` 解析。LLM 自动任务未指定平台时优先选择已配置密钥的 `stepfun`，用于内测阶段统一使用阶跃星辰 `step-3.7-flash` 支撑问题生成、回答解读、内容生成和优化计划。

平台状态归类规则：`api` 配置完整且最近校验未失败时返回 `ready`；`semi_auto` 模式返回 `browser_available`，`availableMethods` 为 `['api', 'browser', 'manual']`，`nextAction` 提示补齐平台密钥后可自动监测，也可先用浏览器或手动录入；`manual` 返回 `manual_available`；停用、缺接口地址、缺模型、缺平台密钥或最近校验失败返回 `needs_configuration`，`nextAction` 给出业务化处理建议。

浏览器辅助监测的后端抽象位于 `src/modules/platforms/browser-connectors/`。`BrowserConnector` 为已注册浏览器适配器提供统一契约：`openLoginPage`、`detectLogin`、`sendQuestion`、`waitForAnswer`、`extractAnswer` 和 `stopSession`。返回结果统一包含 `status`、`loginDetected`、`message`、可选 `issueType`、可选 `manualTestPath` 和可选回答字段；验证码、登录失效、页面结构变化、平台限制和风控提示统一返回 `needs_confirmation`，并给出 `/monitoring?platform=:platformCode&mode=manual` 手动录入路径。`FakeBrowserConnector` 用于契约测试，覆盖登录成功、回答成功和需要用户确认的异常分支。

浏览器会话状态通过平台接口暴露：`GET /api/v1/platforms/browser-sessions` 按品牌列出会话摘要；`POST /api/v1/platforms/browser-sessions` 接收 `platformCode` 和可选 `testPlanId`，创建 `opening` 状态会话并保存平台 code、授权品牌范围和可选监测计划 ID；`PATCH /api/v1/platforms/browser-sessions/:sessionId` 接收 `BrowserConnectionStatusInput`，更新登录检测结果、最近操作、最近异常类型、最近提示和最近可用时间。前端浏览器连接向导会打开豆包、Kimi、DeepSeek 或通义千问登录页，提示用户自行登录，登录完成后把会话更新为 `ready` 并写入 `lastAvailableAt`；遇到验证码、登录失效、平台限制或风控时，把会话更新为 `needs_confirmation` 并展示手动录入提示。公共 `BrowserConnectionSession` 只包含 `brandId`、`platformCode`、`status`、`loginDetected`、`authorizedScope`、`lastOperation`、`lastIssueType`、`lastMessage`、`lastAvailableAt`、`createdAt` 和 `updatedAt`，不返回登录信息、浏览器存储、本地配置目录或任何平台密钥。

第一版浏览器 connector 注册在 `BrowserConnectorRegistry`，默认包含 `doubao`、`kimi`、`deepseek` 和 `qianwen`。这些 connector 都实现登录页打开、登录检测、发送问题、等待回答、提取回答和停止会话契约；当前实现使用可测试的浏览器适配边界和平台元数据，返回平台登录页 URL、平台专属 `modelName` 和手动录入路径。阶跃星辰当前走 OpenAI-compatible API 接入候选和手动录入路径。遇到验证码、风控、登录失效、平台限制或页面结构变化时，connector 停止自动化流程并返回 `needs_confirmation`。监测计划执行流程会消费该 registry，成功回答进入 `MonitoringRun`、`AIResponse` 和 `AnalysisResult`，异常回答留在 `browserSteps` 与 `confirmationItems` 中等待用户确认。

第一版默认平台配置如下：

| platformCode | 展示名 | mode | availableMethods | endpointUrl | modelName |
| --- | --- | --- | --- | --- | --- |
| `doubao` | 豆包 | `semi_auto` | `api`、`browser`、`manual` | `https://ark.cn-beijing.volces.com/api/v3/chat/completions` | `doubao-seed-1-6` |
| `kimi` | Kimi | `semi_auto` | `api`、`browser`、`manual` | `https://api.moonshot.cn/v1/chat/completions` | `moonshot-v1-8k` |
| `deepseek` | DeepSeek | `semi_auto` | `api`、`browser`、`manual` | `https://api.deepseek.com/chat/completions` | `deepseek-chat` |
| `qianwen` | 通义千问 | `semi_auto` | `api`、`browser`、`manual` | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | `qwen-plus` |
| `stepfun` | 阶跃星辰 | `api` | `api` | `https://api.stepfun.com/v1/chat/completions` | `step-3.7-flash` |

校验响应由 Adapter registry 选择对应 Adapter 后生成，并保存到平台配置的 `lastValidation`：

```json
{
  "success": true,
  "data": {
    "ok": true,
    "mode": "mock",
    "checkedAt": "2026-07-03T00:00:00.000Z",
    "message": "演示平台可用"
  }
}
```

### GEO 监测运行

```http
GET /api/v1/brands/:brandId/monitoring-runs
POST /api/v1/brands/:brandId/monitoring-runs
GET /api/v1/brands/:brandId/monitoring-runs/:runId
POST /api/v1/brands/:brandId/monitoring-runs/:runId/manual-response
GET /api/v1/brands/:brandId/monitoring-runs/:runId/analysis
POST /api/v1/brands/:brandId/monitoring-runs/:runId/analysis/parse
PATCH /api/v1/brands/:brandId/monitoring-runs/:runId/analysis
x-brand-id: brand_demo
```

创建监测运行：

```json
{
  "promptId": "prompt_001",
  "platformCode": "mock_ai"
}
```

手动录入原始回答：

```json
{
  "rawText": "原始 AI 回答内容",
  "modelName": "manual",
  "citations": ["https://example.com"]
}
```

触发回答解析：

```http
POST /api/v1/brands/:brandId/monitoring-runs/:runId/analysis/parse
```

人工修正解析结果：

```json
{
  "brandMentioned": true,
  "brandRank": 1,
  "sentiment": "positive",
  "accuracyScore": 85,
  "citationScore": 50,
  "platformEvaluation": "平台回答已提及品牌，并包含可追溯引用来源",
  "recommendationReason": "回答明确说明品牌适用场景",
  "rankingReason": "品牌位于第一推荐位置",
  "expressionCompleteness": "核心优势表达完整",
  "expressionDeviation": "暂未识别到表达偏差",
  "competitorMentions": [
    {
      "name": "竞品A",
      "rank": 2,
      "sentiment": "neutral"
    }
  ],
  "reviewRequired": false
}
```

监测运行创建和详情响应直接返回扁平 `MonitoringRunDetail` 对象，不包裹在 `{ "run": ... }` 内。响应包含 `brandId`、`optimizationUnitId`、`intentId`、`promptId`、`platformCode`、`status`、`promptText`、可选 `response` 和可选 `analysis`。`mock` 平台会自动生成原始回答并将运行标记为 `completed`；`manual` 和 `semi_auto` 平台会标记为 `review_required` 等待人工录入；`openai` 平台通过真实 Adapter 执行请求并归一化为 `RunPromptResult`；缺失 Adapter、缺失平台密钥或 provider 错误会记录失败原因和 `retryStatus`。前端监测运行表格展示异步任务状态、重试状态，并在重试耗尽时提示人工录入兜底入口。监测结果解释列会对已解析结果展示“有没有出现”“排第几”“说得准不准”“竞品表现”“需要补什么内容”和“下一步”；对失败、待人工、已有回答待解析和等待结果状态展示原因、影响和下一步操作。解析结果记录品牌提及、推荐顺序、情绪倾向、信息准确性、引用来源、竞品提及、平台评价、推荐理由、排名原因、优势表达完整度、表达偏差和人工复核状态。解析规则会读取品牌名称、别名、品牌档案、竞品列表、推荐表达、禁用表达和引用来源；追光小牛样例会检查是否排第一、`ACE 成长体系`、`贵阳 5 家校区` 和 `世界冠军邓书弟` 等关键信号。业务化解释通过 `platformEvaluation` 输出“有没有出现”和整体判断，通过 `rankingReason` 输出“排第几”“竞品表现”“被压制原因候选项”和“内容补强建议”，通过 `expressionCompleteness` 输出“说得准不准”和“需要补什么内容”。当回答命中禁用表达、高风险承诺、排名无法判断或情绪无法判断时，`reviewRequired` 为 `true`，响应解析状态为 `review_required`；`expressionDeviation` 会输出“需要你确认”和建议改法，例如将“保证长高”改为“在科学运动和规律训练基础上，帮助孩子改善体态、促进身体发育”。前端点击“需要确认”会打开复核弹窗，顶部按风险表达、无法判断排名、无法判断情绪展示确认项和建议动作；用户可编辑“有没有出现”“排第几”“说得准不准”“表达偏差”“竞品提及”等分析字段，并关闭 `reviewRequired` 后保存确认。

### 竞品分析

```http
GET /api/v1/brands/:brandId/competitors
POST /api/v1/brands/:brandId/competitors
PATCH /api/v1/brands/:brandId/competitors/:competitorId
GET /api/v1/brands/:brandId/competitors/analysis
POST /api/v1/brands/:brandId/competitors/discovery-runs
GET /api/v1/brands/:brandId/competitors/discovery-runs/:runId/candidates?filter=all
PATCH /api/v1/brands/:brandId/competitors/candidates/:candidateId/decision
x-brand-id: brand_demo
```

创建或编辑竞品：

```json
{
  "name": "竞品A",
  "aliases": ["竞品甲"],
  "website": "https://competitor.example.com",
  "industryTags": ["GEO"],
  "comparisonNote": "基础监测能力强，内容策略较弱",
  "suppressionRule": {
    "consecutiveThreshold": 2
  }
}
```

竞品分析响应返回 `CompetitorDashboard`，包含竞品档案列表、竞品提及率、竞品压制率、平均排名差、高风险意图和对比明细。对比明细按同 Prompt、同平台、同用户意图和同优化单元聚合，记录品牌排名、竞品排名、排名差、压制状态、推荐理由和引用来源。连续压制达到竞品规则阈值时，后端会生成高优先级 `competitor_response` 内容策略。

竞品发现支持创建发现任务、查询候选和保存人工决策。创建发现任务可传 `city`、`campusRadiusKm`、`keywords`、`sourceProvider` 和 `forceRefresh`；`sourceProvider` 第一版默认 `amap`，服务端只返回配置状态，不返回地图 API Key。发现任务响应包含 `providerStatus`、`providerMessage` 和 `cacheHit`，用于提示高德地图配置状态、配额或故障兜底，以及是否复用缓存候选。未配置真实地图服务时，系统使用内测候选源生成贵阳本地儿童运动线下候选，候选包含来源平台、POI ID、名称、地址、城市、类目、最近校区距离、命中关键词、匹配分、建议标签、匹配理由、置信度和确认状态。候选保存决策时传入 `label`，可选值为 `direct_competitor`、`indirect_competitor`、`local_alternative`、`national_benchmark` 和 `excluded`；确认后的候选会写入竞品档案，排除候选只保留排除原因并写入审计记录。

### 引用分析

```http
GET /api/v1/brands/:brandId/citations
POST /api/v1/brands/:brandId/citations/:citationId/content-asset
POST /api/v1/brands/:brandId/citations/:citationId/enhancement-strategy
x-brand-id: brand_demo
```

绑定内容资产：

```json
{
  "title": "品牌官网介绍",
  "type": "official_page",
  "platform": "official_site",
  "url": "https://example.com/about",
  "targetKeywords": ["品牌介绍"],
  "status": "published"
}
```

引用分析响应返回 `CitationDashboard`，包含引用总数、内容引用率、官网引用率、权威来源占比、来源类型分布、内容引用率趋势、引用来源明细和已绑定内容资产列表。引用来源按 `official_site`、`media`、`social`、`encyclopedia`、`third_party` 分类，并记录 `high`、`medium`、`low`、`unknown` 权威等级。创建引用增强策略会生成 `authority_citation` 类型内容策略，用于后续内容运营闭环。

### 评价分析

```http
GET /api/v1/brands/:brandId/evaluations
POST /api/v1/brands/:brandId/evaluations/:issueId/correction-strategy
POST /api/v1/brands/:brandId/evaluations/:issueId/knowledge
x-brand-id: brand_demo
```

评价分析响应返回 `EvaluationDashboard`，包含样本数、正向表达率、中性表达率、负向表达率、准确表达率、评价趋势、错误表达类型分布和表达问题列表。表达问题类型包括 `misinformation`、`missing_selling_point`、`blocked_expression`、`negative_expression` 和 `low_accuracy`，严重程度包括 `high`、`medium` 和 `low`。

表达问题列表记录原始回答片段、正确表达建议、关联平台、关联 Prompt 和处理状态。创建修正策略会生成 `correction` 类型内容策略；更新品牌知识库会将正确表达建议写入推荐表达，并在错误信息、禁用表达或负向表达场景下把原始片段写入禁用表达。

### GEO 指数

```http
GET /api/v1/brands/:brandId/metrics
GET /api/v1/metrics/brands/ranking?sortBy=totalScore
x-brand-id: brand_demo
```

单品牌指标响应包含 `current`、`trend` 和 `breakdown`。`current` 返回提及分、推荐分、准确分、正向分、引用分、竞品对比分、知识库完整度影响项、总分、样本数和 `insufficientSample`。`breakdown` 按平台、优化单元和用户意图返回分组指数。

多品牌排行支持 `sortBy=totalScore`、`mentionRate`、`top3Rate`、`positiveRate`、`periodChange`，返回用户有权访问品牌的总分、提及率、Top3 推荐率、正向表达率、环比变化和样本状态。

### 报告中心

```http
GET /api/v1/brands/:brandId/reports
POST /api/v1/brands/:brandId/reports
GET /api/v1/brands/:brandId/reports/:reportId
x-brand-id: brand_demo
```

生成报告请求：

```json
{
  "type": "customer_delivery",
  "title": "客户交付报告",
  "periodStart": "2026-07-01",
  "periodEnd": "2026-07-07"
}
```

`type` 支持 `weekly`、`monthly`、`multi_brand` 和 `customer_delivery`。响应返回 `ReportRecord`，包含报告名称、类型、统计周期、生成状态、创建人、Markdown 内容、数据缺口和聚合快照。Markdown 内容开头包含 YAML metadata，记录 `reportType`、品牌标识或品牌数量、统计周期和数据缺口数量。

单品牌报告聚合 GEO 指数、指标解释、平台表现、优化单元表现、竞品表现、引用来源、评价分析、内容缺口、问题归因、行动建议、任务进度和数据缺口。多品牌报告聚合品牌排名、品牌对比、强势平台、薄弱场景、风险提示、交付进度、下一步动作和高优先级问题。客户交付报告使用同一聚合快照生成客户交付版 Markdown 结构。

### 顾问服务

```http
GET /api/v1/brands/:brandId/advisor-records
POST /api/v1/brands/:brandId/advisor-records
x-brand-id: brand_demo
```

创建顾问服务记录请求：

```json
{
  "type": "diagnosis",
  "title": "品牌 GEO 诊断",
  "content": "当前品牌在核心场景中的推荐排序稳定，但引用来源仍需补强。",
  "relatedReportId": "report_001",
  "followUpItems": [
    {
      "title": "补充官网 FAQ 内容",
      "owner": "顾问",
      "dueDate": "2026-07-10",
      "status": "todo"
    }
  ]
}
```

`type` 支持 `diagnosis`、`service_plan`、`review`、`delivery`、`service`、`training`、`rule_update` 和 `note`。响应返回 `AdvisorDashboard` 或 `AdvisorRecord`，包含品牌服务记录、最新诊断、待跟进事项和同品牌可引用报告。`relatedReportId` 只允许引用同品牌报告。

顾问工作台前端会将问题、建议、服务目标、里程碑、负责人、预期结果、完成动作、数据变化和下一步合并为结构化 Markdown 内容写入 `content` 字段。`followUpItems` 继续承载待跟进事项、负责人、截止日期和状态。

### 当前用户

```http
GET /api/v1/permissions/me
```

### 未授权访问记录

```http
GET /api/v1/permissions/denied-access
```

### 审计日志

```http
GET /api/v1/permissions/audit-logs?brandId=:brandId&action=:action&resourceType=:resourceType&result=:result&from=:from&to=:to
```

审计日志响应返回 `AuditLog[]`，包含 `brandId`、`organizationId`、`actorUserId`、`action`、`resourceType`、`resourceId`、`result`、`errorCode`、`metadata` 和 `createdAt`。`metadata` 会过滤 `credentialRef`、`apiKey`、`token`、`password`、`secret` 和 `providerPayload` 等敏感字段。

## 前端 API 封装

前端请求封装位于 `apps/web/src/api/http.ts`。

当前封装行为：

- 自动拼接 `/api/v1` 前缀
- 从 Zustand 品牌上下文读取 `activeBrandId`
- 自动设置 `x-brand-id`
- 返回共享 `ApiResponse<T>` 类型
