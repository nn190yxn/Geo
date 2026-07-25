# 小白友好 GEO 自动监测与增长优化流程需求文档

## Introduction

本需求面向品牌方小白用户重构 GEO 平台的整体使用体验。系统需要支持品牌资料上传导入、自动生成监测问法、AI 平台连接向导、一键自动监测、浏览器辅助监测、手动录入兜底、自动结果分析、业务化解释和 GEO 增长优化闭环，让新品牌方按照“上传资料、选择问法、连接平台、开始监测、查看建议、执行优化、复测增长”的路径持续提升 AI 推荐表现。

## Glossary

- **小白友好体验**: 面向非技术品牌方的全局产品体验原则，使用业务语言、默认推荐、点击引导和清晰下一步解释支撑 GEO 监测和增长优化。
- **品牌资料**: 品牌简介、课程或产品介绍、门店信息、目标客户、案例、FAQ、Markdown、Word 或 PDF 内容。
- **监测问法**: 用户可能在 AI 平台中提出的问题，用于检测品牌是否被推荐、排名、表达准确性和竞品表现。
- **监测主题**: 从品牌资料中提炼的监测方向，例如品牌词、品类词、地域词、年龄段、痛点、课程、竞品对比和购买决策。
- **AI 平台连接**: 让系统获得 AI 平台回答的方式，包括 API 连接、浏览器连接和手动录入。
- **API 连接**: 用户提供 AI 平台接口地址、模型名称和 API Key 后，系统自动发送监测问题并获取回答。
- **浏览器连接**: 用户首次在可见浏览器中登录 AI 平台后，系统使用该登录会话辅助填写问题、发送提问并读取回答。
- **手动录入**: 系统生成监测问题，用户复制到 AI 平台网页提问，再把回答粘贴回系统进行分析。
- **需要你确认**: 系统发现风险表达、信息不确定、回答异常或登录状态异常时，向用户展示可理解的确认事项。
- **GEO 增长优化**: 基于监测结果生成策略、计划、内容和复测任务，持续提升品牌在 AI 平台中的推荐率、排名和表达准确性。

## Requirements

### Requirement 1: 品牌资料上传导入

**User Story:** AS 品牌负责人, I want 上传公司已有品牌资料, so that 系统可以自动建立品牌档案并减少手工录入。

#### Acceptance Criteria

1. WHEN 用户进入新品牌创建流程, the system SHALL 提供“上传品牌资料”和“手动填写品牌信息”两个入口。
2. WHEN 用户上传 Markdown、Word 或 PDF 品牌资料, the system SHALL 提取品牌名称、别名、行业、城市、产品或课程、目标客户、卖点、案例、FAQ、竞品和禁用表达候选项。
3. WHEN 系统完成资料解析, the system SHALL 展示可编辑的品牌档案确认页，并标记高置信字段和待确认字段。
4. IF 上传资料无法解析, the system SHALL 展示失败原因、支持格式说明和手动填写入口。
5. WHEN 用户确认品牌档案, the system SHALL 保存品牌档案、导入来源、解析状态和用户确认记录。

### Requirement 2: 品牌档案完整度引导

**User Story:** AS 品牌负责人, I want 系统告诉我还缺哪些信息, so that 我可以补齐影响监测准确性的关键资料。

#### Acceptance Criteria

1. WHEN 品牌档案保存后, the system SHALL 计算品牌资料完整度，并展示缺失项对监测结果的影响。
2. WHEN 品牌档案缺少目标客户、业务范围、核心卖点、服务城市、案例、FAQ 或竞品, the system SHALL 生成可直接填写的问题卡片。
3. WHEN 用户补充缺失信息, the system SHALL 重新计算完整度并更新可生成监测问法的数量。
4. IF 品牌资料完整度低于首轮监测阈值, the system SHALL 允许用户继续监测，并提示结果可信度较低的原因。

### Requirement 3: 自动生成监测主题

**User Story:** AS 品牌运营人员, I want 系统自动拆出监测方向, so that 我可以理解应该从哪些角度监测 AI 推荐结果。

#### Acceptance Criteria

1. WHEN 品牌档案确认后, the system SHALL 生成品牌词、品类词、地域词、人群年龄段、用户痛点、课程或产品、竞品对比和购买决策监测主题。
2. WHEN 系统生成监测主题, the system SHALL 为每个主题展示业务解释、推荐优先级和预计监测价值。
3. WHEN 用户查看监测主题, the system SHALL 支持一键启用、停用和调整优先级。
4. IF 系统无法从资料中识别某类监测主题, the system SHALL 展示补充信息入口并说明需要补充的资料类型。

