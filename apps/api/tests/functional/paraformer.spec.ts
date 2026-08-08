import testUtils from '@adonisjs/core/services/test_utils';
import { test } from '@japa/runner';
import { DateTime } from 'luxon';

import ParaformerTask from '#models/paraformer-task';
import User from '#models/user';
import Video from '#models/video';
import { PARAFORMER_TASK_STATUS } from '#services/paraformer-service';

async function createUser(username: string) {
  return User.create({ username, password: 'test-password' });
}

async function createVideo(userId: string) {
  return Video.create({
    userId,
    title: 'Test video',
    author: 'Tester',
    fileUrl: 'https://cdn.example.com/video.mp4',
    publishAt: DateTime.utc(),
  });
}

test.group('Paraformer HTTP boundary', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/paraformer/task/check/1');

    response.assertStatus(401);
  });

  test('validates the videoId route parameter', async ({ client }) => {
    const user = await createUser('paraformer-invalid-id');
    const response = await client.get('/api/v1/paraformer/task/check/not-a-number').loginAs(user);

    response.assertStatus(422);
  });

  test('does not expose another user task', async ({ assert, client }) => {
    const owner = await createUser('paraformer-owner');
    const viewer = await createUser('paraformer-viewer');
    const video = await createVideo(owner.id);
    await ParaformerTask.create({
      userId: owner.id,
      videoId: video.id,
      taskId: 'private-task',
      status: PARAFORMER_TASK_STATUS.FAILED,
      result: null,
      reason: 'private reason',
    });

    const response = await client.get(`/api/v1/paraformer/task/check/${video.id}`).loginAs(viewer);

    response.assertStatus(200);
    assert.deepEqual(response.body(), { code: 0, message: 'ok', data: null });
  });

  test('returns null when the current user has no task', async ({ assert, client }) => {
    const user = await createUser('paraformer-no-task');
    const video = await createVideo(user.id);

    const response = await client.get(`/api/v1/paraformer/task/check/${video.id}`).loginAs(user);

    response.assertStatus(200);
    assert.deepEqual(response.body(), { code: 0, message: 'ok', data: null });
  });

  test('returns the public projection for a terminal task', async ({ assert, client }) => {
    const user = await createUser('paraformer-terminal-task');
    const video = await createVideo(user.id);
    const task = await ParaformerTask.create({
      userId: user.id,
      videoId: video.id,
      taskId: 'failed-task',
      status: PARAFORMER_TASK_STATUS.FAILED,
      result: null,
      reason: 'decode failed',
    });

    const response = await client.get(`/api/v1/paraformer/task/check/${video.id}`).loginAs(user);

    response.assertStatus(200);
    const body = response.body();
    assert.equal(body.data.id, task.id);
    assert.equal(body.data.videoId, video.id);
    assert.equal(body.data.taskId, 'failed-task');
    assert.equal(body.data.status, PARAFORMER_TASK_STATUS.FAILED);
    assert.equal(body.data.reason, 'decode failed');
    assert.notProperty(body.data, 'userId');
  });

  test('rejects creating a task for another user video before remote submission', async ({ assert, client }) => {
    const owner = await createUser('paraformer-video-owner');
    const viewer = await createUser('paraformer-video-viewer');
    const video = await createVideo(owner.id);

    const response = await client.post(`/api/v1/paraformer/transcription/${video.id}`).loginAs(viewer);

    response.assertStatus(400);
    assert.deepEqual(response.body(), { code: 40000, message: '视频不存在', data: null });
  });

  test('rejects a duplicate task before remote submission', async ({ assert, client }) => {
    const user = await createUser('paraformer-duplicate-task');
    const video = await createVideo(user.id);
    await ParaformerTask.create({
      userId: user.id,
      videoId: video.id,
      taskId: 'existing-task',
      status: PARAFORMER_TASK_STATUS.PENDING,
      result: null,
      reason: null,
    });

    const response = await client.post(`/api/v1/paraformer/transcription/${video.id}`).loginAs(user);

    response.assertStatus(400);
    assert.deepEqual(response.body(), { code: 40000, message: '任务已存在', data: null });
  });

  test('enforces retry status without submitting remotely', async ({ client }) => {
    const user = await createUser('paraformer-retry-gate');
    const video = await createVideo(user.id);
    await ParaformerTask.create({
      userId: user.id,
      videoId: video.id,
      taskId: 'running-task',
      status: PARAFORMER_TASK_STATUS.RUNNING,
      result: null,
      reason: null,
    });

    const response = await client.post(`/api/v1/paraformer/transcription/retry/${video.id}`).loginAs(user);

    response.assertStatus(400);
    response.assertBodyContains({ message: '当前任务的状态不支持重试' });
  });
});
