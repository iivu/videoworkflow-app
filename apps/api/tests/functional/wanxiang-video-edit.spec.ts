import testUtils from '@adonisjs/core/services/test_utils';
import { test } from '@japa/runner';

import User from '#models/user';
import WanxiangVideoEditTask from '#models/wanxiang-video-edit-task';
import { WANXIANG_VIDEO_EDIT_TASK_STATUS } from '#services/wanxiang-video-edit-service';

const validMedia = [{ type: 'video' as const, url: 'https://cdn.example.com/video.mp4' }];

async function createUser(username: string) {
  return User.create({ username, password: 'test-password' });
}

async function createTask(params: { userId: string; entityId: string; taskId: string; status: string; videoUrl?: string | null; result?: string | null; reason?: string | null }) {
  return WanxiangVideoEditTask.create({
    userId: params.userId,
    entityId: params.entityId,
    taskId: params.taskId,
    status: params.status,
    config: JSON.stringify({ model: 'wan2.7-videoedit', media: validMedia }),
    videoUrl: params.videoUrl ?? null,
    result: params.result ?? null,
    reason: params.reason ?? null,
  });
}

test.group('Wanxiang video edit HTTP boundary', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/video-edit/tasks/any-task/check');

    response.assertStatus(401);
  });

  test('validates the taskId route parameter', async ({ client }) => {
    const user = await createUser('wanxiang-invalid-id');
    const response = await client.get(`/api/v1/video-edit/tasks/${'x'.repeat(37)}`).loginAs(user);

    response.assertStatus(422);
  });

  test('rejects an invalid entity id before remote submission', async ({ assert, client }) => {
    const user = await createUser('wanxiang-bad-entity');

    const response = await client
      .post('/api/v1/video-edit/tasks')
      .loginAs(user)
      .json({ entityId: 'x'.repeat(37), input: { media: validMedia } });

    response.assertStatus(400);
    assert.deepEqual(response.body(), { code: 40000, message: '万相视频编辑失败: entity_id 长度需在 1～36 个字符之间', data: null });
  });

  test('validates the media payload shape', async ({ client }) => {
    const user = await createUser('wanxiang-invalid-media');

    const response = await client
      .post('/api/v1/video-edit/tasks')
      .loginAs(user)
      .json({ entityId: 'entity-1', input: { media: [{ type: 'video', url: '' }] } });

    response.assertStatus(422);
  });

  test('does not expose another user task', async ({ assert, client }) => {
    const owner = await createUser('wanxiang-owner');
    const viewer = await createUser('wanxiang-viewer');
    await createTask({ userId: owner.id, entityId: 'entity-1', taskId: 'private-task', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.FAILED, reason: 'private reason' });

    const response = await client.get('/api/v1/video-edit/tasks/private-task').loginAs(viewer);

    response.assertStatus(400);
    assert.deepEqual(response.body(), { code: 40000, message: '任务不存在', data: null });
  });

  test('returns the public projection for a terminal task', async ({ assert, client }) => {
    const user = await createUser('wanxiang-terminal-task');
    const task = await createTask({
      userId: user.id,
      entityId: 'entity-1',
      taskId: 'failed-task',
      status: WANXIANG_VIDEO_EDIT_TASK_STATUS.FAILED,
      reason: 'The size is not match',
    });

    const response = await client.get('/api/v1/video-edit/tasks/failed-task').loginAs(user);

    response.assertStatus(200);
    const body = response.body();
    assert.equal(body.data.id, task.id);
    assert.equal(body.data.entityId, 'entity-1');
    assert.equal(body.data.taskId, 'failed-task');
    assert.equal(body.data.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.FAILED);
    assert.equal(body.data.reason, 'The size is not match');
    assert.notProperty(body.data, 'userId');
  });

  test('returns the cached result for a terminal task without remote polling', async ({ assert, client }) => {
    const user = await createUser('wanxiang-cached-result');
    await createTask({
      userId: user.id,
      entityId: 'entity-1',
      taskId: 'succeeded-task',
      status: WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED,
      videoUrl: 'https://cdn.example.com/out.mp4',
      result: JSON.stringify({ usage: { duration: 10.04 }, requestId: 'req-1' }),
    });

    const response = await client.get('/api/v1/video-edit/tasks/succeeded-task/check').loginAs(user);

    response.assertStatus(200);
    const body = response.body();
    assert.equal(body.data.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED);
    assert.equal(body.data.videoUrl, 'https://cdn.example.com/out.mp4');
    assert.deepEqual(JSON.parse(body.data.result), { usage: { duration: 10.04 }, requestId: 'req-1' });
  });

  test('lists tasks filtered by entity id', async ({ assert, client }) => {
    const user = await createUser('wanxiang-list');
    await createTask({ userId: user.id, entityId: 'entity-a', taskId: 'task-a', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING });
    await createTask({ userId: user.id, entityId: 'entity-b', taskId: 'task-b', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING });

    const response = await client.get('/api/v1/video-edit/tasks?entityId=entity-a').loginAs(user);

    response.assertStatus(200);
    const body = response.body();
    assert.equal(body.meta.total, 1);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].taskId, 'task-a');
    assert.equal(body.data[0].entityId, 'entity-a');
  });

  test('lists tasks filtered by status', async ({ assert, client }) => {
    const user = await createUser('wanxiang-list-status');
    await createTask({ userId: user.id, entityId: 'entity-1', taskId: 'task-pending', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING });
    await createTask({ userId: user.id, entityId: 'entity-1', taskId: 'task-running', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING });

    const response = await client.get(`/api/v1/video-edit/tasks?status=${WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING}`).loginAs(user);

    response.assertStatus(200);
    const body = response.body();
    assert.equal(body.meta.total, 1);
    assert.equal(body.data[0].taskId, 'task-running');
  });
});