### Requirement 4: 自动生成监测问法候选

**User Story:** AS 品牌负责人, I want 系统直接给我备选问法, so that 我可以勾选问题后开始监测。

#### Acceptance Criteria

1. WHEN 用户进入“选择监测问题”步骤, the system SHALL 根据品牌档案和监测主题生成监测问法候选列表。
2. WHEN 系统生成监测问法, the system SHALL 覆盖品牌直问、品类推荐、地域推荐、年龄段需求、痛点需求、课程需求、竞品对比和购买决策场景。
3. WHEN 系统展示监测问法, the system SHALL 标注每个问题的监测目的，包括是否被提到、是否排第一、卖点是否准确、是否出现竞品和是否存在风险表达。
4. WHEN 用户选择监测问法, the system SHALL 支持按主题批量勾选、单题编辑、预览目标平台和保存为监测计划。
5. IF 监测问法数量超过默认展示数量, the system SHALL 优先展示高价值问题，并提供“查看更多问法”入口。

### Requirement 5: 一键首轮监测计划

**User Story:** AS 品牌负责人, I want 一键开始首轮监测, so that 我可以快速看到品牌在 AI 平台中的表现。

#### Acceptance Criteria

1. WHEN 用户点击“一键开始首轮监测”, the system SHALL 自动选择默认监测问题、默认监测平台和默认分析规则创建监测计划。
2. WHEN 监测计划创建后, the system SHALL 展示监测问题数量、目标平台、预计耗时、连接方式和可能需要用户确认的事项。
3. WHEN 用户确认监测计划, the system SHALL 按平台连接状态自动执行 API 自动监测、浏览器辅助监测或手动录入流程。
4. IF 所有目标平台缺少可用连接方式, the system SHALL 引导用户先完成 AI 平台连接或选择手动录入。

### Requirement 6: AI 平台连接向导

**User Story:** AS 品牌负责人, I want 用简单语言连接 AI 平台, so that 我知道哪些平台可以自动监测。

#### Acceptance Criteria

1. WHEN 用户进入 AI 平台连接页, the system SHALL 按“可自动监测”“可用浏览器辅助监测”“可手动录入”“需要配置”展示平台状态。
2. WHEN 用户选择 API 连接, the system SHALL 引导用户填写平台名称、接口地址、模型名称、API Key 和调用限制，并隐藏工程字段说明。
3. WHEN 用户保存 API 连接, the system SHALL 校验连接可用性并只展示已配置状态、脱敏凭据状态和最近校验结果。
4. WHEN 用户选择浏览器连接, the system SHALL 打开可见浏览器并提示用户自行登录目标 AI 平台。
5. WHEN 用户选择手动录入, the system SHALL 说明复制问题和粘贴回答的操作路径。
6. IF 平台连接失败, the system SHALL 用业务语言说明失败原因和下一步处理方式。
7. WHEN 用户首次进入 AI 平台连接页, the system SHALL 将豆包、Kimi、DeepSeek 和通义千问作为第一版默认平台。

### Requirement 7: 浏览器辅助监测

**User Story:** AS 品牌运营人员, I want 系统使用已登录浏览器代我提问, so that 没有 API 的平台也能尽量自动完成监测。

#### Acceptance Criteria

1. WHEN 用户首次配置浏览器连接, the system SHALL 打开目标 AI 平台登录页并等待用户完成登录。
2. WHEN 用户完成登录, the system SHALL 保存浏览器会话状态、平台名称、登录检测结果和最近可用时间。
3. WHEN 浏览器连接执行监测问题, the system SHALL 填入问题、发送提问、等待回答完成并提取回答文本。
4. WHEN 浏览器连接获取回答成功, the system SHALL 将回答写入监测记录并触发自动分析。
5. IF 浏览器页面出现验证码、登录失效、页面结构变化或回答读取失败, the system SHALL 暂停该平台监测并切换到需要用户确认或手动录入。
6. IF 平台规则限制自动化操作, the system SHALL 停止浏览器辅助监测并展示手动录入路径。
7. WHEN 用户选择第一版浏览器连接平台, the system SHALL 支持豆包、Kimi、DeepSeek 和通义千问的登录检测、提问发送和回答提取能力。

### Requirement 8: API 自动监测

**User Story:** AS 品牌运营人员, I want 系统通过 API 自动提问和获取回答, so that 批量监测和定时复测稳定运行。

#### Acceptance Criteria

