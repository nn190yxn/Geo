# GEO 平台持续开发阶段规划需求文档

## Introduction

第一阶段已完成多品牌 GEO 管理平台可运行 MVP。后续开发需要延续第一阶段的规格化模式，在开始具体编码前，先明确第二阶段、第三阶段以及后续持续开发阶段的目标、任务、验收门禁和风险控制。本文档用于约束后续所有阶段的开发节奏，避免在没有总体计划的情况下直接进入局部实现。

## Requirements

### Requirement R1: 阶段化开发总控

**User Story:** AS 项目负责人, I want 后续开发按阶段拆解, so that 每个阶段都有明确目标、范围和验收标准。

#### Acceptance Criteria

1. WHEN 第一阶段完成后, the system SHALL 形成覆盖第二阶段、第三阶段和后续阶段的开发总计划。
2. WHEN 每个阶段开始前, the system SHALL 明确该阶段的目标、任务清单、检查点和交付门禁。
3. IF 某阶段依赖前一阶段能力, the system SHALL 在计划中标明依赖关系和进入条件。
4. WHEN 阶段任务完成, the system SHALL 通过统一验证命令和阶段专项测试确认交付质量。

### Requirement R2: 第二阶段数据持久化

**User Story:** AS 后端维护者, I want 将第一版内存仓储迁移为 Prisma + PostgreSQL, so that 平台数据可以长期保存并支持真实运营。

#### Acceptance Criteria

1. WHEN 第二阶段执行, the system SHALL 先完成 repository port、Prisma repository 和数据迁移策略。
2. WHEN 迁移业务数据, the system SHALL 保持现有 API 契约和前端行为稳定。
3. IF 数据库未就绪, the system SHALL 保留类型检查、构建和纯单元测试能力。
4. WHEN 第二阶段完成, the system SHALL 用数据库 repository 通过核心运营闭环测试。

### Requirement R3: 第三阶段真实集成与异步任务

**User Story:** AS GEO 运营人员, I want 系统接入真实 AI 平台、任务队列和内容生成链路, so that 监测、分析和内容生成可以从演示能力升级为可运营能力。

#### Acceptance Criteria

1. WHEN 第三阶段执行, the system SHALL 接入真实 AI 平台 Adapter 和统一调用审计。
2. WHEN 监测或内容生成需要异步执行, the system SHALL 使用任务队列记录状态、重试和失败原因。
3. IF 外部平台调用失败, the system SHALL 保存失败上下文并支持人工补录或重试。
4. WHEN 第三阶段完成, the system SHALL 支持至少一个真实 AI 平台的端到端监测链路。

### Requirement R4: 第四阶段权限、审计与生产化

**User Story:** AS 平台管理员, I want 系统具备真实用户、组织、角色、审计和生产部署能力, so that 平台可以进入受控使用环境。

#### Acceptance Criteria

1. WHEN 第四阶段执行, the system SHALL 建立真实用户、组织和角色权限体系。
2. WHEN 用户执行关键操作, the system SHALL 记录审计日志。
3. WHEN 平台部署到生产环境, the system SHALL 提供环境变量、数据库迁移、健康检查和运行手册。
4. WHEN 第四阶段完成, the system SHALL 具备生产试运行所需的安全和运维基础。

### Requirement R5: 第五阶段产品体验、性能和商业化能力

**User Story:** AS 产品负责人, I want 完善产品体验、性能和商业化能力, so that 平台从可用工具升级为可交付产品。

#### Acceptance Criteria

1. WHEN 第五阶段执行, the system SHALL 完成关键页面的产品走查、空状态、异常状态和移动端兼容优化。
2. WHEN 前端 bundle 过大, the system SHALL 做路由级拆包和性能优化。
3. WHEN 需要客户交付, the system SHALL 完善报告模板、导出格式和服务化交付流程。
4. WHEN 第五阶段完成, the system SHALL 满足试点客户演示、持续运营和交付复盘要求。
