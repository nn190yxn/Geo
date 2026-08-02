# 交付检查清单

## 当前范围

多品牌 GEO 管理平台位于 `当前工作区/`。小白友好 GEO AI 回复监测与增长优化流程规格已完成，当前交付前最终验证通过。

## 验证命令

以下命令在 `当前工作区/` 下执行。

```bash
# 构建所有 workspace
npm run build

# 类型检查所有 workspace
npm run typecheck

# 运行 API 测试套件
npm run test --workspace @geo-platform/api

# 运行 Web 测试套件
npm run test --workspace @geo-platform/web

# 一键交付验证：依赖安全审计、类型检查、测试、构建、Prisma schema 校验和 Prisma Client 生成
npm run verify

# 校验 Prisma schema
npm run prisma:validate

# 生成 Prisma Client
npm run prisma:generate

# 生成 Prisma Client 并写入 demo seed
npm run db:prepare
```

## 最新验证结果

- `npm run build` 通过。
- `npm run verify` 通过，包含 `npm audit`、workspace 类型检查、workspace 测试、workspace 构建、Prisma schema 校验和 Prisma Client 生成；`npm audit` 当前 0 个漏洞。
- `npm run typecheck --workspaces` 通过。
- `npm run test --workspace @geo-platform/api` 通过，API 当前 68 个测试文件、308 个测试用例通过。
- `npm run test --workspace @geo-platform/web` 通过，Web 当前 28 个测试文件、152 个测试用例通过。
- `npm run build --workspace @geo-platform/api` 通过。
- `npm run build --workspace @geo-platform/web` 通过。
- `DATABASE_URL="postgresql://geo:geo@localhost:5432/geo_platform?schema=public" npx prisma validate --schema apps/api/prisma/schema.prisma` 通过。
- `npx prisma generate --schema apps/api/prisma/schema.prisma` 通过，Prisma Client 版本为 `6.19.3`。
- 旧版测试类公开口径残留扫描通过：文档和源码中的用户可见产品文案已统一为监测口径。
- 示例数据公开口径残留扫描通过：用户可见旧表达已统一为“示例回答 / 示例监测 / 发现机会”等业务口径。
- 前端公开展示扫尾通过：平台表格、模型表格、Prompt 模板、手动录入、内容导出、报告中心和顾问工作台已避免直接展示平台 code、内部用户 ID 或品牌 ID；用户可见区域优先显示平台名称、当前品牌和业务化标签。
- API 健康检查可访问：`http://localhost:3001/api/v1/health` 返回 200；配置 `STEPFUN_API_KEY` 或设置 `GEO_AI_PLATFORM_CONFIGURED=true` 后，`dependencies.aiPlatforms` 显示为 `configured`。
- 前端入口检查通过：`http://localhost:5173` 返回 200。
- 公开预览检查通过：`https://5173-af4ce582db267302.monkeycode-ai.online` 返回 200。
- 提交前清理检查通过：`.gitignore` 已过滤测试上传产物 `uploads/` 和 `geo-platform/packages/shared-types/src/*.js` 编译残留，关键源码文件仍可进入待提交列表。
- SenseNova 接入历史烟测通过：`sensenova` 可按 OpenAI-compatible 平台配置接入，endpoint 为 `https://token.sensenova.cn/v1/chat/completions`，模型为 `sensenova-6.7-flash-lite`；使用 SenseNova 作为默认模型时，可通过平台配置和 `GEO_AI_PLATFORM_CONFIGURED=true` 标记健康状态。
- StepFun 接入烟测通过：`stepfun` 可按 OpenAI-compatible 平台配置接入，endpoint 为 `https://api.stepfun.com/v1/chat/completions`，模型为 `step-3.7-flash`；当前运行态业务链路 `answer-analysis` 已返回 `succeeded`，平台密钥只在运行态配置中使用，文档不记录真实值。
- 内测大模型默认优先使用阶跃星辰 `step-3.7-flash`；LLM 自动任务未指定平台时，会优先选择已配置密钥的 `stepfun` API 配置，模型设置页将阶跃星辰放在接入向导首位。
- 运行态推荐配置方式：将真实密钥放入 `STEPFUN_API_KEY` 环境变量；新品牌默认阶跃星辰配置会自动引用该环境变量，公开响应仍只返回 `hasCredential` 与脱敏状态。
- 默认 memory repository 下 `brand_demo` 追光小牛闭环接口复测通过：品牌工作区、监测主题、候选问法、监测计划、平台配置、增长优化、内容生成、发布中心、任务看板、报告中心和顾问记录均返回可展示数据。
- 默认 memory repository 下 `brand_demo` Sprint 接口烟测通过：Sprint 列表、当前 Sprint、Sprint 详情、问题雷达、标准答案列表、标准答案对照、内容缺口任务、发布准备和复测趋势只读接口均返回 200，可提供前端 Sprint 工作台、诊断看板、发布准备看板和复测趋势看板消费。
- 端到端写链路烟测通过：增长优化计划创建、确认拆任务、内容任务生成、内容版本保存、发布入口生成、发布账号创建、发布记录创建与发布状态更新、有效监测任务复测创建和复测完成均通过。
- 冷启动验证通过：重启 `npm run dev` 后 seed 默认数据恢复，临时内存烟测数据清空，前端、API 和公开预览恢复 200。

## 预览状态

当前开发服务通过 `npm run dev` 启动前端和后端：

- API 服务：`http://localhost:3001/api/v1/health`
- Web 服务：`http://localhost:5173`
- 预览地址：`https://5173-af4ce582db267302.monkeycode-ai.online`

最新健康检查响应：