1. WHEN 平台已完成 API 连接, the system SHALL 将监测问法发送到对应 AI 平台并保存原始回答。
2. WHEN API 平台返回回答, the system SHALL 保存平台、模型、问题、回答、响应时间、调用状态和调用审计摘要。
3. WHEN API 自动监测失败, the system SHALL 记录失败原因、重试状态和可切换的备用连接方式。
4. IF API Key 缺失、接口地址错误或模型不可用, the system SHALL 标记平台为需要配置并保留监测计划。

### Requirement 9: 手动录入兜底

**User Story:** AS 品牌负责人, I want 在自动方式不可用时还能完成监测, so that 首轮监测不会卡住。

#### Acceptance Criteria

1. WHEN 平台使用手动录入, the system SHALL 为用户展示可复制的监测问题和目标平台入口说明。
2. WHEN 用户粘贴 AI 平台回答, the system SHALL 保存回答并执行同一套自动分析流程。
3. WHEN 用户批量粘贴多个回答, the system SHALL 按监测问题和平台匹配回答内容。
4. IF 粘贴内容为空或无法匹配监测问题, the system SHALL 提示用户补充回答或重新选择对应问题。

### Requirement 10: 自动分析与业务化结果解释

**User Story:** AS 品牌负责人, I want 看懂监测结果, so that 我知道品牌在 AI 回答里表现好不好。

#### Acceptance Criteria

1. WHEN 系统获得 AI 回答, the system SHALL 自动分析品牌是否被提到、推荐排名、品牌卖点覆盖、错误表达、竞品提及、引用来源和情绪倾向。
2. WHEN 分析完成, the system SHALL 用业务语言展示“有没有出现”“排第几”“说得准不准”“竞品表现”“需要补什么内容”。
3. WHEN 品牌排名不是第一, the system SHALL 解释被压制原因候选项，并生成内容补强建议。
4. WHEN 回答出现禁用表达或高风险承诺, the system SHALL 标记为“需要你确认”，并展示建议改法。
5. IF 回答无法自动判断排名或情绪, the system SHALL 标记为“需要你确认”并提供可编辑分析表单。

### Requirement 11: 全局小白友好状态和用词

**User Story:** AS 品牌负责人, I want 页面用词容易理解, so that 我知道每一步该做什么。

#### Acceptance Criteria

1. WHEN 页面展示监测流程, the system SHALL 使用“监测问题”“连接 AI 平台”“开始监测”“等待回答”“正在分析”“需要你确认”“监测完成”等业务用词。
2. WHEN 页面展示工程字段, the system SHALL 将接口地址、模型名称、调用限制和高级配置收纳到“高级设置”。
3. WHEN 页面展示异常状态, the system SHALL 给出原因、影响和下一步操作。
4. WHEN 页面展示原有专业术语, the system SHALL 提供业务化别名，例如将 Prompt 展示为监测问题、优化单元展示为监测主题、平台配置展示为连接 AI 平台。
5. WHEN 用户点击关键功能入口, the system SHALL 通过弹窗、步骤条或提示卡说明当前功能用途、操作步骤和完成后的下一步。
6. WHEN 系统提供简化引导, the system SHALL 保持同一套产品流程，并在默认界面中降低理解成本。

### Requirement 12: 新手引导和默认推荐

**User Story:** AS 首次使用者, I want 系统给我默认选择, so that 我可以减少判断成本。

#### Acceptance Criteria

1. WHEN 用户首次进入品牌工作区, the system SHALL 展示“完成首轮监测”的步骤条。
2. WHEN 用户没有监测经验, the system SHALL 默认推荐 5 到 10 个高价值监测问题。
3. WHEN 用户没有选择平台, the system SHALL 推荐可用平台并说明每个平台的连接方式。
4. WHEN 用户完成首轮监测, the system SHALL 展示下一步建议，包括补充品牌资料、连接更多平台、生成内容优化任务和安排复测。

### Requirement 13: 监测计划模板

**User Story:** AS 运营人员, I want 复用常见监测计划, so that 不同品牌可以快速启动同类型监测。

#### Acceptance Criteria

1. WHEN 系统识别品牌行业和城市, the system SHALL 推荐适配行业的监测计划模板。
2. WHEN 用户选择监测计划模板, the system SHALL 自动生成监测主题、监测问法、目标平台和分析重点。
3. WHEN 用户保存监测计划, the system SHALL 允许后续复制、编辑和复测。
4. IF 行业模板不存在, the system SHALL 使用通用品牌监测模板生成首轮计划。

