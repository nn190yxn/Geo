# 开发者指南

## 开发入口

GEO 平台工程位于 `当前工作区/`。

开发环境需要 Node.js 22.22 或更高版本，项目使用 npm workspaces 管理依赖与脚本。

## 环境变量

环境变量样例位于 `当前工作区/.env.example`。

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

# 一键交付验证：依赖安全审计、Prisma schema 校验、Client 生成、类型检查、测试和构建
npm run verify

# Prisma schema 校验
npm run prisma:validate

# Prisma Client 生成
npm run prisma:generate

# 准备数据库 demo 数据
npm run db:prepare
```

## Windows 单机发布

对外产品名为“AI品牌曝光助手”。推送 `v<major>.<minor>.<patch>` 标签时，GitHub Actions 使用 Windows Runner 生成包含 API、Web、Electron 和 PostgreSQL runtime 的 EXE 安装包及 GitHub Release。Windows 安装包独立运行，运行数据保留在 `%LOCALAPPDATA%\AI-Brand-Visibility-Assistant\data`，升级安装包后继续复用数据库和日志。

发布配置位于 `当前工作区/.github/workflows/windows-release.yml`，安装程序与控制脚本位于 `当前工作区/deploy/windows/`。

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
- `当前工作区/.monkeycode/specs/beginner-friendly-geo-workflow/tasklist.md` 中全部任务已标记完成
- 前端 Vite 配置包含 `/api` 代理和 `.monkeycode-ai.online` allowedHosts
- 后端 API 前缀为 `/api/v1`，并通过 `x-brand-id` 和 `x-user-id` 维护请求上下文
- API 中间件通配路由使用 Nest 11 / Express 5 兼容写法 `forRoutes('{*splat}')`
- `typescript` 固定为 `5.9.3`，用于保持 Nest CLI、Vite 和 `tsc` 构建链路稳定
- `prisma` 和 `@prisma/client` 固定为 `6.19.3`，用于保持 Prisma CLI、schema 校验和 client 生成链路稳定
- `multer` 固定为 `2.2.0`，并通过 root `overrides` 让 `@nestjs/platform-express` 使用安全版本
- Web `tsconfig.json` 启用 `noEmit`，避免 `tsc -b` 在 `src/` 旁生成 `.js` 产物并污染 Vite 解析
- `npm run build` 已通过
- `npm run typecheck --workspaces` 已通过
- `npm run test --workspace @geo-platform/api` 已通过，API 当前 68 个测试文件、308 个测试用例通过
- `npm run test --workspace @geo-platform/web` 已通过，Web 当前 28 个测试文件、152 个测试用例通过
- `DATABASE_URL="postgresql://geo:geo@localhost:5432/geo_platform?schema=public" npx prisma validate --schema apps/api/prisma/schema.prisma` 已通过
- `npm run prisma:generate` 已通过，Prisma Client 生成版本为 `6.19.3`
- API 健康检查、前端入口检查和 5173 公开预览检查已通过
- 五类页面 BFF 聚合接口已通过 service、品牌隔离、空数据 fallback、示例平台过滤和本地 HTTP 烟测
- API 健康检查会根据 `STEPFUN_API_KEY` 或 `GEO_AI_PLATFORM_CONFIGURED=true` 判断 AI 平台配置状态
- 平台配置、品牌隔离、平台校验业务化提示、安全脱敏、端到端写链路和冷启动恢复已通过
- 公开响应净化覆盖平台配置、浏览器会话、LLM、自动化、Sprint 和页面 BFF；真实指标边界测试覆盖 `mock_ai` 与空原始回复排除，并确认手动录入真实回复继续参与聚合
- 第二阶段任务 3 已新增 `PrismaPermissionsRepository`，覆盖用户、品牌、品牌权限、工作区计数和拒绝访问日志的 Prisma 访问路径。
- 第二阶段任务 5 已扩展 `PrismaPermissionsRepository`，覆盖品牌档案、知识来源、优化单元、用户意图、Prompt 模板和品牌 Prompt 的 Prisma 访问路径。
- 第二阶段任务 6 已扩展 `PrismaPermissionsRepository`，覆盖平台配置脱敏响应、监测运行、人工回答、分析结果和 GEO 指标快照读取。
- 第二阶段任务 8 已扩展 `PrismaPermissionsRepository`，覆盖内容资产、内容策略、内容生成任务、内容版本、导出记录、发布账号、发布记录、优化任务、报告和顾问记录的 Prisma 访问路径。
- 第二阶段任务 9 已支持通过 `GEO_REPOSITORY_DRIVER=prisma` 切换 Prisma repository，并新增 `npm run db:prepare`、`npm run prisma:seed` 和 demo seed 数据入口。
- 第三阶段已建立 `当前工作区/.monkeycode/specs/ai-platform-async-tasks/` 规格，并完成 Adapter registry、`OpenAICompatibleAdapter`、AI 平台调用审计基础模型、异步任务基础模型、监测创建入队流程、Monitoring worker、失败重试状态机、监测任务状态机测试、内容生成创建入队流程、内容生成步骤状态记录、生成成功后的内容版本写入、内容生成失败重试契约、`ContentGenerationWorker` 契约测试、监测异步状态前端展示、内容生成步骤状态展示和失败重试入口。
- 第四阶段已建立 `当前工作区/.monkeycode/specs/access-audit-production/` 规格，并完成真实用户、组织和角色模型基础、审计日志服务基础、集中权限策略、生产健康检查和部署运行手册：共享类型和 Prisma schema 已新增 Organization、OrganizationMember、Role、AuditLog 基础模型，品牌访问前置校验已纳入用户状态、有效组织成员和路由最低角色检查，审计日志支持写入、筛选查询和敏感 metadata 脱敏，健康检查返回 repository driver、runtime environment、dependency readiness 和 missingConfiguration。
- 第五阶段已建立 `当前工作区/.monkeycode/specs/product-experience-performance/` 规格，并完成任务 2：主要前端页面已改为 lazy route component，路由加载 fallback 已补齐，Vite 构建通过 `codeSplitting.groups` 拆分 React、Ant Design、TanStack Query 和通用 vendor chunks。
- 第五阶段任务 1 已完成关键页面体验状态整改：新增 `PageState` 共享组件，品牌工作区、监测、内容生成、发布、任务、报告和顾问页面已统一错误提示、空状态主操作和关键操作反馈。
- 第五阶段任务 3 已完成报告模板和导出格式增强：内存仓储和 Prisma 仓储共用报告渲染器，Markdown 内容包含 YAML metadata、指标解释、问题归因、行动建议、品牌对比、风险提示、交付进度和下一步动作；目标验证 `npm run typecheck --workspace @geo-platform/api` 和 `npm run test --workspace @geo-platform/api -- report-center.repository.test.ts prisma-permissions.repository.test.ts` 已通过。
- 第五阶段任务 4 已完成服务化交付工作台增强：顾问记录类型新增服务计划、服务复盘和客户交付，前端顾问工作台支持结构化记录问题、建议、服务目标、里程碑、负责人、预期结果、完成动作、数据变化、下一步、关联报告和待跟进事项；目标验证 `npm run test --workspace @geo-platform/api -- advisor-records.repository.test.ts prisma-permissions.repository.test.ts` 和 `npm run test --workspace @geo-platform/web -- AdvisorWorkspacePage.test.ts` 已通过。
- 第五阶段任务 5 已完成试点客户演示数据和验收清单：默认 memory demo 和 Prisma demo seed 覆盖品牌、监测、内容、发布、任务、报告和顾问记录；`当前工作区/.monkeycode/docs/PILOT_DEMO_CHECKLIST.md` 收口演示路径、验收标准、已知限制和反馈转需求记录格式。
- 第五阶段检查点已完成：seed 语法检查、Prisma schema 校验、`git diff --check`、`npm run verify`、API 健康检查、前端入口检查和 5173 预览检查均已通过。
- 持续迭代机制已建立：`当前工作区/.monkeycode/docs/CONTINUOUS_ITERATION_PLAYBOOK.md` 收口阶段复盘、反馈转需求、行业规则变化、文档同步和验证门禁。
- 持续迭代检查点已完成：`git diff --check`、`npm run verify`、API 健康检查、前端入口检查和 5173 预览检查均已通过。

当前已安装 npm workspace 依赖，`package-lock.json` 由 `npm install` 生成。

## 后续开发顺序

当前 `当前工作区/.monkeycode/specs/beginner-friendly-geo-workflow/tasklist.md` 中全部任务已完成。

大模型 API 接入实施计划位于 `当前工作区/.monkeycode/specs/llm-api-integration/tasklist.md`。当前已完成任务 1 到任务 12：共享类型新增 LLM 任务契约、四类任务输入输出类型、监测资产生成结果类型和 `LLMTaskRun` 摘要类型，平台 Adapter 新增 `runMessages` 契约，`OpenAICompatibleAdapter` 支持结构化 messages、JSON 输出参数和 token usage 归一化，后端新增 `llm` 模块、`LLMOrchestrationService`、四类任务 API 和任务状态查询，Prompt 模板与输出校验已按四类任务落地，监测主题和监测问题生成入口已优先调用 `question_generation` 并保留规则 fallback，回答解析入口已优先调用 `answer_analysis` 并通过规则层二次校验保护品牌出现、引用分数和风险表达，内容生成 worker 已默认调用 `content_generation` 并保留测试注入和基础草稿 fallback，增长优化计划生成入口已优先调用 `optimization_planning` 并创建下一轮问题和内容任务，memory 和 Prisma 仓储已支持 `LLMTaskRun` 创建与读取，LLM 编排服务会记录 queued、succeeded 和 failed 任务摘要，前端已保留监测主题/问题生成的资料缺失、生成说明和 fallback 提示，内容生成页已展示合规说明、复测建议和发布前确认提示。检查点已通过 `npm run typecheck --workspaces`、`npm run test --workspace @geo-platform/api`、`npm run test --workspace @geo-platform/web`、`npm run build`、`npm run prisma:validate` 和 `npm run prisma:generate` 验证。

AI 自动化运营员实施计划位于 `当前工作区/.monkeycode/specs/ai-automation-operator/tasklist.md`。当前已完成任务 1 到任务 11：后端自动化模块、确认队列、问题池精选、监测执行、回答分析、内容生成、平台改写、发布建议、复测建议、前端自动化卡片和数据持久化结构均已落地；Prisma schema 已新增自动化任务包、确认事项、平台改写版本、监测问题池和问题来源记录模型。任务 11 验证已通过 `npm run prisma:validate`、`npm run prisma:generate`、`npm run typecheck --workspace @geo-platform/api`、`npm run typecheck --workspace @geo-platform/shared-types`、自动化仓储/编排相关测试以及平台配置和浏览器会话脱敏测试。

AI 自动化运营员检查点已完成，追光小牛内测路径可启动自动化任务包，维护监测问题池并精选本轮 6 个监测问题等待确认；确认后可进入监测计划执行，后续可串联回答分析、内容草稿、平台改写、发布建议和复测建议。深度审计已覆盖 Prisma 自动化镜像写入失败保护、首次生成问题后的精选读取顺序、发布建议确认失败重试状态、发布建议确认抽屉明细展示和服务层品牌访问校验。最终验证已通过 `npm run verify`，当前覆盖 API 64 个测试文件、289 个用例，Web 20 个测试文件、99 个用例，以及 workspace 类型检查、workspace 构建、Prisma schema 校验和 Prisma Client 生成。

AI 可见性运营 Sprint 重构规格位于 `当前工作区/.monkeycode/specs/ai-visibility-sprint-refactor/tasklist.md`。当前已完成任务 1.1 到 4.2：共享类型新增 `VisibilitySprint`、`VisibilitySprintStep`、`VisibilitySprintStatus`、`VisibilitySprintMetricSummary`、`QuestionRadarItem`、`QuestionRadarDashboard`、`BrandStandardAnswer`、`BrandStandardAnswerEvidence`、`BrandStandardAnswerInput`、`StandardAnswerAlignmentDashboard`、`StandardAnswerAlignmentItem`、`StandardAnswerAlignmentResponse`、`StandardAnswerAlignmentEvidence`、`SprintContentGapTask` 和 `SprintContentGapTaskResult`，用于表达 Sprint 阶段、状态、指标摘要、现有业务对象关联 ID、问题雷达只读视图、品牌标准答案、真实回复对照分析和内容缺口任务生成结果；后端 `PermissionsRepositoryPort` 已新增 Sprint 列表、详情、当前 Sprint、创建、阶段更新、指标更新、关联对象更新和标准答案读写方法签名；内存仓储已预置追光小牛首轮 AI 可见性运营 Sprint 和 `standard_answer_demo_local_recommendation` 标准答案，并实现 Sprint CRUD、阶段更新、指标更新、关联对象更新和标准答案 CRUD；Prisma schema 已新增 `VisibilitySprint` 与 `BrandStandardAnswer` 模型，对应迁移为 `20260711102000_add_visibility_sprints` 和 `20260711113000_add_brand_standard_answers`，`PrismaPermissionsRepository` 已实现 Sprint 与标准答案持久化读写；`SprintsController` 已提供列表、当前、详情、创建、启动、停止、问题雷达、标准答案列表、标准答案生成、标准答案确认、标准答案对照分析、内容缺口任务生成、指标刷新和阶段推进 HTTP API；`QuestionRadarService` 已从监测问题候选和监测主题输出问题意图、平台覆盖、业务价值、状态和 Sprint 关联状态，并在同一 Sprint 内按归一化问题文本去重；`StandardAnswerService` 已从 Sprint 选题、品牌工作区和品牌档案生成 `ready_for_review` 标准答案草稿，用户确认后更新为 `approved` 并关联回 Sprint；`StandardAnswerAlignmentService` 已从 Sprint 关联真实监测运行、解析结果、监测问题候选和已审核标准答案输出覆盖、准确性、风险表达、引用缺口、竞品压制、证据和建议动作，缺少真实回答或标准答案时返回等待状态；`SprintContentGapService` 已将对照分析中 `needs_attention` 的问题转化为内容策略和内容生成任务，使用 `referenceSources` 关联 Sprint、问题、标准答案、真实回答运行和证据摘要，并把任务 ID 写回 Sprint；`SprintMetricsService` 已从 Sprint 关联真实监测运行和解析结果聚合指标摘要，不读取品牌标准答案或内容草稿作为监测样本；`SprintStageService` 已按问题、真实回答、标准答案、指标状态、内容任务、发布记录和复测任务推进阶段，缺少真实回答时保持等待状态。验证已通过 `npm run typecheck --workspace @geo-platform/shared-types`、`npm run typecheck --workspace @geo-platform/api`、`npm run test --workspace @geo-platform/api -- sprint-content-gap.service.test.ts standard-answer-alignment.service.test.ts sprints.controller.test.ts sprint-metrics.service.test.ts sprint-stage.service.test.ts standard-answer.service.test.ts question-radar.service.test.ts` 和 `git diff --check`。

AI 可见性运营 Sprint 任务 5.1 已完成：共享类型新增 `SprintContentTaskDashboard`、`SprintContentTaskItem`、`SprintContentTaskGapContext` 和 `SprintContentTaskDraftReadiness`；`SprintContentGapService` 新增内容缺口任务看板，读取 Sprint 关联内容任务、当前草稿版本和标准答案对照结果，输出来源问题、缺口类型、证据摘要、建议动作、复测目标和草稿可审稿状态；`SprintsController` 新增 `GET /api/v1/brands/:brandId/sprints/:sprintId/content-gaps/tasks`。验证已通过 `npm run typecheck --workspace @geo-platform/shared-types`、`npm run typecheck --workspace @geo-platform/api` 和 `npm run test --workspace @geo-platform/api -- sprint-content-gap.service.test.ts sprints.controller.test.ts`。

AI 可见性运营 Sprint 任务 5.2 已完成：共享类型新增 `SprintPublishingPreparationDashboard`、`SprintPublishingPreparationItem`、`SprintPublishingPreparationInput` 和 `SprintPublishingPreparationResult`；`SprintPublishingService` 新增发布准备看板和发布准备记录创建能力，读取 Sprint 内容任务、当前草稿版本和发布记录，输出草稿、待人工发布、已发布、失败状态，并将发布中心记录 ID 写回 Sprint；`SprintsController` 新增 `GET /api/v1/brands/:brandId/sprints/:sprintId/publishing-preparation` 和 `POST /api/v1/brands/:brandId/sprints/:sprintId/publishing-preparation/records`。发布准备创建只写入 `draft` 或 `pending` 状态，不生成不可访问伪链接。验证已通过 `npm run typecheck --workspace @geo-platform/shared-types`、`npm run typecheck --workspace @geo-platform/api` 和 `npm run test --workspace @geo-platform/api -- sprint-publishing.service.test.ts sprints.controller.test.ts sprint-stage.service.test.ts`。

AI 可见性运营 Sprint 任务 5.3 已完成：共享类型新增 `SprintRetestPlanInput`、`SprintRetestPlanResult`、`SprintRetestTrendDashboard` 和 `SprintRetestTrendItem`；`SprintRetestService` 新增复测计划创建和复测趋势看板，复用任务中心 `OptimizationTask` 与 `RetestRecord`，从 Sprint 发布记录创建复测任务并写回 `relatedRetestTaskIds`，草稿和失败发布记录会跳过；趋势看板聚合基线指标、复测完成数、改善数、前后指标和变化值。`SprintsController` 新增 `POST /api/v1/brands/:brandId/sprints/:sprintId/retest-plan` 和 `GET /api/v1/brands/:brandId/sprints/:sprintId/retest-trend`。验证已通过 `npm run typecheck --workspace @geo-platform/shared-types`、`npm run typecheck --workspace @geo-platform/api` 和 `npm run test --workspace @geo-platform/api -- sprint-retest.service.test.ts sprints.controller.test.ts sprint-stage.service.test.ts`。

AI 可见性运营 Sprint 任务 6.1 已完成：品牌工作区新增当前 Sprint 工作台入口，通过 `GET /api/v1/brands/:brandId/sprints/current` 展示 Sprint 状态、阶段进度、指标摘要和下一步动作；新增 `sprintWorkspace.ts` helper 管理状态文案、Ant Design 步骤状态映射、进度计算、指标卡和下一步路由。验证已通过 `npm run test --workspace @geo-platform/web -- BrandWorkspacePage.test.ts` 和 `npm run typecheck --workspace @geo-platform/web`。

AI 可见性运营 Sprint 任务 6.2 已完成：前端 `/monitoring` 路由产品口径调整为“AI 回复监测”，导航、品牌工作区、监测页、手动录入、监测记录、优化计划、任务复测和自动化确认提示均强调真实 AI 原始回复、回复解读和再次监测；手动录入入口继续使用 `/monitoring#manual-test-entry`，作为真实浏览器或 API 未接入时的可信回填路径。

