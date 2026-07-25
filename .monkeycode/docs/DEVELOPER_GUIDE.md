# 开发者指南

## 开发入口

GEO 平台工程位于 ``。

```bash
cd geo-platform
```

## 环境变量

环境变量样例位于 `.env.example`。

当前变量：

```bash
DATABASE_URL="postgresql://geo:geo@localhost:5432/geo_platform?schema=public"
GEO_REPOSITORY_DRIVER="memory"
PORT=3001
GEO_AI_PLATFORM_CONFIGURED="false"
STEPFUN_API_KEY=""
GEO_AMAP_API_KEY=""
```

内测默认大模型使用阶跃星辰 `step-3.7-flash`。本地或试运行环境可以把真实密钥放在 `STEPFUN_API_KEY`；新品牌默认阶跃星辰配置会自动引用该环境变量。健康检查会在 `STEPFUN_API_KEY` 存在或 `GEO_AI_PLATFORM_CONFIGURED` 为 `true` 时将 `aiPlatforms` 显示为 `configured`。

## 常用命令

```bash
# 安装依赖
npm install

# 启动前端与后端
npm run dev

# 仅启动前端
npm run dev:web

# 仅启动后端
npm run dev:api

# 类型检查
npm run typecheck

# 测试
npm run test

# 一键交付验证：依赖安全审计、类型检查、测试、构建、Prisma schema 校验和 Prisma Client 生成
npm run verify

# Prisma schema 校验
npm run prisma:validate

# Prisma Client 生成
npm run prisma:generate

# 准备数据库 demo 数据
npm run db:prepare
```

## Repository 切换

默认开发模式使用内存仓储，便于无数据库环境运行类型检查、测试、构建和预览。内存仓储内置 `brand_demo` 最小试点演示闭环，可直接用于本地预览。

```bash
# 使用 Prisma repository 启动 API
GEO_REPOSITORY_DRIVER=prisma npm run dev:api
```

数据库准备入口：

```bash
# 生成 Prisma Client 并写入 demo seed
npm run db:prepare

# 仅写入 demo seed
npm run prisma:seed
```

## 当前验证状态

已完成最终交付前验证：

