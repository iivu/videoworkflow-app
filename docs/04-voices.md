# 04 · 音色

音色通过共用弹窗选择和克隆，没有独立页面；用于 [音频创作](05-creative-audio.md)。

## 行为与边界

- 支持百炼（`bailian`）和 MiniMax（代码标识 `minimaxi`）；供应商、模型和配置必须匹配。
- 系统音色从指定供应商读取；克隆音色从本地记录分页读取，当前并未按创建者过滤，不能把“用户音色”理解为用户私有库。
- 音频克隆直接调用供应商并保存音色；视频克隆先创建任务，在 `video-to-voice-queue` 中提取音频后克隆。
- 视频克隆任务及历史按当前用户查询，记录成功或失败状态及原因。

## 入口

- 后端：`apps/api/app/services/voice-service.ts`、`apps/api/app/jobs/video-to-voice-job.ts`；接口分组 `/voices`。
- 前端：`apps/web/src/features/voice/`、`apps/web/src/providers/voice-list-dialog-provider.tsx`。
