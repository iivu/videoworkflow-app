# 无限画布 + 视频创作空间（万相 3.0 视频生成）

## Summary

在 `/creative/video` 页面实现一个占据整个主内容区的无限画布（React Flow v12），画布上的所有素材与操作都归属于一个「视频创作空间」（`video_workspaces`）。用户可以在画布上自由放置、连线、编辑三类节点（提示词 / 图片素材 / 视频生成），视频生成节点将连接的提示词与图片（首帧/尾帧）组合为万相 3.0 生成任务，异步产出视频并在节点内预览。

关键约束与决策：

- **万相服务不对外**：`WanxiangVideoService`（wan3.0-video / wan3.0-video-prime）保持内部实现，不新增独立 controller/routes；生成能力全部收敛到视频创作空间域（`/api/v1/video-workspaces/:id/...`）下，由空间服务编排调用。
- **节点模型**：提示词是独立节点，图片是独立素材节点；视频生成节点支持接入首帧 + 尾帧两张图片。
- **并发策略**：放宽现有"同一用户同时仅一个生成任务"的全局限制，改为按节点（entity_id）维度并发——同一节点同一时间仅一个任务，不同节点可并行生成。
- **产出形态**：每个视频生成节点独立产出可播放的视频，MVP 不做多节点合并导出。
- **UI 布局**：创作空间操作（切换 / 新建 / 重命名 / 删除 / 名称显示）与画布工具栏全部使用 React Flow 悬浮 `Panel` 组件，不占用画布空间；画布铺满整个主内容区。

## Key Changes

### 后端

#### 1. 数据模型（新表 `video_workspaces`）

通过 Adonis CLI（`node ace make:migration create_video_workspaces`）创建迁移：

- `id`：自增主键
- `user_id`：uuid，非空
- `name`：string(60)，非空
- `canvas`：text，保存整个画布状态的 JSON（`{ nodes, edges, viewport }`），新建时为空画布
- `created_at` / `updated_at`：datetime(3)

索引：`user_id`、`created_at`。

`apps/api/database/schema.ts` 由 Adonis 自动生成，不手工编辑；迁移文件只写入，`db:migrate:run` 与 schema 重新生成由用户在实现后执行。`pnpm --filter api dev` 重新生成 `.adonisjs` 客户端（tuyau registry）供 web 使用。

新增薄模型 `VideoWorkspace`（`#models/video-workspace.ts`，继承自动生成的 Schema）。

#### 2. 创作空间域（服务 / 控制器 / 校验 / 转换器 / 路由）

新增：

- `VideoWorkspaceService`（`#services/video-workspace-service.ts`）：
  - `list({ userId })`：按 `updated_at` 倒序返回当前用户全部空间
  - `create({ userId, name })`：以空画布创建
  - `show({ userId, id })`：属主校验
  - `rename({ userId, id, name })`
  - `saveCanvas({ userId, id, canvas })`：校验 `nodes`/`edges` 为数组、`viewport` 可为 null，整包替换存储（last-write-wins）
  - `remove({ userId, id })`：删除空间，并级联删除该空间画布中所有节点 id（entity_id）关联的 `wanxiang_video_tasks` 记录
  - 生成相关（内部注入 `WanxiangVideoService`）：
    - `generate({ userId, workspaceId, nodeId, payload })`：加载空间（属主校验）→ 解析画布 → 校验 `nodeId` 存在于画布节点中 → 调用 `wanxiangVideoService.create({ userId, entityId: nodeId, input, parameters, model })`
    - `showTask / checkTask / abandonTask({ userId, workspaceId, taskId })`：校验任务属主且 `entity_id` 属于该空间画布的节点 id，再委托 `wanxiangVideoService` 对应方法
    - `listTasks({ userId, workspaceId, page, size })`：按空间节点 id 集合分页查询任务
