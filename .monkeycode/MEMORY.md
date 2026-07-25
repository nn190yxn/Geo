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
