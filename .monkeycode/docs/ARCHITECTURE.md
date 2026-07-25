# 系统架构文档

## 当前架构

多品牌 GEO 管理平台工程位于 ``。当前阶段已完成应用骨架、权限基础能力、品牌工作区、品牌知识库、多来源素材导入、GEO 优化单元管理、用户意图库、Prompt 模板生成、AI 平台配置、Adapter 边界、GEO 监测运行、原始回答记录、AI 回答解析、平台评价、人工复核、GEO 指数计算、看板数据、GEO 画布工作台、竞品监控与压制分析、引用来源分析、评价分析、内容策略中心、内容生成工作台、发布中心、任务复测中心、报告中心、顾问服务工作台和第一版运营后台页面串联，覆盖前端、后端、共享类型、数据库 schema、基础路由、API 边界、错误响应、品牌上下文注入和品牌访问校验。

```text
geo-platform/
├── apps/
│   ├── web/                  Vite + React 前端应用
│   └── api/                  NestJS API 服务
├── packages/
│   └── shared-types/         前后端共享 TypeScript 契约
├── package.json              npm workspaces 根配置
├── tsconfig.base.json        统一 TypeScript 基础配置
└── .env.example              后端环境变量样例
```

## 前端

前端位于 `apps/web/`。

已建立内容：

- `src/main.tsx`：React 应用入口，接入 TanStack Query
- `src/app/App.tsx`：React Router 路由入口，使用 Suspense 提供统一 route loading fallback
- `src/app/WorkspaceRouteRedirect.tsx`：品牌工作区路由别名重定向，将 `/brands/:brandId/*` 同步到当前品牌上下文并跳转到第一版页面
- `src/layouts/navigation.ts`：后台导航分组、运营闭环步骤和品牌工作区路由别名配置
- `src/layouts/AppLayout.tsx`：后台布局、左侧分组菜单、品牌选择器、品牌上下文提示和运营闭环步骤入口
- `src/stores/brandContextStore.ts`：Zustand 品牌上下文状态
- `src/api/http.ts`：统一请求封装，向 API 注入 `x-brand-id`
- `src/components/PageState.tsx`：页面状态组件，统一 API 错误 Alert、空状态和主操作入口
- `src/features/brand-workspace/pages/BrandWorkspacePage.tsx`：品牌工作区页面，包含多品牌总览、品牌新增编辑、状态切换、运营闭环入口、AI 可见性运营 Sprint 入口、当前 Sprint 阶段进度、下一步动作、完成首轮监测步骤条、品牌资料上传入口、品牌档案确认区、手动填写品牌信息入口、优化单元入口和工作区摘要
- `src/features/brand-workspace/pages/sprintWorkspace.ts`：品牌工作区 Sprint 展示 helper，将 Sprint 状态、阶段状态、下一步动作、阶段进度和指标摘要映射为用户可理解的工作台文案与路由
- `src/features/brand-workspace/components/BrandKnowledgeCard.tsx`：品牌知识库表单，维护品牌介绍、核心卖点、FAQ、竞品、标准表达、完整度评分和多来源导入记录
- `src/features/brand-workspace/components/OptimizationUnitsCard.tsx`：GEO 优化单元列表和详情抽屉，维护类型、关键词、优先级、启用状态和关联计数
- `src/features/brand-workspace/components/UserIntentPromptCard.tsx`：用户意图与 Prompt 管理，维护用户意图、Prompt 模板、批量生成品牌 Prompt 和 Prompt 启停
- `src/features/canvas/pages/GeoCanvasPage.tsx`：GEO 画布工作台，使用 ReactFlow 渲染优化单元、用户意图、数据表现和内容策略节点，支持节点详情抽屉、创建用户意图、创建内容策略和创建优化任务
- `src/features/monitoring/pages/MonitoringPage.tsx`：AI 回复监测页面，承载 GEO 指数、监测主题、监测问题候选、真实回复手动录入、回复监测记录和连接 AI 平台入口
- `src/features/growth-optimization/pages/GrowthOptimizationPage.tsx`：增长优化计划页面，展示计划摘要、原因分析、优先级、负责人、截止时间、发布平台、复测时间、内容建议、关联任务、标准答案对照和内容缺口诊断，支持从首轮监测生成计划、确认拆任务、生成内容任务、标记任务完成和发起复测计划
- `src/features/growth-optimization/pages/growthSprintDiagnostics.ts`：Sprint 标准答案与内容缺口诊断 helper，将真实 AI 回复、品牌标准答案和内容资产准备状态合成为优化计划页的只读诊断行
- `src/features/tasks/pages/TaskRetestPage.tsx`：任务跟进和再次监测页面，展示优化任务状态、复测计划、复测结果录入和 Sprint 复测趋势看板
- `src/features/tasks/pages/sprintRetestTrend.ts`：Sprint 复测趋势 helper，负责指标基线、当前值、差值和复测状态展示格式化
- `src/features/competitors/pages/CompetitorAnalysisPage.tsx`：竞品分析页面，维护竞品档案，展示竞品提及率、压制率、平均排名差、高风险意图和对比明细，并提供“地图发现竞品”抽屉用于生成本地线下候选、查看匹配理由、确认标签或排除候选
- `src/features/citations/pages/CitationAnalysisPage.tsx`：引用分析页面，展示引用总数、内容引用率、官网引用率、权威来源占比、来源类型分布、趋势和明细操作
- `src/features/evaluations/pages/EvaluationAnalysisPage.tsx`：评价分析页面，展示正向、中性、负向和准确表达率，支持查看表达问题、创建修正策略和更新品牌知识库
- `src/features/content/pages/ContentCenterPage.tsx`：内容策略中心页面，展示关键词覆盖率、未覆盖关键词、已发布资产、复用资产、内容资产列表、策略建议和内容策略列表，支持创建/编辑内容资产和生成策略
- `src/features/content-generation/pages/ContentGenerationPage.tsx`：内容生成与编辑工作台，支持选择内容策略生成 Markdown 草稿，创建表单可指定公众号推文、小红书图文、官网 FAQ、短视频脚本、平台介绍文案和图片创意需求，并展示建议发布平台、内容主题、目标关键词、引用资料、复测时间、增长计划来源、生成步骤、合规说明、复测建议、发布前确认提示、版本、导出记录和发布入口参数；页面已接入 AI 自动运营卡片，用于查看平台改写、发布建议和复测建议进度
- `src/features/publishing/pages/PublishingCenterPage.tsx`：发布中心页面，支持发布记录和账号管理页签、平台列表、账号接入、授权异常展示、重新授权和发布状态更新
- `src/features/tasks/pages/TaskRetestPage.tsx`：任务复测页面，支持任务看板统计、任务处理、内容链接、复测计划和复测结果录入
- `src/features/reports/pages/ReportCenterPage.tsx`：报告中心页面，支持生成单品牌周报、单品牌月报、多品牌对比和客户交付报告，展示报告列表、数据缺口和 Markdown 内容
- `src/features/advisor/pages/AdvisorWorkspacePage.tsx`：顾问服务页面，支持新增品牌诊断、服务计划、服务复盘、客户交付和服务记录，展示服务列表、结构化服务详情、待跟进事项和报告引用
- `src/features/monitoring/components/GeoMetricDashboardCard.tsx`：GEO 指数看板，展示总分、子分、平台/优化单元/意图分组和多品牌排行
- `src/features/monitoring/components/MonitoringRunsCard.tsx`：AI 回复监测记录表格与创建弹窗，支持示例回答、人工录入真实回复、异步任务状态、重试状态、人工兜底入口、溯源字段展示、解析触发和人工复核编辑；结果解读列使用“有没有出现”“排第几”“说得准不准”“竞品表现”“需要补什么内容”和“下一步”解释已解析、待解析、待人工和失败状态；需要确认的解析结果会在复核弹窗顶部展示风险表达、无法判断项和建议改法，并允许用户编辑分析字段后保存确认
- `src/features/monitoring/components/TestQuestionCandidateCard.tsx`：监测主题与监测问法候选界面，支持生成监测主题、生成监测问题、展示业务解释、推荐优先级、预计监测价值、默认高价值问题、查看更多问法、按主题批量选择、单题编辑、目标平台预览、保存为监测计划、一键开始首轮监测、展示连接方式摘要、预计耗时、确认事项、执行结果摘要、资料缺失提示、生成说明和基础模板 fallback 提示
- `src/features/monitoring/components/ManualTestEntryCard.tsx`：手动录入真实 AI 回复界面，支持选择监测计划、展示可复制监测问题、目标平台入口说明、单条原始回复粘贴、批量原始回复粘贴、缺少回复统计和匹配结果展示
- `src/features/monitoring/components/PlatformConfigCard.tsx`：AI 平台连接与配置界面，优先展示豆包、Kimi、DeepSeek、通义千问和阶跃星辰，并按“可自动监测”“可用浏览器辅助监测”“可手动录入”“需要配置”分组；新增编辑弹窗支持启用状态、平台密钥脱敏、校验和高级设置，接口地址、模型名称、调用限制收纳在高级设置中；浏览器连接向导支持打开平台登录页、展示用户登录提示、查看会话状态、最近可用时间和需要确认的异常
- `src/app/routes.test.ts`：前端路由注册测试，覆盖导航目标、运营流程、品牌化路由别名和 lazy route component 注册
- `src/components/PageState.test.ts`：页面状态 helper 测试，覆盖 API 错误消息提取和 fallback 文案
- `src/layouts/navigation.test.ts`：前端导航配置测试，覆盖后台模块分组、运营流程顺序和品牌化路由别名

