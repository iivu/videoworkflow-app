import { inject } from '@adonisjs/core';
import { createTextStreamResponse, toTextStream } from 'ai';

import XhsMessage from '#models/xhs-message';
import XhsSession from '#models/xhs-session';
import type { AspectRatio, NanoBananasModel } from '#providers/nanobananas-provider';
import type { AiService, Message } from '#services/ai-service';

export type PaginatedResult<T> = {
  list: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    lastPage: number;
  };
};

type ImageGenerationOptions = {
  prompt: string;
  imageUrl?: string;
  model?: NanoBananasModel;
  aspectRatio?: AspectRatio;
  hdPro?: boolean;
};

@inject()
export class XhsService {
  constructor(private readonly aiService: AiService) {}

  async createSession(params: { userId: string; title?: string }) {
    return await XhsSession.create({ userId: params.userId, title: params.title || '新会话' });
  }

  async listSessions(params: { userId: string; page: number; limit: number }): Promise<PaginatedResult<XhsSession>> {
    const sessions = await XhsSession.query().where('user_id', params.userId).orderBy('updated_at', 'desc').paginate(params.page, params.limit);
    return {
      list: sessions.all(),
      pagination: {
        page: sessions.currentPage,
        limit: sessions.perPage,
        total: sessions.total,
        lastPage: sessions.lastPage,
      },
    };
  }

  async getSession(params: { userId: string; sessionId: number }) {
    return await XhsSession.findBy({ id: params.sessionId, userId: params.userId });
  }

  async updateSession(params: { userId: string; sessionId: number; title: string }) {
    const session = await this.getSession(params);
    if (!session) return null;
    session.title = params.title;
    await session.save();
    return session;
  }

  async deleteSession(params: { userId: string; sessionId: number }) {
    const session = await this.getSession(params);
    if (!session) return false;
    await session.delete();
    return true;
  }

  async listMessages(params: { userId: string; sessionId: number; page: number; limit: number; contentType?: 'text' | 'image' }): Promise<PaginatedResult<XhsMessage> | null> {
    const session = await this.getSession(params);
    if (!session) return null;
    const query = XhsMessage.query().where('session_id', session.id);
    if (params.contentType) query.where('content_type', params.contentType);
    const messages = await query.orderBy('created_at', 'asc').paginate(params.page, params.limit);
    return {
      list: messages.all(),
      pagination: {
        page: messages.currentPage,
        limit: messages.perPage,
        total: messages.total,
        lastPage: messages.lastPage,
      },
    };
  }

  async generateCopy(params: { userId: string; sessionId: number; message: string; model?: string; imageUrl?: string; abortSignal?: AbortSignal }) {
    const session = await this.getSession(params);
    if (!session) return null;
    await XhsMessage.create({
      sessionId: session.id,
      role: 'user',
      contentType: 'text',
      content: params.message,
      metadata: { image_url: params.imageUrl || null },
    });
    const messages: Message[] = [
      params.imageUrl
        ? {
            role: 'user',
            content: [
              { type: 'image', image: new URL(params.imageUrl) },
              { type: 'text', text: params.message },
            ],
          }
        : { role: 'user', content: params.message },
    ];
    const selectedModel = params.model || 'qwen3.7-max';
    const actualModel = params.imageUrl ? 'qwen3.7-plus' : selectedModel;
    const result = this.aiService.streamChat(messages, {
      model: actualModel,
      abortSignal: params.abortSignal,
      onEnd: async ({ text }) => {
        await XhsMessage.create({
          sessionId: session.id,
          role: 'assistant',
          contentType: 'text',
          content: text,
          metadata: { model: actualModel },
        });
      },
    });
    return createTextStreamResponse({
      stream: toTextStream({ stream: result.stream }),
      headers: {
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  async generateImage(params: { userId: string; sessionId: number; options: ImageGenerationOptions }) {
    const session = await this.getSession(params);
    if (!session) return null;
    const { prompt, imageUrl, model, aspectRatio, hdPro } = params.options;
    await XhsMessage.create({
      sessionId: session.id,
      role: 'user',
      contentType: 'image',
      content: prompt,
      metadata: { image_url: imageUrl || null },
    });
    const metadata = {
      aspectRatio: aspectRatio ?? '1:1',
      model: model ?? 'gemini-2.5-flash-image-preview',
      hdPro: hdPro ?? false,
    };
    try {
      const result = await this.aiService.generateImage({ prompt, imageUrl, ...metadata });
      return await XhsMessage.create({
        sessionId: session.id,
        role: 'assistant',
        contentType: 'image',
        content: result.images[0] || '',
        metadata,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      return await XhsMessage.create({
        sessionId: session.id,
        role: 'assistant',
        contentType: 'image',
        content: `图片生成失败: ${message}`,
        metadata,
      });
    }
  }
}
