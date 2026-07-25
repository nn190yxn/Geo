# 需求实施计划

- [x] 1. 建立第三阶段集成基础设施
  - [x] 1.1 扩展 AI Platform Adapter registry
    - 支持按 platformCode 和 mode 选择真实、Mock 或 Manual Adapter，覆盖 Requirement A1.1、A1.4
  - [x] 1.2 增加调用审计 Prisma 模型和 repository port 方法
    - 记录调用状态、耗时、错误、token 和成本基础字段，覆盖 Requirement A4.1、A4.2、A4.3
  - [x]* 1.3 编写 Adapter registry 和调用审计契约测试
    - 覆盖成功、缺失 adapter、缺失凭据和失败脱敏场景，覆盖 Requirement A1.5、A4.4、A5.2

- [x] 2. 实现监测异步任务链路
  - [x] 2.1 增加异步任务 Prisma 模型和队列状态 repository 方法
    - 支持 queued、running、succeeded、failed 和 retry-exhausted 状态，覆盖 Requirement A2.1、A2.2
  - [x] 2.2 调整监测创建流程为先入队再执行
    - 保持现有监测 API 响应结构，覆盖 Requirement A2.1、A5.5
  - [x] 2.3 实现监测 worker 执行真实 Adapter 调用
    - 成功后写入 AIResponse 并更新 MonitoringRun，覆盖 Requirement A2.3
  - [x] 2.4 实现失败重试和人工兜底状态
    - 存储失败上下文、重试次数和人工补录可用状态，覆盖 Requirement A2.4、A2.5
  - [x]* 2.5 编写监测任务状态机测试
    - 覆盖 queued、running、succeeded、failed、retryable 和 retry-exhausted 状态，覆盖 Requirement A5.3

- [x] 3. 实现内容生成异步任务链路
  - [x] 3.1 将内容生成任务创建改为入队执行
    - 保持内容生成工作台响应结构，覆盖 Requirement A3.1
  - [x] 3.2 实现内容生成步骤状态记录
    - 记录上下文加载、大纲生成、草稿生成和规则检查状态，覆盖 Requirement A3.2
  - [x] 3.3 实现生成成功后的内容版本写入
    - 保持导出和发布入口 API 可用，覆盖 Requirement A3.3、A3.5
  - [x] 3.4 实现生成失败重试
    - 存储失败步骤和重试入口，覆盖 Requirement A3.4
  - [x]* 3.5 编写内容生成 worker 契约测试
    - 覆盖步骤状态、版本写入、失败重试、导出和发布入口兼容性，覆盖 Requirement A3.2、A3.3、A5.4

- [x] 4. 接入至少一个真实 AI 平台 Adapter
  - [x] 4.1 实现真实平台 Adapter 配置读取和请求构造
    - 使用平台配置中的模型和凭据引用，覆盖 Requirement A1.2
  - [x] 4.2 实现真实平台响应归一化
    - 输出 `RunPromptResult`，覆盖 Requirement A1.3
  - [x] 4.3 实现平台校验逻辑
    - 保存校验结果并隐藏凭据，覆盖 Requirement A1.5
- [x] 4.4 编写真实 Adapter fake-provider 契约测试
    - 使用测试替身验证请求构造、响应归一化、错误分类和脱敏，覆盖 Requirement A5.2、A5.4

- [x] 5. 更新前端状态展示和操作入口
  - [x] 5.1 展示监测任务异步状态、重试和失败原因
    - 保持现有监测页面操作路径，覆盖 Requirement A2.2、A2.5
    - 已在监测运行表格展示任务状态、重试状态和失败原因，并在 retry-exhausted 时提供人工录入入口
  - [x] 5.2 展示内容生成步骤状态和失败重试入口
    - 保持内容生成工作台版本、导出和发布入口，覆盖 Requirement A3.2、A3.4
    - 已在内容生成工作台展示任务状态摘要、步骤状态、失败提示和重新入队入口
  - [x] 5.3 编写前端状态展示测试
    - 覆盖加载中、失败、重试可用和成功状态，覆盖 Requirement A5.5
    - 已新增监测运行和内容生成状态展示 helper 测试

- [x] 6. 第三阶段检查点 - 确保所有测试通过
  - [x] 6.1 运行完整验证门禁
    - 执行 `npm run verify`、`git diff --check`、API 健康检查和前端预览检查，覆盖 Requirement A5.1、A5.5
    - 已通过 `npm run verify`、`git diff --check`、API 健康检查、前端入口检查和 5173 预览检查
  - [x] 6.2 同步项目文档
    - 更新架构、接口、开发指南和交付检查清单，覆盖 Requirement A5.1