Vite 配置位于 `apps/web/vite.config.ts` 和实际加载的 `apps/web/vite.config.js`。开发服务将 `/api` 代理到 `http://localhost:3001`，并允许 `.monkeycode-ai.online` 预览域名访问。生产构建通过 `build.rolldownOptions.output.codeSplitting.groups` 拆分 React、Ant Design、TanStack Query 和通用 vendor chunks，主要页面通过 lazy route modules 单独加载。

## 后端

后端位于 `apps/api/`。

已建立内容：

- `src/main.ts`：NestJS 启动入口，统一设置 `/api/v1` 前缀
- `src/app.module.ts`：根模块，加载健康检查、品牌、权限、平台配置、监测、指标、画布、竞品、引用、评价、内容、发布、任务复测、报告、顾问服务、统一大模型任务与自动化运营模块
- `src/common/access-control/brand-access.policy.ts`：集中品牌访问策略，按模块路径和请求方法解析资源类型与最低角色
- `src/common/middleware/brand-context.middleware.ts`：从 `x-brand-id` 注入请求品牌上下文
- `src/common/middleware/brand-access.middleware.ts`：校验当前用户是否有权访问 `x-brand-id` 对应品牌
- `src/common/filters/api-exception.filter.ts`：统一错误响应结构
- `src/modules/health/health.controller.ts`：`GET /api/v1/health`，返回服务状态、仓储 driver、运行环境、依赖 readiness 和缺失配置项名称
- `src/modules/brands/brands.controller.ts`：品牌列表、详情、创建、编辑、状态切换、工作区快照、品牌知识库、知识来源、监测主题、监测问法、监测计划、增长优化计划和优化单元接口
- `src/modules/brands/test-question.service.ts`：根据已启用监测主题、品牌基础信息和品牌档案生成监测问法候选，并标注监测目的和默认目标平台；候选问法 API 支持按主题和选择状态筛选、优先级分页、单题编辑和批量选择，候选可携带 `promptId` 以便保存监测计划后直接进入执行编排；追光小牛内测品牌会生成贵阳儿童运动、3 到 5 岁儿童体能、少儿跑酷、快乐体操、感统发展、专注力提升、增高体能和中考体测首轮样例问法
- `src/modules/brands/test-theme.service.ts`：根据品牌档案生成品牌词、品类词、地域词、人群年龄段、用户痛点、课程或产品、竞品对比和购买决策监测主题；追光小牛内测品牌追加固定首轮样例主题
- 监测计划执行编排：`POST /api/v1/brands/:brandId/test-plans/:planId/execute` 根据连接摘要将问题分流到 API 监测运行、浏览器辅助监测、手动录入和平台配置引导；API adapter 成功返回后会创建 `MonitoringRun`、写入原始回答、记录调用审计并触发自动分析；浏览器 connector 成功提取回答后会创建 `MonitoringRun`、写入原始回答并触发自动分析，读取失败或缺少 `promptId` 时进入需要用户确认或手动录入路径；手动答案批量录入入口按监测计划、问题文本和平台 code 匹配答案，成功后复用同一套回答写入与自动分析链路
- 监测计划模板：`GET /api/v1/brands/:brandId/test-plan-templates` 根据品牌行业、业务范围和城市推荐行业模板；`POST /api/v1/brands/:brandId/test-plans/from-template` 由模板生成问题、目标平台和分析重点；`POST /api/v1/brands/:brandId/test-plans/:planId/duplicate` 支持复制和复测计划创建
- `src/modules/platforms/`：AI 平台配置接口、Adapter 边界和浏览器连接抽象，包含 `AIPlatformAdapter`、`ManualInputAdapter`、`MockAdapter`、`OpenAICompatibleAdapter`、`BrowserConnector`、`FakeBrowserConnector`、`DoubaoBrowserConnector`、`KimiBrowserConnector`、`DeepSeekBrowserConnector` 和 `QianwenBrowserConnector`；平台校验通过 Adapter registry 执行并持久化校验结果，`api` 模式先校验接口地址、模型名称和平台密钥状态，公共响应只返回 `hasCredential`、脱敏状态和最近校验结果，并通过 `connectionStatus`、`connectionStatusLabel`、`availableMethods` 和 `nextAction` 输出平台状态归类；`AIPlatformAdapterRegistry` 当前为豆包、Kimi、DeepSeek、通义千问和阶跃星辰注册 OpenAI-compatible 直接映射，后续可在平台需要专属协议时替换为专属 Adapter；`AIPlatformAdapter` 保留 `runPrompt` 旧接口并新增可选 `runMessages`，`OpenAICompatibleAdapter` 已支持 system、developer、user、assistant messages、JSON 输出参数、temperature、maxTokens、token usage 归一化和 Provider 错误归一化，并对阶跃星辰合并 developer 指令到 system 消息以适配其 JSON 输出行为；LLM 自动任务未指定平台时优先选择已配置密钥的 `stepfun`，用于内测阶段统一使用阶跃星辰 `step-3.7-flash` 支撑问题生成、回答解读、内容生成和优化计划；浏览器连接抽象定义打开登录页、检测登录、发送问题、等待回答、提取回答和停止会话方法，遇到验证码、登录失效、页面结构变化、风控或平台限制时统一返回 `needs_confirmation` 和手动录入路径；浏览器会话状态通过 `GET /api/v1/platforms/browser-sessions`、`POST /api/v1/platforms/browser-sessions` 和 `PATCH /api/v1/platforms/browser-sessions/:sessionId` 暴露给前端，并由 permissions repository 保存到 memory 或 Prisma 仓储，只返回平台、登录状态、最近可用时间、状态摘要和授权品牌范围；`BrowserConnectorRegistry` 当前注册豆包、Kimi、DeepSeek 和通义千问 connector，监测计划执行流程按平台 code 选择 connector 并将成功回答写入监测闭环
- 共享类型已为 `src/modules/llm/` 提供统一 LLM 任务契约：`LLMTaskType`、`LLMTaskStatus`、`LLMTaskRequest<TInput>`、`LLMTaskResponse<TOutput>`、`LLMTaskRun` 和 `LLMTaskRunInput`，并扩展 `AIPlatformCallType` 与 `AsyncJobType` 支持 `question_generation`、`answer_analysis`、`content_generation` 和 `optimization_planning`；四类任务输入输出已复用现有问题、解读、内容版本和增长优化计划模型，可直接写入现有仓储边界。共享类型已新增 AI 自动化运营员契约，包含 `AutomationPackage`、`AutomationStepSummary`、`AutomationConfirmation`、`PlatformRewriteVersion` 及其状态、步骤、确认类型和平台改写枚举，用于后续自动化任务包、确认队列和平台改写版本复用。前端新增 `src/features/automation/components/AutomationOperatorCard.tsx`，在品牌工作区、AI 回复监测页、增长优化页和内容生成页复用，展示任务包状态、步骤进度、问题池和监测计划上下文、确认事项抽屉，以及按当前步骤继续执行的业务按钮。
- `src/modules/llm/`：统一大模型任务模块，包含 `LLMController`、`LLMOrchestrationService`、`LLMPromptTemplateService` 和 `LLMOutputValidator`。当前支持四类任务路由：生成监测问题、解读回答、生成内容和生成优化计划；同步模式会选择当前品牌可用 API 平台、调用 `runMessages`、解析 JSON 输出并记录 `AIPlatformCallAudit` 和 `LLMTaskRun`，异步模式会创建 `AsyncJob` 并写入 queued 任务摘要，再通过任务查询接口返回队列状态。Prompt 模板已按 `question_generation`、`answer_analysis`、`content_generation` 和 `optimization_planning` 输出专属 system/developer/user messages，并统一加入品牌事实、安全表达和 JSON 输出约束；输出校验会按任务类型检查 themes/candidates、AnalysisResultInput、ContentVersionInput、GrowthOptimizationPlanInput、ContentGenerationTaskInput 和 retestQuestions 结构。
- `src/modules/automation/`：AI 自动化运营员后端模块，包含 `AutomationController`、`AutomationOrchestratorService`、`QuestionPoolService`、`ConfirmationQueueService`、`PlatformRewriteService`、`AutomationRepository` 和 `AutomationRepositoryPort`。当前支持创建、列表、详情、启动、停止、重新生成、执行已确认监测计划、分析监测回答、生成可发布内容、生成平台改写版本、生成发布建议、确认创建发布待办、生成复测建议、回写复测结果、步骤失败标记、确认事项创建和确认事项处理；服务层会通过 `canAccessBrand` 校验用户品牌访问权限，作为品牌访问 middleware 之外的模块内防线。任务包启动后会完成上下文收集步骤，复用 `TestThemeService` 与 `TestQuestionService` 补齐监测主题和监测问题池，并在生成后重新读取最新 `TestQuestionCandidate` 池，按优先级与主题多样性精选 6 个本轮问题，创建“本轮精选监测问题”确认事项。确认队列支持监测问题、分析判断、内容草稿、平台改写、发布建议和手动录入六类事项，动作覆盖确认通过、用户编辑、重新生成和跳过；存在 pending 确认事项时会阻塞后续自动推进。监测问题确认通过或编辑后会创建 `TestPlan` 并写回 `relatedTestPlanId`，流程进入 `test_plan_execution`。自动化执行入口复用现有 `executeTestPlan` 编排，将 API、浏览器、手动和配置路径数量写入 `test_plan_execution` 步骤；无阻塞项时推进到 `answer_analysis`，存在浏览器确认、手动录入、平台配置或跳过项时创建 `manual_test_required` 确认事项并等待用户处理。回答分析入口复用现有 `AnalysisResult` 解析与规则二次校验，按监测计划监测运行汇总推荐率、第一推荐率、Top 3 率、准确表达、引用分、竞品压制、引用缺口、风险表达和无法判断项；分析后会生成 `GrowthOptimizationPlan` 并写回 `relatedGrowthPlanId` 作为后续内容生成上下文，无风险时进入 `content_generation`，存在风险或无法判断项时创建 `analysis_review` 确认事项。内容生成入口基于 `GrowthOptimizationPlan.contentRecommendations` 创建内容任务，复用 `ContentGenerationWorker` 生成最新 `ContentVersion`，并在正文中固定包含引用依据、合规说明、建议发布平台和复测建议；生成内容命中风险表达时创建 `content_review` 确认事项，无风险时推进到 `platform_rewrite`。平台改写入口按任务包目标发布平台，将每个内容版本改写为知乎问答、百家号资讯、小红书笔记、公众号推文和官网 FAQ 版本，保存 `PlatformRewriteVersion`、改写说明、标签和合规提示，并创建 `platform_rewrite_review` 确认事项。发布建议入口根据内容版本、平台改写版本和发布中心历史记录生成 `publishing_suggestion` 确认事项，用户确认入口会先校验确认事项仍为 pending 且建议列表有效，再创建 `PublishingRecord` 待办、处理确认事项并写回 `relatedPublishingRecordIds`；复测建议入口复用任务复测仓储创建 `OptimizationTask` 和复测记录，完成复测后把结果回写任务包并在达标时进入 `completed`。服务读取品牌工作区、品牌档案、监测问题池和监测计划数量作为任务上下文，并通过现有品牌访问 middleware 与 `AuditLog` 记录自动化任务包、问题池、监测执行、回答分析、内容生成、平台改写、发布建议、复测建议和确认事项关键操作。
- `src/modules/sprints/`：AI 可见性运营 Sprint API 模块，包含 `SprintsController`、`QuestionRadarService`、`StandardAnswerService`、`StandardAnswerAlignmentService`、`SprintContentGapService`、`SprintPublishingService`、`SprintRetestService`、`SprintMetricsService`、`SprintStageService` 和 `SprintsModule`。当前提供品牌级 Sprint 列表、当前 Sprint、详情、创建、启动、停止、问题雷达、标准答案列表、标准答案生成、标准答案确认、标准答案对照分析、内容缺口任务生成、内容缺口任务看板、发布准备看板、发布准备记录创建、复测计划创建、复测趋势看板、指标刷新和阶段推进接口，统一返回 `ApiResponse<T>`，通过 `PermissionsService` 调用内存或 Prisma 仓储中的 Sprint 端口方法。启动和停止仅更新 Sprint 聚合状态。`QuestionRadarService` 读取 Sprint 关联问题、监测问题候选和监测主题，输出问题意图、平台覆盖、业务价值、状态和 Sprint 关联状态，并在同一 Sprint 内按归一化问题文本去重。`StandardAnswerService` 读取 Sprint 选题、品牌工作区和品牌档案生成 `ready_for_review` 标准答案草稿，用户确认后更新为 `approved` 并关联回 Sprint。`StandardAnswerAlignmentService` 是只读计算层，组合 Sprint 关联真实监测运行、解析结果、监测问题候选和已审核标准答案，按问题输出等待真实回答、等待标准答案、已对齐或需要处理四类状态，并给出要点覆盖、准确性、风险表达、引用缺口、竞品压制、证据和建议动作。`SprintContentGapService` 读取对照分析中的 `needs_attention` 项，复用或生成内容策略，为每个缺口创建内容生成任务，使用 `referenceSources` 记录 Sprint、问题、标准答案、真实回答运行和证据摘要，并把新任务 ID 合并回 Sprint 的 `relatedContentTaskIds`；同一服务还提供只读内容任务看板，解析 `referenceSources` 和当前内容版本，输出来源问题、缺口类型、证据摘要、复测目标和草稿可审稿状态。`SprintPublishingService` 读取 Sprint 关联内容任务、当前内容版本和发布记录，输出草稿、待人工发布、已发布和失败状态，并可将内容版本创建为发布中心草稿或待人工发布记录后写回 Sprint；该服务不生成不可访问发布链接。`SprintRetestService` 读取 Sprint 发布记录创建任务中心复测任务，跳过草稿和失败发布记录，并聚合关联复测任务的 `RetestRecord` 前后指标、改善状态和趋势摘要。品牌标准答案由 `BrandStandardAnswer` 独立保存问题、答案正文、关键点、证据和审核状态，用作对照基准和内容生成依据。`SprintMetricsService` 只读取 Sprint 关联的 `MonitoringRunDetail.response` 与 `analysis` 计算问题覆盖率、提及率、推荐率、首位推荐率、Top 3 率、引用命中率、表达准确率、风险表达数、内容缺口数、竞品压制数和样本量，不读取品牌标准答案或内容草稿作为监测样本。`SprintStageService` 根据问题、真实回答、标准答案关联、指标刷新状态、内容任务、发布记录和复测任务推进阶段；缺少真实回答时保持 `ai_response_monitoring` 的 `waiting_confirmation` 状态。
- `PrismaAutomationRepository`：自动化 Prisma 镜像仓储，随 `GEO_REPOSITORY_DRIVER=prisma` 接入。由于现有自动化编排接口保持同步调用，该仓储保留当前进程内同步视图，并将自动化任务包、确认事项、平台改写版本、监测问题池条目和问题来源记录写入 Prisma。后台 Prisma 镜像写入会捕获失败，避免数据库短暂异常变成未处理 Promise；当前请求仍以同步运行态视图为准。`QuestionPoolService` 会把监测问题候选同步为显式 `TestQuestionPoolItem`，并为新增问题写入 `TestQuestionSourceRecord`，用于后续持续扩展问题池和追溯来源。
- `TestThemeService` 和 `TestQuestionService`：监测主题和监测问题生成入口已接入 `LLMOrchestrationService` 的 `question_generation` 任务。LLM 成功时使用模型返回的主题和候选问题；平台未配置、密钥缺失、输出为空或候选主题无效时回退到现有规则模板。追光小牛内测样例继续保留 deterministic fixture，保证未配置真实 API 时仍可生成首轮监测内容。
- `MonitoringController` 回答解读入口：`POST /monitoring-runs/:runId/analysis/parse` 会先运行现有规则解析，保证结果可落库；随后尝试调用 `answer_analysis` LLM 任务覆盖表达字段。`llm-analysis-guard.ts` 会用规则结果二次校验品牌是否出现、引用分数、未知情绪和高风险表达，确保 LLM 输出不会绕过基础事实和合规判断。内存仓库的 `updateAnalysisResult` 会在 LLM 覆盖后继续触发竞品压制策略生成。
- `ContentGenerationWorker`：内容生成任务默认调用 `content_generation` LLM 任务生成草稿；测试仍可注入 `draftGenerator` 以保持 worker 测试稳定。LLM 不可用、失败或无输出时回退到基础草稿。生成结果继续通过 `completeContentGenerationTask` 写入 `ContentVersion`，导出、复制和发布入口沿用现有内容版本结构。worker 会把 LLM 返回的合规说明和复测建议追加到 Markdown 正文，并对品牌禁用表达和高风险表达做二次检查，在正文中追加“需要你确认”说明。
- `BrandsController` 增长优化计划生成入口：`POST /growth-optimization/generate` 会收集品牌资料、分析结果、内容资产、发布记录和当前计划，优先调用 `optimization_planning` LLM 任务。LLM 成功时写入 `GrowthOptimizationPlan`，创建下一轮复测问题，并尽量创建内容生成任务；LLM 失败时回退到仓储层规则计划。
- 默认 AI 平台与追光小牛 seed：新建品牌预置豆包、Kimi、DeepSeek、通义千问和阶跃星辰，并保存 OpenAI-compatible endpoint 候选、模型名称候选和人工录入兜底路径；豆包、Kimi、DeepSeek 和通义千问保留浏览器辅助监测路径，阶跃星辰默认走 API 接入候选；`manual_input` 与 `mock_ai` 保留为辅助平台。追光小牛默认 seed 预置“贵阳儿童运动”“3 到 5 岁儿童体能”“增高体能”三组高价值监测主题、对应候选问法和 `test_plan_demo_supercalf_first_round` 首轮 GEO 监测计划，覆盖本地推荐、年龄段需求和风险表达场景；同时预置 `growth_plan_demo_supercalf` 增长优化计划，包含内容缺口、核心卖点、风险表达和引用缺口原因，六类内容建议、公众号发布样例和 2026-07-27 复测任务
- `src/modules/monitoring/`：GEO 监测运行接口，支持创建运行记录、查看运行详情、录入人工回答、触发解析、查询解析结果和保存人工复核修正
- `src/modules/metrics/`：GEO 指数接口，支持单品牌指标看板和多品牌排行
- `src/modules/canvas/`：GEO 画布接口，支持画布数据读取、内容策略创建和优化任务创建
- `src/modules/competitors/`：竞品接口，支持竞品档案维护、同场景对比、压制分析、竞品发现任务、候选列表查询、候选确认和候选排除
- `src/modules/citations/`：引用分析接口，支持引用看板、内容资产绑定和引用增强策略创建
- `src/modules/evaluations/`：评价分析接口，支持评价看板、修正策略创建和品牌知识库更新
- `src/modules/content/`：内容接口，支持内容资产 CRUD、筛选、内容覆盖率、策略建议、策略批量生成、内容生成任务、增长优化计划内容任务批量生成、编辑版本、Markdown 导出和发布入口参数
- `src/modules/publishing/`：发布中心接口，支持发布平台列表、发布账号接入、账号重新授权、授权状态更新、发布记录创建和发布状态更新
- `src/modules/tasks/`：任务复测接口，支持优化任务看板、任务创建、状态流转、处理说明、复测计划、复测结果、增长优化计划复测指标对比和问题重开
- `src/modules/reports/`：报告中心接口，支持报告列表、单品牌报告、多品牌报告、客户交付报告、数据缺口标记和 Markdown 报告内容读取；报告 Markdown 通过共享渲染器生成，内存仓储和 Prisma 仓储保持模板一致
- `src/modules/advisor/`：顾问服务接口，支持品牌诊断、服务计划、服务复盘、客户交付、服务记录、培训记录、行业规则更新、顾问备注、跟进事项和报告引用
- `src/modules/permissions/`：示例用户、组织成员、角色、品牌权限、未授权访问记录、审计日志和权限查询接口；增长优化计划生成能力根据回答分析样本识别推荐率不足、排名落后、卖点缺口、竞品压制、风险表达和引用缺口，并生成优先级、负责人、截止时间、建议发布平台、复测时间和内容建议草稿；确认计划时会拆解为内容补强、平台发布、资料补充、问法复测和负责人跟进 5 类优化任务，并关联回 `GrowthOptimizationPlan`；增长优化内容任务生成会把内容建议转成 `ContentGenerationTask`，支持公众号推文、小红书图文、官网 FAQ、短视频脚本、平台介绍文案和图片创意需求；增长任务完成后会按来源监测运行创建复测计划，并在复测完成时对比优化前后的推荐率、品牌排名和表达准确性

