# GitHub Release 更新提示需求

## 介绍

AI品牌曝光助手在 Windows 单机安装后，需要在启动时检查 GitHub Releases 中的最新稳定版本，并向用户提供版本说明与下载入口。

## 术语

- **当前版本**：安装包构建时写入 Web 应用的语义化版本号。
- **最新稳定版**：GitHub Releases API 返回的最新非预发布版本。
- **更新提示**：显示新版本号、更新说明和 Release 下载页入口的界面消息。

## 需求

### 需求 1：启动检查

**用户故事：** 作为已安装用户，我需要在启动软件时得知可用更新，以便及时获取新功能与修复。

#### 验收标准

1. WHEN 用户打开 AI品牌曝光助手，Web 应用 SHALL 请求 GitHub 最新稳定版信息。
2. WHEN GitHub 最新稳定版高于当前版本，Web 应用 SHALL 显示更新提示。
3. WHEN GitHub 查询失败，Web 应用 SHALL 继续提供现有业务功能。

### 需求 2：用户升级入口

**用户故事：** 作为已安装用户，我需要从提示直接访问可信下载来源，以便自行确认后更新。

#### 验收标准

1. WHEN 用户选择查看更新，Web 应用 SHALL 在浏览器中打开对应 GitHub Release 页面。
2. WHEN GitHub 最新稳定版等于当前版本或低于当前版本，Web 应用 SHALL 保持更新提示隐藏。
3. WHEN GitHub Release 标记为预发布，Web 应用 SHALL 保持更新提示隐藏。
