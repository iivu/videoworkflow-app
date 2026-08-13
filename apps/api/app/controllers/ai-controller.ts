import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { createAlibaba } from '@ai-sdk/alibaba';
import { convertToModelMessages, createUIMessageStreamResponse, safeValidateUIMessages, streamText, toUIMessageStream } from 'ai';

import { AiService } from '#services/ai-service';
import env from '#start/env';
import { withAbort } from '#utils/with-abort';

@inject()
export default class AiController {
  constructor(private readonly ai: AiService) {}

  async polishArticle(ctx: HttpContext) {
    const validation = await safeValidateUIMessages({
      messages: ctx.request.input('messages'),
    });
    const model = ctx.request.input('model');
    if (!validation.success) return ctx.response.badRequest({ message: validation.error });

    const messages = await convertToModelMessages(validation.data);
    const abortSignal = withAbort(ctx.response);
    const resp = streamText({
      model: createAlibaba({
        apiKey: env.get('ALIYUN_BAILIAN_KEY'),
        baseURL: `${env.get('ALIYUN_BAILIAN_BASE_URL')}/compatible-mode/v1`,
      })(model),
      messages,
      abortSignal,
      system: '你是一名简洁、友善且可靠的 AI 助手。',
    });
    ctx.response.send(
      createUIMessageStreamResponse({
        stream: toUIMessageStream(resp),
        headers: { 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' },
      }),
    );
  }
}
