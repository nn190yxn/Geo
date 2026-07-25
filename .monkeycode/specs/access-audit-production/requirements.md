# Requirements Document

## Introduction

第四阶段为多品牌 GEO 管理平台补齐真实用户、组织、角色、审计日志和生产试运行基础能力。该阶段在已有品牌隔离、Repository Port、Prisma schema、异步任务和调用审计基础上，建立可受控使用的权限与运维边界。

## Glossary

- **Organization**: 使用平台的客户组织或服务组织，是用户、品牌授权和角色分配的归属边界。
- **User**: 平台登录主体，具备状态、邮箱、姓名和组织成员关系。
- **Role**: 权限集合标识，用于表达 owner、admin、operator、viewer 等职责。
- **Brand Permission**: 用户在指定品牌下的角色授权。
- **Audit Log**: 记录关键业务操作、操作者、品牌、组织、资源和结果的审计事件。
- **Production Readiness**: 支持生产试运行所需的环境配置、健康检查、迁移命令、启动命令和排障手册。

## Requirements

### Requirement P1: 真实组织用户角色模型

**User Story:** AS 平台管理员, I want 管理真实组织、用户和角色关系, so that 多品牌访问可以基于明确的组织成员和品牌授权执行。

#### Acceptance Criteria

1. WHEN 第四阶段数据模型建立, the system SHALL provide Organization、OrganizationMember、Role 和 User 状态字段。
2. WHEN 用户属于组织成员, the system SHALL associate the user with an organization role and membership status.
3. WHEN 用户访问品牌资源, the system SHALL evaluate brand permission through organization membership and brand-level role.
4. IF 用户账号或组织成员处于 suspended 状态, the system SHALL reject protected brand operations with a structured permission error.

### Requirement P2: 审计日志服务

**User Story:** AS 平台管理员, I want 关键操作被审计记录, so that 权限、平台配置、监测、内容发布和报告操作可以追溯。

#### Acceptance Criteria

1. WHEN 用户执行关键操作, the system SHALL persist an audit log with actor, organization, brand, action, resource, result and timestamp.
2. WHEN 操作失败 due to permission or validation error, the system SHALL persist an audit log with failure result and normalized error code.
3. WHEN 管理员查询审计日志, the system SHALL return logs filtered by brand, organization, action, resource type and time range.
4. WHILE audit logs are returned through public APIs, the system SHALL exclude credentials and sensitive provider payloads.

### Requirement P3: 可配置权限策略

**User Story:** AS 平台管理员, I want API 权限策略集中配置, so that 品牌、平台配置、监测、内容、发布和报告模块具备一致的访问控制。

#### Acceptance Criteria

1. WHEN protected API routes execute, the system SHALL evaluate required permission from a centralized policy map.
2. WHEN a user has a role that satisfies the policy, the system SHALL allow the operation.
3. IF a user lacks the required role, the system SHALL reject the operation and record denied access context.
4. WHEN new protected modules are added, the system SHALL support adding route policy definitions without changing business controller logic.

### Requirement P4: 生产环境配置和健康检查

**User Story:** AS 运维负责人, I want 生产试运行配置和健康检查明确, so that 部署前可以验证数据库、队列、外部平台和服务状态。

#### Acceptance Criteria

1. WHEN the API health endpoint is called, the system SHALL return service status, repository driver, runtime environment and dependency readiness fields.
2. WHEN required environment variables are missing, the system SHALL expose degraded readiness without leaking secret values.
3. WHEN production configuration is documented, the documentation SHALL include database, queue, AI platform, logging and preview configuration.
4. WHEN deployment commands are documented, the documentation SHALL include install, migration, build, start, health check and rollback steps.

### Requirement P5: 第四阶段验证门禁

**User Story:** AS 项目交付负责人, I want 权限审计和生产化变更具备测试和文档门禁, so that 第四阶段交付可以稳定进入试运行。

#### Acceptance Criteria

1. WHEN 第四阶段模型和服务更新完成, the system SHALL pass typecheck, tests, build, Prisma validate and Prisma generate.
2. WHEN permission rules are updated, the system SHALL include tests for allowed access, denied access and suspended membership.
3. WHEN audit logging is added, the system SHALL include tests for success and failure audit records.
4. WHEN 第四阶段完成, the system SHALL update roadmap, architecture, interfaces, developer guide and delivery checklist.
