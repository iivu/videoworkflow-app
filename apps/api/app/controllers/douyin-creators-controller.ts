import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { DouyinCreatorService } from '#services/douyin-creator-service';
import DouyinCreatorTaskTransformer from '#transformers/douyin-creator-task-transformer';
import DouyinCreatorTransformer from '#transformers/douyin-creator-transformer';
import { createDouyinCreatorValidator, douyinCreatorIdValidator, douyinCreatorTaskIdValidator, listDouyinCreatorsValidator } from '#validators/douyin-creator';

@inject()
export default class DouyinCreatorsController {
  constructor(private readonly creators: DouyinCreatorService) {}

  async show(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { params } = await ctx.request.validateUsing(douyinCreatorIdValidator);
    const creator = await this.creators.show(user.id, params.id);
    return ctx.ok(await ctx.serialize.withoutWrapping(DouyinCreatorTransformer.transform(creator)));
  }

  async list(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(listDouyinCreatorsValidator);
    const { paginated, hasProcessing } = await this.creators.list(user.id, payload);
    return ctx.ok({
      meta: { total: paginated.total, currentPage: paginated.currentPage },
      hasProcessing,
      list: await ctx.serialize.withoutWrapping(DouyinCreatorTransformer.transform(paginated.all())),
    });
  }

  async create(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { source } = await ctx.request.validateUsing(createDouyinCreatorValidator);
    const task = await this.creators.create(user.id, source);
    return ctx.ok(await ctx.serialize.withoutWrapping(DouyinCreatorTaskTransformer.transform(task)));
  }

  async retry(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { params } = await ctx.request.validateUsing(douyinCreatorIdValidator);
    const task = await this.creators.retry(user.id, params.id);
    return ctx.ok(await ctx.serialize.withoutWrapping(DouyinCreatorTaskTransformer.transform(task)));
  }

  async remove(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { params } = await ctx.request.validateUsing(douyinCreatorIdValidator);
    await this.creators.remove(user.id, params.id);
    return ctx.ok({ id: params.id });
  }

  async task(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const { params } = await ctx.request.validateUsing(douyinCreatorTaskIdValidator);
    const task = await this.creators.task(user.id, params.taskId);
    return ctx.ok(await ctx.serialize.withoutWrapping(DouyinCreatorTaskTransformer.transform(task)));
  }
}
