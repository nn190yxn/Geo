# 接口文档

## 通用响应结构

所有 API 统一使用 `ApiResponse<T>` 响应结构，定义位于 `当前工作区/packages/shared-types/src/index.ts`。

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

正确性属性 P1 将开始域 `/workspace`、监测域 `/monitoring-runs`、内容域 `/content/generation`、发布域 `/publishing`、分析域 `/evaluations` 和支持工具域 `/advisor-records` 作为代表性主数据查询。对任意生成的合法 `brandId`，请求路径使用 `/brands/:brandId/*`，统一请求层同时从 Zustand 当前品牌上下文注入同值 `x-brand-id`；属性测试要求两处品牌值始终一致。

前端第一版同时支持品牌化路由别名。访问 `/brands/:brandId/dashboard`、`/brands/:brandId/canvas`、`/brands/:brandId/monitoring`、`/brands/:brandId/reports` 等路径时，前端会先把 `brandId` 写入当前品牌上下文，再跳转到第一版对应页面；重定向和业务页内部跳转均保留工作流 query 与 hash，主要页面通过 lazy route modules 加载。监测记录进入分析诊断时以记录的 `runId`、`promptId` 覆盖页面旧值，同时保留问题、优化单元和用户意图上下文。

`/monitoring` 当前产品口径为“AI 回复监测”。该路由继续复用既有监测运行、监测计划和手动答案 API，首屏按关键结论、真实回复数、品牌提及率、Top 3 推荐率、引用命中率和平台回复分布展示；统计范围只包含非 `mock_ai` 且具有原始回复的运行。`platform` query 在全部平台、豆包、Kimi、DeepSeek、通义千问和阶跃星辰之间切换当前分析范围，并同步筛选回复明细和恢复状态。页面从 `TestPlan.connectionSummary`、`PlatformConfig.connectionStatus`、`MonitoringRun.status` 和 `retryStatus` 识别缺少真实回复、浏览器待确认、手动待录入、平台待配置和运行失败，统一返回样本范围、受影响指标、用户可理解原因和目标恢复分区；计划、回复或平台请求失败时保留已加载区域并展示请求错误。自动监测、浏览器辅助监测和手动录入三条真实回复路径持续可见。监测主题与问题、计划执行、回复明细和高级工具通过 Tab 渐进展开，并保留回复解读、平台配置和进入优化或内容任务的现有工作流上下文。

优化单元和用户意图列表通过 `getOptimizationUnitWorkflowPaths` 与 `getUserIntentWorkflowPaths` 集中构造行级 CTA。优化单元入口传递 `optimizationUnitId`；用户意图入口同时传递 `optimizationUnitId`、`intentId` 和可用的 `promptId`，手动检测、自动监测和检测记录附加对应 `mode` 与目标 hash，内容生成和引用来源使用 `workflowStagePath` 保留完整对象上下文。

首页和 `/monitoring` 的真实指标共同使用 `hasRealMonitoringResponseSample`：`platformCode` 必须区别于 `mock_ai`，并且 `response.rawText.trim()` 必须包含内容。API 自动采集、浏览器辅助采集和手动录入回复沿用同一判定；标准答案、内容草稿、仅存在回复对象的空白文本和示例回答保持在指标边界之外。Web 监测摘要与 API 首页摘要分别通过 P3/P4 确定性组合测试锁定该契约，任意边界外对象加入真实样本基线后均不得改变样本数、比率或平台拆分。

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

### Provider 与额度治理

```http
GET /api/v1/brands/:brandId/providers
POST /api/v1/brands/:brandId/providers
```

Provider 摘要只返回组织归属、用途、模型、健康状态、优先级、故障转移顺序和凭据状态。POST 请求保存组织级 BYOK 配置，凭据只接受服务端引用。

LLM 任务执行前由服务端按用户、组织和全局预算执行额度预占。成功调用按实际 token 用量结算并追加账本事件；配置缺失、Provider 不支持或调用失败时释放预占。额度不足响应包含稳定原因、请求量、可公开剩余额度和恢复动作。

异步任务以 `AsyncJob` 持久化任务类型、实体标识、幂等键、当前步骤、进度、重试次数、错误类别和最终结果摘要。相同品牌与幂等键的重复入队返回原任务；终态任务保持结果并拒绝后续状态覆盖。

```http
GET /api/v1/brands/:brandId/runtime-operations
POST /api/v1/brands/:brandId/runtime-operations/jobs/:jobId/retry
POST /api/v1/brands/:brandId/runtime-operations/jobs/:jobId/cancel
```

运行中心只返回当前品牌可访问的 Provider、任务、额度、发布账号和依赖状态。重试操作将失败任务置回队列；取消操作将任务置为 `cancelled` 并保留已有执行信息。

### 周期交付边界

周期编排依次执行站点审计、监测、任务验收、报告与交付包步骤，失败步骤保存业务原因并可从当前步骤恢复。交付包固定引用报告快照，格式 manifest 覆盖 HTML、PDF、Markdown 和 CSV 成功文件。客户读取授权绑定品牌与有效期；多品牌比较需要一致的统计周期、方法口径版本与基线版本。

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
      "role": "operator",
      "capabilities": {
        "role": "operator",
        "applicationPath": "/brands?permissionRequest=1",
        "resources": [
          {
            "resource": "monitoring",
            "canRead": true,
            "canWrite": true,
            "minimumReadRole": "viewer",
            "minimumWriteRole": "operator"
          },
          {
            "resource": "brand",
            "canRead": true,
            "canWrite": false,
            "minimumReadRole": "viewer",
            "minimumWriteRole": "admin"
          }
        ]
      }
    }
  ]
}
```

`capabilities.resources` 由服务端资源权限矩阵生成。前端使用同一摘要控制监测、内容、发布、任务、再次监测和报告写操作；品牌主体、成员和平台配置写操作要求 `admin` 或 `owner`。摘要完整资源集合包含 `brand_workspace`、`brand`、`brand_profile`、`membership`、`platform_config`、`monitoring`、`content`、`publishing`、`task`、`retest`、`analysis`、`report` 和 `organization`。

资源权限不足时返回 HTTP 403，并在统一错误对象中提供申请上下文：

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "BRAND_RESOURCE_FORBIDDEN",
    "message": "当前角色缺少platform_config操作权限，请申请admin角色。",
    "requestId": "request_1",
    "authorization": {
      "resource": "platform_config",
      "currentRole": "viewer",
      "requiredRole": "admin",
      "applicationPath": "/brands?permissionRequest=platform_config"
    }
  }
}
```

### 品牌详情列表

### 官网快速接入会话

快速接入会话按品牌唯一保存，步骤固定为 `website`、`facts`、`questions` 和 `readiness`。viewer 及以上角色可恢复会话，operator 及以上角色可创建和保存步骤。

```http
POST /api/v1/brands/:brandId/quick-start-session
GET /api/v1/brands/:brandId/quick-start-session
PATCH /api/v1/brands/:brandId/quick-start-session/steps/:step
```

创建请求可省略正文，或指定初始步骤：

```json
{
  "currentStep": "website"
}
```

按步骤保存请求必须携带当前 `version`。服务端保存成功后递增版本；版本过期时返回 HTTP 409，客户端应重新读取会话后再编辑。

```json
{
  "version": 1,
  "data": {
    "brandName": "示例品牌",
    "websiteUrl": "https://example.com/",
    "targetMarkets": ["上海"]
  }
}
```

会话返回当前步骤、完成状态、四步草稿、版本和时间字段。`facts.candidates` 中每项均包含稳定 `id`、`field`、`originalValue`、可选 `editedValue`、`confidence`、`status` 和 `source`；来源包含知识来源标识、URL、页面标题及摘录。关键事实全部确认或编辑后，服务端生成 `brand`、`category`、`location`、`buying_decision`、`competitor_comparison` 和 `pain_point` 六类默认问题。问题项携带 `category`、可编辑 `question`、`enabled` 和 `targetPlatforms`。

保存问题步骤后，服务端根据已启用问题和品牌平台配置生成 `readiness`：`targetPlatforms`、`connectionSummary`、`estimatedSampleCount`、`estimatedDurationMinutes`、`executionMethod` 和 `nextStep` 均由服务端计算。准备步骤只接受 `{ "completed": true }`；服务端要求至少启用一个问题，创建现有 `TestPlan` 后写回 `testPlanId` 并完成会话。客户端可将该标识作为 `/monitoring?planId=...` 的上下文，直接恢复首轮计划。

官网步骤只对用户提交的公开 HTTP(S) 首页执行浅层发现，最多跟随三次同源重定向，并限制响应时间、大小和内容类型。发现失败时会话继续保存，`crawlStatus` 和知识来源失败状态用于引导人工确认。

`website.sourcePagePlan` 保存深度抓取前的来源范围。每个 `items` 元素包含稳定 `id`、`url`、`title`、`sourceRole`、`selectionReason`、`included`、`processingStatus` 和可选 `errorMessage`；`sourceRole` 支持 `home | product | about | faq | case | contact | policy | other`，处理状态支持 `planned | processing | completed | failed`。首次保存官网时由服务端根据同源首页链接生成计划；缺少可识别链接时补充确定性候选。再次保存官网步骤时可提交 `sourcePagePlan.items` 调整范围，服务端先移除 fragment、尾斜杠、`utm_*`、`fbclid` 和 `gclid`，排序保留的查询参数，再校验同源、去重、1 至 30 项及至少一个纳入页面，并写回 `confirmedAt`。范围确认期间只保留首页知识来源，不访问候选页面或生成候选页知识片段。

### 站点审计 Adapter 契约

`SiteAuditAdapter.audit(websiteUrl)` 返回 `SiteAuditResult`。该 Adapter 保持后端内部边界，由品牌级站点审计 HTTP API 调用。

```ts
type SiteAuditCheckStatus = 'pass' | 'warning' | 'fail' | 'unavailable';
type SiteAuditCheckKey =
  | 'robots_txt'
  | 'sitemap_xml'
  | 'llms_txt'
  | 'noindex'
  | 'ai_bot_access'
  | 'structured_data'
  | 'extractable_content';

type SiteAuditEvidence = {
  targetUrl: string;
  checkedAt: string;
  httpStatus?: number;
  contentType?: string;
  excerpt?: string;
  errorCode?: string;
};

type SiteAuditCheck = {
  key: SiteAuditCheckKey;
  status: SiteAuditCheckStatus;
  summary: string;
  evidence: SiteAuditEvidence;
};

type SiteAuditResult = {
  websiteUrl: string;
  auditedAt: string;
  checks: SiteAuditCheck[];
};
```

固定检查顺序为 robots.txt、sitemap.xml、llms.txt、noindex、AI Bot 访问、结构化数据和可抽取内容。robots.txt 需要包含有效 `User-agent` 指令，sitemap.xml 需要包含完整 `urlset` 或 `sitemapindex` 根结构，llms.txt 需要包含 Markdown 一级标题，JSON-LD 需要可解析；异常文档返回 `warning`。目标资源访问失败时对应检查返回 `unavailable` 并携带稳定 `SITE_AUDIT_*` 错误码，其他并行检查继续返回已完成结果；安全边界拒绝非 HTTP(S)、URL 凭据、非公开地址、跨源重定向、超过三次重定向、超过 1 MiB 响应和超过 10 秒的整体执行。

