import vine from '@vinejs/vine';

import {
  WANXIANG_VIDEO_EDIT_AUDIO_SETTINGS,
  WANXIANG_VIDEO_EDIT_MODEL,
  WANXIANG_VIDEO_EDIT_RATIOS,
  WANXIANG_VIDEO_EDIT_RESOLUTIONS,
  WANXIANG_VIDEO_EDIT_TASK_STATUS,
} from '#services/wanxiang-video-edit-service';

export const wanxiangMedia = vine.object({
  type: vine.enum(['video', 'reference_image'] as const),
  url: vine.string().trim().minLength(1),
});

export const wanxiangParameters = vine.object({
  resolution: vine.enum([...WANXIANG_VIDEO_EDIT_RESOLUTIONS]).optional(),
  ratio: vine.enum([...WANXIANG_VIDEO_EDIT_RATIOS]).optional(),
  duration: vine.number().min(2).max(10).withoutDecimals().optional(),
  audioSetting: vine.enum([...WANXIANG_VIDEO_EDIT_AUDIO_SETTINGS]).optional(),
  promptExtend: vine.boolean().optional(),
  watermark: vine.boolean().optional(),
  seed: vine.number().min(0).max(2147483647).withoutDecimals().optional(),
});

export const createWanxiangVideoEditTaskValidator = vine.create({
  entityId: vine.string().trim().minLength(1).maxLength(36),
  model: vine.enum([WANXIANG_VIDEO_EDIT_MODEL]).optional(),
  input: vine.object({
    prompt: vine.string().trim().maxLength(5000).optional(),
    negativePrompt: vine.string().trim().maxLength(500).optional(),
    media: vine.array(wanxiangMedia).minLength(1).maxLength(5),
  }),
  parameters: wanxiangParameters.optional(),
});

export const showWanxiangVideoEditTaskValidator = vine.create({
  params: vine.object({ taskId: vine.string().trim().minLength(1).maxLength(36) }),
});

export const listWanxiangVideoEditTasksValidator = vine.create({
  entityId: vine.string().trim().minLength(1).maxLength(36).optional(),
  status: vine.enum([...Object.values(WANXIANG_VIDEO_EDIT_TASK_STATUS)]).optional(),
  page: vine.number().positive().optional(),
  size: vine.number().positive().optional(),
});
