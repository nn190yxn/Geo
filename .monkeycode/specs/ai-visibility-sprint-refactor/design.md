# AI 可见性运营 Sprint 重构设计

## 目标架构

AI 可见性运营 Sprint 是现有自动化运营能力的业务化外壳。它不替换已有监测计划、监测运行、分析结果、增长计划、内容任务和发布记录，而是在这些对象上方建立一层 Sprint 视图和编排状态。

## 核心对象

### VisibilitySprint

Sprint 聚合一轮运营目标、阶段状态、关键指标和相关业务对象 ID。

关键字段：

- `sprintId`：Sprint ID。
- `brandId`：品牌隔离字段。
- `title`：面向用户的 Sprint 名称。
- `goal`：本轮运营目标。
- `status`：`draft`、`running`、`waiting_confirmation`、`completed`、`failed`、`stopped`。
- `currentStep`：当前阶段。
- `steps`：阶段摘要列表。
- `metricSummary`：关键指标摘要。
- `relatedQuestionIds`、`relatedTestPlanIds`、`relatedMonitoringRunIds`、`relatedStandardAnswerIds`、`relatedContentTaskIds`、`relatedPublishingRecordIds`、`relatedRetestTaskIds`：与现有业务对象的关联。

### VisibilitySprintStep

阶段枚举覆盖完整运营闭环：

- `question_radar`
- `ai_response_monitoring`
- `standard_answer_alignment`
- `gap_diagnosis`
- `content_asset_generation`
- `publishing_preparation`
- `retest_and_trend`
- `completed`

### VisibilitySprintMetricSummary

指标摘要只保存可展示聚合值，不保存原始回答、标准答案正文或平台密钥。

字段覆盖：

- `questionCoverageRate`
- `mentionRate`
- `recommendationRate`
- `firstRecommendationRate`
- `topThreeRate`
- `citationHitRate`
- `expressionAccuracyRate`
- `riskExpressionCount`
- `contentGapCount`
- `competitorSuppressionCount`
- `sampleSize`

## 数据边界

- 真实 AI 回复仍由 `AIResponse` 和 `MonitoringRun` 表达。
- 品牌标准答案由 `BrandStandardAnswer` 独立建模，用于对照分析和内容生成依据。
- 内容资产仍由 `ContentAsset`、`ContentGenerationTask`、`ContentVersion` 和 `PublishingRecord` 表达。
- Sprint 只保存聚合状态和关联 ID，避免把标准答案或内容草稿算作真实监测样本。

## 第一任务范围

任务 1.1 只新增共享类型，不新增 API、仓储、Prisma 模型或页面。后续任务将基于该契约继续扩展仓储、接口和前端工作台。

## 验证

第一任务完成后运行：

```bash
# 检查共享类型包
npm run typecheck --workspace @geo-platform/shared-types
```
