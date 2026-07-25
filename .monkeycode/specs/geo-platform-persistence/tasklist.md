# 需求实施计划

- [x] 1. 建立 Prisma 数据访问基础设施
  - [x] 1.1 创建 `PrismaService` 和 `PrismaModule`
    - 在 API 应用中提供可注入 Prisma Client，覆盖 Requirement P1.1、P1.2
  - [x] 1.2 将 Prisma 校验和生成命令纳入根级验证脚本
    - 保持 `npm run verify` 覆盖 schema 校验和 client 生成，覆盖 Requirement P1.4
  - [x]* 1.3 编写 Prisma 基础设施单元测试
    - 验证 provider 可被 Nest 测试模块注入，覆盖 Requirement P1.1

- [x] 2. 抽取 repository 调用面并保持 service 稳定
  - [x] 2.1 定义 `PermissionsRepositoryPort` 接口
    - 从现有 `PermissionsService` 使用的方法提取类型，覆盖 Requirement P5.1
  - [x] 2.2 让现有内存仓储实现 repository port
    - 保持第一版 API 行为稳定，覆盖 Requirement P5.2
  - [x]* 2.3 编写 repository port 编译期契约测试
    - 验证 service 只依赖 port 方法，覆盖 Requirement P5.1

- [x] 3. 迁移品牌与权限数据到 Prisma repository
  - [x] 3.1 实现用户、品牌和品牌权限读取
    - 支持可访问品牌列表、品牌详情和当前用户查询，覆盖 Requirement P2.1、P2.4
  - [x] 3.2 实现品牌创建、编辑和状态更新
    - 写入 `Brand` 并保持共享类型响应，覆盖 Requirement P2.2、P2.4
  - [x] 3.3 实现品牌访问校验和拒绝访问日志写入
    - 保持未授权访问行为，覆盖 Requirement P2.3
  - [x]* 3.4 编写品牌隔离属性测试
    - Property P2: 任意品牌查询只返回授权品牌数据，覆盖 Requirement P2.1、P5.3

- [x] 4. 检查点 - 确保所有测试通过
  - `npm run verify`、`git diff --check` 和预览健康检查已通过

- [x] 5. 迁移品牌知识库、素材来源和优化对象
  - [x] 5.1 实现品牌档案保存与完整度计算持久化
    - 写入 `BrandProfile` 并保持 FAQ、表达口径和缺失字段，覆盖 Requirement P3.1
  - [x] 5.2 实现知识来源、优化单元和用户意图持久化
    - 写入 `KnowledgeSource`、`OptimizationUnit`、`UserIntent`，覆盖 Requirement P3.2、P3.3
  - [x] 5.3 实现 Prompt 模板、品牌 Prompt 和批量生成持久化
    - 写入 `PromptTemplate`、`BrandPrompt` 并保持现有批量生成行为，覆盖 Requirement P3.2
  - [x] 5.4 实现数据库版品牌工作区快照计数
    - 基于数据库聚合 profile、优化单元、意图、Prompt 等计数，覆盖 Requirement P3.4
  - [x]* 5.5 编写工作区计数属性测试
    - Property P3: 创建链路后快照计数反映已创建对象，覆盖 Requirement P3.4

- [x] 6. 迁移平台配置与监测分析数据
  - [x] 6.1 实现平台配置持久化和凭据脱敏响应
    - 写入 `PlatformConfig`，公开响应隐藏 `credentialRef`，覆盖 Requirement P4.1、P5.3 和 Property P1
  - [x] 6.2 实现监测运行、人工回答和解析结果持久化
    - 写入 `MonitoringRun`、`AIResponse`、`AnalysisResult`，覆盖 Requirement P4.1
  - [x] 6.3 实现 GEO 指标快照和多品牌排行数据库查询
    - 写入和读取 `GEOMetricSnapshot`，覆盖第一阶段 Requirement 6
  - [x]* 6.4 编写凭据脱敏契约测试
    - Property P1: 公开平台配置响应不得包含真实 `credentialRef`，覆盖 Requirement P5.3

- [x] 7. 检查点 - 确保所有测试通过
  - `npm run verify`、`git diff --check` 和预览健康检查已通过

- [x] 8. 迁移内容、发布、任务、报告和顾问服务数据
  - [x] 8.1 实现内容资产、内容策略、生成任务、版本和导出记录持久化
    - 写入内容相关 Prisma 模型，覆盖 Requirement P4.2
  - [x] 8.2 实现发布账号和发布记录持久化
    - 写入 `PublishingAccount`、`PublishingRecord`，覆盖 Requirement P4.2
  - [x] 8.3 实现优化任务、复测记录和问题重开持久化
    - 写入 `OptimizationTask` 和复测记录 JSON，覆盖 Requirement P4.3
  - [x] 8.4 实现报告和顾问记录持久化
    - 写入 `Report`、`AdvisorRecord` 并保持关联报告引用，覆盖 Requirement P4.3
  - [x]* 8.5 编写运营闭环 repository 一致性测试
    - 用现有闭环场景验证数据库 repository 结果，覆盖 Requirement P4.4

- [x] 9. 切换生产 repository 注入并保留验证门禁
  - [x] 9.1 在 Nest 模块中接入 Prisma repository provider
    - 支持通过 provider 配置选择 repository 实现，覆盖 Requirement P5.2
  - [x] 9.2 更新测试夹具和 seed 数据入口
    - 保持无需真实生产数据即可运行 repository 测试，覆盖 Requirement P5.3、P5.4
  - [x] 9.3 更新交付文档中的第二阶段验证方式
    - 记录 `npm run verify`、数据库准备和迁移说明，覆盖 Requirement P1.4、P5.4

- [x] 10. 检查点 - 确保所有测试通过
  - `npm run verify`、`git diff --check`、API 健康检查和前端入口检查已通过
