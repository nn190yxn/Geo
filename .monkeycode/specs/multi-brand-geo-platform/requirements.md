# 多品牌 GEO 管理平台需求文档

## Introduction

多品牌 GEO 管理平台用于帮助运营团队统一管理多个品牌在 AI 搜索、AI 问答、AI 摘要和内容平台中的品牌可见度。系统第一版聚焦品牌切换、品牌档案、Prompt 场景库、GEO 监测、竞品对比、内容资产和运营报告，形成“发现问题、生成策略、创建任务、复测结果”的运营闭环。

## Glossary

- **GEO**: Generative Engine Optimization，面向生成式 AI 搜索与问答结果的品牌可见度优化。
- **品牌工作区**: 一个品牌对应的独立数据空间，包含品牌档案、Prompt、竞品、内容资产、监测记录和报告。
- **Prompt 场景**: 用于代表用户在 AI 平台中提问的标准化问题。
- **GEO 指数**: 用于衡量品牌在 AI 平台中的提及、推荐、准确、正向、引用和竞品对比表现的综合评分。
- **AI 平台**: ChatGPT、Gemini、Claude、Perplexity、DeepSeek、Kimi、豆包、通义千问、文心一言等可被系统监测的平台。
- **内容资产**: 官网文章、FAQ、品牌介绍、案例、媒体报道、社媒内容、百科资料、短视频脚本等可影响 AI 认知的内容。
- **竞品**: 与目标品牌在同一品类、地域或用户决策场景中竞争的品牌。

## Requirements

### Requirement 1: 多品牌工作区管理

**User Story:** AS 平台管理员, I want 创建和切换多个品牌工作区, so that 一个系统可以管理多个品牌的 GEO 运营。

#### Acceptance Criteria

1. WHEN 平台管理员创建品牌, the system SHALL 保存品牌名称、别名、行业、官网、目标城市、业务范围、目标用户和品牌状态。
2. WHILE 用户处于多品牌总览页面, the system SHALL 展示用户有权限访问的品牌列表和每个品牌的核心 GEO 指标。
3. WHEN 用户切换品牌工作区, the system SHALL 加载该品牌对应的档案、Prompt、竞品、内容资产、监测记录和报告。
4. IF 用户访问未授权品牌工作区, the system SHALL 返回权限受限提示并记录访问事件。

### Requirement 2: 品牌档案与标准口径

**User Story:** AS 品牌运营人员, I want 维护品牌基础信息和标准表达, so that GEO 监测和内容策略基于统一品牌认知。

#### Acceptance Criteria

1. WHEN 品牌运营人员编辑品牌档案, the system SHALL 支持维护品牌介绍、核心卖点、课程或产品体系、门店或服务范围、权威背书和 FAQ。
2. WHEN 品牌运营人员维护表达口径, the system SHALL 支持保存推荐表达、禁用表达、品牌关键词和行业关键词。
3. WHEN 系统生成内容策略, the system SHALL 引用当前品牌档案中的标准表达和关键词。
4. IF 品牌档案缺少必填字段, the system SHALL 在保存前提示缺失字段并阻止提交。

### Requirement 3: Prompt 场景库

**User Story:** AS GEO 运营人员, I want 维护通用 Prompt 模板和品牌专属 Prompt, so that 系统可以覆盖不同用户搜索场景。

#### Acceptance Criteria

1. WHEN GEO 运营人员创建 Prompt 模板, the system SHALL 保存场景分类、问题文本、目标关键词、适用行业、目标平台和监测频率。
2. WHEN GEO 运营人员将模板应用到品牌, the system SHALL 根据品牌名称、别名、城市、行业和竞品生成品牌专属 Prompt。
3. WHILE 用户查看品牌 Prompt 列表, the system SHALL 支持按场景分类、平台、关键词、启用状态和监测频率筛选。
4. IF Prompt 文本为空或缺少目标平台, the system SHALL 提示校验错误并阻止保存。

### Requirement 4: AI 平台配置与接口维护

**User Story:** AS 技术管理员, I want 管理 AI 平台配置和调用方式, so that GEO 监测可以按平台稳定执行。

#### Acceptance Criteria

1. WHEN 技术管理员新增 AI 平台, the system SHALL 保存平台名称、平台类型、调用方式、模型名称、启用状态和调用限制。
2. WHEN 技术管理员维护接口凭据, the system SHALL 对敏感字段进行加密存储并在界面中隐藏真实值。
3. WHEN 系统执行监测任务, the system SHALL 根据平台配置选择 API 调用、手动录入或半自动采集方式。
4. IF 平台调用失败, the system SHALL 记录失败原因、请求时间、关联 Prompt 和重试状态。

