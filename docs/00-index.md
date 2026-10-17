# 00 · 目录

`docs/` 是项目的唯一事实来源：描述已实现的能力、关键规则和开发约定，不记录尚未落地的设想。代码必须与文档保持一致；发现差异时先核实原因，再同步修正，不能把文档当成忽略代码现状的理由。

## 章节

| 章节 | 内容与功能归属 | 实现入口 |
| --- | --- | --- |
| [01 · 项目结构](01-architecture.md) | 架构、共享 UI、API 通信、素材上传 | `apps/api/start/routes.ts`、`apps/web/src/services/api.ts` |
| [02 · 登录与权限](02-auth.md) | 登录、会话校验、退出、角色权限 | `session-controller.ts`、`auth-provider.tsx` |
| [03 · 视频库](03-videos.md) | 视频管理、链接采集、语音转写、文案润色 | `video-service.ts`、`features/video/` |
| [04 · 音色](04-voices.md) | 系统/克隆音色、音频与视频声音克隆 | `voice-service.ts`、`features/voice/` |
| [05 · 音频创作](05-creative-audio.md) | 文本合成音频、配置、播放与历史 | `creative-audio-service.ts`、`features/creative-audio/` |
| [06 · 视频拆解](06-video-breakdown.md) | 场景检测、切片、拆解任务 | `video-breakdown-job.ts`、`features/video-breakdown/` |
| [07 · 视频编辑](07-video-edit.md) | 拆解片段编辑、对话历史、编辑任务 | `video-edit-conversation-service.ts`、`wanxiang-video-edit-service.ts` |
| [08 · 视频创作](08-creative-video.md) | 创作空间、节点画布、视频生成 | `video-workspace-service.ts`、`features/creative-video/` |
| [09 · 开发与运行](09-development.md) | 环境、命令、代码规范、测试与交付 | 根目录及各 workspace 的 `package.json` |
| [10 · 抖音博主库](10-douyin-creators.md) | 博主添加、资料抓取、刷新与卡片管理 | `douyin-creator-service.ts`、`features/douyin-creator/` |

## 维护规则

- 功能与文档一一对应：每项功能只有一个归属章节；相关章节通过链接引用，不重复维护同一规则。一个章节可以包含该功能的多个子流程。
- 新增功能必须补充对应章节或新建章节并更新本目录；修改、删除功能时同步修改、删除相应描述，不能留下未实现的功能承诺。
- 章节文件采用 `两位编号-主题.md`，`00` 固定为目录；保持现有编号稳定，新增章节顺延。
- 只写用途、流程、关键边界和代码入口，不复制完整接口字段、数据库结构或实现代码。跨功能约定集中在 01/09 章。
- `AGENTS.md` 负责引导工作流程，README 只提供入口；`plans/` 是历史方案，不作为现行事实来源，也不代表功能已经实现。
- 开始任务先查目录及相关章节；结束任务核对代码与文档，必要时一起更新。纯重构且行为未变时无需制造文档改动。
