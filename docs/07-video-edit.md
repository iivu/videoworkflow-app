# 07 · 视频编辑

交互位于视频拆解详情的编辑对话面板。

## 行为与边界

- 仅能对当前用户已完成的拆解任务发起对话编辑；选中素材必须是该任务的有效视频分片，每次有且仅有一个待编辑视频。
- 提示词和素材提交给万相视频编辑服务，创建编辑任务并保存用户消息、关联任务的 assistant 消息。
- 当前同一用户有进行中的编辑任务时，不允许再创建编辑任务。
- 前端轮询同步远程状态；任务结束时将结果视频或失败原因回写 assistant 消息，终态不再查询远程。
- “放弃”将本地任务标为 `CANCELED` 并更新消息，不调用远程取消接口，不能保证供应商停止处理或计费。
- 编辑任务和消息按用户关联；另有 `/video-edit/tasks` 接口用于创建、查询和检查编辑任务。

## 入口

- 后端：`apps/api/app/services/video-edit-conversation-service.ts`、`wanxiang-video-edit-service.ts`；对话接口分组 `/video-breakdown/:taskId/video-edit`。
- 前端：`apps/web/src/features/video-breakdown/edit-chat-panel.tsx`、`edit-message-item.tsx`。
