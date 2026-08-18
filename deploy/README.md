# AI品牌曝光助手测试版封装

## Windows 单机发布

推送 `v<major>.<minor>.<patch>` 格式标签后，GitHub Actions 会构建 API、Web、Electron 和 PostgreSQL Windows runtime，并在 Windows Runner 中发布 EXE 安装包到对应 GitHub Release。

Windows 安装包以独立桌面窗口运行 PostgreSQL、API 和 Web。安装后从开始菜单或桌面快捷方式打开“AI品牌曝光助手”，无需安装 Docker Desktop。用户数据和日志位于 `%LOCALAPPDATA%\AI-Brand-Visibility-Assistant\data`，升级安装包会继续使用既有数据。

首版安装包未进行 Windows 代码签名。发布资产包含：

- `AI品牌曝光助手-<version>-安装程序.exe`

Windows 自动发布的实现位于 `.github/workflows/windows-release.yml`，单机启动和停止脚本位于 `deploy/windows/`。

## 组成

- `desktop`：Electron 独立窗口与本地服务生命周期管理
- `database`：PostgreSQL 16，本地数据目录位于用户数据目录
- `api`：NestJS API，启动前自动执行 Prisma 迁移
- `web`：本地静态资源服务

测试版镜像保留构建工具链，方便迁移、Seed 和问题排查。正式交付版可在测试收口后进一步裁剪运行时依赖与镜像体积。

## 启动

直接使用测试默认值启动：

```bash
docker-compose --env-file deploy/compose.env.example up --build
```

启动完成后访问：

- Web：`http://localhost:4173`
- API 健康检查：`http://localhost:3001/api/v1/health`
- API 数据库就绪检查：`http://localhost:3001/api/v1/health/ready`

## 环境配置

`deploy/compose.env.example` 只包含测试占位值。团队环境应准备独立环境文件，并设置安全的 PostgreSQL 密码、Web 访问地址和 API 公开地址。

`DATABASE_URL` 中的密码必须与 `POSTGRES_PASSWORD` 一致。密码包含 `@`、`:`、`/`、`?`、`#` 或 `%` 时，需要在 `DATABASE_URL` 中进行百分号编码。

前端 API 地址在镜像构建阶段写入。使用其他主机名或端口时，同时更新：

- `GEO_PUBLIC_API_URL`
- `GEO_WEB_ORIGIN`

修改端口或主机名后，先检查配置一致性：

```bash
npm run package:check -- deploy/compose.env.example
```

`GEO_SEED_ON_START=true` 会在每次 API 容器启动时执行幂等演示数据 Seed。已有业务数据的环境应将其设置为 `false`。

## 验证

```bash
docker-compose --env-file deploy/compose.env.example ps

curl --fail http://localhost:3001/api/v1/health

curl --fail http://localhost:3001/api/v1/health/ready

curl --fail --header 'x-user-id: user_demo' http://localhost:3001/api/v1/brands

curl --fail http://localhost:4173
```

启用演示 Seed 时，品牌接口应返回 `brand_demo`。验证数据库卷可在服务启动后执行：

```bash
docker-compose --env-file deploy/compose.env.example restart database

curl --fail http://localhost:3001/api/v1/health/ready
```

## 停止

```bash
docker-compose --env-file deploy/compose.env.example down
```

停止命令保留数据库和上传文件持久卷，便于下一次继续测试。