- `package.json` 与 `tsconfig.json` 配置可解析
- `.monkeycode/specs/beginner-friendly-geo-workflow/tasklist.md` 中全部任务已标记完成
- 前端 Vite 配置包含 `/api` 代理和 `.monkeycode-ai.online` allowedHosts
- 后端 API 前缀为 `/api/v1`，并通过 `x-brand-id` 和 `x-user-id` 维护请求上下文
- API 中间件通配路由使用 Nest 11 / Express 5 兼容写法 `forRoutes('{*splat}')`
- `typescript` 固定为 `5.9.3`，用于保持 Nest CLI、Vite 和 `tsc` 构建链路稳定
- `prisma` 和 `@prisma/client` 固定为 `6.19.3`，用于保持 Prisma CLI、schema 校验和 client 生成链路稳定
- `multer` 固定为 `2.2.0`，并通过 root `overrides` 让 `@nestjs/platform-express` 使用安全版本
- Web `tsconfig.json` 启用 `noEmit`，避免 `tsc -b` 在 `src/` 旁生成 `.js` 产物并污染 Vite 解析
- `npm run build` 已通过
- `npm run typecheck --workspaces` 已通过
- `npm run test --workspace @geo-platform/api` 已通过，API 当前 64 个测试文件、289 个测试用例通过
- `npm run test --workspace @geo-platform/web` 已通过，Web 当前 20 个测试文件、99 个测试用例通过
- `DATABASE_URL="postgresql://geo:geo@localhost:5432/geo_platform?schema=public" npx prisma validate --schema apps/api/prisma/schema.prisma` 已通过
- `npm run prisma:generate` 已通过，Prisma Client 生成版本为 `6.19.3`
- API 健康检查、前端入口检查和 5173 公开预览检查已通过
- API 健康检查会根据 `STEPFUN_API_KEY` 或 `GEO_AI_PLATFORM_CONFIGURED=true` 判断 AI 平台配置状态
- 平台配置、品牌隔离、平台校验业务化提示、安全脱敏、端到端写链路和冷启动恢复已通过
- 第二阶段任务 3 已新增 `PrismaPermissionsRepository`，覆盖用户、品牌、品牌权限、工作区计数和拒绝访问日志的 Prisma 访问路径。
- 第二阶段任务 5 已扩展 `PrismaPermissionsRepository`，覆盖品牌档案、知识来源、优化单元、用户意图、Prompt 模板和品牌 Prompt 的 Prisma 访问路径。
- 第二阶段任务 6 已扩展 `PrismaPermissionsRepository`，覆盖平台配置脱敏响应、监测运行、人工回答、分析结果和 GEO 指标快照读取。
- 第二阶段任务 8 已扩展 `PrismaPermissionsRepository`，覆盖内容资产、内容策略、内容生成任务、内容版本、导出记录、发布账号、发布记录、优化任务、报告和顾问记录的 Prisma 访问路径。
- 第二阶段任务 9 已支持通过 `GEO_REPOSITORY_DRIVER=prisma` 切换 Prisma repository，并新增 `npm run db:prepare`、`npm run prisma:seed` 和 demo seed 数据入口。
- 第三阶段已建立 `.monkeycode/specs/ai-platform-async-tasks/` 规格，并完成 Adapter registry、`OpenAICompatibleAdapter`、AI 平台调用审计基础模型、异步任务基础模型、监测创建入队流程、Monitoring worker、失败重试状态机、监测任务状态机测试、内容生成创建入队流程、内容生成步骤状态记录、生成成功后的内容版本写入、内容生成失败重试契约、`ContentGenerationWorker` 契约测试、监测异步状态前端展示、内容生成步骤状态展示和失败重试入口。
- 第四阶段已建立 `.monkeycode/specs/access-audit-production/` 规格，并完成真实用户、组织和角色模型基础、审计日志服务基础、集中权限策略、生产健康检查和部署运行手册：共享类型和 Prisma schema 已新增 Organization、OrganizationMember、Role、AuditLog 基础模型，品牌访问前置校验已纳入用户状态、有效组织成员和路由最低角色检查，审计日志支持写入、筛选查询和敏感 metadata 脱敏，健康检查返回 repository driver、runtime environment、dependency readiness 和 missingConfiguration。
- 第五阶段已建立 `.monkeycode/specs/product-experience-performance/` 规格，并完成任务 2：主要前端页面已改为 lazy route component，路由加载 fallback 已补齐，Vite 构建通过 `codeSplitting.groups` 拆分 React、Ant Design、TanStack Query 和通用 vendor chunks。
- 第五阶段任务 1 已完成关键页面体验状态整改：新增 `PageState` 共享组件，品牌工作区、监测、内容生成、发布、任务、报告和顾问页面已统一错误提示、空状态主操作和关键操作反馈。
- 第五阶段任务 3 已完成报告模板和导出格式增强：内存仓储和 Prisma 仓储共用报告渲染器，Markdown 内容包含 YAML metadata、指标解释、问题归因、行动建议、品牌对比、风险提示、交付进度和下一步动作；目标验证 `npm run typecheck --workspace @geo-platform/api` 和 `npm run test --workspace @geo-platform/api -- report-center.repository.test.ts prisma-permissions.repository.test.ts` 已通过。
- 第五阶段任务 4 已完成服务化交付工作台增强：顾问记录类型新增服务计划、服务复盘和客户交付，前端顾问工作台支持结构化记录问题、建议、服务目标、里程碑、负责人、预期结果、完成动作、数据变化、下一步、关联报告和待跟进事项；目标验证 `npm run test --workspace @geo-platform/api -- advisor-records.repository.test.ts prisma-permissions.repository.test.ts` 和 `npm run test --workspace @geo-platform/web -- AdvisorWorkspacePage.test.ts` 已通过。
- 第五阶段任务 5 已完成试点客户演示数据和验收清单：默认 memory demo 和 Prisma demo seed 覆盖品牌、监测、内容、发布、任务、报告和顾问记录；`.monkeycode/docs/PILOT_DEMO_CHECKLIST.md` 收口演示路径、验收标准、已知限制和反馈转需求记录格式。
- 第五阶段检查点已完成：seed 语法检查、Prisma schema 校验、`git diff --check`、`npm run verify`、API 健康检查、前端入口检查和 5173 预览检查均已通过。
- 持续迭代机制已建立：`.monkeycode/docs/CONTINUOUS_ITERATION_PLAYBOOK.md` 收口阶段复盘、反馈转需求、行业规则变化、文档同步和验证门禁。
- 持续迭代检查点已完成：`git diff --check`、`npm run verify`、API 健康检查、前端入口检查和 5173 预览检查均已通过。

