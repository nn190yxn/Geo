# Requirements Document

## Introduction

第五阶段将多品牌 GEO 管理平台从可运行工具推进到可演示、可交付、可复盘的产品化版本。该阶段重点覆盖关键页面体验状态、前端性能、报告模板、服务化交付工作台和试点客户验收清单。

## Glossary

- **Key Page**: 品牌工作区、GEO 画布、AI 监测、内容生成、发布中心、任务复测、报告中心和顾问服务等核心运营页面。
- **Route-Level Code Splitting**: 按前端路由延迟加载页面模块，降低首屏 bundle 体积。
- **Delivery Report**: 面向内部运营或客户交付的单品牌、多品牌、周报、月报和客户交付报告。
- **Service Workspace**: 顾问诊断、服务计划、复盘记录和客户交付材料沉淀的工作台。
- **Pilot Demo Checklist**: 面向试点客户演示和验收的流程、数据、页面、报告和异常状态检查清单。

## Requirements

### Requirement X1: 关键页面体验状态

**User Story:** AS 产品负责人, I want 关键页面具备清晰的加载、空状态、错误状态、表单校验和操作反馈, so that 试点演示时用户可以理解当前状态并完成核心流程。

#### Acceptance Criteria

1. WHEN 关键页面请求数据, the system SHALL display a loading state that does not shift primary layout.
2. WHEN 关键页面没有业务数据, the system SHALL display an empty state with one primary next action.
3. IF 关键页面请求失败, the system SHALL display an error state with retry guidance.
4. WHEN 用户提交关键表单, the system SHALL validate required fields and display operation feedback.

### Requirement X2: 前端路由级拆包和性能优化

**User Story:** AS 技术负责人, I want 前端按路由拆分页面模块, so that 首屏加载 bundle 风险降低并支撑后续页面增长。

#### Acceptance Criteria

1. WHEN Web application builds, the system SHALL split major route pages into separate async chunks.
2. WHEN a route module is loading, the system SHALL show a stable fallback state inside the app layout.
3. WHEN build completes, the system SHALL reduce the single entry chunk risk reported by Vite.
4. WHEN route splitting is implemented, the system SHALL keep existing routes and brand workspace aliases available.

### Requirement X3: 报告模板和导出格式

**User Story:** AS 运营负责人, I want 报告模板包含更清晰的指标解释、问题归因、行动建议和交付摘要, so that 客户能根据报告理解成果和下一步动作。

#### Acceptance Criteria

1. WHEN 创建单品牌报告, the system SHALL include GEO 指数、竞品、引用、评价、内容缺口和行动建议章节。
2. WHEN 创建多品牌报告, the system SHALL include ranking comparison, risk highlights and cross-brand recommendations.
3. WHEN 创建客户交付报告, the system SHALL include executive summary, delivery progress, key findings and next actions.
4. WHEN 导出报告, the system SHALL preserve Markdown structure and include report metadata.

### Requirement X4: 服务化交付工作台

**User Story:** AS 顾问负责人, I want 顾问服务工作台沉淀诊断、服务计划、复盘和交付记录, so that 客户服务过程可以持续追踪。

#### Acceptance Criteria

1. WHEN 创建顾问诊断, the system SHALL connect diagnosis to brand, issues, recommendations and follow-up items.
2. WHEN 创建服务计划, the system SHALL record service objective, milestones, owner and expected outcome.
3. WHEN 创建复盘记录, the system SHALL connect completed actions, data change and next step.
4. WHEN 查看顾问工作台, the system SHALL show pending follow-ups and related reports.

### Requirement X5: 试点客户演示和验收清单

**User Story:** AS 交付负责人, I want 稳定的演示数据和验收清单, so that 试点客户演示可以按固定流程完成并记录反馈。

#### Acceptance Criteria

1. WHEN 演示环境初始化, the system SHALL provide representative demo data for brand, monitoring, content, publishing, tasks, reports and advisor records.
2. WHEN 试点演示执行, the system SHALL provide a checklist covering route access, core workflow, report export and known limitations.
3. WHEN 客户反馈产生, the system SHALL record feedback as candidate requirements or follow-up tasks.
4. WHEN 第五阶段完成, the system SHALL pass route smoke tests, state tests and report export tests.