AI 可见性运营 Sprint 任务 6.3 已完成：优化计划页新增“标准答案与内容缺口诊断”视图，读取当前 Sprint、标准答案对照和内容缺口任务看板，按监测问题展示真实 AI 回复数量、品牌标准答案状态、内容资产准备状态、缺口类型和建议动作；新增 `growthSprintDiagnostics.ts` helper 与测试，保持真实回复、品牌标准答案和内容资产三类对象分离。

AI 可见性运营 Sprint 任务 6.4 已完成：任务跟进页新增“Sprint 复测趋势”看板，读取当前 Sprint 和 `retest-trend` 聚合接口，展示计划复测任务、已完成复测、改善任务、完成率，以及提及率、推荐率、首位推荐率、引用命中率、表达准确率、风险表达数和问题覆盖率的基线、当前值和变化；新增 `sprintRetestTrend.ts` helper 与测试，并同步将遗留复测文案改为“再次监测”。后续扫尾已同步前端、后端公开响应和测试断言中的平台执行口径为“自动监测 / 浏览器辅助监测 / 手动录入”。

AI 可见性运营 Sprint 任务 7.1 和 7.2 已完成：项目文档已同步到 `ARCHITECTURE.md`、`INTERFACES.md`、`DEVELOPER_GUIDE.md` 和文档索引；完整验证门禁的审计、类型检查、API 测试、Web 测试、构建、Prisma schema 校验和 Prisma Client 生成均已通过，最新 `npm run verify` 已完整通过。

产品体验重构任务 11.1 已完成：前端新增集中式工作流路由构造器和解析器，串联品牌资料、优化单元、用户意图、AI 回复监测、分析诊断、内容生成、发布准备和再次监测；关键跳转携带优化单元、用户意图、监测问题、真实回复运行、内容任务、版本和发布记录标识，监测页使用 hash 定位问题候选、手动录入或监测记录区块；内容审核通过后可创建发布记录，发布中心可录入真实发布链接并进入再次监测任务。验证已通过 `npm run verify` 和 `git diff --check`，当前覆盖 API 68 个测试文件、308 个用例和 Web 26 个测试文件、147 个用例。

产品体验重构任务 11.2 已完成：第一版页面继续使用 lazy route component，品牌工作区 `/brands/:brandId/*` 别名重定向会保留工作流 query 和 hash；Vite 开发预览继续配置 `/api` 到 `http://localhost:3001` 的代理，并允许 `.monkeycode-ai.online` 域名访问。新增品牌化重定向和 Vite 配置测试，完整验证覆盖 API 68 个测试文件、308 个用例和 Web 28 个测试文件、152 个用例。

产品体验重构任务 11.3 已完成最终交付验证：`npm audit` 返回 0 个漏洞，API、Web 和共享类型 workspace 类型检查通过，API 68 个测试文件共 308 个用例与 Web 28 个测试文件共 152 个用例通过，全部 workspace 生产构建通过，Prisma schema 校验和 Prisma Client `6.19.3` 生成通过，`git diff --check` 通过。任务组 11 的核心页面串联、路由预览和回归验证已全部完成。

GEO 成熟产品体验重构任务 1.1 已完成：`global.css` 已建立统一的 `--geo-*` 页面宽度、响应式边距、间距、圆角、边界、阴影、文字层级和语义色令牌，现有 `geo-*`、`page-*` 及 Ant Design 基础覆盖已接入新的页面、内容面板、紧凑列表和数据区域视觉层级。验证已通过 Web workspace typecheck、生产构建、`git diff --check` 和 5173 预览连接检查。

GEO 成熟产品体验重构任务 1.2 已完成：前端新增 `ProductPage`、`ProductPageHeader` 和 `ProductPageSection`，统一页面标题、用途说明、品牌上下文、主操作、辅助操作、最大阅读宽度及加载、部分数据和错误提示插槽；移动端标题和操作区转换为纵向布局，主操作保持全宽可见。验证已通过 Web workspace typecheck、生产构建、`git diff --check` 和 5173 预览连接检查。

GEO 成熟产品体验重构任务 1.3 已完成：`PageState.tsx` 新增行动型 `GuidedEmptyState`、区域错误 `RegionErrorState`、页面骨架 `PageSkeleton`、部分数据提示 `PartialDataNotice` 和常见恢复动作映射，同时保留现有状态组件供页面渐进迁移。验证已通过 `PageState.test.ts` 3 个定向用例、Web workspace typecheck、生产构建、`git diff --check` 和 5173 预览连接检查。

GEO 成熟产品体验重构任务 1.4 已完成：前端新增 `UnifiedFilterBar`、`PlatformSwitch`、`MetricSummaryGrid`、`InsightOverview` 和 `InsightDetailSection`，统一搜索、日期、平台、状态、结果计数、清空筛选、指标概览、关键结论和明细区域结构；`filterQuery.ts` 提供可保留工作流上下文的筛选 query 读取、合并和清空 helper，`displayLabels.ts` 集中维护五个平台选项。验证已通过新增 helper 定向测试 8 个用例、Web 29 个测试文件共 158 个用例、Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 1.5 已完成：前端新增共享五态 `WorkspaceViewState`、`CreationWorkspace` 双栏创建模板、`AssetLibrary` 分类资产模板、`ManagementListPage` 管理列表模板和最多两个高频行操作的 `ManagementRowActions`。三类模板提供场景化默认状态、可替换状态插槽、ARIA 区域语义和桌面、平板、移动端响应式布局。验证已通过 `WorkspaceState.test.ts` 3 个用例、Web 30 个测试文件共 161 个用例、Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 1.6 已完成：`SharedPageTemplates.test.tsx` 使用 React 服务端静态渲染验证共享组件的真实输出，无需浏览器 DOM 测试依赖；覆盖页面标题与主操作、行动型空态、筛选控件与结果计数、平台选项、双栏创建五态、资产库完整度、管理列表行操作、移动端顺序类名和可选区域缺省结构。新增组件测试 11 个用例，连同状态与 query helper 的定向验证共 20 个用例；完整 Web 回归为 31 个测试文件共 173 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 1.7 已完成：`ProductPagePrimaryAction.property.test.tsx` 为正确性属性 P6 生成 `ProductPage`、`CreationWorkspace`、`AssetLibrary` 和 `ManagementListPage` 的 120 组确定性场景，覆盖五类状态、主操作有无以及零到两个辅助操作；每组服务端渲染结果均验证实心主色按钮最多一个，并兼容 Ant Design 当前和旧版主按钮类名。完整 Web 回归为 32 个测试文件共 174 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 2.1 已完成：`navigation.ts` 将一级导航收敛为开始、监测、优化、发布和分析五个任务域，补齐增长优化、内容策略、报告中心、内测反馈和顾问服务入口，使 24 个第一版路由均具有唯一导航入口；原有 `operationWorkflow`、`workspaceRouteAliases`、route path 和 lazy route 注册保持稳定。`navigation.test.ts` 验证五域顺序、入口唯一性和管理/支持页面入口，`routes.test.ts` 双向校验导航目标与第一版路由集合。完整 Web 回归为 32 个测试文件共 175 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 2.2 已完成：`AppLayout.tsx` 实现 248px 展开态与 72px 折叠态的桌面侧栏，五个任务域改为一次展开一个的受控子菜单，路由切换时同步展开当前域；统一全局头部只显示侧栏控制、当前任务域和带可访问标签的品牌选择器，页面标题继续由内容区承载。`navigation.ts` 新增当前任务域匹配与单域展开 helper，定向测试覆盖五域匹配、未知路由和展开切换边界。完整 Web 回归为 32 个测试文件共 177 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 2.3 已完成：`AppLayout.tsx` 在 767px 及以下使用 Ant Design 左侧抽屉导航，768px 起保留桌面侧栏；移动抽屉复用五域菜单和品牌上下文，支持遮罩、Escape、路由后关闭及关闭后焦点返回导航按钮。`AppShellState.ts` 集中维护响应式模式和页面边距层级，定向测试覆盖 767px/768px 边界及 390px、768px、1024px、1440px 视觉审查宽度。完整 Web 回归为 33 个测试文件共 179 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 2.4 已完成：应用壳将全局八步流程条替换为场景化相邻阶段导航，八个主链路页面最多展示上一阶段、当前阶段和下一阶段，首尾阶段仅展示存在的相邻入口；其余高级分析、管理和支持工具页面隐藏流程区域。`getContextualWorkflowSteps` 生成相邻阶段模型，`workflowStagePath` 通过 `WorkflowRouteContext` 保留优化单元、用户意图、监测问题、运行记录、计划、内容任务、生成版本、发布记录、平台和动作上下文。完整 Web 回归为 33 个测试文件共 182 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 2.5 已完成：`AppShellState.ts` 新增应用壳交互 reducer，`AppLayout.tsx` 使用同一状态模型处理桌面侧栏折叠、移动抽屉开关和路由后关闭；回归测试覆盖五个任务域、24 个页面入口、品牌切换、全部品牌化别名的 query/hash 保留、未知别名回退和主链路相邻阶段。定向回归为 5 个测试文件共 22 个用例，完整 Web 回归为 34 个测试文件共 186 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 2.6 已完成：`WorkflowContextPreservation.property.test.ts` 为正确性属性 P4 生成 63 个 route builder 场景、全部品牌化别名重定向组合和 768 个完整上下文与主链路目标组合，覆盖普通字符、空格、中文、URL 特殊字符、四种监测模式、三个锚点、动作和发布 Tab；构造、解析、重定向和相邻阶段链接均保持 query/hash 及业务对象上下文。定向验证为 4 个测试文件共 20 个用例，完整 Web 回归为 35 个测试文件共 189 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构检查点 3 已完成：项目级 `npm run verify` 门禁通过依赖审计、API/Web/共享类型 workspace 类型检查、API 68 个测试文件共 308 个用例、Web 35 个测试文件共 189 个用例和全部 workspace 生产构建；Prisma schema 校验与 Prisma Client `6.19.3` 生成随后单独复核通过。依赖审计结果为 0 个漏洞。

GEO 成熟产品体验重构任务 4.1 已完成：新手首页改用 `BeginnerHomeDashboard` 聚合数据生成一个推荐主任务、资料准备/创建监测对象/获取真实回复三个阶段和一个主按钮，真实回复完成状态只使用聚合接口中的真实采集数量；高级运营、Sprint、首轮流程、资料导入、品牌管理和自动化运营员收进默认关闭的二级折叠区，三个品牌工作区聚焦路由只渲染对应模块。`BeginnerHomeState.test.ts` 覆盖阶段推进、真实回复边界和动作路由；完整 Web 回归为 36 个测试文件共 192 个用例，并通过 Web workspace typecheck、生产构建、预览连接检查和 `git diff --check`。

GEO 成熟产品体验重构任务 4.2 已完成：已有真实监测结果的首页展示推荐度、平均排名、引用率和待处理问题四项摘要，后端 `buildBeginnerHomeResultSummary` 统一按真实回复及其分析结果计算口径和样本数；品牌评价、回答修正和下一篇内容三个问题入口通过品牌化路由携带 `question` query 与目标区块 hash，监测和增长优化页面展示问题上下文并定位对应区域。API 全量回归为 68 个测试文件共 309 个用例，Web 全量回归为 36 个测试文件共 195 个用例，并通过 API/Web workspace typecheck、Web 生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 4.3 已完成：多品牌列表迁移为独立 `BrandPortfolioPanel`，每张品牌资产卡只保留名称、状态、资料完整度、首轮监测状态和一个高频动作，编辑与启停进入“更多”菜单；品牌创建入口在有数据时位于管理区标题，在空数据时由空状态接管，页面同时只展示一个创建入口。跨品牌卡片复用 `GET /api/v1/brands/:brandId/dashboards/home` 读取真实完整度与监测状态，现有品牌切换 store 和创建、编辑、状态 API 保持不变。完整 Web 回归为 37 个测试文件共 197 个用例，并通过 Web workspace typecheck、生产构建、跨品牌接口实测和 `git diff --check`。

