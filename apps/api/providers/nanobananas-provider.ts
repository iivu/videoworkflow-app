import type { ApplicationService } from '@adonisjs/core/types';

import env from '#start/env';

// 支持的模型类型
export type NanoBananasModel = 'gemini-2.5-flash-image-preview' | 'gemini-3-pro-image-preview' | 'gemini-3-pro-image-preview-vip' | 'sora_image' | 'jimeng-4.5';

// 支持的宽高比
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9';

// 支持的图片尺寸（仅pro模型）
export type ImgSize = '1k' | '2k' | '4k';

// 生成模式
export type GenerationMode = 'photo_restoration' | 'figure' | 'meme' | string;

// 图片生成请求参数
export type ImageGenerationRequest = {
  prompt?: string;
  imageUrl?: string | string[];
  image?: Buffer | Buffer[];
  model?: NanoBananasModel;
  aspectRatio?: AspectRatio;
  mode?: GenerationMode;
  hdPro?: boolean;
  imgSize?: ImgSize;
};

// 图片详情
export type ImageDetail = {
  width: number;
  height: number;
  aspectRatio?: string;
};

// 积分信息
export type CreditsInfo = {
  used: number;
  remaining: number;
};

// 图片生成结果（同步）
export type ImageGenerationResult = {
  status: number;
  images: string[];
  imageDetails?: ImageDetail[];
  uuid: string;
  prompt: string;
  model: string;
  credits: CreditsInfo;
};

// 异步任务提交结果
export type AsyncTaskSubmitResult = {
  status: number;
  taskId: string;
  message: string;
  estimatedTime?: number;
};

// 异步任务状态
export type AsyncTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 异步任务查询结果
export type AsyncTaskResult = {
  taskId: string;
  status: AsyncTaskStatus;
  images?: string[];
  imageDetails?: ImageDetail;
  error?: string;
  credits?: CreditsInfo;
};

// API 错误响应
export type NanoBananasApiError = {
  status: number;
  error: string;
  message?: string;
};

export type NanoBananasClientConfig = {
  apiKey: string;
  baseURL: string;
  timeout: number;
  maxRetries: number;
};

export class NanoBananasClient {
  private baseURL: string;
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: NanoBananasClientConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL;
    this.timeout = config.timeout;
    this.maxRetries = config.maxRetries;

    if (!this.apiKey) {
      throw new Error('NANOBANANAS_API_KEY is required');
    }
  }

  /**
   * 同步生成图片
   * 注意：API 可能返回多张图片
   */
  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const url = `${this.baseURL}/images/generate`;
    const body = this.buildRequestBody(request);

    return this.requestWithRetry<ImageGenerationResult>(url, body);
  }

  /**
   * 提交异步任务
   */
  async submitAsyncTask(request: ImageGenerationRequest): Promise<AsyncTaskSubmitResult> {
    const url = `${this.baseURL}/images/async`;
    const body = this.buildRequestBody(request);

    return this.requestWithRetry<AsyncTaskSubmitResult>(url, body);
  }

  /**
   * 查询异步任务状态
   */
  async getTaskStatus(taskId: string): Promise<AsyncTaskResult> {
    const url = `${this.baseURL}/images/task-status?task_id=${encodeURIComponent(taskId)}`;

    return this.requestWithRetry<AsyncTaskResult>(url, undefined, 'GET');
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(request: ImageGenerationRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    if (request.prompt) {
      body.prompt = request.prompt;
    }

    if (request.imageUrl) {
      body.imageUrl = request.imageUrl;
    }

    if (request.image) {
      // 处理图片上传，这里只处理 URL 形式
      // 如果是 Buffer，需要转换为 FormData，暂时不支持
      throw new Error('Direct image buffer upload is not supported yet. Please use imageUrl.');
    }

    if (request.model) {
      body.model = request.model;
    }

    if (request.aspectRatio) {
      body.aspectRatio = request.aspectRatio;
    }

    if (request.mode) {
      body.mode = request.mode;
    }

    if (request.hdPro !== undefined) {
      body.hdPro = request.hdPro;
    }

    if (request.imgSize) {
      body.imgSize = request.imgSize;
    }

    return body;
  }

  /**
   * 带重试的请求
   */
  private async requestWithRetry<T>(url: string, body: Record<string, unknown> | undefined, method: 'GET' | 'POST' = 'POST', attempt: number = 1): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const options: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      };

      if (body && method === 'POST') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      if (!response.ok) {
        this.handleError(response.status, null);
      }
      const data = await response.json();

      return data as T;
    } catch (err) {
      if (attempt < this.maxRetries && this.shouldRetry(err)) {
        const delay = 2 ** attempt * 1000; // 指数退避
        await this.sleep(delay);
        return this.requestWithRetry<T>(url, body, method, attempt + 1);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: unknown): boolean {
    if (error instanceof Error) {
      // 网络错误、超时错误可以重试
      if (error.name === 'AbortError' || error.message.includes('fetch')) {
        return true;
      }
    }

    // 检查 API 错误码
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as { status: number }).status;
      // 429 速率限制、500 服务器错误可以重试
      return status === 429 || status >= 500;
    }

    return false;
  }

  /**
   * 处理 API 错误
   */
  private handleError(status: number, data: unknown): never {
    const error = data as NanoBananasApiError;

    switch (status) {
      case 400:
        throw new Error(`Bad Request: ${error?.message || 'Missing or invalid parameters'}`);
      case 401:
        throw new Error(`Unauthorized: ${error?.message || 'Invalid API Token'}`);
      case 403:
        throw new Error(`Forbidden: ${error?.message || 'Account disabled or quota exceeded'}`);
      case 413:
        throw new Error(`Payload Too Large: ${error?.message || 'File size exceeds 100MB limit'}`);
      case 429:
        throw new Error(`Rate Limited: ${error?.message || 'Too many requests'}`);
      case 405:
        throw new Error(`Insufficient Credits: ${error?.message || 'Not enough credits'}`);
      case 500:
        throw new Error(`Server Error: ${error?.message || 'Internal server error'}`);
      default:
        throw new Error(`API Error ${status}: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * 延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    nanobananas: NanoBananasClient;
  }
}

export default class NanobananasProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('nanobananas', async () => {
      return new NanoBananasClient({
        apiKey: env.get('NANOBANANAS_API_KEY'),
        baseURL: env.get('NANOBANANAS_BASE_URL'),
        timeout: Number(env.get('NANOBANANAS_REQUEST_TIMEOUT_MS', '60000')),
        maxRetries: Number(env.get('NANOBANANAS_MAX_RETRIES', '3')),
      });
    });
  }
}