## 数据层

Prisma schema 位于 `apps/api/prisma/schema.prisma`。

当前模型：

- `Brand`：品牌工作区基础模型
- `BrandProfile`：品牌知识库模型，包含介绍、卖点、FAQ、推荐表达、禁用表达和完整度评分
- `KnowledgeSource`：知识库导入来源模型，记录本地文件、网页链接、公众号素材和外部文档的导入状态
- `TestPlan`：首轮监测计划模型，记录已选监测问法、关联 Prompt、目标平台、连接方式摘要、预计耗时、确认事项和后续监测运行关联
- `OptimizationUnit`：品牌级 GEO 优化单元模型，记录品牌词、品类词、场景词、地域词和竞品词的关键词、优先级和启用状态
- `UserIntent`：品牌级用户意图模型，关联优化单元、意图分类和监测频率
- `PromptTemplate`：通用 Prompt 模板模型，记录模板文本、适用行业、目标关键词、目标平台和监测频率
- `BrandPrompt`：品牌专属 Prompt 模型，关联品牌、优化单元、用户意图和模板生成结果
- `User`：用户基础模型
- `Organization`：客户组织或服务组织模型，记录组织名称、状态和组织成员关系
- `Role`：组织或品牌角色模型，记录角色 code、scope 和权限标识集合
- `OrganizationMember`：组织成员模型，关联用户、组织、角色和成员状态
- `UserBrandPermission`：用户与品牌的角色授权关系
- `AuditLog`：关键操作审计基础模型，记录品牌、组织、操作者、动作、资源、结果和错误码
- `PlatformConfig`：品牌级 AI 平台配置模型
- `AIPlatformCallAudit`：品牌级 AI 平台调用审计模型，记录平台、模型、调用类型、状态、耗时、token、成本估算和失败信息
- `AsyncJob`：品牌级异步任务模型，记录任务类型、关联实体、队列状态、重试次数、下次执行时间和最后失败信息
- `LLMTaskRun`：品牌级大模型任务运行摘要模型，记录任务类型、状态、关联异步任务、关联调用审计、输入摘要、输出摘要和失败信息；memory 和 Prisma 仓储均支持创建与读取，摘要不保存真实平台密钥、cookies、storage state 或浏览器 profile 路径
- `VisibilitySprint`：品牌级 AI 可见性运营 Sprint 聚合模型，记录标题、目标、状态、当前阶段、阶段状态、指标摘要和关联业务对象 ID；Prisma 迁移 `20260711102000_add_visibility_sprints` 创建 `visibility_sprints` 表和品牌、状态、当前阶段、更新时间索引；该表只保存聚合状态与关联 ID，不保存真实回答正文、标准答案正文、平台密钥、cookies、storage state 或浏览器 profile 路径
- `BrandStandardAnswer`：品牌级标准答案模型，记录高价值问题、标准答案正文、关键点、证据、审核状态、审核人和审核时间；Prisma 迁移 `20260711113000_add_brand_standard_answers` 创建 `brand_standard_answers` 表和品牌、问题、状态、更新时间索引；该表用于对照分析和内容生成依据，不参与真实 AI 回复监测指标计算
- `MonitoringRun`：品牌级监测运行记录模型
- `AIResponse`：原始 AI 回答模型，关联监测运行和品牌
- `AnalysisResult`：AI 回答解析结果模型，记录品牌提及、推荐顺序、情绪倾向、准确分、引用分、竞品提及、平台评价、推荐理由、排名原因、卖点覆盖、表达偏差和人工复核状态；回答解析由 `analysis-result-builder.ts` 统一处理，memory 仓储和 Prisma 仓储共用同一套品牌名称/别名、竞品、卖点、背书、禁用表达和引用评分规则；业务解释通过现有说明字段输出“有没有出现”“排第几”“说得准不准”“竞品表现”“需要补什么内容”，排名落后时附带被压制原因候选项和内容补强建议；禁用表达、高风险承诺、排名无法判断或情绪无法判断会统一标记为“需要你确认”，并对“保证长高”“治疗感统失调”“包过中考体育”等表达输出审慎改法
- `GEOMetricSnapshot`：GEO 指数快照模型，记录提及分、推荐分、准确分、正向分、引用分、竞品对比分、知识库完整度影响项、总分和样本状态
- `Competitor`：竞品档案模型，记录竞品名称、别名、官网、行业标签、对比说明、连续压制规则、确认标签、候选来源、最近校区距离、全国标杆标记和校区周边重点竞品标记
- `CitationSource`：引用来源模型，记录来源标题、URL、来源类型、权威等级、引用次数、关联回答和关联内容资产
- `ContentAsset`：内容资产模型，记录标题、类型、平台、URL、目标关键词、复用来源、品牌适配说明、状态和发布时间
- `EvaluationIssue`：评价问题模型，记录问题类型、原始片段、正确表达建议、严重程度、状态、关联回答、关联 Prompt 和关联平台
- `ContentStrategy`：内容策略模型，记录策略类型、优先级、标题、目标平台、目标关键词、关联优化单元和关联用户意图
- `ContentGenerationTask`：内容生成任务模型，记录策略、增长优化计划、目标平台、内容类型、内容主题、目标关键词、引用资料、复测时间、任务状态、生成步骤、草稿引用和失败原因；repository port 支持按步骤更新 running、completed、failed、消息和完成时间，并自动推导任务状态；worker 成功后可通过完成写入契约创建最新 `ContentVersion`；失败时可记录失败步骤和关联 `AsyncJob` 错误，并支持重试重新入队；前端工作台展示任务状态摘要、步骤状态、失败提示和重试操作入口
- `GrowthOptimizationPlan`：增长优化计划模型，记录来源监测计划、来源监测运行、优化原因、优先级、负责人、截止时间、建议发布平台、复测时间、内容建议和关联优化任务；当前 memory 和 Prisma 仓储已提供计划生成、手动创建、确认拆任务、工作台聚合和复测联动能力，HTTP API 已通过品牌模块暴露
- `ContentVersion`：内容版本模型，记录生成任务、标题、正文、版本号和导出格式
- `ContentExportRecord`：内容导出记录模型，记录导出版本、导出格式、文件名、导出内容、创建人和创建时间
- `PublishingAccount`：发布账号模型，记录发布平台、账号名称、登录方式、授权状态、授权异常和最近授权时间
- `PublishingRecord`：发布记录模型，记录内容资产、发布账号、内容生成任务、内容版本、发布平台、发布状态、发布链接和异常原因
- `AutomationPackage`：自动化任务包模型，记录品牌、来源、目标平台、目标发布平台、当前步骤、步骤摘要、关联监测计划、增长计划、内容任务、发布记录和创建人
- `AutomationConfirmation`：自动化确认事项模型，记录任务包、品牌、确认类型、状态、标题、影响说明、建议、证据摘要、payload 和决策信息
- `PlatformRewriteVersion`：平台改写版本模型，记录内容版本、目标平台、标题、正文、标签、改写说明、合规提示和审核状态
- `TestQuestionPoolItem`：监测问题池模型，记录品牌、候选问题来源、问题角度、用途、目标平台、优先级、预计价值、来源和状态
- `TestQuestionSourceRecord`：监测问题来源记录模型，记录问题池条目、来源类型、来源 ID、摘要和创建时间
- `OptimizationTask`：优化任务模型，记录任务标题、状态、负责人、关联优化单元、关联 Prompt、关联平台、关联内容策略、关联增长优化计划、原始监测运行、复测运行、处理说明和复测记录；增长优化任务完成时自动进入待复测，复测记录保存优化前后推荐率、品牌排名、表达准确性、指标差值、是否提升和下一轮建议
- `Report`：报告模型，记录报告类型、统计周期、生成状态、Markdown 内容、数据缺口、聚合快照、创建人和创建时间；试点 seed 已内置客户交付报告用于演示报告导出和顾问服务引用
- `AdvisorRecord`：顾问服务记录模型，记录诊断、服务计划、服务复盘、客户交付、培训、行业规则更新和顾问备注内容，支持关联报告和跟进事项；试点 seed 已内置服务计划和交付复盘记录