GEO 成熟产品体验重构任务 4.4 已完成：`/competitor-profile` 使用独立管理视图维护竞品档案并承接地图发现，`/competitors` 聚焦分析指标、高风险意图和对比证据；AI 平台接入页改为平台卡片，公开区域只展示脱敏连接状态、可用监测方式、最近验证摘要、下一步和唯一连接或管理动作，连接检查与技术配置收纳到管理弹窗。平台卡片 helper 测试覆盖默认平台合并、连接状态、监测方式、验证文案和原始验证信息隔离。定向测试为 2 个文件共 10 个用例，完整 Web 回归为 37 个测试文件共 199 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 4.5 已完成：新增 `BeginnerExperienceComponents.test.tsx`，以真实组件 SSR 覆盖未建档、待建监测对象、待采集真实回复、已有结果和存在风险五类首页状态，并验证三个问题式入口、品牌空状态与资产卡动作、竞品资料空状态、平台连接状态和唯一连接或管理动作。`BeginnerHomeContent`、`CompetitorProfileManagement` 和 `PlatformConnectionCards` 提取为无请求展示组件，页面查询与 mutation 容器保持原边界。定向回归为 5 个测试文件共 25 个用例，完整 Web 回归为 38 个测试文件共 208 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 4.6 已完成：`PlatformConfigurationPublicBoundary.property.test.tsx` 为正确性属性 P2 生成 120 个平台公开区域场景，覆盖 `api`、`manual`、`semi_auto`、`mock` 四种模式，五种连接状态、三种验证结果和启停状态；每个场景向配置对象注入独立的 API Key、cookies、storage state、browser profile 路径、provider 原始载荷和验证消息标记，并同时检查平台卡片 view model 与 SSR 页面树，确认公开输出只包含脱敏连接状态、监测方式、验证摘要和业务化下一步。完整 Web 回归为 39 个测试文件共 209 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 5.1 已完成：品牌资料页接入共享 `AssetLibrary`，将原有资料字段收敛为基础信息、产品服务、目标用户、事实知识和媒体素材五类固定导航；右侧按分类展示现有表单、资料来源状态或媒体资产列表，持续保留总完整度、分类完整度、缺失项、来源数量和结果影响说明，并将保存品牌资料设为唯一主操作。品牌工作区 helper 测试补充五分类映射、事实字段合并、完整度、来源计数和媒体素材状态断言；完整 Web 回归为 39 个测试文件共 210 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 5.2 已完成：基础信息按品牌定位、差异化与可信证明分组，字段增加示例、字数提示和长度边界；产品服务改为支持新增、内联编辑和删除的重复条目卡，并根据内容展示资料状态和 FAQ 摘要；目标用户改为画像卡，支持维护决策阶段、关注问题、常见表达及关联已启用用户意图。`brandProfileEditor.ts` 在展示层完成结构化表单与现有 `offerings`、`targetCustomers` 字符串数组契约之间的双向转换，兼容旧版纯文本画像。新增 helper 测试覆盖产品条目过滤与状态、旧画像加载、结构化画像往返、FAQ 摘要和答案分隔符；完整 Web 回归为 40 个测试文件共 214 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 5.3 已完成：事实知识新增推荐表达、禁用表达、内容规则、竞品信息和资料来源五个内部组，右侧统一提供关键词搜索、审核状态筛选、资产来源和更新时间，并保留当前组批量手动维护能力；媒体素材复用同一资产列表，展示素材类型、适用平台、关联内容、来源及审核状态。空分组提供上传资料、手动录入或示例结构入口。`brandProfileEditor.ts` 新增事实、资料来源和媒体素材到统一资产行的映射，以及中文平台别名和审核状态筛选；helper 测试覆盖来源状态归一化、媒体字段映射、中文平台搜索、审核筛选和空查询边界。完整 Web 回归为 40 个测试文件共 216 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 5.4 已完成：资料上传、解析、识别完整度、置信度、待确认字段、缺失影响和确认保存集中到品牌资产库右侧 `BrandImportWorkspace`；品牌工作台首页只保留携带现有 query/hash 上下文的分类编辑与文件导入入口。手动保存和导入确认统一展示保存前后完整度、下游结果影响、创建监测对象与开始监测动作；分类导航、浏览器历史和 `brandImport` query 保持工作区模式同步。新增测试覆盖字符串、列表和 FAQ 字段转换及保存反馈文案；完整 Web 回归为 41 个测试文件共 219 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 5.5 已完成：新增 `BrandAssetLibraryComponents.test.tsx`，使用 React 服务端静态渲染遍历基础信息、产品服务、目标用户、事实知识和媒体素材五类选中状态，并覆盖桌面左侧分类语义、移动端导航/编辑区顺序、资料完整度、分类状态、行动型空分类、资料导入支持格式与唯一初始主操作，以及保存后的完整度变化和监测下一步；现有 `brandProfileEditor.test.ts` 与 `BrandImportWorkspace.test.ts` 继续覆盖可重复条目、结构化画像、FAQ、搜索筛选和导入字段转换。定向回归为 5 个测试文件共 53 个用例，完整 Web 回归为 42 个测试文件共 228 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 6.1 已完成：`OptimizationUnitsCard.tsx` 和 `UserIntentPromptCard.tsx` 统一迁移到 `ManagementListPage`；两个页面均提供标题说明、搜索与业务筛选、唯一新增入口、行动型空状态和带横向滚动边界的表格。监测对象行只展示创建用户意图与开始监测，用户意图行只展示手动检测与自动监测；生成内容、查看分析、编辑、检测记录和引用来源等低频动作进入更多菜单，原有 API、表单、Prompt 展开区和工作流上下文保持不变。新增 `MonitoringObjectManagement.test.tsx` 覆盖组合筛选、统一模板、唯一新增入口和行操作边界；定向回归为 3 个测试文件共 22 个用例，完整 Web 回归为 43 个测试文件共 232 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 6.2 已完成：`MonitoringPage.tsx` 重构为从结论到证据的 AI 回复监测看板，首屏依次展示关键结论、真实回复数、品牌提及率、Top 3 推荐率、引用命中率、平台切换和平台回复分布；指标 helper 只统计非 `mock_ai` 且包含原始回复的运行。平台选择通过统一筛选 query 保留现有工作流参数，并同步更新结论、指标、分布和回复明细；监测主题与问题、计划执行、回复明细和高级工具使用四个 Tab 渐进展开。开始监测成为页面唯一主操作，手动录入和平台配置作为辅助路径，风险或内容缺口可携带现有上下文进入优化诊断。`MonitoringRunsCard` 支持受控平台范围和次级新增操作，监测问题、指标、平台配置和自动化组件在嵌入看板时使用次级操作语义。新增 helper 回归覆盖真实样本边界、平台切换、关键结论和四项指标；定向回归为 4 个测试文件共 13 个用例，完整 Web 回归为 43 个测试文件共 235 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 6.3 已完成：新增 `MonitoringRecoverySummary.tsx`，将监测计划连接摘要、公开平台状态和监测运行统一映射为缺少真实样本、浏览器待确认、手动待录入、平台待配置和运行失败五类状态；每类状态展示当前原因、指标或平台覆盖影响、恢复动作及目标 Tab。缺少真实样本时明确当前平台范围、有效样本数以及品牌提及率、Top 3 推荐率、引用命中率和平台分布的影响；失败状态区分等待自动重试和可切换的人工路径。自动监测、浏览器辅助监测和手动录入三条真实回复路径持续展示，并按公开平台能力标记可用状态；平台筛选会同步收窄状态范围。页面同时展示计划、回复和平台请求错误并保留可用区域。新增 `MonitoringRecoverySummary.test.ts` 覆盖五类状态、恢复目标、自动重试和三类采集路径；定向回归为 5 个测试文件共 25 个用例，完整 Web 回归为 44 个测试文件共 239 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构任务 6.4 已完成：`GeoCanvasPage.tsx` 使用 `ProductPage` 将关系视图定位为“关系分析画布”高级工具，首屏主任务收敛为探索优化对象、用户意图、平台表现和内容策略的完整链路。页面保留左侧分析对象、中央关系图和右侧节点详情结构，新增可关闭的首次使用引导、四类节点图例、当前节点说明以及缩小、放大和全图定位工具；创建用户意图、内容策略和优化任务收纳到单一“新建关联对象”菜单。四类节点详情统一提供查看真实回复、生成内容和再次监测三步动作，低频补充与创建操作使用文本入口。`buildNodeWorkflowPaths` 会将节点关联的 `optimizationUnitId`、`intentId`、问题文本和已有 query 上下文传入监测、内容生成与再次监测路由。新增 3 个工作流映射测试；完整 Web 回归为 45 个测试文件共 242 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构可选任务 6.5 已完成：组件测试矩阵继续复用 `MonitoringObjectManagement.test.tsx` 和 `MonitoringPage.test.ts` 已有的列表筛选、行操作收纳、平台切换及真实样本边界覆盖，并在 `MonitoringRecoverySummary.test.ts` 补充部分真实数据与失败记录并存、失败恢复动作和三类采集路径持续展示，在 `GeoCanvasPage.test.ts` 补充高级工具定位、首次使用引导、四类图例、缩放定位、默认节点详情和查看真实回复、生成内容、再次监测入口。定向回归为 2 个测试文件共 10 个用例，完整 Web 回归为 45 个测试文件共 245 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构可选任务 6.6 已完成：新增 `src/api/brandContext.property.test.ts` 实现正确性属性 P1，以 24 个由合法前缀和后缀组合生成的品牌标识覆盖开始、监测、内容、发布、分析和支持工具六个任务域，共验证 144 次代表性主数据请求。每个场景先写入 Zustand 当前品牌上下文，再调用统一 `apiGet`，同时断言 `/api/v1/brands/:brandId/*` 请求路径保持当前品牌且 `x-brand-id` 请求头与其一致；测试使用 `validatesCriteria(['8.1'])` 标注需求引用，并在完成后恢复 `brand_demo`。完整 Web 回归为 46 个测试文件共 246 个用例，并通过 Web workspace typecheck、生产构建和 `git diff --check`。

GEO 成熟产品体验重构可选任务 6.7 已完成：共享类型包新增 `hasRealMonitoringResponseSample`，后端 `hasRealMonitoringResponse` 与前端 `isRealAIResponseRun` 共同复用该判定，统一要求平台区别于 `mock_ai` 且原始回复去除空白后仍有内容，修复前端将空白回复对象计入监测指标的边界差异。Web 与 API 分别新增 Property P3 测试，对 API、浏览器辅助、手动录入、示例回答、空白回复、标准答案和内容草稿穷举 128 种组合；Web 验证样本数、品牌提及率、Top 3 推荐率和引用命中率，API 验证首页样本数、有效排名数、推荐率和引用命中率。API 全量回归为 69 个测试文件共 310 个用例，Web 全量回归为 47 个测试文件共 247 个用例，shared-types、API 和 Web 三工作区均构建成功，并通过 `git diff --check`。

GEO 成熟产品体验重构检查点 7 已完成：项目级 `npm run verify` 门禁一次通过，依赖审计结果为 0 个漏洞，API 69 个测试文件共 310 个用例、Web 47 个测试文件共 247 个用例全部通过，API、Web 和 shared-types workspace 类型检查及生产构建成功，Prisma schema 校验通过并生成 Prisma Client `6.19.3`。

GEO 成熟产品体验重构任务 8.1 已完成：内容生成页顶部任务区迁移到统一 `ManagementListPage`，使用 `UnifiedFilterBar` 提供标题、模板、关联对象、关键词、生成状态和目标平台筛选、结果计数及统一清空；任务表收敛为标题、模板、业务关联对象、目标平台、生成状态、真实发布时间和继续编辑、发布准备两个高频动作。发布时间复用发布中心记录并按任务关联最新已发布记录，空列表提供选择模板并创建第一条内容的行动型入口，有数据与空数据状态分别只保留一个实心主色创建入口。新增 helper 测试覆盖组合搜索、关联对象业务文案和最新发布时间映射；完整 Web 回归为 47 个测试文件共 250 个用例，并通过 Web workspace typecheck、生产构建、预览连接检查和 `git diff --check`。

GEO 成熟产品体验重构任务 8.2 已完成：内容生成创作台将 12 个内容模板按品牌宣传、问答、案例、教程、对比、科普和渠道内容七类组织，模板卡明确展示使用场景、适用平台、预计结构、素材要求和选择状态。默认模板、分类切换和卡片选择都会将模板预设的内容类型与目标平台同步到现有任务输入，后端契约保持不变。新增测试覆盖七类完整性、12 个模板唯一归类、模板字段完整性和小红书渠道模板预设映射；完整 Web 回归为 47 个测试文件共 252 个用例，并通过 Web workspace typecheck、生产构建、预览连接检查和 `git diff --check`。

GEO 成熟产品体验重构任务 8.3 已完成：内容创作台迁移到共享 `CreationWorkspace`，桌面展示左配置右结果双栏，窄屏按步骤 1 配置、步骤 2 结果纵向排列，移动端生成动作保持在底部粘性动作区。左侧表单固定为目标与对象、模板与渠道、素材与依据、生成配置和发布检查五组；右侧统一展示模板产出预期、任务加载、生成步骤、失败重试、草稿编辑、事实与合规风险、渠道发布检查、保存、导出和发布准备动作。新增 `getContentCreationWorkspaceState` 测试覆盖加载、错误、空任务和可用任务状态；完整 Web 回归为 47 个测试文件共 253 个用例，并通过 Web workspace typecheck、生产构建、预览连接检查和 `git diff --check`。

GEO 成熟产品体验重构任务 8.4 已完成：`/content-optimization` 在共享 `CreationWorkspace` 中增加选择现有内容资产或粘贴原文、配置结构优化、事实补强、FAQ 补充、引用补强和渠道适配目标，并在结果区展示五类可解释建议；优化上下文复用现有 `referenceSources` 契约。内容资产区迁移到 `ManagementListPage` 与 `UnifiedFilterBar`，读取 `ContentOperationDashboard.assets`，支持搜索及资产状态、类型、平台、审核、发布和复测组合筛选，展示真实审核、发布、复测和发布统计，保留继续编辑、发布准备和再次监测动作。新增优化任务输入、建议映射及资产组合筛选测试；定向回归为 2 个测试文件共 33 个用例，完整 Web 回归为 48 个测试文件共 257 个用例，并通过 Web workspace typecheck、生产构建、预览连接检查和 `git diff --check`。

