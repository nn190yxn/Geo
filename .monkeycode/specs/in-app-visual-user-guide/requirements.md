# 平台内可视化使用教程需求

## Introduction

平台需要为首次使用者提供随时可打开的操作教程，帮助用户理解页面结构、八阶段 GEO 闭环和每个阶段的下一步操作。

## Glossary

- **教程抽屉**：覆盖在当前页面右侧、保留当前业务上下文的帮助面板。
- **阶段入口**：从教程直接进入对应业务页面的操作按钮。
- **小闭环**：一个品牌、一个优化单元、一个用户意图、一个问题、一个平台、一篇内容和一次复测组成的首次实践范围。

## Requirements

### Requirement 1: 全局教程入口

**User Story:** AS 首次使用者, I want 从任意页面打开教程, so that 我可以在操作过程中随时查看说明。

#### Acceptance Criteria

1. WHILE 用户位于任意业务页面，平台 SHALL 在全局页头显示“使用教程”入口。
2. WHEN 用户点击“使用教程”，平台 SHALL 在当前页面上方打开教程抽屉。
3. WHEN 用户关闭教程抽屉，平台 SHALL 保留当前品牌和当前业务页面。

### Requirement 2: 可视化闭环说明

**User Story:** AS 首次使用者, I want 看懂完整操作顺序, so that 我可以独立完成第一轮 GEO 优化。

#### Acceptance Criteria

1. WHILE 教程抽屉打开，平台 SHALL 展示八阶段 GEO 运营闭环。
2. WHILE 教程抽屉打开，平台 SHALL 展示首次小闭环的范围建议。
3. WHEN 用户选择一个阶段入口，平台 SHALL 进入对应业务页面并关闭教程抽屉。

### Requirement 3: 业务地图与帮助信息

**User Story:** AS 平台用户, I want 查询页面用途、术语和故障处理, so that 我可以快速恢复操作。

#### Acceptance Criteria

1. WHILE 教程抽屉打开，平台 SHALL 展示五大业务区及其用途。
2. WHILE 教程抽屉打开，平台 SHALL 展示关键 GEO 术语解释。
3. WHILE 教程抽屉打开，平台 SHALL 展示品牌缺失、平台未连接和开发环境离线的处理方式。
4. WHILE 页面宽度小于 768 像素，平台 SHALL 使用全宽教程抽屉。