当前已安装 npm workspace 依赖，`package-lock.json` 由 `npm install` 生成。

## 后续开发顺序

当前 `.monkeycode/specs/beginner-friendly-geo-workflow/tasklist.md` 中全部任务已完成。

大模型 API 接入实施计划位于 `.monkeycode/specs/llm-api-integration/tasklist.md`。当前已完成任务 1 到任务 12：共享类型新增 LLM 任务契约、四类任务输入输出类型、监测资产生成结果类型和 `LLMTaskRun` 摘要类型，平台 Adapter 新增 `runMessages` 契约，`OpenAICompatibleAdapter` 支持结构化 messages、JSON 输出参数和 token usage 归一化，后端新增 `llm` 模块、`LLMOrchestrationService`、四类任务 API 和任务状态查询，Prompt 模板与输出校验已按四类任务落地，监测主题和监测问题生成入口已优先调用 `question_generation` 并保留规则 fallback，回答解析入口已优先调用 `answer_analysis` 并通过规则层二次校验保护品牌出现、引用分数和风险表达，内容生成 worker 已默认调用 `content_generation` 并保留测试注入和基础草稿 fallback，增长优化计划生成入口已优先调用 `optimization_planning` 并创建下一轮问题和内容任务，memory 和 Prisma 仓储已支持 `LLMTaskRun` 创建与读取，LLM 编排服务会记录 queued、succeeded 和 failed 任务摘要，前端已保留监测主题/问题生成的资料缺失、生成说明和 fallback 提示，内容生成页已展示合规说明、复测建议和发布前确认提示。检查点已通过 `npm run typecheck --workspaces`、`npm run test --workspace @geo-platform/api`、`npm run test --workspace @geo-platform/web`、`npm run build`、`npm run prisma:validate` 和 `npm run prisma:generate` 验证。

AI 自动化运营员实施计划位于 `.monkeycode/specs/ai-automation-operator/tasklist.md`。当前已完成任务 1 到任务 11：后端自动化模块、确认队列、问题池精选、监测执行、回答分析、内容生成、平台改写、发布建议、复测建议、前端自动化卡片和数据持久化结构均已落地；Prisma schema 已新增自动化任务包、确认事项、平台改写版本、监测问题池和问题来源记录模型。任务 11 验证已通过 `npm run prisma:validate`、`npm run prisma:generate`、`npm run typecheck --workspace @geo-platform/api`、`npm run typecheck --workspace @geo-platform/shared-types`、自动化仓储/编排相关测试以及平台配置和浏览器会话脱敏测试。

AI 自动化运营员检查点已完成，追光小牛内测路径可启动自动化任务包，维护监测问题池并精选本轮 6 个监测问题等待确认；确认后可进入监测计划执行，后续可串联回答分析、内容草稿、平台改写、发布建议和复测建议。深度审计已覆盖 Prisma 自动化镜像写入失败保护、首次生成问题后的精选读取顺序、发布建议确认失败重试状态、发布建议确认抽屉明细展示和服务层品牌访问校验。最终验证已通过 `npm run verify`，当前覆盖 API 64 个测试文件、289 个用例，Web 20 个测试文件、99 个用例，以及 workspace 类型检查、workspace 构建、Prisma schema 校验和 Prisma Client 生成。