当前所有业务模型通过 `brandId` 与 `Brand` 关联，作为后续品牌隔离约定的基础。第四阶段开始引入组织成员、角色、集中权限策略和审计日志模型，品牌访问在品牌授权之外还会检查用户状态、有效组织成员状态和当前路由所需最低角色；审计日志记录关键操作的品牌、组织、操作者、动作、资源、结果和归一化错误码。

## 共享契约

共享类型位于 `packages/shared-types/src/index.ts`。AI 自动化运营员共享契约已在该文件中定义，自动化任务包、步骤摘要、确认事项、平台改写版本、监测问题池、监测问题来源记录和 `AutomationAnalysisSummary` 均包含品牌隔离或可追溯关联信息。后端自动化模块位于 `apps/api/src/modules/automation/`，内存仓储和 Prisma 镜像仓储均支持任务包、确认事项、平台改写版本、监测问题池和问题来源记录。

AI 可见性运营 Sprint 共享契约已新增 `VisibilitySprint`、`VisibilitySprintStep`、`VisibilitySprintStatus`、`VisibilitySprintMetricSummary`、`QuestionRadarItem`、`QuestionRadarDashboard`、`BrandStandardAnswer`、`BrandStandardAnswerEvidence`、`BrandStandardAnswerInput`、`StandardAnswerAlignmentDashboard`、`StandardAnswerAlignmentItem`、`StandardAnswerAlignmentResponse`、`StandardAnswerAlignmentEvidence`、`SprintContentGapTask`、`SprintContentGapTaskResult`、`SprintContentTaskDashboard`、`SprintContentTaskItem`、`SprintContentTaskGapContext`、`SprintContentTaskDraftReadiness`、`SprintPublishingPreparationDashboard`、`SprintPublishingPreparationItem`、`SprintPublishingPreparationInput`、`SprintPublishingPreparationResult`、`SprintRetestPlanInput`、`SprintRetestPlanResult`、`SprintRetestTrendDashboard` 和 `SprintRetestTrendItem`。Sprint 契约作为现有监测、分析、内容、发布和复测对象上方的聚合层，保存阶段状态、关键指标和关联业务对象 ID；品牌工作区通过当前 Sprint 接口读取聚合状态，在首屏展示阶段进度、指标摘要和下一步动作；问题雷达契约作为 Sprint 下的只读视图，复用监测问题候选和监测主题输出意图、平台覆盖、业务价值与关联状态；对照分析契约作为 Sprint 下的只读视图，复用真实回答和已审核标准答案输出差异、证据和建议动作；内容缺口任务契约记录由对照分析转化出的内容策略、内容任务、来源问题、标准答案、真实回答运行和缺口类型；内容任务看板契约记录内容任务、当前草稿版本、来源缺口、复测目标和草稿可审稿状态；发布准备契约记录内容任务、当前版本、目标平台、发布记录和发布准备状态；复测契约记录复测任务、发布记录、前后指标、变化值和趋势状态；真实 AI 回复仍由 `AIResponse` 和 `MonitoringRun` 表达，品牌标准答案由独立模型表达，内容资产、发布记录和复测任务仍由内容、发布和任务模块表达，避免把标准答案或内容草稿算入真实监测指标。