`SiteAuditService.audit(websiteUrl)` 在原始结果上增加 `findings` 和 `recommendedTasks`。每个 finding 包含原检查、`low | medium | high | critical` 影响级别、影响说明、修复说明、人工任务模板，以及以下验收规则：

```ts
type SiteAuditCheckerType = 'structure' | 'text' | 'link' | 'response_header';

type SiteAuditCheckerRule = {
  id: string;
  checkKey: SiteAuditCheckKey;
  checkerType: SiteAuditCheckerType;
  targetUrl: string;
  expectedStatus: 'pass';
  description: string;
};
```

`AcceptanceRuleService.execute(websiteUrl, rule, history?)` 每次执行都会重新调用站点审计 Adapter。返回状态为 `passed | failed | unavailable`，同时返回本次 `checkedAt`、真实 `evidence` 和追加本次记录后的 `history`。缺少目标检查时保存 `SITE_AUDIT_CHECK_MISSING`；实时检查证据 URL 与规则目标不一致时保存 `SITE_AUDIT_TARGET_MISMATCH` 并返回 `unavailable`。请求携带已创建修复任务的 `taskId` 时，控制器把该真实结果交给 `AcceptanceHistoryService` 持久化，并在响应的 `taskAcceptance` 中返回任务验收摘要。

`DiagnosticScorePolicyService.scoreAndSave(brandId, audit)` 将站点检查转换为版本化诊断评分并持久化。共享契约如下：

```ts
type DiagnosticScoreDimension = 'schema' | 'meta' | 'content' | 'citation';

type DiagnosticDimensionScore = {
  dimension: DiagnosticScoreDimension;
  rawChecks: SiteAuditCheck[];
  score: number | null;
  configuredWeight: number;
  normalizedWeight: number;
  weightedScore: number;
};

type DiagnosticScoreSnapshot = {
  id: string;
  brandId: BrandId;
  websiteUrl: string;
  rawChecks: SiteAuditCheck[];
  dimensionScores: DiagnosticDimensionScore[];
  normalizedWeights: Record<DiagnosticScoreDimension, number>;
  policy: DiagnosticScorePolicy;
  ruleVersion: string;
  totalScore: number;
  createdAt: string;
};
```

默认 `site-diagnostic-v1` 将 `structured_data` 计入 schema，将 robots.txt、sitemap.xml、noindex 与 AI Bot 访问计入 meta，将 llms.txt 与可抽取内容计入 content；citation 当前保存为空的未测维度。`unavailable` 检查排除在维度平均值之外，完全未测维度的归一权重为 0，其余配置权重重新归一。快照同时保存完整 `DiagnosticScorePolicy`，`reproduce(brandId, snapshotId)` 使用该冻结策略和原始检查复现历史分数。

`TechnicalAssetService.generate(userId, brandId, input)` 是后端内部技术资产生成契约。`input.targetPage` 必须为已确认官网的同源 HTTP(S) 页面；`assetTypes` 可选择以下类型，省略时生成全部六类：

```ts
type TechnicalAssetType =
  | 'llms_txt'
  | 'organization_jsonld'
  | 'faqpage_jsonld'
  | 'article_jsonld'
  | 'faq_content_block'
  | 'deployment_instructions';
```

服务只读取 QuickStart 中状态为 `confirmed` 或 `edited` 的非空事实，编辑事实使用 `editedValue`，`pending`、`rejected` 和被编辑替换的旧值均排除在六类正文和来源快照之外。品牌名称、官网和介绍为生成门禁；每个结果返回 `ContentAsset` 和 `TechnicalAssetVersion`，内容资产保存目标页面、完整来源事实快照、`pending` 审核状态和 `draft` 发布状态，版本记录保存确定性生成正文及版本号。llms.txt 的目标固定为官网根路径 `/llms.txt`，其余资产使用提交的同源目标页面。

站点审计工作台使用以下品牌嵌套路由：

```http
POST /api/v1/brands/:brandId/site-audit
GET /api/v1/brands/:brandId/site-audit/diagnoses/:diagnosisId
POST /api/v1/brands/:brandId/site-audit/technical-assets
POST /api/v1/brands/:brandId/site-audit/checks/:checkKey/recheck
```

首次审计提交 `{ "websiteUrl": "https://example.com" }` 并返回带 `diagnosticScore` 的 `SiteAuditScoredAssessment`，评分快照在响应前完成品牌隔离持久化。诊断读取端点按品牌和快照 ID 使用冻结策略复现历史结果。技术资产端点接受 `GenerateTechnicalAssetsInput`。单项复查提交 `websiteUrl`、与路径 `checkKey` 一致的 `rule`、可选客户端展示历史 `history` 和可选关联修复任务 `taskId`，返回追加真实证据后的 `SiteAuditAcceptanceResult`；路径与规则不一致时返回 400，关联任务不存在时返回 404。三个写入端点分别要求 monitoring、content 和 retest 的 operator 权限。

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

品牌资料上传入口使用 multipart 表单字段 `file`，接受最大 8 MiB 的 Markdown、DOCX 和文本型 PDF。上传在落盘前验证品牌访问权，并校验扩展名、MIME 和文件内容；旧 DOC 提示另存为 DOCX，扫描件 PDF、加密 PDF、损坏文件、二进制 Markdown、超过 200 页的 PDF 和超过 50 万字符的正文返回可理解错误。服务端使用品牌标识和随机 UUID 生成文件名，并将解析路径限制在 `uploads/brand-imports` 根目录内。上传成功后创建状态为 `processing` 的 `KnowledgeSource`，前端自动调用解析接口并展示解析中、待确认、解析失败、失败原因和手动填写兜底状态。解析入口返回 `BrandImportDraft`，Markdown、DOCX 和 PDF 统一提取品牌名称、行业、城市、课程或产品、目标客户、核心卖点、权威背书、FAQ、竞品和禁用表达，并为字段标记置信度；解析失败时来源状态和 `errorMessage` 持久化为 `failed`，重新解析成功时恢复为 `processing`。前端确认区展示高置信字段、待确认字段、来源片段、资料完整度进度和缺失项影响说明，用户编辑字段后确认保存到 `Brand` 和 `BrandProfile`，来源状态更新为 `completed`。

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

后端仓储端口位于 `当前工作区/apps/api/src/modules/permissions/permissions.repository.port.ts`，已新增以下 Sprint 方法签名：

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

产品体验页面模型进一步统一品牌归属。`AnalysisFinding`、`ContentAssetPublishingStats`、`PublishingChannelStats`、`MediaPlatformRule` 和 `PublishingRecordPerformance` 均包含 `brandId`；媒体平台规则写入使用 `MediaPlatformRuleInput`，分析 finding 写入使用 `AnalysisFindingInput`。分析 finding 的 `evidence` 在 memory 和 Prisma 写入路径均执行去空、去重和首尾空白归一化。`PermissionsRepositoryPort` 新增以下可选契约，memory 和 Prisma 仓储均已实现：

- 品牌资料库：`getBrandProfileLibrary`、`saveBrandProfileLibrary`
- 媒体资产：`listBrandMediaAssets`、`createBrandMediaAsset`、`updateBrandMediaAsset`
- 内容资产页面聚合：`listContentAssetPageItems`
- 自有媒体与平台规则：`listOwnedMediaAccounts`、`listMediaPlatformRules`、`createMediaPlatformRule`、`updateMediaPlatformRule`
- 发文统计：`getPublishingChannelStats`
- 分析诊断：`listAnalysisFindings`、`createAnalysisFinding`、`updateAnalysisFinding`、`getAnalysisWorkbenchDashboard`

上述端口均接收 `userId` 与 `brandId`，返回值使用 `MaybePromise<T>` 兼容内存同步仓储和 Prisma 异步仓储。

品牌资料库 HTTP API：

```http
GET /api/v1/brands/:brandId/profile-library
PATCH /api/v1/brands/:brandId/profile-library
```

读取接口聚合 `BrandProfile`、知识来源、媒体素材、内容资产、发布账号和竞品，并返回各资料分区的完整度摘要。更新接口接受 `BrandProfileLibraryInput.profile`，保存后重新聚合资料库；响应中的 `profile.missingFields` 使用业务标签，`profile.completenessPrompts.field` 提供稳定字段 key。两个接口沿用用户与品牌访问校验，无权限或品牌不存在时返回 404。`apps/api/test/profile-library.api.test.ts` 使用真实内存仓储和权限服务验证读取、更新、缺失字段、分区完整度、品牌隔离及拒绝无权限访问。

内容资产页面 HTTP API：

```http
GET /api/v1/brands/:brandId/content-assets
POST /api/v1/brands/:brandId/content-assets
```

创建请求使用 `ContentAssetPageInput`，除标题、类型、平台和链接外，必须至少提供一项有效的 `optimizationUnitId`、`userIntent` 或 `sourceReferences`；空字符串、空白来源标题和 `targetKeywords` 均不满足上下文准入。保存边界通过 P5 的 64 组确定性组合测试锁定。列表响应使用 `ContentAssetPageItem` 聚合审核状态、发布状态、复测计划和发布统计。

页面聚合共享 DTO：

- `BeginnerHomeDashboard`：品牌资料完整度、监测对象数量、真实回复状态、内容任务状态、发布统计、分析风险、结果摘要、当前 Sprint 摘要和下一步动作。`resultSummary` 包含 `recommendationRate`、`averageRank`、`citationHitRate`、`pendingIssueCount`、`sampleSize` 和 `rankedSampleSize`
- `BrandActionDashboard`：复用 `BeginnerHomeDashboard` 并返回当前阶段、唯一主行动、最多三项待办、最近有效样本、本周期效果、失败数据源和聚合时间。每项行动包含分类、业务原因、目标路径、工作流上下文、预期业务价值、可选截止时间及阻断恢复信息
- `MonitoringObjectDashboard`：按优化单元关联用户意图、监测问题、平台推荐度、平均排名、引用率、内容任务和复测状态
- `ContentOperationDashboard`：内容任务、内容模板、品牌素材、内容资产、发布准备、渠道发布统计和再次监测状态
- `PublishingOperationDashboard`：自有媒体账号、平台规则、发布记录、AI 引用、发布后表现、渠道统计和待复测事项
- `AnalysisDiagnosisDashboard`：竞品、评价、信源、事实四类 finding 分组，以及按动作类型、标签和目标 ID 去重的可执行建议

`apps/api/src/modules/dashboards/dashboard.mapper.ts` 提供六个对应的 `buildXxxDashboard` 纯映射函数。映射输入只接收底层模块已读取的数据，输出集合统一按目标 `brandId` 过滤；`realResponseRuns` 参数要求调用方只传入真实 AI 回复、浏览器辅助结果或手动录入的真实回复。行动主页候选按数据阻断、人工确认、执行状态、到期时间、预期业务价值和稳定 ID 排序；资料缺失、待确认、待监测、内容生成、发布、再次监测与结果复盘共享同一行动结构。首页推荐度按具有有效品牌排名的真实回复占比计算，平均排名只使用非空有效排名，引用率按回复引用或正向引用分命中计算，待处理问题统计 `reviewRequired` 分析结果。memory 和 Prisma repository 已接入底层聚合契约，BFF HTTP 接口复用同一组 mapper。

