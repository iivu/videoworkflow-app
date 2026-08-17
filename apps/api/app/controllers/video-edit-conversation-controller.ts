import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';

import { VideoEditConversationService } from '#services/video-edit-conversation-service';
import { WanxiangVideoEditService } from '#services/wanxiang-video-edit-service';
import VideoEditMessageTransformer from '#transformers/video-edit-message-transformer';
import WanxiangVideoEditTaskTransformer from '#transformers/wanxiang-video-edit-task-transformer';
import { conversationTaskActionValidator, listVideoEditMessagesValidator, sendVideoEditMessageValidator } from '#validators/video-edit-message';

@inject()
export default class VideoEditConversationController {
  constructor(private readonly wanxiangVideoEditService: WanxiangVideoEditService) {}

  private get conversationService() {
    return new VideoEditConversationService(this.wanxiangVideoEditService);
  }

  /** 发送编辑指令并落库 user/assistant 消息，返回持久化后的万相任务 */
  async send(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(sendVideoEditMessageValidator);
    const task = await this.conversationService.send({
      userId: user.id,
      breakdownTaskId: payload.params.taskId,
      prompt: payload.prompt,
      media: payload.media,
      parameters: payload.parameters,
    });
    return ctx.ok(await ctx.serialize.withoutWrapping(WanxiangVideoEditTaskTransformer.transform(task)));
  }

  /** 分页查询对话消息（纯消息列表，不查询任务） */
  async listMessages(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(listVideoEditMessagesValidator);
    const result = await this.conversationService.listMessages({
      userId: user.id,
      entityId: payload.params.taskId,
      page: payload.page ?? 1,
      size: payload.size ?? 20,
    });
    const list = await ctx.serialize.withoutWrapping(VideoEditMessageTransformer.transform(result.list));
    return ctx.ok({ meta: result.meta, list });
  }

  /** 同步任务状态，终态时回写 assistant 消息 */
  async check(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(conversationTaskActionValidator);
    const task = await this.conversationService.check({
      userId: user.id,
      breakdownTaskId: payload.params.taskId,
      editTaskId: payload.taskId,
    });
    return ctx.ok(await ctx.serialize.withoutWrapping(WanxiangVideoEditTaskTransformer.transform(task)));
  }

  /** 放弃任务并回写 assistant 消息 */
  async abandon(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(conversationTaskActionValidator);
    const task = await this.conversationService.abandon({
      userId: user.id,
      breakdownTaskId: payload.params.taskId,
      editTaskId: payload.taskId,
    });
    return ctx.ok(await ctx.serialize.withoutWrapping(WanxiangVideoEditTaskTransformer.transform(task)));
  }
}