GEO 成熟产品体验重构可选任务 8.5 已完成：新增 `ContentOperationsComponents.test.tsx`，通过服务端静态渲染覆盖渠道模板选中状态、内容优化双栏空态、生成失败恢复、五类优化建议和草稿交接动作，并补充优化配置必填边界及内容任务到发布准备的 query 上下文测试。发布记录创建成功后的跳转改用 `getContentPublishPreparationPath`，保留优化单元、用户意图、监测运行、优化计划和内容任务上下文。内容运营定向回归为 3 个测试文件共 40 个用例，完整 Web 回归为 49 个测试文件共 264 个用例，并通过 Web workspace typecheck、生产构建、预览连接检查和 `git diff --check`。

GEO 成熟产品体验重构任务 9.1 已完成：`/owned-media` 与 `/media-platforms` 从发布中心多 Tab 页面拆分为独立管理页，并统一读取品牌级 `PublishingOperationDashboard`。自有媒体页提供账号搜索、发布渠道和授权状态组合筛选，展示最近验证、账号级发布统计和异常说明，每行根据授权状态只保留进入发布准备或重新授权一个管理动作；媒体平台页直接展示持久化规则中的内容格式、适用意图、发布频率、素材要求和注意事项，并支持跨字段搜索。新增 helper 测试覆盖组合筛选、唯一动作、状态反馈、规则搜索、接入平台选项及页面状态；定向回归为 1 个测试文件共 14 个用例，完整 Web 回归为 49 个测试文件共 269 个用例，并通过 Web workspace typecheck、生产构建、两条路由响应、预览连接检查和 `git diff --check`。

GEO 成熟产品体验重构任务 9.2 已完成：`/publishing` 迁移到统一 `ManagementListPage`，组合 `PublishingOperationDashboard.records`、`performance` 和 `pendingRetestItems`，支持标题、正文、账号、真实链接、发布状态和发布渠道筛选。记录行展示内容摘要、平台账号、未排期状态、创建时间、发布状态、真实链接和再次监测状态；记录或更新发布结果与安排再次监测作为两个高频动作，复制正文、设为待人工发布和标记失败进入更多菜单。再次监测入口使用 `workflowStagePath` 保留优化单元、用户意图、Prompt、监测运行、优化计划、内容任务、版本和发布记录上下文。新增测试覆盖发布记录行聚合、组合筛选、query 保留和再次监测交接；完整 Web 回归为 49 个测试文件共 275 个用例，并通过 Web workspace typecheck、生产构建、`/publishing` 路由响应、预览连接检查和 `git diff --check`。

GEO 成熟产品体验重构任务 9.3 已完成：`/tasks` 迁移到统一 `ManagementListPage`，将任务、最新复测记录和 Sprint 趋势映射为待处理、待复测、已改善和继续优化四类行动状态，并提供搜索、状态筛选和四项摘要。任务行展示原问题、来源发布记录、负责人、计划时间、优化前后提及率、品牌排名、表达准确率及明确下一步；处理和安排或执行再次监测作为两个高频动作，其余操作进入更多菜单。返回 AI 回复监测执行同题复测时使用 `workflowStagePath` 保留完整工作流 query 和监测记录区块 hash。新增 7 个 helper 测试覆盖状态映射、聚合、筛选、指标和上下文；完整 Web 回归为 50 个测试文件共 282 个用例，并通过 Web workspace typecheck、生产构建、`/tasks` 路由响应、预览连接检查和 `git diff --check`。

GEO 成熟产品体验重构可选任务 9.4 已完成：新增 `PublishingOperationsComponents.test.tsx`，通过服务端静态渲染覆盖自有媒体已授权和授权过期状态、重新授权动作、持久化媒体平台规则、发布记录筛选结果、真实发布链接、发布状态、再次监测入口及聚合加载失败恢复。发布结果字段提取为可独立测试的 `PublishingResultFields`，明确完整 URL 输入、保存为已发布状态和再次监测下一步；发布记录到复测任务继续验证发布记录、内容任务、版本和监测运行上下文。定向回归为 2 个测试文件共 26 个用例，完整 Web 回归为 51 个测试文件共 288 个用例，并通过 Web workspace typecheck、生产构建、三条发布运营路由响应和预览连接检查。

GEO 成熟产品体验重构任务 10.1 已完成：新增 `analysisScopeQuery.ts`、`AnalysisScopeBar.tsx` 和 `AnalysisWorkbench.tsx`，统一分析页的 URL 范围、筛选位置和分析范围、关键结论、趋势与分布、证据明细、建议动作五段层级。竞品、评价、事实、信源和增长优化页已迁移到共享骨架；各域按真实明细字段执行搜索、日期、平台、状态、优化单元和用户意图组合筛选，聚合指标继续明确采用品牌整体真实样本口径。竞品、评价和信源明细每行保留两个高频动作，其他动作收纳到更多菜单。新增共享骨架 SSR、scope query 及四个业务域组合筛选测试；定向回归为 6 个测试文件共 26 个用例，完整 Web 回归为 53 个测试文件共 296 个用例，并通过 Web workspace typecheck、生产构建、五条分析路由响应、预览连接检查和 `git diff --check`。

GEO 成熟产品体验重构任务 10.2 已完成：竞品对比契约新增 `capturedAt` 真实监测时间，内存仓储从监测运行完成、开始或创建时间依次取值。竞品分析首屏收口为竞品提及率、品牌平均推荐排名和压制风险，并按监测运行去重生成 AI 平台矩阵、日期趋势和当前范围高风险用户意图；日期、平台、压制状态、优化单元、用户意图和搜索筛选同步作用于排名、风险、矩阵、趋势和证据。评价分析明确展示四项摘要、评价趋势、表达问题分布与问题证据，日期筛选收窄趋势，平台与处理状态收窄问题分布。两页行级内容、任务和再次监测动作保留来源工作流上下文，竞品资料页的地图发现以及评价修正策略和品牌资料更新能力保持可用。定向回归为 Web 3 个测试文件共 18 个用例、API 1 个测试文件共 7 个用例；完整 API 回归为 69 个测试文件共 310 个用例，完整 Web 回归为 53 个测试文件共 301 个用例，并通过 shared-types、API、Web 类型检查、全工作区生产构建、三个分析路由响应、预览连接检查和 `git diff --check`。

GEO 成熟产品体验重构任务 10.3 已完成：`CitationDashboard` 新增真实样本数、有引用样本数和引用率，趋势同步按日期返回真实样本、引用命中和引用次数；原 `contentCitationRate` 明确为内容资产绑定率。信源分析首屏收口为引用率、官网引用率和权威来源占比，再展示来源分布、引用趋势和真实证据。事实分析从评价接口中选择错误信息、准确性偏低和禁用表达三类事实风险，首屏展示事实风险、高风险事实、受影响用户意图和事实准确表达率，再展示事实趋势、风险分布、失真信息、证据和可执行修正建议；`EvaluationIssue.userIntent` 由监测运行关联的用户意图补充。共享分析骨架支持内容状态和部分数据提示，零样本进入开始监测路径，一至两条样本保留分析并进入补资料路径。信源行级内容与再次监测动作继续保留工作流上下文。定向回归为 API 2 个测试文件共 5 个用例、Web 3 个测试文件共 25 个用例；完整 API 回归为 69 个测试文件共 311 个用例，完整 Web 回归为 53 个测试文件共 305 个用例，并通过 shared-types、API、Web 类型检查、全工作区生产构建、两条分析路由响应、预览连接检查和 `git diff --check`。

GEO 成熟产品体验重构任务 10.4 已完成：增长优化页同时读取 `GrowthOptimizationWorkspace` 与 `AnalysisDiagnosisDashboard`，新增统一 finding 结论卡，将竞品、评价、信源和事实四类诊断按类型、严重程度、用户意图、平台、证据摘要、推荐动作和关联任务入口展示。优化计划按优先问题、原因证据、推荐动作、关联内容和复测状态重排；关联内容展示推荐原因及真实发布状态，复测区展示计划时间和最新改善结果。确认计划、生成内容任务、更新标准答案依据、安排发布和再次监测入口继续通过现有路由协议保留业务上下文。新增 finding 组件静态渲染及筛选、动作路由、发布状态和复测状态测试；定向回归为 2 个测试文件共 13 个用例，完整 Web 回归为 54 个测试文件共 311 个用例，并通过全工作区类型检查、生产构建、四类诊断聚合数据验证、`/growth-optimization` 路由响应和预览连接检查。

GEO 成熟产品体验重构可选任务 10.5 已完成：新增分析范围栏与五入口组合组件测试，直接验证固定平台集合、选中状态、平台切换回调、深链接筛选对象和工作流 query 保留；通过 React Query 预置数据静态渲染竞品、评价、事实、信源和增长优化页面，覆盖关键结论、趋势与分布、平台过滤后的证据明细、行动型空态、任务化入口和增长计划五段结构。共享分析工作台测试补充持续观察状态、缺省明细区域、任务组件替换默认建议和恢复状态替换正文。新增测试为 3 个文件共 12 个用例，分析诊断域定向回归为 8 个文件共 49 个用例，完整 Web 回归为 56 个测试文件共 322 个用例，并通过全工作区类型检查、生产构建和五个分析入口预览响应检查。

GEO 成熟产品体验重构任务 11.1 已完成：报告中心迁移到 `ManagementListPage` 和 `UnifiedFilterBar`，统一展示报告类型、品牌、统计周期、生成状态、数据缺口和创建时间，并支持名称、类型、状态和创建日期组合筛选。最新报告或用户选择的报告通过现有单份详情接口进入列表下方独立阅读区，集中展示元信息、数据缺口、Markdown 正文和浏览器端 Markdown 导出动作；空列表提供生成首份品牌报告的行动型主操作。新增 `ReportCenterPage.test.tsx` 共 4 个用例，完整 Web 回归为 57 个测试文件共 326 个用例，并通过全工作区类型检查、生产构建、`/reports` 路由响应和预览连接检查。

GEO 成熟产品体验重构任务 11.2 已完成：顾问工作台迁移到 `ManagementListPage` 和 `UnifiedFilterBar`，将诊断、服务计划、复盘、客户交付、服务、培训、规则更新、顾问备注及其跟进事项统一组织为服务任务行。列表支持标题、负责人、下一步、类型、状态和服务时间组合筛选，状态根据跟进事项推导；详情区域集中展示状态、负责人、服务或截止时间、下一步、关联报告、结构化服务正文和全部跟进事项。页面只保留新增服务记录一个主操作，空列表提供新增首条记录的行动型入口。新增 `AdvisorWorkspacePageView.test.tsx` 共 4 个组件用例，顾问域定向回归为 2 个测试文件共 7 个用例，完整 Web 回归为 58 个测试文件共 330 个用例，并通过全工作区类型检查、生产构建、`/advisor` 路由响应和预览连接检查。

GEO 成熟产品体验重构任务 11.3 已完成：内测反馈页迁移到 `ManagementListPage` 和 `UnifiedFilterBar`，统一展示反馈问题、页面、类型、严重程度、状态、处理记录和更新时间，并支持搜索、类型、严重程度、页面、状态和日期组合筛选。反馈共享契约、内存仓储、Prisma 仓储和控制器新增持久化严重程度，旧创建请求默认使用 `medium`，数据库迁移为 `20260717023000_add_feedback_severity`。自动化运营员按任务包状态、步骤进度和确认队列迁移到共享页面分区及状态组件，覆盖加载、请求失败、部分上下文、空任务包、高风险确认、手动录入和失败恢复；步骤进度同时计入已完成和已跳过步骤。定向回归为 Web 4 个测试文件共 21 个用例和 API 1 个测试文件共 2 个用例，完整回归为 API 70 个测试文件共 313 个用例、Web 60 个测试文件共 337 个用例，并通过 Prisma schema 校验与 Client 生成、全工作区类型检查、生产构建、`/inner-test-feedback` 路由响应和预览连接检查。

GEO 成熟产品体验重构可选任务 11.4 已完成：报告、顾问服务、内测反馈和自动化运营员四组组件测试补齐统一状态模型。报告测试覆盖列表与详情、首份报告空态、筛选、加载骨架、列表失败恢复及详情刷新部分失败时保留旧正文；顾问测试覆盖任务与记录、空态、映射筛选、关联报告缺失、加载和失败恢复；反馈测试覆盖严重程度、组合筛选、空态、加载和失败恢复；自动化测试覆盖任务包、步骤进度、确认队列、手动录入、失败恢复、上下文部分缺失、加载和请求失败。三个管理页同时补齐网络异常状态识别与 `PageSkeleton`。支持工具定向回归为 4 个测试文件共 19 个用例，完整回归为 API 70 个测试文件共 313 个用例、Web 60 个测试文件共 341 个用例，并通过全工作区类型检查、生产构建、四个支持工具入口响应和预览连接检查。

GEO 成熟产品体验重构任务 12.1 已完成：`ProductPage` 在 991px 及以下将页头和操作区纵向排列，`CreationWorkspace` 在 1199px 及以下收口为单列，品牌资产库在 991px 及以下将五类导航转换为带当前分类提示的可展开选择；移动管理列表通过粘性首列和末列保留关键字段及操作，内容区表格统一限制父容器宽度，增长优化的诊断、内容建议和复测宽表显式启用横向滚动。开始页七项高级统计使用 390px 两列、768px 三列、1024px 四列和宽屏最多六列的响应式网格。定向测试为 2 个文件共 13 个用例，完整回归为 API 70 个测试文件共 313 个用例、Web 60 个测试文件共 341 个用例，并通过全工作区类型检查、生产构建、8 个代表路由响应、预览连接检查和 `git diff --check`。

GEO 成熟产品体验重构任务 12.2 已完成：应用壳新增跳到主内容入口，并在路由跳转后聚焦主内容；移动抽屉按取消关闭和菜单跳转区分回焦目标。全站更多菜单迁移到 `AccessibleDropdown`，统一提供上下文可访问名称、菜单语义和动态展开状态；内容模板卡提供 `aria-pressed`，关系画布对象支持键盘选择，React Flow 节点与边提供业务文字名称并输出同源完整关系清单。模型设置与关系画布的帮助提示改为可聚焦按钮，关系画布、用户意图模板和优化单元抽屉在关闭后恢复触发元素焦点。可访问性定向回归为 3 个测试文件共 15 个用例，完整回归为 API 70 个测试文件共 313 个用例、Web 61 个测试文件共 345 个用例；零漏洞审计、全工作区类型检查与生产构建、Prisma schema 校验与 Client 生成、`git diff --check` 均通过。

GEO 成熟产品体验重构任务 12.3 已完成：API 传输与响应解析异常统一转换为失败响应，页面通过 `getQueryGroupWorkspaceState` 汇总多查询加载、完整、空、部分和失败状态。品牌工作区、AI 回复监测、分析诊断、增长优化、内容生成、内容资产、发布准备和再次监测均在部分失败时保留成功区域与当前输入，在全部失败时隐藏零指标、空结论和误导性业务空态，并提供集中重试动作；发布中心和监测记录移除同请求重复错误提示。共享模板回归新增部分失败保留成功数据及全部失败隐藏误导数据场景。完整 `npm run verify` 通过零漏洞审计、API 70 个测试文件共 313 个用例、Web 62 个测试文件共 351 个用例、全工作区类型检查与生产构建、Prisma schema 校验和 Client 生成；`git diff --check`、5173 开发服务日志和云端预览连接检查均通过。

