# GitHub Release 更新提示设计

Feature Name: release-update-notice
Updated: 2026-08-12

## 描述

Web 应用在应用壳加载后读取 GitHub Releases 公共 API。发布工作流通过 Docker 构建参数写入当前版本。发现更高的稳定版本时，应用壳显示非阻断提示，用户可打开 GitHub Release 页面下载 MSI 或 EXE。

## 架构

```mermaid
flowchart LR
    A["AI品牌曝光助手启动"] --> B["GitHub Releases API"]
    B --> C["比较当前版本与最新稳定版"]
    C --> D["显示更新提示"]
    D --> E["打开 GitHub Release 下载页"]
```

## 组件与接口

- `apps/web/src/app/releaseUpdate.ts`：解析版本标签、比较语义化版本和请求 GitHub Release。
- `apps/web/src/components/ReleaseUpdateNotice.tsx`：显示更新提示与下载操作。
- `apps/web/src/layouts/AppLayout.tsx`：在应用壳挂载更新提示。
- `Dockerfile` 与发布工作流：传入 `VITE_APP_VERSION`，使安装版具有正确的当前版本。

## 正确性属性

- 仅当最新稳定版严格高于当前版本时显示提示。
- 预发布版本和无法解析的标签不会触发提示。
- 更新检查失败不会阻断页面渲染或品牌操作。

## 错误处理

- 网络失败、限流和 GitHub 非成功响应返回空更新结果。
- 更新说明缺失时，提示仍显示版本号和下载入口。

## 测试策略

- 单元测试覆盖版本标签解析、版本比较、预发布过滤和更新判断。
- 组件测试覆盖发现更新与无更新的展示状态。
