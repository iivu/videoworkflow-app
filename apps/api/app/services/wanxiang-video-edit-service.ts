import app from '@adonisjs/core/services/app';

import BusinessException from '#exceptions/business-exception';
import type { FetchClient } from '#providers/fetch-provider';
import env from '#start/env';
import { asRecord, type JsonRecord, optionalString } from '#utils/type-guards';

export const WANXIANG_VIDEO_EDIT_MODEL = 'wan2.7-videoedit' as const;

export const WANXIANG_VIDEO_EDIT_TASK_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type WanxiangVideoEditTaskStatus = (typeof WANXIANG_VIDEO_EDIT_TASK_STATUS)[keyof typeof WANXIANG_VIDEO_EDIT_TASK_STATUS];

export const WANXIANG_VIDEO_EDIT_RESOLUTIONS = ['720P', '1080P'] as const;
export type WanxiangVideoEditResolution = (typeof WANXIANG_VIDEO_EDIT_RESOLUTIONS)[number];

export const WANXIANG_VIDEO_EDIT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4'] as const;
export type WanxiangVideoEditRatio = (typeof WANXIANG_VIDEO_EDIT_RATIOS)[number];

export const WANXIANG_VIDEO_EDIT_AUDIO_SETTINGS = ['auto', 'origin'] as const;
export type WanxiangVideoEditAudioSetting = (typeof WANXIANG_VIDEO_EDIT_AUDIO_SETTINGS)[number];

export const WANXIANG_VIDEO_EDIT_MEDIA_TYPES = ['video', 'reference_image'] as const;
export type WanxiangVideoEditMediaType = (typeof WANXIANG_VIDEO_EDIT_MEDIA_TYPES)[number];

export type WanxiangVideoEditMedia = {
  type: WanxiangVideoEditMediaType;
  url: string;
};

export type WanxiangVideoEditInput = {
  prompt?: string;
  negativePrompt?: string;
  media: WanxiangVideoEditMedia[];
};

export type WanxiangVideoEditParameters = {
  resolution?: WanxiangVideoEditResolution;
  ratio?: WanxiangVideoEditRatio;
  duration?: number;
  audioSetting?: WanxiangVideoEditAudioSetting;
  promptExtend?: boolean;
  watermark?: boolean;
  seed?: number;
};

export type WanxiangCreateVideoEditTaskParams = {
  model?: string;
  input: WanxiangVideoEditInput;
  parameters?: WanxiangVideoEditParameters;
};

export type WanxiangVideoEditUsage = {
  duration: number | null;
  inputVideoDuration: number | null;
  outputVideoDuration: number | null;
  videoCount: number | null;
  sr: number | null;
};

export type WanxiangVideoEditTask = {
  taskId: string;
  taskStatus: WanxiangVideoEditTaskStatus;
  videoUrl: string | null;
  origPrompt: string | null;
  submitTime: string | null;
  scheduledTime: string | null;
  endTime: string | null;
  usage: WanxiangVideoEditUsage | null;
  code: string | null;
  message: string | null;
  requestId: string | null;
};

const CREATE_TASK_PATH = '/api/v1/services/aigc/video-generation/video-synthesis';
const MAX_PROMPT_LENGTH = 5000;
const MAX_NEGATIVE_PROMPT_LENGTH = 500;
const MAX_REFERENCE_IMAGE_COUNT = 4;
const MIN_DURATION = 2;
const MAX_DURATION = 10;
const MAX_SEED = 2147483647;

function providerError(prefix: string, detail?: string): BusinessException {
  const message = detail ? `${prefix}: ${detail}` : prefix;
  return new BusinessException(`万相视频编辑失败: ${message}`);
}

function parseTaskStatus(value: string | undefined): WanxiangVideoEditTaskStatus {
  return Object.values(WANXIANG_VIDEO_EDIT_TASK_STATUS).includes(value as WanxiangVideoEditTaskStatus)
    ? (value as WanxiangVideoEditTaskStatus)
    : WANXIANG_VIDEO_EDIT_TASK_STATUS.UNKNOWN;
}

