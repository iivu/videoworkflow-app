import { randomUUID } from 'node:crypto';

import app from '@adonisjs/core/services/app';
import testUtils from '@adonisjs/core/services/test_utils';
import { test } from '@japa/runner';
import User from '#models/user';
import VideoBreakdownTask, { VIDEO_BREAKDOWN_TASK_STATUS } from '#models/video-breakdown-task';
import { PromptService } from '#services/prompt-service';
import { type VideoBreakdownJobPayload, VideoBreakdownService } from '#services/video-breakdown-service';

class StubVideoBreakdownService extends VideoBreakdownService {
  constructor() {
    super(new PromptService());
  }

  readonly dispatched: VideoBreakdownJobPayload[] = [];
  private shouldFailDispatch = false;

  failDispatch() {
    this.shouldFailDispatch = true;
    return this;
  }

  protected override async dispatchJob(payload: VideoBreakdownJobPayload) {
    if (this.shouldFailDispatch) throw new Error('queue unavailable');
    this.dispatched.push(payload);
  }
}

async function createUser(username: string) {
  return User.create({ username, password: 'test-password' });
}

test.group('Video breakdown HTTP boundary', (group) => {
  let stub: StubVideoBreakdownService;

  group.each.setup(() => testUtils.db().withGlobalTransaction());
  group.each.setup(() => {
    stub = new StubVideoBreakdownService();
    app.container.swap(VideoBreakdownService, () => stub);
  });
  group.each.teardown(() => {
    app.container.restore(VideoBreakdownService);
  });

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/videos/breakdown/tasks');
    response.assertStatus(401);
  });

  test('rejects non-HTTPS video URLs', async ({ client }) => {
    const user = await createUser('vb-invalid-url');
    const response = await client.post('/api/v1/videos/breakdown/tasks').loginAs(user).json({ videoUrl: 'http://cdn.example.com/video.mp4' });
    response.assertStatus(422);
  });

  test('creates a pending task and dispatches the job with the default model', async ({ assert, client }) => {
    const user = await createUser('vb-create');
    const response = await client.post('/api/v1/videos/breakdown/tasks').loginAs(user).json({ videoUrl: 'https://cdn.example.com/video.mp4' });

    response.assertStatus(200);
    const data = (response.body() as { data: { taskId: string; videoUrl: string; status: string } }).data;
    assert.equal(data.status, VIDEO_BREAKDOWN_TASK_STATUS.PENDING);
    assert.equal(data.videoUrl, 'https://cdn.example.com/video.mp4');
    assert.isString(data.taskId);
    assert.match(data.taskId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    assert.notProperty(data, 'userId');

    assert.lengthOf(stub.dispatched, 1);
    assert.deepEqual(stub.dispatched[0], {
      taskId: data.taskId,
      videoUrl: 'https://cdn.example.com/video.mp4',
      userId: user.id,
      model: 'qwen-vl-max',
    });
  });

  test('dispatches the job with a custom model when provided', async ({ assert, client }) => {
    const user = await createUser('vb-custom-model');
    await client.post('/api/v1/videos/breakdown/tasks').loginAs(user).json({ videoUrl: 'https://cdn.example.com/video.mp4', model: 'qwen-vl-plus' });

    assert.equal(stub.dispatched[0].model, 'qwen-vl-plus');
  });

  test('marks the task as failed when enqueue fails', async ({ assert, client }) => {
    const user = await createUser('vb-enqueue-failed');
    stub.failDispatch();

    const response = await client.post('/api/v1/videos/breakdown/tasks').loginAs(user).json({ videoUrl: 'https://cdn.example.com/video.mp4' });

    response.assertStatus(400);
    response.assertBodyContains({ message: '视频拆解任务入队失败' });

    const task = await VideoBreakdownTask.query().where('userId', user.id).orderBy('id', 'desc').first();
    assert.equal(task?.status, VIDEO_BREAKDOWN_TASK_STATUS.FAILED);
    assert.equal(task?.reason, 'queue unavailable');
  });

  test('lists only the current user tasks with pagination and status filter', async ({ assert, client }) => {
    const owner = await createUser('vb-list-owner');
    const other = await createUser('vb-list-other');
    await VideoBreakdownTask.create({
      taskId: randomUUID(),
      userId: owner.id,
      videoUrl: 'https://cdn.example.com/a.mp4',
      status: VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED,
      result: '[]',
      reason: null,
    });
    await VideoBreakdownTask.create({
      taskId: randomUUID(),
      userId: owner.id,
      videoUrl: 'https://cdn.example.com/b.mp4',
      status: VIDEO_BREAKDOWN_TASK_STATUS.PENDING,
      result: null,
      reason: null,
    });
    await VideoBreakdownTask.create({
      taskId: randomUUID(),
      userId: other.id,
      videoUrl: 'https://cdn.example.com/c.mp4',
      status: VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED,
      result: '[]',
      reason: null,
    });

    const response = await client.get('/api/v1/videos/breakdown/tasks').loginAs(owner).qs({ size: 1, status: VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED });
    response.assertStatus(200);

    const body = response.body() as {
      data: { meta: { total: number; currentPage: number }; list: Array<{ taskId: string; videoUrl: string; status: string }> };
    };
    assert.equal(body.data.meta.total, 1);
    assert.lengthOf(body.data.list, 1);
    assert.equal(body.data.list[0].videoUrl, 'https://cdn.example.com/a.mp4');
    assert.notProperty(body.data.list[0], 'userId');
  });

  test('shows a task to its owner and hides other user tasks', async ({ assert, client }) => {
    const owner = await createUser('vb-show-owner');
    const viewer = await createUser('vb-show-viewer');
    const task = await VideoBreakdownTask.create({
      taskId: randomUUID(),
      userId: owner.id,
      videoUrl: 'https://cdn.example.com/a.mp4',
      status: VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED,
      result: JSON.stringify([{ start: 0, end: 10, summary: '开场', file: 'video-breakdown/1/segment-001.mp4' }]),
      reason: null,
    });

    const ownResponse = await client.get(`/api/v1/videos/breakdown/tasks/${task.taskId}`).loginAs(owner);
    ownResponse.assertStatus(200);
    assert.equal(ownResponse.body().data.taskId, task.taskId);
    assert.equal(ownResponse.body().data.status, VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    assert.notProperty(ownResponse.body().data, 'userId');

    const otherResponse = await client.get(`/api/v1/videos/breakdown/tasks/${task.taskId}`).loginAs(viewer);
    otherResponse.assertStatus(400);
    assert.deepEqual(otherResponse.body(), { code: 40000, message: '任务不存在', data: null });
  });
});
