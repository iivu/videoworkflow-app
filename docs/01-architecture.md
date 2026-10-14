# 01 · 项目结构

## 架构与代码入口

项目是视频内容管理与音视频创作应用，使用 pnpm workspace 和 Turborepo。

| 位置 | 职责 |
| --- | --- |
| `apps/api` | AdonisJS 7 后端；控制器处理 HTTP，service 处理业务，model 处理持久化，validator 校验请求，transformer 序列化响应 |
| `apps/api/start`、`config` | 路由、中间件及运行配置 |
| `apps/api/database` | migration、seeder 和自动生成的 schema |
| `apps/api/app/jobs` | 链接采集、视频声音克隆、视频拆解的队列任务 |
| `apps/web/src/routes` | TanStack Start / React 文件路由，登录后的页面位于 `_auth` 下 |
| `apps/web/src/features` | 各功能的页面、交互及状态 |
| `apps/web/src/components`、`providers` | 应用级组件与上下文 |
| `packages/ui` | 共享 UI 组件和主题样式 |

## 通信与持久化

- API 路由集中在 `apps/api/start/routes.ts`，统一前缀 `/api/v1`；鉴权规则见 [02](02-auth.md)。
- 前端通过 `apps/web/src/services/api.ts` 中的 Tuyau 客户端和 TanStack Query 调用 API，使用后端生成的类型与路由注册表。
- 业务数据由 Lucid 管理，默认数据库连接为 MySQL；队列支持 Redis 和同步执行驱动，配置见 `apps/api/config/queue.ts`。
- 外部服务通过 service/provider 封装；具体功能章节只描述实际调用路径，不把未接入页面或路由的代码视为已上线功能。

## 素材上传

OSS 为各功能提供共用素材存储：`POST /oss/upload` 上传文件，`POST /oss/url` 转存远程资源，`GET /oss/policy` 获取直传策略（均在 API 前缀下）。

入口：`apps/api/app/controllers/oss-controller.ts`、`apps/api/providers/oss-provider.ts`、`apps/web/src/hooks/use-oss.tsx`。
