import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';

import { CrawlerVideoTaskService } from '#services/crawler-video-task-service';
import { VideoService } from '#services/video-service';
import CrawlerVideoTaskTransformer from '#transformers/crawler-video-task-transformer';
import VideoTransformer from '#transformers/video-transformer';
import { createCrawlerVideoTaskValidator, listCrawlerVideoTasksValidator } from '#validators/crawler-video-task';
import { checkVideoValidator, createVideoValidator, deleteVideoValidator, listVideoValidator, updateVideoValidator } from '#validators/video';

@inject()
export default class VideosController {
  constructor(
    private readonly videoService: VideoService,
    private readonly crawlerVideoTaskService: CrawlerVideoTaskService,
  ) {}

  async create(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(createVideoValidator);
    const videos = await this.videoService.createVideos({
      payload: payload.videos,
      userId: user.id,
    });
    return ctx.ok(await ctx.serialize.withoutWrapping(VideoTransformer.transform(videos)));
  }

  async update(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(updateVideoValidator);
    const video = await this.videoService.updateVideo({
      videoId: payload.params.id,
      payload,
    });
    return ctx.ok(await ctx.serialize.withoutWrapping(VideoTransformer.transform(video)));
  }

  async delete(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(deleteVideoValidator);
    if (await ctx.bouncer.with('VideoPolicy').denies('delete')) return ctx.fail('没有权限', 40300);
    const ids = await this.videoService.deleteVideos({
      videoIds: payload.ids,
    });
    return ctx.ok(ids);
  }

  async list(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(listVideoValidator);
    const paginated = await this.videoService.listVideo({
      payload,
    });
    return ctx.ok({
      meta: { total: paginated.total, currentPage: paginated.currentPage },
      list: await ctx.serialize.withoutWrapping(VideoTransformer.transform(paginated.all())),
    });
  }

  async check(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(checkVideoValidator);
    const video = await this.videoService.getVideoById({
      id: payload.params.id,
    });
    if (!video) return ctx.error('视频不存在');
    return ctx.ok(await ctx.serialize.withoutWrapping(VideoTransformer.transform(video)));
  }

  async createCrawlerTask(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(createCrawlerVideoTaskValidator);
    const ids = await this.crawlerVideoTaskService.create({
      payload,
      userId: user.id,
    });
    return ctx.ok(ids);
  }

  async listCrawlerTasks(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(listCrawlerVideoTasksValidator);
    const paginated = await this.crawlerVideoTaskService.list({
      payload,
      userId: user.id,
    });
    return ctx.ok({
      meta: { total: paginated.total, currentPage: paginated.currentPage },
      list: await ctx.serialize.withoutWrapping(CrawlerVideoTaskTransformer.transform(paginated.all())),
    });
  }
}