`PermissionsRepositoryPort` 已新增 Sprint 仓储端口类型和可选方法，覆盖 Sprint 列表、详情、当前 Sprint、创建、阶段更新、指标更新和关联对象更新。端口方法保留 `userId` 与 `brandId` 参数，后续内存仓储、Prisma 仓储和 API 服务实现时继续沿用现有品牌访问校验边界。

内存仓储 `PermissionsRepository` 已新增 `visibilitySprints` 运行态集合，默认演示品牌 `brand_demo` 预置“追光小牛首轮 AI 可见性运营 Sprint”。该 Sprint 关联已有监测问题、监测计划、监测运行、内容生成任务、发布草稿和复测任务，并提供列表、详情、当前 Sprint、创建、阶段更新、指标更新和关联对象更新方法；所有方法都会先按 `userId` 与 `brandId` 复用现有品牌访问校验。Prisma 仓储 `PrismaPermissionsRepository` 已实现同一组 Sprint 方法，并通过 `visibility_sprints` 表持久化阶段 JSON、指标 JSON 和关联 ID JSON 数组。

第三阶段新增 `MonitoringWorker` 位于 `apps/api/src/modules/monitoring/monitoring.worker.ts`，负责按 monitoring 异步任务选择 AI Platform Adapter、写入回答、更新监测运行状态并记录调用审计。真实平台调用通过内部 `AIPlatformRuntimeConfig` 读取 `modelName` 和 `credentialRef`，公开平台配置响应继续只返回 `hasCredential` 与 `credentialRefMasked`。新增 `ContentGenerationWorker` 位于 `apps/api/src/modules/content/content-generation.worker.ts`，负责按 content_generation 异步任务推进内容生成步骤、写入版本并记录失败上下文。前端第三阶段状态展示已覆盖监测异步状态、失败原因、人工录入兜底入口、内容生成步骤状态和失败重新入队入口。

