import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import type { FetchClient } from '#providers/fetch-provider';
import { PARAFORMER_TASK_STATUS, ParaformerService } from '#services/paraformer-service';
import env from '#start/env';

type JsonRequest = {
  input: Parameters<FetchClient['json']>[0];
  init: Parameters<FetchClient['json']>[1];
};

class TestParaformerService extends ParaformerService {
  readonly requests: JsonRequest[] = [];

  constructor(private readonly responses: unknown[]) {
    super();
  }

  protected override async getFetchClient(): Promise<Pick<FetchClient, 'json'>> {
    return {
      json: async <T>(input: Parameters<FetchClient['json']>[0], init?: Parameters<FetchClient['json']>[1]) => {
        this.requests.push({ input, init });
        const response = this.responses.shift();
        if (response instanceof Error) throw response;
        return response as T;
      },
    };
  }
}

async function caught(promise: Promise<unknown>) {
  return promise.catch((error) => error);
}

test.group('Paraformer service', () => {
  test('submits the expected async Paraformer request', async ({ assert }) => {
    const service = new TestParaformerService([{ output: { task_id: 'task-1', task_status: 'PENDING' } }]);

    assert.deepEqual(await service.submit({ videoUrl: 'https://cdn.example.com/video.mp4' }), {
      taskId: 'task-1',
      status: PARAFORMER_TASK_STATUS.PENDING,
    });
    assert.lengthOf(service.requests, 1);
    assert.equal(String(service.requests[0].input), `${env.get('ALIYUN_BAILIAN_BASE_URL')}/api/v1/services/audio/asr/transcription`);
    assert.deepInclude(service.requests[0].init, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.get('ALIYUN_BAILIAN_KEY')}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
    });
    assert.deepEqual(JSON.parse(String(service.requests[0].init?.body)), {
      model: 'paraformer-v2',
      input: { file_urls: ['https://cdn.example.com/video.mp4'] },
      parameters: { language_hints: ['zh', 'en'] },
    });
  });

  for (const scenario of [
    { name: 'missing output', response: { message: 'missing output' }, message: '转写任务提交失败: missing output' },
    {
      name: 'logical task failure',
      response: { output: { task_id: 'task-1', task_status: 'FAILED', message: 'bad media' } },
      message: '转写任务提交失败: bad media',
    },
    {
      name: 'malformed output',
      response: { output: { task_status: 'PENDING' } },
      message: '转写任务提交失败: 服务响应格式无效',
    },
    {
      name: 'non-string task ID',
      response: { output: { task_id: 123, task_status: 'PENDING' } },
      message: '转写任务提交失败: 服务响应格式无效',
    },
  ]) {
    test(`rejects ${scenario.name}`, async ({ assert }) => {
      const error = await caught(new TestParaformerService([scenario.response]).submit({ videoUrl: 'https://cdn.example.com/video.mp4' }));

      assert.instanceOf(error, BusinessException);
      assert.equal((error as Error).message, scenario.message);
    });
  }

  test('maps an in-progress task without fetching the transcript', async ({ assert }) => {
    const service = new TestParaformerService([{ output: { task_id: 'task-1', task_status: 'RUNNING', message: 'processing' } }]);

    assert.deepEqual(await service.checkTask({ taskId: 'task-1' }), {
      status: PARAFORMER_TASK_STATUS.RUNNING,
      result: null,
      reason: 'processing',
    });
    assert.lengthOf(service.requests, 1);
  });

  test('maps a failed subtask without reading a transcript URL', async ({ assert }) => {
    const service = new TestParaformerService([
      {
        output: {
          task_status: 'SUCCEEDED',
          results: [{ subtask_status: 'FAILED', transcription_url: 'https://files.example.com/transcript.json', message: 'decode failed' }],
        },
      },
    ]);

    assert.deepEqual(await service.checkTask({ taskId: 'task-1' }), {
      status: PARAFORMER_TASK_STATUS.FAILED,
      result: null,
      reason: 'decode failed',
    });
    assert.lengthOf(service.requests, 1);
  });

  test('downloads a successful transcript without DashScope credentials', async ({ assert }) => {
    const service = new TestParaformerService([
      {
        output: {
          task_status: 'SUCCEEDED',
          results: [{ subtask_status: 'SUCCEEDED', transcription_url: 'https://files.example.com/transcript.json' }],
        },
      },
      { transcripts: [{ text: 'Transcript text' }] },
    ]);

    assert.deepEqual(await service.checkTask({ taskId: 'task/with spaces' }), {
      status: PARAFORMER_TASK_STATUS.SUCCEEDED,
      result: 'Transcript text',
      reason: null,
    });
    assert.equal(String(service.requests[0].input), `${env.get('ALIYUN_BAILIAN_BASE_URL')}/api/v1/tasks/task%2Fwith%20spaces`);
    assert.equal(String(service.requests[1].input), 'https://files.example.com/transcript.json');
    assert.isUndefined(service.requests[1].init);
  });

  for (const scenario of [
    {
      name: 'empty results',
      responses: [{ output: { task_status: 'SUCCEEDED', results: [] } }],
      message: '转写任务查询失败: 成功响应缺少结果',
    },
    {
      name: 'missing task status',
      responses: [{ output: { results: [] } }],
      message: '转写任务查询失败: 服务响应格式无效',
    },
    {
      name: 'malformed result item',
      responses: [{ output: { task_status: 'SUCCEEDED', results: [null] } }],
      message: '转写任务查询失败: 服务响应格式无效',
    },
    {
      name: 'empty transcription URL',
      responses: [{ output: { task_status: 'SUCCEEDED', results: [{ subtask_status: 'SUCCEEDED' }] } }],
      message: '转写任务查询失败: 转写文件地址为空',
    },
    {
      name: 'non-string transcription URL',
      responses: [{ output: { task_status: 'SUCCEEDED', results: [{ subtask_status: 'SUCCEEDED', transcription_url: { url: 'invalid' } }] } }],
      message: '转写任务查询失败: 转写文件地址为空',
    },
    {
      name: 'blank transcription URL',
      responses: [{ output: { task_status: 'SUCCEEDED', results: [{ subtask_status: 'SUCCEEDED', transcription_url: '   ' }] } }],
      message: '转写任务查询失败: 转写文件地址为空',
    },
    {
      name: 'empty transcript',
      responses: [{ output: { task_status: 'SUCCEEDED', results: [{ subtask_status: 'SUCCEEDED', transcription_url: 'https://files.example.com/t.json' }] } }, { transcripts: [] }],
      message: '转写任务查询失败: 转写文本为空',
    },
  ]) {
    test(`rejects a successful response with ${scenario.name}`, async ({ assert }) => {
      const error = await caught(new TestParaformerService(scenario.responses).checkTask({ taskId: 'task-1' }));

      assert.instanceOf(error, BusinessException);
      assert.equal((error as Error).message, scenario.message);
    });
  }
});
