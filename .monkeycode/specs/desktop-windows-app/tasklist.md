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
- [x] 2.5 增加载荷文件存在性校验，覆盖 Electron、PostgreSQL、Prisma CLI、schema、migration 和入口文件。

## 3. Windows 安装与升级

- [x] 3.1 配置 Inno Setup 安装目录、开始菜单入口和桌面快捷方式。
- [x] 3.2 保留 `%LOCALAPPDATA%\AI-Brand-Visibility-Assistant\data` 中的 PostgreSQL 数据和日志。
- [ ] 3.3 验证覆盖安装、卸载和数据目录保留行为。
- [x] 3.4 配置 Windows Release workflow 构建和上传安装包。

## 4. 测试与验收

- [x] 4.1 增加运行时路径解析和 readiness 轮询单元测试。
- [ ] 4.2 增加数据库重复启动、迁移失败和子进程清理测试。
- [x] 4.3 增加生产载荷依赖检查和缺失文件检查。
- [ ] 4.4 运行 `npm run verify`。
- [ ] 4.5 在 Windows CI 中构建安装包并校验单个 EXE 输出。
- [ ] 4.6 下载 Release 安装包并完成安装后启动验收。

## 5. 发布

- [ ] 5.1 提交代码和规格任务清单。
- [ ] 5.2 创建新的版本标签并触发 Windows Release workflow。
- [ ] 5.3 核对 Actions 日志、安装包大小、校验结果和 Release 附件。

## 当前验收状态

- `npm run desktop:test` 通过，桌面运行时测试 2 项全部通过。
- `npm run test` 通过，API 606 项和 Web 419 项全部通过。
- `npm run typecheck` 和 `npm run build` 通过。
- `npm run verify` 被 `npm audit` 阶段阻断，当前依赖审计仍有 high severity 告警，待单独评估升级方案。
- PowerShell、Inno Setup、真实安装升级和卸载验收需要在 Windows CI 或 Windows 真机执行。