- `VideoWorkspacesController`（`#controllers/video-workspaces-controller.ts`）：薄控制器，`@inject()` 注入服务，`ctx.ok(...)` + `ctx.serialize.withoutWrapping(...)`
- 校验器（vine）：`#validators/video-workspace.ts`（空间 CRUD + 画布保存）与 `#validators/canvas-generation.ts`（生成请求体 / 任务参数），枚举与限制常量从 `#services/wanxiang-video-service` 导入（内部引用）
- 转换器：`#transformers/video-workspace-transformer.ts`（id/name/canvas/createdAt/updatedAt，canvas 反序列化为对象）；任务响应复用 `#transformers/wanxiang-video-task-transformer.ts`（内部，不对外）
- 路由（`start/routes.ts`，auth 组内，前缀 `/api/v1`）：

```
GET    /video-workspaces
POST   /video-workspaces                       # { name }
GET    /video-workspaces/:id
PUT    /video-workspaces/:id                   # 重命名 { name }
PUT    /video-workspaces/:id/canvas            # { nodes, edges, viewport }
DELETE /video-workspaces/:id
POST   /video-workspaces/:id/nodes/:nodeId/generate   # { model?, input: { prompt?, media: [...] }, parameters? }
GET    /video-workspaces/:id/tasks             # 该空间任务列表（entity_id ∈ 画布节点 id）
GET    /video-workspaces/:id/tasks/:taskId     # 任务详情
GET    /video-workspaces/:id/tasks/:taskId/check   # 轮询（终态直接返回缓存）
POST   /video-workspaces/:id/tasks/:taskId/abandon # 放弃
```

生成请求体校验规则（对齐服务既有约束）：`entityId` 由路由参数 `nodeId` 提供（uuid ≤36）；`input.prompt` ≤ 20000 字符且必填（提示词节点必连）；`media` 仅允许 `first_frame` / `last_frame` 各最多 1 个，且互斥规则与现有 `WanxiangVideoService.assertInput` 一致；`parameters`：`model`（wan3.0-video / wan3.0-video-prime）、`resolution`（1080P/720P/480P）、`ratio`（adaptive/16:9/4:3/1:1/3:4/9:16）、`duration`（整数 2~30，默认 5）、`seed`（0~2147483647）、`audio`、`promptExtend`、`watermark` 布尔。

#### 3. `WanxiangVideoService` 并发约束调整（内部修改）

`assertNoActiveTask(userId)` 改为按实体维度：当传入 `entityId` 时，仅当**同一节点**存在 PENDING/RUNNING 任务时拦截（不同节点可并行）；未传 `entityId` 时保持原有全局校验（向后兼容，当前无其他调用方）。同步更新 `wanxiang-video-service.spec.ts` 既有用例并补充"不同节点可并行、同一节点被拦截"用例。

### 前端

#### 1. 页面布局：画布铺满主内容区 + 悬浮 Panel

`apps/web/src/routes/_auth/creative/video/index.tsx` 继续指向改造后的 `CreativeVideoPage`。页面容器沿用 `h-(--content-min-height)` 且无内边距，`<ReactFlow>` 占满整个主内容区（全局 AppLayout 的侧边栏与顶栏保持不变，画布是其下主区域）。

操作区全部使用 `@xyflow/react` 的 `Panel` 组件悬浮于画布之上，不占画布空间：

- **左上 Panel（创作空间操作区）**：显示当前空间名称；点击弹出下拉（DropdownMenu）：切换空间列表（名称 + 更新时间，当前项高亮）、新建空间、重命名当前空间、删除当前空间。新建/重命名用 Dialog 输入名称；删除用确认 Dialog 并提示"该空间的视频生成任务将一并删除"。删除当前空间后切换到剩余第一个，若无剩余则自动新建一个。
- **右上 Panel（画布工具栏）**：添加节点按钮——提示词 / 图片素材 / 视频生成，新节点生成 uuid（复用 `#/shared/uuid.ts` 的 `createUuid`）并放置在当前视口中心（带错位偏移）。
- **左下 Panel**：保存状态指示（保存中… / 已保存）+ 缩放提示。