当前导出：

- `BrandId`
- `ApiError`
- `ApiResponse<T>`
- `HealthCheck`
- `BrandStatus`
- `BrandWorkspaceSummary`
- `BrandDetail`
- `BrandMutationInput`
- `BrandWorkspaceSnapshot`
- `BrandFaq`
- `BrandProfile`
- `BrandProfileInput`
- `BrandProfileCompleteness`
- `KnowledgeSourceType`
- `KnowledgeSourceStatus`
- `KnowledgeSource`
- `KnowledgeSourceInput`
- `OptimizationUnitType`
- `OptimizationUnitPriority`
- `OptimizationUnit`
- `OptimizationUnitInput`
- `MonitoringFrequency`
- `UserIntentCategory`
- `IntentPlatformMetric`
- `UserIntent`
- `UserIntentInput`
- `PromptTemplate`
- `PromptTemplateInput`
- `BrandPrompt`
- `BrandPromptInput`
- `PromptBatchGenerateInput`
- `PlatformMode`
- `PlatformConfig`
- `PlatformConfigInput`
- `PlatformValidationResult`
- `BrowserConnectionStatus`
- `BrowserConnectionIssueType`
- `BrowserConnectionSession`
- `BrowserConnectionStartInput`
- `BrowserConnectionStatusInput`
- `RunPromptInput`
- `RunPromptResult`
- `MonitoringRunStatus`
- `AIResponseParseStatus`
- `AnalysisSentiment`
- `CompetitorMention`
- `Competitor`
- `CompetitorInput`
- `CompetitorConfirmationLabel`
- `CompetitorDiscoveryRun`
- `CompetitorCandidate`
- `CompetitorCandidateDecisionInput`
- `CompetitorCandidateConfirmationResult`
- `CompetitorComparisonItem`
- `CompetitorDashboard`
- `CitationSourceType`
- `CitationAuthorityLevel`
- `CitationSource`
- `CitationDashboard`
- `ContentAsset`
- `ContentAssetInput`
- `ContentAssetFilter`
- `AnalysisResult`
- `AnalysisResultInput`
- `EvaluationIssueType`
- `EvaluationIssueSeverity`
- `EvaluationIssueStatus`
- `EvaluationIssue`
- `EvaluationDashboard`
- `GEOMetricScores`
- `GEOMetricSnapshot`
- `GEOMetricBreakdown`
- `BrandMetricDashboard`
- `BrandMetricRankingItem`
- `ContentStrategyType`
- `ContentStrategyPriority`
- `ContentStrategyStatus`
- `ContentStrategy`
- `ContentStrategyInput`
- `ContentStrategyFilter`
- `ContentStrategySuggestion`
- `ContentCenterDashboard`
- `ContentGenerationStatus`
- `ContentGenerationStep`
- `ContentGenerationTask`
- `ContentGenerationTaskInput`
- `ContentGenerationStepUpdateInput`
- `ContentGenerationCompletionInput`
- `ContentGenerationFailureInput`
- `ContentGenerationRetryInput`
- `ContentVersion`
- `ContentVersionInput`
- `ContentExportRecord`
- `PublishingEntryPayload`
- `ContentGenerationWorkspace`
- `GrowthContentType`
- `GrowthOptimizationPlanStatus`
- `GrowthOptimizationReasonType`
- `GrowthOptimizationReason`
- `GrowthOptimizationContentRecommendation`
- `GrowthOptimizationPlan`
- `GrowthOptimizationPlanInput`
- `GrowthOptimizationPlanConfirmInput`
- `GrowthOptimizationPlanConfirmationResult`
- `GrowthOptimizationPlanUpdateInput`
- `GrowthOptimizationWorkspace`
- `PublishingAuthStatus`
- `PublishingRecordStatus`
- `PublishingLoginMode`
- `PublishingPlatform`
- `PublishingAccount`
- `PublishingAccountInput`
- `PublishingRecord`
- `PublishingRecordInput`
- `PublishingStatusInput`
- `PublishingDashboard`
- `OptimizationTaskStatus`
- `OptimizationTask`
- `OptimizationTaskInput`
- `OptimizationTaskUpdateInput`
- `RetestPlanInput`
- `RetestResultInput`
- `RetestRecord`
- `TaskBoardDashboard`
- `ReportType`
- `ReportStatus`
- `ReportDataGap`
- `SingleBrandReportSnapshot`
- `MultiBrandReportSnapshot`
- `ReportRecord`
- `ReportInput`
- `ReportDashboard`
- `AdvisorRecordType`
- `AdvisorFollowUpStatus`
- `AdvisorFollowUpItem`
- `AdvisorRecord`
- `AdvisorRecordInput`
- `AdvisorDashboard`
- `GeoCanvasNodeType`
- `GeoCanvasNode`
- `GeoCanvasEdge`
- `GeoCanvasWorkspace`
- `MonitoringRun`
- `AIResponse`
- `MonitoringRunDetail`
- `MonitoringRunInput`
- `ManualResponseInput`
- `UserStatus`
- `UserBrandRole`
- `UserSummary`
- `UserBrandPermission`
- `AccessibleBrand`
- `DeniedAccessLog`
- `VisibilitySprintStatus`
- `VisibilitySprintStepCode`
- `VisibilitySprintMetricSummary`
- `VisibilitySprintStep`
- `VisibilitySprint`