function optionalNumber(record: JsonRecord | null, key: string): number | null {
  const value = record?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export class WanxiangVideoEditService {
  protected async getFetchClient(): Promise<Pick<FetchClient, 'json'>> {
    return app.container.make('fetch');
  }

  /**
   * 步骤1：创建视频编辑任务，返回 task_id 用于后续轮询查询。
   */
  async createTask(params: WanxiangCreateVideoEditTaskParams) {
    this.assertMedia(params.input.media);
    this.assertTextLengths(params.input);
    this.assertParameters(params.parameters);

    const body: JsonRecord = {
      model: params.model ?? WANXIANG_VIDEO_EDIT_MODEL,
      input: {
        ...(params.input.prompt !== undefined && { prompt: params.input.prompt }),
        ...(params.input.negativePrompt !== undefined && { negative_prompt: params.input.negativePrompt }),
        media: params.input.media,
      },
      ...(params.parameters !== undefined && { parameters: this.buildParameters(params.parameters) }),
    };

    const response = await (await this.getFetchClient()).json<unknown>(this.createTaskEndpoint(), {
      method: 'POST',
      headers: this.buildHeaders(true),
      body: JSON.stringify(body),
    });
    const record = asRecord(response);
    const output = asRecord(record?.output);
    const taskId = optionalString(output, 'task_id');
    const taskStatus = optionalString(output, 'task_status');
    if (!taskId || !taskStatus) {
      throw providerError('创建任务失败', optionalString(record, 'message') || '服务响应格式无效');
    }
    return { taskId, taskStatus: parseTaskStatus(taskStatus), requestId: optionalString(record, 'request_id') || null };
  }

  /**
   * 步骤2：根据 task_id 查询任务状态与结果。
   */
  async getTask(params: { taskId: string }): Promise<WanxiangVideoEditTask> {
    const response = await (await this.getFetchClient()).json<unknown>(this.taskEndpoint(params.taskId), {
      headers: this.buildHeaders(false),
    });
    const record = asRecord(response);
    const output = asRecord(record?.output);
    const taskId = optionalString(output, 'task_id');
    const taskStatus = optionalString(output, 'task_status');
    if (!taskId || !taskStatus) {
      throw providerError('查询任务失败', optionalString(record, 'message') || '服务响应格式无效');
    }
    const usageRecord = asRecord(record?.usage);
    return {
      taskId,
      taskStatus: parseTaskStatus(taskStatus),
      videoUrl: optionalString(output, 'video_url') || null,
      origPrompt: optionalString(output, 'orig_prompt') || null,
      submitTime: optionalString(output, 'submit_time') || null,
      scheduledTime: optionalString(output, 'scheduled_time') || null,
      endTime: optionalString(output, 'end_time') || null,
      usage: usageRecord
        ? {
            duration: optionalNumber(usageRecord, 'duration'),
            inputVideoDuration: optionalNumber(usageRecord, 'input_video_duration'),
            outputVideoDuration: optionalNumber(usageRecord, 'output_video_duration'),
            videoCount: optionalNumber(usageRecord, 'video_count'),
            sr: optionalNumber(usageRecord, 'SR'),
          }
        : null,
      code: optionalString(output, 'code') || null,
      message: optionalString(output, 'message') || null,
      requestId: optionalString(record, 'request_id') || null,
    };
  }

  /** 素材限制：视频有且仅有 1 个，参考图像最多 4 张 */
  private assertMedia(media: WanxiangVideoEditMedia[]) {
    if (!Array.isArray(media) || media.length === 0) throw providerError('媒体素材不能为空');
    for (const item of media) {
      if (!item || typeof item.url !== 'string' || item.url.trim().length === 0) throw providerError('媒体素材 URL 无效');
    }
    const videoCount = media.filter((item) => item.type === 'video').length;
    const imageCount = media.filter((item) => item.type === 'reference_image').length;
    if (videoCount !== 1) throw providerError('待编辑视频有且仅有 1 个');
    if (imageCount > MAX_REFERENCE_IMAGE_COUNT) throw providerError(`参考图像最多传入 ${MAX_REFERENCE_IMAGE_COUNT} 张`);
  }

  private assertTextLengths(input: WanxiangVideoEditInput) {
    if (input.prompt !== undefined && input.prompt.length > MAX_PROMPT_LENGTH) {
      throw providerError(`提示词长度不能超过 ${MAX_PROMPT_LENGTH} 个字符`);
    }
    if (input.negativePrompt !== undefined && input.negativePrompt.length > MAX_NEGATIVE_PROMPT_LENGTH) {
      throw providerError(`反向提示词长度不能超过 ${MAX_NEGATIVE_PROMPT_LENGTH} 个字符`);
    }
  }

  private assertParameters(parameters?: WanxiangVideoEditParameters) {
    if (!parameters) return;
    if (parameters.duration !== undefined) {
      if (!Number.isInteger(parameters.duration) || parameters.duration < MIN_DURATION || parameters.duration > MAX_DURATION) {
        throw providerError(`视频时长需为 ${MIN_DURATION}～${MAX_DURATION} 之间的整数`);
      }
    }
    if (parameters.seed !== undefined && (!Number.isInteger(parameters.seed) || parameters.seed < 0 || parameters.seed > MAX_SEED)) {
      throw providerError(`随机数种子取值范围为 [0, ${MAX_SEED}]`);
    }
  }

  private buildParameters(parameters: WanxiangVideoEditParameters): JsonRecord {
    return {
      ...(parameters.resolution !== undefined && { resolution: parameters.resolution }),
      ...(parameters.ratio !== undefined && { ratio: parameters.ratio }),
      ...(parameters.duration !== undefined && { duration: parameters.duration }),
      ...(parameters.audioSetting !== undefined && { audio_setting: parameters.audioSetting }),
      ...(parameters.promptExtend !== undefined && { prompt_extend: parameters.promptExtend }),
      ...(parameters.watermark !== undefined && { watermark: parameters.watermark }),
      ...(parameters.seed !== undefined && { seed: parameters.seed }),
    };
  }

  private baseUrl() {
    return `https://${env.get('ALIYUN_BAILIAN_WORKSPACE_ID')}.cn-beijing.maas.aliyuncs.com`;
  }

  private createTaskEndpoint() {
    return `${this.baseUrl()}${CREATE_TASK_PATH}`;
  }

  private taskEndpoint(taskId: string) {
    return `${this.baseUrl()}/api/v1/tasks/${encodeURIComponent(taskId)}`;
  }

  private buildHeaders(withAsync: boolean) {
    return {
      Authorization: `Bearer ${env.get('ALIYUN_BAILIAN_KEY')}`,
      'Content-Type': 'application/json',
      ...(withAsync ? { 'X-DashScope-Async': 'enable' } : {}),
    };
  }
}
