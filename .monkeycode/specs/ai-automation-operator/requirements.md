# AI 自动化运营员需求文档

## Introduction

本需求面向品牌方小白用户，把 GEO 平台从“多个页面分别点击生成”升级为“AI 自动化运营员”。系统应自动生成监测问题、自动执行 AI 回复监测、自动分析结果、自动生成可发布内容、自动按目标平台规则改写，并把关键决策收口到用户确认。第一版聚焦追光小牛内测流程，覆盖豆包、Kimi、DeepSeek、通义千问 API 或浏览器辅助监测，以及知乎、百家号、小红书、公众号、官网 FAQ 等内容发布建议。

## Glossary

- **AI 自动化运营员**: 由系统发起并串联监测、分析、内容生成、平台改写、确认和复测建议的自动化工作流。
- **自动化任务包**: 一次自动化运营流程的结构化记录，包含目标、范围、输入资料、任务状态、确认事项、生成结果和审计摘要。
- **监测问题池**: 系统围绕品牌词、品类词、地域词、人群、痛点、课程、竞品、购买决策、内容缺口和复测目标持续生成的候选问题集合。
- **本轮精选问题**: 系统从监测问题池中筛出的 5 到 6 个高价值问题，用于当前轮次让用户确认并执行监测。
- **确认队列**: 系统需要用户判断的事项集合，例如监测问题确认、平台连接确认、风险表达确认、内容发布确认和复测安排确认。
- **平台规则适配**: 根据目标平台内容特点调整标题、正文结构、语气、标签、长度、合规提醒和发布建议。
- **可发布内容**: 已包含标题、正文、核心卖点、引用依据、平台格式、合规提醒和发布前检查项的内容草稿。
- **发布建议**: 系统基于监测结果、内容类型和平台匹配度给出的建议发布平台、发布顺序和复测时间。
- **用户确认节点**: 系统暂停自动推进并等待用户确认的业务节点。

## Requirements

### Requirement 1: 自动化运营入口

**User Story:** AS 品牌负责人, I want 一键启动 AI 自动化运营流程, so that 系统可以主动完成监测、分析和内容生成准备工作。

#### Acceptance Criteria

1. WHEN 用户进入品牌工作区、AI 回复监测页或增长优化页, the system SHALL 提供“让 AI 帮我跑一轮”入口。
2. WHEN 用户启动 AI 自动化运营员, the system SHALL 创建自动化任务包并展示本次将自动完成的步骤、预计耗时、目标平台和需要用户确认的节点。
3. WHEN 自动化任务包创建后, the system SHALL 读取当前品牌档案、监测主题、平台连接状态、历史监测结果、内容资产和发布记录作为输入。
4. IF 品牌资料不足以启动首轮监测, the system SHALL 生成资料补充问题并允许用户选择继续使用基础资料启动。
5. WHEN 自动化任务包运行中, the system SHALL 展示当前步骤、已完成事项、等待确认事项和失败兜底路径。

### Requirement 2: 自动生成并确认监测问题

**User Story:** AS 品牌负责人, I want 系统直接生成 5 到 6 个监测问题, so that 我只需要确认这些问题是否符合业务。

#### Acceptance Criteria

1. WHEN 自动化任务包进入监测准备步骤, the system SHALL 先生成或更新监测问题池，再从问题池中筛选 5 到 6 个本轮精选问题。
2. WHEN 系统生成监测问题池, the system SHALL 覆盖品牌直问、品类推荐、地域推荐、购买决策、用户痛点、课程需求、竞品对比、内容缺口和复测目标中的高价值场景。
3. WHEN 系统展示本轮精选问题, the system SHALL 标注监测目的、目标平台、推荐理由、预计监测价值和所属监测角度。
4. WHEN 用户确认本轮精选问题, the system SHALL 保存为监测计划并进入自动监测执行步骤。
5. IF 用户调整本轮精选问题, the system SHALL 保存调整后的问题文本、监测目的、目标平台、监测角度和确认记录。
6. IF 系统发现新的品牌资料、监测结果、竞品变化、内容发布记录或复测结果, the system SHALL 更新监测问题池并生成下一轮候选问题。
7. IF 系统无法生成足够本轮精选问题, the system SHALL 使用规则模板补齐候选问题并标记生成依据。