页面 BFF HTTP API 已接入：

```http
GET /api/v1/brands/:brandId/dashboards/home
GET /api/v1/brands/:brandId/dashboards/actions
GET /api/v1/brands/:brandId/dashboards/monitoring-objects
GET /api/v1/brands/:brandId/dashboards/content-operation
GET /api/v1/brands/:brandId/dashboards/publishing-operation
GET /api/v1/brands/:brandId/dashboards/analysis-diagnosis
```

六个接口均返回统一 `ApiResponse<T>`，并要求请求携带与路径品牌一致的 `x-brand-id`。中间件执行品牌访问校验，`DashboardsService` 再次检查用户可访问品牌。`actions` 接口并行聚合品牌资料、优化单元、监测运行、内容工作台、发布看板、任务看板、待确认事项、当前 Sprint、报告看板、发布统计、引用看板和分析 finding；部分来源失败时返回成功数据及按名称排序的 `sourceFailures`，六个核心来源全部失败时返回 HTTP 503、`DASHBOARD_TEMPORARILY_UNAVAILABLE` 和“页面数据暂时无法加载，请稍后重试”。其余接口在底层子数据缺失时返回空数组或省略对应可选看板。首页真实回复统计和监测对象平台数据会排除 `mock_ai`，标准答案与内容草稿继续保持独立对象，不进入真实 AI 回复统计。

行动主页前端使用 `primaryAction` 作为唯一首屏主操作，只显示 `todos` 的前三项；`latestValidSample` 提供最近有效问题与采样时间，`periodEffect` 优先读取最新单品牌冻结报告的周期、有效样本及效果证据，缺少报告时根据当前 Sprint 返回积累中或暂无数据状态。行动 `context` 通过统一工作流路由传递品牌、优化单元、用户意图、问题、Prompt、监测运行、任务、内容任务、版本和发布记录；任务页收到 `taskId` 后将对应任务置顶并高亮。

增长优化前端同时读取 `growth-optimization` 工作台与 `analysis-diagnosis` BFF。`AnalysisDiagnosisDashboard.findingGroups` 按竞品、评价、信源和事实四类返回 finding；每条 finding 使用 `severity`、`evidence`、`userIntent`、`platformCode`、`recommendedActions` 和可选 `relatedTaskId` 生成统一结论卡。`AnalysisRecommendedAction.actionType` 映射到任务、内容生成、品牌资料或再次监测现有路由，路由 query 继续携带优化单元、平台、来源运行和关联任务上下文。

发布运营前端的 `/owned-media`、`/media-platforms` 和 `/publishing` 共同读取 `GET /api/v1/brands/:brandId/dashboards/publishing-operation`。自有媒体列表使用 `accounts` 中的 `platformName`、`authStatus`、`lastAuthorizedAt`、`errorMessage` 和账号级 `stats`，重新授权继续调用 `POST /api/v1/brands/:brandId/publishing/accounts/:accountId/reauthorize`；媒体平台列表直接使用 `platformRules` 中的 `contentFormats`、`intentFit`、`recommendedFrequency`、`coverRatio` 和 `publishingNote`。发布记录工作台组合 `records`、`performance` 和 `pendingRetestItems`，为每条记录展示发布状态、真实链接、发布后表现及再次监测状态；真实发布结果表单要求完整 URL，保存时提交 `published` 状态，随后可进入再次监测任务。账号接入继续调用现有发布账号创建接口，成功后同时失效发布中心和发布运营聚合查询。

平台配置、浏览器会话、LLM 任务、自动化任务包、Sprint 和上述五类页面 BFF 响应统一经过公开响应净化。自由结构中的 `credentialRef`、API Key、授权 token、密码、secret、cookies、storage state、浏览器 profile 路径和 `providerPayload` 会被递归移除；`hasCredential`、`credentialRefMasked`、状态摘要、业务原因、关联 ID 和 token 用量摘要继续保留。Sprint 指标与新手首页指标仅接受非 `mock_ai` 且包含非空 `AIResponse.rawText` 的监测运行，浏览器辅助和手动录入真实回复继续作为有效样本。

`PermissionsRepository` 已实现任务 10.1 新增的全部可选方法。品牌资料库通过现有 profile、知识来源、内容资产、发布账号和竞品集合实时聚合；品牌素材、平台规则和分析 finding 由独立内存集合维护。内容资产页面项从发布记录计算发布状态和统计，从引用来源累加引用次数，并沿内容生成任务、内容策略和增长优化计划关联优化单元、用户意图与复测记录。`listOwnedMediaAccounts` 返回按账号计算的 `stats`，`getPublishingChannelStats` 返回按平台合并的统计，避免多账号重复计数。分析工作台按 `actionType + label + targetId` 去重建议动作。

`PrismaPermissionsRepository` 提供相同聚合语义。`BrandMediaAsset` 保存素材类型、适用平台、用途、来源、审核状态及可选内容任务关联；`MediaPlatformRule` 通过 `[brandId, platform]` 唯一约束保存平台内容规则；`AnalysisFinding` 保存四类 finding、证据、严重程度、建议动作及可选优化单元和任务关联。JSON 字段在仓储边界映射为共享类型数组，所有关联存在性查询同时约束 `brandId`。迁移目录为 `apps/api/prisma/migrations/20260714100000_add_page_aggregation_models/`。

默认 `brand_demo` 已提供知识来源、品牌素材、公众号与官网规则，以及竞品、评价、信源、事实四类分析 finding。演示监测运行仍保留为示例回答来源，不进入真实回复指标聚合。

Sprint 内存仓储已预置 `visibility_sprint_demo_supercalf_first_round` 作为追光小牛演示 Sprint。默认 Sprint 当前阶段为 `content_asset_generation`，关联 `test_plan_demo_supercalf_first_round`、`run_demo_weekly_mock`、`standard_answer_demo_local_recommendation`、`generation_demo_gap`、`publishing_record_demo_gap` 和 `task_demo_growth_retest`，用于 Sprint API 和前端工作台读取演示数据。Prisma 仓储已通过 `visibility_sprints` 表实现同一组 Sprint 方法，字段包括 `steps`、`metric_summary`、`related_question_ids`、`related_test_plan_ids`、`related_monitoring_run_ids`、`related_standard_answer_ids`、`related_content_task_ids`、`related_publishing_record_ids` 和 `related_retest_task_ids`，这些 JSON 字段只保存聚合状态或关联 ID。标准答案通过 `brand_standard_answers` 表持久化，字段包括 `question_id`、`question`、`answer`、`key_points`、`evidence`、`status`、`reviewed_by` 和 `reviewed_at`。

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

前端通过 `AutomationOperatorCard` 统一调用这些接口。品牌工作区、AI 回复监测页和增长优化页提供“让 AI 帮我跑一轮”入口；内容生成页展示平台改写、发布建议和复测建议进度。卡片读取最近一次任务包，使用统一页面分区展示任务包状态、步骤进度、品牌上下文、问题池数量、监测计划数量和确认队列；加载、请求失败、上下文缺失、空任务包、手动录入和步骤失败分别进入共享状态组件。上下文缺失时品牌栏显示“品牌信息暂不可用”，公开可见文本不回退到 `brandId` 或任务包 ID。已完成与已跳过步骤共同计入整体进度，失败状态保留步骤消息和当前步骤恢复入口。确认抽屉继续收口监测问题、分析判断、内容草稿、平台改写、发布建议和手动录入确认；发布建议确认会展示平台、标题和合规提示，方便品牌方确认后创建发布待办。

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

两个接口均接受可选种子词，请求边界会去除空值与重复值，并最多保留 20 个：

```json
{
  "seedWords": ["儿童体能", "贵阳本地推荐"]
}
```

```json
{
  "items": [],
  "missingProfileFields": [],
  "generationNotes": [],
  "source": "llm"
}
```

`items` 是已写入的 `TestTheme[]` 或 `TestQuestionCandidate[]`。主题和候选从 `brand | category | scenario | audience | pain_point | location | buying_decision | competitor_comparison` 八个维度拓展；历史 `age_group | offering | competitor` 继续兼容。问题候选新增以下可选字段：

```ts
type TestQuestionCandidateDiscoveryMetadata = {
  discoveryDimension?: QuestionDiscoveryDimension;
  businessValue?: 'high' | 'medium' | 'low';
  recommendationProbability?: number;
  userStage?: 'awareness' | 'consideration' | 'decision';
  generationRationale?: string;
  generationMethod?: 'deterministic' | 'ai' | 'merged';
  mergedFrom?: string[];
};
```

服务先建立确定性候选，再增量合并 AI 候选；问题文本去除空白和中英文标点后相同的候选会合并目标平台、业务价值、推荐概率和来源。同一维度允许保留多个不同问题，首轮最多返回 8 个高价值候选。AI 调用失败、未配置或输出无效时，`source` 为 `fallback`，每条候选的 `generationMethod` 为 `deterministic`，且 `editable` 保持为 `true`。`source` 为 `llm` 表示批次包含有效 AI 补充；单条候选仍通过 `generationMethod` 区分规则、AI 或合并来源。`missingProfileFields` 返回品牌资料缺失项，`generationNotes` 返回生成说明。

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

执行入口返回 `TestPlanExecutionResult`。系统会根据每个平台的连接摘要分流：`ready + api` 且问题关联 `promptId` 时创建监测运行并写入 `apiRuns`；浏览器可用或半自动平台为关联 `promptId` 的问题预创建 `review_required` 运行，并在 `browserSteps` 返回 `queued` 状态和 `runId`，等待用户辅助采集；浏览器问题缺少 `promptId` 时写入 `needs_confirmation`；手动平台写入 `manualSteps`；未配置平台写入 `configurationItems`。当所有目标平台都缺少可用连接方式时，计划状态为 `needs_configuration`。前端执行后按 API 自动监测、浏览器辅助监测、手动录入、待配置和跳过数量展示摘要，并为浏览器步骤提供复制问题、打开官方平台、确认登录和真实回答回填入口。

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

前端 `/canvas` 将该响应组织为高级关系分析画布，继续使用 `GeoCanvasNode.type` 区分 `optimization_unit`、`user_intent`、`metric` 和 `content_strategy`。节点选择只改变前端详情状态；缩放、定位和首次使用引导不产生接口写入。节点详情通过 `buildNodeWorkflowPaths` 生成连续工作流：真实回复进入 `/monitoring#monitoring-runs-card`，内容动作进入 `/content-generation`，再次监测进入 `/tasks?action=create`；优化对象和用户意图节点会补充 `optimizationUnitId`、`intentId` 与 `question`，已有 `promptId`、`runId`、`taskId` 和 `platformCode` 在对应目标支持时继续保留。

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

前端内容资产管理区读取 `GET /api/v1/brands/:brandId/dashboards/content-operation` 中的 `ContentAssetPageItem[]`。页面在当前品牌集合内组合筛选标题或关键词、资产状态、类型、平台、审核状态、发布状态和复测状态，并展示 `reviewStatus`、`publishStatus`、`retestPlanId` 与 `publishingStats`；继续编辑沿用内容资产更新接口，发布准备进入发布记录页，再次监测携带资产首个目标关键词进入任务复测页。保存资产后同时刷新内容中心与内容运营聚合查询。

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

