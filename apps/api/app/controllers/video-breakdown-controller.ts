import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';

import { VideoBreakdownService } from '#services/video-breakdown-service';
import VideoBreakdownTaskTransformer from '#transformers/video-breakdown-task-transformer';
import { createVideoBreakdownTaskValidator, listVideoBreakdownTasksValidator, showVideoBreakdownTaskValidator } from '#validators/video-breakdown';

@inject()
export default class VideoBreakdownController {
  constructor(private readonly videoBreakdownService: VideoBreakdownService) {}

  async create(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(createVideoBreakdownTaskValidator);
    const task = await this.videoBreakdownService.create({ payload, userId: user.id });
    return ctx.ok(await ctx.serialize.withoutWrapping(VideoBreakdownTaskTransformer.transform(task)));
  }

  async list(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(listVideoBreakdownTasksValidator);
    const paginated = await this.videoBreakdownService.list({ payload, userId: user.id });
    return ctx.ok({
      meta: { total: paginated.total, currentPage: paginated.currentPage },
      list: await ctx.serialize.withoutWrapping(VideoBreakdownTaskTransformer.transform(paginated.all())),
    });
  }

  async show(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(showVideoBreakdownTaskValidator);
    const task = await this.videoBreakdownService.get({ taskId: payload.params.taskId, userId: user.id });
    if (!task) return ctx.error('任务不存在');
    return ctx.ok(await ctx.serialize.withoutWrapping(VideoBreakdownTaskTransformer.transform(task)));
  }
}
