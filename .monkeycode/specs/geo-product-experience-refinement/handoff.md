# GEO Product Experience Refinement Handoff

Updated: 2026-07-14

## Current Goal

把当前 GEO 平台从已完成的 Sprint 闭环进一步打磨成完整产品体验。用户已经提供 30 张参考截图，并明确要求把品牌资料库、GEO 画布、内容生成、用词体系、竞品分析、评价分析、信源分析、事实分析、自有媒体和 AI 平台管理全部纳入重构范围。

当前阶段只产出需求和设计交接，不进入代码开发。

## What Has Been Read

- 参考截图压缩包：`/workspace/GEO参考.zip`
- 解压目录：`/tmp/opencode/geo-reference-20260714`
- 已全量读取 30 张截图，文件名从 `ScreenShot_2026-07-14_092237_142.png` 到 `ScreenShot_2026-07-14_092817_217.png`
- 项目记忆：`/workspace/.monkeycode/MEMORY.md`
- 项目文档索引：`/workspace/.monkeycode/docs/INDEX.md`
- 架构文档：`/workspace/.monkeycode/docs/ARCHITECTURE.md`
- Sprint 规格：`/workspace/.monkeycode/specs/ai-visibility-sprint-refactor/requirements.md`
- 小白友好流程规格：`/workspace/.monkeycode/specs/beginner-friendly-geo-workflow/requirements.md`

## Deliverables Created

- 需求文档：`/workspace/.monkeycode/specs/geo-product-experience-refinement/requirements.md`
- 技术设计：`/workspace/.monkeycode/specs/geo-product-experience-refinement/design.md`
- 交接文档：`/workspace/.monkeycode/specs/geo-product-experience-refinement/handoff.md`

## Reference Product Conclusions

参考产品提供的关键价值是产品结构和运营节奏：

1. 功能入口是模块矩阵，覆盖资料、画布、意图、内容、媒体和分析。
2. GEO 画布是理解优化关系的主视图，适合承载优化单元、用户意图、平台表现和内容任务。
3. 品牌资料库需要更细颗粒度，当前品牌知识表单需要扩展为资料中心。
4. 内容生成需要从表单页升级为创作台，显示输入上下文、引用依据、草稿和审稿提示。
5. 分析页面应统一结构，分别承载竞品、评价、信源和事实诊断。
6. 用词体系必须面向运营人员，隐藏工程 code、mock、demo、内部 ID 和伪链接。

## Recommended Development Order

1. 调整导航与品牌工作台模块矩阵。
2. 扩展品牌资料库，先实现基础信息、产品服务、目标用户和品牌知识分组。
3. 改造 GEO 画布为左侧列表、中间关系图、右侧详情。
4. 重构 AI 回复监测创建流程和待补充真实回复队列。
5. 改造内容生成页为创作台，并加入内容优化入口。
6. 增加自有媒体和媒体平台的基础管理。
7. 用统一分析容器落地竞品、评价、信源和事实分析。
8. 做全局用词和平台显示名扫描。

## Likely Code Entry Points

- 导航：`apps/web/src/layouts/navigation.ts`
- 品牌工作台：`apps/web/src/features/brand-workspace/pages/BrandWorkspacePage.tsx`
- 品牌知识：`apps/web/src/features/brand-workspace/components/BrandKnowledgeCard.tsx`
- 优化单元：`apps/web/src/features/brand-workspace/components/OptimizationUnitsCard.tsx`
- GEO 画布：`apps/web/src/features/canvas/pages/GeoCanvasPage.tsx`
- AI 回复监测：`apps/web/src/features/monitoring/pages/MonitoringPage.tsx`
- 内容生成：`apps/web/src/features/content-generation/pages/ContentGenerationPage.tsx`
- 优化计划：`apps/web/src/features/growth-optimization/pages/GrowthOptimizationPage.tsx`
- 任务复测：`apps/web/src/features/tasks/pages/TaskRetestPage.tsx`
- 模型设置：`apps/web/src/features/model-settings/pages/ModelSettingsPage.tsx`
- 平台显示名：`apps/web/src/utils/displayLabels.ts`

## Product Boundaries To Preserve

- 真实 AI 回复、品牌标准答案和内容资产保持分离。
- 指标计算只使用真实 AI 回复、浏览器辅助结果或手动录入真实回复。
- 缺少真实回复时进入待补充队列。
- API Key、平台密钥、cookies、storage state 和 browser profile 路径只留在服务端安全边界内。
- 公开 UI 显示豆包、Kimi、DeepSeek、通义千问、阶跃星辰等业务名称。
- 当前内测优先使用阶跃星辰 `step-3.7-flash`，配置通过 `STEPFUN_API_KEY` 环境变量承接。

## Validation Guidance

进入代码开发后，至少执行：

```bash
# Run repository verification
npm run verify

# Check formatting-sensitive whitespace
git diff --check
```

涉及前端体验重构时，还应启动预览并人工检查桌面和移动端布局。当前预览服务曾可用：`https://5173-af4ce582db267302.monkeycode-ai.online`。

## Open Questions For User

1. “媒体平台”和“自有媒体”首版是否拆成两个入口，默认建议拆分并在发布准备流程汇合。
2. “GEO 画布”首版是否采用节点图，默认建议采用左侧列表、中间关系图、右侧详情。
3. 竞品、评价、信源、事实分析首版是否都进入导航，默认建议独立入口并复用统一分析容器。

## Suggested New Conversation Prompt

请继续开发 `geo-product-experience-refinement` 规格。先读取：

- `/workspace/.monkeycode/specs/geo-product-experience-refinement/requirements.md`
- `/workspace/.monkeycode/specs/geo-product-experience-refinement/design.md`
- `/workspace/.monkeycode/specs/geo-product-experience-refinement/handoff.md`

然后按交接文档的推荐顺序实施，先做导航与品牌工作台模块矩阵，再做品牌资料库和 GEO 画布。保持真实 AI 回复、标准答案、内容资产三者分离，保留密钥脱敏边界，完成后运行 `npm run verify` 和 `git diff --check`。
