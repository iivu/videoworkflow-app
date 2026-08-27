import testUtils from '@adonisjs/core/services/test_utils';
import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import WanxiangVideoEditTask from '#models/wanxiang-video-edit-task';
import type { FetchClient } from '#providers/fetch-provider';
import { buildWanxiangTaskConfig, isValidWanxiangEntityId, WANXIANG_VIDEO_EDIT_TASK_STATUS, WanxiangVideoEditService } from '#services/wanxiang-video-edit-service';
import env from '#start/env';

type JsonRequest = {
  input: Parameters<FetchClient['json']>[0];
  init: Parameters<FetchClient['json']>[1];
};

class TestWanxiangVideoEditService extends WanxiangVideoEditService {
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

const defaultParams = {
  input: {
    prompt: '将整个画面转换为黏土风格',
    media: [{ type: 'video' as const, url: 'https://cdn.example.com/video.mp4' }],
  },
};

const createEndpoint = `https://${env.get('ALIYUN_BAILIAN_WORKSPACE_ID')}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`;

async function caught(promise: Promise<unknown>) {
  return promise.catch((error) => error);
}

test.group('Wanxiang video edit service', () => {
  test('creates a task with the expected async HTTP request', async ({ assert }) => {
    const service = new TestWanxiangVideoEditService([{ output: { task_id: 'task-1', task_status: 'PENDING' }, request_id: 'req-1' }]);

    assert.deepEqual(await service.submit(defaultParams), {
      taskId: 'task-1',
      taskStatus: WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING,
      requestId: 'req-1',
    });
    assert.lengthOf(service.requests, 1);
    assert.equal(String(service.requests[0].input), createEndpoint);
    assert.deepInclude(service.requests[0].init, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.get('ALIYUN_BAILIAN_KEY')}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
    });
    assert.deepEqual(JSON.parse(String(service.requests[0].init?.body)), {
      model: 'wan2.7-videoedit',
      input: {
        prompt: '将整个画面转换为黏土风格',
        media: [{ type: 'video', url: 'https://cdn.example.com/video.mp4' }],
      },
      parameters: {
        resolution: '1080P',
        prompt_extend: true,
        watermark: false,
      },
    });
  });

  test('sends all optional input and parameters', async ({ assert }) => {
    const service = new TestWanxiangVideoEditService([{ output: { task_id: 'task-1', task_status: 'PENDING' } }]);

    await service.submit({
      input: {
        prompt: '将视频中女孩的衣服替换为图片中的衣服',
        negativePrompt: '低分辨率、错误、最差质量',
        media: [
          { type: 'video', url: 'https://cdn.example.com/video.mp4' },
          { type: 'reference_image', url: 'https://cdn.example.com/clothes.png' },
        ],
      },
      parameters: {
        resolution: '720P',
        ratio: '16:9',
        duration: 5,
        audioSetting: 'origin',
        promptExtend: false,
        watermark: true,
        seed: 42,
      },
    });

    assert.deepEqual(JSON.parse(String(service.requests[0].init?.body)), {
      model: 'wan2.7-videoedit',
      input: {
        prompt: '将视频中女孩的衣服替换为图片中的衣服',
        negative_prompt: '低分辨率、错误、最差质量',
        media: [
          { type: 'video', url: 'https://cdn.example.com/video.mp4' },
          { type: 'reference_image', url: 'https://cdn.example.com/clothes.png' },
        ],
      },
      parameters: {
        resolution: '720P',
        ratio: '16:9',
        duration: 5,
        audio_setting: 'origin',
        prompt_extend: false,
        watermark: true,
        seed: 42,
      },
    });
  });

