# 项目文档索引

## 项目概览

当前仓库是多品牌 GEO 管理平台的独立工程，包含应用源码、测试、数据库迁移、部署配置、项目文档、功能规格和 GEO 宣传资料。工程位于 `当前工作区/`，采用 monorepo 组织前端、后端和共享类型。

## 核心文档

- `当前工作区/.monkeycode/docs/ARCHITECTURE.md`：系统架构、目录结构和模块边界
- `当前工作区/.monkeycode/docs/INTERFACES.md`：当前 API 契约、共享类型和品牌上下文约定
- `当前工作区/.monkeycode/docs/DEVELOPER_GUIDE.md`：本地开发、验证和后续任务入口
- `当前工作区/.monkeycode/docs/DELIVERY_CHECKLIST.md`：交付检查清单、验证命令和当前预览状态
- `当前工作区/.monkeycode/docs/GEO_PLATFORM_VISUAL_USER_GUIDE.md`：当前版新手教程，包含平台地图、页面布局、八阶段闭环、30 分钟小闭环、逐页操作、状态说明和故障处理
- `当前工作区/.monkeycode/docs/宣传资料/GEO_MARKETING_CAMPAIGN_PACK.md`：面向中小企业的小红书与微信公众号宣传内容包，包含 10 组双平台文章、10 张配套生图提示词和发布排期
- `当前工作区/.monkeycode/docs/宣传资料/GEO_GPT_IMAGE_2_PROMPTS.md`：20 条高醒目度 GPT Image 2.0 生图提示词，覆盖认知冲击、问题诊断、方法工具和行动转化四组主题
- `当前工作区/.monkeycode/docs/宣传资料/GEO_GPT_IMAGE_2_PROMPTS_V1.md`：第一版 10 条统一 SaaS 视觉提示词，作为历史参考保留
- `当前工作区/.monkeycode/docs/宣传资料/GEO_SHORT_VIDEO_SCRIPT_PACK.md`：面向小红书和视频号的 10 条短视频脚本，包含核心口播、分镜、字幕、封面、CTA 和拍摄剪辑清单
- `当前工作区/.monkeycode/docs/INNER_TEST_USER_GUIDE.md`：历史内测流程说明，保留早期页面名称和测试操作记录
- `当前工作区/.monkeycode/docs/LLM_API_TECHNICAL_PLAN.md`：大模型 API 接入技术规划，覆盖自动生成监测问题、回答解读、内容生成、优化计划、调用审计和分阶段实施
- `当前工作区/.monkeycode/docs/DEPLOYMENT_RUNBOOK.md`：生产试运行部署、健康检查、回滚和排障手册
- `当前工作区/.monkeycode/docs/PILOT_DEMO_CHECKLIST.md`：试点客户演示数据、演示路径、验收清单和反馈转需求记录格式
- `当前工作区/.monkeycode/docs/CONTINUOUS_ITERATION_PLAYBOOK.md`：阶段复盘、反馈转需求、行业规则变化和验证门禁机制

## 规格文档

多品牌 GEO 管理平台规格位于 `当前工作区/.monkeycode/specs/multi-brand-geo-platform/`。

- `requirements.md`：需求与验收标准
- `design.md`：技术设计与正确性属性
- `tasklist.md`：开发任务清单
- `development-blueprint.md`：工程落地蓝图
- `api-data-spec.md`：API 与数据契约
- `database-schema.md`：数据库 schema 规划
- `ui-wireframes.md`：后台页面线框
- `product-design-plan.md`：产品设计规划

第二阶段数据持久化规格位于 `当前工作区/.monkeycode/specs/geo-platform-persistence/`。

- `requirements.md`：数据持久化需求与验收标准
- `design.md`：Prisma repository 技术设计
- `tasklist.md`：第二阶段数据持久化任务清单

第三阶段真实 AI 平台集成与异步任务规格位于 `当前工作区/.monkeycode/specs/ai-platform-async-tasks/`。

- `requirements.md`：真实 AI Adapter、异步任务、调用审计和失败重试需求
- `design.md`：Adapter registry、worker、queue、audit 和数据模型设计
- `tasklist.md`：第三阶段实施任务清单

第四阶段权限、审计与生产化规格位于 `当前工作区/.monkeycode/specs/access-audit-production/`。

- `requirements.md`：真实用户、组织、角色、审计和生产试运行需求
- `design.md`：组织权限、审计日志、权限策略和健康检查设计
- `tasklist.md`：第四阶段实施任务清单

第五阶段产品体验、性能和商业化能力规格位于 `当前工作区/.monkeycode/specs/product-experience-performance/`。

- `requirements.md`：页面体验、性能、报告、顾问工作台和试点演示需求
- `design.md`：路由拆包、页面状态、报告模板、顾问工作台和演示清单设计
- `tasklist.md`：第五阶段实施任务清单

持续开发阶段规划位于 `当前工作区/.monkeycode/specs/geo-platform-roadmap/`。

- `requirements.md`：第二阶段、第三阶段和后续阶段规划需求
- `design.md`：阶段边界、门禁和跨阶段规则
- `tasklist.md`：持续开发总任务清单

小白友好 GEO AI 回复监测与增长优化流程规格位于 `当前工作区/.monkeycode/specs/beginner-friendly-geo-workflow/`。

- `requirements.md`：品牌资料上传导入、自动生成监测问法、AI 平台连接、浏览器辅助监测、手动兜底、业务化结果解释和 GEO 增长优化闭环需求
- `design.md`：小白友好 GEO 流程、平台连接、增长优化和安全边界设计
- `tasklist.md`：小白友好 GEO AI 回复监测与增长优化流程实施任务清单

大模型 API 接入实施计划位于 `当前工作区/.monkeycode/specs/llm-api-integration/`。

- `tasklist.md`：统一 LLM 调用基础、自动生成监测问题、回答解读、内容生成和优化计划增强的实施任务清单

竞品地图发现规格位于 `当前工作区/.monkeycode/specs/competitor-map-discovery/`。

- `requirements.md`：地图 POI 辅助发现、候选评分、人工确认和竞品监控衔接需求
- `design.md`：发现 API、候选评分、候选仓储、竞品档案扩展和前端评审界面设计
- `tasklist.md`：竞品地图发现第一版内测闭环、地图 Provider 接入和后续工作流联动任务

AI 可见性运营 Sprint 重构规格位于 `当前工作区/.monkeycode/specs/ai-visibility-sprint-refactor/`。

- `requirements.md`：问题雷达、真实 AI 回复监测、品牌标准答案对照、内容缺口、内容资产、发布准备、复测和趋势需求
- `design.md`：Sprint 聚合层、阶段状态、指标摘要、数据边界和共享类型设计
- `tasklist.md`：Sprint 契约、仓储、API、问题雷达、标准答案、对照分析、内容资产、复测和前端工作台实施任务

内测可用性优化规格位于 `当前工作区/.monkeycode/specs/inner-test-usability-hardening/`。

- `requirements.md`：内容草稿质量、去测试痕迹、内测闭环、能力提示和反馈入口需求
- `design.md`：内容生成 fallback、显示标签、发布草稿和外部能力扩展设计
- `tasklist.md`：当前已完成内容质量、中文化、竞品发现、反馈入口、平台配置向导、Markdown/DOCX/文本型 PDF 正文解析、浏览器辅助监测真实回答回填，以及授权后的自动或半自动发布直连框架

GEO 成熟产品体验重构规格位于 `当前工作区/.monkeycode/specs/2026-07-14-geo-mature-product-ux-refresh/`。

- `benchmark-analysis.md`：30 张成熟 GEO 产品参考截图的页面范式和借鉴边界
- `requirements.md`：任务型应用壳、共享页面模板、统一视觉层级和连续性需求
- `design.md`：页面模板、视觉令牌、状态模型、正确性属性和交付顺序
- `tasklist.md`：全页面 UX 重构实施清单

GEO 产品体验精修规格位于 `当前工作区/.monkeycode/specs/geo-product-experience-refinement/`。

- `requirements.md`：品牌资料、监测、内容发布、分析诊断和全局用词需求
- `design.md`：闭环信息架构、页面设计、显示标签和正确性属性
- `tasklist.md`：产品体验精修实施清单，当前已完成导航与术语测试、品牌资产中心与资料完整度体验、监测对象和用户意图列表、AI 回复监测创建与真实回复边界、内容运营、自有媒体与发布运营、分析诊断边界测试、全局 UI 治理、后端持久化与安全边界，以及首轮闭环和异常修正自动化端到端测试

平台内可视化使用教程规格位于 `当前工作区/.monkeycode/specs/in-app-visual-user-guide/`。

- `requirements.md`：全局教程入口、八阶段可视化闭环、业务地图、术语和故障处理需求
- `design.md`：教程抽屉组件、现有导航数据复用、响应式行为和测试策略

## 现有历史文档

- `当前工作区/.monkeycode/docs/商业地产报告案例语言结构与去AI化总结.md`
- `当前工作区/.monkeycode/docs/mini-program-release-plan.md`
