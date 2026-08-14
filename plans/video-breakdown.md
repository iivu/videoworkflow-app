# Video Breakdown Backend Feature

## Summary

新增一个视频拆解任务领域：

- 接收用户提供的 HTTPS 视频 URL，创建任务记录并投递队列 Job。
- Job 下载视频，将视频 URL 作为多模态输入交给 LLM，要求返回结构化片段数组。
- 校验每个片段的开始秒数、结束秒数和梗概，并使用 `ffmpeg` 生成对应视频文件。
- 成功后将结果 JSON 写入任务记录，片段保存在 `app.tmpPath('video-breakdown/{taskId}')` 下。
- 任务失败时记录错误原因并更新为 `failed`。
- 提供创建、分页列表和详情接口。

## Key Changes

### 数据模型与状态

通过 Adonis CLI 创建 migration/model/validator/controller/service/job/transformer 文件；创建文件前先检查对应的 `node ace make:*` 命令。

新增 `video_breakdown_tasks` 表：

- `id`
- `user_id`
- `video_url`
- `status`
- `result`，保存结构化 JSON
- `reason`
- `created_at`
- `updated_at`

状态固定为：

- `pending`：任务已创建，等待 Job 执行
- `processing`：Job 正在下载、分析或切片
- `completed`
- `failed`

`result` 中保存：

```ts
type VideoBreakdownSegment = {
  start: number
  end: number
  summary: string
  file: string
}

type VideoBreakdownResult = VideoBreakdownSegment[]
```

片段文件路径示例：

```text
video-breakdown/123/segments/segment-001.mp4
```

`apps/api/database/schema.ts` 由 Adonis 自动生成，不手工编辑，也不执行数据库迁移命令。

### API

新增认证接口：

- `POST /api/v1/videos/breakdown/tasks`
  - body：`{ videoUrl: string, model?: string }`
  - 接受 HTTPS URL
  - 创建 `pending` 任务并投递 `VideoBreakdownJob`

- `GET /api/v1/videos/breakdown/tasks`
  - 支持 `page`、`size`、`status`
  - 只返回当前用户的任务

- `GET /api/v1/videos/breakdown/tasks/:id`
  - 只允许访问当前用户任务
  - 返回任务状态、失败原因和拆解结果

默认模型为 `qwen-vl-max`，模型名写入 Job payload。

### LLM 与 Job

新增 `VideoBreakdownService`，复用现有阿里百炼 AI SDK 配置，通过结构化输出生成片段数组。

LLM 输出要求：

- `start`、`end` 为非负秒数
- `end > start`
- 按开始时间升序
- 片段不可重叠
- `summary` 为中文片段梗概
- 只返回结构化数组

新增 `VideoBreakdownJob`，使用队列 `video-breakdown-queue`：

1. 更新任务为 `processing`。
2. 下载源视频到 `app.tmpPath('video-breakdown/{taskId}')`。
3. 将视频 URL 作为多模态输入交给 LLM。
4. 校验结构化拆解结果。
5. 使用 `execFile('ffmpeg', ...)` 按时间范围生成 `segments/segment-001.mp4` 等文件。
6. 保存带文件相对路径的结果 JSON。
7. 更新为 `completed`。
8. 成功后保留片段目录；失败时更新为 `failed` 并清理不完整目录。

不配置自动重试；失败后允许用户重新创建任务。

## Test Plan

覆盖：

- HTTPS URL 校验
- 创建任务和 Job payload
- 入队失败后的 `failed` 状态
- LLM 结果的时间范围、排序、重叠和字段校验
- Job 成功后的 `processing -> completed`
- `ffmpeg` 分段参数和输出路径
- Job 失败后的错误持久化与临时目录清理
- 创建、列表、详情接口及用户隔离

验证命令：

```bash
pnpm --filter api typecheck
pnpm --filter api test
pnpm --filter api check
```

数据库迁移不在本次执行范围内；完成后运行 `pnpm --filter api dev` 生成 Adonis 客户端文件。

## Assumptions

- 输入为直接视频 URL，不关联已有 `videos` 记录。
- 使用现有阿里百炼多模态模型配置，默认 `qwen-vl-max`。
- 结果保存于任务表 JSON 字段，不新增片段子表。
- 片段持续保存在本地临时目录，详情接口返回相对路径。
- 本次不新增片段下载接口。