  for (const scenario of [
    { name: 'empty media', params: { input: { media: [] } }, message: '万相视频编辑失败: 媒体素材不能为空' },
    {
      name: 'missing video',
      params: { input: { media: [{ type: 'reference_image', url: 'https://cdn.example.com/a.png' }] } },
      message: '万相视频编辑失败: 待编辑视频有且仅有 1 个',
    },
    {
      name: 'multiple videos',
      params: {
        input: {
          media: [
            { type: 'video', url: 'https://cdn.example.com/a.mp4' },
            { type: 'video', url: 'https://cdn.example.com/b.mp4' },
          ],
        },
      },
      message: '万相视频编辑失败: 待编辑视频有且仅有 1 个',
    },
    {
      name: 'too many reference images',
      params: {
        input: {
          media: [
            { type: 'video', url: 'https://cdn.example.com/a.mp4' },
            { type: 'reference_image', url: 'https://cdn.example.com/1.png' },
            { type: 'reference_image', url: 'https://cdn.example.com/2.png' },
            { type: 'reference_image', url: 'https://cdn.example.com/3.png' },
            { type: 'reference_image', url: 'https://cdn.example.com/4.png' },
            { type: 'reference_image', url: 'https://cdn.example.com/5.png' },
          ],
        },
      },
      message: '万相视频编辑失败: 参考图像最多传入 4 张',
    },
    {
      name: 'blank media URL',
      params: { input: { media: [{ type: 'video', url: '   ' }] } },
      message: '万相视频编辑失败: 媒体素材 URL 无效',
    },
    {
      name: 'overlong prompt',
      params: { input: { prompt: 'a'.repeat(5001), media: [{ type: 'video', url: 'https://cdn.example.com/a.mp4' }] } },
      message: '万相视频编辑失败: 提示词长度不能超过 5000 个字符',
    },
    {
      name: 'overlong negative prompt',
      params: { input: { prompt: 'ok', negativePrompt: 'b'.repeat(501), media: [{ type: 'video', url: 'https://cdn.example.com/a.mp4' }] } },
      message: '万相视频编辑失败: 反向提示词长度不能超过 500 个字符',
    },
    {
      name: 'out of range duration',
      params: {
        input: { media: [{ type: 'video', url: 'https://cdn.example.com/a.mp4' }] },
        parameters: { duration: 11 },
      },
      message: '万相视频编辑失败: 视频时长需为 2～10 之间的整数',
    },
    {
      name: 'out of range seed',
      params: {
        input: { media: [{ type: 'video', url: 'https://cdn.example.com/a.mp4' }] },
        parameters: { seed: 2147483648 },
      },
      message: '万相视频编辑失败: 随机数种子取值范围为 [0, 2147483647]',
    },
  ]) {
    test(`rejects ${scenario.name} before calling the API`, async ({ assert }) => {
      const service = new TestWanxiangVideoEditService([]);
      const error = await caught(service.submit(scenario.params as Parameters<WanxiangVideoEditService['submit']>[0]));

      assert.instanceOf(error, BusinessException);
      assert.equal((error as Error).message, scenario.message);
      assert.lengthOf(service.requests, 0);
    });
  }

  for (const scenario of [
    { name: 'missing output', response: { message: 'InvalidApiKey' }, message: '万相视频编辑失败: 创建任务失败: InvalidApiKey' },
    { name: 'missing task ID', response: { output: { task_status: 'PENDING' } }, message: '万相视频编辑失败: 创建任务失败: 服务响应格式无效' },
    { name: 'missing task status', response: { output: { task_id: 'task-1' } }, message: '万相视频编辑失败: 创建任务失败: 服务响应格式无效' },
  ]) {
    test(`rejects ${scenario.name}`, async ({ assert }) => {
      const error = await caught(new TestWanxiangVideoEditService([scenario.response]).submit(defaultParams));

      assert.instanceOf(error, BusinessException);
      assert.equal((error as Error).message, scenario.message);
    });
  }

  test('maps a succeeded task with video URL and usage', async ({ assert }) => {
    const service = new TestWanxiangVideoEditService([
      {
        request_id: 'req-1',
        output: {
          task_id: 'task-1',
          task_status: 'SUCCEEDED',
          submit_time: '2026-04-03 00:08:03.576',
          scheduled_time: '2026-04-03 00:08:13.408',
          end_time: '2026-04-03 00:11:57.286',
          orig_prompt: '将视频中女孩的衣服替换为图片中的衣服',
          video_url: 'https://dashscope.oss-accelerate.aliyuncs.com/out.mp4?Expires=123',
        },
        usage: {
          duration: 10.04,
          input_video_duration: 5.02,
          output_video_duration: 5.02,
          video_count: 1,
          SR: 720,
        },
      },
    ]);

    assert.deepEqual(await service.getTask({ taskId: 'task-1' }), {
      taskId: 'task-1',
      taskStatus: WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED,
      videoUrl: 'https://dashscope.oss-accelerate.aliyuncs.com/out.mp4?Expires=123',
      origPrompt: '将视频中女孩的衣服替换为图片中的衣服',
      submitTime: '2026-04-03 00:08:03.576',
      scheduledTime: '2026-04-03 00:08:13.408',
      endTime: '2026-04-03 00:11:57.286',
      usage: {
        duration: 10.04,
        inputVideoDuration: 5.02,
        outputVideoDuration: 5.02,
        videoCount: 1,
        sr: 720,
      },
      code: null,
      message: null,
      requestId: 'req-1',
    });
    assert.lengthOf(service.requests, 1);
    assert.equal(String(service.requests[0].input), `https://${env.get('ALIYUN_BAILIAN_WORKSPACE_ID')}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/task-1`);
    assert.deepInclude(service.requests[0].init, {
      headers: {
        Authorization: `Bearer ${env.get('ALIYUN_BAILIAN_KEY')}`,
        'Content-Type': 'application/json',
      },
    });
  });