AI 可见性运营 Sprint 重构规格位于 `.monkeycode/specs/ai-visibility-sprint-refactor/tasklist.md`。当前已完成任务 1.1 到 4.2：共享类型新增 `VisibilitySprint`、`VisibilitySprintStep`、`VisibilitySprintStatus`、`VisibilitySprintMetricSummary`、`QuestionRadarItem`、`QuestionRadarDashboard`、`BrandStandardAnswer`、`BrandStandardAnswerEvidence`、`BrandStandardAnswerInput`、`StandardAnswerAlignmentDashboard`、`StandardAnswerAlignmentItem`、`StandardAnswerAlignmentResponse`、`StandardAnswerAlignmentEvidence`、`SprintContentGapTask` 和 `SprintContentGapTaskResult`，用于表达 Sprint 阶段、状态、指标摘要、现有业务对象关联 ID、问题雷达只读视图、品牌标准答案、真实回复对照分析和内容缺口任务生成结果；后端 `PermissionsRepositoryPort` 已新增 Sprint 列表、详情、当前 Sprint、创建、阶段更新、指标更新、关联对象更新和标准答案读写方法签名；内存仓储已预置追光小牛首轮 AI 可见性运营 Sprint 和 `standard_answer_demo_local_recommendation` 标准答案，并实现 Sprint CRUD、阶段更新、指标更新、关联对象更新和标准答案 CRUD；Prisma schema 已新增 `VisibilitySprint` 与 `BrandStandardAnswer` 模型，对应迁移为 `20260711102000_add_visibility_sprints` 和 `20260711113000_add_brand_standard_answers`，`PrismaPermissionsRepository` 已实现 Sprint 与标准答案持久化读写；`SprintsController` 已提供列表、当前、详情、创建、启动、停止、问题雷达、标准答案列表、标准答案生成、标准答案确认、标准答案对照分析、内容缺口任务生成、指标刷新和阶段推进 HTTP API；`QuestionRadarService` 已从监测问题候选和监测主题输出问题意图、平台覆盖、业务价值、状态和 Sprint 关联状态，并在同一 Sprint 内按归一化问题文本去重；`StandardAnswerService` 已从 Sprint 选题、品牌工作区和品牌档案生成 `ready_for_review` 标准答案草稿，用户确认后更新为 `approved` 并关联回 Sprint；`StandardAnswerAlignmentService` 已从 Sprint 关联真实监测运行、解析结果、监测问题候选和已审核标准答案输出覆盖、准确性、风险表达、引用缺口、竞品压制、证据和建议动作，缺少真实回答或标准答案时返回等待状态；`SprintContentGapService` 已将对照分析中 `needs_attention` 的问题转化为内容策略和内容生成任务，使用 `referenceSources` 关联 Sprint、问题、标准答案、真实回答运行和证据摘要，并把任务 ID 写回 Sprint；`SprintMetricsService` 已从 Sprint 关联真实监测运行和解析结果聚合指标摘要，不读取品牌标准答案或内容草稿作为监测样本；`SprintStageService` 已按问题、真实回答、标准答案、指标状态、内容任务、发布记录和复测任务推进阶段，缺少真实回答时保持等待状态。验证已通过 `npm run typecheck --workspace @geo-platform/shared-types`、`npm run typecheck --workspace @geo-platform/api`、`npm run test --workspace @geo-platform/api -- sprint-content-gap.service.test.ts standard-answer-alignment.service.test.ts sprints.controller.test.ts sprint-metrics.service.test.ts sprint-stage.service.test.ts standard-answer.service.test.ts question-radar.service.test.ts` 和 `git diff --check`。

AI 可见性运营 Sprint 任务 5.1 已完成：共享类型新增 `SprintContentTaskDashboard`、`SprintContentTaskItem`、`SprintContentTaskGapContext` 和 `SprintContentTaskDraftReadiness`；`SprintContentGapService` 新增内容缺口任务看板，读取 Sprint 关联内容任务、当前草稿版本和标准答案对照结果，输出来源问题、缺口类型、证据摘要、建议动作、复测目标和草稿可审稿状态；`SprintsController` 新增 `GET /api/v1/brands/:brandId/sprints/:sprintId/content-gaps/tasks`。验证已通过 `npm run typecheck --workspace @geo-platform/shared-types`、`npm run typecheck --workspace @geo-platform/api` 和 `npm run test --workspace @geo-platform/api -- sprint-content-gap.service.test.ts sprints.controller.test.ts`。

AI 可见性运营 Sprint 任务 5.2 已完成：共享类型新增 `SprintPublishingPreparationDashboard`、`SprintPublishingPreparationItem`、`SprintPublishingPreparationInput` 和 `SprintPublishingPreparationResult`；`SprintPublishingService` 新增发布准备看板和发布准备记录创建能力，读取 Sprint 内容任务、当前草稿版本和发布记录，输出草稿、待人工发布、已发布、失败状态，并将发布中心记录 ID 写回 Sprint；`SprintsController` 新增 `GET /api/v1/brands/:brandId/sprints/:sprintId/publishing-preparation` 和 `POST /api/v1/brands/:brandId/sprints/:sprintId/publishing-preparation/records`。发布准备创建只写入 `draft` 或 `pending` 状态，不生成不可访问伪链接。验证已通过 `npm run typecheck --workspace @geo-platform/shared-types`、`npm run typecheck --workspace @geo-platform/api` 和 `npm run test --workspace @geo-platform/api -- sprint-publishing.service.test.ts sprints.controller.test.ts sprint-stage.service.test.ts`。

