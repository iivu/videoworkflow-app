import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { DouyinDownloadService } from '#services/douyin-download-service';
import { DouyinPostService } from '#services/douyin-post-service';
import {
  createPostDownloadsValidator,
  createPostSearchValidator,
  listPostSearchesValidator,
  listPostWorksValidator,
  postSearchIdValidator,
  postSearchResultsValidator,
  retryPostDownloadsValidator,
} from '#validators/douyin-post';

@inject()
export default class DouyinPostsController {
  constructor(
    private readonly searches: DouyinPostService,
    private readonly downloads: DouyinDownloadService,
  ) {}

  async search(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    return ctx.ok(await this.searches.create(user.id, await ctx.request.validateUsing(createPostSearchValidator)));
  }

  async searchesList(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { page = 1, size = 20 } = await ctx.request.validateUsing(listPostSearchesValidator);
    return ctx.ok(await this.searches.list(user.id, page, size));
  }

  async searchShow(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { params } = await ctx.request.validateUsing(postSearchIdValidator);
    return ctx.ok(await this.searches.summary(await this.searches.owned(user.id, params.id)));
  }

  async results(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { params, page = 1, size = 20, custom, ...filters } = await ctx.request.validateUsing(postSearchResultsValidator);
    return ctx.ok(await this.searches.results(user.id, params.id, page, size, custom ? filters : undefined));
  }

  async invalidate(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { params } = await ctx.request.validateUsing(postSearchIdValidator);
    return ctx.ok(await this.searches.invalidate(user.id, params.id));
  }

  async download(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { searchId, awemeIds, ...filters } = await ctx.request.validateUsing(createPostDownloadsValidator);
    return ctx.ok(await this.downloads.create(user.id, searchId, awemeIds, filters));
  }

  async batches(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { page = 1, size = 10 } = await ctx.request.validateUsing(listPostSearchesValidator);
    return ctx.ok(await this.downloads.batches(user.id, page, size));
  }

  async tasks(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { params, page = 1, size = 20 } = await ctx.request.validateUsing(postSearchResultsValidator);
    return ctx.ok(await this.downloads.tasks(user.id, params.id, page, size));
  }

  async retry(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { params, taskId } = await ctx.request.validateUsing(retryPostDownloadsValidator);
    return ctx.ok(await this.downloads.retry(user.id, params.id, taskId));
  }

  async works(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { page = 1, size = 20, creatorId, keyword } = await ctx.request.validateUsing(listPostWorksValidator);
    return ctx.ok(await this.downloads.works(user.id, page, size, creatorId, keyword));
  }

  async remove(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { params } = await ctx.request.validateUsing(postSearchIdValidator);
    return ctx.ok(await this.downloads.remove(user.id, params.id));
  }
}
