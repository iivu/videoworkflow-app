import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';

import type { XhsService } from '#services/xhs-service';
import { withAbort } from '#utils/with-abort';
import {
  chatCopyValidator,
  chatImageValidator,
  checkXhsSessionValidator,
  createXhsSessionValidator,
  listXhsMessagesValidator,
  listXhsSessionsValidator,
  updateXhsSessionValidator,
} from '#validators/xhs';

@inject()
export default class XhsSessionsController {
  constructor(private readonly xhsService: XhsService) {}

  async create(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(createXhsSessionValidator);
    return ctx.ok(
      await this.xhsService.createSession({
        userId: user.id,
        title: payload.title,
      }),
    );
  }

  async list(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(listXhsSessionsValidator);
    return ctx.ok(
      await this.xhsService.listSessions({
        userId: user.id,
        page: payload.page ?? 1,
        limit: payload.limit ?? 20,
      }),
    );
  }

  async show(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(checkXhsSessionValidator);
    const result = await this.xhsService.getSession({
      userId: user.id,
      sessionId: payload.params.id,
    });
    if (!result) return ctx.error('无权访问该会话或会话不存在', 40300);
    return ctx.ok(result);
  }

  async update(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(updateXhsSessionValidator);
    const result = await this.xhsService.updateSession({
      userId: user.id,
      sessionId: payload.params.id,
      title: payload.title,
    });
    if (!result) return ctx.error('无权访问该会话或会话不存在', 40300);
    return ctx.ok(result);
  }

  async delete(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(checkXhsSessionValidator);
    const success = await this.xhsService.deleteSession({
      userId: user.id,
      sessionId: payload.params.id,
    });
    if (!success) return ctx.error('无权访问该会话或会话不存在', 40300);
    return ctx.ok({ success: true });
  }

  async listMessages(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(listXhsMessagesValidator);
    const result = await this.xhsService.listMessages({
      userId: user.id,
      sessionId: payload.params.id,
      page: payload.page ?? 1,
      limit: payload.limit ?? 50,
      contentType: payload.contentType,
    });
    if (!result) return ctx.error('无权访问该会话或会话不存在', 40300);
    return ctx.ok({ list: result.list, pagination: result.pagination });
  }

  async chatCopy(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(chatCopyValidator);
    const result = await this.xhsService.generateCopy({
      userId: user.id,
      sessionId: payload.params.id,
      message: payload.message,
      model: payload.model,
      imageUrl: payload.imageUrl,
      abortSignal: withAbort(ctx.response),
    });
    if (!result) return ctx.error('无权访问该会话或会话不存在', 40300);
    return ctx.response.send(result);
  }

  async chatImage(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(chatImageValidator);
    const result = await this.xhsService.generateImage({
      userId: user.id,
      sessionId: payload.params.id,
      options: {
        prompt: payload.prompt,
        imageUrl: payload.imageUrl,
        model: payload.model,
        aspectRatio: payload.aspectRatio,
        hdPro: payload.hdPro,
      },
    });
    if (!result) return ctx.error('无权访问该会话或会话不存在', 40300);
    return ctx.ok(result);
  }
}