GEO 成熟产品体验重构任务 12.4 已完成：24 个第一版页面继续通过 `React.lazy` 注册，导航目标、品牌化别名和路由集合保持双向一致。内容生成、竞品、信源、评价和事实分析页面的内部跨页动作统一使用 React Router，保留 Zustand 品牌上下文及现有 query/hash；监测记录进入分析诊断时合并完整工作流上下文并使用记录级 `runId`、`promptId`。`routes.test.ts` 新增业务页面 SPA 导航架构约束，`viteConfig.test.ts` 校验唯一 TypeScript 配置中的 `.monkeycode-ai.online` allowedHosts 与 `/api` 代理。完整 `npm run verify` 通过零漏洞审计、API 70 个测试文件共 313 个用例、Web 62 个测试文件共 354 个用例、全工作区类型检查与生产构建、Prisma schema 校验和 Client 生成；8 个代表深链、云端预览连接和 `git diff --check` 均通过。

GEO 成熟产品体验重构可选任务 12.5 已完成：新增正确性属性 P5 响应式主任务一致性测试，覆盖 `ProductPage`、`CreationWorkspace`、`AssetLibrary` 和 `ManagementListPage` 四类共享模板，以及 ready、loading、empty、partial、error 五类状态。20 组场景分别按 1440px 桌面与 390px 移动布局渲染，共验证 40 次响应式输出的主操作可见标签、目标路由和可访问名称一致，并检查创建工作台与资产库在两种布局下的顺序类。完整 `npm run verify` 通过零漏洞审计、API 70 个测试文件共 313 个用例、Web 63 个测试文件共 355 个用例、全工作区类型检查与生产构建、Prisma schema 校验和 Client 生成，`git diff --check` 通过。

GEO 成熟产品体验重构可选任务 12.6 已完成：新增全页面路由与视觉状态回归测试，固定覆盖 24 条导航路由、30 条品牌化别名、代表性工作流 query/hash 和 15 个 lazy 页面模块，并检查全部页面模块使用共享页面模板。四类共享模板覆盖 loading、empty、partial、ready、error 五类状态；1440px 桌面、1024px 平板和 390px 移动视口共执行 60 次结构渲染，验证应用壳模式、页面边距、响应式顺序类和主任务持续可用。完整 `npm run verify` 通过零漏洞审计、API 70 个测试文件共 313 个用例、Web 64 个测试文件共 359 个用例、全工作区类型检查与生产构建、Prisma schema 校验和 Client 生成，`git diff --check` 通过。

GEO 成熟产品体验重构任务 13 测试检查点已完成：独立运行全部 workspace 测试，API 70 个测试文件共 313 个用例、Web 64 个测试文件共 359 个用例全部通过。该检查点确认任务组 12 的响应式、可访问性、页面状态、路由连续性、属性测试和全页面回归覆盖可以共同运行。

GEO 成熟产品体验重构任务 14.1 最终代码质量门禁已完成：`npm audit` 返回 0 个漏洞，API、Web 和共享类型 workspace 类型检查通过，API 70 个测试文件共 313 个用例与 Web 64 个测试文件共 359 个用例通过，全部 workspace 生产构建通过，Prisma schema 校验和 Prisma Client `6.19.3` 生成通过，`git diff --check` 通过。`2026-07-14-geo-mature-product-ux-refresh` 规格中的必做任务与可选回归任务均已完成。

GEO 产品体验精修可选任务 1.5 已完成：导航测试覆盖五个业务任务域、24 条唯一页面入口、关键二级入口、八阶段工作流、相邻阶段上下文和品牌化路由别名；显示标签测试覆盖豆包、Kimi、DeepSeek、通义千问、阶跃星辰等平台名称、GEO 专业词解释、内部与未知平台 fallback、公开状态业务标签和未知状态 fallback。未知状态枚举统一显示为“未知状态”，避免公开页面暴露内部 code。定向回归为 2 个测试文件共 13 个用例，完整 Web 回归为 64 个测试文件共 360 个用例，并通过 Web workspace typecheck 和 `git diff --check`。

GEO 产品体验精修任务 8.6 已完成：公开页面标题和说明收敛为单一业务主题，操作按钮统一使用“动作 + 对象”；共享显示层补齐品牌角色、负责人、内容类型和未知值的业务标签，API 客户端统一过滤 provider、HTTP 状态、数据库和异常堆栈等技术错误详情。监测竞品评价输入支持“竞品名称｜排名｜正向/中性/负向”，运营人员可直接使用中文评价。完整仓库验证通过零漏洞依赖审计、全工作区类型检查与生产构建、API 79 个测试文件共 345 个用例、Web 66 个测试文件共 380 个用例、Prisma schema 校验和 Client 生成；`git diff --check` 通过。

GEO 产品体验精修可选任务 2.5 已完成：品牌资料库 Web helper 测试覆盖完整度、缺失项、分组进度、API 完整度提示字段和四类资料来源状态；新增 controller 集成测试通过真实 memory repository 与 permissions service 验证 `profile-library` 聚合读取、更新、缺失字段、分区完整度、品牌隔离和无权限访问。Web helper 通过 `completenessPrompts.field` 兼容 API 返回的业务化 `missingFields` 标签。完整回归为 API 71 个测试文件共 314 个用例、Web 64 个测试文件共 361 个用例，并通过 API/Web workspace typecheck。

GEO 产品体验精修可选任务 2.6 已完成：新增 `BrandProfileCompleteness.property.test.ts`，以 10 个资料字段的 1,024 种确定性填充组合覆盖五个资料分组。正确性属性 P1 验证所有分组完整度均为 0–100 的整数；P2 验证每个缺失标签都映射到可编辑分组或媒体素材补充入口，并验证 API 完整度提示提供稳定字段 key、影响说明和补充提示。完整 Web 回归为 65 个测试文件共 364 个用例，并通过 Web workspace typecheck 和 `git diff --check`。任务组 2 已全部完成。

GEO 产品体验精修可选任务 3.4 已完成：`MonitoringObjectManagement.test.tsx` 扩展为 7 个用例，覆盖监测对象行动型空态、新手解释、类型与优先级筛选、行操作边界、用户意图组合筛选、无监测问题时的生成引导、平台推荐度、平均排名、引用率、最近监测时间，以及监测问题中的业务平台名称。现有监测问题行渲染 helper 作为纯展示边界导出，便于静态渲染验证。完整 Web 回归为 65 个测试文件共 367 个用例，并通过 Web workspace typecheck 和 `git diff --check`。任务组 3 已全部完成。

GEO 产品体验精修可选任务 4.4 已完成：Web 与 API 的真实指标边界测试分别显式标记正确性属性 P3/P4，继续穷举 API、浏览器辅助、手动录入、`mock_ai`、空白回复、标准答案和内容草稿组合，并以真实回复基线验证边界外对象不会改变监测摘要、首页摘要或平台拆分；待补充队列 helper 同时断言自动监测重试、浏览器辅助监测和手动录入路径。完整回归为 API 71 个测试文件共 315 个用例、Web 65 个测试文件共 368 个用例，并通过 API/Web workspace typecheck。任务组 4 已全部完成。

GEO 产品体验精修可选任务 5.6 已完成：内容运营组件测试遍历全部 12 类模板，验证适用平台、推荐字数、素材、引用、复测规则和表单预设，并继续覆盖左右分栏空态、生成失败恢复、草稿导出、复制、保存、发布准备及事实补强、FAQ 补充和渠道适配提示。新增内容资产上下文正确性属性 P5，以 64 种组合验证来源资料、优化单元或用户意图至少存在一类有效上下文，修复目标关键词绕过保存准入的问题。完整回归为 API 72 个测试文件共 316 个用例、Web 65 个测试文件共 369 个用例，并通过 API/Web workspace typecheck。任务组 5 已全部完成。

GEO 产品体验精修可选任务 6.6 已完成：发布运营测试覆盖自有媒体、媒体平台和发布准备三种页面模式，平台规则展示，草稿、待发布、已发布、失败和空渠道统计，无账号行动型空态，发布准备的可用账号、标题、正文和目标平台提示，真实发布链接及再次监测入口。发布准备字段组件只提供已授权账号选项，并在无可用账号时引导前往自有媒体接入或恢复授权。定向回归为 2 个测试文件共 28 个用例，完整 Web 回归为 65 个测试文件共 371 个用例，并通过 Web workspace typecheck 和 `git diff --check`。任务组 6 已全部完成。

GEO 产品体验精修可选任务 7.4 已完成：分析域测试覆盖竞品、评价、事实和信源页面的顶部诊断卡、平台筛选、趋势与分布、证据明细和建议动作，并补充未识别来源、事实依据缺失、负向评价及竞品压制四类边界场景。信源页面为空标题和地址提供业务 fallback，事实页面为空问题文本和修正表达提供补充依据与人工确认引导。定向回归为 3 个测试文件共 13 个用例，完整 Web 回归为 65 个测试文件共 372 个用例，并通过 Web workspace typecheck。任务组 7 已全部完成。

GEO 产品体验精修可选任务 8.5 已完成：共享模板、报告中心、自动化运营卡片和显示标签测试共同覆盖平台业务名称、行动型空态、业务状态及内部字段隐藏。业务空态补齐可选完成收益，报告列表与详情使用“当前品牌”替代内部品牌标识，自动化上下文缺失时显示业务提示；可见文本回归确保品牌、报告和任务包内部标识不面向运营用户展示。定向回归为 4 个测试文件共 30 个用例，完整 Web 回归为 65 个测试文件共 373 个用例，并通过 Web workspace typecheck。任务组 8 已全部完成。

GEO 产品体验精修可选任务 10.7 已完成：新增后端 P6/P7 属性测试。P6 使用 6 组确定性输入覆盖品牌素材、内容资产、媒体账号、平台规则和分析 finding 的 `brandId` 归属、无权限读取及跨品牌更新拒绝；P7 通过平台控制器覆盖 15 类敏感字段命名变体及多层嵌套，验证公开响应保留脱敏状态并移除运行时凭据。Prisma 仓储测试新增与 memory 的品牌素材、分析 finding 映射一致性对照，内存 finding 证据同步改为去空和去重。定向回归为 5 个测试文件共 35 个用例，完整 API 回归为 73 个测试文件共 320 个用例，并通过 API workspace typecheck。任务组 10 已全部完成。

GEO 产品体验精修可选任务 11.4 已完成：新增 `FirstRoundWorkflowRoutes.test.ts`，通过真实页面 helper 串联新手首页、品牌资料、优化单元、用户意图、AI 回复监测、分析诊断、内容生成、发布准备、复测任务和同题监测，并覆盖分析异常进入内容任务、事实修正和复测入口。优化单元与用户意图列表新增集中 CTA 路由 helper，用户意图进入内容生成时保留 Prompt；监测进入分析时通过通用工作流路径保留任务和平台上下文。P4 属性测试补充问题文本及中文、空格、URL 特殊字符往返覆盖。定向回归为 4 个测试文件共 17 个用例，完整 Web 回归为 66 个测试文件共 376 个用例，并通过 Web workspace typecheck。

内测可用性优化 P2 文档解析任务已完成：API 新增 `DocumentTextExtractorService`，接入 Mammoth 1.12.0 和 pdf-parse 2.4.5，支持 Markdown、DOCX 和文本型 PDF 正文进入品牌字段确认草稿。上传边界新增扩展名、MIME、文件签名、UTF-8、PDF 页数和正文长度校验，文件使用随机 UUID 落入受控目录，解析失败原因持久化到知识来源；旧 DOC、扫描件、加密和损坏文档均返回业务化提示。真实 DOCX/PDF Buffer、格式伪装和导入集成定向测试为 API 2 个文件共 10 个用例，完整 API 回归为 74 个测试文件共 324 个用例，完整 Web 回归为 66 个测试文件共 376 个用例，并通过 API 与 Web workspace typecheck。运行时 Node 范围同步收紧为 `>=20.16 <21 || >=22.3`。

内测可用性优化 P2 浏览器辅助监测任务已完成：监测计划执行会为浏览器步骤预创建 `review_required` 运行并返回 `runId`；前端提供复制问题、打开官方平台、确认用户登录、粘贴真实回答和完成分析的会话绑定流程。共享契约改为事件输入，`browser-session-state.ts` 在服务端推导登录、异常、回答采集和停止状态；回答回填接口联合校验品牌、会话、授权计划、平台和运行归属，memory 与 Prisma 仓储保持一致。新增状态迁移和回答授权测试，完整 API 回归为 76 个测试文件共 332 个用例，完整 Web 回归为 66 个测试文件共 376 个用例，并通过全工作区类型检查、生产构建和 `git diff --check`。

内测可用性优化 P2 发布直连任务已完成：共享契约新增人工、半自动、自动三种发布模式和排队、发布中执行状态；Memory 与 Prisma 仓储保存发布模式快照、外部平台内容 ID、最近尝试和真实发布时间，迁移为 `20260718090000_add_direct_publishing_execution`。后端新增模式切换和显式执行 API，`PublishingExecutionService` 统一完成授权、品牌、账号、平台、内容和幂等校验，默认 Webhook Adapter 通过服务端 `GEO_PUBLISHING_WEBHOOKS` 配置接入真实平台。发布中心支持账号模式切换、半自动立即发布、自动创建后执行和执行状态展示。两轮上线准备审查收紧真实性和写入边界：缺少真实 URL 的 `published` 记录仍需调用 Adapter，授权或其他前置条件失败会写回可见的失败记录；公共创建仅接受草稿或待发布状态，公共状态更新无法写入排队、发布中或内部审计字段，人工发布成功要求有效 HTTP(S) 链接并由仓储补写真实发布时间。完整回归为 API 79 个测试文件共 345 个用例、Web 66 个测试文件共 376 个用例，并通过全工作区类型检查、生产构建、Prisma schema 校验和 `git diff --check`。

第一阶段上线门禁已完成追光小牛内测路径验证：自动生成监测主题后可生成 8 个监测问题，问题包含目的、目标平台、优先级和预计价值；监测问题可保存为计划并进入浏览器确认监测流程；公开平台配置响应仅包含 `hasCredential` 和脱敏状态，不暴露 `credentialRef`；LLM 异步任务响应只返回任务状态和 `jobId`；品牌总览、AI 回复监测、优化计划、写内容、任务跟进和报告导出页面入口可用；未接真实大模型 API 时，问题生成、优化计划和内容生成仍可走 fallback 或浏览器确认流程。

GEO 产品体验精修任务 8.7 已完成：依据参考产品将一级导航统一为工作台、品牌信息、内容中心、发布中心和数据分析，并同步数据总览、营销画布、竞品信息、AI 平台管理、优化建议及发布记录的导航入口与页面标题。优化单元在列表、筛选、空态、起步流程和后端推荐动作中使用统一公开名称；24 个第一版路由、品牌化别名和八阶段工作流上下文保持稳定。完整 `npm run verify` 通过零漏洞审计、API 79 个测试文件共 345 个用例、Web 66 个测试文件共 381 个用例、全工作区类型检查与生产构建、Prisma schema 校验和 Client 生成。

