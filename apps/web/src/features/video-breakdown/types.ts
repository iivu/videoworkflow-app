import type { Route } from '@tuyau/core/types';

/** 后端视频编辑对话消息，与 VideoEditMessageTransformer 序列化结果对齐（listMessages 按 id desc 返回） */
export type VideoEditMessage = Route.Response<'video_edit_conversation.list_messages'>['data']['list'][number];

/** 展示层对话消息：role 收窄为 user/assistant，便于分支渲染 */
export type ChatMessage = Omit<VideoEditMessage, 'role'> & { role: 'user' | 'assistant' };