### Requirement 5: GEO 监测与结果解析

**User Story:** AS GEO 运营人员, I want 对多个平台执行品牌搜索监测, so that 我可以看到品牌在 AI 回答中的表现。

#### Acceptance Criteria

1. WHEN 用户启动监测任务, the system SHALL 按品牌、平台和 Prompt 创建监测运行记录。
2. WHEN AI 平台返回回答内容, the system SHALL 保存原始回答、回答时间、模型信息、引用来源和解析状态。
3. WHEN 系统解析回答内容, the system SHALL 识别品牌是否出现、出现位置、推荐顺序、情绪倾向、信息准确性和引用来源。
4. IF 回答内容无法自动解析, the system SHALL 标记为待人工复核并允许用户手动修正解析结果。

### Requirement 6: GEO 指数计算

**User Story:** AS 品牌负责人, I want 查看品牌 GEO 指数, so that 我可以判断品牌在 AI 搜索中的综合表现。

#### Acceptance Criteria

1. WHEN 系统完成回答解析, the system SHALL 计算品牌提及分、推荐分、准确分、正向分、引用分和竞品对比分。
2. WHEN 用户查看单品牌看板, the system SHALL 展示总 GEO 指数、平台指数、关键词指数、场景指数和趋势变化。
3. WHILE 用户查看多品牌总览, the system SHALL 支持按总分、提及率、Top3 推荐率、正向表达率和环比变化排序。
4. IF 某项指标缺少足够样本, the system SHALL 标记样本不足并在总分计算中使用配置化权重规则。

### Requirement 7: 竞品监控

**User Story:** AS 品牌运营人员, I want 监控竞品在 AI 回答中的表现, so that 我可以找到内容和品牌表达差距。

#### Acceptance Criteria

1. WHEN 用户为品牌添加竞品, the system SHALL 保存竞品名称、别名、官网、行业标签和对比说明。
2. WHEN 系统解析 AI 回答, the system SHALL 识别竞品提及、竞品推荐顺序、竞品被推荐理由和竞品引用来源。
3. WHEN 用户查看竞品对比, the system SHALL 展示品牌与竞品在同一 Prompt、同一平台和同一场景下的差距。
4. IF 竞品连续多次压制目标品牌, the system SHALL 生成内容策略建议并标记为高优先级。

### Requirement 8: 内容资产与内容策略

**User Story:** AS 内容运营人员, I want 管理内容资产并获得内容策略建议, so that 内容生产可以服务 GEO 提升。

#### Acceptance Criteria

1. WHEN 内容运营人员创建内容资产, the system SHALL 保存标题、内容类型、平台、URL、目标关键词、适用品牌、内容状态和发布时间。
2. WHEN 系统分析 GEO 结果, the system SHALL 识别内容缺口、信息错误、引用缺失和可增强关键词。
3. WHEN 系统生成内容策略, the system SHALL 输出策略类型、目标平台、建议标题、目标关键词、关联 Prompt 和优先级。
4. IF 内容资产被多个品牌复用, the system SHALL 记录资产归属、复用关系和品牌适配字段。

### Requirement 9: 运营任务与复测闭环

**User Story:** AS 运营负责人, I want 将 GEO 问题转成任务并跟踪复测结果, so that 运营动作可以形成闭环。

#### Acceptance Criteria

1. WHEN 用户从监测问题创建任务, the system SHALL 保存任务类型、关联品牌、关联 Prompt、关联平台、负责人、截止日期和状态。
2. WHILE 任务处于执行中, the system SHALL 支持记录内容链接、处理说明和审核状态。
3. WHEN 任务完成, the system SHALL 创建复测计划并关联原始监测问题。
4. IF 复测结果低于目标阈值, the system SHALL 重新打开问题并生成下一轮优化建议。

### Requirement 10: 报告中心

**User Story:** AS 品牌负责人, I want 生成单品牌和多品牌 GEO 报告, so that 我可以定期复盘品牌 AI 搜索表现。

#### Acceptance Criteria

1. WHEN 用户生成单品牌报告, the system SHALL 汇总 GEO 指数、平台表现、关键词表现、竞品表现、内容缺口和任务进度。
2. WHEN 用户生成多品牌报告, the system SHALL 汇总各品牌排名、环比变化、强势平台、薄弱场景和高优先级问题。
3. WHEN 用户导出报告, the system SHALL 支持 Markdown、PDF 或结构化数据格式。
4. IF 报告期间缺少监测数据, the system SHALL 在报告中标记数据缺口和缺口原因。

### Requirement 11: GEO 优化单元

