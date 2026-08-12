# Windows 单机发布需求

## 介绍

AI品牌曝光助手需要通过 GitHub Releases 持续发布 Windows 单机安装包。安装包在 Windows 主机上使用 Docker Desktop 运行 PostgreSQL、API 和 Web 服务，并保留数据库与上传文件卷。

## 术语

- **发布标签**：格式为 `v<major>.<minor>.<patch>` 的 Git 标签。
- **单机安装包**：包含 AI品牌曝光助手容器镜像、部署配置和启动脚本的 MSI 或 EXE 文件。
- **运行时前置条件**：Windows 主机已安装并启动 Docker Desktop，且 Docker CLI 可用。

## 需求

### 需求 1：标签触发发布

**用户故事：** 作为发布管理员，我需要在推送版本标签后自动获得 Windows 安装包，以便持续迭代发布。

#### 验收标准

1. WHEN 发布管理员推送匹配 `v*` 的发布标签，GitHub Actions SHALL 构建 GEO API 与 Web 容器镜像。
2. WHEN 容器镜像构建完成，GitHub Actions SHALL 生成 MSI 与 EXE 安装包。
3. WHEN 安装包生成完成，GitHub Actions SHALL 创建或更新与发布标签对应的 GitHub Release，并上传两个安装包。

### 需求 2：单机运行内容

**用户故事：** 作为 Windows 用户，我需要单机启动完整 GEO 平台，以便在本机访问 Web 界面。

#### 验收标准

1. WHEN 用户安装发布包，安装包 SHALL 提供容器镜像归档、Docker Compose 配置、环境配置和运行脚本。
2. WHEN 用户启动 GEO 平台，运行脚本 SHALL 校验 Docker Desktop 可用性、导入随包镜像并启动数据库、API 和 Web 服务。
3. WHEN API 容器启动，API 容器 SHALL 执行 Prisma 数据库迁移。
4. WHILE 用户升级 GEO 平台，运行脚本 SHALL 保留 PostgreSQL 数据卷和上传文件卷。

### 需求 3：安装包类型与安全边界

**用户故事：** 作为 Windows 用户，我需要常见的安装包格式，以便通过组织的软件分发流程安装 GEO。

#### 验收标准

1. WHEN GitHub Actions 执行发布构建，发布流水线 SHALL 生成 Windows Installer MSI 文件。
2. WHEN GitHub Actions 执行发布构建，发布流水线 SHALL 生成 Windows EXE 安装文件。
3. WHILE 代码签名证书未配置，发布流水线 SHALL 发布未签名安装包并在发布说明中声明该状态。
4. WHEN 安装前置条件缺失，启动脚本 SHALL 显示 Docker Desktop 安装与启动指引。
