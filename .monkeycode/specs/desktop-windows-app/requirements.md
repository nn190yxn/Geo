# Requirements Document

## Introduction

为 GEO 管理平台提供 Windows 独立桌面应用。安装完成后，用户通过开始菜单快捷方式打开应用窗口，应用自动管理本地 API、Web 和 PostgreSQL 运行时，业务数据保存在当前 Windows 用户目录。

## Glossary

- **桌面应用**：承载 GEO Web 界面并负责本地服务生命周期的 Windows 应用窗口。
- **本地服务**：随安装包交付的 API 服务和 Web 服务。
- **本地数据库**：随安装包交付并运行在用户数据目录中的 PostgreSQL 实例。
- **用户数据目录**：`%LOCALAPPDATA%\AI-Brand-Visibility-Assistant`。

## Requirements

### Requirement 1: 应用启动

**User Story:** 作为 Windows 用户，我希望双击快捷方式即可打开 GEO 管理平台，以便直接使用业务功能。

#### Acceptance Criteria

1. WHEN 用户从开始菜单或桌面快捷方式启动应用，桌面应用 SHALL 在 30 秒内启动本地数据库、API 和 Web 服务。
2. WHEN 本地服务全部通过健康检查，桌面应用 SHALL 在独立窗口中加载 Web 界面。
3. IF 任一本地服务启动失败，桌面应用 SHALL 显示可读错误、日志位置和重试操作。

### Requirement 2: 本地数据

**User Story:** 作为业务用户，我希望业务数据在本机持久保存，以便关闭应用后继续工作。

#### Acceptance Criteria

1. WHEN 桌面应用首次启动，桌面应用 SHALL 在用户数据目录创建 PostgreSQL 数据目录并执行受控迁移。
2. WHEN 桌面应用再次启动，桌面应用 SHALL 复用已有本地数据库并保留历史业务数据。
3. WHILE 桌面应用运行，桌面应用 SHALL 将运行日志、上传资料和数据库数据写入用户数据目录。

### Requirement 3: 桌面窗口体验

**User Story:** 作为 Windows 用户，我希望应用以独立窗口呈现，以便获得普通软件的操作体验。

#### Acceptance Criteria

1. WHEN Web 服务就绪，桌面应用 SHALL 创建独立窗口并加载本地应用地址。
2. WHEN 用户关闭主窗口，桌面应用 SHALL 先停止本地 API、Web 和 PostgreSQL 进程，再退出应用。
3. WHEN 用户重新打开应用，桌面应用 SHALL 恢复到本地应用入口并保留已保存的数据。

### Requirement 4: 安装与卸载

**User Story:** 作为 Windows 用户，我希望通过标准安装程序安装和卸载应用，以便使用系统常规软件管理方式。

#### Acceptance Criteria

1. WHEN 用户运行安装程序，安装程序 SHALL 创建应用文件、开始菜单快捷方式和卸载入口。
2. WHEN 用户卸载应用，卸载程序 SHALL 移除应用程序文件并提示用户选择是否保留用户数据。
3. WHEN 安装程序执行升级，安装程序 SHALL 保留用户数据目录并替换应用程序文件。

### Requirement 5: 发布验证

**User Story:** 作为发布维护者，我希望 CI 能验证桌面应用安装包，以便降低用户安装失败概率。

#### Acceptance Criteria

1. WHEN Windows Release workflow 构建安装包，workflow SHALL 构建桌面应用、API、Web 和本地 PostgreSQL 运行时资源。
2. WHEN Windows Release workflow 完成打包，workflow SHALL 验证安装包文件存在、启动脚本语法和版本元数据。
3. WHEN 发布说明生成，发布说明 SHALL 明确桌面应用启动方式、数据目录和日志位置。
