# GEO 平台数据持久化需求文档

## Introduction

第二阶段聚焦将第一版多品牌 GEO 管理平台的内存仓储替换为 Prisma + PostgreSQL 数据持久化。目标是在保持现有 API 契约、前端页面和测试用例稳定的基础上，让品牌、权限、知识库、Prompt、监测、分析、内容、发布、任务、报告和顾问服务数据具备可持久保存、可查询和可迁移的能力。

## Requirements

### Requirement P1: Prisma 数据访问基础设施

**User Story:** AS 后端开发者, I want 统一 Prisma Client 注入和数据库访问边界, so that 各业务模块可以逐步从内存数据迁移到数据库。

#### Acceptance Criteria

1. WHEN API 服务启动, the system SHALL 通过 Nest Provider 提供可注入的 Prisma Client。
2. WHEN 代码执行数据库读写, the system SHALL 通过统一 Prisma 服务访问数据库。
3. IF 数据库连接配置缺失, the system SHALL 在 Prisma 校验或运行期暴露明确错误。
4. WHEN 执行交付验证, the system SHALL 包含 Prisma schema 校验和 Prisma Client 生成。

### Requirement P2: 品牌与权限持久化

**User Story:** AS 平台管理员, I want 品牌、用户和品牌权限保存到数据库, so that 多品牌工作区和访问控制可以跨服务重启保留。

#### Acceptance Criteria

1. WHEN 用户查询可访问品牌, the system SHALL 从数据库读取用户、品牌和授权关系。
2. WHEN 用户创建或编辑品牌, the system SHALL 将品牌基础信息写入数据库。
3. IF 用户访问未授权品牌, the system SHALL 保持现有权限受限行为并记录拒绝事件。
4. WHEN 返回品牌数据, the system SHALL 保持现有共享类型和 API 响应结构。

### Requirement P3: 品牌知识库与优化对象持久化

**User Story:** AS 品牌运营人员, I want 品牌知识库、素材来源、优化单元、用户意图和 Prompt 保存到数据库, so that GEO 运营基础数据可以持续维护。

#### Acceptance Criteria

1. WHEN 用户保存品牌知识库, the system SHALL 将档案、FAQ、标准表达和完整度评分写入数据库。
2. WHEN 用户创建素材来源、优化单元、用户意图或品牌 Prompt, the system SHALL 保存关联品牌和关联对象。
3. IF 创建对象缺少品牌权限或必要关联, the system SHALL 返回当前一致的失败行为。
4. WHEN 查询品牌工作区快照, the system SHALL 基于数据库聚合相关计数。

### Requirement P4: 运营闭环数据持久化

**User Story:** AS GEO 运营人员, I want 监测、分析、内容、发布、复测、报告和顾问记录保存到数据库, so that 第一版运营闭环具备真实沉淀能力。

#### Acceptance Criteria

1. WHEN 用户创建监测运行并录入回答, the system SHALL 保存运行、原始回答和解析结果。
2. WHEN 用户生成内容策略、内容草稿、导出记录或发布记录, the system SHALL 保存完整链路关联。
3. WHEN 用户创建优化任务、复测记录、报告或顾问记录, the system SHALL 保存关联品牌、关联报告和跟进事项。
4. WHEN 执行现有运营闭环测试, the system SHALL 在数据库 repository 下保持业务结果一致。

### Requirement P5: 迁移安全与兼容

**User Story:** AS 后端维护者, I want 迁移过程可分阶段验证, so that 第一版可运行能力在替换仓储过程中保持稳定。

#### Acceptance Criteria

1. WHEN 引入 Prisma repository, the system SHALL 保持现有 `PermissionsService` 调用面稳定。
2. WHILE 迁移未完成, the system SHALL 允许单个领域逐步切换到数据库实现。
3. WHEN 执行测试, the system SHALL 覆盖品牌隔离、权限校验、凭据脱敏和运营闭环一致性。
4. IF 数据库未启动, the system SHALL 保留无需数据库的静态类型检查、构建和纯单元测试能力。
