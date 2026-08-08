import app from '@adonisjs/core/services/app';
import logger from '@adonisjs/core/services/logger';

import BusinessException from '#exceptions/business-exception';
import ParaformerTask from '#models/paraformer-task';
import type { FetchClient } from '#providers/fetch-provider';
import env from '#start/env';
import { asRecord, optionalString } from '#utils/type-guards';

export const PARAFORMER_TASK_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ParaformerTaskStatus = (typeof PARAFORMER_TASK_STATUS)[keyof typeof PARAFORMER_TASK_STATUS];

export type ParaformerTaskUpdate = {
  status: ParaformerTaskStatus;
  result: string | null;
  reason: string | null;
};

const API_BASE_URL = `${env.get('ALIYUN_BAILIAN_BASE_URL')}/api/v1`;

function diagnosticMessage(prefix: string, detail?: string) {
  return detail ? `${prefix}: ${detail}` : prefix;
}

function parseStatus(status: string): ParaformerTaskStatus {
  return Object.values(PARAFORMER_TASK_STATUS).includes(status as ParaformerTaskStatus) ? (status as ParaformerTaskStatus) : PARAFORMER_TASK_STATUS.UNKNOWN;
}

export class ParaformerService {
  protected async getFetchClient(): Promise<Pick<FetchClient, 'json'>> {
    return app.container.make('fetch');
  }

  async submit(params: { videoUrl: string }) {
    const fetchClient = await this.getFetchClient();
    const response = await fetchClient.json<unknown>(`${API_BASE_URL}/services/audio/asr/transcription`, {
      method: 'POST',
      headers: this.buildApiHeaders(),
      body: JSON.stringify({
        model: 'paraformer-v2',
        input: { file_urls: [params.videoUrl] },
        parameters: { language_hints: ['zh', 'en'] },
      }),
    });
    const responseRecord = asRecord(response);
    const output = asRecord(responseRecord?.output);
    if (!output) throw new BusinessException(diagnosticMessage('转写任务提交失败', optionalString(responseRecord, 'message')));

    const rawStatus = optionalString(output, 'task_status');
    const taskId = optionalString(output, 'task_id');
    if (!rawStatus || !taskId) throw new BusinessException('转写任务提交失败: 服务响应格式无效');

    const status = parseStatus(rawStatus);
    if (status === PARAFORMER_TASK_STATUS.FAILED) {
      throw new BusinessException(diagnosticMessage('转写任务提交失败', optionalString(output, 'message') || optionalString(responseRecord, 'message')));
    }
    if (status === PARAFORMER_TASK_STATUS.UNKNOWN) {
      throw new BusinessException('转写任务提交失败: 服务响应格式无效');
    }
    return { taskId, status };
  }

  async create(params: { videoUrl: string; videoId: number; userId: string }) {
    const submission = await this.submit({ videoUrl: params.videoUrl });
    const createPayload = { ...submission, videoId: params.videoId, userId: params.userId };
    try {
      return await ParaformerTask.create(createPayload);
    } catch (error) {
      logger.error(
        {
          taskId: submission.taskId,
          userId: params.userId,
          videoId: params.videoId,
          err: error instanceof Error ? error.message : String(error),
        },
        'create paraformer transcription failed',
      );
      throw new BusinessException('转写任务保存失败');
    }
  }

  async checkTask(params: { taskId: string }): Promise<ParaformerTaskUpdate> {
    const fetchClient = await this.getFetchClient();
    console.log(`${API_BASE_URL}/tasks/${encodeURIComponent(params.taskId)}`)
    console.log('Checking task with ID:', params.taskId); // Debugging log
    const response = await fetchClient.json<unknown>(`${API_BASE_URL}/tasks/${encodeURIComponent(params.taskId)}`, {
      headers: this.buildApiHeaders(false),
    });
    const responseRecord = asRecord(response);
    const output = asRecord(responseRecord?.output);
    if (!output) throw new BusinessException(diagnosticMessage('转写任务查询失败', optionalString(responseRecord, 'message')));

    const rawStatus = optionalString(output, 'task_status');
    if (!rawStatus) throw new BusinessException('转写任务查询失败: 服务响应格式无效');

    const status = parseStatus(rawStatus);
    if (status !== PARAFORMER_TASK_STATUS.SUCCEEDED) {
      return { status, result: null, reason: optionalString(output, 'message') || null };
    }

    const results = output.results;
    if (!Array.isArray(results) || results.length === 0) {
      throw new BusinessException('转写任务查询失败: 成功响应缺少结果');
    }
    const parsedResults = results.map((result) => {
      const record = asRecord(result);
      const rawSubtaskStatus = optionalString(record, 'subtask_status');
      if (!record || !rawSubtaskStatus) throw new BusinessException('转写任务查询失败: 服务响应格式无效');
      return { record, status: parseStatus(rawSubtaskStatus) };
    });
    const failedSubtask = parsedResults.find((result) => result.status !== PARAFORMER_TASK_STATUS.SUCCEEDED);
    if (failedSubtask) {
      return {
        status: failedSubtask.status,
        result: null,
        reason: optionalString(failedSubtask.record, 'message') || null,
      };
    }

    const transcriptionUrl = optionalString(parsedResults[0].record, 'transcription_url');
    if (!transcriptionUrl) throw new BusinessException('转写任务查询失败: 转写文件地址为空');

    const transcription = asRecord(await fetchClient.json<unknown>(transcriptionUrl));
    const transcripts = transcription?.transcripts;
    const transcript = Array.isArray(transcripts) ? optionalString(asRecord(transcripts[0]), 'text') : undefined;
    if (typeof transcript !== 'string' || transcript.trim().length === 0) {
      throw new BusinessException('转写任务查询失败: 转写文本为空');
    }
    return { status: PARAFORMER_TASK_STATUS.SUCCEEDED, result: transcript, reason: null };
  }

  async getTaskById(params: { taskId: string; userId: string }) {
    return ParaformerTask.query().where('userId', params.userId).where('taskId', params.taskId).first();
  }

  async getTaskByVideoId(params: { videoId: number; userId: string }) {
    return ParaformerTask.query().where('userId', params.userId).where('videoId', params.videoId).first();
  }

  private buildApiHeaders(withAsync = true) {
    return {
      Authorization: `Bearer ${env.get('ALIYUN_BAILIAN_KEY')}`,
      'Content-Type': 'application/json',
      ...(withAsync ? { 'X-DashScope-Async': 'enable' } : {}),
    };
  }
}