#### 2. 节点模型（三类自定义节点）

`apps/web/src/features/creative-video/` 目录扩展：

- `types.ts`：画布 JSON 类型（nodes/edges/viewport）、节点 data 类型、任务状态类型（与后端 `WanxiangVideoTaskStatus` 对齐）
- `nodes/prompt-node.tsx`：提示词节点——内联 Textarea 编辑提示词；1 个 source handle（`prompt`）
- `nodes/image-node.tsx`：图片素材节点——点击上传（复用 `#/hooks/use-oss.tsx`，OSS key 形如 `video-workspace/{workspaceId}/{uuid}.png`），`<img>` 预览；1 个 source handle（`image`）
- `nodes/generation-node.tsx`：视频生成节点——3 个 target handle（`prompt` / `firstFrame` / `lastFrame`）；参数面板（模型 / 分辨率 / 比例 / 时长 / seed / 音频开关）；生成按钮、任务状态展示（待生成 / 生成中 spinner / 失败原因 / 已放弃）、完成后 `<video controls>` 预览；提供重新生成与放弃操作
- `nodes/definitions.ts`：`nodeTypes` 映射、handle id 常量、`isValidConnection` 校验（prompt 源仅连 prompt 目标、image 源仅连 firstFrame/lastFrame 目标、每个 handle 至多 1 条入边）

节点 data 形状（随画布 JSON 持久化）：

```ts
type PromptNodeData = { kind: 'prompt'; prompt: string }
type ImageNodeData = { kind: 'image'; imageUrl: string | null; fileName?: string }
type GenerationNodeData = {
  kind: 'generation'
  parameters: { model: string; resolution: string; ratio: string; duration: number; seed?: number; audio: boolean }
  task: { taskId: string; status: string; videoUrl: string | null; reason: string | null } | null
}
```

#### 3. 状态与持久化

- `hooks/use-video-workspace.ts`：空间列表 / 当前空间 / 切换 / 新建 / 重命名 / 删除；首次进入无空间时自动创建「默认创作空间」；切换/删除后的兜底逻辑如上
- `hooks/use-canvas.ts`：nodes/edges/viewport 状态 + 800ms 防抖自动保存（`query.videoWorkspaces.saveCanvas`）；切换空间、提交生成、`beforeunload`（fetch keepalive）时 flush 未保存变更；保存状态暴露给左下 Panel
- `hooks/use-task-polling.ts`：按节点任务状态轮询——任务处于 PENDING/RUNNING 时以 3s 间隔请求 `query.videoWorkspaces.checkTask`（queryKey 含 workspaceId + taskId），终态后停止并把 videoUrl/reason 写回节点 data（经由防抖保存）；组件卸载（切换空间/删除节点）时停止轮询

#### 4. 生成数据流

1. 点击生成按钮 → 校验：恰好 1 条 prompt 入边且提示词非空；firstFrame/lastFrame 各至多 1 张图片
2. 组装请求：`POST /video-workspaces/:id/nodes/:nodeId/generate`，`input: { prompt, media: [first_frame?, last_frame?] }`，`parameters`/`model` 取节点面板配置
3. 成功后把返回任务（taskId/status）写入节点 data.task，进入轮询
4. 终态：SUCCEEDED → 节点内 `<video>` 预览（直接使用万相返回的视频 URL）+ 成功 toast；FAILED/CANCELED → 展示 reason + 提示 toast
5. 运行中可放弃（abandon）或等终态后重新生成（同一节点再次提交，受按节点并发约束保护，UI 上运行中禁用生成按钮）

#### 5. 边界与失败模式