### Requirement 3: 自动执行 AI 回复监测

**User Story:** AS 品牌运营人员, I want 系统自动向多个 AI 平台提问, so that 我可以快速看到品牌在 AI 回答中的表现。

#### Acceptance Criteria

1. WHEN 监测计划确认后, the system SHALL 按平台连接状态选择 API 自动监测、浏览器辅助监测或手动录入路径。
2. WHEN 平台具备 API 连接, the system SHALL 自动发送监测问题并保存回答、平台、模型、耗时和调用审计摘要。
3. WHEN 平台具备浏览器连接, the system SHALL 在用户授权会话范围内发送问题、读取回答并保存回答摘要。
4. IF 浏览器连接出现验证码、登录失效、平台限制或页面读取异常, the system SHALL 将该平台加入确认队列并提供手动录入入口。
5. IF 平台需要手动录入, the system SHALL 生成可复制问题和粘贴回答入口，并保持同一套分析流程。
6. WHEN 自动监测完成, the system SHALL 触发回答分析并更新自动化任务包状态。

### Requirement 4: 自动分析并形成运营判断

**User Story:** AS 品牌负责人, I want 系统直接告诉我问题在哪里, so that 我能判断下一步该补什么内容。

#### Acceptance Criteria

1. WHEN 系统获得 AI 回答, the system SHALL 自动分析品牌是否出现、推荐排名、卖点准确性、竞品压制、引用来源、风险表达和内容缺口。
2. WHEN 分析完成, the system SHALL 输出推荐率、排名表现、准确表达、竞品影响、内容缺口和下一步建议。
3. WHEN 回答出现不确定事实、风险承诺或禁用表达, the system SHALL 加入确认队列并展示建议改法。
4. IF 分析结果无法判断排名、情绪或引用来源, the system SHALL 请求用户确认对应字段并保留原始回答。
5. WHEN 用户确认分析结果, the system SHALL 将确认后的判断作为内容生成和复测建议输入。

### Requirement 5: 自动生成可发布内容

**User Story:** AS 品牌运营人员, I want 系统根据监测结果自动写推文和内容草稿, so that 我可以直接审核和发布。

#### Acceptance Criteria

1. WHEN 自动化任务包完成分析步骤, the system SHALL 根据内容缺口、品牌资料和发布记录生成可发布内容草稿。
2. WHEN 系统生成内容, the system SHALL 支持公众号推文、小红书图文、官网 FAQ、短视频脚本、平台介绍文案和图片创意需求。
3. WHEN 系统输出可发布内容, the system SHALL 包含标题、正文、目标关键词、引用依据、合规说明、建议发布平台和复测建议。
4. WHEN 系统为追光小牛生成内容, the system SHALL 使用“运动成长课是儿童必修课”“BE THE SUPERCALF”“ACE 成长体系”“贵阳 5 家校区”和冠军师资背书等已确认品牌事实。
5. IF 内容命中夸大承诺、医疗化表达、升学保证或未经确认事实, the system SHALL 将内容标记为需要确认并给出审慎改写建议。
6. WHEN 用户确认内容草稿, the system SHALL 保存内容版本并生成发布建议。

### Requirement 6: 自动按平台规则改写

**User Story:** AS 品牌运营人员, I want 选择目标平台后系统自动调整文案, so that 同一内容可以适配知乎、百家号、小红书和公众号。

#### Acceptance Criteria

1. WHEN 用户选择目标发布平台, the system SHALL 根据平台规则自动改写标题、正文结构、开头方式、段落长度、标签和发布提示。
2. WHEN 目标平台为知乎, the system SHALL 将内容调整为问答式结构、经验解释、可信依据和审慎表达。
3. WHEN 目标平台为百家号, the system SHALL 将内容调整为资讯式标题、结构化正文、权威背书和本地服务信息。
4. WHEN 目标平台为小红书, the system SHALL 将内容调整为笔记标题、口语化正文、家长视角、选择建议和话题标签。
5. WHEN 目标平台为公众号, the system SHALL 将内容调整为完整推文结构、分段标题、品牌观点和行动引导。
6. IF 平台规则缺少配置, the system SHALL 使用通用平台改写规则并提示运营人员补充平台偏好。
7. WHEN 平台改写完成, the system SHALL 保存改写版本、目标平台和改写说明。

