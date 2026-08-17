import app from '@adonisjs/core/services/app';

import BusinessException from '#exceptions/business-exception';
import WanxiangVideoEditTaskModel from '#models/wanxiang-video-edit-task';
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

export type WanxiangVideoEditTaskUpdate = {
  status: WanxiangVideoEditTaskStatus;
  videoUrl: string | null;
  result: string | null;
  reason: string | null;
};

const CREATE_TASK_PATH = '/api/v1/services/aigc/video-generation/video-synthesis';
const MAX_PROMPT_LENGTH = 5000;
const MAX_NEGATIVE_PROMPT_LENGTH = 500;
const MAX_REFERENCE_IMAGE_COUNT = 4;
const MIN_DURATION = 2;
const MAX_DURATION = 10;
const MAX_SEED = 2147483647;
const ENTITY_ID_MAX_LENGTH = 36;

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

/** 终态任务无需再请求远程，直接使用本地缓存结果 */
function isTerminalStatus(status: string): boolean {
  return (
    status === WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED ||
    status === WANXIANG_VIDEO_EDIT_TASK_STATUS.FAILED ||
    status === WANXIANG_VIDEO_EDIT_TASK_STATUS.CANCELED ||
    status === WANXIANG_VIDEO_EDIT_TASK_STATUS.UNKNOWN
  );
}

/** entity_id 用于关联应用内其他功能实体，长度不超过 uuid（36 位） */
export function isValidWanxiangEntityId(value: string): boolean {
  return value.trim().length > 0 && value.length <= ENTITY_ID_MAX_LENGTH;
}

/** 构建请求配置 JSON（含 model/prompt/negative_prompt/media/parameters），用于审计与重试 */
export function buildWanxiangTaskConfig(params: WanxiangCreateVideoEditTaskParams): string {
  return JSON.stringify({
    model: params.model ?? WANXIANG_VIDEO_EDIT_MODEL,
    ...(params.input.prompt !== undefined && { prompt: params.input.prompt }),
    ...(params.input.negativePrompt !== undefined && { negativePrompt: params.input.negativePrompt }),
    media: params.input.media,
    ...(params.parameters !== undefined && { parameters: params.parameters }),
  });
}

export class WanxiangVideoEditService {
  protected async getFetchClient(): Promise<Pick<FetchClient, 'json'>> {
    return app.container.make('fetch');
  }

  /**
   * 步骤1：创建视频编辑任务（HTTP），返回 task_id 用于后续轮询查询。
   */
  async submit(params: WanxiangCreateVideoEditTaskParams) {
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
   * 步骤2：根据 task_id 查询任务状态与结果（HTTP）。
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

  /** 提交任务并持久化任务记录 */
  async create(params: { userId: string; entityId: string; input: WanxiangVideoEditInput; parameters?: WanxiangVideoEditParameters; model?: string }) {
    if (!isValidWanxiangEntityId(params.entityId)) throw providerError(`entity_id 长度需在 1～${ENTITY_ID_MAX_LENGTH} 个字符之间`);
    const submission = await this.submit({ input: params.input, parameters: params.parameters, model: params.model });
    return WanxiangVideoEditTaskModel.create({
      userId: params.userId,
      entityId: params.entityId,
      taskId: submission.taskId,
      status: submission.taskStatus,
      config: buildWanxiangTaskConfig({ input: params.input, parameters: params.parameters, model: params.model }),
      videoUrl: null,
      result: null,
      reason: null,
    });
  }

  /** 轮询查询远程任务状态，并同步更新本地任务记录；终态任务直接返回，不再请求远程 */
  async checkTask(params: { taskId: string; userId: string }) {
    const task = await this.getByTaskId(params);
    if (!task) throw new BusinessException('任务不存在');
    if (isTerminalStatus(task.status)) return task;
    const remote = await this.getTask({ taskId: params.taskId });

    const update: WanxiangVideoEditTaskUpdate = { status: remote.taskStatus, videoUrl: null, result: null, reason: null };
    if (remote.taskStatus === WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED) {
      update.videoUrl = remote.videoUrl;
      update.result = JSON.stringify({
        usage: remote.usage,
        submitTime: remote.submitTime,
        scheduledTime: remote.scheduledTime,
        endTime: remote.endTime,
        origPrompt: remote.origPrompt,
        requestId: remote.requestId,
      });
    } else if (remote.taskStatus === WANXIANG_VIDEO_EDIT_TASK_STATUS.FAILED || remote.taskStatus === WANXIANG_VIDEO_EDIT_TASK_STATUS.CANCELED) {
      update.reason = remote.message || null;
    }
    await task.merge(update).save();
    return task;
  }

  /** 获取某个实体最新的编辑任务记录 */
  async getByEntityId(params: { entityId: string; userId: string }) {
    return WanxiangVideoEditTaskModel.query().where('userId', params.userId).where('entityId', params.entityId).orderBy('id', 'desc').first();
  }

  /** 按万相任务 ID 获取任务记录 */
  async getByTaskId(params: { taskId: string; userId: string }) {
    return WanxiangVideoEditTaskModel.query().where('userId', params.userId).where('taskId', params.taskId).first();
  }

  /** 分页查询任务记录 */
  async list(params: { userId: string; entityId?: string; status?: WanxiangVideoEditTaskStatus; page?: number; size?: number }) {
    const query = WanxiangVideoEditTaskModel.query().where('userId', params.userId);
    if (params.entityId) query.where('entityId', params.entityId);
    if (params.status) query.where('status', params.status);
    query.orderBy('id', 'desc');
    return query.paginate(params.page ?? 1, params.size ?? 10);
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
