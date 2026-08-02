# 多品牌 GEO 管理平台

这是多品牌 GEO 管理平台的完整工程，采用 monorepo 组织前端、后端、共享类型和数据库迁移。

## 目录

```text
apps/web      Vite + React 前端应用
apps/api      NestJS API 服务
packages/shared-types  前后端共享契约
```

## 本地开发

开发环境需要 Node.js 22.22 或更高版本。

```bash
# 安装依赖
npm install

# 启动前端与后端开发服务
npm run dev

# 仅启动前端
npm run dev:web

# 仅启动后端
npm run dev:api
```

前端开发服务通过 `/api` 代理到后端 `http://localhost:3001`。

## 测试版封装

Docker 测试版封装包含 Web、API、PostgreSQL、自动迁移和持久化卷。启动与环境配置说明见 `deploy/README.md`。

## 环境变量

内测默认大模型使用阶跃星辰 `step-3.7-flash`。本地或试运行环境可以在 `.env` 中配置：

```bash
STEPFUN_API_KEY=""
GEO_AI_PLATFORM_CONFIGURED="false"
```

配置 `STEPFUN_API_KEY` 后，新品牌默认阶跃星辰平台会自动引用该环境变量，健康检查中的 `dependencies.aiPlatforms` 会显示为 `configured`。使用其它平台作为默认模型时，可在平台配置补齐后设置 `GEO_AI_PLATFORM_CONFIGURED=true`。

## 验证

```bash
# 运行完整交付门禁
npm run verify

# 检查 API 健康状态
node -e 'fetch("http://localhost:3001/api/v1/health").then(async r => { console.log(r.status, await r.text()) })'
```

## API 边界

所有业务 API 使用 `/api/v1` 前缀，前端请求会自动携带 `x-brand-id` 请求头作为品牌上下文。后端统一返回 `ApiResponse<T>` 结构，错误响应包含 `code`、`message` 和 `requestId`。

当前使用本地示例用户，前端或调试请求可通过 `x-user-id` 指定用户；未传时默认使用 `user_demo`。
