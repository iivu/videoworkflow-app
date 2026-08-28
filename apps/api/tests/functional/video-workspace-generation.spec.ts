import app from '@adonisjs/core/services/app';
import testUtils from '@adonisjs/core/services/test_utils';
import { test } from '@japa/runner';

import User from '#models/user';
import VideoWorkspace from '#models/video-workspace';
import WanxiangVideoTask from '#models/wanxiang-video-task';
import { createFetchClient, type FetchClient } from '#providers/fetch-provider';
import { WANXIANG_VIDEO_TASK_STATUS } from '#services/wanxiang-video-service';

const EMPTY_CANVAS = JSON.stringify({ nodes: [], edges: [], viewport: null });

const fetchQueue: { responses: unknown[] } = { responses: [] };

function stubFetch() {
  return {
    json: async <T = unknown>() => {
      const response = fetchQueue.responses.shift();
      if (response instanceof Error) throw response;
      return response as T;
    },
  } as unknown as FetchClient;
}

async function createUser(username: string) {
  return User.create({ username, password: 'test-password' });
}

async function createWorkspace(params: { userId: string; name: string; canvas?: string }) {
  return VideoWorkspace.create({
    userId: params.userId,
    name: params.name,
    canvas: params.canvas ?? EMPTY_CANVAS,
  });
}

async function createCanvasWorkspace(userId: string, nodeIds: string[]) {
  return createWorkspace({
    userId,
    name: '生成空间',
    canvas: JSON.stringify({
      nodes: nodeIds.map((id) => ({ id, position: { x: 0, y: 0 }, data: {} })),
      edges: [],
      viewport: null,
    }),
  });
}

async function createTask(params: { userId: string; entityId: string; taskId: string; status: string; videoUrl?: string | null; result?: string | null; reason?: string | null }) {
  return WanxiangVideoTask.create({
    userId: params.userId,
    entityId: params.entityId,
    taskId: params.taskId,
    status: params.status,
    config: JSON.stringify({ model: 'wan3.0-video', prompt: '测试' }),
    videoUrl: params.videoUrl ?? null,
    result: params.result ?? null,
    reason: params.reason ?? null,
  });
}