前端 `/growth-optimization` 页面消费该工作台数据，按优先问题、原因证据、推荐动作、关联内容和复测状态展示计划。关联内容通过 `generationTaskId` 对照 `GrowthOptimizationWorkspace.relatedPublishingRecords` 展示待生成、待发布或已发布状态；复测状态读取计划 `retestAt` 和关联任务最新 `RetestRecord`。页面调用确认计划、内容任务生成、任务状态更新和复测计划接口完成增长优化闭环，并提供更新标准答案依据、进入发布准备和打开关联复测任务入口。

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

前端内容任务管理页同时读取 `GET /api/v1/brands/:brandId/publishing`，按 `PublishingRecord.generationTaskId` 关联内容任务，并使用最新 `status: published` 记录的 `updatedAt` 展示发布时间。列表搜索覆盖任务标题、内容模板、内容策略业务标题、目标平台和关键词；状态与目标平台筛选只作用于前端当前品牌任务集合。关联对象列只展示策略标题、“已关联优化计划”或“随内容策略带入”，不展示策略或计划内部 ID。

前端模板选择层保持现有内容生成 API 契约不变。12 个模板按品牌宣传、问答、案例、教程、对比、科普和渠道内容分类，每个模板只将预设的 `contentType` 与 `targetPlatform` 写入 `ContentGenerationTaskInput`；内容主题、目标关键词、引用资料和复测时间继续由用户在现有创建表单中配置。默认模板及分类切换后的首个模板会同步对应表单值。

内容创作台展示状态通过前端 `getContentCreationWorkspaceState` 映射：初始请求为 `loading`，业务错误为 `error`，缺少当前任务为 `empty`，存在任务为 `ready`。任务自身的 `pending`、`running`、`failed` 和 `completed` 继续使用现有 `ContentGenerationTask.status`，右侧根据任务步骤和当前版本展示生成进度、失败重试或草稿编辑。该展示状态不增加 API 字段；生成失败时保留左侧表单值，重试继续调用现有 `POST /api/v1/brands/:brandId/content/generation/tasks/:taskId/retry`。

`/content-optimization` 继续复用内容生成任务接口。用户可选择 `GET /api/v1/brands/:brandId/content` 返回的现有资产，或直接粘贴文章、FAQ、社媒文案和页面正文；结构优化、事实补强、FAQ 补充、引用补强和渠道适配目标与来源内容统一序列化到现有 `ContentGenerationTaskInput.referenceSources`。后端任务、版本、重试、导出和发布接口保持不变，前端根据任务草稿、引用资料和目标平台生成结构、事实、FAQ、引用和渠道五类可解释建议。

内容创建和优化提交前通过 `getContentTaskConfigurationIssues` 执行业务校验：两种模式都要求内容策略，优化模式额外要求现有内容资产或粘贴原文至少存在一项，并要求至少一个优化目标。创建发布记录成功后，`getContentPublishPreparationPath` 使用统一 `workflowStagePath` 进入 `/publishing`，保留来源 query 中的优化单元、用户意图、监测运行、优化计划和内容任务上下文，并写入生成任务、版本、发布记录及 `tab=records`。

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
PATCH /api/v1/brands/:brandId/publishing/accounts/:accountId/mode
POST /api/v1/brands/:brandId/publishing/records
POST /api/v1/brands/:brandId/publishing/records/:recordId/execute
PATCH /api/v1/brands/:brandId/publishing/records/:recordId/status
```

发布中心响应返回 `PublishingDashboard`，包含发布平台列表、发布账号和发布记录。当前平台列表包含公众号、头条号、搜狐号和百家号，并展示每个平台的账号数量和授权异常状态。

接入发布账号：

```json
{
  "platform": "wechat",
  "accountName": "品牌公众号",
  "loginMode": "oauth",
  "publishingMode": "assisted",
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

创建发布记录时，后端会校验账号、内容生成任务和内容版本属于当前品牌；若请求来自内容生成发布入口且未传 `contentAssetId`，会自动创建草稿状态的内容资产，再把发布记录关联到该内容资产。公共创建请求的 `status` 仅接受 `draft | pending`，其余值不会进入新记录。授权异常可通过账号状态接口记录 `errorMessage`，重新授权接口会把账号状态恢复为 `connected` 并刷新最近授权时间。账号发布模式为 `manual | assisted | automatic`：人工模式沿用真实结果回填，半自动模式由用户调用执行接口，自动模式在记录创建后调用同一执行链。历史账号和记录迁移后默认使用 `manual`。

直连执行要求账号状态为 `connected`、账号模式为半自动或自动、记录与账号平台一致且标题正文完整。`PublishingRecordStatus` 在原有 `draft | pending | published | failed` 基础上增加 `queued | publishing`；这两个执行中状态仅由服务内部使用 `PublishingExecutionStatusInput` 写入。公共状态接口使用 `PublishingStatusInput`，仅接受 `draft | pending | published | failed`，并忽略 `externalPlatformId`、`lastAttemptAt` 和 `publishedAt` 等内部字段；人工提交 `published` 时必须同时提供有效 HTTP(S) `publishedUrl`，仓储会补写 `publishedAt`。执行使用记录 ID 作为 `idempotencyKey`，成功后保存 `externalPlatformId`、`publishedUrl`、`lastAttemptAt` 和 `publishedAt`。仅当记录同时为 `published` 且包含可验证的真实链接时，再次执行才返回 `already_published` 并跳过 Adapter。授权、账号、模式、平台、内容或 Adapter 前置条件失败以及 Adapter 调用失败都会写回 `failed` 记录和可见错误，避免记录已创建后只返回服务端异常。

默认平台无关实现从服务端 `GEO_PUBLISHING_WEBHOOKS` 读取 JSON 配置，键为平台 code，值包含 `endpointUrl` 和可选 `authorizationToken`。Webhook 请求使用 `Idempotency-Key` 请求头并传递品牌、账号、平台、标题和正文；上游必须返回有效 HTTP(S) `publishedUrl`，可同时返回 `externalPlatformId`。该配置只存在于服务端运行环境，公开账号和发布记录响应均不包含 endpoint 或 token。

`/publishing` 的筛选在前端当前品牌集合内执行，`q` 匹配标题、正文、账号和真实链接，`status` 匹配发布状态，`channel` 匹配发布渠道；筛选写回 URL 时保留来源工作流 query。新建发布准备记录时，前端要求选择授权状态为 `connected` 的发布账号，并在选择账号后同步其目标平台；当前品牌没有可用账号时显示前往自有媒体接入或恢复授权的提示。半自动记录显示“立即发布”，自动记录由创建响应直接返回执行后的状态，排队和发布中状态均可筛选。人工模式继续支持录入真实外部链接；安排再次监测通过 `workflowStagePath('/tasks', ...)` 保留完整工作流上下文。

### 任务复测

```http
GET /api/v1/brands/:brandId/tasks
POST /api/v1/brands/:brandId/tasks
PATCH /api/v1/brands/:brandId/tasks/:taskId
POST /api/v1/brands/:brandId/tasks/:taskId/retest
POST /api/v1/brands/:brandId/tasks/:taskId/retest/:recordId/execute
PATCH /api/v1/brands/:brandId/tasks/:taskId/retest/:recordId
GET /api/v1/brands/:brandId/tasks/:taskId/acceptance
```

任务看板返回 `TaskBoardDashboard`，包含当前品牌的 `tasks` 和按 `todo`、`doing`、`review`、`retest`、`done`、`reopened` 聚合的 `statusCounts`。

复测证据达到可判定状态后，`TasksController` 将实际分、目标分、来源运行、复测运行、执行状态、证据缺口和改善结论交给 `AcceptanceHistoryService`。站点审计 checker 使用同一服务记录二值进度。验收共享契约如下：

```ts
type TaskAcceptanceStatus = 'passed' | 'failed' | 'unavailable';

type TaskAcceptanceSnapshot = {
  id: string;
  brandId: BrandId;
  taskId: string;
  checkerId: string;
  status: TaskAcceptanceStatus;
  progressValue: number;
  targetValue: number;
  evidence: Record<string, unknown>;
  checkedAt: string;
  createdAt: string;
};

type TaskAcceptanceHistory = {
  brandId: BrandId;
  taskId: string;
  firstProgress: TaskAcceptanceSnapshot;
  currentProgress: TaskAcceptanceSnapshot;
  targetValue: number;
  evidenceHistory: TaskAcceptanceSnapshot[];
};
```

`GET /tasks/:taskId/acceptance` 按当前用户和品牌校验任务访问权限，按 `checkedAt`、`createdAt` 升序返回只追加历史。首次记录固定为 `firstProgress`，最新记录固定为 `currentProgress`，`targetValue` 取最新验收目标。checker 通过时任务状态更新为 `done`；历史存在通过记录后再次失败时更新为 `reopened`，历史通过记录继续保留；不可判定结果只进入证据历史。

前端 `/tasks` 将底层任务状态与最新 `RetestRecord`、可用的 `SprintRetestTrendItem` 聚合为四类行动状态：尚未进入复测的任务为“待处理”，已有复测计划或底层状态为 `retest` 的任务为“待复测”，`passed` 或 `improved` 为真以及趋势状态为 `improved` 的任务为“已改善”，已重开、复测未通过或趋势要求继续跟进的任务为“继续优化”。列表优先使用 Sprint 趋势项中的 `publishingRecord`、`beforeMetrics` 和 `afterMetrics`，缺少趋势项时使用任务自身最新复测记录。筛选使用 `q` 和四类行动 `status`，写回 URL 时保留发布记录及其他工作流上下文。执行同题再次监测通过 `workflowStagePath('/monitoring', ...)` 传递任务、优化单元、用户意图、Prompt、监测运行、优化计划、内容任务、版本、发布记录和平台上下文，并定位 `monitoring-runs-card`。

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
  "plannedAt": "2026-07-10T00:00:00.000Z",
  "targetScore": 85,
  "notes": "复测原始监测问题是否改善"
}
```

计划创建后，`RetestRecord.status` 为 `planned`，`retestRunId` 保持为空。`RetestPlanInput.retestRunId` 只用于旧调用类型兼容，控制器与仓储均忽略该字段。

启动再次监测：

```http
POST /api/v1/brands/brand_demo/tasks/task_demo/retest/retest_demo/execute
```

执行接口读取基线运行的 Prompt 和目标平台并创建新的 `MonitoringRun`，随后回写 `retestRunId`。新运行必须与 `sourceRunId` 不同且属于同一品牌；重复执行已有 `retestRunId` 的记录会被拒绝。

刷新证据验收并补充目标值或备注：

```json
{
  "targetScore": 85,
  "notes": "根据真实监测证据刷新验收结果"
}
```

`RetestResultInput.actualScore` 已废弃，服务端不会读取人工实际分。证据验收使用共享真实样本边界：再次监测运行必须包含非 `mock_ai` 且原始文本非空的回答，基线和再次监测运行均必须完成分析。状态按证据推进为 `planned`、`collecting`、`analyzing`、`improved`、`unchanged` 或 `regressed`；历史 `sourceRunId === retestRunId` 的记录返回 `evidenceGap: historical_same_run`，缺基线、真实回答或分析时分别返回 `missing_source_run`、`missing_real_response` 或 `missing_analysis`。

证据完整后，服务端从两次分析派生 `beforeMetrics`、`afterMetrics` 和 `metricDelta`，指标固定为提及率 `mentionRate`、品牌排名 `brandRank`、表达准确率 `accuracyScore` 和引用率 `citationRate`。`actualScore` 为四项标准化得分的等权平均，未进入排名时排名得分为 0。只有状态为 `improved` 且 `actualScore >= targetScore` 时任务通过并关闭；持平、退化或未达到目标时任务变为 `reopened`，并根据指标缺口生成 `nextSuggestion`。

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
POST /api/v1/platforms/browser-sessions/:sessionId/responses
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

当前 `mode` 支持 `api`、`manual`、`semi_auto` 和 `mock`。新建品牌会默认预置豆包、Kimi、DeepSeek、通义千问和阶跃星辰，均保存业务展示名、连接状态、OpenAI-compatible endpoint 候选、默认模型名称候选和手动录入兜底路径；系统同时保留 `manual_input` 和 `mock_ai` 作为手动录入与开发辅助平台。公开新增入口只提供自动监测、浏览器辅助监测和手动录入；历史 `mock` 配置显示为“示例回答（不计入指标）”，不能作为新的监测方式创建。平台配置公共响应使用 `platformCode` 和 `name` 字段标识平台，不返回 `platformKey`。响应返回 `hasCredential` 与 `credentialRefMasked`，用于表达平台密钥配置状态；真实 `credentialRef` 只进入服务端仓储，不在 API 响应中返回。平台配置公共响应还返回 `availableMethods`、`connectionStatus`、`connectionStatusLabel` 和 `nextAction`，用于归类展示“可自动监测”“可用浏览器辅助监测”“可手动录入”“需要配置”以及下一步处理方式。前端平台卡片 view model 只保留配置 ID、展示名、连接状态、监测方式、最近验证摘要和下一步，不携带完整配置或 `lastValidation.message`；卡片只提供一个连接或管理动作。连接检查、平台密钥、接口地址、模型名称和调用限制统一位于管理弹窗。`needs_confirmation` 且包含浏览器能力的平台归入“可用浏览器辅助监测”，用于提示用户授权或确认。`api` 模式校验要求接口地址、模型名称和可用平台密钥三项齐备，失败时返回业务化原因并写入 `lastValidation`。豆包、Kimi、DeepSeek、通义千问和阶跃星辰在 Adapter registry 中都有直接 OpenAI-compatible 映射，带 endpoint 的 `api` 平台会通过对应 `OpenAICompatibleAdapter` 构造 chat completions 请求，模型来自 `modelName`，平台密钥由内部 `credentialRef` 解析。LLM 自动任务未指定平台时优先选择已配置密钥的 `stepfun`，用于内测阶段统一使用阶跃星辰 `step-3.7-flash` 支撑问题生成、回答解读、内容生成和优化计划。

平台状态归类规则：`api` 配置完整且最近校验未失败时返回 `ready`；`semi_auto` 模式返回 `browser_available`，`availableMethods` 为 `['api', 'browser', 'manual']`，`nextAction` 提示补齐平台密钥后可自动监测，也可先用浏览器或手动录入；`manual` 返回 `manual_available`；停用、缺接口地址、缺模型、缺平台密钥或最近校验失败返回 `needs_configuration`，`nextAction` 给出业务化处理建议。

浏览器辅助监测的后端抽象位于 `src/modules/platforms/browser-connectors/`。`BrowserConnector` 为已注册浏览器适配器提供统一契约：`openLoginPage`、`detectLogin`、`sendQuestion`、`waitForAnswer`、`extractAnswer` 和 `stopSession`。返回结果统一包含 `status`、`loginDetected`、`message`、可选 `issueType`、可选 `manualTestPath` 和可选回答字段；验证码、登录失效、页面结构变化、平台限制和风控提示统一返回 `needs_confirmation`，并给出 `/monitoring?platform=:platformCode&mode=manual` 手动录入路径。`FakeBrowserConnector` 用于契约测试，覆盖登录成功、回答成功和需要用户确认的异常分支。

浏览器会话状态通过平台接口暴露：`GET /api/v1/platforms/browser-sessions` 按品牌列出会话摘要；`POST /api/v1/platforms/browser-sessions` 接收 `platformCode` 和可选 `testPlanId`，创建 `login_required` 状态会话并保存平台 code、授权品牌范围和可选监测计划 ID；`PATCH /api/v1/platforms/browser-sessions/:sessionId` 接收 `BrowserConnectionStatusInput`，客户端只提交 `login_confirmed`、`issue_reported`、`answer_captured` 或 `session_stopped` 事件，服务端状态机推导目标状态、登录检测结果、最近操作和最近可用时间。`POST /api/v1/platforms/browser-sessions/:sessionId/responses` 接收 `runId`、`rawText`、可选 `modelName` 和 `citations`；服务端要求会话处于 `ready`，并联合校验会话品牌、授权计划、计划运行清单和平台 code，成功后保存真实回答、触发分析并记录 `answer_captured`。公共 `BrowserConnectionSession` 只包含 `brandId`、`platformCode`、`status`、`loginDetected`、`authorizedScope`、`lastOperation`、`lastIssueType`、`lastMessage`、`lastAvailableAt`、`createdAt` 和 `updatedAt`，不会返回登录信息、浏览器存储、本地配置目录或任何平台密钥。

第一版浏览器 connector 注册在 `BrowserConnectorRegistry`，默认包含 `doubao`、`kimi`、`deepseek` 和 `qianwen`。这些 connector 实现登录页打开、登录检测、发送问题、等待回答、提取回答和停止会话契约，作为后续受控平台适配扩展边界；当前真实执行路径采用用户辅助流程，由用户主动在官方平台登录和提交问题，再将完整回答回填到绑定会话。阶跃星辰当前走 OpenAI-compatible API 接入候选和手动录入路径。验证码、风控、登录失效、平台限制或页面结构变化通过 `issue_reported` 事件进入确认或过期状态，系统不会尝试绕过平台验证。

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
  "platformCode": "deepseek",
  "modelName": "deepseek-chat",
  "collectionMethod": "api",
  "searchEnabled": false,
  "market": "CN",
  "language": "zh-CN",
  "evidenceLevel": "reproducible_api",
  "manualConfirmed": null,
  "baselineVersion": "baseline-1"
}
```

