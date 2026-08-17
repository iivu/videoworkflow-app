import BusinessException from '#exceptions/business-exception';
import VideoBreakdownTask, { VIDEO_BREAKDOWN_TASK_STATUS } from '#models/video-breakdown-task';
import VideoEditMessage from '#models/video-edit-message';
import WanxiangVideoEditTask from '#models/wanxiang-video-edit-task';
import {
  WANXIANG_VIDEO_EDIT_TASK_STATUS,
  type WanxiangVideoEditInput,
  type WanxiangVideoEditMedia,
  type WanxiangVideoEditParameters,
  type WanxiangVideoEditTaskStatus,
} from '#services/wanxiang-video-edit-service';
import { asRecord } from '#utils/type-guards';

export type VideoEditMessageSource = {
  type: 'segment';
  segmentIndex: number | null;
};

export type VideoEditAssistantMessagePayload = {
  provider: string;
  task_id: string;
  status: WanxiangVideoEditTaskStatus;
  video_url: string | null;
  reason: string | null;
  source: VideoEditMessageSource;
};

export type VideoEditProviderService = {
  provider: string;
  create(params: { userId: string; entityId: string; input: WanxiangVideoEditInput; parameters?: WanxiangVideoEditParameters }): Promise<WanxiangVideoEditTask>;
  checkTask(params: { taskId: string; userId: string }): Promise<WanxiangVideoEditTask>;
  abandon(params: { taskId: string; userId: string }): Promise<WanxiangVideoEditTask>;
};

type SegmentLike = { start: string; end: string; file: string };

function isTerminalStatus(status: string): boolean {
  return (
    status === WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED ||
    status === WANXIANG_VIDEO_EDIT_TASK_STATUS.FAILED ||
    status === WANXIANG_VIDEO_EDIT_TASK_STATUS.CANCELED ||
    status === WANXIANG_VIDEO_EDIT_TASK_STATUS.UNKNOWN
  );
}

/**
 * 视频拆解对话式视频编辑服务。
 *
 * 对话消息自包含渲染所需信息（成片地址/失败原因/状态），终态历史消息零任务查询；
 * 任务终态由本服务的 check/abandon 回写 assistant 消息（按 user_id + task_id 定位）。
 * 提供商通过最小接口 `VideoEditProviderService` 依赖注入，切换提供商无需改表结构与消息格式。
 */
export class VideoEditConversationService {
  constructor(private readonly provider: VideoEditProviderService) {}

  /** 发送编辑指令：校验拆解任务与素材来源，调提供商创建任务并落库 user/assistant 消息 */
  async send(params: { userId: string; breakdownTaskId: string; prompt: string; media: WanxiangVideoEditMedia[]; parameters?: WanxiangVideoEditParameters }) {
    const breakdownTask = await VideoBreakdownTask.query().where('taskId', params.breakdownTaskId).where('userId', params.userId).first();
    if (!breakdownTask) throw new BusinessException('拆解任务不存在');
    if (breakdownTask.status !== VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED) throw new BusinessException('拆解任务尚未完成');

    const segments = this.parseBreakdownSegments(breakdownTask.result);
    const source = this.resolveSource({
      mediaUrl: this.extractVideoUrl(params.media),
      segments,
    });

    const task = await this.provider.create({
      userId: params.userId,
      entityId: params.breakdownTaskId,
      input: { prompt: params.prompt, media: params.media },
      parameters: params.parameters,
    });

    await VideoEditMessage.createMany([
      {
        userId: params.userId,
        entityId: params.breakdownTaskId,
        role: 'user',
        message: params.prompt,
        taskId: null,
      },
      {
        userId: params.userId,
        entityId: params.breakdownTaskId,
        role: 'assistant',
        message: JSON.stringify(this.buildAssistantPayload({ task, source })),
        taskId: task.taskId,
      },
    ]);

    return task;
  }

  /** 同步任务状态；终态时回写 assistant 消息（status/video_url/reason），重复调用幂等 */
  async check(params: { userId: string; breakdownTaskId: string; editTaskId: string }) {
    if (!(await this.getOwnedTask(params))) throw new BusinessException('任务不存在');

    const task = await this.provider.checkTask({ taskId: params.editTaskId, userId: params.userId });
    if (isTerminalStatus(task.status)) {
      await this.writeBack({
        userId: params.userId,
        editTaskId: params.editTaskId,
        status: this.toStatus(task.status),
        videoUrl: task.videoUrl,
        reason: task.reason,
      });
    }
    return task;
  }

