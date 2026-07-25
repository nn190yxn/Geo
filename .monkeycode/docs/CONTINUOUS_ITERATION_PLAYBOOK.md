# 持续迭代机制

## 目标

本机制用于第五阶段之后的持续运营和产品迭代。每次试点演示、阶段收口、客户复盘或行业规则变化后，团队按统一格式完成复盘、反馈回填、需求转化、规则维护和验证门禁。

## 适用场景

| 场景 | 触发条件 | 主要产物 |
| --- | --- | --- |
| 阶段复盘 | 某个阶段任务清单完成或检查点通过 | 阶段复盘记录、文档同步记录、后续任务入口 |
| 试点反馈 | 客户演示、客户周会、交付复盘产生反馈 | 反馈记录、候选需求、跟进任务 |
| 行业规则变化 | AI 平台、内容平台、GEO 指标口径或客户合规要求变化 | 规则变更记录、影响评估、验证任务 |
| 生产试运行 | 权限、审计、健康检查或部署流程发生变化 | 运行记录、风险项、回滚和排障更新 |

## 阶段复盘流程

每个阶段完成后按以下顺序处理：

1. 确认阶段任务清单全部完成，检查点任务有明确验证结果。
2. 运行该阶段门禁命令，基础门禁为 `npm run verify` 和 `git diff --check`。
3. 涉及 Web 功能时检查 API 健康接口、前端入口和预览链接。
4. 同步 `.monkeycode/specs/*/tasklist.md`、总控路线图和 `.monkeycode/docs/` 文档。
5. 将未完成问题拆成候选需求、跟进任务或已知限制。
6. 在下一阶段开始前建立或更新对应的 `requirements.md`、`design.md` 和 `tasklist.md`。

阶段复盘记录格式：

```markdown
### [阶段名称] 阶段复盘

- Date: YYYY-MM-DD
- Scope: 阶段范围
- Completed Tasks: 已完成任务编号和说明
- Verification:
  - `npm run verify`: pass / fail
  - `git diff --check`: pass / fail
  - API Health: pass / fail / not applicable
  - Web Preview: pass / fail / not applicable
- Documents Updated: 已同步文档列表
- Open Risks: 未关闭风险
- Follow-up Tasks: 进入后续阶段的任务
- Next Spec Entry: .monkeycode/specs/[feature-name]/requirements.md
```

## 客户反馈到需求池流程

客户反馈先进入反馈记录，再按优先级转为候选需求或顾问跟进任务。试点演示反馈模板位于 `.monkeycode/docs/PILOT_DEMO_CHECKLIST.md`。

反馈分流规则：

| 类型 | 判断口径 | 处理方式 |
| --- | --- | --- |
| bug | 已有承诺能力行为异常或数据错误 | 建立修复任务，补测试并进入最近迭代 |
| usability | 页面理解、操作路径或状态反馈影响演示和交付 | 纳入产品体验候选需求 |
| feature | 客户提出新增工作流、角色、报表或集成能力 | 建立需求规格，先明确验收标准 |
| data | 样本、指标、报告口径或数据来源存在缺口 | 建立数据治理或指标口径任务 |
| report | 报告模板、导出、客户交付材料需要调整 | 建立报告模板需求或顾问交付任务 |
| operation | 运营流程、权限、审计、部署或排障机制需要补充 | 更新运行手册或建立运维任务 |

需求池记录格式：

```markdown
### [候选需求标题]

- Date: YYYY-MM-DD
- Source Feedback: 反馈记录标题或会议记录
- Module: 品牌工作区 / 监测 / 内容 / 发布 / 任务 / 报告 / 顾问 / 权限 / 性能 / 运维
- Priority: P0 / P1 / P2 / P3
- User Story: AS [角色], I want [能力], so that [价值].
- Acceptance Criteria:
  - WHEN [触发条件], the system SHALL [可验证结果].
- Impacted Areas: 前端 / API / 数据库 / 共享类型 / 文档 / 部署
- Required Tests: 单元测试 / 仓储测试 / API 契约测试 / 页面状态测试 / 构建验证
- Decision: accepted / deferred / merged / closed
- Owner: 负责人
- Target Spec: .monkeycode/specs/[feature-name]/requirements.md
```

## 行业规则和平台变化维护