### Requirement 7: 用户确认队列

**User Story:** AS 品牌负责人, I want 只处理系统筛出来的关键确认事项, so that 我不用逐页检查每个细节。

#### Acceptance Criteria

1. WHEN 自动化任务包产生确认事项, the system SHALL 将事项汇总到确认队列并按业务影响排序。
2. WHEN 用户打开确认队列, the system SHALL 展示确认类型、影响说明、系统建议、原始依据和可选操作。
3. WHEN 用户确认监测问题、分析判断、内容草稿或平台改写结果, the system SHALL 记录确认人、确认时间、确认结论和后续动作。
4. IF 用户拒绝某个确认事项, the system SHALL 要求选择原因并生成重新生成、手动编辑或跳过的下一步。
5. WHEN 所有必需确认事项完成, the system SHALL 推进自动化任务包到下一步骤。

### Requirement 8: 发布建议与发布记录

**User Story:** AS 品牌运营人员, I want 系统告诉我应该发到哪里, so that 我可以按优先级执行发布。

#### Acceptance Criteria

1. WHEN 内容版本确认后, the system SHALL 根据内容类型、目标关键词、平台规则和历史发布记录生成发布建议。
2. WHEN 系统生成发布建议, the system SHALL 输出建议平台、发布顺序、建议标题、目标关键词、预计改善目标和建议复测时间。
3. WHEN 用户确认发布建议, the system SHALL 创建发布记录或发布待办并关联内容版本。
4. IF 发布账号未接入或授权异常, the system SHALL 展示账号处理入口并保留可复制发布内容。
5. WHEN 用户填写发布链接或标记发布完成, the system SHALL 将发布记录纳入后续复测计划输入。

### Requirement 9: 自动复测建议

**User Story:** AS 品牌负责人, I want 发布后系统安排复测, so that 我知道内容是否改善 AI 推荐表现。

#### Acceptance Criteria

1. WHEN 发布建议确认后, the system SHALL 生成复测计划建议并关联原监测计划、内容版本和发布记录。
2. WHEN 复测时间到达或用户手动触发复测, the system SHALL 使用相同监测问题和平台执行可比监测。
3. WHEN 复测完成, the system SHALL 对比推荐率、排名、表达准确性、引用来源和竞品压制变化。
4. IF 复测结果未达到改善目标, the system SHALL 生成下一轮内容建议和监测问题建议。
5. WHEN 复测结果改善, the system SHALL 将有效内容类型、平台和表达方式保存为后续建议依据。

### Requirement 10: 安全、合规和审计

**User Story:** AS 平台管理员, I want 自动化流程具备授权边界和审计记录, so that 自动化能力可控且可追溯。

#### Acceptance Criteria

1. WHEN 自动化任务包访问品牌数据, the system SHALL 使用当前品牌上下文和品牌访问权限校验。
2. WHEN 自动化任务包调用 AI 平台, the system SHALL 只保存调用审计摘要和任务摘要。
3. WHEN 系统返回平台配置、浏览器会话或任务结果, the system SHALL 隐藏真实 API Key、cookies、storage state、浏览器 profile 路径和平台敏感凭据。
4. IF 平台规则、验证码、风控或账号限制阻止自动操作, the system SHALL 停止对应自动步骤并切换为用户确认或手动路径。
5. WHEN 自动化任务包完成、失败或被用户停止, the system SHALL 保存状态、原因、关键输入输出摘要和用户确认记录。

## Confirmed Scope

1. 第一版自动化任务从“持续生成监测问题池，并为当前轮次精选 5 到 6 个监测问题”开始，串联监测、分析、内容生成、平台改写、确认和复测建议。
2. 第一版平台监测复用现有 API、浏览器辅助和手动录入路径。
3. 第一版内容平台适配覆盖知乎、百家号、小红书、公众号和官网 FAQ。
4. 第一版用户操作重点是确认监测问题、确认风险判断、确认内容和确认发布建议。
5. 第一版以追光小牛作为默认内测品牌样例。
