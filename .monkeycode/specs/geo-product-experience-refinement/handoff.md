# GEO Product Experience Refinement Handoff

Updated: 2026-08-02

## Current Goal

第一阶段产品体验精修已完成。第二阶段结合 GeoLook、GEORank 和当前 Geo 源码审计，从方便使用和实际效果两个方向升级：缩短首次成功路径，并让监测、优化、发布、再次监测和报告形成可信证据链。

当前阶段只更新需求、技术设计和实施任务清单供评审，方案确认后再进入代码开发。

## Confirmed Decisions

1. 沿用 `geo-product-experience-refinement` 规格记录第二阶段升级。
2. 首期同时改善易用性和效果可信度。
3. 本轮停在方案评审阶段。

## Phase 2 P0 Findings

1. 品牌嵌套路由会先匹配品牌主体写权限，operator 的监测、内容、发布和再次监测操作存在 403 风险。
2. 再次监测当前默认复用原监测运行，并允许人工输入结果分数完成任务，效果结论缺少新回答证据。
3. 报告保存了统计周期，快照构建仍聚合当前全量数据，周期结论与实际记录范围可能不一致。

## Phase 2 Recommended Order

1. 修复资源权限矩阵。
2. 强制再次监测创建新运行并由真实分析完成验收。
3. 按统计周期构建报告快照。
4. 升级品牌项目主页和快速接入流程。
5. 增加效果证据聚合、站点审计和技术资产。
6. 增加样本回放、测量纪律、八维问题拓展和真实信源地图。
7. 增加内容质量检查、资料检索增强和周期客户交付包。
8. 增加 Provider、BYOK、额度、持久任务和运行中心。
9. 增加产品效果事件和运营看板。
10. 增加探测题隔离、未测权重归一、跨访问端序列和连续趋势门禁。
11. 增加竞品确认、搜索需求快照、渠道路线图和引用吸收深度。
12. 增加版本化诊断、回归验收、Provider 成本租约和额度调整审计。
13. 增加来源页面计划、差异化运营周期、三类正式交付文档和公开品牌档案。

## What Has Been Read

- 参考截图压缩包：`/workspace/GEO参考.zip`
- 解压目录：`/tmp/opencode/geo-reference-20260714`
- 已全量读取 30 张截图，文件名从 `ScreenShot_2026-07-14_092237_142.png` 到 `ScreenShot_2026-07-14_092817_217.png`
- 项目记忆：`当前工作区/.monkeycode/MEMORY.md`
- 项目文档索引：`当前工作区/.monkeycode/docs/INDEX.md`
- 架构文档：`当前工作区/.monkeycode/docs/ARCHITECTURE.md`
- Sprint 规格：`当前工作区/.monkeycode/specs/ai-visibility-sprint-refactor/requirements.md`
- 小白友好流程规格：`当前工作区/.monkeycode/specs/beginner-friendly-geo-workflow/requirements.md`
- GeoLook 只读审计仓库：`/tmp/opencode/geolook`
- GEORank 只读审计仓库：`/tmp/opencode/GEORank`

## Deliverables Created

- 需求文档：`当前工作区/.monkeycode/specs/geo-product-experience-refinement/requirements.md`
- 技术设计：`当前工作区/.monkeycode/specs/geo-product-experience-refinement/design.md`
- 实施任务：`当前工作区/.monkeycode/specs/geo-product-experience-refinement/tasklist.md`
- 交接文档：`当前工作区/.monkeycode/specs/geo-product-experience-refinement/handoff.md`

## Reference Product Conclusions

参考产品提供的关键价值是产品结构和运营节奏：

1. 功能入口是模块矩阵，覆盖资料、画布、意图、内容、媒体和分析。
2. GEO 画布是理解优化关系的主视图，适合承载优化单元、用户意图、平台表现和内容任务。
3. 品牌资料库需要更细颗粒度，当前品牌知识表单需要扩展为资料中心。
4. 内容生成需要从表单页升级为创作台，显示输入上下文、引用依据、草稿和审稿提示。
5. 分析页面应统一结构，分别承载竞品、评价、信源和事实诊断。
6. 用词体系必须面向运营人员，隐藏工程 code、mock、demo、内部 ID 和伪链接。

## Deep Adoption Conclusions