test.group('Video workspace generation HTTP boundary', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());
  group.each.setup(() => {
    fetchQueue.responses = [];
    app.container.bind('fetch', () => stubFetch());
  });
  group.each.teardown(() => {
    app.container.bind('fetch', () => createFetchClient());
  });

  test('requires authentication', async ({ client }) => {
    const response = await client.post('/api/v1/video-workspaces/1/nodes/node-1/generate');

    response.assertStatus(401);
  });

  test('rejects an overlong prompt', async ({ client }) => {
    const user = await createUser('workspace-gen-long-prompt');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);

    const response = await client
      .post(`/api/v1/video-workspaces/${workspace.id}/nodes/node-1/generate`)
      .loginAs(user)
      .json({ input: { prompt: 'a'.repeat(20001) } });

    response.assertStatus(422);
  });

  test('requires a prompt', async ({ client }) => {
    const user = await createUser('workspace-gen-no-prompt');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);

    const response = await client.post(`/api/v1/video-workspaces/${workspace.id}/nodes/node-1/generate`).loginAs(user).json({ input: {} });

    response.assertStatus(422);
  });

  test('rejects unsupported media types and too many frames', async ({ client }) => {
    const user = await createUser('workspace-gen-bad-media');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);

    const badType = await client
      .post(`/api/v1/video-workspaces/${workspace.id}/nodes/node-1/generate`)
      .loginAs(user)
      .json({ input: { prompt: '一只猫', media: [{ type: 'reference_image', url: 'https://cdn.example.com/ref.png' }] } });
    badType.assertStatus(422);

    const tooMany = await client
      .post(`/api/v1/video-workspaces/${workspace.id}/nodes/node-1/generate`)
      .loginAs(user)
      .json({
        input: {
          prompt: '一只猫',
          media: [
            { type: 'first_frame', url: 'https://cdn.example.com/1.png' },
            { type: 'first_frame', url: 'https://cdn.example.com/2.png' },
            { type: 'last_frame', url: 'https://cdn.example.com/3.png' },
          ],
        },
      });
    tooMany.assertStatus(422);
  });

  test('rejects out-of-range parameters', async ({ client }) => {
    const user = await createUser('workspace-gen-bad-params');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);

    const response = await client
      .post(`/api/v1/video-workspaces/${workspace.id}/nodes/node-1/generate`)
      .loginAs(user)
      .json({ input: { prompt: '一只猫' }, parameters: { duration: 31 } });

    response.assertStatus(422);
  });

  test('rejects an invalid node id', async ({ client }) => {
    const user = await createUser('workspace-gen-bad-node');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);

    const response = await client
      .post(`/api/v1/video-workspaces/${workspace.id}/nodes/${'x'.repeat(37)}/generate`)
      .loginAs(user)
      .json({ input: { prompt: '一只猫' } });

    response.assertStatus(422);
  });

  test('rejects generate for a node that is not on the canvas', async ({ assert, client }) => {
    const user = await createUser('workspace-gen-ghost-node');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);

    const response = await client
      .post(`/api/v1/video-workspaces/${workspace.id}/nodes/ghost-node/generate`)
      .loginAs(user)
      .json({ input: { prompt: '一只猫' } });

    response.assertStatus(400);
    assert.deepEqual(response.body(), { code: 40000, message: '生成节点不存在于当前画布', data: null });
  });

  test('rejects generate on another user workspace', async ({ assert, client }) => {
    const owner = await createUser('workspace-gen-owner');
    const attacker = await createUser('workspace-gen-attacker');
    const workspace = await createCanvasWorkspace(owner.id, ['node-1']);

    const response = await client
      .post(`/api/v1/video-workspaces/${workspace.id}/nodes/node-1/generate`)
      .loginAs(attacker)
      .json({ input: { prompt: '一只猫' } });

    response.assertStatus(400);
    assert.deepEqual(response.body(), { code: 40000, message: '创作空间不存在', data: null });
  });

  test('creates a generation task and persists it', async ({ assert, client }) => {
    const user = await createUser('workspace-gen-create');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);
    fetchQueue.responses = [{ output: { task_id: 'task-gen-1', task_status: 'PENDING' }, request_id: 'req-1' }];

    const response = await client
      .post(`/api/v1/video-workspaces/${workspace.id}/nodes/node-1/generate`)
      .loginAs(user)
      .json({
        model: 'wan3.0-video-prime',
        input: {
          prompt: '一只小猫在月光下奔跑',
          media: [{ type: 'first_frame', url: 'https://cdn.example.com/start.png' }],
        },
        parameters: { resolution: '720P', duration: 8, audio: false },
      });

    response.assertStatus(200);
    const data = response.body().data;
    assert.equal(data.taskId, 'task-gen-1');
    assert.equal(data.entityId, 'node-1');
    assert.equal(data.status, WANXIANG_VIDEO_TASK_STATUS.PENDING);
    assert.notProperty(data, 'userId');
    assert.equal(
      await WanxiangVideoTask.query()
        .where('taskId', 'task-gen-1')
        .where('userId', user.id)
        .firstOrFail()
        .then((task) => task.entityId),
      'node-1',
    );
  });

  test('rejects the same node while a task is running', async ({ assert, client }) => {
    const user = await createUser('workspace-gen-concurrent');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);
    await createTask({ userId: user.id, entityId: 'node-1', taskId: 'active-task', status: WANXIANG_VIDEO_TASK_STATUS.RUNNING });

    const response = await client
      .post(`/api/v1/video-workspaces/${workspace.id}/nodes/node-1/generate`)
      .loginAs(user)
      .json({ input: { prompt: '一只猫' } });

    response.assertStatus(400);
    assert.deepEqual(response.body(), { code: 40000, message: '该节点已有视频生成任务进行中，请等待其完成后再试', data: null });
  });

  test('returns the public projection for a terminal task', async ({ assert, client }) => {
    const user = await createUser('workspace-gen-terminal');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);
    const task = await createTask({
      userId: user.id,
      entityId: 'node-1',
      taskId: 'failed-task',
      status: WANXIANG_VIDEO_TASK_STATUS.FAILED,
      reason: 'The size is not match',
    });

    const response = await client.get(`/api/v1/video-workspaces/${workspace.id}/tasks/failed-task`).loginAs(user);

    response.assertStatus(200);
    const data = response.body().data;
    assert.equal(data.id, task.id);
    assert.equal(data.entityId, 'node-1');
    assert.equal(data.taskId, 'failed-task');
    assert.equal(data.status, WANXIANG_VIDEO_TASK_STATUS.FAILED);
    assert.equal(data.reason, 'The size is not match');
    assert.notProperty(data, 'userId');
  });

  test('rejects a task that belongs to another workspace node', async ({ assert, client }) => {
    const user = await createUser('workspace-gen-foreign-task');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);
    await createTask({ userId: user.id, entityId: 'outside-node', taskId: 'outside-task', status: WANXIANG_VIDEO_TASK_STATUS.RUNNING });

    const response = await client.get(`/api/v1/video-workspaces/${workspace.id}/tasks/outside-task`).loginAs(user);

    response.assertStatus(400);
    assert.deepEqual(response.body(), { code: 40000, message: '任务不属于该创作空间', data: null });
  });

  test('rejects another user task', async ({ assert, client }) => {
    const owner = await createUser('workspace-gen-task-owner');
    const viewer = await createUser('workspace-gen-task-viewer');
    const workspace = await createCanvasWorkspace(owner.id, ['node-1']);
    await createTask({ userId: owner.id, entityId: 'node-1', taskId: 'private-task', status: WANXIANG_VIDEO_TASK_STATUS.RUNNING });

    const response = await client.get(`/api/v1/video-workspaces/${workspace.id}/tasks/private-task`).loginAs(viewer);

    response.assertStatus(400);
    assert.deepEqual(response.body(), { code: 40000, message: '创作空间不存在', data: null });
  });

  test('polls a running task to a succeeded terminal state', async ({ assert, client }) => {
    const user = await createUser('workspace-gen-poll');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);
    await createTask({ userId: user.id, entityId: 'node-1', taskId: 'running-task', status: WANXIANG_VIDEO_TASK_STATUS.RUNNING });
    fetchQueue.responses = [
      {
        request_id: 'req-1',
        output: {
          task_id: 'running-task',
          task_status: 'SUCCEEDED',
          submit_time: '2026-08-06 10:01:35.452',
          scheduled_time: '2026-08-06 10:01:35.507',
          end_time: '2026-08-06 10:13:33.838',
          orig_prompt: '一只小猫',
          video_url: 'https://cdn.example.com/out.mp4',
        },
        usage: { duration: 5.0, video_count: 1, fps: 30, SR: 720, ratio: '16:9' },
      },
    ];

    const response = await client.get(`/api/v1/video-workspaces/${workspace.id}/tasks/running-task/check`).loginAs(user);

    response.assertStatus(200);
    const data = response.body().data;
    assert.equal(data.status, WANXIANG_VIDEO_TASK_STATUS.SUCCEEDED);
    assert.equal(data.videoUrl, 'https://cdn.example.com/out.mp4');
    assert.deepEqual(JSON.parse(data.result), {
      usage: { duration: 5.0, inputVideoDuration: null, outputVideoDuration: null, videoCount: 1, fps: 30, sr: 720, ratio: '16:9' },
      submitTime: '2026-08-06 10:01:35.452',
      scheduledTime: '2026-08-06 10:01:35.507',
      endTime: '2026-08-06 10:13:33.838',
      origPrompt: '一只小猫',
      requestId: 'req-1',
    });
  });

  test('returns the cached result for a terminal task without remote polling', async ({ assert, client }) => {
    const user = await createUser('workspace-gen-cached');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);
    await createTask({
      userId: user.id,
      entityId: 'node-1',
      taskId: 'succeeded-task',
      status: WANXIANG_VIDEO_TASK_STATUS.SUCCEEDED,
      videoUrl: 'https://cdn.example.com/out.mp4',
      result: JSON.stringify({ usage: { duration: 5.0 }, requestId: 'req-1' }),
    });

    const response = await client.get(`/api/v1/video-workspaces/${workspace.id}/tasks/succeeded-task/check`).loginAs(user);

    response.assertStatus(200);
    const data = response.body().data;
    assert.equal(data.status, WANXIANG_VIDEO_TASK_STATUS.SUCCEEDED);
    assert.equal(data.videoUrl, 'https://cdn.example.com/out.mp4');
    assert.deepEqual(JSON.parse(data.result), { usage: { duration: 5.0 }, requestId: 'req-1' });
    assert.lengthOf(fetchQueue.responses, 0);
  });

  test('abandons a running task', async ({ assert, client }) => {
    const user = await createUser('workspace-gen-abandon');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);
    await createTask({ userId: user.id, entityId: 'node-1', taskId: 'running-task', status: WANXIANG_VIDEO_TASK_STATUS.RUNNING });

    const response = await client.post(`/api/v1/video-workspaces/${workspace.id}/tasks/running-task/abandon`).loginAs(user);

    response.assertStatus(200);
    const data = response.body().data;
    assert.equal(data.status, WANXIANG_VIDEO_TASK_STATUS.CANCELED);
    assert.equal(data.reason, '用户已放弃');
  });

  test('rejects abandoning a terminal task', async ({ assert, client }) => {
    const user = await createUser('workspace-gen-abandon-terminal');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);
    await createTask({ userId: user.id, entityId: 'node-1', taskId: 'done-task', status: WANXIANG_VIDEO_TASK_STATUS.SUCCEEDED });

    const response = await client.post(`/api/v1/video-workspaces/${workspace.id}/tasks/done-task/abandon`).loginAs(user);

    response.assertStatus(400);
    assert.deepEqual(response.body(), { code: 40000, message: '任务已结束，无需放弃', data: null });
  });

  test('lists tasks scoped to the workspace canvas nodes', async ({ assert, client }) => {
    const user = await createUser('workspace-gen-list');
    const workspace = await createCanvasWorkspace(user.id, ['node-1']);
    await createTask({ userId: user.id, entityId: 'node-1', taskId: 'task-a', status: WANXIANG_VIDEO_TASK_STATUS.PENDING });
    await createTask({ userId: user.id, entityId: 'outside-node', taskId: 'task-b', status: WANXIANG_VIDEO_TASK_STATUS.RUNNING });

    const response = await client.get(`/api/v1/video-workspaces/${workspace.id}/tasks`).loginAs(user);

    response.assertStatus(200);
    const body = response.body().data;
    assert.equal(body.meta.total, 1);
    assert.equal(body.list.length, 1);
    assert.equal(body.list[0].taskId, 'task-a');
  });
});
