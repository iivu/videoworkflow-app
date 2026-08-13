import { inject } from '@adonisjs/core';
import app from '@adonisjs/core/services/app';
import { createAlibaba } from '@ai-sdk/alibaba';
import { type GenerateTextOnEndCallback, generateText, type ModelMessage, streamText } from 'ai';

import BusinessException from '#exceptions/business-exception';
import type { ImageGenerationRequest, ImageGenerationResult } from '#providers/nanobananas-provider';
import { ParaformerService } from '#services/paraformer-service';
import { PromptService } from '#services/prompt-service';
import env from '#start/env';

type ChatOptions = {
  model?: string;
  temperature?: number;
};

type StreamChatOptions = ChatOptions & {
  abortSignal?: AbortSignal;
  onEnd?: GenerateTextOnEndCallback;
};

export type Message = ModelMessage;

@inject()
export class AiService {
  constructor(
    private readonly paraformerService: ParaformerService,
    private readonly promptService: PromptService,
  ) {}

  async chat(messages: Message[], { model = 'qwen3.7-max', temperature }: ChatOptions = {}) {
    const result = await generateText({
      model: this.getTextModel(model),
      messages,
      temperature,
    });
    return result.text;
  }

  streamChat(messages: Message[], { model = 'qwen3.7-max', temperature, abortSignal, onEnd }: StreamChatOptions = {}) {
    return streamText({
      model: this.getTextModel(model),
      messages,
      temperature,
      abortSignal,
      onEnd,
    });
  }

  async polishArticle(params: { videoId: number; userId: string }) {
    const task = await this.paraformerService.getTaskByVideoId({ videoId: params.videoId, userId: params.userId });
    if (!task) throw new BusinessException('请先提交转写任务');
    if (!task.result) throw new BusinessException('转写任务未完成或已失败，请稍后再试');
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const client = await app.container.make('nanobananas');
    return client.generate(request);
  }

  private getTextModel(model: string) {
    return createAlibaba({
      apiKey: env.get('ALIYUN_BAILIAN_KEY'),
      baseURL: `${env.get('ALIYUN_BAILIAN_BASE_URL')}/compatible-mode/v1`,
    })(model);
  }
}
