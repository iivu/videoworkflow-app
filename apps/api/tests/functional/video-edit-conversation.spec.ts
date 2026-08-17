import app from '@adonisjs/core/services/app';
import testUtils from '@adonisjs/core/services/test_utils';
import { test } from '@japa/runner';

import User from '#models/user';
import VideoBreakdownTask, { VIDEO_BREAKDOWN_TASK_STATUS } from '#models/video-breakdown-task';
import VideoEditMessage from '#models/video-edit-message';
import WanxiangVideoEditTask from '#models/wanxiang-video-edit-task';
import { createFetchClient, type FetchClient } from '#providers/fetch-provider';
import { WANXIANG_VIDEO_EDIT_TASK_STATUS, type WanxiangVideoEditTaskStatus } from '#services/wanxiang-video-edit-service';

const SEGMENTS = [{ start: '00:00:00.000', end: '00:00:05.000', summary: '', file: 'video-breakdown/breakdown-1/segment-001.mp4' }];
const SEGMENT_MEDIA_URL = `https://api.example.com/${SEGMENTS[0].file}`;

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

async function createBreakdownTask(userId: string) {
  return VideoBreakdownTask.create({
    taskId: 'breakdown-1',
    userId,
    videoUrl: 'https://cdn.example.com/video.mp4',
    status: VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED,
    result: JSON.stringify(SEGMENTS),
    reason: null,
  });
}

async function createEditTask(params: { userId: string; entityId: string; taskId: string; status: WanxiangVideoEditTaskStatus; videoUrl?: string | null }) {
  return WanxiangVideoEditTask.create({
    userId: params.userId,
    entityId: params.entityId,
    taskId: params.taskId,
    status: params.status,
    config: JSON.stringify({ model: 'wan2.7-videoedit', media: [{ type: 'video', url: SEGMENT_MEDIA_URL }] }),
    videoUrl: params.videoUrl ?? null,
    result: null,
    reason: null,
  });
}

async function createAssistantMessage(userId: string, taskId: string) {
  return VideoEditMessage.create({
    userId,
    entityId: 'breakdown-1',
    role: 'assistant',
    message: JSON.stringify({
      provider: 'wanxiang',
      task_id: taskId,
      status: WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING,
      video_url: null,
      reason: null,
      source: { type: 'segment', segmentIndex: 0 },
    }),
    taskId,
  });
}

