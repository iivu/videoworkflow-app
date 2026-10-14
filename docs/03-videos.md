# 03 · 视频库

页面：`/videos`（列表）、`/videos/create`（新增）、`/videos/$id`（详情）。

## 管理与采集

- 支持批量创建、编辑元数据、分页查询和批量删除；按标题、作者、发布日期及互动数据筛选。
- 视频记录保存创建者，但当前列表、详情和更新没有按创建者隔离；删除权限见 [02](02-auth.md)，删除时还会尝试移除 OSS 视频文件。
- 链接采集从分享文本提取 URL，自动识别抖音和微信视频号；不支持的平台会报错，没有 URL 的条目被跳过。
- 采集通过 ApiZero 解析元数据，再转存视频到 OSS 并写入视频库；在 `crawler-video-queue` 执行，任务历史按当前用户查询。

## 转写与文案润色

- 视频详情可提交 Paraformer 语音转写并轮询结果；转写任务按用户和视频关联，同一关联已有任务时不重复创建。
- 仅 `FAILED` / `UNKNOWN` 转写任务可重试；重试重新提交远程任务并清空旧结果与失败原因。
- 有转写结果后可请求 AI 文案润色，流式返回回答，并保存当前用户、当前视频的消息历史。
- 润色请求使用转写结果和本次用户输入；保存的历史消息当前不会作为多轮上下文传给模型。

## 入口

- 后端：`apps/api/app/services/video-service.ts`、`crawler-video-task-service.ts`、`paraformer-service.ts`、`ai-service.ts`，以及 `apps/api/app/jobs/crawler-video-job.ts`。
- 前端：`apps/web/src/features/video/`；接口分组为 `/videos`、`/paraformer`、`/chat/polish-article`。