手动录入原始回答：

```json
{
  "rawText": "原始 AI 回答内容",
  "modelName": "manual",
  "citations": ["https://example.com"],
  "searchEnabled": null,
  "market": "CN",
  "language": "zh-CN",
  "manualConfirmed": true,
  "baselineVersion": "baseline-1"
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

监测运行创建和详情响应直接返回扁平 `MonitoringRunDetail` 对象，不包裹在 `{ "run": ... }` 内。响应包含 `brandId`、`optimizationUnitId`、`intentId`、`promptId`、`promptKind`、`status`、`promptText`、可选 `response` 和可选 `analysis`。`promptKind` 支持 `discovery | brand_probe`；运行及回答均包含 `MeasurementScope`，其中 `clientSurface` 支持 `api | web | app | unknown`，`collectionMethod` 支持 `api | browser | manual | mock | unknown`，`evidenceLevel` 支持 `manual_or_browser | reproducible_api | demo | unknown`。`searchEnabled` 与 `manualConfirmed` 使用 `boolean | null`，其中 `null` 明确表示未知。运行层冻结问题类型与计划条件，回答层冻结实际访问端和采集条件；API worker 固定写入 API 访问端，浏览器采集默认写入 Web 访问端，无法识别时写入 `unknown`。手工 HTTP 入口始终归类为 `manual_or_browser`。服务端按品牌规范名、别名和官网域名确定性识别品牌探测题；候选问题或 Prompt 文本更新时重新分类，显式 `promptKind` 可保留用户复核结果。

### 原始样本证据

```http
GET /api/v1/brands/:brandId/analysis-diagnosis/sample-evidence?runIds=run_1,run_2
x-brand-id: brand_demo
```

`runIds` 可省略；省略时返回当前品牌最多 100 条范围内可回放的真实回答。服务端重新执行品牌访问校验，并只从当前品牌的 `MonitoringRunDetail` 解析样本。响应中的 `measurementStatus` 为 `unmeasured | insufficient | valid`，分别对应零条、一至两条、至少三条有效原始回答。`missingRunIds` 同时包含已失效引用和当前尚无非空真实回答的运行。

```json
{
  "success": true,
  "data": {
    "brandId": "brand_demo",
    "measurementStatus": "insufficient",
    "requestedRunIds": ["run_1"],
    "missingRunIds": [],
    "items": [
      {
        "runId": "run_1",
        "promptId": "prompt_1",
        "promptKind": "discovery",
        "question": "哪个儿童运动品牌值得推荐？",
        "platformCode": "doubao",
        "modelName": "model-name",
        "collectedAt": "2026-08-03T01:00:00.000Z",
        "rawAnswer": "原始 AI 回答",
        "citations": ["https://example.com/source"],
        "analysis": {},
        "measurementScope": {
          "platformCode": "doubao",
          "modelName": "model-name",
          "collectionMethod": "browser",
          "clientSurface": "web",
          "searchEnabled": true,
          "market": "CN",
          "language": "zh-CN",
          "evidenceLevel": "manual_or_browser",
          "manualConfirmed": true,
          "baselineVersion": "baseline-1"
        }
      }
    ]
  }
}
```

样本证据返回运行冻结的 `promptKind`，并优先返回 `AIResponse` 冻结的实际访问端、采集条件和 `respondedAt`。`SampleEvidencePanel` 展示问题类型、API/Web/App 访问端和完整测量条件，并在指标摘要、回答日期趋势点、平台分布、分析 finding 和再次监测任务中按需调用该接口。

### 可比基线与观察归因

```http
GET /api/v1/brands/:brandId/analysis-diagnosis/measurement-discipline
POST /api/v1/brands/:brandId/analysis-diagnosis/measurement-attribution
```

测量纪律接口只聚合具有非空真实回答和分析结果的运行，使用回答级平台、模型、访问端、采集方式、联网状态、市场和语言判断可比性。响应新增 `promptBreakdown`：`discovery` 只返回 `mention_rate`、`first_rate` 和 `top3_rate`；`brandProbe` 独立返回 `recognition_rate`、`fact_accuracy` 和 `owned_domain_citation_rate`；`series` 按问题类型与完整测量条件输出互相隔离的指标序列及运行证据。官网引用仅在引用 URL 主机等于官网主机或属于其子域时计入。

同一响应包含 `compositeMetric`、`platformComparisons` 和 `metricTrends`。`compositeMetric` 返回各子指标配置权重、仅针对已测项的归一权重和复合值；`platformComparisons` 在同市场至少存在两个有效且结果有差异的平台时返回强弱平台，其余场景标记 `insufficient_sample` 并给出原因；`metricTrends` 按完整 `MeasurementScope` 与基线隔离快照，单次变化为 `single_period_observation`，连续两次同向变化为 `upward_trend` 或 `downward_trend`，未测快照会重置连续计数。所有结果携带 `runIds` 供原始样本回放。

任务复测在实际指标尚未生成时向验收历史写入 `pending_measurement`，前端可将其展示为“待补测”；该状态只追加证据，不关闭或重开任务。

归因写入请求保存 `baselineWindowStart`、`baselineWindowEnd`、`observationWindowStart`、`observationWindowEnd`、`controlQuestions`、`externalEvents` 和可选 `conclusion`。外部事件类别支持 `campaign | model_update | platform_rule | other`。服务端校验窗口日期及先后顺序、去重对照问题，并将 `conclusionType` 固定保存为 `observational_correlation`；每次写入追加一条记录，测量纪律接口返回当前品牌最新记录。

### 竞品主题与真实信源机会地图

```http
GET /api/v1/brands/:brandId/analysis-diagnosis/opportunity-map
x-brand-id: brand_demo
```

接口只消费 `hasRealMonitoringResponseSample` 判定为有效的当前品牌真实回复，排除 `mock_ai` 和空回答。响应状态使用 `unmeasured | insufficient | valid`；零条为未测，一至两条为样本不足，至少三条为有效样本。

```json
{
  "success": true,
  "data": {
    "brandId": "brand_demo",
    "measurementStatus": "valid",
    "sampleCount": 3,
    "questionDimensions": [
      { "dimension": "brand", "questionCount": 1 }
    ],
    "diagnosticTypes": [
      { "type": "brand_absent", "opportunityCount": 1 }
    ],
    "competitorThemes": [
      {
        "competitorName": "竞品A",
        "theme": "课程与师资信源更完整",
        "evidenceCount": 2,
        "platformDistribution": [{ "platformCode": "doubao", "sampleCount": 2 }],
        "questionExamples": ["儿童运动机构怎么选？"],
        "runIds": ["run_1", "run_2"]
      }
    ],
    "citedDomains": [
      {
        "domain": "example.com",
        "sourceType": "official_site",
        "citationCount": 2,
        "runCount": 2,
        "platformDistribution": [{ "platformCode": "doubao", "sampleCount": 2 }],
        "positions": [{ "runId": "run_1", "question": "儿童运动机构怎么选？", "platformCode": "doubao", "citationIndex": 1, "label": "回答引用列表第 1 位", "url": "https://example.com/faq" }],
        "contentAssetCovered": true
      }
    ],
    "channelRecommendations": [],
    "contentOpportunities": [],
    "generationMethod": "deterministic"
  }
}
```

`OpportunityDiagnosticType` 固定为 `brand_absent | competitor_dominant | content_gap | fact_inconsistent`，响应中的 `contentOpportunities` 按该顺序排列，同类机会再按 `high | medium | low` 排列。重复问题会合并证据和 `runIds`。`competitorThemes` 和 `competitor_dominant` 只聚合正式竞品、样本确认候选或用户确认候选；待确认和排除候选的原始提及继续保留在样本分析中供复核。引用域名按引用次数排序，`positions` 使用原始 `AIResponse.citations` 数组顺序生成“回答引用列表第 N 位”摘要；当前数据模型不提供正文字符级引用位置。

渠道依据 `OpportunityChannelBasis` 支持 `brand_sample | industry_sample | industry_reference`。已被当前内容资产覆盖的真实引用域名标记为当前品牌样本依据，其余实际引用域名标记为行业真实样本依据；实际域名不足三个时，响应补充最多三个 `industry_reference`，其 `evidenceCount` 固定为 0，并在 `rationale` 中提示后续真实样本验证。前端 `OpportunityMapPanel` 在优化建议页展示样本状态、竞品主题、平台分布、真实引用位置、渠道依据和四类内容机会。

### 渠道建设蓝图与 30/60/90 路线图

```http
GET /api/v1/brands/:brandId/analysis-diagnosis/channel-roadmap
x-brand-id: brand_demo
```

响应使用 `ChannelRoadmap` 契约，包含品牌、样本状态、样本数、生成时间和确定性路线图项。每个 `ChannelRoadmapItem` 展示 `channelCode`、渠道名称、可选目标域名、内容形态、建议数量、发布节奏、负责角色、优先级、推荐依据、执行窗口和覆盖状态。

```json
{
  "success": true,
  "data": {
    "brandId": "brand_demo",
    "measurementStatus": "valid",
    "sampleCount": 3,
    "items": [
      {
        "id": "roadmap-domain-example.com",
        "channelCode": "example.com",
        "channelName": "品牌官网",
        "domain": "example.com",
        "contentFormats": ["官网 FAQ", "产品页"],
        "recommendedQuantity": 4,
        "cadence": "每月更新 2-4 次",
        "ownerRole": "品牌内容负责人",
        "priority": "high",
        "evidence": ["真实回答引用该域名", "2 次真实样本引用"],
        "window": "0_30_days",
        "coverageStatus": "sample_covered"
      }
    ],
    "generatedAt": "2026-08-04T00:00:00.000Z",
    "generationMethod": "deterministic"
  }
}
```

`ChannelRoadmapWindow` 固定为 `0_30_days | 30_60_days | 60_90_days`，分别承接高、中、低优先级动作。`ChannelRoadmapCoverageStatus` 固定为 `sample_covered | planned`；只有有效真实样本实际引用目标域名时才返回 `sample_covered`。域名匹配先规范化 URL 或 hostname、大小写、`www.` 和尾点，再按精确域名或父子域名边界匹配，类似 `brand.example.com.evil.test` 的后缀拼接不会视为覆盖。服务优先使用持久化媒体平台规则的内容形态和推荐频率，其余渠道使用来源类型默认规则，并用现有渠道内容资产抵扣建议新增数量。前端 `ChannelRoadmapBoard` 在优化建议页按三个窗口展示完整动作字段。

### 竞品分析

```http
GET /api/v1/brands/:brandId/competitors
POST /api/v1/brands/:brandId/competitors
PATCH /api/v1/brands/:brandId/competitors/:competitorId
GET /api/v1/brands/:brandId/competitors/analysis
POST /api/v1/brands/:brandId/competitors/discovery-runs
GET /api/v1/brands/:brandId/competitors/discovery-runs/:runId/candidates?filter=all
PATCH /api/v1/brands/:brandId/competitors/candidates/:candidateId/decision
POST /api/v1/brands/:brandId/competitors/opportunities/:promptId/content-task
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