  /** 放弃任务并回写 assistant 消息为已取消 */
  async abandon(params: { userId: string; breakdownTaskId: string; editTaskId: string }) {
    if (!(await this.getOwnedTask(params))) throw new BusinessException('任务不存在');

    const task = await this.provider.abandon({ taskId: params.editTaskId, userId: params.userId });
    await this.writeBack({
      userId: params.userId,
      editTaskId: params.editTaskId,
      status: WANXIANG_VIDEO_EDIT_TASK_STATUS.CANCELED,
      videoUrl: null,
      reason: '用户已放弃',
    });
    return task;
  }

  /** 分页查询对话消息（id desc，纯消息列表） */
  async listMessages(params: { userId: string; entityId: string; page: number; size: number }) {
    const paginated = await VideoEditMessage.query().where('userId', params.userId).where('entityId', params.entityId).orderBy('id', 'desc').paginate(params.page, params.size);

    return {
      meta: { total: paginated.total, currentPage: paginated.currentPage },
      list: paginated.all(),
    };
  }

  private async getOwnedTask(params: { userId: string; breakdownTaskId: string; editTaskId: string }) {
    return WanxiangVideoEditTask.query().where('userId', params.userId).where('taskId', params.editTaskId).where('entityId', params.breakdownTaskId).first();
  }

  private extractVideoUrl(media: WanxiangVideoEditMedia[]): string {
    const videos = media.filter((item) => item.type === 'video');
    if (videos.length !== 1) throw new BusinessException('万相视频编辑失败: 待编辑视频有且仅有 1 个');
    return videos[0].url;
  }

  private parseBreakdownSegments(result: string | null): SegmentLike[] {
    if (!result) return [];
    try {
      const parsed: unknown = JSON.parse(result);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is SegmentLike => {
        const record = asRecord(item);
        return record !== null && typeof record.start === 'string' && typeof record.end === 'string' && typeof record.file === 'string';
      });
    } catch {
      return [];
    }
  }

  /** 素材来源解析：仅支持视频分片（URL 后缀匹配分片 file），其余一律拒绝 */
  private resolveSource(params: { mediaUrl: string; segments: SegmentLike[] }): VideoEditMessageSource {
    const segmentIndex = params.segments.findIndex((segment) => this.urlMatchesSegment(params.mediaUrl, segment.file));
    if (segmentIndex !== -1) return { type: 'segment', segmentIndex };
    throw new BusinessException('编辑素材无效，请选择有效的视频分片');
  }

  private urlMatchesSegment(mediaUrl: string, file: string): boolean {
    return mediaUrl === file || mediaUrl.endsWith(`/${file}`) || mediaUrl.endsWith(file);
  }

  private buildAssistantPayload(params: { task: WanxiangVideoEditTask; source: VideoEditMessageSource }): VideoEditAssistantMessagePayload {
    return {
      provider: this.provider.provider,
      task_id: params.task.taskId,
      status: this.toStatus(params.task.status),
      video_url: null,
      reason: null,
      source: params.source,
    };
  }

  /** 终态回写：按 (user_id, role, task_id) 定位 assistant 消息，合并更新 status/video_url/reason，保留其余字段 */
  private async writeBack(params: { userId: string; editTaskId: string; status: WanxiangVideoEditTaskStatus; videoUrl: string | null; reason: string | null }) {
    const message = await VideoEditMessage.query().where('userId', params.userId).where('role', 'assistant').where('taskId', params.editTaskId).first();
    if (!message) return;
    const payload = this.parseAssistantPayload(message.message);
    if (!payload) return;
    payload.status = params.status;
    payload.video_url = params.videoUrl;
    payload.reason = params.reason;
    await message.merge({ message: JSON.stringify(payload) }).save();
  }

  private parseAssistantPayload(message: string): VideoEditAssistantMessagePayload | null {
    try {
      const record = asRecord(JSON.parse(message));
      if (!record || typeof record.task_id !== 'string') return null;
      const status = this.parseStatus(record.status);
      if (!status) return null;
      const source = asRecord(record.source);
      return {
        provider: typeof record.provider === 'string' ? record.provider : '',
        task_id: record.task_id,
        status,
        video_url: typeof record.video_url === 'string' ? record.video_url : null,
        reason: typeof record.reason === 'string' ? record.reason : null,
        source: {
          type: 'segment',
          segmentIndex: typeof source?.segmentIndex === 'number' ? source.segmentIndex : null,
        },
      };
    } catch {
      return null;
    }
  }

  private toStatus(value: string): WanxiangVideoEditTaskStatus {
    return this.parseStatus(value) ?? WANXIANG_VIDEO_EDIT_TASK_STATUS.UNKNOWN;
  }

  private parseStatus(value: unknown): WanxiangVideoEditTaskStatus | null {
    if (typeof value !== 'string') return null;
    return Object.values(WANXIANG_VIDEO_EDIT_TASK_STATUS).includes(value as WanxiangVideoEditTaskStatus) ? (value as WanxiangVideoEditTaskStatus) : null;
  }
}
