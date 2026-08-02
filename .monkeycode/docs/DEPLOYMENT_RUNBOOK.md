# 部署运行手册

## 适用范围

本文档用于多品牌 GEO 管理平台生产试运行部署。当前工程位于 `当前工作区/`，采用 npm workspaces 组织 API、Web 和共享类型。

## 环境变量

### 必需变量

- `NODE_ENV`: 生产环境设置为 `production`
- `GEO_REPOSITORY_DRIVER`: 生产试运行设置为 `prisma`
- `DATABASE_URL`: PostgreSQL 连接字符串
- `STEPFUN_API_KEY`: 阶跃星辰 API Key，内测默认用于 `step-3.7-flash`
- `GEO_AI_PLATFORM_CONFIGURED`: AI 平台通过其它方式配置完成后设置为 `true`

### 可选变量

- `GEO_QUEUE_DRIVER`: 默认使用 `memory`，接入外部队列后设置为对应 driver
- `GEO_LOGGING_DRIVER`: 默认使用 `console`，接入外部日志后设置为对应 driver
- `PORT`: API 服务端口，默认由运行环境注入

## 安装与构建

```bash
# 安装依赖
npm install

# 生成 Prisma Client
npm run prisma:generate

# 校验 Prisma schema
npm run prisma:validate

# 执行受控数据库迁移
npm run prisma:migrate:deploy

# 构建所有 workspace
npm run build
```

## 数据库准备

```bash
# 生成 Prisma Client 并写入 demo seed 数据
npm run db:prepare

# 单独重复执行 demo seed upsert
npm run prisma:seed
```

生产试运行使用 `当前工作区/apps/api/prisma/migrations/` 下的受控迁移文件，执行前先确认 `DATABASE_URL` 指向目标数据库。

## 启动

```bash
# 启动开发联调服务
npm run dev
```

生产启动方式由部署平台负责进程管理。API 服务入口位于 `当前工作区/apps/api/dist/main.js`，Web 构建产物位于 `当前工作区/apps/web/dist/`。

## 健康检查

```bash
# 检查 API 健康状态
node -e 'fetch("http://localhost:3001/api/v1/health").then(async r => { console.log(r.status, await r.text()) })'
```

健康响应包含：

- `status`: `ok` 或 `degraded`
- `repositoryDriver`: `memory` 或 `prisma`
- `runtimeEnvironment`: 当前运行环境
- `dependencies.database`: 数据库配置状态
- `dependencies.queue`: 队列配置状态
- `dependencies.aiPlatforms`: AI 平台配置状态
- `dependencies.mapProvider`: 地图 POI provider 状态，取值为 `configured`、`fallback`、`rate_limited` 或 `disabled`
- `dependencies.logging`: 日志配置状态
- `missingConfiguration`: 缺失配置项名称，不包含密钥值

## 回滚

1. 保留上一版构建产物和 Prisma schema。
2. 回滚应用构建产物到上一版本。
3. 确认 `DATABASE_URL` 指向目标数据库。
4. 执行健康检查确认 API 可用。
5. 检查关键品牌工作区、监测运行、内容生成和权限查询接口。

## 排障

- 健康检查返回 `degraded`: 查看 `missingConfiguration`，补齐对应环境变量。
- `dependencies.aiPlatforms` 为 `not_configured`: 优先配置 `STEPFUN_API_KEY`；使用其它平台作为默认模型时，将平台配置补齐后设置 `GEO_AI_PLATFORM_CONFIGURED=true`。
- `dependencies.mapProvider` 为 `fallback`: 检查 `GEO_AMAP_API_KEY` 是否已配置，并重新触发竞品地图发现验证。
- `repositoryDriver` 为 `memory`: 检查 `GEO_REPOSITORY_DRIVER` 是否设置为 `prisma`。
- Prisma schema 校验失败: 先修正 `当前工作区/apps/api/prisma/schema.prisma`，再运行 `npm run prisma:validate`。
- API 返回权限错误: 检查用户状态、组织成员状态、品牌授权角色和 `GET /api/v1/permissions/audit-logs` 审计记录。
- 前端无法访问 API: 检查 Vite `/api` 代理和 API `/api/v1/health` 响应。