竞品分析响应返回 `CompetitorDashboard`，包含竞品档案列表、候选列表、竞品提及率、竞品压制率、平均排名差、高风险意图、对比明细、问题机会和各竞品按市场分组的 Top 3 平台。对比明细按同 Prompt、同平台、同用户意图和同优化单元聚合，记录品牌排名、竞品排名、排名差、压制状态、推荐理由、引用来源及 `capturedAt` 真实监测采集时间。前端使用 `capturedAt` 按日期生成竞品趋势，并按 `runId` 去重计算当前范围的品牌平均推荐排名、压制风险和 AI 平台矩阵；竞品提及率继续使用后端基于全部真实监测样本计算的整体口径。连续压制达到竞品规则阈值时，后端会生成高优先级 `competitor_response` 内容策略。

竞品发现支持创建发现任务、查询候选和保存人工决策。创建发现任务可传 `city`、`campusRadiusKm`、`keywords`、`sourceProvider` 和 `forceRefresh`；`sourceProvider` 第一版默认 `amap`，服务端只返回配置状态，不返回地图 API Key。发现任务响应包含 `providerStatus`、`providerMessage` 和 `cacheHit`，用于提示高德地图配置状态、配额或故障兜底，以及是否复用缓存候选。未配置真实地图服务时，系统使用内测候选源生成贵阳本地儿童运动线下候选，候选包含来源平台、POI ID、名称、地址、城市、类目、最近校区距离、命中关键词、匹配分、建议标签、匹配理由、置信度和确认状态。候选保存决策时传入 `label`，可选值为 `direct_competitor`、`indirect_competitor`、`local_alternative`、`national_benchmark` 和 `excluded`；确认后的候选会写入竞品档案，排除候选只保留排除原因并写入审计记录。

候选证据生命周期使用 `candidate | sample_confirmed | user_confirmed | excluded`。Dashboard 读取时会用真实、非演示回答中的候选名称、正式竞品名称和别名命中幂等补齐 `evidenceSampleIds`，首次命中将候选提升为 `sample_confirmed`；人工确认将其提升为 `user_confirmed`，排除后停止进入证据匹配。统一确认集合按 NFKC、去首尾空白和大小写无关规则匹配正式名称与别名。分析机会、竞品 dashboard、内容策略建议、内容任务和报告竞品摘要只消费样本确认、用户确认或已建档竞品。

`questionOpportunities` 按 Prompt 聚合真实样本。品牌提及率为 0 且存在已确认竞品时返回 `competitor_loss`；品牌被提及且已确认竞品均未出现时返回 `brand_exclusive`。每项返回问题、样本量、品牌提及率、已确认竞品名称和证据运行 ID。`topPlatformsByCompetitor` 按竞品与市场计算各平台的 `mentionSampleCount / comparableSampleCount` 和提及率，只保留提及率最高的三个平台。内容任务接口接受可选 `targetPlatform`，创建 `competitor_response` 策略和 `competitor_comparison` 任务，并在引用资料中冻结机会类型、Prompt 和监测运行证据。

### 搜索需求快照

```http
GET /api/v1/brands/:brandId/demand-snapshots
POST /api/v1/brands/:brandId/demand-snapshots
POST /api/v1/brands/:brandId/demand-snapshots/:snapshotId/candidates/:candidateId/confirm
x-brand-id: brand_demo
```

百度或 Google 搜索补全采集请求：

```json
{
  "seedTerm": "儿童体能",
  "source": "baidu",
  "market": "中国"
}
```

人工候选录入请求：

```json
{
  "seedTerm": "儿童体能",
  "source": "manual",
  "market": "贵阳",
  "candidateQuestions": ["儿童体能训练有哪些项目", "贵阳儿童体能课怎么选"]
}
```

列表和采集接口返回 `SearchDemandSnapshot[]` 或单个 `SearchDemandSnapshot`。快照保存词根、来源、市场、采集时间、上一可比快照和候选问句；候选保存规范化问句、`candidate | confirmed` 状态及 `risingObservation`。服务仅比较同品牌、同规范化词根、同来源和大小写无关同市场的上一快照，首次采集不标记上升，后续新增问句标记为需求上升观察。历史快照保持只追加。

确认接口返回 `SearchDemandCandidateConfirmationResult`，包含更新后的快照、已确认候选和 `TestQuestionPoolItem`。确认操作按规范化问句幂等复用监测主题、问题候选和稳定监测问题库记录，并写入 `search_autocomplete` 或 `manual_import` 来源记录。viewer 可读取快照，operator 及以上角色可采集和确认；服务层同时执行品牌访问校验。

百度 Adapter 固定访问 `https://suggestion.baidu.com/su`，Google Adapter 固定访问 `https://suggestqueries.google.com/complete/search`。外部响应限制为 5 秒和 256 KiB，来源超时、HTTP 错误或响应超限统一返回 `SEARCH_DEMAND_SOURCE_FAILED`；失败采集不会创建快照或改变历史记录，前端保留人工录入路径。

### 引用分析