- 图片 OSS 上传失败 → 节点内 toast 提示，imageUrl 置空
- 提示词节点未连接 / 提示词为空 → 生成按钮禁用并提示
- 同一节点重复提交 → 后端 400（按节点并发），UI 运行中禁用生成
- 删除运行中任务的生成节点 → 确认 Dialog 提示任务将丢失
- 画布保存冲突：单用户，last-write-wins（带 updatedAt，不做版本冲突）
- 万相视频 URL 为临时地址，节点内直接预览，不转存 OSS（后续可扩展）
- 空间删除级联清理任务记录（不清理 OSS 文件，属主已删空间，MVP 接受）

## Test Plan

后端（Japa）：

- `tests/unit/video-workspace-service.spec.ts`：空间 CRUD、属主校验、画布 JSON 存取往返、非法画布结构拒绝、删除时按节点 id 级联清理任务记录
- `tests/unit/wanxiang-video-service.spec.ts`：补充按节点并发用例（不同 entityId 可并行创建、同一 entityId 被拦截、无 entityId 保持全局校验）
- `tests/functional/video-workspaces.spec.ts`：鉴权 401、创建/列表/详情/重命名/画布保存/删除、用户隔离、删除级联任务
- `tests/functional/video-workspace-generation.spec.ts`（镜像现有 `wanxiang-video-edit.spec.ts`）：生成请求体校验（提示词长度、media 类型与数量、参数范围）、nodeId 不属于画布节点时拒绝、任务属主/空间隔离、终态任务投影、check 轮询行为、abandon

验证命令：

```bash
pnpm --filter api typecheck
pnpm --filter api test
pnpm --filter api check
```

数据库迁移不在实现范围内；实现后由用户执行 `pnpm --filter api db:migrate:run` 并运行 `pnpm --filter api dev` 重新生成 `.adonisjs`（tuyau）客户端后，web 侧 `query.videoWorkspaces.*` 才可编译。

前端手动验证清单（无前端测试套件，按项目规范在 PR 中记录）：

- 无空间时自动创建「默认创作空间」；新建/切换/重命名/删除空间，切换后画布内容正确加载与隔离
- 添加三类节点、自由拖拽与缩放、连线规则（prompt→生成、image→首帧/尾帧、每个 handle 至多 1 条入边）生效
- 图片上传（OSS）成功后节点显示预览；失败提示
- 配置参数点击生成 → 节点显示生成中 → 完成后节点内可播放视频；失败显示原因；可放弃；终态后可重新生成
- 刷新/切换空间后画布状态恢复；保存指示与防抖保存正常
- 删除空间后其任务记录被级联清理（后端行为）

## Assumptions

- 创作空间命名采用 `video_workspaces`（表）/ `video-workspaces`（路由）/ `VideoWorkspace`（模型）与前端 `videoWorkspaces`，突出"视频创作"语义。
- 万相生成服务仅内部使用，不新增独立 controller/routes；对外只暴露视频创作空间域接口。
- 所有创作空间操作（切换/新建/重命名/删除/名称显示）与画布工具栏均为悬浮 `Panel`，画布铺满主内容区。
- 一个生成节点仅允许连接 1 个提示词节点（多提示词拼接不在 MVP）；图片最多首帧 + 尾帧各 1 张。
- 图片素材来源为 OSS 上传（复用现有 `useOss` 与 `oss/policy` 接口），不从素材库选择。
- 画布以 JSON 文档存储于 `video_workspaces.canvas` 列，防抖自动保存 + 离开时 flush，last-write-wins。
- 生成任务通过 `entity_id = 节点 id` 关联空间，不新增 `workspace_id` 列；删除空间时按画布节点 id 级联删除任务记录。
- 生成默认参数 = 服务默认（wan3.0-video / 1080P / adaptive / 5s / audio / promptExtend / 无水印），节点面板可调。
- 生成完成的视频直接使用万相返回的临时 URL 预览，不转存 OSS。
- 不做节点视频合并导出；每个节点独立产出。
