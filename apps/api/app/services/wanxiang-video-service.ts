import app from '@adonisjs/core/services/app';

import BusinessException from '#exceptions/business-exception';
import WanxiangVideoTaskModel from '#models/wanxiang-video-task';
import type { FetchClient } from '#providers/fetch-provider';
import env from '#start/env';
import { asRecord, type JsonRecord, optionalString } from '#utils/type-guards';

/**
 * 万相 3.0 全能参考视频生成模型（All-in-One）。
 *
 * 统一支持文生视频、图生视频（首帧/首尾帧）、参考生视频、参考文件生视频与视频编辑/延长，
 * 最长生成 30 秒、30fps 视频。API 为异步调用：创建任务获取 task_id -> 轮询查询结果。
 */
export const WANXIANG_VIDEO_MODEL_STANDARD = 'wan3.0-video' as const;
export const WANXIANG_VIDEO_MODEL_PRIME = 'wan3.0-video-prime' as const;
export const WANXIANG_VIDEO_MODELS = [WANXIANG_VIDEO_MODEL_PRIME, WANXIANG_VIDEO_MODEL_STANDARD] as const;
export type WanxiangVideoModel = (typeof WANXIANG_VIDEO_MODELS)[number];

export const WANXIANG_VIDEO_TASK_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type WanxiangVideoTaskStatus = (typeof WANXIANG_VIDEO_TASK_STATUS)[keyof typeof WANXIANG_VIDEO_TASK_STATUS];

export const WANXIANG_VIDEO_RESOLUTIONS = ['1080P', '720P', '480P'] as const;
export type WanxiangVideoResolution = (typeof WANXIANG_VIDEO_RESOLUTIONS)[number];

export const WANXIANG_VIDEO_RATIOS = ['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16'] as const;
export type WanxiangVideoRatio = (typeof WANXIANG_VIDEO_RATIOS)[number];

export const WANXIANG_VIDEO_MEDIA_TYPES = ['first_frame', 'last_frame', 'reference_image', 'reference_video', 'reference_audio', 'file', 'link'] as const;
export type WanxiangVideoMediaType = (typeof WANXIANG_VIDEO_MEDIA_TYPES)[number];

export type WanxiangVideoMedia = {
  type: WanxiangVideoMediaType;
  url: string;
};

export type WanxiangVideoInput = {
  prompt?: string;
  media?: WanxiangVideoMedia[];
};

export type WanxiangVideoParameters = {
  resolution?: WanxiangVideoResolution;
  ratio?: WanxiangVideoRatio;
  duration?: number;
  audio?: boolean;
  seed?: number;
  promptExtend?: boolean;
  watermark?: boolean;
};

export type WanxiangCreateVideoTaskParams = {
  model?: WanxiangVideoModel;
  input: WanxiangVideoInput;
  parameters?: WanxiangVideoParameters;
};

export type WanxiangVideoUsage = {
  duration: number | null;
  inputVideoDuration: number | null;
  outputVideoDuration: number | null;
  videoCount: number | null;
  fps: number | null;
  sr: number | null;
  ratio: string | null;
};

export type WanxiangVideoTask = {
  taskId: string;
  taskStatus: WanxiangVideoTaskStatus;
  videoUrl: string | null;
  origPrompt: string | null;
  submitTime: string | null;
  scheduledTime: string | null;
  endTime: string | null;
  usage: WanxiangVideoUsage | null;
  code: string | null;
  message: string | null;
  requestId: string | null;
};

export type WanxiangVideoTaskUpdate = {
  status: WanxiangVideoTaskStatus;
  videoUrl: string | null;
  result: string | null;
  reason: string | null;
};