test.group('Video edit conversation HTTP boundary', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());
  group.each.setup(() => {
    fetchQueue.responses = [];
    app.container.bind('fetch', () => stubFetch());
  });
  group.each.teardown(() => {
    app.container.bind('fetch', () => createFetchClient());
  });

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/video-breakdown/breakdown-1/video-edit/messages');

    response.assertStatus(401);
  });

  test('validates the taskId route parameter', async ({ client }) => {
    const user = await createUser('vedit-invalid-id');

    const response = await client.get(`/api/v1/video-breakdown/${'x'.repeat(37)}/video-edit/messages`).loginAs(user);

    response.assertStatus(422);
  });

  test('validates the check body', async ({ client }) => {
    const user = await createUser('vedit-check-body');

    const response = await client.post('/api/v1/video-breakdown/breakdown-1/video-edit/check').loginAs(user).json({});

    response.assertStatus(422);
  });

  test('send creates user and assistant messages and returns the wanxiang task', async ({ assert, client }) => {
    const user = await createUser('vedit-send');
    await createBreakdownTask(user.id);
    fetchQueue.responses = [{ output: { task_id: 'edit-task-1', task_status: 'PENDING' }, request_id: 'req-1' }];

    const response = await client
      .post('/api/v1/video-breakdown/breakdown-1/video-edit/messages')
      .loginAs(user)
      .json({ prompt: '将画面转换为黏土风格', media: [{ type: 'video', url: SEGMENT_MEDIA_URL }] });

    response.assertStatus(200);
    const data = response.body().data;
    assert.equal(data.taskId, 'edit-task-1');
    assert.equal(data.entityId, 'breakdown-1');
    assert.equal(data.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING);
    assert.isNull(data.videoUrl);
    assert.notProperty(data, 'userId');

    const messages = await VideoEditMessage.query().where('userId', user.id).orderBy('id', 'asc');
    assert.lengthOf(messages, 2);
    assert.equal(messages[0].role, 'user');
    assert.equal(messages[0].message, '将画面转换为黏土风格');
    assert.isNull(messages[0].taskId);
    assert.equal(messages[1].role, 'assistant');
    assert.equal(messages[1].taskId, 'edit-task-1');
    const payload = JSON.parse(messages[1].message);
    assert.deepEqual(payload, {
      provider: 'wanxiang',
      task_id: 'edit-task-1',
      status: WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING,
      video_url: null,
      reason: null,
      source: { type: 'segment', segmentIndex: 0 },
    });
  });

  test('send rejects a media URL that matches no segment', async ({ assert, client }) => {
    const user = await createUser('vedit-send-bad-media');
    await createBreakdownTask(user.id);

    const response = await client
      .post('/api/v1/video-breakdown/breakdown-1/video-edit/messages')
      .loginAs(user)
      .json({ prompt: 'p', media: [{ type: 'video', url: 'https://cdn.example.com/unknown.mp4' }] });

    response.assertStatus(400);
    assert.deepEqual(response.body(), { code: 40000, message: '编辑素材无效，请选择有效的视频分片', data: null });
    assert.lengthOf(await VideoEditMessage.all(), 0);
    assert.lengthOf(fetchQueue.responses, 0);
  });

  test('send rejects when the breakdown task is not completed', async ({ client }) => {
    const user = await createUser('vedit-send-not-completed');
    await VideoBreakdownTask.create({
      taskId: 'breakdown-1',
      userId: user.id,
      videoUrl: 'https://cdn.example.com/video.mp4',
      status: VIDEO_BREAKDOWN_TASK_STATUS.PROCESSING,
      result: null,
      reason: null,
    });

    const response = await client
      .post('/api/v1/video-breakdown/breakdown-1/video-edit/messages')
      .loginAs(user)
      .json({ prompt: 'p', media: [{ type: 'video', url: SEGMENT_MEDIA_URL }] });

    response.assertStatus(400);
    response.assertBodyContains({ message: '拆解任务尚未完成' });
  });

  test('send is rejected by the occupancy guard when an active task exists', async ({ assert, client }) => {
    const user = await createUser('vedit-occupied');
    await createBreakdownTask(user.id);
    await createEditTask({ userId: user.id, entityId: 'breakdown-1', taskId: 'active-task', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING });

    const response = await client
      .post('/api/v1/video-breakdown/breakdown-1/video-edit/messages')
      .loginAs(user)
      .json({ prompt: 'p', media: [{ type: 'video', url: SEGMENT_MEDIA_URL }] });

    response.assertStatus(400);
    assert.deepEqual(response.body(), { code: 40000, message: '当前已有视频编辑任务进行中，请等待其完成后再试', data: null });
    assert.lengthOf(fetchQueue.responses, 0);
  });

  test('check syncs the remote status and writes back the assistant message', async ({ assert, client }) => {
    const user = await createUser('vedit-check');
    await createBreakdownTask(user.id);
    await createEditTask({ userId: user.id, entityId: 'breakdown-1', taskId: 'edit-task-1', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING });
    await createAssistantMessage(user.id, 'edit-task-1');
    fetchQueue.responses = [
      {
        output: { task_id: 'edit-task-1', task_status: 'SUCCEEDED', video_url: 'https://cdn.example.com/out.mp4' },
        usage: { duration: 5.0 },
      },
    ];

    const response = await client.post('/api/v1/video-breakdown/breakdown-1/video-edit/check').loginAs(user).json({ taskId: 'edit-task-1' });

    response.assertStatus(200);
    const data = response.body().data;
    assert.equal(data.taskId, 'edit-task-1');
    assert.equal(data.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED);
    assert.equal(data.videoUrl, 'https://cdn.example.com/out.mp4');

    const task = await WanxiangVideoEditTask.query().where('taskId', 'edit-task-1').first();
    assert.equal(task?.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED);
    assert.equal(task?.videoUrl, 'https://cdn.example.com/out.mp4');

    const message = await VideoEditMessage.query().where('userId', user.id).where('taskId', 'edit-task-1').first();
    assert.isNotNull(message);
    const payload = JSON.parse((message as VideoEditMessage).message);
    assert.equal(payload.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED);
    assert.equal(payload.video_url, 'https://cdn.example.com/out.mp4');
    assert.isNull(payload.reason);
    assert.equal(payload.provider, 'wanxiang');
    assert.equal(payload.task_id, 'edit-task-1');
    assert.deepEqual(payload.source, { type: 'segment', segmentIndex: 0 });
  });

  test('check rejects a task that does not belong to the conversation', async ({ assert, client }) => {
    const user = await createUser('vedit-check-foreign');
    await createBreakdownTask(user.id);
    await createEditTask({ userId: user.id, entityId: 'other-entity', taskId: 'edit-task-1', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING });

    const response = await client.post('/api/v1/video-breakdown/breakdown-1/video-edit/check').loginAs(user).json({ taskId: 'edit-task-1' });

    response.assertStatus(400);
    assert.deepEqual(response.body(), { code: 40000, message: '任务不存在', data: null });
    assert.lengthOf(fetchQueue.responses, 0);
  });

  test('abandon marks the task canceled and writes back the message', async ({ assert, client }) => {
    const user = await createUser('vedit-abandon');
    await createBreakdownTask(user.id);
    await createEditTask({ userId: user.id, entityId: 'breakdown-1', taskId: 'edit-task-1', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING });
    await createAssistantMessage(user.id, 'edit-task-1');

    const response = await client.post('/api/v1/video-breakdown/breakdown-1/video-edit/abandon').loginAs(user).json({ taskId: 'edit-task-1' });

    response.assertStatus(200);
    assert.equal(response.body().data.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.CANCELED);
    assert.equal(response.body().data.reason, '用户已放弃');

    const task = await WanxiangVideoEditTask.query().where('taskId', 'edit-task-1').first();
    assert.equal(task?.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.CANCELED);

    const message = await VideoEditMessage.query().where('userId', user.id).where('taskId', 'edit-task-1').first();
    assert.isNotNull(message);
    const payload = JSON.parse((message as VideoEditMessage).message);
    assert.equal(payload.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.CANCELED);
    assert.equal(payload.reason, '用户已放弃');
    assert.isNull(payload.video_url);
  });

  test('lists messages with user isolation and pagination', async ({ assert, client }) => {
    const owner = await createUser('vedit-list-owner');
    const other = await createUser('vedit-list-other');
    await VideoEditMessage.create({ userId: owner.id, entityId: 'breakdown-1', role: 'user', message: 'msg-1', taskId: null });
    await VideoEditMessage.create({ userId: owner.id, entityId: 'breakdown-1', role: 'user', message: 'msg-2', taskId: null });
    await VideoEditMessage.create({ userId: other.id, entityId: 'breakdown-1', role: 'user', message: 'private', taskId: null });

    const response = await client.get('/api/v1/video-breakdown/breakdown-1/video-edit/messages?page=1&size=1').loginAs(owner);

    response.assertStatus(200);
    const body = response.body();
    assert.equal(body.data.meta.total, 2);
    assert.lengthOf(body.data.list, 1);
    assert.equal(body.data.list[0].message, 'msg-2');
    assert.notProperty(body.data.list[0], 'userId');
  });
});