独立 Geo 仓库迁移后的开发基线复核已完成：`npm run verify` 先校验并生成 Prisma Client，再执行全部 workspace 类型检查、测试和生产构建。依赖审计为 0 个漏洞，API 80 个测试文件共 348 个用例、Web 67 个测试文件共 382 个用例全部通过；Express 请求上下文使用全局 `Express.Request` 声明增强，兼容不同依赖安装布局。

GEO 产品体验精修任务 13 已完成：品牌访问策略按具体嵌套资源优先解析，统一角色矩阵同时驱动 API 授权与 `/brands` 能力摘要；监测、内容、发布、任务、再次监测和报告关键写操作根据摘要显示可用状态，品牌主体和平台配置保持管理员边界。权限拒绝响应包含目标资源、当前角色、所需角色和申请路径。定向验证通过 API 18 个权限矩阵用例、Web 5 个文件共 30 个相关页面用例、全工作区类型检查和 `git diff --check`。

GEO 产品体验精修任务 14 已完成：再次监测计划只保留基线运行，执行时通过 `RetestEvidenceService` 创建同品牌且不同标识的新 `MonitoringRun`；验收使用真实回答和基线、复测两次分析派生提及率、品牌排名、表达准确率、引用率及实际分，人工输入只保留目标值和备注。任务页展示等待启动、采集中、分析中、已改善、持平和已退化状态，并提供启动监测、查看采集进度和刷新证据验收动作。完整 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client 生成、API 81 个测试文件共 364 个用例、Web 68 个测试文件共 384 个用例、全工作区类型检查和生产构建；`git diff --check` 通过。

GEO 产品体验精修任务 15 已完成：`PeriodReportSnapshotService` 使用 UTC 半开区间统一单品牌与多品牌报告周期，范围预览和生成流程按同一规则过滤监测、内容、发布、任务变化和已完成再次监测；有效样本要求真实回复与分析结果同时存在。报告快照冻结范围计数、记录 ID、样本摘要、数据缺口、`period-report-v1` 口径和效果证据，前端在生成前展示范围预览，并在详情下钻基线、观察窗口、优化任务、内容资产、发布渠道、真实链接和再次监测指标。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client 生成、API 82 个测试文件共 371 个用例、Web 68 个测试文件共 385 个用例、全工作区类型检查和生产构建；`git diff --check` 通过。

GEO 产品体验精修任务 16 已完成：服务端新增 `BrandActionDashboard` 聚合，在资料阻断、人工确认、执行任务、内容生成、发布、再次监测和结果复盘之间生成稳定排序的唯一主行动及最多三项待办，并附带最近有效样本、本周期效果、工作流上下文和来源失败信息。行动主页首屏只展示权威主行动、待办和效果反馈，高级工具保留在次级折叠区；任务深链通过 `taskId` 置顶并高亮目标记录。部分来源失败保留成功数据，核心来源全部失败返回稳定 503。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client 生成、API 82 个测试文件共 381 个用例、Web 68 个测试文件共 389 个用例、全工作区类型检查和生产构建，共 770 个测试用例通过；`git diff --check` 通过。

GEO 产品体验精修任务 17 可信度版本检查点已完成：权限、真实再次监测、周期报告和行动型主页相关测试随完整项目门禁共同通过。`npm run verify` 完成零漏洞依赖审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 82 个测试文件共 381 个用例、Web 68 个测试文件共 389 个用例及全工作区生产构建，共 770 个测试用例通过；`git diff --check` 通过。

GEO 产品体验精修任务 18.1 已完成：新增每品牌唯一、可恢复的四步 `QuickStartSession`，按官网信息、事实确认、问题选择和执行准备独立保存，并使用 version 乐观锁保护跨页面更新。官网浅层发现仅访问公开 HTTP(S) 首页，限制同源重定向、8 秒执行时间、1 MiB 响应和文本内容类型；发现失败保留会话、来源状态和人工确认路径。候选事实保留稳定 ID、原始值、编辑值、置信度、确认状态和来源证据，关键事实未确认时阻止完成执行准备。`/brands?quickStart=1` 提供响应式四步向导，支持品牌切换、离页恢复和 409 刷新。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 87 个测试文件共 405 个用例、Web 70 个测试文件共 397 个用例及全工作区生产构建，共 802 个测试用例通过；`git diff --check` 通过。

GEO 产品体验精修任务 18.2 已完成：关键事实确认后确定性生成品牌、品类、地域、购买决策、竞品比较和用户痛点六类默认问题，问题支持编辑、启停与跳转用户意图页查看更多。保存问题会读取豆包、Kimi、DeepSeek、通义千问和阶跃星辰平台配置，展示连接状态、自动或浏览器辅助执行方式、预计样本数、预计耗时和下一步；完成准备时复用现有 `TestPlan`，随后携带 `planId` 进入 AI 回复监测并恢复首轮计划。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 87 个测试文件共 405 个用例、Web 70 个测试文件共 397 个用例及全工作区生产构建，共 802 个测试用例通过；`git diff --check` 通过。

GEO 产品体验精修任务 18.3 已完成：API 测试覆盖会话创建与恢复、四步独立保存、version 冲突、品牌隔离、viewer 只读、官网发现状态、失败降级、关键资料缺失门禁、六类问题和首轮计划创建；Web 测试覆盖草稿恢复、来源证据、响应式四步结构、问题与准备门禁、抓取失败后的人工确认入口和携带 `planId` 的首轮监测深链。P12 属性测试以 6 组发现内容和 `pending`、`confirmed`、`edited`、`rejected` 四类状态验证候选事实保留服务端来源证据和确认状态。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 88 个测试文件共 406 个用例、Web 70 个测试文件共 399 个用例及全工作区生产构建，共 805 个测试用例通过；`git diff --check` 通过。

GEO 产品体验精修任务 18.4 已完成：官网浅层发现从已读取首页中提取最多 30 个同源候选链接，过滤跨源地址、静态资源和锚点重复，并按首页、产品、关于、FAQ、案例、联系、政策和其他资料生成稳定来源页面计划。无可识别链接或发现失败时生成带明确原因的确定性候选；用户可查看 URL、标题、资料角色、选取原因和处理状态，调整纳入范围、增删同源页面、修改角色并对失败项发起定向重试。服务端保存时校验同源、数量、重复项和至少一个纳入页面，确认时间随 QuickStart version 一并持久化；候选范围确认阶段不执行深度抓取。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 88 个测试文件共 407 个用例、Web 70 个测试文件共 400 个用例及全工作区生产构建，共 807 个测试用例通过；`git diff --check` 通过。

下一项按产品体验精修清单执行任务 18.5：编写来源页面计划测试。

GEO 产品体验精修任务 18.5 已完成：来源页面计划专项测试覆盖同源过滤、fragment 和尾斜杠清理、常见追踪参数移除、查询参数排序、稳定去重、八类页面角色、人工新增与删除、确定性候选降级、部分失败状态保留和失败项定向重试；服务测试同时验证未确认计划没有 `confirmedAt`，候选页面不会增加首页之外的品牌知识来源。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 89 个测试文件共 411 个用例、Web 70 个测试文件共 401 个用例及全工作区生产构建，共 812 个测试用例通过；`git diff --check` 通过。

GEO 产品体验精修任务 19.1 已完成：共享类型新增站点审计状态、检查键、证据、检查项和结果契约；后端新增独立 `SiteAuditModule` 与 `NodeFetchSiteAuditAdapter`，受控读取首页、robots.txt、sitemap.xml 和 llms.txt，并以固定规则检查 noindex、AI Bot 全站禁止、JSON-LD 和正文抽取结构。网络边界覆盖公开 HTTP(S)、DNS 公网校验、同源重定向、三次重定向限制、1 MiB 单项响应限制和 10 秒整体时限；失败结果保存目标 URL、检查时间和稳定错误码。专项测试全部 mock DNS 与 fetch，覆盖正常站点、缺失资源、noindex、AI Bot 禁止、结构化数据缺失、正文较弱、私网及 IPv4 映射私网 IPv6、跨源重定向、超限响应、整体超时和非法协议。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 90 个测试文件共 421 个用例、Web 70 个测试文件共 401 个用例及全工作区生产构建，共 822 个测试用例通过；`git diff --check` 通过。

GEO 产品体验精修任务 19.2 已完成：`SiteAuditService` 将七类站点检查映射为影响级别、影响说明、修复说明、人工任务模板和确定性验收规则，checker 覆盖结构、文本、链接和响应头，推荐任务仅包含 warning、fail 和 unavailable 项。`AcceptanceRuleService` 每次验收重新调用受控 Adapter 获取真实目标，根据对应检查生成 passed、failed 或 unavailable，并把检查时间、目标 URL、HTTP 状态和错误证据追加到验收历史；缺少目标检查时记录稳定错误码。专项测试覆盖七类规则映射、推荐任务过滤、连续失败与通过复查、证据历史追加和目标检查缺失。完整门禁通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 91 个测试文件共 424 个用例、Web 70 个测试文件共 401 个用例及全工作区生产构建，共 825 个测试用例通过；`git diff --check` 通过。

下一项按产品体验精修清单执行任务 19.3：基于已确认品牌事实生成可部署技术资产。

GEO 产品体验精修任务 19.3 已完成：共享契约新增六类技术资产、来源事实快照、生成输入、内容资产与版本组合结果；`TechnicalAssetService` 只使用 QuickStart 中 confirmed 或 edited 的事实，编辑值优先，并要求名称、官网和介绍完整。服务强制目标页面与已确认官网同源，以确定性序列化生成 llms.txt、Organization JSON-LD、FAQPage JSON-LD、Article JSON-LD、FAQ HTML 内容块和部署说明，支持去重后的类型子集。内容仓储保存官网渠道草稿、pending 审核状态、目标页面和来源事实，新增 `TechnicalAssetVersion` 保存不可变正文版本；迁移 `20260803110000_add_technical_assets` 增加对应字段、版本表和唯一约束。专项测试覆盖六类资产、编辑事实优先、未确认事实隔离、类型子集、同源限制和核心事实门禁。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 92 个测试文件共 428 个用例、Web 70 个测试文件共 401 个用例及全工作区生产构建，共 829 个测试用例通过。

下一项按产品体验精修清单执行任务 19.4：建设站点审计工作台。

GEO 产品体验精修任务 19.4 已完成：新增品牌级站点审计、技术资产生成和单项重新验收 API，显式映射 monitoring、content、retest 的 operator 权限，并校验品牌访问及 checker 路径一致性。前端新增 `/site-audit` 懒加载路由和发布中心导航入口，工作台支持提交官网、展示七类状态、目标 URL、HTTP 摘录或错误码、影响和修复说明，直接创建现有优化任务、生成六类待审核资产及对单项执行真实复查。unavailable 状态保留全部成功结果、历史证据和定向重试入口。专项测试覆盖控制器委派、品牌权限、规则错配、页面部分成功、错误证据、任务入口和验收结果合并。完整回归通过 API 93 个测试文件共 432 个用例、Web 71 个测试文件共 403 个用例及全工作区生产构建，共 835 个测试用例通过；`git diff --check` 通过。

下一项按产品体验精修清单执行任务 19.5：编写站点审计、checker 和资产测试。

GEO 产品体验精修任务 19.5 已完成：站点审计专项测试补齐异常 robots.txt、sitemap.xml、llms.txt 和 JSON-LD、资源级部分成功及同源重定向上限；对应实现对三类标准资源增加确定性文档形态校验。checker 测试验证每次重新获取真实目标、失败后通过、访问失败证据、检查缺失和目标 URL 错配，目标错配固定返回 `SITE_AUDIT_TARGET_MISMATCH`。技术资产测试逐份验证六类正文和来源快照只消费 `confirmed` 或 `edited` 事实，并排除 `pending`、`rejected` 及编辑前旧值。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 93 个测试文件共 436 个用例、Web 71 个测试文件共 403 个用例及全工作区生产构建，共 839 个测试用例通过；`git diff --check` 通过。

下一项按产品体验精修清单执行任务 19.6：实现版本化诊断评分。

GEO 产品体验精修任务 19.6 已完成：共享契约新增 schema、meta、content、citation 四维评分、冻结策略和诊断快照；`DiagnosticScorePolicyService` 将站点审计原始检查转换为维度分数，只在已测维度间归一权重，并保存配置权重、归一权重、加权分、完整策略、规则版本和综合分。memory 与 Prisma 双仓储按品牌保存快照，迁移 `20260803120000_add_diagnostic_score_snapshots` 创建持久化表；站点审计响应携带快照，历史诊断读取入口使用快照内策略和原始检查复现结果，因此规则升级只影响新诊断。专项测试覆盖完整冻结字段、未测维度、权重归一、规则升级、历史复现、非法权重、Prisma 映射和品牌级控制器。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 95 个测试文件共 442 个用例、Web 71 个测试文件共 403 个用例及全工作区生产构建，共 845 个测试用例通过；`git diff --check` 通过。

下一项按产品体验精修清单执行任务 19.7：建立验收进度快照、历史证据和回归重开。

GEO 产品体验精修任务 19.7 已完成：共享契约新增任务验收状态、不可变进度快照、验收历史和记录输入；`AcceptanceHistoryService` 使用 memory 与 Prisma 双仓储按品牌和任务追加每次 checker 证据，并从首条和末条记录稳定生成首次进度、当前进度及最新目标值。迁移 `20260803130000_add_task_acceptance_snapshots` 创建量化验收快照表、品牌任务时间索引和 checker 状态索引。真实再次监测验收会冻结实际分、目标分、来源与复测运行及改善证据；站点审计工作台会把已创建修复任务 ID 传给真实 checker，使单项复查进入同一验收历史。通过结果关闭任务，已有通过历史后的失败结果将任务置为 reopened，同时保留历史通过记录；不可判定结果只追加证据。品牌级 `GET /api/v1/brands/:brandId/tasks/:taskId/acceptance` 提供历史读取。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 97 个测试文件共 448 个用例、Web 71 个测试文件共 403 个用例及全工作区生产构建，共 851 个测试用例通过；`git diff --check` 通过。

下一项按产品体验精修清单执行任务 19.8：编写评分版本和回归验收属性测试。

GEO 产品体验精修任务 19.8 已完成：新增 P18 与 P19 属性测试。P18 枚举 schema、meta、content 检查的 pass、warning、fail、unavailable 状态组合，并在多个 warning 分值和维度权重升级策略下验证历史诊断始终使用冻结策略复现；同时覆盖负数、NaN、Infinity、全零权重及跨维度重复检查。P19 使用多组通过与回归进度边界验证历史通过任务在 checker 失败后统一重开，并保留首次进度、当前进度、目标值、通过证据和中间不可判定证据；重复不可判定验收保持只追加且不改变任务状态。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 98 个测试文件共 452 个用例、Web 71 个测试文件共 403 个用例及全工作区生产构建，共 855 个测试用例通过；`git diff --check` 通过。

