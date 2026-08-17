import vine from '@vinejs/vine';

import { wanxiangMedia, wanxiangParameters } from '#validators/wanxiang-video-edit';

const videoEditConversationParams = vine.object({
  taskId: vine.string().trim().minLength(1).maxLength(36),
});

export const sendVideoEditMessageValidator = vine.create({
  params: videoEditConversationParams,
  prompt: vine.string().trim().minLength(1).maxLength(5000),
  media: vine.array(wanxiangMedia).minLength(1).maxLength(5),
  parameters: wanxiangParameters.optional(),
});

export const listVideoEditMessagesValidator = vine.create({
  params: videoEditConversationParams,
  page: vine.number().positive().optional(),
  size: vine.number().positive().optional(),
});

export const conversationTaskActionValidator = vine.create({
  params: videoEditConversationParams,
  taskId: vine.string().trim().minLength(1).maxLength(36),
});