  test('maps a failed task with code and message', async ({ assert }) => {
    const service = new TestWanxiangVideoEditService([{ output: { task_id: 'task-1', task_status: 'FAILED', code: 'InvalidParameter', message: 'The size is not match' } }]);

    assert.deepEqual(await service.getTask({ taskId: 'task-1' }), {
      taskId: 'task-1',
      taskStatus: WANXIANG_VIDEO_EDIT_TASK_STATUS.FAILED,
      videoUrl: null,
      origPrompt: null,
      submitTime: null,
      scheduledTime: null,
      endTime: null,
      usage: null,
      code: 'InvalidParameter',
      message: 'The size is not match',
      requestId: null,
    });
  });

  test('maps an expired task as UNKNOWN', async ({ assert }) => {
    const service = new TestWanxiangVideoEditService([{ output: { task_id: 'task-1', task_status: 'UNKNOWN' } }]);

    assert.deepEqual(await service.getTask({ taskId: 'task-1' }), {
      taskId: 'task-1',
      taskStatus: WANXIANG_VIDEO_EDIT_TASK_STATUS.UNKNOWN,
      videoUrl: null,
      origPrompt: null,
      submitTime: null,
      scheduledTime: null,
      endTime: null,
      usage: null,
      code: null,
      message: null,
      requestId: null,
    });
  });

  test('maps unknown status values to UNKNOWN', async ({ assert }) => {
    const service = new TestWanxiangVideoEditService([{ output: { task_id: 'task-1', task_status: 'WEIRD' } }]);

    const task = await service.getTask({ taskId: 'task-1' });
    assert.equal(task.taskStatus, WANXIANG_VIDEO_EDIT_TASK_STATUS.UNKNOWN);
  });

  test('parses string usage numbers', async ({ assert }) => {
    const service = new TestWanxiangVideoEditService([
      {
        output: { task_id: 'task-1', task_status: 'SUCCEEDED', video_url: 'https://cdn.example.com/out.mp4' },
        usage: { duration: '10.08', video_count: 1, SR: '720' },
      },
    ]);

    const task = await service.getTask({ taskId: 'task-1' });
    assert.deepEqual(task.usage, {
      duration: 10.08,
      inputVideoDuration: null,
      outputVideoDuration: null,
      videoCount: 1,
      sr: 720,
    });
  });

  for (const scenario of [
    { name: 'missing output', response: { message: 'task expired' }, message: '万相视频编辑失败: 查询任务失败: task expired' },
    { name: 'missing task ID', response: { output: { task_status: 'RUNNING' } }, message: '万相视频编辑失败: 查询任务失败: 服务响应格式无效' },
  ]) {
    test(`rejects ${scenario.name}`, async ({ assert }) => {
      const error = await caught(new TestWanxiangVideoEditService([scenario.response]).getTask({ taskId: 'task-1' }));

      assert.instanceOf(error, BusinessException);
      assert.equal((error as Error).message, scenario.message);
    });
  }

  test('builds the persisted task config JSON', async ({ assert }) => {
    assert.deepEqual(
      JSON.parse(
        buildWanxiangTaskConfig({
          input: {
            prompt: '将画面转换为黏土风格',
            negativePrompt: '低分辨率',
            media: [
              { type: 'video', url: 'https://cdn.example.com/video.mp4' },
              { type: 'reference_image', url: 'https://cdn.example.com/clothes.png' },
            ],
          },
          parameters: { resolution: '720P', watermark: true },
        }),
      ),
      {
        model: 'wan2.7-videoedit',
        prompt: '将画面转换为黏土风格',
        negativePrompt: '低分辨率',
        media: [
          { type: 'video', url: 'https://cdn.example.com/video.mp4' },
          { type: 'reference_image', url: 'https://cdn.example.com/clothes.png' },
        ],
        parameters: { resolution: '720P', watermark: true },
      },
    );
  });

