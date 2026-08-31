import vine from '@vinejs/vine';

import { WANXIANG_VIDEO_MODELS, WANXIANG_VIDEO_RATIOS, WANXIANG_VIDEO_RESOLUTIONS } from '#services/wanxiang-video-service';

const videoWorkspaceParamsSchema = vine.object({
  id: vine.string().trim().minLength(1),
});

const videoWorkspaceNodeParamsSchema = vine.object({
  id: vine.string().trim().minLength(1),
  nodeId: vine.string().trim().minLength(1).maxLength(36),
});

const videoWorkspaceTaskParamsSchema = vine.object({
  id: vine.string().trim().minLength(1),
  taskId: vine.string().trim().minLength(1).maxLength(36),
});

export const wanxiangCanvasMedia = vine.object({
  type: vine.enum(['first_frame', 'last_frame', 'reference_image'] as const),
  url: vine.string().trim().minLength(1),
});

export const wanxiangCanvasParameters = vine.object({
  resolution: vine.enum([...WANXIANG_VIDEO_RESOLUTIONS]).optional(),
  ratio: vine.enum([...WANXIANG_VIDEO_RATIOS]).optional(),
  duration: vine.number().min(2).max(30).withoutDecimals().optional(),
  seed: vine.number().min(0).max(2147483647).withoutDecimals().optional(),
  audio: vine.boolean().optional(),
  promptExtend: vine.boolean().optional(),
  watermark: vine.boolean().optional(),
});

export const generateVideoWorkspaceNodeValidator = vine.create({
  params: videoWorkspaceNodeParamsSchema,
  model: vine.enum([...WANXIANG_VIDEO_MODELS]).optional(),
  input: vine.object({
    prompt: vine.string().trim().minLength(1).maxLength(20000),
    media: vine.array(wanxiangCanvasMedia).maxLength(12).optional(),
  }),
  parameters: wanxiangCanvasParameters.optional(),
});

export const showVideoWorkspaceTaskValidator = vine.create({
  params: videoWorkspaceTaskParamsSchema,
});

export const listVideoWorkspaceTasksValidator = vine.create({
  params: videoWorkspaceParamsSchema,
  page: vine.number().positive().optional(),
  size: vine.number().positive().optional(),
});