```http
GET /api/v1/brands/:brandId/citations
POST /api/v1/brands/:brandId/citations/:citationId/absorption
POST /api/v1/brands/:brandId/citations/:citationId/absorption/:evidenceId/review
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

引用分析响应返回 `CitationDashboard`。`sampleCount` 表示符合真实回复边界的样本数，`citedSampleCount` 表示其中原始回答包含引用的样本数，`citationRate` 为两者计算得到的真实回复引用率；`totalCitations` 表示识别出的引用次数。`contentCitationRate` 保留内容资产绑定率语义，即已绑定内容资产的引用次数占总引用次数比例。响应同时包含 `citationBreadthRate`、`answerAbsorptionDepth`、`pendingReviewCount`、官网引用率、权威来源占比、来源类型分布、每日真实样本数与引用率趋势、引用来源明细和已绑定内容资产列表。`POST /absorption` 在受控的公开 HTTP(S) 请求边界内分析回答句和来源片段，返回并保存 `supports`、`partial`、`conflicts` 或 `unavailable` 证据及置信度；低置信、冲突和不可访问证据进入 `pending_review`，复核端点将其标记为 `reviewed`。引用来源只保留真实回复关联记录，按 `official_site`、`media`、`social`、`encyclopedia`、`third_party` 分类，并记录 `high`、`medium`、`low`、`unknown` 权威等级；前端对空来源标题和空地址分别显示“未识别来源”和“来源地址待补充”。创建引用增强策略会生成 `authority_citation` 类型内容策略，用于后续内容运营闭环。

### 评价分析

```http
GET /api/v1/brands/:brandId/evaluations
POST /api/v1/brands/:brandId/evaluations/:issueId/correction-strategy
POST /api/v1/brands/:brandId/evaluations/:issueId/knowledge
x-brand-id: brand_demo
```

评价分析响应返回 `EvaluationDashboard`，包含样本数、正向表达率、中性表达率、负向表达率、准确表达率、评价趋势、错误表达类型分布和表达问题列表。表达问题类型包括 `misinformation`、`missing_selling_point`、`blocked_expression`、`negative_expression` 和 `low_accuracy`，严重程度包括 `high`、`medium` 和 `low`；`EvaluationIssue.userIntent` 返回监测运行关联的用户意图展示文本。前端日期范围用于筛选趋势与表达证据，平台和处理状态用于筛选表达证据，并根据当前证据重新计算问题类型数量与占比；四项摘要继续使用后端品牌整体真实样本口径。事实问题缺少问题文本时显示“事实依据缺失，请补充品牌资料或可信来源”，缺少修正表达时引导补充事实依据后人工确认。

`/facts` 复用评价分析接口，并在展示层只选择 `misinformation`、`low_accuracy` 和 `blocked_expression` 三类事实风险。页面按事实风险、高风险事实、受影响用户意图、事实准确表达率、事实准确性趋势、风险分布、失真信息、证据和修正建议组织。信源、评价和事实页面在 `sampleCount=0` 时展示真实回复采集路径，在 `sampleCount` 为 1 或 2 时保留可用分析并展示补充品牌事实、标准答案与权威资料路径。

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
POST /api/v1/brands/:brandId/reports/preview
GET /api/v1/brands/:brandId/reports/effect-evidence
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

`type` 支持 `weekly`、`monthly`、`multi_brand` 和 `customer_delivery`。`periodStart` 与 `periodEnd` 使用 `YYYY-MM-DD` 日历日期，服务端按 UTC 半开区间 `[periodStart 00:00:00Z, periodEnd + 1 日 00:00:00Z)` 统计，开始日与结束日均计入自然日范围。非法日期或开始日晚于结束日返回 `400`。

范围预览使用与生成报告相同的请求体，返回 `ReportScopePreview[]`。单品牌报告返回一个元素，多品牌报告按当前用户可访问品牌返回多个元素。每个元素包含 `monitoringRunCount`、`validSampleCount`、`contentAssetCount`、`publishingRecordCount`、`taskChangeCount`、`completedRetestCount`、`dataGaps`、分类记录 ID 和有效样本起止时间；有效样本必须具有真实 AI 回复和分析结果。

生成响应返回 `ReportRecord`，包含报告名称、类型、统计周期、生成状态、创建人、Markdown 内容、数据缺口和聚合快照。单品牌快照包含 `scope`，多品牌快照包含 `scopes`；两类快照均包含 `effectEvidence` 和 `methodologyVersion`。效果证据记录优化任务、基线运行、再次监测运行、前后指标、指标差值、关联内容资产、发布渠道、真实发布链接、证据完整状态和证据缺口。当前口径版本为 `period-report-v1`，生成后快照保持冻结。Markdown 内容开头包含 YAML metadata，记录 `reportType`、品牌标识或品牌数量、统计周期和数据缺口数量。

`GET /reports/effect-evidence` 返回当前品牌的 `EffectEvidenceDashboard`。服务优先使用最新报告的冻结周期，尚无报告时覆盖当前 UTC 自然月截至请求日；响应包含 `periodStart`、`periodEnd`、`periodSource`、聚合后的 `evidence` 和去重后的 `dataGaps`。该端点复用报告快照的统计口径，只读取当前用户有权访问品牌的监测、任务、内容和发布记录。

单品牌报告聚合 GEO 指数、指标解释、平台表现、优化单元表现、竞品表现、引用来源、评价分析、内容缺口、问题归因、行动建议、任务进度和数据缺口。多品牌报告聚合品牌排名、品牌对比、强势平台、薄弱场景、风险提示、交付进度、下一步动作和高优先级问题。客户交付报告使用同一聚合快照生成客户交付版 Markdown 结构。

报告中心前端使用品牌级列表接口填充统一管理列表，并在选择报告或存在最新报告时调用单份详情接口刷新阅读内容。生成表单默认最近七个 UTC 自然日，提交前调用范围预览接口展示数据类型计数、有效样本和缺口。列表支持报告名称、类型、生成状态和创建日期组合筛选；品牌列和详情统一显示“当前品牌”，公开可见文本不展示 `brandId`、报告 ID 或运行 ID。详情区域展示报告元信息、冻结范围、效果证据、数据缺口和 Markdown 正文。首页、优化分析和任务复测页调用效果证据聚合接口，并与报告详情复用 `EffectEvidencePanel` 保持同一指标、真实链接和缺口表达。导出动作在浏览器端使用当前 `ReportRecord.content` 生成 `.md` 文件，不新增服务端导出接口或持久化记录。

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

顾问服务前端将 `AdvisorDashboard.records` 中的记录及其 `followUpItems` 映射为统一服务任务行。服务记录状态根据跟进事项推导为已记录、待处理、进行中或已完成；负责人和下一步优先从结构化 `content` 中提取，并回退到创建人和未完成跟进事项。跟进任务使用自身状态、负责人和截止日期，并保留所属服务记录与关联报告上下文。名称、类型、状态和服务日期筛选只作用于前端聚合结果，不改变现有 API 请求或响应结构。

### 内测反馈

```http
GET /api/v1/brands/:brandId/inner-test-feedback
POST /api/v1/brands/:brandId/inner-test-feedback
PATCH /api/v1/brands/:brandId/inner-test-feedback/:feedbackId
x-brand-id: brand_demo
```

创建请求包含 `page`、`module`、`type`、`severity` 和 `description`。`type` 支持 `usability`、`bug`、`copy`、`data`、`workflow`、`configuration` 和 `other`；`severity` 支持 `high`、`medium` 和 `low`，兼容未传严重程度的旧创建请求并默认保存为 `medium`。更新请求可传 `status`、`severity` 和 `resolutionNote`，其中状态支持 `open`、`triaged`、`in_progress` 和 `resolved`。

列表响应返回 `InnerTestFeedbackDashboard`，包含品牌标识、反馈记录和状态计数。每条 `InnerTestFeedback` 持久化严重程度；Prisma `InnerTestFeedbackRecord.severity` 默认值为 `medium`，迁移目录为 `apps/api/prisma/migrations/20260717023000_add_feedback_severity/`。前端组合筛选在浏览器端作用于问题描述、模块、页面、类型、严重程度、状态及创建日期，继续使用现有品牌级 CRUD 路径。

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

前端请求封装位于 `当前工作区/apps/web/src/api/http.ts`。

当前封装行为：

- 自动拼接 `/api/v1` 前缀
- 从 Zustand 品牌上下文读取 `activeBrandId`
- 自动设置 `x-brand-id`
- 返回共享 `ApiResponse<T>` 类型

## 前端页面骨架接口

统一页面骨架位于 `当前工作区/apps/web/src/components/ProductPage.tsx`。

```ts
type ProductPageHeaderProps = {
  title: string;
  description: ReactNode;
  context?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
};

type ProductPageStatusSlots = {
  loadingState?: ReactNode;
  partialState?: ReactNode;
  errorState?: ReactNode;
};

type ProductPageProps = ProductPageHeaderProps & ProductPageStatusSlots & {
  children: ReactNode;
  className?: string;
};

type ProductPageSectionProps = {
  children: ReactNode;
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};
```

`ProductPage` 固定按页面标题、状态反馈和主内容顺序渲染。错误、部分数据和加载插槽位于同一 `aria-live="polite"` 状态区域；`ProductPageSection` 提供内容面板、区域标题、区域说明和区域操作位置。业务页面可逐页迁移，现有路由、查询和动作组件继续作为插槽内容传入。

## 前端页面状态接口

统一页面状态组件位于 `当前工作区/apps/web/src/components/PageState.tsx`。

```ts
type GuidedEmptyStateProps = {
  title: string;
  reason: ReactNode;
  impact: ReactNode;
  benefit: ReactNode;
  actionLabel: string;
  onAction: () => void;
  supportingText?: ReactNode;
};

type BusinessEmptyStateProps = {
  title: string;
  missing: string;
  reason: string;
  nextStep: string;
  benefit?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: ReactNode;
};

type RegionErrorStateProps = {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
};

type PageSkeletonProps = {
  rows?: number;
};

type PartialDataNoticeProps = {
  message?: ReactNode;
  description: ReactNode;
  action?: ReactNode;
};
```

`GuidedEmptyState` 固定渲染原因、影响、完成收益和一个主操作，适用于缺少业务前置数据的页面级或区域级空态。`BusinessEmptyState` 统一渲染缺少内容、影响范围、建议下一步和可选完成收益；`EmptyState` 进入业务空态分支时会为完成收益提供默认业务文案。`RegionErrorState` 提供局部失败及重试入口，`PageSkeleton` 提供首屏结构占位，`PartialDataNotice` 表达已有部分数据可用且其余数据仍在准备中。

`pageStateActionMap` 集中维护常见恢复动作：`retry` 由当前页面执行重新加载；`supplementBrandProfile` 指向 `/brand-profile`；`startMonitoring` 指向 `/monitoring`；`createContent` 指向 `/content-generation`；`recordPublishingResult` 指向 `/publishing?tab=records`。业务页面负责根据当前品牌和工作流上下文执行导航。

## 前端筛选与分析组件接口

统一筛选 query 位于 `当前工作区/apps/web/src/app/filterQuery.ts`，共享组件位于 `当前工作区/apps/web/src/components/`。

```ts
type UnifiedFilterValue<Status extends string = string> = {
  search: string;
  from?: string;
  to?: string;
  platform: 'all' | BeginnerFriendlyPlatform;
  status: 'all' | Status;
};