GEO 产品体验精修任务 20.1 已完成：共享契约新增 `MeasurementScope`、采集方式和证据等级枚举，监测运行与每条原始回答分别保存平台、模型、采集方式、联网状态、市场、语言、证据等级、人工确认和基线版本。memory 与 Prisma 双仓储覆盖 API、浏览器、手工和演示采集路径，公共手工回答入口固定归类为人工证据；迁移 `20260803140000_add_monitoring_measurement_scope` 为历史数据提供 `unknown` 与 nullable 布尔状态。专项测试覆盖运行与样本快照差异、HTTP 输入归一化、采集来源防伪、Prisma 映射和历史兼容。完整回归通过 API 99 个测试文件共 456 个用例、Web 71 个测试文件共 403 个用例，共 859 个测试用例；`git diff --check` 通过。

GEO 产品体验精修任务 20.2 已完成：共享契约新增 `SampleEvidenceMeasurementStatus`、`SampleEvidenceItem` 和 `SampleEvidenceResult`，`AnalysisFinding` 增加稳定来源运行引用。品牌级样本证据 API 通过 `SampleEvidenceService` 从现有监测运行聚合问题、原始回答、引用来源、分析结果、回答级测量条件和采集时间，限制最多 100 个请求引用，并返回失效或尚无真实回答的证据缺口。前端 `SampleEvidencePanel` 按需接入指标摘要、回答日期趋势点、平台分布、四类分析 finding 和再次监测任务，区分未测、样本不足和有效样本。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 101 个测试文件共 461 个用例、Web 72 个测试文件共 404 个用例及全工作区生产构建，共 865 个测试用例；`git diff --check` 通过。

GEO 产品体验精修任务 20.3 已完成：监测运行和实际回答在未显式指定基线时，根据平台、模型、联网状态、市场和语言自动复用兼容 `baselineVersion` 或创建新版本；历史 `unknown` 基线在趋势中逐条隔离。`MeasurementDisciplineService` 按回答级基线生成可比区间，输出未测、样本不足和有效样本状态，以及提及率、Top 3 推荐率、事实准确度、引用召回率和引用准确度。新增 `MeasurementAttribution` 持久化模型与迁移 `20260803150000_add_measurement_attributions`，品牌级 API 保存基线窗口、观察窗口、对照问题、外部事件和固定为“观察相关”的结论类型。监测页新增 `MeasurementDisciplinePanel` 展示区间证据和五项指标并提供归因记录表单。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 103 个测试文件共 467 个用例、Web 73 个测试文件共 406 个用例及全工作区生产构建，共 873 个测试用例。

GEO 产品体验精修任务 20.4 已完成：监测主题和问题生成接口接收去重种子词，从品牌、品类、场景、人群、痛点、地域、购买决策和竞品比较八个维度建立确定性基线，并将 AI 输出作为增量补充。候选按规范化问题文本去重，重复项合并平台、业务价值、推荐概率和来源轨迹；同维度不同问题继续保留，首轮限制为 8 条。共享类型、LLM Prompt 与校验器、memory/Prisma 双仓储和迁移 `20260803160000_add_question_discovery_metadata` 支持业务价值、推荐概率、用户阶段、生成依据、生成方式和重复来源；监测页支持种子词输入、元数据展示和编辑。AI 缺失或失败时保留确定性可编辑候选。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 103 个测试文件共 468 个用例、Web 73 个测试文件共 407 个用例及全工作区生产构建，共 875 个测试用例；`git diff --check` 通过。

GEO 产品体验精修任务 20.5 已完成：共享契约新增 `OpportunityMap`、竞品主题、实际引用域名、引用位置、渠道依据和四类内容机会模型；`OpportunityDiscoveryService` 只消费当前品牌有效真实回复，聚合竞品优势主题、来源类型、平台分布和引用列表位置，并按品牌缺席、竞品占优、内容缺失、事实不一致排序。真实引用域名优先进入渠道建议，样本稀疏时追加证据计数为 0 的公共行业参考；重复问题合并证据和全部运行引用。品牌级机会地图 API 已接入增长优化页的 `OpportunityMapPanel`，展示未测、样本不足和有效样本状态。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 104 个测试文件共 472 个用例、Web 74 个测试文件共 409 个用例及全工作区生产构建，共 881 个测试用例；`git diff --check` 通过。

GEO 产品体验精修任务 20.6 已完成：新增正确性属性 P13 与 P14。P13 对 32 组平台、模型、联网状态、市场、语言、采集方式、证据等级和基线组合验证每个趋势指标样本均可回放原始回答、引用及完整回答级 `MeasurementScope`；P14 验证任意趋势区间只包含同一 `baselineVersion` 且平台、模型、联网状态、市场和语言兼容的样本。监测基线分组增加兼容条件键，使异常历史数据即使复用同一基线号也保持趋势隔离。专项测试同时覆盖八维问题候选及完整元数据、规范化重复合并与 AI 降级、0/1/2/3/5 条真实样本的稀疏状态边界，以及真实引用信源始终优先于公共行业参考。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 105 个测试文件共 481 个用例、Web 74 个测试文件共 409 个用例及全工作区生产构建，共 890 个测试用例；`git diff --check` 通过。

GEO 产品体验精修任务 20.7 已完成：服务端按品牌规范名、别名和官网域名确定性分类 discovery 与 brand probe，并在问题候选、品牌 Prompt、监测运行和回答链路冻结问题类型与 API/Web/App 访问端。无提示发现独立计算无提示提及率、首位推荐率和 Top 3 推荐率；品牌探测独立计算品牌识别率、事实准确度和自有域名引用率；指标按问题类型、市场、访问端、采集方式、平台、模型、语言、联网状态和基线版本分序列。样本证据展示问题类型、访问端和完整采集条件。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 106 个测试文件共 484 个用例、Web 75 个测试文件共 411 个用例及全工作区生产构建，共 895 个测试用例；`git diff --check` 通过。

GEO 产品体验精修任务 20.8 已完成：新增纯计算 `MetricIntegrityService`，复合指标会移除未测子指标并将剩余配置权重严格归一到 1；同市场平台比较要求至少两个有效平台且结果存在差异；趋势按完整测量条件和基线版本隔离，单次变化标记为观察，三个连续可比快照中的两次同向变化升级为趋势，未测快照或条件变化重置连续计数。测量纪律接口和前端面板已展示复合指标、归一权重、比较资格、趋势状态及运行证据。无实际指标的复测验收会追加 `pending_measurement` 待补测快照。定向验证通过 API/Web 类型检查、API 相关测试 12 个用例、Web 面板渲染测试和 `git diff --check`。

GEO 产品体验精修任务 20.9 已完成：竞品候选增加 `candidate`、`sample_confirmed`、`user_confirmed` 和 `excluded` 四态生命周期，memory 与 Prisma 双仓储保存去重后的真实样本运行证据、样本确认时间和用户确认时间；迁移 `20260803180000_add_competitor_candidate_lifecycle` 显式映射历史状态。`CompetitorOpportunityService` 从非 `mock_ai` 真实回答和分析结果中匹配候选、正式竞品及别名，只允许已确认竞品进入比较、问题机会和内容链路；服务识别竞品失守、品牌独占及各竞品按市场的前三可比平台，并创建冻结 Prompt 与监测运行证据的竞品对比内容任务。前端已展示候选四态、样本证据、两类问题机会和 Top 3 平台。定向验证通过 shared-types、API、Web 类型检查，API 3 个文件共 34 个用例、Web 3 个文件共 28 个用例、Web 生产构建、Prisma schema 校验与 Client `6.19.3` 生成、公开预览连接检查和 `git diff --check`。

GEO 产品体验精修任务 20.10 已完成：共享契约新增百度、Google 和人工搜索需求来源、候选状态、只追加快照、候选确认结果及问题池来源；`DemandSnapshotService` 通过固定端点 Adapter 保存词根、来源、市场、采集时间和候选问句，只与同品牌、同词根、同来源、同市场的上一快照比较，并将新增问句标记为需求上升观察。memory 与 Prisma 双仓储保存快照和候选，迁移 `20260803190000_add_search_demand_snapshots` 创建持久化表、唯一约束和查询索引。候选确认幂等写入监测主题、问题候选、稳定问题池和来源记录；前端搜索需求面板支持采集、人工录入、观察标记和确认入库。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 111 个测试文件共 507 个用例、Web 76 个测试文件共 413 个用例及全工作区生产构建，共 920 个测试用例；`git diff --check` 通过。

GEO 产品体验精修任务 20.11 已完成：共享契约新增 `ChannelRoadmap`、路线图项、三个执行窗口和样本覆盖状态；`ChannelRoadmapService` 复用真实引用域名、渠道建议、内容缺口、内容资产库存和媒体平台规则，输出内容形态、建议数量、发布节奏、负责角色、优先级和可追溯依据。高、中、低优先级动作分别进入 0-30、30-60 和 60-90 天窗口，只有有效真实样本实际引用目标域名时才标记样本覆盖。品牌级 API 已接入优化建议页的 `ChannelRoadmapBoard`，按三列展示渠道动作和空窗口状态。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 112 个测试文件共 510 个用例、Web 77 个测试文件共 414 个用例及全工作区生产构建，共 924 个测试用例；`git diff --check` 通过。

GEO 产品体验精修任务 20.12 已完成：新增正确性属性 P20-P23。P20 按品牌规范名、别名、官网及父子域名生成探测样本，验证无提示发现指标始终排除品牌探测题；P21 枚举 81 组测量状态组合，验证非有限值、非正权重和未测项退出复合指标后，剩余权重严格归一到 1；P22 枚举三快照组合，验证趋势只由三个连续可比快照中的两次同向变化支持，并覆盖全相同、方向反转、未测间隔和基线变化；P23 枚举 256 组候选四态组合，验证分析、内容和报告只消费正式竞品、`sample_confirmed` 或 `user_confirmed` 竞品。统一竞品确认 helper 已接入问题机会、内容建议、Dashboard 和报告比较；渠道域名匹配覆盖 URL、hostname、大小写、`www.`、尾点、父子域名和恶意后缀边界，搜索来源失败保持历史快照不变。最终 `npm run verify` 通过零漏洞审计、Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、API 114 个测试文件共 518 个用例、Web 77 个测试文件共 414 个用例及全工作区生产构建，共 932 个测试用例。

GEO 产品体验精修任务 21.1 已完成：共享契约新增内容准备输入、检查项、事实映射、风险段落、修正入口和整体结果；`ContentReadinessService` 对内容资产正文检查定义块、FAQ、步骤、比较表、数字依据、作者、更新时间、外部引用、结构化数据和渠道格式，并将品牌事实、数字和高风险段落关联到已确认来源、核验日期、确认状态和修正路径。数字识别排除 Markdown 列表序号与 URL 结构数字，同一已确认事实可覆盖正文中重复出现的表格、FAQ 和段落表达。品牌级 API 已校验内容资产归属与访问权限。定向类型检查通过，共享类型和 API 均无错误；专项测试 2 个文件共 5 个用例通过；完整 API 回归 116 个测试文件共 523 个用例通过。

GEO 产品体验精修任务 21.2 已完成：发布记录新增内容版本、素材要求确认、再次监测时间和确认时间快照，迁移 `20260804090000_add_publishing_confirmation` 补充持久化字段与复测时间索引。待发布创建与自动发布要求确认目标账号、内容版本、账号当前发布方式、素材要求和有效复测时间；历史或内容生成交接草稿可通过独立 confirmation API 补齐确认。自动或半自动执行、人工切换待发布及人工回填成功结果均检查确认快照，账号或发布方式变化后要求重新确认。前端发布准备表单和记录列表提供完整确认与草稿恢复入口。真实发布结果继续保存链接、时间、外部平台 ID、渠道状态和冻结版本，发布表现将记录级复测计划映射为已计划，周期效果证据携带发布版本。Prisma 校验与 Client `6.19.3` 生成、全工作区类型检查、全工作区生产构建和 `git diff --check` 通过；API 116 个测试文件共 526 个用例、Web 77 个测试文件共 414 个用例通过。

GEO 产品体验精修任务 21.3 已完成：共享契约新增 `KnowledgeChunk`、写入输入、同步结果和审核状态；品牌资料导入确认载荷及 Quick Start 中已确认或已编辑事实会按原始知识来源转换为确定性片段。片段使用 800 字边界、SHA-256 内容哈希和只追加来源版本，相同正文与审核状态保持幂等，资料更新递增来源版本。memory 与 Prisma 仓储均实现品牌隔离查询和版本追加，迁移 `20260804100000_add_knowledge_chunks` 提供 `tsvector` 生成列、GIN 全文索引、来源版本唯一约束和品牌查询索引；向量和关系检索通过 `KnowledgeRetrievalAdapter` 保留扩展边界。品牌级 API 提供片段查询和已确认事实同步。Prisma schema 校验与 Client `6.19.3` 生成、全工作区类型检查、全工作区生产构建和 `git diff --check` 通过；知识片段专项 3 个用例、API 117 个测试文件共 529 个用例通过。

GEO 产品体验精修任务 21.4 已完成：共享契约新增知识查询输入、查询用途、证据引用、资料缺口和查询结果；`KnowledgeRetrievalService` 只检索每个来源的最新版本，Prisma 路径使用 PostgreSQL `tsvector` 全文条件与确定性相关度排序，memory 路径保持同一品牌隔离和版本语义。只有 `approved` 片段形成可信答案，待审核或无匹配依据分别返回确认缺口或补充缺口，并附资料上传和事实确认路径。品牌级 `POST /knowledge/search` 返回答案、引用片段、来源、更新时间、可信状态、检索模式和调用留痕 ID。人工查询、内容生成和事实分析复用同一服务，通过现有 `AuditLog` 保存用途、资源、片段 ID、来源引用、检索模式和可信状态；内容生成引用资料同时带入已确认片段及来源。共享类型和 API 类型检查、Prisma schema 静态校验、全工作区生产构建和 `git diff --check` 通过；知识检索专项 3 个用例、调用链专项 11 个用例、API 118 个测试文件共 532 个用例通过。

GEO 产品体验精修任务 21.5 已完成：共享契约新增 `EffectEvidenceDashboard`；`EffectAttributionService` 复用 `PeriodReportSnapshotService` 的范围和效果计算，优先使用最新冻结报告周期，缺少报告时回退当前 UTC 自然月，聚合基线运行、优化任务、内容资产、发布记录、真实链接和再次监测，并将范围样本或归因链缺失转为去重的数据缺口。品牌级 `GET /reports/effect-evidence` 提供此 dashboard。`EffectEvidencePanel` 统一显示统计周期、证据状态、样本有效性、四项指标、真实发布链接和缺口，首页、优化分析、任务复测与报告详情共用同一组件；任务页的页面级重试同时刷新归因结果。新增归因服务和共享面板测试覆盖冻结周期、当前月回退、完整链路与资料缺口。API 119 个测试文件共 534 个用例、Web 78 个测试文件共 416 个用例、Web 生产构建、Prisma schema 校验和 `git diff --check` 通过。

GEO 产品体验精修任务 21.6 已完成：内容准备测试新增 P15 参数化场景，覆盖已确认数字事实、已编辑数字事实、待确认品牌事实和无来源数字，断言每个映射均具有来源或 `pending` 确认状态，待确认输入同时提供风险段落和修正路径。知识片段与检索测试覆盖来源版本、审核状态、品牌隔离和资料缺口；发布确认与效果归因测试覆盖真实链接、发布确认、基线和再次监测的完整链路以及缺少证据时的可行动缺口。API 119 个测试文件共 538 个用例和 API 类型检查通过，`git diff --check` 通过。

