import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';

import { AiService } from '#services/ai-service';
import UserPolishArticleMessageTransformer from '#transformers/user-polish-article-message-transformer';
import { withAbort } from '#utils/with-abort';
import { listPolishArticleMessagesValidator, polishArticleValidator } from '#validators/ai';

@inject()
export default class AiController {
  constructor(private readonly ai: AiService) {}

  async polishArticle(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(polishArticleValidator);
    const response = await this.ai.polishArticle({
      videoId: payload.params.videoId,
      userId: user.id,
      message: payload.message,
      model: payload.model,
      abortSignal: withAbort(ctx.response),
    });
    return ctx.response.send(response);
  }

  async listMessages(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(listPolishArticleMessagesValidator);
    const result = await this.ai.listMessages({
      videoId: payload.params.videoId,
      userId: user.id,
      page: payload.page ?? 1,
      size: payload.size ?? 20,
    });
    const list = await ctx.serialize.withoutWrapping(UserPolishArticleMessageTransformer.transform(result.list));
    return ctx.ok({ meta: result.meta, list });
  }
}