### Requirement 14: 复测和趋势解释

**User Story:** AS 品牌负责人, I want 定期复测并看趋势, so that 我知道优化动作有没有效果。

#### Acceptance Criteria

1. WHEN 用户完成首轮监测, the system SHALL 提供创建复测计划入口。
2. WHEN 复测计划运行, the system SHALL 使用相同监测问题、平台和分析规则生成可比结果。
3. WHEN 复测完成, the system SHALL 展示排名变化、提及变化、表达准确性变化和竞品变化。
4. IF 复测结果下降, the system SHALL 生成可能原因和下一步优化建议。

### Requirement 15: GEO 增长优化闭环

**User Story:** AS 品牌负责人, I want 系统在检测后继续帮我优化, so that GEO 数据可以持续增长。

#### Acceptance Criteria

1. WHEN 首轮监测完成, the system SHALL 根据推荐率、排名、表达准确性、竞品压制和内容缺口生成优化策略。
2. WHEN 系统发现推荐率不足, the system SHALL 生成对应的原因分析、优先级和可执行优化计划。
3. WHEN 系统生成优化计划, the system SHALL 拆解为内容补强、平台发布、资料补充、问法复测和负责人跟进任务。
4. WHEN 用户确认优化计划, the system SHALL 支持用 AI 协助生成推文、文章大纲、FAQ、平台介绍文案和图片创意需求。
5. WHEN 系统生成内容任务, the system SHALL 标明建议发布平台、内容主题、目标关键词、引用资料和复测时间。
6. WHEN 优化任务完成, the system SHALL 触发复测计划并对比优化前后的推荐率、排名和表达准确性。
7. IF 优化动作未带来指标提升, the system SHALL 生成下一轮策略建议并保留历史优化记录。
8. WHEN 系统生成第一版内容任务, the system SHALL 支持公众号推文、小红书图文、官网 FAQ、短视频脚本、平台介绍文案和图片创意需求。
9. WHEN 系统生成第一版优化计划, the system SHALL 支持负责人、截止时间、发布平台和复测时间字段。

### Requirement 16: 安全、合规和用户授权

**User Story:** AS 平台管理员, I want 平台连接和浏览器辅助监测具备授权边界, so that 用户账号和平台使用风险可控。

#### Acceptance Criteria

1. WHEN 用户配置 API Key, the system SHALL 隐藏真实密钥并只展示配置状态。
2. WHEN 用户启用浏览器连接, the system SHALL 明确展示使用的 AI 平台账号、会话状态和最近操作记录。
3. WHEN 浏览器连接执行监测, the system SHALL 仅在用户授权的品牌、平台和监测计划范围内操作。
4. IF 浏览器连接触发验证码、风控提示或平台限制, the system SHALL 停止自动操作并提示用户手动处理。
5. WHEN 用户停用平台连接, the system SHALL 停止后续自动监测计划并保留历史监测记录。

### Requirement 17: 追光小牛首轮小白友好体验样例

**User Story:** AS 追光小牛品牌负责人, I want 系统基于真实品牌资料生成问法样例, so that 我可以直接验证首轮流程是否可用。

#### Acceptance Criteria

1. WHEN 追光小牛品牌资料完成导入, the system SHALL 生成贵阳儿童运动、3 到 5 岁儿童体能、少儿跑酷、快乐体操、感统发展、专注力提升、增高体能和中考体测相关监测主题。
2. WHEN 系统生成追光小牛监测问法, the system SHALL 包含“贵阳哪里有适合 3-5 岁孩子的体能馆”“贵阳哪里有儿童体能馆”“贵阳少儿跑酷课程推荐哪家”“孩子专注力差适合什么运动课”等候选问题。
3. WHEN 系统分析追光小牛监测结果, the system SHALL 检查追光小牛是否排第一、ACE 成长体系是否被准确表达、五家贵阳校区是否被提到、世界冠军师资背书是否被正确表达。
4. IF 回答出现“保证长高”“治疗感统失调”“包过中考体育”等表达, the system SHALL 标记为“需要你确认”并给出审慎表达建议。
5. WHEN 追光小牛首轮监测完成, the system SHALL 根据推荐率、排名和表达问题生成内容优化计划、推文建议、平台发布建议和复测计划。

## Confirmed Scope

1. 第一版内容生成类型包含公众号推文、小红书图文、官网 FAQ、短视频脚本、平台介绍文案和图片创意需求。
2. 第一版优化计划包含负责人、截止时间、发布平台和复测时间。
