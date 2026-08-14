import { join, relative } from 'node:path';
import { inject } from '@adonisjs/core';
import app from '@adonisjs/core/services/app';
import type { Infer } from '@vinejs/vine/types';
import { v4 as uuidv4 } from 'uuid';

import BusinessException from '#exceptions/business-exception';
import VideoBreakdownJob, { QUEUE_NAME } from '#jobs/video-breakdown-job';
import VideoBreakdownTask, { VIDEO_BREAKDOWN_TASK_STATUS } from '#models/video-breakdown-task';
import type { FetchClient } from '#providers/fetch-provider';
import { PromptService } from '#services/prompt-service';
import env from '#start/env';
import { asRecord } from '#utils/type-guards';
import type { createVideoBreakdownTaskValidator, listVideoBreakdownTasksValidator } from '#validators/video-breakdown';

export const VIDEO_BREAKDOWN_DEFAULT_MODEL = 'qwen3.5-omni-plus';

export type VideoBreakdownSegmentDraft = {
  start: string;
  end: string;
  summary: string;
};

export type VideoBreakdownSegment = VideoBreakdownSegmentDraft & {
  file: string;
};

export type VideoBreakdownResult = VideoBreakdownSegment[];

export type VideoBreakdownJobPayload = {
  taskId: string;
  videoUrl: string;
  userId: string;
  model: string;
};

const API_BASE_URL = `${env.get('ALIYUN_BAILIAN_BASE_URL')}/compatible-mode/v1`;

export function parseTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^(\d{2}):([0-5]\d):([0-5]\d)\.(\d{3})$/.test(value) ? value : null;
}

export function parseSegmentsFromText(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : trimmed).trim();
  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new BusinessException('视频拆解失败: 模型未返回有效的 JSON 数组');
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new BusinessException('视频拆解失败: 模型未返回有效的 JSON 数组');
  }
}

export function validateSegments(input: unknown): VideoBreakdownSegmentDraft[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new BusinessException('视频拆解失败: 拆解结果为空');
  }

  const segments = input.map((item, index) => {
    const record = asRecord(item);
    if (!record) throw new BusinessException(`视频拆解失败: 第 ${index + 1} 个片段格式无效`);
    const start = parseTimestamp(record.start);
    const end = parseTimestamp(record.end);
    if (start === null) throw new BusinessException(`视频拆解失败: 第 ${index + 1} 个片段开始时间无效`);
    if (end === null) throw new BusinessException(`视频拆解失败: 第 ${index + 1} 个片段结束时间无效`);
    if (end <= start) throw new BusinessException(`视频拆解失败: 第 ${index + 1} 个片段结束时间必须大于开始时间`);
    if (typeof record.summary !== 'string' || record.summary.trim().length === 0) {
      throw new BusinessException(`视频拆解失败: 第 ${index + 1} 个片段梗概无效`);
    }
    return { start, end, summary: record.summary.trim() };
  });

  for (let index = 1; index < segments.length; index++) {
    if (segments[index].start < segments[index - 1].start) {
      throw new BusinessException('视频拆解失败: 片段必须按开始时间升序排列');
    }
    if (segments[index].start < segments[index - 1].end) {
      throw new BusinessException('视频拆解失败: 片段不可重叠');
    }
  }

  return segments;
}

export function buildBreakdownRequestBody(videoUrl: string, model: string, prompt: string, stream?: boolean) {
  return {
    model,
    ...(stream === undefined ? {} : { stream }),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'video_url', video_url: { url: videoUrl } },
          { type: 'text', text: prompt },
        ],
      },
    ],
  };
}

export function buildApiHeaders() {
  return {
    Authorization: `Bearer ${env.get('ALIYUN_BAILIAN_KEY')}`,
    'Content-Type': 'application/json',
  };
}

export function extractBreakdownContent(response: unknown): string {
  const record = asRecord(response);
  const choices = record?.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new BusinessException('视频拆解失败: 服务响应格式无效');
  }
  const message = asRecord(asRecord(choices[0])?.message);
  const content = message?.content;
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new BusinessException('视频拆解失败: 服务响应内容为空');
  }
  return content;
}

function extractBreakdownDeltaContent(response: unknown): string {
  const record = asRecord(response);
  const choices = record?.choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';

  const delta = asRecord(asRecord(choices[0])?.delta);
  return typeof delta?.content === 'string' ? delta.content : '';
}