AI 可见性运营 Sprint 任务 5.3 已完成：共享类型新增 `SprintRetestPlanInput`、`SprintRetestPlanResult`、`SprintRetestTrendDashboard` 和 `SprintRetestTrendItem`；`SprintRetestService` 新增复测计划创建和复测趋势看板，复用任务中心 `OptimizationTask` 与 `RetestRecord`，从 Sprint 发布记录创建复测任务并写回 `relatedRetestTaskIds`，草稿和失败发布记录会跳过；趋势看板聚合基线指标、复测完成数、改善数、前后指标和变化值。`SprintsController` 新增 `POST /api/v1/brands/:brandId/sprints/:sprintId/retest-plan` 和 `GET /api/v1/brands/:brandId/sprints/:sprintId/retest-trend`。验证已通过 `npm run typecheck --workspace @geo-platform/shared-types`、`npm run typecheck --workspace @geo-platform/api` 和 `npm run test --workspace @geo-platform/api -- sprint-retest.service.test.ts sprints.controller.test.ts sprint-stage.service.test.ts`。

AI 可见性运营 Sprint 任务 6.1 已完成：品牌工作区新增当前 Sprint 工作台入口，通过 `GET /api/v1/brands/:brandId/sprints/current` 展示 Sprint 状态、阶段进度、指标摘要和下一步动作；新增 `sprintWorkspace.ts` helper 管理状态文案、Ant Design 步骤状态映射、进度计算、指标卡和下一步路由。验证已通过 `npm run test --workspace @geo-platform/web -- BrandWorkspacePage.test.ts` 和 `npm run typecheck --workspace @geo-platform/web`。

AI 可见性运营 Sprint 任务 6.2 已完成：前端 `/monitoring` 路由产品口径调整为“AI 回复监测”，导航、品牌工作区、监测页、手动录入、监测记录、优化计划、任务复测和自动化确认提示均强调真实 AI 原始回复、回复解读和再次监测；手动录入入口继续使用 `/monitoring#manual-test-entry`，作为真实浏览器或 API 未接入时的可信回填路径。

AI 可见性运营 Sprint 任务 6.3 已完成：优化计划页新增“标准答案与内容缺口诊断”视图，读取当前 Sprint、标准答案对照和内容缺口任务看板，按监测问题展示真实 AI 回复数量、品牌标准答案状态、内容资产准备状态、缺口类型和建议动作；新增 `growthSprintDiagnostics.ts` helper 与测试，保持真实回复、品牌标准答案和内容资产三类对象分离。

AI 可见性运营 Sprint 任务 6.4 已完成：任务跟进页新增“Sprint 复测趋势”看板，读取当前 Sprint 和 `retest-trend` 聚合接口，展示计划复测任务、已完成复测、改善任务、完成率，以及提及率、推荐率、首位推荐率、引用命中率、表达准确率、风险表达数和问题覆盖率的基线、当前值和变化；新增 `sprintRetestTrend.ts` helper 与测试，并同步将遗留复测文案改为“再次监测”。后续扫尾已同步前端、后端公开响应和测试断言中的平台执行口径为“自动监测 / 浏览器辅助监测 / 手动录入”。

AI 可见性运营 Sprint 任务 7.1 和 7.2 已完成：项目文档已同步到 `ARCHITECTURE.md`、`INTERFACES.md`、`DEVELOPER_GUIDE.md` 和文档索引；完整验证门禁的审计、类型检查、API 测试、Web 测试、构建、Prisma schema 校验和 Prisma Client 生成均已通过，最新 `npm run verify` 已完整通过。

第一阶段上线门禁已完成追光小牛内测路径验证：自动生成监测主题后可生成 8 个监测问题，问题包含目的、目标平台、优先级和预计价值；监测问题可保存为计划并进入浏览器确认监测流程；公开平台配置响应仅包含 `hasCredential` 和脱敏状态，不暴露 `credentialRef`；LLM 异步任务响应只返回任务状态和 `jobId`；品牌总览、AI 回复监测、优化计划、写内�
