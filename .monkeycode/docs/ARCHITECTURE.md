# 系统架构文档

## 当前架构

多品牌 GEO 管理平台工程位于 `当前工作区/`。当前阶段已完成应用骨架、权限基础能力、品牌工作区、官网快速接入、品牌知识库、多来源素材导入、GEO 优化单元管理、用户意图库、Prompt 模板生成、AI 平台配置、Adapter 边界、GEO 监测运行、原始回答记录、AI 回答解析、平台评价、人工复核、GEO 指数计算、看板数据、GEO 画布工作台、竞品监控与压制分析、引用来源分析、评价分析、内容策略中心、内容生成工作台、发布中心、任务复测中心、报告中心、顾问服务工作台和第一版运营后台页面串联，覆盖前端、后端、共享类型、数据库 schema、基础路由、API 边界、错误响应、品牌上下文注入和品牌访问校验。

LLM 模块的 Provider 治理由 `ProviderGovernanceService` 和 `QuotaService` 共同负责。组织级 Provider 配置按组织、平台和用途隔离；LLM 同步任务进入 Adapter 前按用户、组织和全局 scope 创建额度预占，完成后按 token 用量结算，失败路径释放预占。`QuotaAccount` 保存余额聚合，`UsageReservation` 保存任务级幂等预占，`UsageLedgerEntry` 保存追加式结算和释放事件。

`JobOrchestratorService` 复用持久化 `AsyncJob` 作为统一长任务边界。任务保存幂等键、当前步骤、JSON 进度、错误类别、重试次数和最终结果摘要；监测、内容生成和 LLM 异步执行可逐步迁移到该编排服务，现有 Worker 状态机继续兼容 `queued`、`running`、`succeeded`、`failed` 与 `retry-exhausted` 状态。

`RuntimeOperationsService` 提供品牌范围运行中心聚合，统一读取 Provider、任务、额度、发布账号和依赖状态，并委托 `JobOrchestratorService` 执行受权限约束的单任务重试；取消操作保留任务终态，避免 Worker 继续覆盖运营人员的决定。

周期运营由 `OperationCycleService` 管理站点审计、监测、任务验收、报告和交付包五个可恢复步骤。`DeliveryBundleService` 从 `Report.snapshot` 冻结数据导出 HTML、PDF、Markdown、CSV 并保存 manifest 完整性边界。`ClientPortalService` 使用单品牌有效期读取授权，跨品牌比较同时校验统计周期、口径版本和基线版本。`ContextualGuidanceService`、`ErrorRecoveryService` 和 `InfrastructureBoundaryService` 分别提供品牌状态指导、公开错误恢复与渐进 Adapter 选择；`PublicBrandProfileService` 通过确认字段白名单、预览令牌和发布状态机控制公开档案。

Provider 选择顺序由服务层按优先级和平台代码稳定排序，避免存储实现的返回顺序影响故障转移。额度、任务和运行中心的联合测试锁定预占终态、组织隔离、公开凭据脱敏和操作范围。

```text
geo-platform/
├── apps/
│   ├── web/                  Vite + React 前端应用
│   └── api/                  NestJS API 服务
├── packages/
│   └── shared-types/         前后端共享 TypeScript 契约
├── package.json              npm workspaces 根配置
├── tsconfig.base.json        统一 TypeScript 基础配置
└── .env.example              后端环境变量样例
```

## 前端

前端位于 `当前工作区/apps/web/`。

已建立内容：

- `src/main.tsx`：React 应用入口，接入 TanStack Query
- `src/app/App.tsx`：React Router 路由入口，使用 Suspense 提供统一 route loading fallback
- `src/app/WorkspaceRouteRedirect.tsx`：品牌工作区路由别名重定向，将 `/brands/:brandId/*` 同步到当前品牌上下文并跳转到第一版页面；重定向保留原链接的 query 和 hash，使品牌化链接中的监测问题、内容任务、发布记录和页面区块定位继续有效
- `src/app/routePaths.ts`：第一版页面路径和新手动作链路由协议；集中生成问题文本、优化单元、用户意图、监测问题、真实回复运行、内容任务、发布记录和再次监测任务的 query 参数，并使用 hash 定位监测问题、手动录入、监测记录、标准答案诊断和优化计划区块，避免页面跳转丢失业务对象上下文。`brandMonitoringPath` 与 `brandGrowthOptimizationPath` 生成携带品牌别名、问题和目标区块的首页深链；`workflowStagePath` 为应用壳的相邻阶段入口重新编码已识别的 `WorkflowRouteContext`
- `src/app/filterQuery.ts`：统一列表筛选 query 协议，读写 `q`、`from`、`to`、`platform` 和 `status`，归一化日期、平台和状态值；合并或清空筛选时保留工作流对象、Tab 和其他现有 query 上下文
- `src/layouts/navigation.ts`：后台导航分组、八阶段主链路和品牌工作区路由别名配置；一级导航固定为“工作台、品牌信息、内容中心、发布中心、数据分析”五个业务域，覆盖 24 个第一版页面。数据总览、营销画布、AI 平台管理和内测反馈归入工作台；品牌信息、竞品信息、优化单元、用户意图和 AI 回复监测归入品牌信息；优化建议、内容生成、内容优化、内容策略、内容资产和顾问服务归入内容中心；自有媒体、媒体平台、发布记录和再次监测归入发布中心；竞品分析、评价分析、信源分析、事实分析和报告中心归入数据分析。`getNavigationGroup` 根据 pathname 返回当前业务域，`getLatestNavigationOpenKeys` 将桌面菜单限制为最多展开一个域，`getContextualWorkflowSteps` 仅为主链路页面生成上一、当前和下一阶段，并通过 `workflowStagePath` 保留工作流对象上下文
- `src/layouts/AppLayout.tsx`：响应式应用壳、品牌选择器、品牌上下文提示和场景化流程入口；768px 起使用可在 248px 与 72px 间切换的桌面侧栏，767px 及以下改用左侧抽屉导航。桌面侧栏与移动抽屉复用五个业务域及一次展开一个的受控菜单状态，路由变化自动展开当前域并关闭移动抽屉；遮罩、Escape 和取消关闭后焦点返回导航触发按钮，菜单路由跳转后焦点进入新页面主内容。应用壳提供“跳到主内容”键盘入口，主内容是可编程聚焦区域。品牌信息、优化单元、用户意图、AI 回复监测、优化建议、内容生成、发布记录和再次监测八个主链路页面展示相邻阶段导航，其余高级分析、管理和支持工具页面隐藏该区域。全局头部只承载导航控制、当前业务域和品牌切换，页面标题与用途说明由页面内容区负责。应用壳同时把当前品牌的服务端能力摘要注入 `BrandCapabilityProvider`，业务页通过资源级 Hook 控制写操作状态
- `src/layouts/UserGuideDrawer.tsx`：应用壳全局“使用教程”抽屉；复用八阶段工作流和五大业务区导航数据，展示首次小闭环、阶段目标、操作步骤、完成标准、功能地图、术语和故障处理，并允许用户从阶段卡片直接进入现有业务页面。桌面端使用 720px 右侧抽屉，移动端使用全宽抽屉，打开和关闭过程保留当前品牌与当前业务路由
- `src/layouts/AppShellState.ts`：应用壳断点 helper、轻量 resize hook 和交互状态 reducer；`getAppShellMode` 固定 768px 移动/桌面边界，`getAppShellGutter` 将 390px、768px、1024px 和 1440px 视觉审查宽度映射到移动、平板和桌面页面边距层级，`reduceAppShellInteraction` 统一桌面侧栏折叠、移动抽屉开关和路由后关闭行为
- `src/stores/brandContextStore.ts`：Zustand 品牌上下文状态
- `src/api/http.ts`：统一请求封装，向 API 注入 `x-brand-id`
- `src/api/brandContext.property.test.ts`：正确性属性 P1 确定性生成测试，对 24 个合法品牌标识和开始、监测、内容、发布、分析、支持工具六个任务域生成 144 组主数据请求，逐组验证品牌化 URL 与当前 `x-brand-id` 一致；测试结束恢复默认品牌上下文，测试名使用 `validatesCriteria` 标注需求 8.1
- `src/components/PageState.tsx`：页面状态组件，保留 API 错误 Alert、基础空状态和 `BusinessEmptyState` 兼容接口，并新增 `GuidedEmptyState`、`RegionErrorState`、`PageSkeleton`、`PartialDataNotice` 和常见恢复动作映射；引导式空态固定说明当前原因、业务影响、完成收益、单一主操作和可选辅助说明，业务空态统一说明缺少内容、影响范围、建议下一步和完成收益，区域错误、页面骨架和部分数据提示可分别进入 `ProductPage` 状态插槽
- `src/components/ProductPage.tsx`：统一页面骨架，导出 `ProductPage`、`ProductPageHeader` 和 `ProductPageSection`；集中承载页面标题、用途说明、品牌上下文、主操作、辅助操作、加载状态、部分数据提示、错误提示和内容分区；991px 及以下将页头、主操作和区块操作转为纵向布局，767px 及以下保持主操作全宽可见
- `src/components/UnifiedFilterBar.tsx` 和 `src/components/PlatformSwitch.tsx`：统一搜索、日期范围、状态、结果计数、清空筛选和平台切换布局；平台切换固定覆盖全部平台、豆包、Kimi、DeepSeek、通义千问和阶跃星辰，并使用受控值供业务页面写回 URL query；`extraFilters` 与 `hasAdditionalFilters` 支持内容任务等业务列表在统一清空语义下追加目标渠道筛选
- `src/components/MetricSummaryGrid.tsx`：统一二到五列指标概览，支持值、单位、状态、说明和骨架状态，平板降为两列，移动端降为单列
- `src/components/InsightOverview.tsx`：导出关键结论 `InsightOverview` 和明细区域骨架 `InsightDetailSection`，统一结论等级、发现列表、动作区、结果计数和宽表格滚动容器
- `src/features/analysis/components/AnalysisWorkbench.tsx` 和 `AnalysisScopeBar.tsx`：分析域共享页面骨架与范围筛选层；页面固定按分析范围、关键结论、趋势与分布、证据明细和建议动作组织，范围栏在 `UnifiedFilterBar` 上追加优化单元与用户意图筛选。共享骨架支持部分数据提示和可替换内容状态，使空样本进入采集路径、样本不足保留可用分析并进入补资料路径。竞品、评价、事实、信源和增长优化页面复用同一层级及 URL scope，未知深链接对象只显示当前业务上下文文案
- `src/features/analysis/AnalysisDomainPages.test.tsx`、`components/AnalysisScopeBar.test.tsx` 和 `components/AnalysisWorkbench.test.tsx`：分析诊断域组件回归层；通过预置 React Query 缓存与 `MemoryRouter` 静态渲染竞品、评价、事实、信源和增长优化五个入口，验证结论、趋势与分布、证据、空态、任务化动作和平台范围过滤，并覆盖未识别来源、事实依据缺失、负向评价与竞品压制边界。范围栏测试直接触发平台按钮回调，并验证筛选 query 合并后继续保留来源运行和优化计划上下文；共享工作台测试覆盖完整层级、持续观察状态、任务组件替换默认建议和恢复状态替换正文
- `src/features/analysis/analysisScopeQuery.ts`：分析域 URL 状态适配层，在统一 `q`、`from`、`to`、`platform` 和 `status` 筛选上增加 `optimizationUnitId` 与 `intentId`；合并和清空操作保留其余工作流 query，页面路由继续保留当前 hash
- `src/components/WorkspaceState.ts`：创建工作台、资产库和管理列表共用的五态协议，统一 `ready`、`loading`、`empty`、`partial` 和 `error` 的内容可见性；`getQueryGroupWorkspaceState` 将多查询页面汇总为互斥状态，全部请求失败进入阻断错误，部分成功或仍有补充请求加载时保留成功内容并进入部分数据状态；完整度限制到 `0-100` 的整数范围
- `src/components/CreationWorkspace.tsx`：左配置、右结果的创建工作台模板；配置区在所有状态下保持可编辑，结果区按共享五态显示骨架、空态、部分数据提示、错误提示或真实结果，1199px 及以下转换为单列并可指定配置优先或结果优先
- `src/components/AssetLibrary.tsx`：分类导航与资料编辑区模板；统一总完整度、分类计数、分类完整度和分类状态，991px 及以下将分类导航转换为带当前分类提示的可展开选择，并在选择后自动收起；单列布局继续支持导航优先或编辑区优先
- `src/components/ManagementListPage.tsx`：管理列表页面模板，组合 `ProductPage`、摘要、筛选和 Ant Design `Table`；宽表格具有横向滚动边界，767px 及以下通过粘性首列和末列保留关键字段及操作，`ManagementRowActions` 将高频行操作限制为最多两个，其余操作由更多操作插槽承载
- `src/components/AccessibleDropdown.tsx`：全站更多操作与准备动作菜单的受控触发器；统一注入上下文 `aria-label`、`aria-haspopup="menu"` 和动态 `aria-expanded`，使菜单用途与展开状态可被键盘和辅助技术识别
- `src/utils/displayLabels.ts`：运营侧显示标签和业务术语解释 helper，集中维护带 code、名称和图形标记的五个平台选项，以及优化单元、用户意图、真实 AI 回复、信源分析和事实分析等文案
- `src/features/brand-workspace/pages/BrandWorkspacePage.tsx`：工作台与品牌工作区路由容器；`/brands` 以“数据总览”标题使用统一 `ProductPage` 展示行动型品牌主页，`/brands?quickStart=1` 在同一路由进入快速接入向导，避免增加一级导航；高级运营工作台、Sprint、首轮流程、自动化运营员、品牌管理和完整业务卡片收纳到默认关闭的二级折叠区；品牌创建和编辑表单由路由容器统一维护，资料区只保留进入品牌资料分类编辑或导入工作区的上下文入口；页面按已启用查询汇总加载、部分数据和阻断错误，部分失败继续保留可用模块与当前操作；`/brand-profile`、`/user-intents` 和 `/optimization-units` 分别以“品牌信息、用户意图、优化单元”标题渲染对应聚焦模块
- `src/features/brand-workspace/components/QuickStartWizard.tsx` 和 `quickStartState.ts`：官网信息、事实确认、问题选择和执行准备四步快速接入界面；按步骤独立保存并通过 GET 恢复，事实卡展示原始值、编辑值、置信度、确认状态和官网来源证据。官网步骤在浅层发现后展示来源页面计划，每项提供 URL、标题、资料角色、选取原因、纳入开关和处理状态，支持同源页面新增、移除、角色调整及失败项定向重试；页面明确说明范围确认阶段不会访问候选页面。关键事实确认后展示品牌、品类、地域、购买决策、竞品比较和用户痛点六类默认问题，支持编辑、启停及跳转用户意图页查看更多；执行准备展示目标平台、连接状态、预计样本数、耗时、执行方式和下一步。保存使用服务端 `version` 乐观锁，409 冲突时刷新远端会话；品牌切换会加载目标品牌会话。官网发现失败时保留已填写信息、失败状态和人工确认路径，未确认关键事实时阻止完成执行准备；完成准备后携带新建 `TestPlan` 标识进入 AI 回复监测并恢复该计划
- `apps/api/test/quick-start-provenance.property.test.ts`、`quick-start.service.test.ts` 与 Web 快速接入测试：覆盖会话创建、四步独立保存、离页恢复、version 冲突、品牌隔离、只读权限、官网发现成功与失败、关键资料门禁、六类问题、执行准备、计划创建和首轮监测深链。P12 属性测试使用多组发现内容和全部四种确认状态，验证每个候选事实持续保留服务端原始值、来源标识、来源类型、URL、标题和证据摘录
- `src/features/brand-workspace/components/BeginnerHomePanel.tsx` 和 `BeginnerHomeState.ts`：行动型品牌主页查询容器、可独立渲染的 `BeginnerHomeContent` 与深链映射；读取 `BrandActionDashboard` 后首屏只展示一个服务端权威主行动、最多三项待办、最近有效样本和本周期效果。资料阻断会展示影响范围与恢复动作，部分来源失败会保留成功数据并提示刷新；查询在页面挂载和窗口重新聚焦时刷新。`getBrandActionPath` 复用 `workflowStagePath` 并编码品牌标识，持续传递优化单元、用户意图、问题、Prompt、监测运行、任务、生成任务、版本和发布记录上下文
- `src/features/brand-workspace/components/BrandPortfolioPanel.tsx`：独立多品牌管理区域；品牌资产卡按品牌读取现有首页聚合数据，只展示品牌名称、启停状态、资料完整度、首轮监测状态和一个切换或查看资料的高频动作。编辑与启停通过 `getBrandMoreActionItems` 统一收进“更多”菜单；有品牌时在区域标题提供唯一新建入口，空数据时由行动型空状态接管同一入口
- `src/features/brand-workspace/pages/workspaceModules.ts`：二级运营工具模块矩阵 helper，将 `BrandWorkspaceSnapshot` 计数映射为业务模块卡片
- `src/features/brand-workspace/pages/sprintWorkspace.ts`：品牌工作区 Sprint 展示 helper，将 Sprint 状态、阶段状态、下一步动作、阶段进度和指标摘要映射为用户可理解的工作台文案与路由
- `src/features/brand-workspace/components/BrandKnowledgeCard.tsx`：基于共享 `AssetLibrary` 的品牌资料资产库；左侧固定展示基础信息、产品服务、目标用户、事实知识和媒体素材五类导航，右侧按当前分类复用紧凑表单、来源状态表或媒体资产列表。基础信息按品牌定位、差异化与可信证明分组并提供示例和字数提示；产品服务使用可重复条目卡、资料状态和 FAQ 摘要；目标用户使用画像卡维护决策阶段、关注问题、常见表达及已启用高价值意图关联。事实知识进一步按推荐表达、禁用表达、内容规则、竞品信息和资料来源分组，右侧统一提供搜索、审核状态筛选、来源与更新时间；媒体素材使用同构资产列表展示素材类型、适用平台、关联内容、来源和审核状态。空分类提供上传、手动录入和示例结构入口。分类编辑以保存品牌资料作为唯一主操作；保存和导入确认后统一展示完整度变化、结果影响、创建监测对象与开始监测动作
- `src/features/brand-workspace/components/BrandImportWorkspace.tsx`：品牌资料资产库右侧的文件导入工作区；负责 Markdown、DOCX、文本型 PDF 上传、知识来源解析、导入状态、识别完整度、置信度、待确认字段、缺失影响和确认写入，并在扫描件、加密或损坏文档失败时提供明确原因和手动填写恢复入口。字段编辑 helper 保持字符串、字符串数组和 FAQ 数组的现有确认 API 契约
- `apps/api/src/modules/brands/document-text-extractor.service.ts`：品牌文档正文提取边界，使用 Mammoth 从 DOCX Buffer 提取段落，使用 pdf-parse v2 从文本型 PDF 提取分页正文并在 `finally` 释放 parser；上传阶段校验扩展名、MIME、PDF/ZIP 文件签名和 Markdown UTF-8 文本，限制 PDF 为 200 页、正文为 50 万字符，统一处理旧 DOC、二进制 Markdown、扫描件、加密文件和损坏文档
- `apps/api/src/modules/brands/brand-import.service.ts`：将受控上传目录内的 Markdown、DOCX 和 PDF 正文转换为 `BrandImportDraft`；非 Markdown 文档的独立章节标题先转为结构化标题，再复用品牌名称、行业、简介、卖点、产品、背书、目标客户、表达规则、竞品和 FAQ 字段抽取。解析路径必须是 `uploads/brand-imports` 根目录下的单文件，失败草稿由控制器同步持久化到知识来源状态
- `src/features/brand-workspace/components/brandProfileEditor.ts`：品牌资料结构化表单与现有字符串数组 API 的适配层；负责产品服务条目、目标用户画像标签串和 FAQ 摘要的解析、过滤与序列化，旧版目标用户纯文本会作为画像名称加载；同时将品牌事实、资料来源和媒体素材映射为统一资产行模型，归一化审核状态并支持名称、来源、类型、平台、关联内容和审核状态筛选
- `src/features/brand-workspace/components/OptimizationUnitsCard.tsx`：基于 `ManagementListPage` 的监测对象管理页，提供唯一新增入口、名称或关键词搜索、类型、优先级和启停状态筛选、关联计数及监测表现提示；每行只展示创建用户意图和开始监测两个高频动作，生成内容、查看分析和编辑收纳到更多菜单，所有跳转继续携带当前优化单元上下文
- `src/features/brand-workspace/components/UserIntentPromptCard.tsx`：基于 `ManagementListPage` 的用户意图与监测问题管理页，提供唯一用户意图创建入口、意图或关联对象搜索、分类和启停状态筛选；自动生成与模板创建收纳为准备动作，模板选择和批量生成位于列表区域。每行只展示手动检测和自动监测，生成内容、检测记录和引用来源收纳到更多菜单；从优化单元进入时继续自动打开创建弹窗并预选单元，全部业务跳转保留优化单元、用户意图和监测问题上下文
- `src/features/canvas/pages/GeoCanvasPage.tsx`：定位为高级分析工具的关系分析画布，使用 `ProductPage` 和 ReactFlow 渲染优化对象、用户意图、平台表现和内容策略节点。页面保留左侧分析对象、中央关系链路和右侧节点详情三栏结构，首屏提供首次使用引导、四类节点图例、缩小、放大和全图定位工具；三个创建入口收纳到“新建关联对象”菜单。左侧对象使用原生按钮和 `aria-pressed` 支持键盘选择，React Flow 节点与边提供业务化可访问名称，画布下方使用同源节点与连接数据生成完整文字清单。节点详情将高频动作统一为查看真实回复、生成内容和再次监测，并通过 `buildNodeWorkflowPaths` 将节点的优化对象、用户意图、问题及已有工作流 query 映射到下游路由；创建弹窗关闭后焦点返回实际触发元素
- `src/features/canvas/pages/GeoCanvasPage.test.ts`：关系分析画布工作流、组件和语义测试，覆盖优化对象、用户意图和内容策略节点进入真实回复、内容生成及再次监测时的上下文与 hash 保留，高级工具定位、首次使用引导、四类节点图例、缩放定位工具、默认节点详情、三条工作流入口，以及节点状态与全部连接关系的文字描述
- `src/features/monitoring/pages/MonitoringPage.tsx`：基于 `ProductPage`、`InsightOverview`、`MetricSummaryGrid` 和 `PlatformSwitch` 的 AI 回复监测看板；首屏按关键结论、真实回复数、品牌提及率、Top 3 推荐率、引用命中率、回答日期趋势和平台回复分布组织，通过共享 `hasRealMonitoringResponseSample` 只使用非 `mock_ai` 且原始文本去除空白后仍有内容的真实样本。平台切换写入统一筛选 query 并更新结论、指标、趋势、分布和回复明细范围；指标摘要、每个日期趋势点与每个平台分布行通过 `SampleEvidencePanel` 按需回放当前范围的原始样本。`MeasurementDisciplinePanel` 将无提示发现与品牌探测分区展示：前者只计算无提示提及率、首位推荐率和 Top 3 推荐率，后者独立计算品牌识别率、事实准确度和自有域名引用率；独立序列表格同时展示市场、API/Web/App 访问端、采集方式、平台、模型、语言、联网状态和基线版本。监测主题与问题、计划执行、回复明细和高级工具通过四个 Tab 渐进展开。开始监测是页面唯一主操作，手动录入和平台配置作为辅助路径；消费工作流 query/hash 后继续定位监测问题、手动录入和回复记录，并保留进入优化或内容任务的上下文
- `src/features/monitoring/components/MeasurementDisciplinePanel.tsx`：指标完整性区展示仅按已测项重新归一的复合指标、同市场平台比较资格，以及基于连续可比快照的单期观察或趋势状态；平台和趋势结果均保留原始运行证据入口
- `src/features/monitoring/components/MonitoringRecoverySummary.tsx`：AI 回复监测统一恢复状态层，组合监测计划连接摘要、公开平台状态和监测运行，将缺少真实样本、浏览器待确认、手动待录入、平台待配置和运行失败映射为原因、指标影响、恢复动作及目标 Tab；状态随当前平台筛选收窄范围。恢复区持续展示自动监测、浏览器辅助监测和手动录入三条真实回复路径，自动路径按 API 就绪状态判断，浏览器路径按平台能力判断，手动录入保持可用
- `src/features/growth-optimization/pages/GrowthOptimizationPage.tsx` 和 `AnalysisFindingCards.tsx`：以“优化建议”为页面标题承载增长优化计划与统一诊断工作台，顶层复用分析骨架与 URL scope，并读取 `GrowthOptimizationWorkspace` 和 `AnalysisDiagnosisDashboard`。四类竞品、评价、信源和事实 finding 统一展示结论类型、严重程度、用户意图、平台、证据摘要、推荐动作和关联任务入口；计划按优先问题、原因证据、推荐动作、关联内容和复测状态组织，内容建议沿生成任务关联发布记录计算发布状态，复测区展示计划时间和最新结果；诊断、内容建议和复测宽表均显式启用横向滚动。确认计划、生成内容任务、更新标准答案依据、安排发布和再次监测均通过 `workflowStagePath` 保留当前优化单元、平台、计划及来源运行上下文
- `src/features/growth-optimization/pages/growthSprintDiagnostics.ts`：Sprint 标准答案与内容缺口诊断 helper，将真实 AI 回复、品牌标准答案和内容资产准备状态合成为优化计划页的只读诊断行
- `src/features/tasks/pages/TaskRetestPage.tsx`：基于 `ManagementListPage` 的再次监测行动任务页；将底层任务状态、复测记录和 Sprint 复测趋势统一映射为待处理、待复测、已改善和继续优化四类行动状态，支持原问题、发布记录、账号、下一步和行动状态筛选。列表组合 `TaskBoardDashboard.tasks` 与 `SprintRetestTrendDashboard.items`，展示来源发布记录、原问题、负责人、计划时间，以及优化前后提及率、品牌排名、表达准确率和引用率；复测证据按等待启动、采集中、分析中、已改善、持平和已退化展示。每行提供启动同题再次监测、查看采集进度和刷新证据验收动作，人工表单只保存目标值和备注。从发布记录或品牌主页进入时，`taskId` 会将目标任务置顶并高亮；查看采集进度时通过 `workflowStagePath` 保留完整工作流 query 并定位监测记录区块
- `src/features/tasks/pages/sprintRetestTrend.ts`：Sprint 复测趋势 helper，负责指标基线、当前值、差值和复测状态展示格式化
- `src/features/competitors/pages/CompetitorAnalysisPage.tsx`：按路由拆分竞品信息管理和竞品分析两类任务；`/competitor-profile` 使用“竞品信息”标题和 `ManagementListPage` 维护竞品档案并承接地图发现、候选确认和排除，`/competitors` 复用统一分析骨架与 scope，首屏展示竞品提及率、当前范围品牌平均推荐排名和压制风险，再按真实对比证据聚合竞品趋势、AI 平台矩阵、高风险用户意图及对比明细。趋势和平台矩阵按监测运行去重，避免单次回答提及多个竞品时重复计算排名和压制风险；筛选覆盖日期、平台、压制状态、优化单元、用户意图和搜索文本，行级任务、内容和再次监测动作继续携带问题、Prompt、运行、平台与来源工作流上下文
- `src/features/model-settings/pages/ModelSettingsPage.tsx`：AI 平台管理页使用平台卡片聚合默认平台与自定义配置，主区域只展示平台名称、脱敏连接状态、可用监测方式、最近验证结果、用户可理解的下一步和唯一连接或管理动作；接口地址、模型参数、调用限制、密钥录入和连接检查收纳在管理弹窗
- `src/features/citations/pages/CitationAnalysisPage.tsx`：信源分析页面复用统一分析骨架与 scope，首屏展示真实回复引用率、官网引用率和权威来源占比，再展示来源类型分布、真实回复引用率趋势和引用证据明细；原 `contentCitationRate` 明确作为内容资产绑定率保留。证据按搜索、日期、平台和内容资产绑定状态组合过滤，行级内容、增强和再次监测动作保留来源工作流上下文；来源标题或地址为空时分别显示“未识别来源”和“来源地址待补充”。零真实样本展示开始监测路径，一至两条样本保留现有分析并提示补充品牌事实与权威资料
- `src/features/evaluations/pages/EvaluationAnalysisPage.tsx`：评价与事实分析页面复用统一分析骨架与 scope。`/evaluations` 首屏展示正向、中性、负向和准确表达率，再展示评价趋势、表达问题分布和问题证据；`/facts` 只使用错误信息、准确性偏低和禁用表达三类事实风险，首屏展示事实风险、高风险事实、受影响意图和事实准确表达率，再展示事实准确性趋势、风险分布、失真信息、证据、用户意图和可执行修正建议；问题文本或修正表达为空时显示补充事实依据与人工确认提示。日期、平台和处理状态同步收窄对应证据，行级修正策略、品牌资料更新、内容补强和再次监测入口保留 Prompt、运行、平台及来源工作流上下文。零真实样本进入开始监测路径，一至两条样本展示补资料提示
- `src/features/content/pages/ContentCenterPage.tsx`：内容策略与内容资产统一管理页面。内容资产区使用 `ManagementListPage` 和 `UnifiedFilterBar`，读取品牌级 `ContentOperationDashboard.assets`，支持标题或关键词搜索、资产状态、类型、平台、审核、发布和复测状态组合筛选；列表展示审核状态、发布状态、复测状态和真实发布统计，保留继续编辑、发布准备和再次监测三个工作流动作。策略查询加载或失败时，内容资产、筛选和编辑输入保持可用，覆盖率不使用零值伪装真实结果，并提供单点恢复动作；策略成功后展示关键词覆盖率、未覆盖关键词、策略建议和内容策略
- `src/features/content-generation/pages/ContentGenerationPage.tsx`：内容生成、编辑与优化工作台；顶部内容任务区使用 `ManagementListPage` 与 `UnifiedFilterBar` 统一标题搜索、生成状态、目标平台、结果计数、单一创建入口和行动型空状态，任务表只展示内容标题、模板、业务关联对象、目标平台、生成状态、真实发布时间及继续编辑、发布准备两个高频动作。发布时间由同品牌发布记录中关联任务的最新 `published` 记录计算，关联对象使用内容策略标题或业务状态文案，避免公开内部 ID。下方创作台复用共享 `CreationWorkspace`，桌面使用左配置右结果双栏，1199px 以下按配置、结果顺序纵向排列；左侧按目标与对象、模板与渠道、素材与依据、生成配置和发布检查五组配置，并将生成草稿动作固定在配置面板动作区，移动端使用底部粘性动作区保持可访问。模板选择按品牌宣传、问答、案例、教程、对比、科普和渠道内容七类组织 12 个模板，并将预设的 `contentType` 与 `targetPlatform` 写入现有任务表单。右侧先展示所选模板的产出预期，再统一承载任务加载、生成步骤、失败重试、草稿编辑、事实与合规风险、渠道发布检查、保存、导出和发布准备动作；工作台状态映射为 `loading`、`empty`、`error` 和 `ready`，失败时保留左侧配置。`/content-optimization` 模式在同一双栏工作台中增加现有内容资产选择、原文粘贴及结构优化、事实补强、FAQ 补充、引用补强、渠道适配目标，结果区按五类建议解释优化结果；优化上下文写入现有 `referenceSources`，无需扩展后端任务契约。页面可按 `taskId` 恢复当前任务，草稿通过质量检查后会生成真实发布准备载荷，用户确认后创建发布记录并进入发布中心定位该记录
- `src/features/publishing/pages/PublishingCenterPage.tsx`：按路由承载发布记录、自有媒体接入和媒体平台规则三类任务。`/owned-media` 使用 `ManagementListPage` 读取品牌级 `PublishingOperationDashboard.accounts`，支持账号名称搜索、发布渠道和授权状态组合筛选，展示账号名称、平台、接入方式、授权状态、最近验证、账号级发布统计和状态说明，并允许已授权历史账号切换人工、半自动或自动发布模式；过期、异常或未接入账号提供重新授权动作。`/media-platforms` 读取同一聚合模型的持久化 `platformRules`，展示内容格式、适用意图、发布频率、素材要求和注意事项，并支持跨规则字段搜索。`/publishing` 以“发布记录”为标题使用 `ManagementListPage` 读取 `PublishingOperationDashboard.records`、`performance` 和 `pendingRetestItems`，支持标题、正文、账号、真实链接、发布状态和发布渠道组合筛选；半自动记录提供显式立即发布动作，自动模式在记录创建后执行同一发布链，列表展示排队、发布中、成功或失败结果、真实链接和再次监测状态。再次监测入口通过 `workflowStagePath` 保留来源工作流上下文
- `src/features/tasks/pages/TaskRetestPage.test.ts`：再次监测页面 helper 测试，覆盖四类行动状态、六阶段证据状态、最新复测记录、来源发布记录与四项趋势指标聚合、组合筛选、筛选 query 保留、明确下一步及返回同题监测的完整工作流上下文
- `src/features/reports/pages/ReportCenterPage.tsx`：基于 `ManagementListPage` 的报告管理与阅读页面，支持生成单品牌周报、单品牌月报、多品牌对比和客户交付报告。报告生成默认选择最近七个 UTC 自然日，并在提交前调用范围预览接口展示监测运行、有效样本、内容资产、发布记录、任务变化、已完成再次监测和数据缺口；报告详情读取冻结快照，展示统计范围、口径版本、基线与观察窗口指标、优化任务、内容资产、发布渠道、真实链接和再次监测证据。列表继续使用 `UnifiedFilterBar` 组合筛选，Markdown 导出由浏览器基于当前报告内容生成
- `src/features/reports/pages/ReportCenterPage.test.tsx`：报告中心组件与 helper 测试，覆盖统一列表、独立详情阅读区、首份报告空态、组合筛选、业务状态、范围预览、月份跨越的默认七日周期、冻结统计范围、效果证据、真实发布链接、内部品牌及报告标识隐藏和安全 Markdown 文件名
- `src/features/advisor/pages/AdvisorWorkspacePage.tsx`：基于 `ManagementListPage` 的顾问服务任务与记录页面，支持新增品牌诊断、服务计划、服务复盘、客户交付、服务、培训、规则更新和顾问备注。页面将每条服务记录及其跟进事项映射为统一任务行，按标题、负责人、下一步、类型、状态和服务时间筛选；记录状态由跟进事项推导，负责人和下一步优先读取结构化正文，详情区域统一展示状态、负责人、服务或截止时间、下一步、关联报告、服务正文和全部跟进事项。新增服务记录是页面唯一主操作
- `src/features/advisor/pages/AdvisorWorkspacePageView.test.tsx`：顾问服务视图组件测试，覆盖统一任务列表、详情区域、单一行动型空态、记录与跟进事项映射、组合筛选、关联报告缺失及已完成跟进状态
- `src/features/feedback/pages/InnerTestFeedbackPage.tsx`：基于 `ManagementListPage` 和 `UnifiedFilterBar` 的内测反馈管理页；列表统一展示问题描述、页面、反馈类型、严重程度、状态、处理记录和更新时间，支持搜索、类型、严重程度、页面、状态及日期组合筛选。创建和更新表单沿品牌级反馈接口持久化严重程度，空列表通过行动型状态承接首条反馈创建
- `src/features/automation/components/AutomationOperatorCard.tsx`：复用 `ProductPageSection`、`PageSkeleton`、`PartialDataNotice`、`RegionErrorState` 和 `GuidedEmptyState` 的自动化运营员卡片；按任务包状态、步骤进度和确认队列组织最近任务包，将加载、接口失败、上下文缺失、空任务包、手动录入和执行失败映射为统一恢复状态。上下文缺失时使用业务提示替代内部品牌标识；步骤进度同时计入已完成与已跳过步骤，失败恢复保留当前步骤和服务端步骤消息，高风险确认继续进入现有确认抽屉
- `src/features/reports/pages/ReportCenterPage.test.tsx`、`src/features/advisor/pages/AdvisorWorkspacePageView.test.tsx`、`src/features/feedback/pages/InnerTestFeedbackPageView.test.tsx` 和 `src/features/automation/components/AutomationOperatorCardView.test.tsx`：支持工具视图测试，覆盖报告列表、独立详情、详情刷新部分失败、顾问任务与记录、反馈组合筛选和自动化确认状态；四个入口统一验证加载骨架、行动型空态、请求失败恢复，自动化额外覆盖上下文部分缺失、手动录入和步骤失败恢复
- `src/features/monitoring/components/GeoMetricDashboardCard.tsx`：GEO 指数看板，展示总分、子分、平台/优化单元/意图分组和多品牌排行
- `src/features/monitoring/components/MonitoringRunsCard.tsx`：AI 回复监测记录表格与创建弹窗，支持示例回答、人工录入真实回复、异步任务状态、重试状态、人工兜底入口、溯源字段展示、解析触发和人工复核编辑；监测问题或平台配置失败时继续展示已有记录并集中提示补齐配置，记录请求失败时隐藏误导性空表并保留新建入口与弹窗输入；结果解读列使用“有没有出现”“排第几”“说得准不准”“竞品表现”“需要补什么内容”和“下一步”解释状态。`getMonitoringAnalysisPath` 使用通用工作流路径构造器合并页面级上下文与记录级 `runId`、`promptId`，进入分析诊断时继续保留问题、优化单元、用户意图、任务和平台上下文并定位标准答案诊断区块
- `src/features/monitoring/components/TestQuestionCandidateCard.tsx`：监测主题与监测问法候选界面，支持输入种子词，从品牌、品类、场景、人群、痛点、地域、购买决策和竞品比较八个维度生成主题与问题；候选卡展示业务价值、推荐概率、用户阶段、目标平台、生成依据、生成方式和重复来源数量，并保留单题编辑、批量选择、保存计划和首轮监测入口。AI 服务失败时界面继续展示确定性候选和编辑入口；浏览器执行步骤会展示可复制问题，创建绑定监测计划和运行的会话，打开官方平台，并在用户确认登录后接收真实回答回填和分析
- `src/features/monitoring/components/SearchDemandSnapshotPanel.tsx`：搜索需求快照界面，支持百度补全、Google 补全和人工候选录入，展示词根、来源、市场、采集时间、候选问句、需求上升观察和稳定问题库入库状态；确认候选后刷新搜索快照、监测主题和问题候选数据
- `src/features/monitoring/components/ManualTestEntryCard.tsx`：手动录入真实 AI 回复界面，支持选择监测计划、展示可复制监测问题、目标平台入口说明、单条原始回复粘贴、批量原始回复粘贴、缺少回复统计和匹配结果展示
- `src/features/monitoring/components/PlatformConfigCard.tsx`：AI 平台连接与配置界面，优先展示豆包、Kimi、DeepSeek、通义千问和阶跃星辰，并按“可自动监测”“可用浏览器辅助监测”“可手动录入”“需要配置”分组；新增连接只提供自动监测、浏览器辅助监测和手动录入，历史样例模式显示为“示例回答（不计入指标）”且不能用于新建；新增编辑弹窗支持启用状态、平台密钥脱敏、校验和高级设置，接口地址、模型名称、调用限制收纳在高级设置中；浏览器连接向导支持打开平台登录页、展示用户登录提示、查看会话状态、最近可用时间和需要确认的异常，并以用户事件驱动服务端状态迁移
- `src/app/routes.test.ts`：前端路由注册测试，覆盖导航目标、运营流程、品牌化路由别名、lazy route component 注册和业务页面 SPA 导航架构约束；源码回归禁止业务页面重新使用会刷新应用的 `Button href`、原生内部锚点或 `window.location.assign`
- `src/app/routePaths.test.ts`：新手动作链路由协议测试，覆盖 query 编码、监测区块 hash、诊断到内容任务、发布记录和再次监测上下文传递
- `src/app/FirstRoundWorkflowRoutes.test.ts`：首轮业务路径集成测试，串联数据总览、品牌信息、优化单元、用户意图、AI 回复监测、优化建议、内容生成、发布记录、复测任务和同题监测，并验证分析异常进入内容任务、品牌资料修正、标准答案 mutation 与复测入口时持续保留来源上下文
- `src/app/WorkspaceRouteRedirect.test.ts`：品牌工作区别名重定向测试，遍历全部品牌化别名并覆盖嵌套别名、工作流 query、区块 hash 和未知别名回退
- `src/app/viteConfig.test.ts`：开发预览配置测试，直接加载唯一的 TypeScript 配置 `vite.config.ts`，校验 `.monkeycode-ai.online` 域名白名单和 `/api` 到本地 API 服务的代理目标
- `src/app/filterQuery.test.ts`：统一筛选 query 测试，覆盖读取归一化、工作流 query 保留、定向清空、有效日期边界和结果计数
- `src/components/PageState.test.ts`：页面状态 helper 测试，覆盖 API 业务错误提取、技术错误兜底，以及重新加载、补充品牌资料、开始 AI 回复监测、创建内容草稿和录入发布结果动作映射
- `src/components/SharedPageTemplates.test.tsx`：共享页面模板服务端静态渲染测试，覆盖页面标题、单一主操作、行动型空态、筛选控件、平台切换、创建工作台五态、资产库完整度、管理列表行操作、部分失败保留成功数据、全失败隐藏误导数据、移动端顺序类名和可选区域缺省结构
- `src/features/brand-workspace/components/BrandAssetLibraryComponents.test.tsx`：品牌资产库服务端静态渲染测试，遍历五类资料的选中与编辑标题语义，覆盖桌面导航顺序、移动端导航/编辑区顺序类名、折叠触发器的 `aria-expanded` 与面板关联、当前分类提示、完整度和分类状态、行动型空分类、资料导入初始入口、支持格式、单一主操作以及保存后完整度和监测下一步反馈
- `src/features/brand-workspace/pages/BrandWorkspacePage.test.ts` 与 `components/brandProfileEditor.test.ts`：品牌资料库 helper 回归层，覆盖固定分组、字符串与数组字段完整度、API 完整度提示映射、缺失项、资料来源数量，以及 pending、processing、completed、failed 四类来源状态到审核状态的映射
- `src/features/brand-workspace/components/BrandProfileCompleteness.property.test.ts`：资料完整度正确性属性 P1/P2 的确定性组合测试，枚举 10 个资料字段的 1,024 种填充组合和全部五个分组，验证分组进度始终为 0–100 的整数；每个缺失标签必须映射到分组补充入口，API 完整度提示字段必须保留缺失标签、影响说明和补充提示
- `src/features/brand-workspace/components/MonitoringObjectManagement.test.tsx`：监测对象与用户意图管理列表测试，覆盖关键词、关联对象、类型、优先级、分类和启停状态筛选；通过服务端静态渲染验证行动型空态、新手业务解释、两个可见高频行操作、更多操作收纳、用户意图无监测问题引导、平台指标聚合，以及豆包、阶跃星辰、通义千问等业务平台名称；纯路由 helper 额外锁定创建用户意图、开始监测、手动检测、自动监测、检测记录、内容生成和引用来源的真实 CTA 接线
- `src/features/monitoring/pages/MonitoringPage.test.ts`：AI 回复监测看板 helper 测试，覆盖待补充回复、计划步骤、真实回复计数、`mock_ai` 排除、关键结论、四项指标、平台范围切换、平台分布和零真实样本说明；待补充队列动作同时验证自动监测重试、浏览器辅助监测和手动录入三条恢复路径
- `src/features/monitoring/pages/RealMetricBoundary.property.test.ts`：正确性属性 P3/P4 的 Web 侧确定性组合测试，对 API、浏览器辅助、手动录入、`mock_ai`、空白回复、标准答案和内容草稿生成 128 种组合，验证监测摘要样本数、品牌提及率、Top 3 推荐率和引用命中率只由真实回复计算，并逐组确认非回复对象加入真实样本基线后不会改变指标或平台拆分
- `src/features/content-generation/pages/ContentOperationsComponents.test.tsx`：内容运营域组件测试，使用服务端静态渲染覆盖模板选择状态、内容优化双栏空态、生成失败恢复、五类优化建议和草稿导出、复制、保存、发布准备动作；同时遍历 12 类内容模板，验证适用平台、推荐字数、素材、引用、复测规则及任务输入预设完整，并验证优化配置必填边界和发布准备工作流上下文
- `src/features/publishing/pages/PublishingCenterPage.test.ts`：发布运营页面 helper 测试，覆盖自有媒体与媒体平台模式切换、账号搜索、发布渠道和授权状态组合筛选、授权状态到唯一管理动作映射、平台规则跨字段搜索，以及草稿、待发布、已发布、失败和空渠道的发文统计；同时覆盖发布记录聚合、筛选 query、真实链接、再次监测状态及完整工作流上下文
- `src/features/publishing/pages/PublishingOperationsComponents.test.tsx`：发布运营域组件测试，使用服务端静态渲染覆盖自有媒体授权状态与恢复动作、无账号行动型空态、持久化平台规则、筛选后的发布记录、发布准备必填字段与无可用账号提示、真实链接录入、明确发布状态、再次监测入口和聚合加载失败恢复；同时验证发布记录进入复测任务时保留发布记录、内容任务、版本和监测运行上下文
- `apps/api/test/real-metric-boundary.property.test.ts`：正确性属性 P3/P4 的首页侧确定性组合测试，使用同一 128 种对象组合验证首页样本数、有效排名数、推荐率和引用命中率遵守共享真实回复边界，并确认标准答案、内容草稿、`mock_ai` 样例和空白回复的任意组合不会改变真实样本基线
- `apps/api/test/content-asset-context.property.test.ts`：正确性属性 P5 的内容资产保存边界测试，生成来源资料、优化单元和用户意图的 64 种空值、空白值及有效值组合；仅当至少一类业务上下文有效时允许进入保存流程，目标关键词不作为上下文替代项
- `apps/api/test/advanced-metric-integrity.property.test.ts` 与 `confirmed-competitor-consumption.property.test.ts`：正确性属性 P20-P23 的确定性组合测试。P20 验证品牌规范名、别名和官网父子域名探测样本始终退出 discovery 指标；P21 枚举已测、样本不足和未测组合，并覆盖非有限值与权重；P22 枚举三快照变化方向并验证相等、反转、未测间隔及基线变化；P23 枚举竞品候选四态，验证分析和内容证据只消费正式、样本确认或用户确认竞品。相关回归同时覆盖单平台、全平台相同、搜索来源失败、候选幂等确认和渠道父子域名边界
- `apps/api/test/profile-library.api.test.ts`：品牌资料库 controller 集成测试，通过真实内存仓储与权限服务覆盖聚合读取、档案更新、完整度与缺失字段摘要、分区完整度、对照品牌数据隔离和无权限访问失败
- `src/features/monitoring/components/MonitoringRecoverySummary.test.ts`：监测恢复状态与组件测试，覆盖五类状态映射、样本范围和指标影响、自动重试提示、目标 Tab、部分真实数据与失败记录并存，以及自动监测、浏览器辅助和手动录入三条采集路径的可用性和持续展示
- `src/components/ProductPagePrimaryAction.property.test.tsx`：正确性属性 P6 穷举测试，对四类共享页面模板、五类页面状态、主操作有无和零到两个辅助操作生成 120 组组合，统计 Ant Design 实心主色按钮并验证每组最多一个；测试名使用 `validatesCriteria` 标注需求 1.1 和 7.2
- `src/components/ResponsivePrimaryTask.property.test.tsx`：正确性属性 P5 确定性组合测试，对 `ProductPage`、`CreationWorkspace`、`AssetLibrary` 和 `ManagementListPage` 四类共享页面模板与 loading、ready、empty、partial、error 五类状态生成 20 组场景，并分别按 1440px 桌面布局和 390px 移动布局渲染；逐组验证主操作可见标签、目标路由和可访问名称保持一致，同时覆盖创建工作台和资产库的响应式内容顺序类；测试名使用 `validatesCriteria` 标注需求 1.4 和 8.4
- `src/app/FullPageRegression.test.tsx`：全页面路由与视觉状态回归测试，固定校验 24 条导航路由、30 条品牌化别名和 15 个 lazy 页面模块；全部页面模块必须使用共享页面模板，品牌化别名必须保留代表性工作流 query 和 hash。四类共享模板覆盖 loading、empty、partial、ready、error 五类状态，并在 1440px 桌面、1024px 平板和 390px 移动宽度下执行 60 次结构渲染，验证应用壳模式、页面边距层级、关键结构类和主任务持续存在
- `src/app/WorkflowContextPreservation.property.test.ts`：正确性属性 P4 确定性生成测试，覆盖全部工作流 route builder、品牌工作区别名重定向和八个相邻阶段目标；使用普通 ID、空格 ID、中文及 URL 特殊字符 ID，组合四种监测模式、两个动作、四个发布 Tab 和三个监测锚点，验证构造、解析、重定向后的 query/hash 与业务对象上下文保持一致；测试名使用 `validatesCriteria` 标注需求 3.4 和 8.1
- `src/layouts/navigation.test.ts`：前端导航配置测试，覆盖五个任务域、24 个唯一页面入口、资料管理与支持工具二级入口、运营流程顺序、场景化相邻阶段和品牌化路由别名；`src/utils/displayLabels.test.ts` 覆盖五个业务平台名称、GEO 专业词解释、品牌角色、负责人、内容类型、公开状态及未知值兜底；`src/layouts/AppShellState.test.ts` 覆盖 767px/768px 模式边界、390px/768px/1024px/1440px 页面边距层级，以及桌面折叠、移动抽屉开关和路由关闭；`src/stores/brandContextStore.test.ts` 覆盖应用壳品牌切换；`src/app/routes.test.ts` 双向校验导航入口与第一版路由集合完全一致，并继续验证 lazy route 注册

Vite 配置统一位于 `当前工作区/apps/web/vite.config.ts`。开发服务将 `/api` 代理到 `http://localhost:3001`，并允许 `.monkeycode-ai.online` 预览域名访问；配置测试直接加载该 TypeScript 配置。生产构建通过 `build.rolldownOptions.output.codeSplitting.groups` 拆分 React、Ant Design、TanStack Query 和通用 vendor chunks，24 个第一版页面均通过 `React.lazy` 注册并生成独立页面 chunk。业务页面的内部跨页动作使用 React Router 导航，持续保留内存品牌上下文、工作流 query 和区块 hash。

全局页面骨架样式位于 `当前工作区/apps/web/src/styles/global.css`。样式通过 `--geo-*` 视觉令牌统一 1440px 最大阅读宽度、桌面/平板/移动 32px/24px/16px 页面边距、24px 区域间距、16px 组件间距、8px 紧凑间距、12px 内容面板圆角、8px 控件圆角、文字层级、语义色和两级阴影；`app-content` 使用居中稳定阅读宽度，Ant Design 卡片、表格、控件和指标显示复用同一视觉基线。当前提供 `geo-workbench-grid`、`geo-toolbar`、`geo-filter-row`、`geo-task-entry`、`geo-next-action`、`geo-list-panel`、`geo-detail-panel`、`geo-diagnostic-card`、`geo-platform-stat-card`、`geo-publish-checklist` 和 `geo-sticky-action-bar` 等复用类，以及统一筛选、平台切换、指标网格、关键结论和明细区域组件样式，用于新手首页、资产中心、对象列表、创作台、发布统计和分析诊断页面；桌面端支持主内容与右侧详情并排，平板端在 1199px 和 991px 两级断点依次收口双栏与页面操作区，移动端按标题说明、主操作、筛选、指标、列表和详情顺序堆叠。内容区所有 Ant Design 表格限制在父容器宽度内并提供横向滚动，管理列表在 767px 以下保留首个关键字段和末尾操作列。公开文案采用“一个业务主题、一句直接说明”和“动作 + 对象”的表达规则；`displayLabels.ts` 统一转换平台、角色、负责人、内容类型、监测方式和状态，`api/http.ts` 统一过滤技术错误详情，页面只展示业务标签和可执行下一步。

## 后端

后端位于 `当前工作区/apps/api/`。

已建立内容：

- `src/main.ts`：NestJS 启动入口，统一设置 `/api/v1` 前缀
- `src/app.module.ts`：根模块，加载健康检查、品牌、权限、官网快速接入、平台配置、监测、指标、画布、竞品、引用、评价、内容、发布、任务复测、报告、顾问服务、产品事件、统一大模型任务与自动化运营模块
- `src/common/access-control/brand-access.policy.ts`：集中品牌访问策略，先匹配具体品牌嵌套资源，再匹配品牌主体 fallback；同一资源矩阵同时生成服务端最低角色判定和前端公开能力摘要。`operator` 可写监测、内容、发布、任务和再次监测资源，品牌主体、成员和平台配置写入由 `admin` 或 `owner` 执行
- `src/common/middleware/brand-context.middleware.ts`：从 `x-brand-id` 注入请求品牌上下文
- `src/common/middleware/brand-access.middleware.ts`：校验当前用户是否有权访问 `x-brand-id` 对应品牌；拒绝时记录资源、实际角色、所需角色和请求路径，并返回可执行申请路径
- `src/common/filters/api-exception.filter.ts`：统一错误响应结构，并保留经过类型约束的授权错误详情
- `src/modules/health/health.controller.ts`：`GET /api/v1/health`，返回服务状态、仓储 driver、运行环境、依赖 readiness 和缺失配置项名称
- `src/modules/brands/brands.controller.ts`：品牌列表、详情、创建、编辑、状态切换、工作区快照、品牌知识库、知识来源、监测主题、监测问法、监测计划、增长优化计划和优化单元接口
- `src/modules/brands/test-question.service.ts`：根据已启用监测主题、品牌基础信息和品牌档案生成监测问法候选，并标注监测目的和默认目标平台；候选问法 API 支持按主题和选择状态筛选、优先级分页、单题编辑和批量选择，候选可携带 `promptId` 以便保存监测计划后直接进入执行编排；追光小牛内测品牌会生成贵阳儿童运动、3 到 5 岁儿童体能、少儿跑酷、快乐体操、感统发展、专注力提升、增高体能和中考体测首轮样例问法
- `src/modules/brands/test-theme.service.ts`：根据品牌档案生成品牌词、品类词、地域词、人群年龄段、用户痛点、课程或产品、竞品对比和购买决策监测主题；追光小牛内测品牌追加固定首轮样例主题
- 监测计划执行编排：`POST /api/v1/brands/:brandId/test-plans/:planId/execute` 根据连接摘要将问题分流到 API 监测运行、浏览器辅助监测、手动录入和平台配置引导；API adapter 成功返回后会创建 `MonitoringRun`、写入原始回答、记录调用审计并触发自动分析；浏览器路径为每个关联 `promptId` 的步骤预创建 `review_required` 运行并返回 `runId`，等待用户在官方平台登录、提交问题和回填真实回答，回填成功后写入原始回答并触发自动分析；缺少 `promptId` 时进入确认或手动录入路径；手动答案批量录入入口按监测计划、问题文本和平台 code 匹配答案，成功后复用同一套回答写入与自动分析链路
- 监测计划模板：`GET /api/v1/brands/:brandId/test-plan-templates` 根据品牌行业、业务范围和城市推荐行业模板；`POST /api/v1/brands/:brandId/test-plans/from-template` 由模板生成问题、目标平台和分析重点；`POST /api/v1/brands/:brandId/test-plans/:planId/duplicate` 支持复制和复测计划创建
- `src/modules/platforms/`：AI 平台配置接口、Adapter 边界和浏览器连接抽象，包含 `AIPlatformAdapter`、`ManualInputAdapter`、`MockAdapter`、`OpenAICompatibleAdapter`、`BrowserConnector`、`FakeBrowserConnector`、`DoubaoBrowserConnector`、`KimiBrowserConnector`、`DeepSeekBrowserConnector` 和 `QianwenBrowserConnector`；平台校验通过 Adapter registry 执行并持久化校验结果，`api` 模式先校验接口地址、模型名称和平台密钥状态，公共响应只返回 `hasCredential`、脱敏状态和最近校验结果，并通过 `connectionStatus`、`connectionStatusLabel`、`availableMethods` 和 `nextAction` 输出平台状态归类；`AIPlatformAdapterRegistry` 当前为豆包、Kimi、DeepSeek、通义千问和阶跃星辰注册 OpenAI-compatible 直接映射；`browser-session-state.ts` 根据 `login_confirmed`、`issue_reported`、`answer_captured` 和 `session_stopped` 事件推导会话状态，客户端不能直接声明登录检测结果和目标状态；浏览器会话由 memory 或 Prisma 仓储保存，只返回平台、状态摘要、最近可用时间和授权品牌/计划范围。回答回填接口会联合校验会话状态、品牌访问、授权计划、平台 code 和 `runId`，随后复用回答保存与分析链路；浏览器 connector 及 registry 继续作为平台适配扩展边界和契约测试基础
- 共享类型已为 `src/modules/llm/` 提供统一 LLM 任务契约：`LLMTaskType`、`LLMTaskStatus`、`LLMTaskRequest<TInput>`、`LLMTaskResponse<TOutput>`、`LLMTaskRun` 和 `LLMTaskRunInput`，并扩展 `AIPlatformCallType` 与 `AsyncJobType` 支持 `question_generation`、`answer_analysis`、`content_generation` 和 `optimization_planning`；四类任务输入输出已复用现有问题、解读、内容版本和增长优化计划模型，可直接写入现有仓储边界。共享类型已新增 AI 自动化运营员契约，包含 `AutomationPackage`、`AutomationStepSummary`、`AutomationConfirmation`、`PlatformRewriteVersion` 及其状态、步骤、确认类型和平台改写枚举，用于后续自动化任务包、确认队列和平台改写版本复用。前端新增 `src/features/automation/components/AutomationOperatorCard.tsx`，在品牌工作区、AI 回复监测页、增长优化页和内容生成页复用，展示任务包状态、步骤进度、问题池和监测计划上下文、确认事项抽屉，以及按当前步骤继续执行的业务按钮。
- `src/modules/llm/`：统一大模型任务模块，包含 `LLMController`、`LLMOrchestrationService`、`LLMPromptTemplateService` 和 `LLMOutputValidator`。当前支持四类任务路由：生成监测问题、解读回答、生成内容和生成优化计划；同步模式会选择当前品牌可用 API 平台、调用 `runMessages`、解析 JSON 输出并记录 `AIPlatformCallAudit` 和 `LLMTaskRun`，异步模式会创建 `AsyncJob` 并写入 queued 任务摘要，再通过任务查询接口返回队列状态。Prompt 模板已按 `question_generation`、`answer_analysis`、`content_generation` 和 `optimization_planning` 输出专属 system/developer/user messages，并统一加入品牌事实、安全表达和 JSON 输出约束；输出校验会按任务类型检查 themes/candidates、AnalysisResultInput、ContentVersionInput、GrowthOptimizationPlanInput、ContentGenerationTaskInput 和 retestQuestions 结构。
- `src/modules/automation/`：AI 自动化运营员后端模块，包含 `AutomationController`、`AutomationOrchestratorService`、`QuestionPoolService`、`ConfirmationQueueService`、`PlatformRewriteService`、`AutomationRepository` 和 `AutomationRepositoryPort`。当前支持创建、列表、详情、启动、停止、重新生成、执行已确认监测计划、分析监测回答、生成可发布内容、生成平台改写版本、生成发布建议、确认创建发布待办、生成复测建议、回写复测结果、步骤失败标记、确认事项创建和确认事项处理；服务层会通过 `canAccessBrand` 校验用户品牌访问权限，作为品牌访问 middleware 之外的模块内防线。任务包启动后会完成上下文收集步骤，复用 `TestThemeService` 与 `TestQuestionService` 补齐监测主题和监测问题池，并在生成后重新读取最新 `TestQuestionCandidate` 池，按优先级与主题多样性精选 6 个本轮问题，创建“本轮精选监测问题”确认事项。确认队列支持监测问题、分析判断、内容草稿、平台改写、发布建议和手动录入六类事项，动作覆盖确认通过、用户编辑、重新生成和跳过；存在 pending 确认事项时会阻塞后续自动推进。监测问题确认通过或编辑后会创建 `TestPlan` 并写回 `relatedTestPlanId`，流程进入 `test_plan_execution`。自动化执行入口复用现有 `executeTestPlan` 编排，将 API、浏览器、手动和配置路径数量写入 `test_plan_execution` 步骤；无阻塞项时推进到 `answer_analysis`，存在浏览器确认、手动录入、平台配置或跳过项时创建 `manual_test_required` 确认事项并等待用户处理。回答分析入口复用现有 `AnalysisResult` 解析与规则二次校验，按监测计划监测运行汇总推荐率、第一推荐率、Top 3 率、准确表达、引用分、竞品压制、引用缺口、风险表达和无法判断项；分析后会生成 `GrowthOptimizationPlan` 并写回 `relatedGrowthPlanId` 作为后续内容生成上下文，无风险时进入 `content_generation`，存在风险或无法判断项时创建 `analysis_review` 确认事项。内容生成入口基于 `GrowthOptimizationPlan.contentRecommendations` 创建内容任务，复用 `ContentGenerationWorker` 生成最新 `ContentVersion`，并在正文中固定包含引用依据、合规说明、建议发布平台和复测建议；生成内容命中风险表达时创建 `content_review` 确认事项，无风险时推进到 `platform_rewrite`。平台改写入口按任务包目标发布平台，将每个内容版本改写为知乎问答、百家号资讯、小红书笔记、公众号推文和官网 FAQ 版本，保存 `PlatformRewriteVersion`、改写说明、标签和合规提示，并创建 `platform_rewrite_review` 确认事项。发布建议入口根据内容版本、平台改写版本和发布中心历史记录生成 `publishing_suggestion` 确认事项，用户确认入口会先校验确认事项仍为 pending 且建议列表有效，再创建 `PublishingRecord` 待办、处理确认事项并写回 `relatedPublishingRecordIds`；复测建议入口复用任务复测仓储创建 `OptimizationTask` 和复测记录，完成复测后把结果回写任务包并在达标时进入 `completed`。服务读取品牌工作区、品牌档案、监测问题池和监测计划数量作为任务上下文，并通过现有品牌访问 middleware 与 `AuditLog` 记录自动化任务包、问题池、监测执行、回答分析、内容生成、平台改写、发布建议、复测建议和确认事项关键操作。
- `src/modules/sprints/`：AI 可见性运营 Sprint API 模块，包含 `SprintsController`、`QuestionRadarService`、`StandardAnswerService`、`StandardAnswerAlignmentService`、`SprintContentGapService`、`SprintPublishingService`、`SprintRetestService`、`SprintMetricsService`、`SprintStageService` 和 `SprintsModule`。当前提供品牌级 Sprint 列表、当前 Sprint、详情、创建、启动、停止、问题雷达、标准答案列表、标准答案生成、标准答案确认、标准答案对照分析、内容缺口任务生成、内容缺口任务看板、发布准备看板、发布准备记录创建、复测计划创建、复测趋势看板、指标刷新和阶段推进接口，统一返回 `ApiResponse<T>`，通过 `PermissionsService` 调用内存或 Prisma 仓储中的 Sprint 端口方法。启动和停止仅更新 Sprint 聚合状态。`QuestionRadarService` 读取 Sprint 关联问题、监测问题候选和监测主题，输出问题意图、平台覆盖、业务价值、状态和 Sprint 关联状态，并在同一 Sprint 内按归一化问题文本去重。`StandardAnswerService` 读取 Sprint 选题、品牌工作区和品牌档案生成 `ready_for_review` 标准答案草稿，用户确认后更新为 `approved` 并关联回 Sprint。`StandardAnswerAlignmentService` 是只读计算层，组合 Sprint 关联真实监测运行、解析结果、监测问题候选和已审核标准答案，按问题输出等待真实回答、等待标准答案、已对齐或需要处理四类状态，并给出要点覆盖、准确性、风险表达、引用缺口、竞品压制、证据和建议动作。`SprintContentGapService` 读取对照分析中的 `needs_attention` 项，复用或生成内容策略，为每个缺口创建内容生成任务，使用 `referenceSources` 记录 Sprint、问题、标准答案、真实回答运行和证据摘要，并把新任务 ID 合并回 Sprint 的 `relatedContentTaskIds`；同一服务还提供只读内容任务看板，解析 `referenceSources` 和当前内容版本，输出来源问题、缺口类型、证据摘要、复测目标和草稿可审稿状态。`SprintPublishingService` 读取 Sprint 关联内容任务、当前内容版本和发布记录，输出草稿、待人工发布、已发布和失败状态，并可将内容版本创建为发布中心草稿或待人工发布记录后写回 Sprint；该服务不生成不可访问发布链接。`SprintRetestService` 读取 Sprint 发布记录创建任务中心复测任务，跳过草稿和失败发布记录，并聚合关联复测任务的 `RetestRecord` 前后指标、改善状态和趋势摘要。品牌标准答案由 `BrandStandardAnswer` 独立保存问题、答案正文、关键点、证据和审核状态，用作对照基准和内容生成依据。`SprintMetricsService` 只读取 Sprint 关联的 `MonitoringRunDetail.response` 与 `analysis` 计算问题覆盖率、提及率、推荐率、首位推荐率、Top 3 率、引用命中率、表达准确率、风险表达数、内容缺口数、竞品压制数和样本量，不读取品牌标准答案或内容草稿作为监测样本。`SprintStageService` 根据问题、真实回答、标准答案关联、指标刷新状态、内容任务、发布记录和复测任务推进阶段；缺少真实回答时保持 `ai_response_monitoring` 的 `waiting_confirmation` 状态。
- `PrismaAutomationRepository`：自动化 Prisma 镜像仓储，随 `GEO_REPOSITORY_DRIVER=prisma` 接入。由于现有自动化编排接口保持同步调用，该仓储保留当前进程内同步视图，并将自动化任务包、确认事项、平台改写版本、监测问题池条目和问题来源记录写入 Prisma。后台 Prisma 镜像写入会捕获失败，避免数据库短暂异常变成未处理 Promise；当前请求仍以同步运行态视图为准。`QuestionPoolService` 会把监测问题候选同步为显式 `TestQuestionPoolItem`，并为新增问题写入 `TestQuestionSourceRecord`，用于后续持续扩展问题池和追溯来源。
- `TestThemeService` 和 `TestQuestionService`：监测主题和监测问题生成入口接收去重后的种子词，并从品牌、品类、场景、人群、痛点、地域、购买决策和竞品比较八个维度建立确定性基线。`question_generation` LLM 任务只补充基线，结果按去除空白与中英文标点后的问题文本合并；重复项合并目标平台、业务价值、推荐概率和来源轨迹，同维度的不同问题可同时保留，首轮最多返回 8 个高价值候选。平台未配置、密钥缺失、调用失败或输出无效时保留带完整元数据的确定性候选和编辑入口；历史 `age_group`、`offering`、`competitor` 主题继续映射到人群、场景和竞品比较维度。追光小牛内测样例继续保留 deterministic fixture
- `DemandSnapshotService`：品牌级搜索需求快照服务，通过固定百度、Google 和人工 Adapter 保存只追加快照。外部来源请求限制为 5 秒和 256 KiB，词根只作为固定端点查询参数；候选按规范化问句去重，并只与同品牌、同词根、同来源、同市场的上一快照比较。首次快照保持基线状态，后续新增候选标记为需求上升观察。确认候选时复用 `QuestionPoolService` 幂等写入监测主题、问题候选、稳定问题池和来源记录，并将问题池条目关联回候选；采集和确认操作均写入审计日志
- `MonitoringController` 回答解读入口：`POST /monitoring-runs/:runId/analysis/parse` 会先运行现有规则解析，保证结果可落库；随后尝试调用 `answer_analysis` LLM 任务覆盖表达字段。`llm-analysis-guard.ts` 会用规则结果二次校验品牌是否出现、引用分数、未知情绪和高风险表达，确保 LLM 输出不会绕过基础事实和合规判断。内存仓库的 `updateAnalysisResult` 会在 LLM 覆盖后继续触发竞品压制策略生成。
- `ContentGenerationWorker`：内容生成任务默认调用 `content_generation` LLM 任务生成草稿；测试仍可注入 `draftGenerator` 以保持 worker 测试稳定。LLM 不可用、失败或无输出时回退到基础草稿。生成结果继续通过 `completeContentGenerationTask` 写入 `ContentVersion`，导出、复制和发布入口沿用现有内容版本结构。worker 会把 LLM 返回的合规说明和复测建议追加到 Markdown 正文，并对品牌禁用表达和高风险表达做二次检查，在正文中追加“需要你确认”说明。
- `BrandsController` 增长优化计划生成入口：`POST /growth-optimization/generate` 会收集品牌资料、分析结果、内容资产、发布记录和当前计划，优先调用 `optimization_planning` LLM 任务。LLM 成功时写入 `GrowthOptimizationPlan`，创建下一轮复测问题，并尽量创建内容生成任务；LLM 失败时回退到仓储层规则计划。
- 默认 AI 平台与追光小牛 seed：新建品牌预置豆包、Kimi、DeepSeek、通义千问和阶跃星辰，并保存 OpenAI-compatible endpoint 候选、模型名称候选和人工录入兜底路径；豆包、Kimi、DeepSeek 和通义千问保留浏览器辅助监测路径，阶跃星辰默认走 API 接入候选；`manual_input` 与 `mock_ai` 保留为辅助平台。追光小牛默认 seed 预置“贵阳儿童运动”“3 到 5 岁儿童体能”“增高体能”三组高价值监测主题、对应候选问法和 `test_plan_demo_supercalf_first_round` 首轮 GEO 监测计划，覆盖本地推荐、年龄段需求和风险表达场景；同时预置 `growth_plan_demo_supercalf` 增长优化计划，包含内容缺口、核心卖点、风险表达和引用缺口原因，六类内容建议、公众号发布样例和 2026-07-27 复测任务
- `src/modules/monitoring/`：GEO 监测运行接口，支持创建运行记录、查看运行详情、录入人工回答、触发解析、查询解析结果和保存人工复核修正。运行计划与每条回答分别冻结完整 `MeasurementScope`，包括平台、模型、采集方式、联网状态、市场、语言、证据等级、人工确认和基线版本；API、浏览器、手工与演示路径由可信服务端入口写入实际采集来源，公共手工回答入口固定保存为人工证据
- `src/modules/metrics/`：GEO 指数接口，支持单品牌指标看板和多品牌排行
- `src/modules/canvas/`：GEO 画布接口，支持画布数据读取、内容策略创建和优化任务创建
- `src/modules/competitors/`：竞品接口，支持竞品档案维护、同场景对比、压制分析、竞品发现任务、候选列表查询、候选确认和候选排除。`competitor-confirmation.ts` 提供规范化确认集合，正式竞品及别名、样本确认候选和用户确认候选进入集合，待确认与排除候选退出集合；竞品 dashboard、机会地图、内容策略建议和报告竞品快照复用该边界。`CompetitorOpportunityService` 只消费非 `mock_ai` 且包含原始回答与分析结果的真实样本，将回答中的候选名称、正式竞品名称和别名命中同步为候选证据，并把候选提升到样本确认状态。服务按 Prompt 识别竞品失守与品牌独占机会，按竞品和市场返回提及率最高的三个可比平台，并可创建带来源运行证据的 `competitor_response` 策略和 `competitor_comparison` 内容任务
- `src/modules/citations/`：引用分析接口，支持引用看板、内容资产绑定和引用增强策略创建
- `src/modules/evaluations/`：评价分析接口，支持评价看板、修正策略创建和品牌知识库更新
- `src/modules/content/`：内容接口，支持内容资产 CRUD、筛选、内容覆盖率、策略建议、策略批量生成、内容生成任务、增长优化计划内容任务批量生成、编辑版本、Markdown 导出、发布入口参数，以及品牌级 `content-assets` 页面聚合接口；`ContentReadinessService` 使用 `2026-08-content-quality-v1` 对正文执行定义块、FAQ、步骤、比较表、数字依据、作者、更新时间、外部引用、结构化数据和渠道格式检查，并按内容类型追加竞品对比的同口径维度、自身局限、核验日期，榜单推荐的评选方法、数据来源、利益披露，以及 FAQ 答案首句直接结论检查；结果输出事实来源映射、风险段落与可定位的结构化修正入口；聚合模型输出来源引用、审核状态、发布状态、复测计划和发文统计摘要，并要求新建页面资产至少关联来源资料、优化单元或用户意图中的一类上下文
- `src/modules/publishing/`：发布中心接口，支持发布平台列表、发布账号接入、账号重新授权、授权状态与发布模式更新、发布记录创建、发布确认、发布执行、发布状态更新、自有媒体账号聚合、媒体平台规则读取和发布记录表现聚合。待发布创建、草稿补确认、自动或半自动执行及人工发布结果回填统一要求账号、内容版本、发布方式、素材要求和再次监测计划确认；确认快照冻结内容版本、素材确认、复测时间和确认时间，账号或发布方式变化后要求重新确认。公共创建接口仅接受 `draft | pending`，公共状态更新接口仅接受 `draft | pending | published | failed`；人工标记发布成功必须提交有效 HTTP(S) 链接，仓储统一补写真实发布时间。`PublishingExecutionService` 使用独立的 `PublishingExecutionStatusInput` 推进 `queued`、`publishing`、`published` 或 `failed`，并校验确认快照、品牌、账号授权、模式、平台和内容，使用发布记录 ID 作为稳定幂等键；前置条件不满足时会写回可见的失败记录，同一实例内并发请求复用同一执行 Promise。`PublishingAdapterRegistry` 提供平台无关 Adapter 边界，默认 `WebhookPublishingAdapter` 只读取服务端配置并要求上游返回可验证 `publishedUrl`，平台令牌和内部执行审计字段不接受公共请求写入
- `src/modules/brands/knowledge-chunk.service.ts`：品牌资料片段同步边界；将资料导入确认载荷和 Quick Start 中 `confirmed`、`edited` 事实按原始知识来源转换为确定性片段，保存来源 URL、SHA-256 内容哈希、审核状态和更新时间。每个来源采用只追加版本，相同内容与审核状态保持幂等；`KnowledgeRetrievalAdapter` 预留向量检索和关系检索扩展点
- `src/modules/brands/knowledge-retrieval.service.ts`：品牌级证据问答边界；按可选 `organization` 或 `platform_quota` Embedding 策略尝试 vector/graph Adapter，结果不足或 Adapter 故障时依次使用 PostgreSQL 全文与最新来源版本的结构化结果补齐，并返回 `vector`、`graph`、`hybrid`、`full_text`、`structured` 或 `none` 的 `retrievalMode` 及 `fallbackReasons`。只允许 `approved` 片段生成答案，待审核或无匹配依据时返回资料缺口及补充、确认入口；每次人工查询、内容生成和事实分析都通过现有 `AuditLog` 保存查询目的、业务资源、片段 ID、来源引用、检索模式、可信状态和 Embedding 费用归属策略。`KnowledgeRetrievalAdapter` 继续作为外部向量/关系检索扩展边界，默认未注册时保持全文降级
- `src/modules/citations/citation-absorption.service.ts`：引用吸收证据边界。服务在受控公开 HTTP(S) 读取约束下取得引用页文本，拆分回答句和带字符位置的来源片段，以词汇重叠计算 `supports`、`partial`、`conflicts` 或 `unavailable`，保存支持范围、置信度和复核状态；低置信、冲突及不可访问来源进入人工复核。专项 P24 测试锁定每条常规结论均保留回答句、来源片段和复核状态，不可访问来源也固定保存 `unavailable` 与待复核证据。memory 与 Prisma 仓储均持久化证据，Prisma 使用 `citation_sources.absorption_evidence` JSON 字段
- `src/modules/analysis/`：分析诊断聚合接口，提供品牌级 `analysis-diagnosis` dashboard，复用竞品、评价、信源和事实相关 dashboard 输出 `AnalysisFinding` 和 `AnalysisRecommendedAction`；finding 包含用户意图、平台、证据、来源运行、严重程度、建议动作和关联任务入口字段。`SampleEvidenceService` 在品牌访问边界内解析最多 100 个运行引用，从现有 `MonitoringRunDetail` 聚合问题类型、原始回答、引用、分析、回答级测量条件、访问端和采集时间，并标记未测、样本不足或有效样本。`MeasurementDisciplineService` 使用监测基线纯函数按回答级 `baselineVersion` 与平台、模型、访问端、采集方式、联网状态、市场、语言的兼容组合生成可比区间；`PromptMeasurementBreakdown` 通过服务端确定性分类器按品牌规范名、别名和官网域名隔离 discovery 与 brand probe 样本，并按完整采集条件生成独立序列。`OpportunityDiscoveryService` 只消费当前品牌有效真实回复、问题候选、内容资产和已确认竞品集合，确定性聚合竞品优势主题、引用域名、来源类型、平台分布和引用列表位置；内容机会固定按品牌缺席、竞品占优、内容缺失、事实不一致排序，同问题证据合并保留全部运行引用。渠道建议首先输出真实引用域名，信源稀疏时追加证据计数为 0 且明确标记的公共行业参考。`ChannelRoadmapService` 复用机会地图、内容资产和媒体平台规则，将渠道建议转换为内容形态、建议数量、发布节奏、负责角色和证据；高、中、低优先级分别进入 0-30、30-60 和 60-90 天窗口，目标域名出现在有效真实样本引用中时标记为样本覆盖
- `src/modules/monitoring/metric-integrity.service.ts`：纯计算指标完整性边界。未测子指标退出复合指标分母，已测权重重新归一；平台比较要求同市场至少两个有效且结果不同的平台；趋势按完整测量条件和基线分组，单次变化保持观察，两次同向连续变化升级趋势，未测快照和条件变化重置连续计数
- `src/modules/dashboards/`：页面级 BFF 聚合模块，提供新手首页、监测对象、内容运营、发布运营和分析诊断五类只读 dashboard；服务层复用 permissions repository、Sprint 发布准备与再次监测服务及纯 mapper，统一处理空数据 fallback、品牌访问校验、示例平台过滤、状态翻译和下一步动作，底层 CRUD 继续由原业务模块负责
- `src/modules/tasks/`：任务复测接口，支持优化任务看板、任务创建、状态流转、处理说明、复测计划、真实再次监测执行、证据验收、验收历史读取、增长优化计划复测指标对比和问题重开。`RetestEvidenceService` 从基线运行继承 Prompt 与平台并创建不同标识的新 `MonitoringRun`；纯函数证据计算器使用真实回答与两次分析派生六阶段状态、四项指标、实际分和下一轮建议。`AcceptanceHistoryService` 在 memory 或 Prisma 品牌隔离仓储中为每次 checker 结果追加不可变 `TaskAcceptanceSnapshot`，首条记录作为首次进度，末条记录作为当前进度，每条冻结目标值、checker 标识、检查状态、时间和原始证据；复测完成和站点审计单项复查均接入该服务。通过结果将任务置为 `done`，历史已通过任务后续检查失败时置为 `reopened`，并完整保留此前通过证据；`unavailable` 只追加证据并保持任务状态
- 未产生实际复测指标的验收使用 `pending_measurement` 追加“待补测”快照，任务状态保持不变；完成真实测量后继续记录 `passed` 或 `failed`
- `src/modules/reports/`：报告中心接口，支持报告列表、范围预览、单品牌报告、多品牌报告、客户交付报告、数据缺口标记和 Markdown 报告内容读取。`PeriodReportSnapshotService` 严格校验日期并使用 UTC 半开区间 `[startInclusive, endExclusive)` 统一过滤监测运行、内容资产、发布记录、任务变化和已完成再次监测；有效样本必须同时具有真实回答与分析结果。生成前返回每品牌范围预览，生成时冻结计数、记录 ID、样本时间、数据缺口、效果证据和 `period-report-v1` 口径版本；内存仓储与 Prisma 仓储复用同一周期服务和 Markdown 渲染器。`EffectAttributionService` 复用该冻结口径，优先选择最新报告周期，缺少报告时使用当前自然月，聚合基线、优化任务、内容、真实发布链接与复测证据，并为证据不足返回可行动的数据缺口
- `src/modules/product-events/`：产品关键步骤事件模块，包含内存与 Prisma 仓储、`ProductEventRecorderService`、`ProductEffectService` 和品牌级 `GET /brands/:brandId/product-effects` 接口。服务通过已授权品牌的组织归属写入和读取事件，事件以组织和品牌隔离，并按品牌、事件类型和幂等键去重；仅保留平台、采集方式、内容类型、报告类型、状态和阶段等运营元数据。效果看板按统计周期输出首轮监测到达率、首次有效洞察耗时、建议采纳率、发布完成率、再次监测完成率和有改善任务占比，并携带事件样本规模、指标分母定义和数据缺口。品牌创建、资料确认、首轮监测、建议采纳、内容保存、发布、再次监测、报告生成和监测或发布失败均在已完成业务操作后写入相应事件，归属无法解析或事件写入异常不会阻断主业务流程
- `apps/web/src/components/EffectEvidencePanel.tsx`：共享效果证据视图，统一展示统计周期、证据完整度、基线和复测样本、内容资产、发布记录、真实发布链接、四项指标及资料缺口；首页、优化分析、任务复测与报告详情复用该组件，报告详情继续渲染冻结快照
- `src/modules/quick-start/`：品牌级快速接入模块，提供会话创建、恢复和按步骤保存接口。`QuickStartService` 将官网信息同步到品牌资料和网页知识来源，将发现结果转换为具有稳定 ID、原始值、编辑值、置信度、确认状态及来源证据的事实候选，并用 `version` 乐观锁处理并发保存；浅层发现结果同时生成 `SourcePagePlan`，按首页、产品、关于、FAQ、案例、联系、政策和其他资料分类。缺少可识别链接或首页发现失败时生成待人工确认的确定性候选，范围保存严格限制为 1 至 30 个同源 HTTP(S) 页面并要求至少纳入一个页面；当前阶段只规划范围，不抓取候选页面或生成候选页知识片段。候选 URL 在发现和保存边界统一移除 fragment、尾斜杠及常见追踪参数，并排序保留的查询参数以消除重复。关键事实确认后确定性生成六类默认问题，保存问题时读取品牌平台配置并计算连接摘要、样本规模、耗时和执行方式，完成准备时复用现有权限服务创建 `TestPlan`。viewer 可读取，operator 及以上角色可创建和更新。`WebsiteDiscoveryService` 只读取用户提交的公开 HTTP(S) 首页，拒绝本机、私网和保留地址，最多跟随三次同源重定向，限制为 8 秒、1 MiB 和 HTML 或纯文本响应；首页解析最多保留 30 个同源文本页面链接，并过滤跨源地址和资源文件；失败会写回知识来源状态并保留人工处理路径
- `src/modules/site-audit/`：受控站点审计、问题映射、验收 checker 和技术资产生成边界。`NodeFetchSiteAuditAdapter` 在统一 10 秒执行窗口内并行读取用户提交的首页及同源根路径 `robots.txt`、`sitemap.xml` 和 `llms.txt`，最多跟随三次同源重定向，每项响应上限 1 MiB；每次访问前重新解析 DNS 并拒绝本机、私网、链路本地、保留地址、IPv4 映射私网 IPv6 和携带凭据的 URL。Adapter 使用固定规则输出资源有效性、noindex、AI Bot 全站禁止、JSON-LD 和正文可抽取结构七类检查，其中 robots.txt 要求有效 `User-agent` 指令，sitemap.xml 要求完整 `urlset` 或 `sitemapindex` 根结构，llms.txt 要求 Markdown 一级标题；异常文档返回 `warning`，单个资源访问失败返回 `unavailable` 并保留其他已完成检查。状态统一为 `pass`、`warning`、`fail` 或 `unavailable`，成功和失败结果均保留目标 URL、检查时间、HTTP 状态、内容类型、限长摘录或稳定错误码。`SiteAuditService` 为每项检查附加影响级别、影响说明、修复说明、任务模板和固定验收规则，只将非通过项加入推荐任务；checker 类型覆盖结构、文本、链接和响应头。`AcceptanceRuleService` 每次复查重新调用受控 Adapter 获取真实目标，要求检查证据 URL 与规则目标一致，根据对应检查产生 `passed`、`failed` 或 `unavailable` 结果，并向历史记录追加时间、目标和 HTTP 证据；目标不一致时记录 `SITE_AUDIT_TARGET_MISMATCH`。`TechnicalAssetService` 只消费 QuickStart 中 `confirmed` 或 `edited` 的非空事实，要求品牌名称、官网和介绍均已确认，强制目标页面与官网同源，以确定性 serializer 生成 llms.txt、Organization、FAQPage、Article JSON-LD、FAQ HTML 内容块和部署说明；每份结果保存为官网渠道草稿内容资产，附带来源事实快照、待审核状态和独立版本 1。`SiteAuditController` 以品牌嵌套路由提供审计、技术资产生成和单项复查，分别绑定 monitoring、content 和 retest 权限。前端 `/site-audit` 工作台展示原始证据、影响和修复说明，可创建现有优化任务、生成技术资产并重新验收；部分访问失败保留成功检查和错误证据
- `DiagnosticScorePolicyService`：站点审计完成后将七类原始检查映射为 schema、meta、content 和 citation 四维快照。默认规则版本为 `site-diagnostic-v1`，`pass`、`warning`、`fail` 分别计 100、50、0 分，`unavailable` 与尚无检查的维度保持未测；配置权重只在已测维度间归一。快照冻结维度原始检查、维度分数、配置权重、归一权重、加权分、完整策略、规则版本和综合分，并通过 memory 或 Prisma 品牌隔离仓储保存。历史复现读取快照内策略重新计算，当前策略升级只影响新诊断
- `src/modules/advisor/`：顾问服务接口，支持品牌诊断、服务计划、服务复盘、客户交付、服务记录、培训记录、行业规则更新、顾问备注、跟进事项和报告引用
- `src/modules/permissions/`：示例用户、组织成员、角色、品牌权限、未授权访问记录、审计日志和权限查询接口；增长优化计划生成能力根据回答分析样本识别推荐率不足、排名落后、卖点缺口、竞品压制、风险表达和引用缺口，并生成优先级、负责人、截止时间、建议发布平台、复测时间和内容建议草稿；确认计划时会拆解为内容补强、平台发布、资料补充、问法复测和负责人跟进 5 类优化任务，并关联回 `GrowthOptimizationPlan`；增长优化内容任务生成会把内容建议转成 `ContentGenerationTask`，支持公众号推文、小红书图文、官网 FAQ、短视频脚本、平台介绍文案和图片创意需求；增长任务完成后按来源监测运行创建复测计划，执行时通过 `bindOptimizationTaskRetestRun` 绑定同品牌新运行，验收时对比提及率、品牌排名、表达准确率和引用率

## 数据层

Prisma schema 位于 `当前工作区/apps/api/prisma/schema.prisma`。

当前模型：

- `Brand`：品牌工作区基础模型，持久化关联所属组织
- `QuickStartSession`：每品牌唯一的可恢复快速接入会话，保存当前步骤、状态、四步 JSON 草稿、乐观锁版本和完成时间；迁移 `20260803090000_add_quick_start_sessions` 创建 `quick_start_sessions` 表及状态、更新时间索引
- `BrandProfile`：品牌知识库模型，包含介绍、卖点、FAQ、推荐表达、禁用表达和完整度评分
- `KnowledgeSource`：知识库导入来源模型，记录本地文件、网页链接、公众号素材和外部文档的导入状态
- `KnowledgeChunk`：品牌知识片段版本模型，记录品牌、来源、来源版本、片段序号、来源 URL、正文、SHA-256 内容哈希、审核状态和更新时间；迁移 `20260804100000_add_knowledge_chunks` 增加 PostgreSQL `tsvector` 生成列、GIN 全文索引、来源版本唯一约束和品牌查询索引
- `TestPlan`：首轮监测计划模型，记录已选监测问法、关联 Prompt、目标平台、连接方式摘要、预计耗时、确认事项和后续监测运行关联
- `OptimizationUnit`：品牌级 GEO 优化单元模型，记录品牌词、品类词、场景词、地域词和竞品词的关键词、优先级和启用状态
- `UserIntent`：品牌级用户意图模型，关联优化单元、意图分类和监测频率
- `PromptTemplate`：通用 Prompt 模板模型，记录模板文本、适用行业、目标关键词、目标平台和监测频率
- `BrandPrompt`：品牌专属 Prompt 模型，关联品牌、优化单元、用户意图和模板生成结果
- `User`：用户基础模型
- `Organization`：客户组织或服务组织模型，记录组织名称、状态和组织成员关系
- `Role`：组织或品牌角色模型，记录角色 code、scope 和权限标识集合
- `OrganizationMember`：组织成员模型，关联用户、组织、角色和成员状态
- `UserBrandPermission`：用户与品牌的角色授权关系
- `AuditLog`：关键操作审计基础模型，记录品牌、组织、操作者、动作、资源、结果和错误码
- `PlatformConfig`：品牌级 AI 平台配置模型
- `AIPlatformCallAudit`：品牌级 AI 平台调用审计模型，记录平台、模型、调用类型、状态、耗时、token、成本估算和失败信息
- `AsyncJob`：品牌级异步任务模型，记录任务类型、关联实体、队列状态、重试次数、下次执行时间和最后失败信息
- `LLMTaskRun`：品牌级大模型任务运行摘要模型，记录任务类型、状态、关联异步任务、关联调用审计、输入摘要、输出摘要和失败信息；memory 和 Prisma 仓储均支持创建与读取，摘要不保存真实平台密钥、cookies、storage state 或浏览器 profile 路径
- `VisibilitySprint`：品牌级 AI 可见性运营 Sprint 聚合模型，记录标题、目标、状态、当前阶段、阶段状态、指标摘要和关联业务对象 ID；Prisma 迁移 `20260711102000_add_visibility_sprints` 创建 `visibility_sprints` 表和品牌、状态、当前阶段、更新时间索引；该表只保存聚合状态与关联 ID，不保存真实回答正文、标准答案正文、平台密钥、cookies、storage state 或浏览器 profile 路径
- `BrandStandardAnswer`：品牌级标准答案模型，记录高价值问题、标准答案正文、关键点、证据、审核状态、审核人和审核时间；Prisma 迁移 `20260711113000_add_brand_standard_answers` 创建 `brand_standard_answers` 表和品牌、问题、状态、更新时间索引；该表用于对照分析和内容生成依据，不参与真实 AI 回复监测指标计算
- `MonitoringRun`：品牌级监测运行记录模型，同时保存计划时的平台、模型、采集方式、联网状态、市场、语言、证据等级、人工确认状态和基线版本
- `AIResponse`：原始 AI 回答模型，关联监测运行和品牌，并独立冻结实际样本的访问端与完整测量条件，支持同一运行多次采集时逐条复核
- `MeasurementAttribution`：品牌级观察归因记录，保存基线窗口、观察窗口、对照问题、外部事件、观察结论、更新人和时间；结论类型固定为 `observational_correlation`
- `AnalysisResult`：AI 回答解析结果模型，记录品牌提及、推荐顺序、情绪倾向、准确分、引用分、竞品提及、平台评价、推荐理由、排名原因、卖点覆盖、表达偏差和人工复核状态；回答解析由 `analysis-result-builder.ts` 统一处理，memory 仓储和 Prisma 仓储共用同一套品牌名称/别名、竞品、卖点、背书、禁用表达和引用评分规则；业务解释通过现有说明字段输出“有没有出现”“排第几”“说得准不准”“竞品表现”“需要补什么内容”，排名落后时附带被压制原因候选项和内容补强建议；禁用表达、高风险承诺、排名无法判断或情绪无法判断会统一标记为“需要你确认”，并对“保证长高”“治疗感统失调”“包过中考体育”等表达输出审慎改法
- `GEOMetricSnapshot`：GEO 指数快照模型，记录提及分、推荐分、准确分、正向分、引用分、竞品对比分、知识库完整度影响项、总分和样本状态
- `Competitor`：竞品档案模型，记录竞品名称、别名、官网、行业标签、对比说明、连续压制规则、确认标签、候选来源、最近校区距离、全国标杆标记和校区周边重点竞品标记
- `CompetitorCandidate`：地图发现候选模型，保留原有发现决策并独立记录 `candidate | sample_confirmed | user_confirmed | excluded` 四态证据生命周期、去重后的真实样本运行 ID、样本确认时间和用户确认时间；迁移 `20260803180000_add_competitor_candidate_lifecycle` 将历史已确认候选映射为用户确认、历史排除候选映射为排除，其余候选映射为待确认
- `CitationSource`：引用来源模型，记录来源标题、URL、来源类型、权威等级、引用次数、关联回答和关联内容资产
- `ContentAsset`：内容资产模型，记录标题、类型、平台、URL、目标关键词、复用来源、品牌适配说明、技术资产来源事实、独立审核状态、发布状态和发布时间；迁移 `20260803110000_add_technical_assets` 增加来源事实、审核状态及技术资产版本表
- `TechnicalAssetVersion`：技术资产的不可变正文版本，通过内容资产和版本号唯一约束保存可审核、可编辑及可发布资产的历史内容
- `DiagnosticScoreSnapshot`：品牌级站点诊断评分冻结模型，保存官网、原始检查、四维分数、归一权重、完整策略、规则版本、综合分和生成时间；迁移 `20260803120000_add_diagnostic_score_snapshots` 创建表及品牌时间、规则版本索引
- `TaskAcceptanceSnapshot`：品牌级量化任务验收快照模型，每次 checker 执行追加进度值、目标值、checker 状态、检查时间和 JSON 证据，并关联 `OptimizationTask`；迁移 `20260803130000_add_task_acceptance_snapshots` 创建表、品牌任务时间索引和 checker 状态索引，任务删除时级联清理快照
- 迁移 `20260803140000_add_monitoring_measurement_scope` 为 `monitoring_runs` 和 `ai_responses` 增加测量条件列。历史枚举和字符串字段回填为 `unknown`，历史 `searchEnabled` 与 `manualConfirmed` 保持 `null`，避免把缺失信息解释为关闭联网或未人工确认
- 迁移 `20260803170000_add_prompt_measurement_breakdown` 为问题候选、品牌 Prompt 和监测运行增加 `promptKind`，为监测运行和回答增加 `clientSurface`；历史数据分别回填为 `discovery` 和 `unknown`
- `EvaluationIssue`：评价问题模型，记录问题类型、原始片段、正确表达建议、严重程度、状态、关联回答、关联 Prompt 和关联平台
- `ContentStrategy`：内容策略模型，记录策略类型、优先级、标题、目标平台、目标关键词、关联优化单元和关联用户意图
- `ContentGenerationTask`：内容生成任务模型，记录策略、增长优化计划、目标平台、内容类型、内容主题、目标关键词、引用资料、复测时间、任务状态、生成步骤、草稿引用和失败原因；repository port 支持按步骤更新 running、completed、failed、消息和完成时间，并自动推导任务状态；worker 成功后可通过完成写入契约创建最新 `ContentVersion`；失败时可记录失败步骤和关联 `AsyncJob` 错误，并支持重试重新入队；前端工作台展示任务状态摘要、步骤状态、失败提示和重试操作入口
- `GrowthOptimizationPlan`：增长优化计划模型，记录来源监测计划、来源监测运行、优化原因、优先级、负责人、截止时间、建议发布平台、复测时间、内容建议和关联优化任务；当前 memory 和 Prisma 仓储已提供计划生成、手动创建、确认拆任务、工作台聚合和复测联动能力，HTTP API 已通过品牌模块暴露
- `ContentVersion`：内容版本模型，记录生成任务、标题、正文、版本号和导出格式
- `ContentExportRecord`：内容导出记录模型，记录导出版本、导出格式、文件名、导出内容、创建人和创建时间
- `PublishingAccount`：发布账号模型，记录发布平台、账号名称、登录方式、`manual | assisted | automatic` 发布模式、授权状态、授权异常和最近授权时间
- `PublishingRecord`：发布记录模型，记录内容资产、发布账号、内容生成任务、内容版本、发布平台、发布模式快照、执行状态、外部平台内容 ID、发布链接、最近尝试时间、真实发布时间和异常原因
- `AutomationPackage`：自动化任务包模型，记录品牌、来源、目标平台、目标发布平台、当前步骤、步骤摘要、关联监测计划、增长计划、内容任务、发布记录和创建人
- `AutomationConfirmation`：自动化确认事项模型，记录任务包、品牌、确认类型、状态、标题、影响说明、建议、证据摘要、payload 和决策信息
- `PlatformRewriteVersion`：平台改写版本模型，记录内容版本、目标平台、标题、正文、标签、改写说明、合规提示和审核状态
- `TestQuestionCandidate`：监测问题候选模型，除问题、用途、平台和优先级外，记录八维发现维度、业务价值、推荐概率、用户阶段、生成依据、`deterministic | ai | merged` 生成方式和重复来源轨迹；Prisma 迁移 `20260803160000_add_question_discovery_metadata` 将上述字段持久化
- `TestQuestionPoolItem`：监测问题池模型，记录品牌、候选问题来源、问题角度、用途、目标平台、优先级、预计价值、来源和状态
- `TestQuestionSourceRecord`：监测问题来源记录模型，记录问题池条目、来源类型、来源 ID、摘要和创建时间
- `SearchDemandSnapshot`：品牌级只追加搜索需求快照，记录词根、百度/Google/人工来源、市场、采集时间和上一可比快照；迁移 `20260803190000_add_search_demand_snapshots` 创建品牌、词根、来源、市场和采集时间联合索引
- `SearchDemandCandidate`：搜索需求候选模型，保存原始问句、规范化问句、需求上升观察、候选或已确认状态、关联问题池条目和确认时间；同一快照内按规范化问句唯一，快照删除时级联清理候选，问题池条目删除时保留候选并清空关联
- `OptimizationTask`：优化任务模型，记录任务标题、状态、负责人、关联优化单元、关联 Prompt、关联平台、关联内容策略、关联增长优化计划、原始监测运行、复测运行、处理说明和复测记录；增长优化任务完成时自动进入待复测。`RetestRecord` 复用 JSON 存储计划、新运行、证据状态、证据缺口、完成时间、目标分、服务端派生实际分、优化前后提及率、品牌排名、表达准确率、引用率、指标差值、是否提升和下一轮建议
- `Report`：报告模型，记录报告类型、统计周期、生成状态、Markdown 内容、数据缺口、聚合快照、创建人和创建时间；单品牌快照冻结 `scope`，多品牌快照冻结 `scopes`，两类快照均冻结效果证据和口径版本，保证后续业务数据变化不会改写历史报告；试点 seed 已内置客户交付报告用于演示报告导出和顾问服务引用
- `AdvisorRecord`：顾问服务记录模型，记录诊断、服务计划、服务复盘、客户交付、培训、行业规则更新和顾问备注内容，支持关联报告和跟进事项；试点 seed 已内置服务计划和交付复盘记录
- `ProductEvent`：产品关键步骤事件模型，记录组织、品牌、操作者、事件类型、业务实体、失败类别、受限元数据、幂等键和发生时间；迁移 `20260807090000_add_product_events` 回填既有品牌的组织归属，并创建组织、品牌和事件时间索引及品牌事件幂等唯一约束

当前所有业务模型通过 `brandId` 与 `Brand` 关联，作为后续品牌隔离约定的基础。第四阶段开始引入组织成员、角色、集中权限策略和审计日志模型，品牌访问在品牌授权之外还会检查用户状态、有效组织成员状态和当前路由所需最低角色；审计日志记录关键操作的品牌、组织、操作者、动作、资源、结果和归一化错误码。

## 共享契约

共享类型位于 `当前工作区/packages/shared-types/src/index.ts`。该文件导出 `hasRealMonitoringResponseSample` 作为首页、监测摘要、复测验收和周期报告共同使用的真实样本判定：平台需排除 `mock_ai`，且 `response.rawText.trim()` 必须有内容；周期报告进一步要求运行包含分析结果。问题发现契约包含 `QuestionDiscoveryDimension`、`QuestionBusinessValue`、`QuestionUserStage`、`QuestionGenerationMethod` 和带 `seedWords` 的 `QuestionDiscoveryRequest`；`TestQuestionCandidate` 及输入类型可携带发现维度、业务价值、推荐概率、用户阶段、生成依据、生成方式和合并来源。样本回放契约包含 `SampleEvidenceMeasurementStatus`、`SampleEvidenceItem` 和 `SampleEvidenceResult`；每条证据携带运行与问题引用、原始回答、引用来源、分析结果、回答级 `MeasurementScope` 和采集时间，失效或尚无真实回答的请求引用进入 `missingRunIds`。`AnalysisFinding.relatedRunIds` 为分析结论提供稳定样本引用。快速接入契约包含 `QuickStartSession`、`QuickStartDraft`、`QuickStartFactCandidate`、`QuickStartQuestionCategory`、`QuickStartQuestionItem`、`QuickStartReadinessDraft`、四类步骤输入和 `version` 更新载荷；问题项携带六类业务类别和目标平台，准备摘要携带平台连接、样本估算、执行方式、下一步及可选 `testPlanId`，事实候选保留来源证据及确认状态，权限资源使用 `quick_start`。`RetestExecutionStatus` 固定为 `planned | collecting | analyzing | improved | unchanged | regressed`，`RetestRecord` 同步返回证据缺口、提及率、品牌排名、表达准确率、引用率和派生实际分；`RetestResultInput.actualScore` 只保留废弃兼容声明。报告契约新增 `ReportScopeRecordIds`、`ReportSampleSummary`、`ReportScopePreview` 和 `EffectEvidence`，用于冻结周期内业务记录、有效样本时间、基线与复测指标、关联内容和发布证据；单品牌和多品牌快照均携带 `methodologyVersion`。行动主页契约新增 `BrandActionContext`、`BrandActionItem`、`BrandActionPeriodEffect` 和 `BrandActionDashboard`，统一表达当前阶段、主行动、前三待办、最近有效样本、本周期效果、阻断恢复信息和失败数据源。`CitationDashboard` 使用 `sampleCount`、`citedSampleCount` 和 `citationRate` 表达真实回复引用命中情况，趋势同步返回每日真实样本数、有引用样本数和引用率；`contentCitationRate` 继续表达已绑定内容资产的引用次数占总引用次数比例。`EvaluationIssue.userIntent` 保存由监测运行关联的用户意图展示文本。AI 自动化运营员共享契约也在该文件中定义，自动化任务包、步骤摘要、确认事项、平台改写版本、监测问题池、监测问题来源记录和 `AutomationAnalysisSummary` 均包含品牌隔离或可追溯关联信息。后端自动化模块位于 `当前工作区/apps/api/src/modules/automation/`，内存仓储和 Prisma 镜像仓储均支持任务包、确认事项、平台改写版本、监测问题池和问题来源记录。

指标完整性共享契约包含 `CompositeMetricResult`、`PlatformMetricComparison`、`MetricTrendSnapshot`、`MetricTrendEvaluation` 和 `MetricIntegrityContext`；`TaskAcceptanceStatus` 增加 `pending_measurement` 表达待补测。

竞品机会共享契约包含 `CompetitorCandidateLifecycleStatus`、`CompetitorCandidateEvidenceInput`、`CompetitorQuestionOpportunity`、`CompetitorPlatformStrength` 和 `CompetitorOpportunityContentTaskInput`。`CompetitorDashboard` 统一返回候选生命周期、问题机会和按竞品及市场分组的 Top 3 平台证据。

搜索需求共享契约包含 `SearchDemandSource`、`SearchDemandCandidateStatus`、`SearchDemandCandidate`、`SearchDemandSnapshot`、`SearchDemandSnapshotInput` 和 `SearchDemandCandidateConfirmationResult`。来源固定为 `baidu | google | manual`，候选状态固定为 `candidate | confirmed`；确认结果同时返回更新后的快照、候选和幂等写入的 `TestQuestionPoolItem`。问题池来源新增 `search_autocomplete | manual_import`，用于区分公开搜索补全与人工需求证据。

AI 可见性运营 Sprint 共享契约已新增 `VisibilitySprint`、`VisibilitySprintStep`、`VisibilitySprintStatus`、`VisibilitySprintMetricSummary`、`QuestionRadarItem`、`QuestionRadarDashboard`、`BrandStandardAnswer`、`BrandStandardAnswerEvidence`、`BrandStandardAnswerInput`、`StandardAnswerAlignmentDashboard`、`StandardAnswerAlignmentItem`、`StandardAnswerAlignmentResponse`、`StandardAnswerAlignmentEvidence`、`SprintContentGapTask`、`SprintContentGapTaskResult`、`SprintContentTaskDashboard`、`SprintContentTaskItem`、`SprintContentTaskGapContext`、`SprintContentTaskDraftReadiness`、`SprintPublishingPreparationDashboard`、`SprintPublishingPreparationItem`、`SprintPublishingPreparationInput`、`SprintPublishingPreparationResult`、`SprintRetestPlanInput`、`SprintRetestPlanResult`、`SprintRetestTrendDashboard` 和 `SprintRetestTrendItem`。Sprint 契约作为现有监测、分析、内容、发布和复测对象上方的聚合层，保存阶段状态、关键指标和关联业务对象 ID；品牌工作区通过当前 Sprint 接口读取聚合状态，在首屏展示阶段进度、指标摘要和下一步动作；问题雷达契约作为 Sprint 下的只读视图，复用监测问题候选和监测主题输出意图、平台覆盖、业务价值与关联状态；对照分析契约作为 Sprint 下的只读视图，复用真实回答和已审核标准答案输出差异、证据和建议动作；内容缺口任务契约记录由对照分析转化出的内容策略、内容任务、来源问题、标准答案、真实回答运行和缺口类型；内容任务看板契约记录内容任务、当前草稿版本、来源缺口、复测目标和草稿可审稿状态；发布准备契约记录内容任务、当前版本、目标平台、发布记录和发布准备状态；复测契约记录复测任务、发布记录、前后指标、变化值和趋势状态；真实 AI 回复仍由 `AIResponse` 和 `MonitoringRun` 表达，品牌标准答案由独立模型表达，内容资产、发布记录和复测任务仍由内容、发布和任务模块表达，避免把标准答案或内容草稿算入真实监测指标。

`PermissionsRepositoryPort` 已新增 Sprint 仓储端口类型和可选方法，覆盖 Sprint 列表、详情、当前 Sprint、创建、阶段更新、指标更新和关联对象更新。端口方法保留 `userId` 与 `brandId` 参数，后续内存仓储、Prisma 仓储和 API 服务实现时继续沿用现有品牌访问校验边界。

产品体验后端持久化契约已收口：共享类型中的 `AnalysisFinding`、`ContentAssetPublishingStats`、`PublishingChannelStats`、`MediaPlatformRule` 和 `PublishingRecordPerformance` 均显式携带 `brandId`。`PermissionsRepositoryPort` 已增加品牌资料库、媒体资产、内容资产页面项、自有媒体账号、媒体平台规则、渠道发文统计、分析 finding 和分析工作台的可选读写或聚合方法；这些签名继续同时传入 `userId` 与 `brandId`，memory 与 Prisma 数据路径均复用现有品牌访问策略。`page-aggregation-security.property.test.ts` 的后端 P6 属性以 6 组输入覆盖品牌素材、内容资产、媒体账号、平台规则和分析 finding，验证记录品牌归属、无权限读取拒绝和跨品牌更新拒绝。

页面聚合契约包含 `BeginnerHomeDashboard`、`BrandActionDashboard`、`MonitoringObjectDashboard`、`ContentOperationDashboard`、`PublishingOperationDashboard` 和 `AnalysisDiagnosisDashboard`。API 的 `dashboard.mapper.ts` 以纯函数聚合现有品牌资料、真实回复运行、优化单元、用户意图、监测问题、内容任务、发布记录、引用、复测、确认队列、Sprint、冻结报告和分析 finding；所有集合先按 `brandId` 收口。`buildBrandActionDashboard` 将资料阻断、人工确认、待执行任务、内容生成、发布状态、再次监测和结果复盘转换为统一候选，并按数据阻断、人工确认、执行状态、到期时间、业务价值和稳定 ID 排序，首项作为唯一主行动，随后最多返回三项待办。内容生成的 pending、running、failed 状态及发布记录的 draft、pending、queued、publishing、failed 状态均保持为可执行行动；发布来源失败时抑制依赖缺失发布记录推导的建议。`buildBeginnerHomeResultSummary` 继续以真实回复样本计算有效排名占比、平均排名、引用命中率、待人工复核数量及相应样本数。

`DashboardsModule` 已将六类页面聚合 DTO 接入 HTTP API。`DashboardsService` 在 middleware 之外再次校验用户可访问品牌；行动主页使用 `Promise.allSettled` 并行读取十二类来源，保留成功来源并返回排序后的业务行动及 `sourceFailures`，品牌资料、优化单元、监测、内容、发布和任务六个核心来源全部失败时返回稳定的 `DASHBOARD_TEMPORARILY_UNAVAILABLE`。其他聚合接口继续将缺失子数据转换为空集合或可选字段，并从首页真实回复和监测对象平台数据中排除 `mock_ai`。发布表现计算已抽取为发布模块共享 mapper，供原发布表现接口和页面 BFF 使用同一语义。

公开响应边界统一使用 `src/common/public-response.ts` 递归净化自由结构数据。平台配置、浏览器会话、LLM 任务、自动化任务包、Sprint 和页面 BFF controller 在返回前移除真实凭据引用、API Key、授权 token、密码、secret、cookies、storage state、浏览器 profile 路径和 provider 原始载荷，同时保留 `hasCredential`、`credentialRefMasked`、状态摘要、关联 ID、业务标签和 token 用量统计。后端 P7 属性测试通过平台控制器覆盖 15 类敏感字段命名变体、根对象、嵌套对象和数组结构，验证真实敏感值不会进入序列化公开响应。`hasRealMonitoringResponse` 统一要求监测运行来自非 `mock_ai` 平台且包含非空原始回复；内存分析样本、Prisma 增长分析样本、Sprint 指标和新手首页 Sprint 摘要复用该边界，新手首页会按当前真实回复即时重算公开指标。

内存仓储已实现品牌资料库、品牌素材、内容资产页面项、自有媒体账号、平台规则、渠道发布统计、分析 finding 和分析工作台的完整端口。品牌资料库从 profile、知识来源、内容资产、媒体账号和竞品动态生成七类完整度分区；内容资产页面项沿发布记录、内容生成任务、内容策略和增长优化计划关联来源、用户意图、发布统计与复测计划；账号级统计按 `accountId` 计算，渠道级统计按平台聚合。品牌素材、平台规则和分析 finding 使用独立内存集合保存，其他页面模型作为派生视图实时生成，所有读写入口先执行品牌访问校验。memory 与 Prisma 对品牌素材和分析 finding 的共享字段执行同输入映射对照，分析证据在两条路径均完成去空、去重和首尾空白归一化。

Prisma 仓储实现同一组聚合端口。品牌资料库、内容资产页面项、自有媒体账号和渠道统计从现有 `BrandProfile`、`KnowledgeSource`、`ContentAsset`、`PublishingAccount`、`PublishingRecord`、`CitationSource`、`ContentGenerationTask`、`ContentStrategy`、`UserIntent`、`OptimizationTask` 与 `Competitor` 动态派生；`BrandMediaAsset`、`MediaPlatformRule` 和 `AnalysisFinding` 为轻量持久化模型。迁移 `20260718090000_add_direct_publishing_execution` 为发布账号增加发布模式，并为发布记录增加模式快照、外部平台内容 ID、最近尝试和真实发布时间；历史记录默认保持人工发布模式。

内存仓储 `PermissionsRepository` 已新增 `visibilitySprints` 运行态集合，默认演示品牌 `brand_demo` 预置“追光小牛首轮 AI 可见性运营 Sprint”。该 Sprint 关联已有监测问题、监测计划、监测运行、内容生成任务、发布草稿和复测任务，并提供列表、详情、当前 Sprint、创建、阶段更新、指标更新和关联对象更新方法；所有方法都会先按 `userId` 与 `brandId` 复用现有品牌访问校验。Prisma 仓储 `PrismaPermissionsRepository` 已实现同一组 Sprint 方法，并通过 `visibility_sprints` 表持久化阶段 JSON、指标 JSON 和关联 ID JSON 数组。

第三阶段新增 `MonitoringWorker` 位于 `当前工作区/apps/api/src/modules/monitoring/monitoring.worker.ts`，负责按 monitoring 异步任务选择 AI Platform Adapter、写入回答、更新监测运行状态并记录调用审计。真实平台调用通过内部 `AIPlatformRuntimeConfig` 读取 `modelName` 和 `credentialRef`，公开平台配置响应继续只返回 `hasCredential` 与 `credentialRefMasked`。新增 `ContentGenerationWorker` 位于 `当前工作区/apps/api/src/modules/content/content-generation.worker.ts`，负责按 content_generation 异步任务推进内容生成步骤、写入版本并记录失败上下文。前端第三阶段状态展示已覆盖监测异步状态、失败原因、人工录入兜底入口、内容生成步骤状态和失败重新入队入口。

当前导出：

- `BrandId`
- `ApiError`
- `ApiResponse<T>`
- `HealthCheck`
- `BrandStatus`
- `BrandWorkspaceSummary`
- `BrandDetail`
- `BrandMutationInput`
- `BrandWorkspaceSnapshot`
- `BrandFaq`
- `BrandProfile`
- `BrandProfileInput`
- `BrandProfileCompleteness`
- `KnowledgeSourceType`
- `KnowledgeSourceStatus`
- `KnowledgeSource`
- `KnowledgeSourceInput`
- `OptimizationUnitType`
- `OptimizationUnitPriority`
- `OptimizationUnit`
- `OptimizationUnitInput`
- `MonitoringFrequency`
- `UserIntentCategory`
- `IntentPlatformMetric`
- `UserIntent`
- `UserIntentInput`
- `PromptTemplate`
- `PromptTemplateInput`
- `BrandPrompt`
- `BrandPromptInput`
- `PromptBatchGenerateInput`
- `PlatformMode`
- `PlatformConfig`
- `PlatformConfigInput`
- `PlatformValidationResult`
- `BrowserConnectionStatus`
- `BrowserConnectionIssueType`
- `BrowserConnectionEvent`
- `BrowserConnectionSession`
- `BrowserConnectionStartInput`
- `BrowserConnectionStatusInput`
- `BrowserResponseCaptureInput`
- `BrowserResponseCaptureResult`
- `RunPromptInput`
- `RunPromptResult`
- `MonitoringRunStatus`
- `AIResponseParseStatus`
- `AnalysisSentiment`
- `CompetitorMention`
- `Competitor`
- `CompetitorInput`
- `CompetitorConfirmationLabel`
- `CompetitorDiscoveryRun`
- `CompetitorCandidate`
- `CompetitorCandidateDecisionInput`
- `CompetitorCandidateConfirmationResult`
- `CompetitorComparisonItem`
- `CompetitorDashboard`
- `CitationSourceType`
- `CitationAuthorityLevel`
- `CitationSource`
- `CitationDashboard`
- `ContentAsset`
- `ContentAssetInput`
- `ContentAssetFilter`
- `AnalysisResult`
- `AnalysisResultInput`
- `EvaluationIssueType`
- `EvaluationIssueSeverity`
- `EvaluationIssueStatus`
- `EvaluationIssue`
- `EvaluationDashboard`
- `GEOMetricScores`
- `GEOMetricSnapshot`
- `GEOMetricBreakdown`
- `BrandMetricDashboard`
- `BrandMetricRankingItem`
- `ContentStrategyType`
- `ContentStrategyPriority`
- `ContentStrategyStatus`
- `ContentStrategy`
- `ContentStrategyInput`
- `ContentStrategyFilter`
- `ContentStrategySuggestion`
- `ContentCenterDashboard`
- `ContentGenerationStatus`
- `ContentGenerationStep`
- `ContentGenerationTask`
- `ContentGenerationTaskInput`
- `ContentGenerationStepUpdateInput`
- `ContentGenerationCompletionInput`
- `ContentGenerationFailureInput`
- `ContentGenerationRetryInput`
- `ContentVersion`
- `ContentVersionInput`
- `ContentExportRecord`
- `PublishingEntryPayload`
- `ContentGenerationWorkspace`
- `GrowthContentType`
- `GrowthOptimizationPlanStatus`
- `GrowthOptimizationReasonType`
- `GrowthOptimizationReason`
- `GrowthOptimizationContentRecommendation`
- `GrowthOptimizationPlan`
- `GrowthOptimizationPlanInput`
- `GrowthOptimizationPlanConfirmInput`
- `GrowthOptimizationPlanConfirmationResult`
- `GrowthOptimizationPlanUpdateInput`
- `GrowthOptimizationWorkspace`
- `PublishingAuthStatus`
- `PublishingRecordStatus`
- `PublishingLoginMode`
- `PublishingPlatform`
- `PublishingAccount`
- `PublishingAccountInput`
- `PublishingRecord`
- `PublishingRecordInput`
- `PublishingStatusInput`
- `PublishingExecutionStatusInput`
- `PublishingDashboard`
- `OptimizationTaskStatus`
- `OptimizationTask`
- `OptimizationTaskInput`
- `OptimizationTaskUpdateInput`
- `RetestPlanInput`
- `RetestResultInput`
- `RetestRecord`
- `TaskBoardDashboard`
- `ReportType`
- `ReportStatus`
- `ReportDataGap`
- `SingleBrandReportSnapshot`
- `MultiBrandReportSnapshot`
- `ReportRecord`
- `ReportInput`
- `ReportDashboard`
- `AdvisorRecordType`
- `AdvisorFollowUpStatus`
- `AdvisorFollowUpItem`
- `AdvisorRecord`
- `AdvisorRecordInput`
- `AdvisorDashboard`
- `GeoCanvasNodeType`
- `GeoCanvasNode`
- `GeoCanvasEdge`
- `GeoCanvasWorkspace`
- `MonitoringRun`
- `AIResponse`
- `MonitoringRunDetail`
- `MonitoringRunInput`
- `ManualResponseInput`
- `UserStatus`
- `UserBrandRole`
- `UserSummary`
- `UserBrandPermission`
- `AccessibleBrand`
- `DeniedAccessLog`
- `VisibilitySprintStatus`
- `VisibilitySprintStepCode`
- `VisibilitySprintMetricSummary`
- `VisibilitySprintStep`
- `VisibilitySprint`

## Windows 桌面运行时

Windows 独立包由 `desktop/main.cjs` 创建 Electron 窗口，由 `desktop/runtime.cjs` 启动 PostgreSQL、API 和 Web 静态服务。运行时先写入 `services-ready`，主进程完成 `loadURL()` 后确认页面 `#root` 已产生 React 内容，再设置 `uiReady=true` 并写入 `running`；Windows Release E2E 同时检查 UI 就绪和 API readiness，避免后台服务已启动但桌面窗口仍为空白的情况。renderer 加载失败、进程退出和 console 错误会追加到用户数据目录下的 `logs/desktop.log`，启动失败状态保留具体错误。生产构建将 Ant Design 及其 `rc-*` 依赖保留在同一 chunk，发布流程在制作安装包前使用 Windows Electron 直接加载最终 Web payload，校验页面挂载并拦截 renderer console error。

## 模块边界

当前工程已实现品牌权限基础边界、品牌工作区 CRUD、品牌知识库编辑、完整度评分、知识库多来源导入记录、品牌级 GEO 优化单元管理、用户意图和 Prompt 模板生成、AI 平台配置 CRUD、平台密钥隐藏、配置校验、Adapter 边界、监测运行记录、示例自动回答、人工回答录入、失败原因记录、回答解析结果、人工复核闭环、GEO 指数计算、单品牌看板、多品牌排行、GEO 画布工作台、增长优化计划页、竞品压制分析、引用来源分析、评价分析、内容策略中心、内容生成工作台、发布中心、任务复测中心、报告中心、顾问服务工作台和第一版运营后台页面串联。后台导航当前按总览、发现机会、数据分析、内容运营和运营闭环分组，顶部展示当前页面、当前品牌和运营流程步骤；流程条按品牌初始化、监测主题与场景、发现增长机会、增长优化计划、策略生成、内容生产、发布记录、复测闭环、顾问跟进和报告导出串联。品牌化路由 `/brands/:brandId/*` 会写入当前品牌上下文，并映射到第一版已有页面。品牌工作区、监测问题、连接 AI 平台、监测记录和增长优化页已补齐下一步提示，首轮监测后引导用户补充品牌资料、连接更多平台、生成内容优化任务并安排复测。画布工作台当前聚合优化单元、用户意图、单元指标、内容策略和优化任务，并提供创建入口；增长优化计划页当前承接首轮监测结果，展示优化原因、优先级、负责人、截止时间、发布平台、复测时间、内容建议和关联执行任务，并提供确认拆任务、生成内容任务、标记完成和发起复测入口；竞品分析当前基于解析结果聚合同 Prompt、同平台、同场景和同优化单元下的排名差距，连续压制时生成高优先级竞品回应策略；引用分析当前基于回答引用列表聚合官网、媒体、社媒、百科和第三方平台来源，并支持绑定内容资产和创建权威引用增强策略；评价分析当前基于解析结果聚合正向、中性、负向和准确表达率，派生错误信息、缺失卖点、禁用表达、负向表达和准确性偏低问题，并支持生成 `correction` 内容策略或写回品牌知识库；内容策略中心当前基于品牌知识库、优化单元关键词、内容资产、解析结果和竞品压制结果生成 `gap`、`correction`、`enhancement`、`authority_citation` 和 `competitor_response` 策略建议，并支持写入内容策略列表；内容生成工作台当前基于内容策略、品牌知识库、用户意图和目标平台生成可编辑 Markdown 草稿，覆盖公众号推文、小红书图文、官网 FAQ、短视频脚本、平台介绍文案和图片创意需求，展示内容主题、目标关键词、引用资料、复测时间、增长计划来源、生成步骤、版本、导出记录和发布入口参数；发布中心当前支持公众号、头条号、搜狐号、百家号账号接入，记录授权状态和异常原因，并将内容生成版本转换为带内容资产、账号、平台和状态的发布记录；任务复测中心当前支持从监测问题创建优化任务、记录处理说明和内容链接、创建复测计划、保存原始监测运行与复测运行关联，并在复测未达标时重开任务和生成下一轮修正策略；报告中心当前聚合 GEO 指数、竞品、引用、评价、内容缺口、任务进度和多品牌排名，生成带 YAML metadata、数据缺口、指标解释、问题归因、行动建议、品牌对比、风险提示、交付进度和下一步动作的 Markdown 报告；顾问服务工作台当前沉淀品牌诊断、服务计划、服务复盘、客户交付、服务记录、培训记录、行业规则更新、顾问备注、结构化服务详情、待跟进事项和客户交付报告引用关系。
