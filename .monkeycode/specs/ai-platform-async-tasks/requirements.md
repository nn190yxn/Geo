# 第三阶段真实 AI 平台集成与异步任务需求文档

## Introduction

第二阶段已完成 Prisma repository、数据持久化入口和验证门禁。第三阶段将第一版 Mock/Manual 能力升级为真实 AI 平台调用、异步任务执行、失败重试、人工兜底和内容生成任务链路，同时保持现有品牌隔离、平台凭据脱敏、API 响应结构和前端操作路径稳定。

## Glossary

- **AI Platform Adapter**: 封装单个 AI 平台调用、配置校验和响应归一化的后端组件。
- **Monitoring Job**: 基于品牌 Prompt 和平台配置创建的异步监测任务。
- **Content Generation Job**: 基于内容策略、品牌知识库和 Prompt 结果创建的异步内容生成任务。
- **Job Queue**: 记录任务状态、重试次数、失败原因和 worker 执行上下文的队列能力。
- **Manual Fallback**: 外部平台调用失败或配置缺失时，由运营人员录入回答或继续人工处理的兜底路径。
- **Call Audit**: 记录外部平台调用请求摘要、响应摘要、状态、耗时、失败原因和成本估算的数据。

## Requirements

### Requirement A1: 真实 AI 平台 Adapter

**User Story:** AS GEO 运营人员, I want 使用真实 AI 平台执行品牌 Prompt, so that 监测结果可以反映真实平台回答。

#### Acceptance Criteria

1. WHEN 品牌平台配置启用真实调用模式, the system SHALL select the matching AI Platform Adapter by platform code and mode.
2. WHEN AI Platform Adapter receives a Prompt run request, the system SHALL pass brand Prompt text, platform code, model name and request metadata to the adapter.
3. WHEN AI Platform Adapter returns a response, the system SHALL normalize raw text, model name, responded time and citation hints into the existing `RunPromptResult` contract.
4. IF no matching AI Platform Adapter is registered, the system SHALL return a typed configuration error and keep the monitoring run available for manual fallback.
5. WHEN platform configuration is validated, the system SHALL store validation status, checked time and message without exposing raw credentials.

### Requirement A2: 异步监测任务队列

**User Story:** AS GEO 运营人员, I want 监测任务异步执行并记录状态, so that 批量监测可以稳定运行并支持失败追踪。

#### Acceptance Criteria

1. WHEN a user creates a monitoring run, the system SHALL persist a monitoring job with queued status and related brand, prompt and platform identifiers.
2. WHILE a monitoring job is running, the system SHALL expose current status, retry count, started time and latest failure reason through existing monitoring run APIs.
3. WHEN a monitoring job succeeds, the system SHALL persist AI response data, update monitoring run status and make analysis parsing available.
4. IF an adapter call fails, the system SHALL store failure context, increment retry count according to configured policy and keep manual fallback available.
5. WHEN retry attempts are exhausted, the system SHALL mark the monitoring run as failed with actionable failure details.

### Requirement A3: 内容生成异步任务链路

**User Story:** AS 内容运营人员, I want 内容生成任务按步骤异步执行, so that 选题、草稿、版本和发布入口可以形成可追踪链路。

#### Acceptance Criteria

1. WHEN a user creates a content generation task, the system SHALL persist a content generation job with queued status and source strategy identifiers.
2. WHILE a content generation job is running, the system SHALL record step status for context loading, outline generation, draft generation and rule checking.
3. WHEN draft generation succeeds, the system SHALL create or update a content version that can be exported and passed to the publishing entry API.
4. IF generation fails at a step, the system SHALL store step failure details and allow the user to retry the failed task.
5. WHEN a user saves an edited version, the system SHALL keep manual edits in the existing content version contract.

### Requirement A4: 调用审计与成本基础字段

**User Story:** AS 平台管理员, I want 记录外部 AI 调用审计和成本基础数据, so that 后续生产化可以追踪失败、成本和平台质量。

#### Acceptance Criteria

1. WHEN an external AI call starts, the system SHALL create a call audit record with brand, platform, model, call type and started time.
2. WHEN an external AI call finishes, the system SHALL update status, duration, token counts when available and cost estimate when available.
3. IF an external AI call fails, the system SHALL store normalized error code, message and retryable classification.
4. WHEN users query monitoring or content task details, the system SHALL expose audit summary fields without exposing credentials or raw provider secrets.
5. WHEN multiple brands use the same platform adapter, the system SHALL keep call audit records isolated by brandId.

### Requirement A5: 验证门禁与兼容性

**User Story:** AS 后端维护者, I want 第三阶段集成能力具备稳定测试门禁, so that 真实平台接入不会破坏第一版运营闭环。

#### Acceptance Criteria

1. WHEN third-stage code changes are completed, the system SHALL pass `npm run verify`.
2. WHEN adapter logic is implemented, the system SHALL include contract tests for success, provider error, configuration error and retryable failure scenarios.
3. WHEN queue worker logic is implemented, the system SHALL include tests for queued, running, succeeded, failed and retry-exhausted states.
4. IF external credentials are unavailable in the test environment, the system SHALL run tests through fake adapters and deterministic fixtures.
5. WHEN Web-facing workflows change, the system SHALL pass API health checks and frontend preview checks.
