# 06 · 视频拆解

页面：`/video-breakdown`（任务列表）、`/video-breakdown/$id`（详情）。

## 流程与边界

- 提交视频 URL 后创建任务并进入 `video-breakdown-queue`；任务列表和详情只返回当前用户的数据。
- 当前队列实际使用 FFmpeg 场景检测确定分片边界，再切出视频片段；AI 场景分析未在队列中启用，不能将该功能描述为 AI 自动生成梗概。
- 结果含起止时间、文件相对路径及 `summary`；当前 `summary` 为空。
- 任务由 `pending` 进入 `processing`，最终为 `completed` 或 `failed`，失败时记录原因并清理任务文件。
- 源视频和处理文件放在 API 的 `tmp/video-breakdown`，成功片段放在 `public/video-breakdown`；成功后清理临时文件。
- 任务接口有用户校验，但片段通过公共静态文件服务访问，不等同于鉴权下载。
- 完成后的片段可用于 [视频编辑](07-video-edit.md)。

## 入口

- 后端：`apps/api/app/jobs/video-breakdown-job.ts`、`apps/api/app/services/video-breakdown-service.ts`、`ffmpeg-service.ts`；接口分组 `/videos/breakdown/tasks`。
- 前端：`apps/web/src/features/video-breakdown/list.tsx`、`detail.tsx`。