## 模块边界

当前工程已实现品牌权限基础边界、品牌工作区 CRUD、品牌知识库编辑、完整度评分、知识库多来源导入记录、品牌级 GEO 优化单元管理、用户意图和 Prompt 模板生成、AI 平台配置 CRUD、平台密钥隐藏、配置校验、Adapter 边界、监测运行记录、示例自动回答、人工回答录入、失败原因记录、回答解析结果、人工复核闭环、GEO 指数计算、单品牌看板、多品牌排行、GEO 画布工作台、增长优化计划页、竞品压制分析、引用来源分析、评价分析、内容策略中心、内容生成工作台、发布中心、任务复测中心、报告中心、顾问服务工作台和第一版运营后台页面串联。后台导航当前按总览、发现机会、数据分析、内容运营和运营闭环分组，顶部展示当前页面、当前品牌和运营流程步骤；流程条按品牌初始化、监测主题与场景、发现增长机会、增长优化计划、策略生成、内容生产、发布记录、复测闭环、顾问跟进和报告导出串联。品牌化路由 `/brands/:brandId/*` 会写入当前品牌上下文，并映射到第一版已有页面。品牌工作区、监测问题、连接 AI 平台、监测记录和增长优化页已补齐下一步提示，首轮监测后引导用户补充品牌资料、连接更多平台、生成内容优化任务并安排复测。画布工作台当前聚合优化单元、用户意图、单元指标、内容策略和优化任务，并提供创建入口；增长优化计划页当前承接首轮监测结果，展示优化原因、优先级、负责人、截止时间、发布平台、复测时间、内容建议和关联执行任务，并提供确认拆任务、生成内容任务、标记完成和发起复测入口；竞品分析当前基于解析结果聚合同 Prompt、同平台、同场景和同优化单元下的排名差距，连续压制时生成高优先级竞品回应策略；引用分析当前基于回答引用列表聚合官网、媒体、社媒、百科和第三方平台来源，并支持绑定内容资产和创建权威引用增强策略；评价分析当前基于解析结果聚合正向、中性、负向和准确表达率，派生错误信息、缺失卖点、禁用表达、负向表达和准确性偏低问题，并支持生成 `correction` 内容策略或写回品牌知识库；内容策略中心当前基于品牌知识库、优化单元关键词、内容资产、解析结果和竞品压制结果生成 `gap`、`correction`、`enhancement`、`authority_citation` 和 `competitor_response` 策略建议，并支持写入内容策略列表；内容生成工作台当前基于内容策略、品牌知识库、用户意图和目标平台生成可编辑 Markdown 草稿，覆盖公众号推文、小红书图文、官网 FAQ、短视频脚本、平台介绍文案和图片创意需求，展示内容主题、目标关键词、引用资料、复测时间、增长计划来源、生成步骤、版本、导出记录和发布入口参数；发布中心当前支持公众号、头条号、搜狐号、百家号账号接入，记录授权状态和异常原因，并将内容生成版本转换为带内容资产、账号、平台和状态的发布记录；任务复测中心当前支持从监测问题创建优化任务、记录处理说明和内容链接、创建复测计划、保存原始监测运行与复测运行关联，并在复测未达标时重开任务和生成下一轮修正策略；报告中心当前聚合 GEO 指数、竞品、引用、评价、内容缺口、任务进度和多品牌排名，生成带 YAML metadata、数据缺口、指标解释、问题归因、行动建议、品牌对比、风险提示、交付进度和下一步动作的 Markdown 报告；顾问服务工作台当前沉淀品牌诊断、服务计划、服务复盘、客户交付、服务记录、培训记录、行业规则更新、顾问备注、结构化服务详情、待跟进事项和客户交付报告引用关系。