export async function extractStreamBreakdownContent(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';

  const consumeLine = (line: string) => {
    const normalized = line.endsWith('\r') ? line.slice(0, -1) : line;
    if (!normalized.startsWith('data:')) return;

    const data = normalized.slice(5).trim();
    if (!data || data === '[DONE]') return;

    try {
      content += extractBreakdownDeltaContent(JSON.parse(data));
    } catch {
      throw new BusinessException('视频拆解失败: 服务流式响应格式无效');
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) consumeLine(line);

    if (done) break;
  }
  if (buffer) consumeLine(buffer);

  if (content.trim().length === 0) {
    throw new BusinessException('视频拆解失败: 服务响应内容为空');
  }
  return content;
}

export async function requestVideoBreakdown(
  fetchClient: Pick<FetchClient, 'json' | 'stream'>,
  params: { videoUrl: string; model: string; prompt: string; stream?: boolean },
): Promise<VideoBreakdownSegmentDraft[]> {
  const request = {
    method: 'POST',
    headers: buildApiHeaders(),
    body: JSON.stringify(buildBreakdownRequestBody(params.videoUrl, params.model, params.prompt, params.stream)),
  } satisfies RequestInit;

  const endpoint = `${API_BASE_URL}/chat/completions`;
  let content: string;
  if (params.stream) {
    if (!fetchClient.stream) throw new BusinessException('视频拆解失败: 请求客户端不支持流式响应');
    content = await extractStreamBreakdownContent(await fetchClient.stream(endpoint, request));
  } else {
    content = extractBreakdownContent(await fetchClient.json<unknown>(endpoint, request));
  }
  return validateSegments(parseSegmentsFromText(content));
}

export function buildSegmentCommand(params: { videoPath: string; start: string; end: string; outputPath: string }): string[] {
  const { videoPath, start, end, outputPath } = params;
  // return ['-y', '-ss', String(start), '-to', String(end), '-i', videoPath, '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', outputPath];
  return [
    '-y', '-i', videoPath, '-ss', String(start), '-to', String(end), '-map', '0:v:0', '-map', '0:a:0?', '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-c:a', 'aac', '-b:a', '128k', outputPath
  ]
}

export function segmentOutputPath(segmentsDir: string, index: number): string {
  return join(segmentsDir, `segment-${String(index + 1).padStart(3, '0')}.mp4`);
}

export function segmentFileRelativePath(outputPath: string): string {
  return relative(app.publicPath(), outputPath);
}

@inject()
export class VideoBreakdownService {
  constructor(private readonly promptService: PromptService) {}

  async create(params: { payload: Infer<typeof createVideoBreakdownTaskValidator>; userId: string }) {
    const { payload, userId } = params;
    const taskId = uuidv4();
    const task = await VideoBreakdownTask.create({
      taskId,
      userId,
      videoUrl: payload.videoUrl,
      status: VIDEO_BREAKDOWN_TASK_STATUS.PENDING,
      result: null,
      reason: null,
    });

    const jobPayload: VideoBreakdownJobPayload = {
      taskId,
      videoUrl: payload.videoUrl,
      userId,
      model: payload.model ?? VIDEO_BREAKDOWN_DEFAULT_MODEL,
    };

    try {
      await this.dispatchJob(jobPayload);
    } catch (error) {
      await task
        .merge({
          status: VIDEO_BREAKDOWN_TASK_STATUS.FAILED,
          reason: error instanceof Error ? error.message.slice(0, 512) : '任务入队失败',
        })
        .save();
      throw new BusinessException('视频拆解任务入队失败');
    }

    return task;
  }

  async list(params: { payload: Infer<typeof listVideoBreakdownTasksValidator>; userId: string }) {
    const { payload, userId } = params;
    const query = VideoBreakdownTask.query().where('userId', userId);
    if (payload.status) query.where('status', payload.status);
    query.orderBy('id', 'desc');
    return query.paginate(payload.page ?? 1, payload.size ?? 10);
  }

  async get(params: { taskId: string; userId: string }) {
    return VideoBreakdownTask.query().where('taskId', params.taskId).where('userId', params.userId).first();
  }

  async breakdown(params: { videoUrl: string; model: string; stream?: boolean }): Promise<VideoBreakdownSegmentDraft[]> {
    const fetchClient = await this.getFetchClient();
    return requestVideoBreakdown(fetchClient, { ...params, prompt: this.promptService.videoBreakdownSystemPrompt() });
  }

  protected async getFetchClient() {
    return app.container.make('fetch');
  }

  protected async dispatchJob(payload: VideoBreakdownJobPayload) {
    await VideoBreakdownJob.dispatch(payload).toQueue(QUEUE_NAME);
  }
}
