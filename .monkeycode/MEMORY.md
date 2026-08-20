# 项目协作记忆

## GEO 管理平台验证流程

- Date: 2026-07-25
- Category: 构建方法
- Instructions:
  - 最终交付门禁运行 `npm run verify`。
  - 单项排查使用 API/Web 测试、构建、Prisma schema 校验和 Client 生成脚本。
  - 直接执行 Prisma schema 校验时提供 `DATABASE_URL`。

## 模型平台配置约束

- Date: 2026-07-25
- Category: 环境配置
- Instructions:
  - 模型平台通过 OpenAI-compatible 配置接入。
  - 真实 API Key 仅保存到运行态配置、目标环境变量或密钥管理系统。
  - 仓库中的配置示例统一使用占位值。

## 独立仓库开发约定

- Date: 2026-08-02
- Category: 工作流协作
- Instructions:
  - GEO 管理平台后续开发统一在 `https://github.com/nn190yxn/Geo` 仓库进行。
  - Alex 仓库中的历史 `geo-platform/` 目录仅作为迁移来源和历史对照。

## 持续任务执行约定

- Date: 2026-08-03
- Category: 工作流协作
- Instructions:
  - 已明确授权的项目任务按任务清单持续实施，依次完成代码、测试、文档同步和质量门禁，直到整个任务清单收口。
  - 遇到需要新增权限、外部凭据或会改变产品范围的实质阻塞时再请求用户决策。

## 依赖验证排障

- Date: 2026-08-19
- Category: 排障与调试
- Context: 执行 GEO 管理平台仓库级 `npm run verify` 时确认
- Instructions:
  - `npm run verify` 首步会执行 `npm audit`，依赖审计失败时会阻断后续 Prisma、类型检查、测试和构建步骤。
  - Prisma CLI 仅解析自 API workspace；根脚本通过 `npm run prisma:validate --workspace @geo-platform/api` 运行 schema 校验。
  - 当前受控依赖组合为 Prisma `6.12.0` 和 Electron `43.4.1`，`npm audit --audit-level=high` 返回零漏洞。