```json
{
  "success": true,
  "data": {
    "status": "degraded",
    "service": "geo-platform-api",
    "repositoryDriver": "memory",
    "runtimeEnvironment": "development",
    "dependencies": {
      "database": "ready",
      "queue": "in_memory",
      "aiPlatforms": "not_configured",
      "mapProvider": "configured",
      "logging": "console"
    },
    "missingConfiguration": ["GEO_AI_PLATFORM_CONFIGURED"]
  }
}
```

## 工程状态

- API 前缀统一为 `/api/v1`。
- 前端请求统一通过 `/api` 代理转发到后端。
- 前端 Vite `allowedHosts` 已允许 `.monkeycode-ai.online` 预览域名。
- 业务数据隔离基础字段为 `brandId`。
- 默认开发注入使用内存仓储，并内置 `brand_demo` 追光小牛演示闭环；设置 `GEO_REPOSITORY_DRIVER=prisma` 后使用 Prisma repository。品牌、权限、拒绝访问日志、品牌档案、知识来源、优化单元、用户意图、Prompt、平台配置、监测运行、人工回答、分析结果、GEO 指标、内容、发布、任务、报告和顾问记录已具备 Prisma repository 持久化路径。
- `npm run db:prepare` 会生成 Prisma Client 并执行 demo seed；`npm run prisma:seed` 可单独重复执行 demo 数据 upsert。
- 第三阶段已新增 Adapter registry、`OpenAICompatibleAdapter`、`AIPlatformCallAudit` 调用审计基础模型、`AsyncJob` 异步任务基础模型、监测创建入队流程、Monitoring worker、失败重试状态机、监测任务状态机测试、内容生成创建入队流程、内容生成步骤状态记录、生成成功后的内容版本写入、内容生成失败重试契约、`ContentGenerationWorker` 契约测试、监测异步状态前端展示、内容生成步骤状态展示和失败重试入口，当前完整验证门禁通过。
- 第四阶段已建立 `access-audit-production` 规格，并完成真实用户、组织和角色模型基础、审计日志服务基础、集中权限策略、生产健康检查和部署运行手册；品牌访问前置校验已纳入用户状态、有效组织成员和路由最低角色检查，拒绝访问会写入 denied access 和 audit log。
- 第五阶段任务 2 已完成：主要前端页面改为 lazy route component，增加稳定加载 fallback，并通过 Vite `codeSplitting.groups` 拆分 React、Ant Design、TanStack Query 和通用 vendor chunks。
- 第五阶段任务 1 已完成：品牌工作区、监测、内容生成、发布、任务、报告和顾问页面已统一错误提示、空状态主操作和关键操作反馈。
- 第五阶段任务 3 已完成：报告中心 Markdown 模板已增强，内存仓储和 Prisma 仓储共用报告渲染器，单品牌、客户交付和多品牌报告包含 metadata、指标解释、问题归因、行动建议、品牌对比、风险提示、交付进度和下一步动作。
- 第五阶段任务 4 已完成：顾问服务工作台已支持服务计划、服务复盘、客户交付记录、结构化服务详情、待跟进事项和同品牌报告引用。
- 第五阶段任务 5 已完成：默认 memory demo 和 Prisma demo seed 已覆盖品牌、监测、内容、发布、任务、报告和顾问记录；试点客户演示与验收清单位于 `当前工作区/.monkeycode/docs/PILOT_DEMO_CHECKLIST.md`。
- 第五阶段检查点已完成：seed 语法检查、Prisma schema 校验、`git diff --check`、`npm run verify`、API 健康检查、前端入口检查和 5173 预览检查均已通过。
- 持续迭代机制已建立：阶段复盘、反馈转需求、行业规则变化、文档同步和验证门禁统一记录在 `当前工作区/.monkeycode/docs/CONTINUOUS_ITERATION_PLAYBOOK.md`。
- 持续迭代检查点已完成：`git diff --check`、`npm run verify`、API 健康检查、前端入口检查和 5173 预览检查均已通过。
- AI 可见性运营 Sprint 重构已完成核心实现和前端入口：新增 Sprint 聚合、标准答案、对照分析、内容缺口、发布准备、复测趋势和工作台入口；交付口径统一为“AI 回复监测 / 自动监测 / 浏览器辅助监测 / 手动录入 / 再次监测”。
- 平台密钥接口只返回 `hasCredential` 和脱敏状态，不返回真实平台密钥。
- 默认 AI 平台为豆包、Kimi、DeepSeek、通义千问和阶跃星辰；其中阶跃星辰默认使用 OpenAI-compatible API 接入候选，未填写平台密钥时返回脱敏配置状态。
- API 中间件通配路由使用 Nest 11 / Express 5 兼容写法 `forRoutes('{*splat}')`。

## 后续交付关注点

- 真实 AI 平台接入：当前内测优先使用阶跃星辰 `step-3.7-flash` 支撑 LLM 自动任务；后续可在模型设置中补充豆包、Kimi、DeepSeek、通义千问等平台密钥、endpoint、model name 与 provider 配置，并用 `GEO_AI_PLATFORM_CONFIGURED=true` 标记非 StepFun 默认平台已配置。
- 数据库交付：当前已通过 Prisma schema 校验和 Client 生成；`apps/api/prisma/migrations/` 已新增 Sprint 聚合和品牌标准答案增量迁移，两个迁移目录均包含 `migration.sql`，并已核对表名、字段、索引、外键和 Prisma schema 模型映射。本地 PostgreSQL 未运行时，`prisma migrate status` 会因无法连接 `localhost:5432` 返回 P1001；生产或 Prisma 演示环境需要在目标数据库可连接后执行迁移状态检查和受控迁移流程。
- 生产部署：补充数据库、环境变量、构建产物、进程管理和健康检查方案。
- 持续迭代：基于真实试点反馈、行业规则变化或生产试运行问题建立下一轮规格文档，并按持续迭代机制执行复盘和验证。
