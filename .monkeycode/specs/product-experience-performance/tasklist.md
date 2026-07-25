# Implementation Plan

- [x] 1. 完成关键页面体验走查整改
  - [x] 1.1 梳理关键页面 loading、empty、error 和反馈状态
    - 覆盖品牌工作区、监测、内容生成、发布、任务、报告和顾问工作台，覆盖 Requirement X1.1、X1.2、X1.3
    - 已新增共享页面状态组件，统一关键页面错误 Alert 和空状态主操作
  - [x] 1.2 补齐关键表单校验和操作反馈
    - 覆盖创建、编辑、导出、发布和复测动作，覆盖 Requirement X1.4
    - 已补齐品牌、监测、平台配置、内容生成、发布、任务、报告和顾问操作失败反馈；报告统计周期增加必填校验
  - [x]* 1.3 编写关键页面状态测试
    - 覆盖加载、空状态、错误状态和操作反馈，覆盖 Requirement X5.4
    - 已新增 `PageState` helper 测试，Web 测试增加至 13 个用例

- [x] 2. 实现前端路由级拆包和性能优化
  - [x] 2.1 将主要页面改为 lazy route modules
    - 覆盖品牌工作区、画布、监测、内容、发布、任务、报告和顾问页面，覆盖 Requirement X2.1、X2.4
    - 已将第一版主要页面注册为 React lazy route component，保留集中 route path 契约
  - [x] 2.2 增加稳定路由加载 fallback
    - 保持 AppLayout 内部加载状态稳定，覆盖 Requirement X2.2
    - 已在路由元素外层增加统一 `RouteLoadingFallback`，并补充 `.route-loading` 样式
  - [x] 2.3 验证构建 chunk 输出
    - 降低当前单 entry chunk 体积风险，覆盖 Requirement X2.3
    - 已通过前端构建验证，入口 JS 降至约 11 kB，最大常规 vendor chunk 约 236 kB，Vite 大 chunk 告警已消除
  - [x]* 2.4 编写路由拆包测试
    - 覆盖路由配置、品牌别名和 fallback，覆盖 Requirement X5.4
    - 已新增路由 lazy component 断言，Web 测试增加至 11 个用例

- [x] 3. 完善报告模板和导出格式
  - [x] 3.1 增强单品牌报告模板
    - 增加指标解释、问题归因和行动建议，覆盖 Requirement X3.1
    - 已新增共享报告渲染器，单品牌报告输出指标解释、问题归因、行动建议、任务进度和数据缺口
  - [x] 3.2 增强多品牌和客户交付报告模板
    - 增加对比、风险、交付进度和下一步动作，覆盖 Requirement X3.2、X3.3
    - 多品牌报告已补充品牌对比、风险提示、交付进度和下一步动作；客户交付报告使用客户交付版结构
  - [x] 3.3 增强 Markdown 导出 metadata
    - 保留报告结构和元信息，覆盖 Requirement X3.4
    - Markdown 内容已增加 YAML metadata，保留 reportType、brandId/brandCount、统计周期和数据缺口数量
  - [x]* 3.4 编写报告导出测试
    - 覆盖单品牌、多品牌、客户交付和 metadata，覆盖 Requirement X5.4
    - 已覆盖内存仓储和 Prisma 仓储报告内容，报告相关测试 15 个用例通过

- [x] 4. 完善服务化交付工作台
  - [x] 4.1 强化顾问诊断和服务计划展示
    - 记录问题、建议、里程碑、负责人和预期结果，覆盖 Requirement X4.1、X4.2
    - 已新增服务计划类型和结构化表单字段，支持问题、建议、服务目标、里程碑、负责人和预期结果沉淀
  - [x] 4.2 强化复盘和客户交付记录
    - 关联完成动作、数据变化、下一步和报告，覆盖 Requirement X4.3、X4.4
    - 已新增复盘和客户交付记录类型，支持完成动作、数据变化、下一步、关联报告和待跟进事项展示
  - [x]* 4.3 编写顾问工作台测试
    - 覆盖 follow-up、相关报告和服务记录展示，覆盖 Requirement X5.4
    - 已补充内存仓储、Prisma 仓储和前端顾问工作台 helper 测试

- [x] 5. 建立试点客户演示数据和验收清单
  - [x] 5.1 补充试点演示数据说明
    - 覆盖品牌、监测、内容、发布、任务、报告和顾问记录，覆盖 Requirement X5.1
    - 已扩展 Prisma demo seed，固定 ID 覆盖品牌知识库、平台配置、监测运行、AI 回答、解析结果、引用、评价问题、GEO 指标、内容生成、导出、发布、任务、客户交付报告和顾问服务记录
  - [x] 5.2 编写试点演示验收清单
    - 覆盖路由访问、核心流程、报告导出和已知限制，覆盖 Requirement X5.2
    - 已新增 `.monkeycode/docs/PILOT_DEMO_CHECKLIST.md`，覆盖演示数据、演示路径、核心流程验收、已知限制和演示前门禁
  - [x] 5.3 建立反馈转需求记录格式
    - 支持客户反馈进入候选需求或跟进任务，覆盖 Requirement X5.3
    - 已在试点演示清单中建立反馈转需求记录格式，包含来源、模块、优先级、证据、决策、验收标准和后续规格入口

- [x] 6. 第五阶段检查点 - 确保所有测试通过
  - [x] 6.1 运行完整验证门禁
    - 执行 `npm run verify`、`git diff --check`、API 健康检查和前端入口检查，覆盖 Requirement X5.4
    - 已通过 seed 语法检查、Prisma schema 校验、`git diff --check`、`npm run verify`、API 健康检查、前端入口检查和 5173 预览检查
  - [x] 6.2 同步项目文档和路线图
    - 更新架构、接口、开发指南、交付检查清单和总控任务清单，覆盖 Requirement X5.4
    - 已同步试点演示清单、开发指南、交付清单、架构文档、文档索引和总控路线图
