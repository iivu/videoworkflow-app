# 05 · 音频创作

页面：`/creative/audio`。

## 行为与边界

- 选择供应商、模型和音色，输入文本及合成参数后生成音频，支持播放和查看历史。
- 支持百炼和 MiniMax，参数按供应商校验，不能混用不同供应商的配置。
- 百炼合成要求本地音色存在，且合成模型与该音色的克隆模型完全一致。
- 合成直接调用供应商，成功后保存文本、配置和 OSS 音频地址，不走本项目的后台队列。
- 合成历史仅返回当前用户的记录。

## 入口

- 后端：`apps/api/app/services/creative-audio-service.ts`、`bailian-audio-service.ts`、`minimaxi-service.ts`；接口分组 `/creative-audios`。
- 前端：`apps/web/src/features/creative-audio/`；音色规则见 [04](04-voices.md)。
