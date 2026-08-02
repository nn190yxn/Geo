# 试点客户演示与验收清单

## 目标

本清单用于第五阶段试点客户演示。默认内存仓储内置一套最小 demo 数据；Prisma 演示环境可通过 `当前工作区/apps/api/prisma/seed.js` 写入稳定 demo 数据，覆盖品牌、监测、内容、发布、任务、报告和顾问记录，支持按固定路径完成演示、验收和反馈回填。

## 演示数据

执行以下命令准备 Prisma demo 数据：

```bash
# 进入 GEO 平台工程

# 生成 Prisma Client 并写入 demo seed
npm run db:prepare
```

当前 demo 数据使用固定 ID，可重复执行 seed：

| 模块 | 关键数据 | 用途 |
| --- | --- | --- |
| 用户与品牌 | `user_demo`、`brand_demo`、`permission_demo_owner` | 默认演示用户和品牌权限 |
| 品牌知识库 | `brand_demo` 的 BrandProfile | 展示品牌介绍、卖点、FAQ、竞品、表达规则和完整度 |
| 平台配置 | 阶跃星辰默认 API 配置、`platform_mock_demo` | 展示内测默认模型配置、示例回答平台、限流和平台密钥脱敏状态 |
| 优化单元与意图 | `unit_demo_core`、`intent_demo_buying` | 展示核心产品可见性优化单元和 comparison 意图 |
| Prompt | `template_demo_comparison`、`prompt_demo_comparison` | 展示模板生成和品牌 Prompt 监测入口 |
| 监测结果 | `run_demo_weekly_mock`、`response_demo_weekly_mock` | 展示 completed 监测运行、AI 回答、解析结果和引用来源 |
| 指标快照 | `metric_demo_weekly_mock` | 展示 GEO 指数、样本量和平台维度评分 |
| 内容资产与策略 | `asset_demo_homepage`、`strategy_demo_guide` | 展示官网内容资产和 gap 类型内容策略 |
| 内容生成 | `generation_demo_guide`、`version_demo_guide_v1`、`export_demo_guide_markdown` | 展示已完成内容生成任务、Markdown 版本和导出记录 |
| 发布 | `publishing_account_demo_website`、`publishing_record_demo_guide` | 展示 Website CMS 账号和已发布记录 |
| 任务复测 | `task_demo_content_refresh` | 展示内容刷新任务、来源监测、内容链接、复测计划和审阅状态 |
| 报告 | `report_demo_customer_delivery` | 展示客户交付报告、metadata、数据缺口和行动建议 |
| 顾问记录 | `advisor_demo_service_plan`、`advisor_demo_delivery_review` | 展示服务计划、客户交付复盘、报告引用和待跟进事项 |

## 演示路径

使用 `user_demo` 和 `brand_demo` 进行演示。前端默认通过 `x-brand-id` 注入品牌上下文，API 调试可显式传入请求头。

| 顺序 | 页面或接口 | 验收点 |
| --- | --- | --- |
| 1 | `/brands` | 品牌列表可访问，Demo Brand 状态为 active，工作区摘要有业务数据 |
| 2 | `/brands/brand_demo/dashboard` | 品牌化路由别名可跳转到第一版工作区页面 |
| 3 | `/canvas` | GEO 画布可展示优化单元、用户意图、内容策略和任务关联 |
| 4 | `/monitoring` | 平台配置、监测运行、解析结果和 GEO 指数可展示 |
| 5 | `/content` | 内容资产和内容策略可展示，策略可关联 Prompt 和优化单元 |
| 6 | `/content-generation` | 内容生成任务为 completed，版本和导出记录可查看 |
| 7 | `/publishing` | Website CMS 账号为 connected，发布记录为 published |
| 8 | `/tasks` | 内容刷新任务可展示来源监测、复测计划和待处理状态 |
| 9 | `/reports` | 客户交付报告可打开，Markdown metadata、数据缺口和下一步动作完整 |
| 10 | `/advisor` | 顾问服务记录、相关报告和待跟进事项可展示 |

## 核心流程验收

