import testUtils from '@adonisjs/core/services/test_utils';
import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import WanxiangVideoTask from '#models/wanxiang-video-task';
import type { FetchClient } from '#providers/fetch-provider';
import { buildWanxiangTaskConfig, isValidWanxiangEntityId, WANXIANG_VIDEO_TASK_STATUS, WanxiangVideoService } from '#services/wanxiang-video-service';
import env from '#start/env';

type JsonRequest = {
  input: Parameters<FetchClient['json']>[0];
  init: Parameters<FetchClient['json']>[1];
};

class TestWanxiangVideoService extends WanxiangVideoService {
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
    prompt: '一只小猫在月光下的屋顶上奔跑，城市的霓虹灯在远处闪烁，电影级画质，流畅运镜。',
  },
};

const createEndpoint = `https://${env.get('ALIYUN_BAILIAN_WORKSPACE_ID')}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`;

async function caught(promise: Promise<unknown>) {
  return promise.catch((error) => error);
}

test.group('Wanxiang video service', () => {
  test('creates a task with the expected async HTTP request', async ({ assert }) => {
    const service = new TestWanxiangVideoService([{ output: { task_id: 'task-1', task_status: 'PENDING' }, request_id: 'req-1' }]);

    assert.deepEqual(await service.submit(defaultParams), {
      taskId: 'task-1',
      taskStatus: WANXIANG_VIDEO_TASK_STATUS.PENDING,
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
      model: 'wan3.0-video',
      input: { prompt: '一只小猫在月光下的屋顶上奔跑，城市的霓虹灯在远处闪烁，电影级画质，流畅运镜。' },
      parameters: {
        resolution: '1080P',
        ratio: 'adaptive',
        duration: 5,
        audio: true,
        prompt_extend: true,
        watermark: false,
      },
    });
  });

  test('uses the prime model when requested', async ({ assert }) => {
    const service = new TestWanxiangVideoService([{ output: { task_id: 'task-1', task_status: 'PENDING' } }]);

    await service.submit({ model: 'wan3.0-video-prime', input: defaultParams.input });

    assert.equal(JSON.parse(String(service.requests[0].init?.body)).model, 'wan3.0-video-prime');
  });

  test('sends media and all optional parameters', async ({ assert }) => {
    const service = new TestWanxiangVideoService([{ output: { task_id: 'task-1', task_status: 'PENDING' } }]);

    await service.submit({
      input: {
        prompt: '视频1抱着图3，在图4的椅子上弹奏一支舒缓的乡村民谣。',
        media: [
          { type: 'first_frame', url: 'https://cdn.example.com/start.png' },
          { type: 'last_frame', url: 'https://cdn.example.com/end.png' },
        ],
      },
      parameters: {
        resolution: '480P',
        ratio: '9:16',
        duration: 10,
        audio: false,
        seed: 42,
        promptExtend: false,
        watermark: true,
      },
    });

    assert.deepEqual(JSON.parse(String(service.requests[0].init?.body)), {
      model: 'wan3.0-video',
      input: {
        prompt: '视频1抱着图3，在图4的椅子上弹奏一支舒缓的乡村民谣。',
        media: [
          { type: 'first_frame', url: 'https://cdn.example.com/start.png' },
          { type: 'last_frame', url: 'https://cdn.example.com/end.png' },
        ],
      },
      parameters: {
        resolution: '480P',
        ratio: '9:16',
        duration: 10,
        audio: false,
        seed: 42,
        prompt_extend: false,
        watermark: true,
      },
    });
  });

  test('supports media-only requests', async ({ assert }) => {
    const service = new TestWanxiangVideoService([{ output: { task_id: 'task-1', task_status: 'PENDING' } }]);

    await service.submit({
      input: { media: [{ type: 'reference_video', url: 'https://cdn.example.com/video.mp4' }] },
    });

    assert.deepEqual(JSON.parse(String(service.requests[0].init?.body)), {
      model: 'wan3.0-video',
      input: { media: [{ type: 'reference_video', url: 'https://cdn.example.com/video.mp4' }] },
      parameters: {
        resolution: '1080P',
        ratio: 'adaptive',
        duration: 5,
        audio: true,
        prompt_extend: true,
        watermark: false,
      },
    });
  });

  test('accepts smart duration -1', async ({ assert }) => {
    const service = new TestWanxiangVideoService([{ output: { task_id: 'task-1', task_status: 'PENDING' } }]);

    await service.submit({ input: defaultParams.input, parameters: { duration: -1 } });

    assert.equal(JSON.parse(String(service.requests[0].init?.body)).parameters.duration, -1);
  });

  for (const scenario of [
    { name: 'missing prompt and media', params: { input: {} }, message: '视频生成失败: prompt 和 media 至少需要传入一个' },
    {
      name: 'overlong prompt',
      params: { input: { prompt: 'a'.repeat(20001) } },
      message: '视频生成失败: 提示词长度不能超过 20000 个字符',
    },
    {
      name: 'blank media URL',
      params: { input: { media: [{ type: 'reference_image', url: '   ' }] } },
      message: '视频生成失败: 媒体素材 URL 无效',
    },
    {
      name: 'invalid media type',
      params: { input: { media: [{ type: 'audio', url: 'https://cdn.example.com/a.mp3' }] } },
      message: '视频生成失败: 不支持的媒体素材类型: audio',
    },
    {
      name: 'too many first frames',
      params: {
        input: {
          media: [
            { type: 'first_frame', url: 'https://cdn.example.com/1.png' },
            { type: 'first_frame', url: 'https://cdn.example.com/2.png' },
          ],
        },
      },
      message: '视频生成失败: media 中 first_frame 最多传入 1 个',
    },
    {
      name: 'too many reference images',
      params: {
        input: {
          media: [...Array.from({ length: 11 }, (_, index) => ({ type: 'reference_image' as const, url: `https://cdn.example.com/${index}.png` }))],
        },
      },
      message: '视频生成失败: media 中 reference_image 最多传入 10 个',
    },
    {
      name: 'too many reference videos',
      params: {
        input: {
          media: [...Array.from({ length: 6 }, (_, index) => ({ type: 'reference_video' as const, url: `https://cdn.example.com/${index}.mp4` }))],
        },
      },
      message: '视频生成失败: media 中 reference_video 最多传入 5 个',
    },
    {
      name: 'file and link together',
      params: {
        input: {
          media: [
            { type: 'file', url: 'https://cdn.example.com/a.pptx' },
            { type: 'link', url: 'https://example.com/article/1' },
          ],
        },
      },
      message: '视频生成失败: file 与 link 不能同时传入',
    },
    {
      name: 'frames mixed with reference media',
      params: {
        input: {
          media: [
            { type: 'first_frame', url: 'https://cdn.example.com/start.png' },
            { type: 'reference_image', url: 'https://cdn.example.com/ref.png' },
          ],
        },
      },
      message: '视频生成失败: first_frame/last_frame 与 reference_*/file/link 不能同时传入',
    },
    {
      name: 'out of range duration',
      params: { input: defaultParams.input, parameters: { duration: 31 } },
      message: '视频生成失败: 视频时长需为 -1 或 2～30 之间的整数',
    },
    {
      name: 'duration below minimum',
      params: { input: defaultParams.input, parameters: { duration: 1 } },
      message: '视频生成失败: 视频时长需为 -1 或 2～30 之间的整数',
    },
    {
      name: 'out of range seed',
      params: { input: defaultParams.input, parameters: { seed: 2147483648 } },
      message: '视频生成失败: 随机数种子取值范围为 [0, 2147483647]',
    },
  ]) {
    test(`rejects ${scenario.name} before calling the API`, async ({ assert }) => {
      const service = new TestWanxiangVideoService([]);
      const error = await caught(service.submit(scenario.params as Parameters<WanxiangVideoService['submit']>[0]));

      assert.instanceOf(error, BusinessException);
      assert.equal((error as Error).message, scenario.message);
      assert.lengthOf(service.requests, 0);
    });
  }

  for (const scenario of [
    { name: 'missing output', response: { message: 'InvalidApiKey' }, message: '视频生成失败: 创建任务失败: InvalidApiKey' },
    { name: 'missing task ID', response: { output: { task_status: 'PENDING' } }, message: '视频生成失败: 创建任务失败: 服务响应格式无效' },
    { name: 'missing task status', response: { output: { task_id: 'task-1' } }, message: '视频生成失败: 创建任务失败: 服务响应格式无效' },
  ]) {
    test(`rejects ${scenario.name}`, async ({ assert }) => {
      const error = await caught(new TestWanxiangVideoService([scenario.response]).submit(defaultParams));

      assert.instanceOf(error, BusinessException);
      assert.equal((error as Error).message, scenario.message);
    });
  }

  test('maps a succeeded task with video URL and usage', async ({ assert }) => {
    const service = new TestWanxiangVideoService([
      {
        request_id: 'req-1',
        output: {
          task_id: 'task-1',
          task_status: 'SUCCEEDED',
          submit_time: '2026-08-06 10:01:35.452',
          scheduled_time: '2026-08-06 10:01:35.507',
          end_time: '2026-08-06 10:13:33.838',
          orig_prompt: '一只小猫在月光下的屋顶上奔跑',
          video_url: 'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxx/video.mp4',
        },
        usage: {
          duration: 5.0,
          input_video_duration: 0.0,
          output_video_duration: 5.0,
          video_count: 1,
          fps: 30,
          SR: 720,
          ratio: '16:9',
        },
      },
    ]);

    assert.deepEqual(await service.getTask({ taskId: 'task-1' }), {
      taskId: 'task-1',
      taskStatus: WANXIANG_VIDEO_TASK_STATUS.SUCCEEDED,
      videoUrl: 'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxx/video.mp4',
      origPrompt: '一只小猫在月光下的屋顶上奔跑',
      submitTime: '2026-08-06 10:01:35.452',
      scheduledTime: '2026-08-06 10:01:35.507',
      endTime: '2026-08-06 10:13:33.838',
      usage: {
        duration: 5.0,
        inputVideoDuration: 0.0,
        outputVideoDuration: 5.0,
        videoCount: 1,
        fps: 30,
        sr: 720,
        ratio: '16:9',
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
    const service = new TestWanxiangVideoService([
      { output: { task_id: 'task-1', task_status: 'FAILED', code: 'InvalidParameter', message: 'The two modes are mutually exclusive.' } },
    ]);

    assert.deepEqual(await service.getTask({ taskId: 'task-1' }), {
      taskId: 'task-1',
      taskStatus: WANXIANG_VIDEO_TASK_STATUS.FAILED,
      videoUrl: null,
      origPrompt: null,
      submitTime: null,
      scheduledTime: null,
      endTime: null,
      usage: null,
      code: 'InvalidParameter',
      message: 'The two modes are mutually exclusive.',
      requestId: null,
    });
  });

  test('maps an expired task as UNKNOWN', async ({ assert }) => {
    const service = new TestWanxiangVideoService([{ output: { task_id: 'task-1', task_status: 'UNKNOWN' } }]);

    assert.deepEqual(await service.getTask({ taskId: 'task-1' }), {
      taskId: 'task-1',
      taskStatus: WANXIANG_VIDEO_TASK_STATUS.UNKNOWN,
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
    const service = new TestWanxiangVideoService([{ output: { task_id: 'task-1', task_status: 'WEIRD' } }]);

    const task = await service.getTask({ taskId: 'task-1' });
    assert.equal(task.taskStatus, WANXIANG_VIDEO_TASK_STATUS.UNKNOWN);
  });

  test('parses string usage numbers', async ({ assert }) => {
    const service = new TestWanxiangVideoService([
      {
        output: { task_id: 'task-1', task_status: 'SUCCEEDED', video_url: 'https://cdn.example.com/out.mp4' },
        usage: { duration: '5.02', video_count: 1, fps: '30', SR: '480', ratio: '9:16' },
      },
    ]);

    const task = await service.getTask({ taskId: 'task-1' });
    assert.deepEqual(task.usage, {
      duration: 5.02,
      inputVideoDuration: null,
      outputVideoDuration: null,
      videoCount: 1,
      fps: 30,
      sr: 480,
      ratio: '9:16',
    });
  });

  for (const scenario of [
    { name: 'missing output', response: { message: 'task expired' }, message: '视频生成失败: 查询任务失败: task expired' },
    { name: 'missing task ID', response: { output: { task_status: 'RUNNING' } }, message: '视频生成失败: 查询任务失败: 服务响应格式无效' },
  ]) {
    test(`rejects ${scenario.name}`, async ({ assert }) => {
      const error = await caught(new TestWanxiangVideoService([scenario.response]).getTask({ taskId: 'task-1' }));

      assert.instanceOf(error, BusinessException);
      assert.equal((error as Error).message, scenario.message);
    });
  }

  test('builds the persisted task config JSON', async ({ assert }) => {
    assert.deepEqual(
      JSON.parse(
        buildWanxiangTaskConfig({
          model: 'wan3.0-video-prime',
          input: {
            prompt: '将整个画面转换为黏土风格',
            media: [{ type: 'reference_video', url: 'https://cdn.example.com/video.mp4' }],
          },
          parameters: { resolution: '720P', watermark: true },
        }),
      ),
      {
        model: 'wan3.0-video-prime',
        prompt: '将整个画面转换为黏土风格',
        media: [{ type: 'reference_video', url: 'https://cdn.example.com/video.mp4' }],
        parameters: { resolution: '720P', watermark: true },
      },
    );
  });

  test('builds task config without optional fields', async ({ assert }) => {
    assert.deepEqual(JSON.parse(buildWanxiangTaskConfig({ input: { prompt: '文生视频' } })), {
      model: 'wan3.0-video',
      prompt: '文生视频',
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
    const service = new TestWanxiangVideoService([]);
    const error = await caught(service.create({ userId: 'user-1', entityId: 'x'.repeat(37), input: defaultParams.input }));

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '视频生成失败: entity_id 长度需在 1～36 个字符之间');
    assert.lengthOf(service.requests, 0);
  });
});

test.group('Wanxiang video service occupancy and abandon', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  async function createTask(params: { userId: string; entityId: string | null; taskId: string; status: string; reason?: string | null }) {
    return WanxiangVideoTask.create({
      userId: params.userId,
      entityId: params.entityId,
      taskId: params.taskId,
      status: params.status,
      config: JSON.stringify({ model: 'wan3.0-video', prompt: defaultParams.input.prompt }),
      videoUrl: null,
      result: null,
      reason: params.reason ?? null,
    });
  }

  for (const status of [WANXIANG_VIDEO_TASK_STATUS.PENDING, WANXIANG_VIDEO_TASK_STATUS.RUNNING]) {
    test(`rejects create when the same node already has a ${status} task`, async ({ assert }) => {
      const service = new TestWanxiangVideoService([]);
      await createTask({ userId: 'user-1', entityId: 'entity-1', taskId: 'active-task', status });

      const error = await caught(service.create({ userId: 'user-1', entityId: 'entity-1', input: defaultParams.input }));

      assert.instanceOf(error, BusinessException);
      assert.equal((error as Error).message, '该节点已有视频生成任务进行中，请等待其完成后再试');
      assert.lengthOf(service.requests, 0);
    });
  }

  test('allows parallel tasks on different nodes while one node is active', async ({ assert }) => {
    const service = new TestWanxiangVideoService([{ output: { task_id: 'task-new', task_status: 'PENDING' }, request_id: 'req-1' }]);
    await createTask({ userId: 'user-1', entityId: 'entity-1', taskId: 'active-task', status: WANXIANG_VIDEO_TASK_STATUS.RUNNING });

    const task = await service.create({ userId: 'user-1', entityId: 'entity-2', input: defaultParams.input });

    assert.equal(task.taskId, 'task-new');
    assert.equal(task.status, WANXIANG_VIDEO_TASK_STATUS.PENDING);
    assert.lengthOf(service.requests, 1);
  });

  test('keeps the global check when no entity id is provided', async ({ assert }) => {
    const service = new TestWanxiangVideoService([]);
    await createTask({ userId: 'user-1', entityId: 'entity-1', taskId: 'active-task', status: WANXIANG_VIDEO_TASK_STATUS.PENDING });

    const error = await caught(service.create({ userId: 'user-1', input: defaultParams.input }));

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '当前已有视频生成任务进行中，请等待其完成后再试');
    assert.lengthOf(service.requests, 0);
  });

  test('allows create when the user only has terminal tasks', async ({ assert }) => {
    const service = new TestWanxiangVideoService([{ output: { task_id: 'task-new', task_status: 'PENDING' }, request_id: 'req-1' }]);
    await createTask({ userId: 'user-1', entityId: 'entity-1', taskId: 'done-task', status: WANXIANG_VIDEO_TASK_STATUS.SUCCEEDED });

    const task = await service.create({ userId: 'user-1', entityId: 'entity-2', input: defaultParams.input });

    assert.equal(task.taskId, 'task-new');
    assert.equal(task.status, WANXIANG_VIDEO_TASK_STATUS.PENDING);
    assert.lengthOf(service.requests, 1);
  });

  test('allows create without an entity id', async ({ assert }) => {
    const service = new TestWanxiangVideoService([{ output: { task_id: 'task-new', task_status: 'PENDING' }, request_id: 'req-1' }]);

    const task = await service.create({ userId: 'user-1', input: defaultParams.input });

    assert.equal(task.taskId, 'task-new');
    assert.isNull(task.entityId);
    assert.lengthOf(service.requests, 1);
  });

  test('abandons a non-terminal task owned by the user', async ({ assert }) => {
    const service = new TestWanxiangVideoService([]);
    await createTask({ userId: 'user-1', entityId: 'entity-1', taskId: 'running-task', status: WANXIANG_VIDEO_TASK_STATUS.RUNNING });

    const task = await service.abandon({ taskId: 'running-task', userId: 'user-1' });

    assert.equal(task.status, WANXIANG_VIDEO_TASK_STATUS.CANCELED);
    assert.equal(task.reason, '用户已放弃');
    assert.lengthOf(service.requests, 0);
  });

  test('rejects abandoning a terminal task', async ({ assert }) => {
    const service = new TestWanxiangVideoService([]);
    await createTask({ userId: 'user-1', entityId: 'entity-1', taskId: 'done-task', status: WANXIANG_VIDEO_TASK_STATUS.SUCCEEDED });

    const error = await caught(service.abandon({ taskId: 'done-task', userId: 'user-1' }));

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '任务已结束，无需放弃');
  });

  test('rejects abandoning another user task', async ({ assert }) => {
    const service = new TestWanxiangVideoService([]);
    await createTask({ userId: 'user-1', entityId: 'entity-1', taskId: 'other-task', status: WANXIANG_VIDEO_TASK_STATUS.RUNNING });

    const error = await caught(service.abandon({ taskId: 'other-task', userId: 'user-2' }));

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '任务不存在');
  });

  test('rejects abandoning a missing task', async ({ assert }) => {
    const service = new TestWanxiangVideoService([]);
    const error = await caught(service.abandon({ taskId: 'missing-task', userId: 'user-1' }));

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '任务不存在');
  });
});
