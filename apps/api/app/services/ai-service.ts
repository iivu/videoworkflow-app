import app from '@adonisjs/core/services/app';
import { createAlibaba } from '@ai-sdk/alibaba';
import { createMoonshotAI } from '@ai-sdk/moonshotai';
import { type GenerateTextOnEndCallback, generateText, type ModelMessage, streamText } from 'ai';
import { createZhipu } from 'zhipu-ai-provider';

import type { ImageGenerationRequest, ImageGenerationResult } from '#providers/nanobananas-provider';
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

export class AiService {
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

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const client = await app.container.make('nanobananas');
    return client.generate(request);
  }

  private getTextModel(model: string) {
    if (model.includes('glm')) {
      return createZhipu({
        apiKey: env.get('ZHIPU_API_KEY'),
        baseURL: env.get('ZHIPU_BASE_URL'),
      })(model);
    }
    if (model.includes('kimi') || model.includes('moonshot')) {
      return createMoonshotAI({
        apiKey: env.get('KIMI_API_KEY'),
        baseURL: env.get('KIMI_BASE_URL'),
      })(model);
    }
    return createAlibaba({
      apiKey: env.get('ALIYUN_BAILIAN_KEY'),
      baseURL: `${env.get('ALIYUN_BAILIAN_BASE_URL')}/compatible-mode/v1`,
    })(model);
  }
}
