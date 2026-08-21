# Windows 独立桌面应用实施任务清单

## 1. 桌面运行时

- [x] 1.1 创建 Electron 主进程并使用独立窗口加载本地 Web。
- [x] 1.2 创建本地 PostgreSQL 初始化、启动和停止生命周期。
- [x] 1.3 创建 API 子进程和本地 Web 静态服务器。
- [x] 1.4 让数据库初始化具备幂等性，重启时复用现有 `geo_platform` 数据库。
- [x] 1.5 在启动失败时统一停止已经启动的数据库、API 和 Web 子进程。
- [x] 1.6 使用 API readiness 接口确认数据库可用后再加载窗口。
- [x] 1.7 让桌面 API 仅监听 `127.0.0.1`。

## 2. 生产载荷

- [x] 2.1 将 Prisma CLI 放入 API 生产依赖，确保 `npm ci --omit=dev` 后可执行 migration。
- [x] 2.2 复制 Prisma schema、migration、API 构建产物、Web 构建产物和 shared-types 构建产物。
- [x] 2.3 复制 PostgreSQL `bin`、`lib`、`share` 运行时目录。
- [x] 2.4 排除 Web 开发依赖和 PostgreSQL pgAdmin 运行时。
- [x] 2.5 增加载荷文件存在性校验，覆盖 Electron、PostgreSQL、Prisma CLI、schema、migration、Windows schema engine 和入口文件。

## 3. Windows 安装与升级

- [x] 3.1 配置 Inno Setup 安装目录、开始菜单入口和桌面快捷方式。
- [x] 3.2 保留 `%LOCALAPPDATA%\AI-Brand-Visibility-Assistant\data` 中的 PostgreSQL 数据和日志。
- [x] 3.3 验证覆盖安装、卸载和数据目录保留行为。
- [x] 3.4 配置 Windows Release workflow 构建和上传安装包。

## 4. 测试与验收

- [x] 4.1 增加运行时路径解析和 readiness 轮询单元测试。
- [ ] 4.2 增加数据库重复启动、迁移失败和子进程清理测试。
- [x] 4.3 增加生产载荷依赖检查和缺失文件检查。
- [x] 4.4 运行 `npm run verify`。
- [x] 4.5 在 Windows CI 中构建安装包并校验单个 EXE 输出。
- [x] 4.6 下载 Release 安装包并完成安装后启动验收。
- [x] 4.7 增加 Electron renderer UI 就绪校验，避免后台服务 readiness 误判为可用桌面窗口。
- [x] 4.8 在安装包构建前使用 Windows Electron 对最终 Web payload 执行 renderer smoke test。

## 5. 审计修复

- [x] 5.1 显式复制并校验 Windows Prisma schema engine，确保 `prisma migrate deploy` 可离线执行。
- [x] 5.2 为 HTTP readiness 和 `initdb` 子进程增加有界超时、错误处理和单元测试。
- [x] 5.3 为 PostgreSQL 采用 fast shutdown，并在超时后请求 immediate shutdown。
- [x] 5.4 通过运行时状态文件精确定位应用 PID，停止脚本优先关闭窗口后再回收残留进程。
- [x] 5.5 在 Windows Release workflow 增加安装、启动、升级、卸载和数据保留门禁。
- [x] 5.6 将 Prisma 固定到 `6.12.0`、Electron 升级到 `43.4.1`，完整依赖审计返回零漏洞。

## 6. 发布

- [x] 6.1 提交代码和规格任务清单。
- [x] 6.2 创建新的版本标签并触发 Windows Release workflow。
- [x] 6.3 核对 Actions 日志、安装包大小、校验结果和 Release 附件。

## 当前验收状态

- `npm run desktop:test` 通过，桌面运行时测试 5 项全部通过。
- `npm run verify` 通过，包含完整依赖审计、Prisma schema 校验与 Client 生成、类型检查、API/Web 测试和构建。
- Windows Release `v1.0.66` 已通过最终 Web payload 渲染、单一 EXE、真实安装、两次启动、覆盖升级、卸载和数据保留验收。