const CREATE_TASK_PATH = '/api/v1/services/aigc/video-generation/video-synthesis';
const MAX_PROMPT_LENGTH = 20000;
const SMART_DURATION = -1;
const MIN_DURATION = 2;
const MAX_DURATION = 30;
const DEFAULT_DURATION = 5;
const MAX_SEED = 2147483647;
const ENTITY_ID_MAX_LENGTH = 36;
const REFERENCE_MEDIA_TYPES = ['reference_image', 'reference_video', 'reference_audio', 'file', 'link'] as const;
const MEDIA_LIMITS: Record<WanxiangVideoMediaType, number> = {
  first_frame: 1,
  last_frame: 1,
  reference_image: 10,
  reference_video: 5,
  reference_audio: 5,
  file: 1,
  link: 1,
};

function providerError(prefix: string, detail?: string) {
  const message = detail ? `${prefix}: ${detail}` : prefix;
  return new BusinessException(`视频生成失败: ${message}`);
}

function parseTaskStatus(value: string | undefined) {
  return Object.values(WANXIANG_VIDEO_TASK_STATUS).includes(value as WanxiangVideoTaskStatus) ? (value as WanxiangVideoTaskStatus) : WANXIANG_VIDEO_TASK_STATUS.UNKNOWN;
}

function optionalNumber(record: JsonRecord | null, key: string) {
  const value = record?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** 终态任务无需再请求远程，直接使用本地缓存结果 */
function isTerminalStatus(status: string) {
  return (
    status === WANXIANG_VIDEO_TASK_STATUS.SUCCEEDED ||
    status === WANXIANG_VIDEO_TASK_STATUS.FAILED ||
    status === WANXIANG_VIDEO_TASK_STATUS.CANCELED ||
    status === WANXIANG_VIDEO_TASK_STATUS.UNKNOWN
  );
}

/** entity_id 用于关联应用内其他功能实体，长度不超过 uuid（36 位） */
export function isValidWanxiangEntityId(value: string) {
  return value.trim().length > 0 && value.length <= ENTITY_ID_MAX_LENGTH;
}

/** 构建请求配置 JSON（含 model/prompt/media/parameters），用于审计与重试 */
export function buildWanxiangTaskConfig(params: WanxiangCreateVideoTaskParams) {
  return JSON.stringify({
    model: params.model ?? WANXIANG_VIDEO_MODEL_STANDARD,
    ...(params.input.prompt !== undefined && { prompt: params.input.prompt }),
    ...(params.input.media !== undefined && { media: params.input.media }),
    ...(params.parameters !== undefined && { parameters: params.parameters }),
  });
}

export class WanxiangVideoService {
  /** 提供商标识，供业务域选择对应服务 */
  readonly provider = 'wanxiang';

  protected async getFetchClient(): Promise<Pick<FetchClient, 'json'>> {
    return app.container.make('fetch');
  }

  /**
   * 步骤1：创建视频生成任务（HTTP），返回 task_id 用于后续轮询查询。
   */
  async submit(params: WanxiangCreateVideoTaskParams) {
    this.assertInput(params.input);
    this.assertParameters(params.parameters);

    const body = {
      model: params.model ?? WANXIANG_VIDEO_MODEL_STANDARD,
      input: {
        ...(params.input.prompt !== undefined && { prompt: params.input.prompt }),
        ...(params.input.media !== undefined && { media: params.input.media }),
      },
      parameters: this.buildParameters(params.parameters),
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
  async getTask(params: { taskId: string }) {
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
            fps: optionalNumber(usageRecord, 'fps'),
            sr: optionalNumber(usageRecord, 'SR'),
            ratio: optionalString(usageRecord, 'ratio') || null,
          }
        : null,
      code: optionalString(output, 'code') || null,
      message: optionalString(output, 'message') || null,
      requestId: optionalString(record, 'request_id') || null,
    };
  }

  /** 提交任务并持久化任务记录；按实体维度并发：同一节点同一时间仅一个任务，不同节点可并行，未传 entityId 时保持全局校验 */
  async create(params: { userId: string; entityId?: string; input: WanxiangVideoInput; parameters?: WanxiangVideoParameters; model?: WanxiangVideoModel }) {
    if (params.entityId !== undefined && !isValidWanxiangEntityId(params.entityId)) {
      throw providerError(`entity_id 长度需在 1～${ENTITY_ID_MAX_LENGTH} 个字符之间`);
    }
    await this.assertNoActiveTask(params.userId, params.entityId);
    const submission = await this.submit({ input: params.input, parameters: params.parameters, model: params.model });
    return WanxiangVideoTaskModel.create({
      userId: params.userId,
      entityId: params.entityId ?? null,
      taskId: submission.taskId,
      status: submission.taskStatus,
      config: buildWanxiangTaskConfig({ input: params.input, parameters: params.parameters, model: params.model }),
      videoUrl: null,
      result: null,
      reason: null,
    });
  }

  /** 放弃任务：仅属主可操作，非终态任务标记为已取消；仅本地标记，不调用远端取消接口 */
  async abandon(params: { taskId: string; userId: string }) {
    const task = await this.getByTaskId(params);
    if (!task) throw new BusinessException('任务不存在');
    if (isTerminalStatus(task.status)) throw new BusinessException('任务已结束，无需放弃');
    await task
      .merge({
        status: WANXIANG_VIDEO_TASK_STATUS.CANCELED,
        reason: '用户已放弃',
      })
      .save();
    return task;
  }

  /** 轮询查询远程任务状态，并同步更新本地任务记录；终态任务直接返回，不再请求远程 */
  async checkTask(params: { taskId: string; userId: string }) {
    const task = await this.getByTaskId(params);
    if (!task) throw new BusinessException('任务不存在');
    if (isTerminalStatus(task.status)) return task;
    const remote = await this.getTask({ taskId: params.taskId });

    const update: WanxiangVideoTaskUpdate = { status: remote.taskStatus, videoUrl: null, result: null, reason: null };
    if (remote.taskStatus === WANXIANG_VIDEO_TASK_STATUS.SUCCEEDED) {
      update.videoUrl = remote.videoUrl;
      update.result = JSON.stringify({
        usage: remote.usage,
        submitTime: remote.submitTime,
        scheduledTime: remote.scheduledTime,
        endTime: remote.endTime,
        origPrompt: remote.origPrompt,
        requestId: remote.requestId,
      });
    } else if (remote.taskStatus === WANXIANG_VIDEO_TASK_STATUS.FAILED || remote.taskStatus === WANXIANG_VIDEO_TASK_STATUS.CANCELED) {
      update.reason = remote.message || null;
    }
    await task.merge(update).save();
    return task;
  }

  /** 获取某个实体最新的生成任务记录 */
  async getByEntityId(params: { entityId: string; userId: string }) {
    return WanxiangVideoTaskModel.query().where('userId', params.userId).where('entityId', params.entityId).orderBy('id', 'desc').first();
  }

  /** 按万相任务 ID 获取任务记录 */
  async getByTaskId(params: { taskId: string; userId: string }) {
    return WanxiangVideoTaskModel.query().where('userId', params.userId).where('taskId', params.taskId).first();
  }

  /** 分页查询任务记录 */
  async list(params: { userId: string; entityId?: string; status?: WanxiangVideoTaskStatus; page?: number; size?: number }) {
    const query = WanxiangVideoTaskModel.query().where('userId', params.userId);
    if (params.entityId) query.where('entityId', params.entityId);
    if (params.status) query.where('status', params.status);
    query.orderBy('id', 'desc');
    return query.paginate(params.page ?? 1, params.size ?? 10);
  }

  /** 按实体维度并发校验：传入 entityId 时仅拦截同一节点上的进行中任务，未传时保持原有全局校验（向后兼容） */
  private async assertNoActiveTask(userId: string, entityId?: string) {
    const query = WanxiangVideoTaskModel.query().where('userId', userId).whereIn('status', [WANXIANG_VIDEO_TASK_STATUS.PENDING, WANXIANG_VIDEO_TASK_STATUS.RUNNING]);
    if (entityId !== undefined) {
      query.where('entityId', entityId);
    }
    const active = await query.first();
    if (active) {
      throw new BusinessException(entityId !== undefined ? '该节点已有视频生成任务进行中，请等待其完成后再试' : '当前已有视频生成任务进行中，请等待其完成后再试');
    }
  }

  private assertInput(input: WanxiangVideoInput) {
    if (!input.prompt && (!Array.isArray(input.media) || input.media.length === 0)) {
      throw providerError('prompt 和 media 至少需要传入一个');
    }
    if (input.prompt !== undefined && input.prompt.length > MAX_PROMPT_LENGTH) {
      throw providerError(`提示词长度不能超过 ${MAX_PROMPT_LENGTH} 个字符`);
    }

    const media = input.media ?? [];
    const counts = new Map<WanxiangVideoMediaType, number>();
    for (const item of media) {
      if (!item || typeof item.url !== 'string' || item.url.trim().length === 0) throw providerError('媒体素材 URL 无效');
      if (!WANXIANG_VIDEO_MEDIA_TYPES.includes(item.type)) throw providerError(`不支持的媒体素材类型: ${item.type}`);
      counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
    }

    for (const [type, limit] of Object.entries(MEDIA_LIMITS)) {
      const count = counts.get(type as WanxiangVideoMediaType) ?? 0;
      if (count > limit) throw providerError(`media 中 ${type} 最多传入 ${limit} 个`);
    }

    const hasFrame = (counts.get('first_frame') ?? 0) + (counts.get('last_frame') ?? 0) > 0;
    const hasReference = REFERENCE_MEDIA_TYPES.some((type) => (counts.get(type) ?? 0) > 0);
    if (hasFrame && hasReference) {
      throw providerError('first_frame/last_frame 与 reference_*/file/link 不能同时传入');
    }
    if ((counts.get('file') ?? 0) > 0 && (counts.get('link') ?? 0) > 0) {
      throw providerError('file 与 link 不能同时传入');
    }
  }

  private assertParameters(parameters?: WanxiangVideoParameters) {
    if (!parameters) return;
    if (parameters.duration !== undefined) {
      const isValidDuration =
        parameters.duration === SMART_DURATION || (Number.isInteger(parameters.duration) && parameters.duration >= MIN_DURATION && parameters.duration <= MAX_DURATION);
      if (!isValidDuration) {
        throw providerError(`视频时长需为 ${SMART_DURATION} 或 ${MIN_DURATION}～${MAX_DURATION} 之间的整数`);
      }
    }
    if (parameters.seed !== undefined && (!Number.isInteger(parameters.seed) || parameters.seed < 0 || parameters.seed > MAX_SEED)) {
      throw providerError(`随机数种子取值范围为 [0, ${MAX_SEED}]`);
    }
  }

  private buildParameters(parameters?: WanxiangVideoParameters) {
    if (!parameters) {
      return {
        resolution: WANXIANG_VIDEO_RESOLUTIONS[0],
        ratio: WANXIANG_VIDEO_RATIOS[0],
        duration: DEFAULT_DURATION,
        audio: true,
        prompt_extend: true,
        watermark: false,
      };
    }
    return {
      ...(parameters.resolution !== undefined && { resolution: parameters.resolution }),
      ...(parameters.ratio !== undefined && { ratio: parameters.ratio }),
      ...(parameters.duration !== undefined && { duration: parameters.duration }),
      ...(parameters.audio !== undefined && { audio: parameters.audio }),
      ...(parameters.seed !== undefined && { seed: parameters.seed }),
      ...(parameters.promptExtend !== undefined && { prompt_extend: parameters.promptExtend }),
      ...(parameters.watermark !== undefined && { watermark: parameters.watermark }),
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