**User Story:** AS GEO 运营人员, I want 将品牌拆解为可运营的优化单元, so that 用户意图、Prompt、内容策略和监测结果可以围绕明确对象管理。

#### Acceptance Criteria

1. WHEN GEO 运营人员创建优化单元, the system SHALL 保存单元名称、单元类型、目标关键词、优先级、关联品牌和启用状态。
2. WHILE 用户查看优化单元详情, the system SHALL 展示关联用户意图、关联 Prompt、关联内容策略、监测表现和任务进度。
3. WHEN 系统生成 GEO 画布, the system SHALL 将优化单元作为策略链路起点并连接到用户意图和数据表现。
4. IF 优化单元停用, the system SHALL 暂停该优化单元关联 Prompt 的自动监测计划。

### Requirement 12: 品牌知识库完整度与多来源导入

**User Story:** AS 品牌运营人员, I want 检查品牌知识库完整度并导入多来源素材, so that AI 监测和内容生成具备完整品牌素材基础。

#### Acceptance Criteria

1. WHEN 用户维护品牌知识库, the system SHALL 根据品牌介绍、业务范围、核心卖点、FAQ、竞品、用户画像、权威背书和禁用表达计算完整度评分。
2. WHEN 用户上传知识库素材, the system SHALL 支持本地文件、网页链接、公众号素材和外部文档导入记录。
3. WHEN 用户导入素材, the system SHALL 保存素材来源、关联品牌、处理状态、导入时间和错误信息。
4. IF 导入内容缺少名称、来源类型或关联品牌, the system SHALL 提示校验错误并阻止提交。

### Requirement 13: AI 平台评价、引用分析与评价分析

**User Story:** AS GEO 分析人员, I want 分析 AI 对品牌的推荐理由、引用来源和表达质量, so that 我可以明确品牌优化方向。

#### Acceptance Criteria

1. WHEN 系统解析 AI 回答, the system SHALL 保存推荐理由、排名原因、优势表达完整度和表达偏差。
2. WHEN 系统识别引用来源, the system SHALL 按官网、媒体、社媒、百科和第三方平台分类统计引用次数和引用率。
3. WHEN 用户查看评价分析, the system SHALL 展示正向表达率、中性表达率、负向表达率、准确表达率和错误表达列表。
4. IF 系统发现错误表达或缺失卖点, the system SHALL 支持创建修正内容任务或更新品牌知识库。

### Requirement 14: 内容生成与编辑工作台

**User Story:** AS 内容运营人员, I want 基于品牌知识库和内容策略生成可编辑内容, so that GEO 优化内容可以高效产出并进入发布流程。

#### Acceptance Criteria

1. WHEN 用户从内容策略创建生成任务, the system SHALL 读取关联品牌知识库、用户意图、目标平台、目标关键词和内容类型。
2. WHILE 内容生成任务执行中, the system SHALL 展示策略解析、知识库读取、大纲生成、正文生成和 GEO 规则检查的进度状态。
3. WHEN 内容草稿生成完成, the system SHALL 支持用户编辑、保存版本、复制内容、导出 Markdown 和进入发布流程。
4. IF 内容生成失败, the system SHALL 保存失败步骤、失败原因和重试状态。

### Requirement 15: 发布中心与账号接入

**User Story:** AS 内容运营人员, I want 管理内容平台账号和发布记录, so that 内容从生成到发布具备可追踪记录。

#### Acceptance Criteria

1. WHEN 用户配置发布平台账号, the system SHALL 保存平台名称、账号名称、授权状态、登录方式、关联品牌和最近授权时间。
2. WHEN 用户查看发布中心, the system SHALL 支持在发布记录和账号管理之间切换。
3. WHEN 内容进入发布流程, the system SHALL 创建发布记录并关联内容资产、品牌、目标平台和发布状态。
4. IF 平台账号授权异常, the system SHALL 展示异常原因并提供重新授权入口。

### Requirement 16: 顾问服务工作台

**User Story:** AS GEO 顾问, I want 记录品牌诊断、服务计划、培训记录和行业规则更新, so that 平台可以支持服务化交付。

#### Acceptance Criteria

1. WHEN 顾问创建品牌诊断, the system SHALL 保存诊断结论、核心问题、优先级建议和关联报告。
2. WHEN 顾问维护服务记录, the system SHALL 保存服务类型、服务内容、关联品牌、服务时间和跟进事项。
3. WHEN 行业规则发生变化, the system SHALL 支持记录规则更新内容、影响平台、影响场景和建议动作。
4. IF 用户生成客户交付报告, the system SHALL 支持引用顾问诊断、服务记录和行业规则更新内容。
