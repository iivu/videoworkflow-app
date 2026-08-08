import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import logger from '@adonisjs/core/services/logger';

import BusinessException from '#exceptions/business-exception';
import { PARAFORMER_TASK_STATUS, ParaformerService } from '#services/paraformer-service';
import { VideoService } from '#services/video-service';
import ParaformerTaskTransformer from '#transformers/paraformer-task-transformer';
import { paraformerVideoValidator } from '#validators/paraformer';

@inject()
export default class ParaformerController {
  constructor(
    private readonly paraformerService: ParaformerService,
    private readonly videoService: VideoService,
  ) {}

  async transcription(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(paraformerVideoValidator);
    const video = await this.videoService.getVideoById({ id: payload.params.videoId, userId: user.id });
    if (!video) return ctx.error('视频不存在');

    const existingTask = await this.paraformerService.getTaskByVideoId({ videoId: video.id, userId: user.id });
    if (existingTask) return ctx.error('任务已存在');

    const task = await this.paraformerService.create({ videoUrl: video.fileUrl, videoId: video.id, userId: user.id });
    return ctx.ok(await ctx.serialize.withoutWrapping(ParaformerTaskTransformer.transform(task)));
  }

  async checkTask(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(paraformerVideoValidator);
    const task = await this.paraformerService.getTaskByVideoId({ videoId: payload.params.videoId, userId: user.id });
    if (!task) return ctx.ok(null);
    if (task.result || task.status === PARAFORMER_TASK_STATUS.FAILED || task.status === PARAFORMER_TASK_STATUS.UNKNOWN) {
      return ctx.ok(await ctx.serialize.withoutWrapping(ParaformerTaskTransformer.transform(task)));
    }

    const update = await this.paraformerService.checkTask({ taskId: task.taskId });
    await task.merge(update).save();
    return ctx.ok(await ctx.serialize.withoutWrapping(ParaformerTaskTransformer.transform(task)));
  }

  async transcriptionRetry(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(paraformerVideoValidator);
    const video = await this.videoService.getVideoById({ id: payload.params.videoId, userId: user.id });
    if (!video) return ctx.error('视频不存在');

    const task = await this.paraformerService.getTaskByVideoId({ videoId: video.id, userId: user.id });
    if (!task) return ctx.error('任务不存在');
    if (task.status !== PARAFORMER_TASK_STATUS.FAILED && task.status !== PARAFORMER_TASK_STATUS.UNKNOWN) {
      return ctx.error('当前任务的状态不支持重试');
    }

    const submission = await this.paraformerService.submit({ videoUrl: video.fileUrl });
    const update = { ...submission, result: null, reason: null };
    try {
      await task.merge(update).save();
    } catch (error) {
      logger.error(
        { taskId: submission.taskId, userId: user.id, videoId: video.id, err: error instanceof Error ? error.message : String(error) },
        'update paraformer transcription failed',
      );
      throw new BusinessException('转写任务更新失败');
    }
    return ctx.ok(await ctx.serialize.withoutWrapping(ParaformerTaskTransformer.transform(task)));
  }
}
