import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';

import { WanxiangVideoEditService } from '#services/wanxiang-video-edit-service';
import WanxiangVideoEditTaskTransformer from '#transformers/wanxiang-video-edit-task-transformer';
import { createWanxiangVideoEditTaskValidator, listWanxiangVideoEditTasksValidator, showWanxiangVideoEditTaskValidator } from '#validators/wanxiang-video-edit';

@inject()
export default class WanxiangVideoEditController {
  constructor(private readonly wanxiangVideoEditService: WanxiangVideoEditService) {}

  /** 提交万相视频编辑任务并持久化 */
  async create(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(createWanxiangVideoEditTaskValidator);
    const task = await this.wanxiangVideoEditService.create({
      userId: user.id,
      entityId: payload.entityId,
      model: payload.model,
      input: payload.input,
      parameters: payload.parameters,
    });
    return ctx.ok(await ctx.serialize.withoutWrapping(WanxiangVideoEditTaskTransformer.transform(task)));
  }

  /** 分页查询任务列表，可按 entityId/status 过滤 */
  async list(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(listWanxiangVideoEditTasksValidator);
    const paginated = await this.wanxiangVideoEditService.list({ userId: user.id, ...payload });
    return ctx.ok({
      meta: { total: paginated.total, currentPage: paginated.currentPage },
      list: await ctx.serialize.withoutWrapping(WanxiangVideoEditTaskTransformer.transform(paginated.all())),
    });
  }

  /** 查询单个任务（本地记录） */
  async show(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(showWanxiangVideoEditTaskValidator);
    const task = await this.wanxiangVideoEditService.getByTaskId({ taskId: payload.params.taskId, userId: user.id });
    if (!task) return ctx.error('任务不存在');
    return ctx.ok(await ctx.serialize.withoutWrapping(WanxiangVideoEditTaskTransformer.transform(task)));
  }

  /** 轮询万相任务状态并同步本地记录；终态任务直接返回缓存结果 */
  async check(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(showWanxiangVideoEditTaskValidator);
    const task = await this.wanxiangVideoEditService.checkTask({ taskId: payload.params.taskId, userId: user.id });
    return ctx.ok(await ctx.serialize.withoutWrapping(WanxiangVideoEditTaskTransformer.transform(task)));
  }
}