type UnifiedFilterBarProps<Status extends string = string> = {
  value: UnifiedFilterValue<Status>;
  onChange: (value: UnifiedFilterValue<Status>) => void;
  onClear?: () => void;
  statusOptions?: readonly { value: Status; label: string }[];
  searchPlaceholder?: string;
  resultCount: number;
  totalCount?: number;
  showDateRange?: boolean;
  showPlatform?: boolean;
};

type PlatformSwitchProps = {
  value: 'all' | BeginnerFriendlyPlatform;
  onChange: (value: 'all' | BeginnerFriendlyPlatform) => void;
  includeAll?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
};
```

`readUnifiedFilterQuery` 读取并校验 `q`、`from`、`to`、`platform` 和 `status`；`mergeUnifiedFilterQuery` 只更新这五类筛选参数并保留其他 query；`clearUnifiedFilterQuery` 只清除筛选参数。页面负责通过 React Router 将返回的 search 字符串写回当前路由，hash 不参与 helper 输入，因此继续由当前 location 保留。

`PlatformSwitch` 固定使用 `preferredAIPlatformOptions`，顺序为豆包、Kimi、DeepSeek、通义千问和阶跃星辰，并可在首项显示全部平台。

公开显示 helper 位于 `src/utils/displayLabels.ts`。平台 code、品牌角色、负责人、内容类型和任务状态统一转换为业务标签；空值或未收录值使用“未知平台”“自定义平台”“其他负责人”“其他内容”或“未知状态”等稳定兜底，公开页面不回显内部枚举和 ID。`src/api/http.ts` 在 API 响应进入页面前过滤 provider、HTTP 状态、数据库和异常堆栈等技术错误详情，业务错误继续保留服务端返回的可执行说明。

分析域在 `src/features/analysis/analysisScopeQuery.ts` 和 `src/features/analysis/components/` 提供扩展 scope 与共享页面骨架：

```ts
type AnalysisScopeValue<Status extends string = string> = UnifiedFilterValue<Status> & {
  optimizationUnitId?: string;
  intentId?: string;
};

type AnalysisScopeBarProps<Status extends string = string> = {
  value: AnalysisScopeValue<Status>;
  onChange: (value: AnalysisScopeValue<Status>) => void;
  onClear: () => void;
  statusOptions?: readonly UnifiedFilterOption<Status>[];
  optimizationUnitOptions?: readonly UnifiedFilterOption[];
  intentOptions?: readonly UnifiedFilterOption[];
  resultCount: number;
  totalCount?: number;
};
```

`readAnalysisScopeQuery`、`mergeAnalysisScopeQuery` 和 `clearAnalysisScopeQuery` 统一处理 `q`、`from`、`to`、`platform`、`status`、`optimizationUnitId` 与 `intentId`。合并与清空只改动这七个参数并保留监测运行、Prompt、内容任务、发布记录等工作流 query；未知优化单元或用户意图 ID 在范围栏显示为“当前优化单元”或“当前用户意图”，避免将内部 ID 暴露为公开标签。

竞品、评价、事实、信源和增长优化页面使用同一 URL scope。各页只对明细模型真实提供的字段执行过滤；缺少对应维度的聚合指标继续明确采用品牌整体真实样本口径，避免生成筛选后的推测指标。

```ts
type MetricSummaryItem = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  suffix?: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
};

type InsightOverviewProps = {
  title: ReactNode;
  description: ReactNode;
  findings?: readonly ReactNode[];
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  toneLabel?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

type InsightDetailSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  resultCount?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};
```

`MetricSummaryGrid` 支持二到五列和加载骨架。`InsightOverview` 承载关键结论、等级、发现和动作，`InsightDetailSection` 承载趋势、分布、表格或证据明细，并为宽内容提供横向滚动边界。

`AnalysisWorkbench` 组合 `ProductPage`、`ProductPageSection`、`InsightOverview` 和 `InsightDetailSection`，固定输出分析范围、关键结论、趋势与分布、证据明细和建议动作。趋势或分布、证据明细可按页面数据能力省略；关键结论根据发现文本映射为需要处理、持续观察或可执行等级，建议动作继续使用现有业务路由和上下文。

## 前端工作区模板接口

工作区共享状态和三类页面模板位于 `当前工作区/apps/web/src/components/`。

```ts
type WorkspaceViewState = 'ready' | 'loading' | 'empty' | 'partial' | 'error';

type QueryWorkspaceResource = {
  isLoading: boolean;
  response?: ApiResponse<unknown>;
};

type WorkspaceStateSlots = {
  loadingState?: ReactNode;
  emptyState?: ReactNode;
  partialState?: ReactNode;
  errorState?: ReactNode;
};

type CreationWorkspaceProps = WorkspaceStateSlots & {
  configuration: ReactNode;
  result: ReactNode;
  configurationTitle: ReactNode;
  resultTitle: ReactNode;
  state?: WorkspaceViewState;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  mobileOrder?: 'configuration-first' | 'result-first';
};

type AssetLibraryCategory<Key extends string = string> = {
  key: Key;
  label: ReactNode;
  count?: number;
  completeness?: number;
  status?: 'complete' | 'partial' | 'empty' | 'error';
  disabled?: boolean;
};

type AssetLibraryProps<Key extends string = string> = WorkspaceStateSlots & {
  categories: readonly AssetLibraryCategory<Key>[];
  activeCategory: Key;
  onCategoryChange: (key: Key) => void;
  editor: ReactNode;
  state?: WorkspaceViewState;
  completeness?: number;
  mobileOrder?: 'navigation-first' | 'editor-first';
};

type ManagementListPageProps<RecordType extends object> = WorkspaceStateSlots & {
  title: string;
  description: ReactNode;
  summary?: ReactNode;
  filters?: ReactNode;
  tableProps: TableProps<RecordType>;
  state?: WorkspaceViewState;
};

type ManagementPrimaryActions =
  | readonly []
  | readonly [ReactNode]
  | readonly [ReactNode, ReactNode];
```

`getWorkspaceStateVisibility` 让 `ready` 和 `partial` 保留真实内容；`loading`、`empty` 和 `error` 分别切换到对应状态区域。`getQueryGroupWorkspaceState(resources, hasContent)` 汇总多查询结果：没有成功结果且仍在加载时返回 `loading`，没有成功结果且存在失败时返回 `error`，已有成功结果且仍有加载或失败时返回 `partial`，全部成功后按 `hasContent` 返回 `ready` 或 `empty`。`normalizeCompleteness` 将有限数字四舍五入并限制到 `0-100`，缺省值和非有限数字不显示完整度。

`CreationWorkspace` 始终保留配置区，只切换结果区状态。`AssetLibrary` 始终保留分类导航和完整度摘要，只切换编辑区状态。`ManagementListPage` 在加载状态保留 Table 最终结构，在空态使用 `emptyState` 作为 Table 空内容，在错误状态隐藏表格并保留页面级上下文。

`ManagementRowActions` 接受最多两个 `primaryActions`，低频操作通过 `moreAction` 提供。三个模板均提供区域 aria 标签、状态播报和移动端内容顺序配置。

## 内容发布准备检查

品牌级内容发布准备接口：

```http
POST /api/v1/brands/:brandId/content-assets/:assetId/readiness
```

请求体通过 `ContentReadinessInput` 提交待检查正文、可选 `contentType` 和目标渠道。响应使用带 `ruleVersion` 的 `ContentReadinessResult`，包含整体 `ready`、`needs_review` 或 `blocked` 状态、结构与渠道检查项、品牌事实和数字的来源映射、风险段落以及可定位的修正入口。`2026-08-content-quality-v1` 会对竞品对比检查同口径维度、自身局限和核验日期，对榜单推荐检查评选方法、数据来源和利益关系披露，并对出现 FAQ 结构的内容检查每个答案首句是否直接给出结论；失败项使用 `section=content-rules&rule=...` 定位修正位置。服务只将 Quick Start 中已确认或已编辑的品牌事实作为可信依据；缺少来源或仍待确认的高风险表达进入风险列表。Markdown 列表序号和 URL 内结构性数字不计入事实数字。

## 发布确认与结果

发布记录创建和确认接口：

```http
POST /api/v1/brands/:brandId/publishing/records
PATCH /api/v1/brands/:brandId/publishing/records/:recordId/confirmation
PATCH /api/v1/brands/:brandId/publishing/records/:recordId/status
POST /api/v1/brands/:brandId/publishing/records/:recordId/execute
```

`PublishingConfirmationInput` 包含发布方式、可选人工内容版本标签、素材要求确认和再次监测时间；已有内容生成版本时使用 `versionId` 作为冻结版本。`pending` 记录、自动发布和带确认快照的新记录在创建时校验目标账号、授权状态、平台、发布方式、内容版本、素材要求和复测时间。未确认草稿可通过 confirmation 接口补齐账号和快照。人工回填 `published` 与 Adapter 执行均要求完整确认；结果保存 `publishedUrl`、`publishedAt`、`externalPlatformId`、发布状态和冻结版本。周期效果证据中的发布记录同时返回 `versionId` 与 `contentVersion`。

## 品牌知识片段版本

品牌资料片段查询和 Quick Start 已确认事实同步接口：

```http
GET /api/v1/brands/:brandId/knowledge-chunks?sourceId=:sourceId
POST /api/v1/brands/:brandId/knowledge-chunks/sync
POST /api/v1/brands/:brandId/knowledge/search
```

片段查询返回当前用户可访问品牌的全部来源版本，可通过 `sourceId` 限定单一来源。每个 `KnowledgeChunk` 包含品牌、来源、来源版本、片段序号、来源 URL、正文、SHA-256 内容哈希、`pending | approved | rejected` 审核状态和更新时间。同步接口只消费 Quick Start 中 `confirmed` 或 `edited` 的非空事实，按事实原始来源聚合并写入 `approved` 版本；相同内容和审核状态返回已有最新版本。Markdown、DOCX 或文本型 PDF 的品牌资料在导入确认后使用同一版本服务写入知识片段。

知识查询请求使用 `KnowledgeQueryInput`，包含查询文本、可选结果上限、`manual_query | content_generation | fact_analysis` 用途、业务资源 ID 和可选 `embeddingCostPolicy`：`organization`、`platform_quota` 或 `full_text`。响应 `KnowledgeQueryResult` 返回确定性答案、引用片段、来源地址、来源版本、更新时间、审核状态、可信标记、实际 `retrievalMode`、最终费用归属策略、`fallbackReasons` 和调用留痕 ID。高级 vector/graph 结果不足或不可用时，服务使用全文和每个来源最新版本的结构化结果补齐；模式可为 `vector`、`graph`、`hybrid`、`full_text`、`structured` 或 `none`。只使用 `approved` 片段形成答案；仅命中 `pending` 片段时返回 `unconfirmed_evidence`，无匹配依据时返回 `no_matching_evidence`，两类资料缺口均携带资料上传和事实确认路径。查询、内容生成和内容发布准备检查使用同一服务，并在 `AuditLog` 中保存实际使用的片段 ID、来源引用、降级原因和费用归属策略。
