# 09 · 开发与运行

## 环境与命令

使用 Node.js 24+、pnpm 10.33.3。从根目录运行：

| 命令 | 用途 |
| --- | --- |
| `pnpm install` | 安装 workspace 依赖 |
| `pnpm dev` | 启动开发任务；Web 端口 3000，API 端口由环境配置（通常 3333） |
| `pnpm build` | 按依赖顺序构建 |
| `pnpm typecheck` | workspace TypeScript 检查 |
| `pnpm check` / `pnpm checkwrite` | Biome 检查 / 安全修复 |
| `pnpm test` | 先构建，再运行已配置测试 |
| `pnpm --filter api test` | 后端 Japa 测试 |
| `pnpm --filter api start:queue-worker` | 消费采集、视频声音克隆、视频拆解队列 |

API 配置参考 `apps/api/.env.example` 和 `apps/api/start/env.ts`，Web API 地址使用 `VITE_API_URL`。按功能准备 MySQL、Redis、OSS 和供应商配置；视频切片和音频提取依赖可执行的 `ffmpeg` / `ffprobe`。API 和队列 worker 是不同运行进程，启动 API 不等于启动 worker。

生产产物为 `apps/api/build` 和 `apps/web/.output`；部署应核对服务地址、CORS、静态资源路径及队列配置。不复制真实密钥或凭据到文档。

## 代码约定

- TypeScript、两空格缩进、单引号、整理 imports，Biome 行宽 180；文件名 kebab-case，组件/类 PascalCase，函数/变量 camelCase。
- 优先类型推断，只在无法推断或表达有意收窄/契约时加注解；使用 `#/`、`#services/*`、`#models/*` 等配置别名。
- 后端文件创建前检查 Ace 是否有对应生成命令；本次 Markdown 文档无对应生成器。
- model 继承由 migration 自动生成的 schema；禁止手改 `apps/api/database/schema.ts`、`apps/api/.adonisjs/**`、`apps/web/src/routeTree.gen.ts`。
- 后端变更后运行 `pnpm --filter api dev` 生成 `.adonisjs` 类型与注册表；仅修改文档不需要启动服务。

## 验证与交付

- 后端使用 Japa，测试文件为 `*.spec.ts`；隔离逻辑放 `tests/unit`，HTTP 行为放 `tests/functional`，补充聚焦回归覆盖。
- 不设覆盖率阈值，当前没有前端测试套件；前端变更说明手动验证步骤，UI 变更附截图。
- **Agent 不运行任何数据库相关操作**，包括迁移、种子、数据脚本和触库测试。不能仅凭测试位于 `unit` 就认定不触库；需要数据库步骤时告知用户，待用户完成后再继续。
- 验证从改动涉及的最小范围开始，不顺带修复无关问题。纯文档改动核对事实、章节归属及链接即可。
- commit 使用简洁、祈使语气且聚焦的主题；PR 说明用户/API 影响、验证命令、关联问题及迁移/环境变化。
- 修改功能后按 [00 的维护规则](00-index.md) 核对并同步文档；无行为变更时可明确说明文档已核对、无需修改。
