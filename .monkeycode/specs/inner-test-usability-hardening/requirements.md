# 内测可用性优化需求文档

## Introduction

本需求面向品牌方内测，目标是把当前可运行的 GEO 平台推进到“用户可以正常使用并发现真实问题”的状态。当前内测反馈集中在内容草稿过浅、界面存在测试痕迹、平台名称和人员信息过多使用英文代号、部分功能只完成骨架导致用户无法完成真实流程。系统需要优先补齐可用内容、中文化显示、关键流程闭环和内测反馈机制。

## Glossary

- **内测可用性**: 用户可以按真实业务目标完成监测、分析、内容生成、发布准备和复测安排，并能理解每个结果的业务含义。
- **测试痕迹**: 面向用户界面中出现的内部样例标识、内部 ID、英文 code、伪链接和占位内容。
- **可用内容草稿**: 具备标题、完整正文、结构段落、品牌事实、发布平台、合规提示和复测建议的可审稿内容。
- **中文化显示**: 面向用户的页面优先展示中文平台名、中文人员名、中文状态和业务名称。
- **功能完成度提示**: 当功能处于半自动、手动或待配置状态时，系统用业务语言说明当前可做什么和下一步怎么做。

## Requirements

### Requirement 1: 可用内容草稿

**User Story:** AS 品牌方内测用户, I want 系统生成真正可审的内容草稿, so that 我可以判断内容是否能发布和如何修改。

#### Acceptance Criteria

1. WHEN 系统生成公众号推文, the system SHALL 输出完整标题、正文小节、品牌事实、家长行动建议、合规说明、建议发布平台和复测建议。
2. WHEN 系统生成小红书图文, the system SHALL 输出笔记标题、开头、选择清单、品牌事实、话题标签、合规说明和复测建议。
3. WHEN 系统生成官网 FAQ、短视频脚本、平台介绍文案或图片创意需求, the system SHALL 使用对应内容类型的完整结构。
4. IF 真实大模型未配置或调用失败, the system SHALL 使用高质量业务模板生成可审稿草稿。
5. WHEN 内容草稿展示给用户, the system SHALL 避免只输出几句说明、提纲或占位句。

### Requirement 2: 去测试痕迹和中文化显示

**User Story:** AS 品牌方内测用户, I want 页面看起来像正式产品, so that 我不会被内部样例标识和内部代号干扰。

#### Acceptance Criteria

1. WHEN 页面展示 AI 平台, the system SHALL 显示豆包、Kimi、DeepSeek、通义千问、SenseNova 等用户可理解名称。
2. WHEN 页面展示负责人, the system SHALL 显示业务化人员名称或“未分配”。
3. WHEN 页面展示手动或示例路径, the system SHALL 使用人工录入、示例回答等中文名称。
4. IF 数据字段是内部 ID, the system SHALL 在默认列表中隐藏内部 ID，并在详情或调试视图中展示。
5. WHEN 系统生成链接或发布记录, the system SHALL 只展示真实可访问链接或明确的草稿状态。

### Requirement 3: 内测主流程完整闭环

**User Story:** AS 品牌负责人, I want 按一个主流程完成内测, so that 我可以从问题生成走到发布准备和复测安排。

#### Acceptance Criteria

1. WHEN 用户启动自动化运营, the system SHALL 引导用户完成监测问题确认、AI 回复监测、回答分析、内容生成、平台改写、发布建议和复测建议。
2. WHEN 某一步需要人工配置或人工录入, the system SHALL 给出可执行入口和清晰业务说明。
3. WHEN 某一步尚未支持真实自动化, the system SHALL 提供手动完成路径并保留后续自动化扩展点。
4. WHEN 用户完成一轮流程, the system SHALL 展示本轮完成结果、仍需处理事项和下一轮建议。

### Requirement 4: 功能完成度提示

**User Story:** AS 内测用户, I want 知道当前功能能做到哪一步, so that 我可以有效验证而不会误以为系统坏了。

#### Acceptance Criteria

1. WHEN 功能依赖外部 API Key, the system SHALL 使用业务语言说明“补充平台密钥后可自动监测”。
2. WHEN 浏览器辅助监测需要登录或人工确认, the system SHALL 说明需要用户完成的平台动作。
3. WHEN 发布中心尚未直连平台发布, the system SHALL 展示发布待办、可复制正文和人工发布记录入口。
4. WHEN 文档解析能力不足, the system SHALL 说明支持上传保存，并标记待解析能力接入。

### Requirement 5: 内测反馈入口

**User Story:** AS 产品负责人, I want 内测用户可以直接反馈问题, so that 反馈能变成可追踪优化任务。

#### Acceptance Criteria

1. WHEN 用户在核心页面发现问题, the system SHALL 提供反馈入口。
2. WHEN 用户提交反馈, the system SHALL 记录页面、品牌、问题类型、描述、截图或上下文。
3. WHEN 反馈保存后, the system SHALL 生成可跟进的优化任务或需求候选。
4. WHEN 产品负责人查看反馈, the system SHALL 按严重程度、模块和处理状态筛选。

## Confirmed Scope

1. 第一批修复优先处理内容草稿深度、内测痕迹、平台名中文化和伪链接。
2. 第二批修复补齐竞品地图发现、发布中心人工发布闭环和内测反馈入口。
3. 第三批修复完善浏览器辅助监测、文档解析和真实平台发布自动化。