| 流程 | 操作 | 通过标准 |
| --- | --- | --- |
| 路由访问 | 逐一访问关键页面和品牌化路由别名 | 页面加载状态稳定，无空白页，无路由错误 |
| 品牌工作区 | 查看 Demo Brand、知识库完整度和运营闭环入口 | 品牌资料、知识库和入口数据完整 |
| 监测复盘 | 查看 completed 监测运行和解析结果 | AI 回答、品牌排名、引用来源、评价问题和指标快照可解释 |
| 内容生产 | 查看 gap 策略、生成任务和版本 | 生成步骤为 completed，版本正文和 Markdown 导出可读 |
| 发布记录 | 查看 Website CMS 账号和发布记录 | 授权状态、发布状态、发布链接和异常字段展示正确 |
| 任务复测 | 查看内容刷新任务 | 任务来源、处理说明、复测计划和内容链接完整 |
| 报告交付 | 打开客户交付报告 | YAML metadata、Executive Summary、Delivery Progress、Key Findings、Next Actions 和 data gaps 完整 |
| 顾问服务 | 查看服务计划和交付复盘 | 结构化服务详情、报告引用和待跟进事项完整 |
| 异常状态 | 触发接口失败或空数据场景 | 页面展示错误提示、空状态主操作或重试指引 |

## 已知限制

- 默认开发模式使用内存仓储，并内置 `brand_demo` 最小演示闭环；需要验证完整 Prisma seed 数据时，API 应使用 `GEO_REPOSITORY_DRIVER=prisma` 和有效 `DATABASE_URL`。
- 阶跃星辰为内测默认 API 平台；未注入 `STEPFUN_API_KEY` 时演示只展示配置状态和手动录入路径，`mock_ai` 仅用于示例回答与开发辅助。
- 当前队列为内存实现，试点演示重点验证状态流转和交互闭环。
- 当前报告导出以 Markdown 内容展示为主，文件下载能力可作为后续候选需求进入反馈池。
- 当前样本量为演示样本，报告中保留数据缺口用于说明真实试点的数据采集边界。

## 反馈转需求记录格式

试点演示反馈统一按以下格式记录。已确认进入产品迭代的反馈，后续在 `当前工作区/.monkeycode/specs/` 下建立或更新对应需求、设计和任务清单。

```markdown
### [反馈标题]

- Date: YYYY-MM-DD
- Source: 试点客户 / 内部运营 / 顾问复盘
- Reporter: 反馈人或角色
- Brand: brand_demo 或客户品牌 ID
- Module: 品牌工作区 / 监测 / 内容 / 发布 / 任务 / 报告 / 顾问 / 权限 / 性能
- Feedback Type: bug / usability / feature / data / report / operation
- Priority: P0 / P1 / P2 / P3
- Current Observation: 当前看到的问题或机会
- Expected Outcome: 客户或运营期望结果
- Evidence: 页面、报告、接口、截图或会议记录引用
- Decision: 候选需求 / 跟进任务 / 暂缓 / 已解决
- Owner: 负责人
- Acceptance Criteria:
  - WHEN [触发条件], the system SHALL [可验证结果].
- Follow-up Spec: 当前工作区/.monkeycode/specs/[feature-name]/requirements.md
```

## 演示前门禁

在试点演示前执行以下检查：

```bash
# 进入 GEO 平台工程

# 构建验证
npm run build

# 类型检查
npm run typecheck --workspaces

# API 测试
npm run test --workspace @geo-platform/api

# Web 测试
npm run test --workspace @geo-platform/web

# 检查空白字符和补丁格式
git diff --check

# API 健康检查
node -e 'fetch("http://localhost:3001/api/v1/health").then(async r => { console.log(r.status, await r.text()) })'

# 前端入口检查
node -e 'fetch("http://localhost:5173").then(r => console.log(r.status))'
```

验收记录：

| 检查项 | 状态 | 记录 |
| --- | --- | --- |
| `npm run build` | 通过 | API、Web 和 shared-types workspace 构建通过 |
| `npm run typecheck --workspaces` | 通过 | API、Web 和 shared-types 类型检查通过 |
| `npm run test --workspace @geo-platform/api` | 通过 | API 64 个测试文件、289 个用例通过 |
| `npm run test --workspace @geo-platform/web` | 通过 | Web 20 个测试文件、99 个用例通过 |
| API 健康检查 | 通过 | `http://localhost:3001/api/v1/health` 可访问；`STEPFUN_API_KEY` 存在或 `GEO_AI_PLATFORM_CONFIGURED=true` 时 AI 平台状态为 configured |
| 前端入口检查 | 通过 | `http://localhost:5173` 返回 Vite HTML 入口 |
| 5173 预览链接 | 通过 | `https://5173-af4ce582db267302.monkeycode-ai.online` |