GEO 平台需要持续跟踪 AI 平台回答规则、内容平台发布要求、引用来源质量和指标口径变化。规则变更先做影响评估，再进入需求池或运行手册。

规则维护分类：

| 分类 | 关注内容 | 影响范围 |
| --- | --- | --- |
| AI 平台规则 | 模型接口、速率限制、返回结构、引用格式、失败码 | Adapter、调用审计、监测 worker、解析逻辑 |
| 内容平台规则 | 发布字段、账号授权、内容格式、审核约束 | 发布中心、内容导出、发布记录、顾问交付 |
| GEO 指标口径 | 提及、排名、情绪、准确、引用、竞品压制和样本充分性 | 指标计算、报告模板、客户解释口径 |
| 客户合规要求 | 凭据、审计、权限、数据保留和导出限制 | 权限策略、审计日志、部署运行手册 |

规则变更记录格式：

```markdown
### [规则变更标题]

- Date: YYYY-MM-DD
- Source: 官方文档 / 客户要求 / 运营观察 / 监测结果
- Category: AI 平台规则 / 内容平台规则 / GEO 指标口径 / 客户合规要求
- Change Summary: 变化摘要
- Impacted Modules: 受影响模块
- Risk Level: high / medium / low
- Required Action: 代码改动 / 配置调整 / 文档更新 / 运营提示 / 客户沟通
- Verification Plan: 需要执行的验证
- Follow-up Spec: .monkeycode/specs/[feature-name]/requirements.md
```

## 文档同步清单

每次持续迭代任务完成后，根据影响范围同步以下文档：

| 文档 | 更新条件 |
| --- | --- |
| `.monkeycode/docs/ARCHITECTURE.md` | 模块边界、数据模型、前后端结构、任务机制变化 |
| `.monkeycode/docs/INTERFACES.md` | API、共享类型、请求头、响应结构或错误码变化 |
| `.monkeycode/docs/DEVELOPER_GUIDE.md` | 命令、验证结果、开发入口、后续任务变化 |
| `.monkeycode/docs/DELIVERY_CHECKLIST.md` | 交付门禁、预览状态、健康检查、已知限制变化 |
| `.monkeycode/docs/DEPLOYMENT_RUNBOOK.md` | 环境变量、部署、回滚、排障流程变化 |
| `.monkeycode/docs/PILOT_DEMO_CHECKLIST.md` | 演示数据、演示路径、客户验收和反馈格式变化 |
| `.monkeycode/docs/CONTINUOUS_ITERATION_PLAYBOOK.md` | 迭代流程和反馈治理规则变化 |

## 验证门禁

基础门禁：

```bash
# 进入 GEO 平台工程
cd geo-platform

# 构建验证
npm run build

# 类型检查
npm run typecheck --workspaces

# API 测试
npm run test --workspace @geo-platform/api

# Web 测试
npm run test --workspace @geo-platform/web

# Prisma schema 校验
npm run prisma:validate

# Prisma Client 生成
npm run prisma:generate
```

补充门禁：

```bash
# 检查补丁空白问题
git diff --check

# API 健康检查
node -e 'fetch("http://localhost:3001/api/v1/health").then(async r => { console.log(r.status, await r.text()) })'

# 前端入口检查
node -e 'fetch("http://localhost:5173").then(r => console.log(r.status))'
```

门禁选择规则：

| 变更类型 | 必跑门禁 |
| --- | --- |
| 文档 | `git diff --check` |
| 前端 | `npm run build`、`npm run typecheck --workspaces`、`npm run test --workspace @geo-platform/web`、前端入口检查、预览检查 |
| API | `npm run typecheck --workspaces`、`npm run test --workspace @geo-platform/api`、API 健康检查 |
| 数据库 | `npm run prisma:validate`、`npm run prisma:generate`、相关 repository 测试 |
| AI 平台集成 | Adapter 契约测试、worker 状态机测试、调用审计测试 |
| 权限与审计 | 权限隔离测试、审计日志测试、健康检查 |

## 当前状态

截至第五阶段检查点，平台已完成可运行 MVP、数据持久化、真实 AI Adapter 基础、异步任务、权限审计、生产化基础、产品体验、性能优化、报告交付、顾问工作台和试点演示清单。下一轮迭代应从真实试点反馈、行业规则变化或生产试运行问题中选择主题，并先建立对应规格文档。