1. GeoLook 的测量精华包括品牌探测题隔离、市场与访问端分组、未测权重归一、样本比较门禁和连续两期同向趋势规则。
2. GeoLook 的策略精华包括真实回答确认竞品、失守与独占问题池、搜索补全快照、真实信源渠道覆盖和 30/60/90 天路线图。
3. GeoLook 的执行精华包括引用吸收深度、内容类型专属门禁、每次发布确认、checker 历史证据、回归重开和三类正式交付文档。
4. GEORank 的采集精华包括来源页面计划、页面角色、选取原因和深度抓取前人工范围确认。
5. GEORank 的平台精华包括 Provider 主动测试、稳定额度拒绝原因、额度调整审计、成本步骤租约和原子重试补偿。
6. GEORank 的检索精华包括高级召回失败后的全文与结构化补齐，以及 BYOK Embedding 费用归属边界。
7. GEORank 的增长精华包括带短期预览、`noindex`、canonical、结构化数据和撤回控制的公开品牌档案。

## Phase 1 Completed Scope

1. 调整导航与品牌工作台模块矩阵。
2. 扩展品牌资料库，先实现基础信息、产品服务、目标用户和品牌知识分组。
3. 改造 GEO 画布为左侧列表、中间关系图、右侧详情。
4. 重构 AI 回复监测创建流程和待补充真实回复队列。
5. 改造内容生成页为创作台，并加入内容优化入口。
6. 增加自有媒体和媒体平台的基础管理。
7. 用统一分析容器落地竞品、评价、信源和事实分析。
8. 做全局用词和平台显示名扫描。

## Phase 2 Code Entry Points

- 权限策略：`当前工作区/apps/api/src/common/access-control/brand-access.policy.ts`
- 权限中间件：`当前工作区/apps/api/src/common/middleware/brand-access.middleware.ts`
- 内存仓储复测与报告：`当前工作区/apps/api/src/modules/permissions/permissions.repository.ts`
- Prisma 仓储复测与报告：`当前工作区/apps/api/src/modules/permissions/prisma-permissions.repository.ts`
- 数据模型：`当前工作区/apps/api/prisma/schema.prisma`
- 品牌项目主页：`当前工作区/apps/web/src/features/brand-workspace/pages/BrandWorkspacePage.tsx`
- 再次监测：`当前工作区/apps/web/src/features/tasks/pages/TaskRetestPage.tsx`
- 报告中心：`当前工作区/apps/web/src/features/reports/pages/ReportCenterPage.tsx`
- AI 回复监测：`当前工作区/apps/web/src/features/monitoring/pages/MonitoringPage.tsx`

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

## Review Focus

1. P0 是否按权限、再次监测、报告周期、项目主页的顺序实施。
2. 快速接入的首轮默认问题数是否固定为 6 个。
3. 站点审计首期是否覆盖 robots.txt、sitemap.xml、llms.txt、noindex、AI Bot、JSON-LD 和内容抽取结构。
4. Qdrant、Neo4j 和 MinIO 是否按数据规模触发引入，默认建议采用渐进式基础设施策略。
5. 四个可发布阶段是否采用“可信度修复、快速闭环、执行交付、规模化运营”的节奏。
6. 第二阶段测试是否全部作为必做任务执行。
7. 品牌探测题是否从无提示可见性指标中隔离，并按访问端生成独立序列。
8. 趋势是否固定要求三个连续可比快照中的两次同向变化。
9. Provider 成本步骤是否采用租约、追加成本和原子重试补偿。
10. 公开品牌档案是否作为商业增长阶段能力进入 P2。

## Suggested New Conversation Prompt

请在独立 Geo 仓库继续开发 `geo-product-experience-refinement` 第二阶段。先读取：

- `当前工作区/.monkeycode/specs/geo-product-experience-refinement/requirements.md`
- `当前工作区/.monkeycode/specs/geo-product-experience-refinement/design.md`
- `当前工作区/.monkeycode/specs/geo-product-experience-refinement/tasklist.md`
- `当前工作区/.monkeycode/specs/geo-product-experience-refinement/handoff.md`

方案评审确认后按权限矩阵、真实再次监测、周期报告和行动型项目主页的顺序实施。保持真实 AI 回复、标准答案、内容资产三者分离，保留密钥脱敏边界，完成后运行 `npm run verify` 和 `git diff --check`。