  test('builds task config without optional fields', async ({ assert }) => {
    assert.deepEqual(JSON.parse(buildWanxiangTaskConfig({ input: { media: [{ type: 'video', url: 'https://cdn.example.com/video.mp4' }] } })), {
      model: 'wan2.7-videoedit',
      media: [{ type: 'video', url: 'https://cdn.example.com/video.mp4' }],
    });
  });

  test('validates entity id length up to 36 chars', async ({ assert }) => {
    assert.isTrue(isValidWanxiangEntityId('not-a-uuid'));
    assert.isTrue(isValidWanxiangEntityId('0385dc79-5ff8-4d82-bcb6-abcdef012345'));
    assert.isFalse(isValidWanxiangEntityId(''));
    assert.isFalse(isValidWanxiangEntityId('   '));
    assert.isFalse(isValidWanxiangEntityId('x'.repeat(37)));
  });

  test('rejects an invalid entity id before calling the API', async ({ assert }) => {
    const service = new TestWanxiangVideoEditService([]);
    const error = await caught(service.create({ userId: 'user-1', entityId: 'x'.repeat(37), input: { media: [{ type: 'video', url: 'https://cdn.example.com/video.mp4' }] } }));

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '万相视频编辑失败: entity_id 长度需在 1～36 个字符之间');
    assert.lengthOf(service.requests, 0);
  });
});

test.group('Wanxiang video edit service occupancy and abandon', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  async function createTask(params: { userId: string; entityId: string; taskId: string; status: string; reason?: string | null }) {
    return WanxiangVideoEditTask.create({
      userId: params.userId,
      entityId: params.entityId,
      taskId: params.taskId,
      status: params.status,
      config: JSON.stringify({ model: 'wan2.7-videoedit', media: defaultParams.input.media }),
      videoUrl: null,
      result: null,
      reason: params.reason ?? null,
    });
  }

  for (const status of [WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING, WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING]) {
    test(`rejects create when the user already has a ${status} task`, async ({ assert }) => {
      const service = new TestWanxiangVideoEditService([]);
      await createTask({ userId: 'user-1', entityId: 'entity-1', taskId: 'active-task', status });

      const error = await caught(service.create({ userId: 'user-1', entityId: 'entity-2', input: defaultParams.input }));

      assert.instanceOf(error, BusinessException);
      assert.equal((error as Error).message, '当前已有视频编辑任务进行中，请等待其完成后再试');
      assert.lengthOf(service.requests, 0);
    });
  }

  test('allows create when the user only has terminal tasks', async ({ assert }) => {
    const service = new TestWanxiangVideoEditService([{ output: { task_id: 'task-new', task_status: 'PENDING' }, request_id: 'req-1' }]);
    await createTask({ userId: 'user-1', entityId: 'entity-1', taskId: 'done-task', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED });

    const task = await service.create({ userId: 'user-1', entityId: 'entity-2', input: defaultParams.input });

    assert.equal(task.taskId, 'task-new');
    assert.equal(task.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING);
    assert.lengthOf(service.requests, 1);
  });

  test('abandons a non-terminal task owned by the user', async ({ assert }) => {
    const service = new TestWanxiangVideoEditService([]);
    await createTask({ userId: 'user-1', entityId: 'entity-1', taskId: 'running-task', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING });

    const task = await service.abandon({ taskId: 'running-task', userId: 'user-1' });

    assert.equal(task.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.CANCELED);
    assert.equal(task.reason, '用户已放弃');
    assert.lengthOf(service.requests, 0);
  });

  test('rejects abandoning a terminal task', async ({ assert }) => {
    const service = new TestWanxiangVideoEditService([]);
    await createTask({ userId: 'user-1', entityId: 'entity-1', taskId: 'done-task', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED });

    const error = await caught(service.abandon({ taskId: 'done-task', userId: 'user-1' }));

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '任务已结束，无需放弃');
  });

  test('rejects abandoning another user task', async ({ assert }) => {
    const service = new TestWanxiangVideoEditService([]);
    await createTask({ userId: 'user-1', entityId: 'entity-1', taskId: 'other-task', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING });

    const error = await caught(service.abandon({ taskId: 'other-task', userId: 'user-2' }));

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '任务不存在');
  });

  test('rejects abandoning a missing task', async ({ assert }) => {
    const service = new TestWanxiangVideoEditService([]);
    const error = await caught(service.abandon({ taskId: 'missing-task', userId: 'user-1' }));

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '任务不存在');
  });
});