GEO 产品体验精修任务 21.7 已完成：`CitationAbsorptionService` 在公开 HTTP(S) 地址、DNS 公开地址、同源重定向、8 秒超时和 256 KiB 响应限制下读取引用页文本，将回答和来源拆为带位置的可审计片段，输出 `supports`、`partial`、`conflicts` 和 `unavailable`，并保存支持范围、置信度和复核状态。冲突、低于 70 分置信度及不可访问来源进入人工复核；引用看板分别展示引用广度、答案吸收深度和待复核数量。memory 与 Prisma 仓储均支持来源同步、吸收证据持久化和品牌隔离复核，迁移 `20260806100000_add_citation_absorption_evidence` 新增 JSON 证据字段。API 120 个测试文件共 541 个用例、Web 78 个测试文件共 416 个用例、Web 生产构建、Prisma schema 校验和 `git diff --check` 通过。

GEO 产品体验精修任务 21.8 已完成：内容准备共享契约新增规则版本、可选内容类型及对比、榜单、FAQ 专属检查键。`ContentReadinessService` 使用 `2026-08-content-quality-v1` 按内容类型执行竞品对比的同口径维度、自身局限、核验日期检查，榜单推荐的评选方法、数据来源、利益关系披露检查，并在正文含 FAQ 时验证每个答案首句提供直接结论；失败项返回 `section=content-rules&rule=...` 的结构化修正入口。专项 API 测试覆盖通过与缺失专属规则场景。API 120 个测试文件共 543 个用例、Web 78 个测试文件共 416 个用例、共享类型/API/Web 类型检查、Web 生产构建、Prisma schema 校验和 `git diff --check` 通过。

GEO 产品体验精修任务 21.9 已完成：知识查询新增 `organization`、`platform_quota` 和 `full_text` 三种 Embedding 费用归属策略。`KnowledgeRetrievalService` 按配置尝试 vector/graph Adapter；高级结果不可用、失败或不足时，使用全文召回和按来源最新版本过滤的结构化结果补齐，并返回 `vector`、`graph`、`hybrid`、`full_text`、`structured` 或 `none` 的 `retrievalMode`。响应和 `AuditLog` 均保留费用归属、降级原因、来源、审核状态和可信状态。新增测试覆盖高级检索不可用、部分召回与全文合并、最新版本隔离和 BYOK 策略；API 120 个测试文件共 545 个用例、API 生产构建、shared-types/API 类型检查和 `git diff --check` 通过。

GEO 产品体验精修任务 21.10 已完成：引用吸收测试新增 P24，分别覆盖准确、部分和冲突结论，并验证每条结论都保留回答句、来源片段和复核状态；引用页面不可访问时验证持久化 `unavailable` 与 `pending_review`。内容准备测试增加榜单具备评选方法与数据来源但缺少利益披露的门禁场景。检索测试覆盖零向量和 Embedding 异常时回退至审核全文证据、BYOK 费用归属与降级原因；测试发现并修复零向量结果被误标为 `hybrid` 的问题。

GEO 产品体验精修任务 22.1 已完成：新增 `ProductEvent` 共享契约、Prisma 模型与迁移、内存及 Prisma 仓储和事件记录服务。事件通过品牌归属解析组织，按组织和品牌隔离，并以品牌、事件类型、幂等键去重；元数据只保留受控运营字段。品牌创建、资料确认、首轮监测、建议采纳、内容保存、发布、再次监测、报告生成和监测或发布失败均已接入；事件写入异常不会阻断主业务流程。专项测试覆盖组织归属、受限元数据、幂等与归属缺失跳过。验证通过 `npm run prisma:validate`、API 类型检查、API 121 个测试文件共 555 个用例和 `git diff --check`。

GEO 产品体验精修任务 22.2 已完成：`ProductEffectService` 从组织和品牌隔离的事件中按统计周期聚合首轮监测到达率、首次有效洞察耗时、建议采纳率、发布完成率、再次监测完成率和有改善任务占比；`GET /api/v1/brands/:brandId/product-effects?from=&to=` 返回统计周期、事件样本规模、每项指标分母定义及数据缺口。专项测试覆盖完整漏斗、首次洞察耗时、周期过滤和空样本。验证通过 Prisma schema 校验、API 类型检查、API 122 个测试文件共 557 个用例和 `git diff --check`。

GEO 产品体验精修任务 22.3 已完成：产品事件测试覆盖同品牌同事件与幂等键的重复写入、不同品牌复用幂等键、组织归属、受限元数据、失败类别和归属缺失跳过；效果看板测试覆盖统计周期过滤、空样本、组织与品牌隔离，以及从品牌接入到首个有效监测样本完成的首次洞察耗时。验证通过 API 类型检查、专项 2 个测试文件共 7 个用例、API 122 个测试文件共 559 个用例和 `git diff --check`。

下一项按产品体验精修清单执行检查点 23：完成快速闭环与执行交付版本验证。

检查点 23.1 已通过 API 全量回归。检查点 23.2 的 `npm run verify` 在 `npm audit` 请求 npm registry 时因 TLS 连接中断停止；独立执行的 Prisma schema 校验、API 类型检查、API 全量测试和 `git diff --check` 已通过。网络恢复后需重新运行完整验证命令。

GEO 产品体验精修任务 24.1 已完成：发布 Adapter 契约统一定义连接校验、草稿创建、发布执行、状态查询、结果、错误类别和幂等键。注册表按品牌发布看板平台返回仅含连接状态、能力、结果类型和恢复动作的脱敏摘要，`GET /api/v1/brands/:brandId/publishing/adapter-capabilities` 受品牌访问校验保护。Webhook Adapter 已实现该契约；专项测试验证能力摘要不暴露授权 token。API 类型检查、专项测试、API 123 个测试文件共 560 个用例和 `git diff --check` 通过。

GEO 产品体验精修任务 24.2 已完成：WordPress、GitHub Contents、微信公众号和通用 Webhook Adapter 已注册到发布中心。WordPress 与 GitHub Contents 将渠道 API 返回的外部标识和真实链接映射到既有发布记录状态机；微信公众号返回人工交接能力和后台草稿确认动作。渠道连接配置仅从服务端环境变量读取，公开能力摘要不会暴露授权 token。专项测试覆盖 WordPress、GitHub 返回映射、凭据脱敏与微信公众号人工交接；API 124 个测试文件共 562 个用例通过。

GEO 产品体验精修任务 24.3 已完成：发布 Adapter 契约测试使用本地模拟请求覆盖成功、鉴权失败、限流、平台失败、超时、重复提交、状态恢复和凭据脱敏。Webhook Adapter 将 HTTP 401/403、429、平台响应错误和请求超时映射为稳定失败类别，保留原始幂等键。API 类型检查、专项测试、API 125 个测试文件共 568 个用例和 `git diff --check` 通过。

GEO 产品体验精修任务 24.4 已完成：执行发布接口要求本次确认账号、内容版本和目标渠道，并和当前发布记录快照逐项校验；确认取消或对象变化时不会调用渠道 Adapter。发布 Adapter 能力摘要包含结果模式，WordPress 的执行结果固定为渠道草稿，保存渠道返回链接并以 `draft_created` 结果保持发布记录草稿状态。专项发布确认测试、API 类型检查与 API 125 个测试文件共 569 个用例通过。

GEO 产品体验精修任务 24.5 已完成：发布确认与草稿测试覆盖确认取消、账号或内容版本变化阻断、账号授权失效、渠道草稿创建、直接发布和微信公众号人工交接能力。草稿执行测试验证只调用 `createDraft`，不调用直接发布接口，并保存渠道草稿链接。API 类型检查、专项 3 个测试文件共 16 个用例、API 125 个测试文件共 570 个用例和 `git diff --check` 通过。

GEO 产品体验精修任务 25.1 已完成：新增组织级 `OrganizationProviderConfig` 模型与迁移，Provider 治理服务按品牌访问权限解析组织后优先读取组织 BYOK 配置，并在配置缺失时回退读取现有品牌平台配置。Provider 摘要包含用途、模型、健康状态、优先级、故障转移顺序与凭据状态；公开结果只输出 `configured` 等状态，不含凭据引用值。品牌级 `GET /providers` 返回治理摘要，`POST /providers` 使用组织、平台与用途的复合唯一键写入 BYOK 配置。专项测试验证组织归属、复合键保存和凭据脱敏；Prisma schema 校验、Prisma Client 生成、API 类型检查、API 126 个测试文件共 572 个用例和 `git diff --check` 通过。

GEO 产品体验精修任务 25.2 已完成：新增 `QuotaAccount`、`UsageReservation` 和 `UsageLedgerEntry` 持久化模型，`QuotaService` 在 LLM 任务执行前按用户、组织和全局预算顺序校验并创建预占，重复 `taskKey` 返回幂等结果。同步 LLM 调用成功后按 token 用量结算并追加 `settled` 账本事件，配置缺失、Adapter 不支持或调用失败时释放预占并追加 `released` 事件；额度不足返回稳定拒绝原因、剩余额度和恢复动作。专项测试覆盖用户额度拒绝、组织额度边界、实际用量结算和失败释放；Prisma schema 校验、Client 生成、API 类型检查、API 127 个测试文件共 575 个用例和 `git diff --check` 通过。

GEO 产品体验精修任务 25.3 已完成：`AsyncJob` 新增幂等键、当前步骤、JSON 进度和结果摘要字段，迁移为 `20260810103000_add_async_job_orchestration_fields`。`JobOrchestratorService` 统一处理入队去重、领取运行、步骤完成和失败重试，达到重试上限时进入 `retry-exhausted`；LLM 异步请求已通过该服务创建带步骤进度的持久化任务。专项测试覆盖相同幂等键复用、步骤状态、完成保护和重试耗尽；Prisma schema 校验、Client 生成、API 类型检查、API 128 个测试文件共 577 个用例和 `git diff --check` 通过。

GEO 产品体验精修任务 25.4 已完成：新增品牌范围的 `GET /api/v1/brands/:brandId/runtime-operations`，聚合 Provider 健康、排队或运行任务、失败任务、用户/组织/全局额度、发布账号授权状态和依赖状态。运行中心支持 `POST /runtime-operations/jobs/:jobId/retry` 与 `POST /runtime-operations/jobs/:jobId/cancel`；重试已耗尽任务会重新排队，已完成与已取消任务保持终态。API 类型检查、任务编排专项测试、API 128 个测试文件共 578 个用例和 `git diff --check` 通过。

GEO 产品体验精修任务 25.5 已完成：Provider 治理测试覆盖组织级 BYOK 的凭据脱敏、组织归属和按优先级稳定排序的故障转移顺序；额度测试新增 P16，验证每个接受的任务预占只会进入一次结算或释放终态。任务测试覆盖幂等入队、步骤状态、重试上限和管理员重试；运行中心测试覆盖当前品牌任务筛选、Provider 与额度聚合、发布账号摘要、重试委托和取消操作。API 类型检查、专项 4 个测试文件共 11 个用例、API 129 个测试文件共 581 个用例和 `git diff --check` 通过。

GEO 产品体验精修任务 25.6 已完成：组织 BYOK 配置新增独立 endpoint URL，`ProviderHealthCheck` 持久化最小连接校验的状态、延迟、脱敏错误类别、检查时间和 15 分钟有效期。`POST /api/v1/brands/:brandId/providers/:platformCode/health` 通过 Adapter `validateConfig()` 执行受限校验并写入结果。Provider 摘要读取最新检查；无检查、失败或结果过期时进入 `attention` 待复测状态，只有启用、已配置凭据且有效检查成功的 Provider 显示为 `healthy`。Prisma schema、API 类型检查、Provider 专项 4 个用例和 `git diff --check` 通过。

GEO 产品体验精修任务 25.7 已完成：额度拒绝原因新增 `user_frozen` 与 `byok_required`；冻结用户在预占前获得稳定恢复动作。`QuotaAdjustmentService` 要求管理员填写调整原因，并在同一事务中更新额度账户、追加包含操作者、主体、前后额度、差值和时间的 `QuotaAdjustmentAudit` 记录；审计查询支持主体、操作者和时间过滤。Prisma client 生成、API 类型检查、额度与调整审计专项 7 个用例通过。

GEO 产品体验精修任务 25.8 已完成：`ProviderSpendStage` 以任务、步骤和尝试号唯一标识有限期执行租约，活动租约上的重复投递返回幂等跳过。同步生成在 Provider 返回后、输出校验前立即写入累计成本，因此 Worker 后续校验失败时已产生费用仍保留；完成步骤持久化 Provider、累计成本和完成时间。Prisma client 生成、API 类型检查、租约额度审计专项 9 个用例通过。

GEO 产品体验精修任务 25.9 已完成：管理员重试使用任务级互斥保护状态比较，结清同一幂等键的旧预占后创建新预占；额度拒绝时保留原任务状态。可注入 dispatcher 的派发失败路径释放新增预占并恢复原任务状态，防止重复运行与额度泄漏。API 类型检查、重试与额度专项 9 个用例通过。

GEO 产品体验精修任务 25.10 已完成：P25 验证每次人工额度调整均包含操作者、原因和完整的前后状态；P26 验证同一任务步骤尝试在有效租约中至多获得一次执行权。专项覆盖冻结、额度耗尽、重复租约、租约过期、成本保留、重复完成、重试竞争和派发失败补偿。

GEO 产品体验精修任务 26 已完成：`OperationCycleService` 按站点审计、监测、任务验收、报告和交付包步骤维护可恢复的周期进度、失败原因、重试状态与人工确认事项。`DeliveryBundleService` 使用冻结报告快照导出 HTML、PDF、Markdown 和 CSV，并要求 manifest 中全部文件成功。客户空间使用独立、有效期受限的只读授权；跨品牌比较要求统计周期、口径版本和基线版本完全一致。站点审计默认每周执行，答案采样默认双周执行；频率预览返回问题数、平台数、轮次、预计成本及趋势影响。诊断、优化和执行文档共享同一快照、口径、manifest 和统计窗口。Task 26 专项 4 个文件、9 个用例，Prisma schema、API 类型检查与 `git diff --check` 通过。

GEO 产品体验精修任务 27 已完成：`ContextualGuidanceService` 按品牌资料、监测、内容、发布和复测状态生成目标、完成标准、示例、下一步、指标口径、数据来源、适用边界和常见误读。`ErrorRecoveryService` 将公开业务错误类别映射到不暴露凭据和内部堆栈的恢复步骤。`InfrastructureBoundaryService` 在单品牌知识片段超过 10,000、关系查询超过 1,000、对象资产超过 1GB 或检索延迟超过 500ms 时选择相应 Adapter。`PublicBrandProfileService` 仅发布已确认白名单字段，预览令牌受品牌与有效期约束并使用 `noindex`，正式发布带 canonical 与 Organization JSON-LD，撤回后停止访问和浏览计数。Task 27 专项 2 个文件、6 个用例，Prisma schema、API 类型检查与 `git diff --check` 通过。
