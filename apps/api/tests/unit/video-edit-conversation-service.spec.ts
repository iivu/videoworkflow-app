import { randomUUID } from 'node:crypto';

import testUtils from '@adonisjs/core/services/test_utils';
import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import VideoBreakdownTask, { VIDEO_BREAKDOWN_TASK_STATUS } from '#models/video-breakdown-task';
import VideoEditMessage from '#models/video-edit-message';
import WanxiangVideoEditTask from '#models/wanxiang-video-edit-task';
import { type VideoEditAssistantMessagePayload, VideoEditConversationService, type VideoEditProviderService } from '#services/video-edit-conversation-service';
import { WANXIANG_VIDEO_EDIT_TASK_STATUS, type WanxiangVideoEditInput, type WanxiangVideoEditParameters } from '#services/wanxiang-video-edit-service';

const SEGMENTS = [
  { start: '00:00:00.000', end: '00:00:05.000', summary: '', file: 'video-breakdown/breakdown-1/segment-001.mp4' },
  { start: '00:00:05.000', end: '00:00:10.000', summary: '', file: 'video-breakdown/breakdown-1/segment-002.mp4' },
];

const segmentMediaUrl = (index: number) => `https://api.example.com/${SEGMENTS[index].file}`;

function stubTask(overrides: Partial<WanxiangVideoEditTask> = {}): WanxiangVideoEditTask {
  return {
    id: 1,
    taskId: 'edit-task-1',
    entityId: 'breakdown-1',
    status: WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING,
    videoUrl: null,
    reason: null,
    ...overrides,
  } as unknown as WanxiangVideoEditTask;
}

class StubVideoEditProvider implements VideoEditProviderService {
  readonly provider = 'stub';

  readonly createCalls: Array<{ userId: string; entityId: string; input: WanxiangVideoEditInput; parameters?: WanxiangVideoEditParameters }> = [];
  readonly checkCalls: Array<{ taskId: string; userId: string }> = [];
  readonly abandonCalls: Array<{ taskId: string; userId: string }> = [];

  constructor(private readonly responses: { create?: WanxiangVideoEditTask; check?: WanxiangVideoEditTask; abandon?: WanxiangVideoEditTask } = {}) {}

  async create(params: { userId: string; entityId: string; input: WanxiangVideoEditInput; parameters?: WanxiangVideoEditParameters }) {
    this.createCalls.push(params);
    return this.responses.create ?? stubTask();
  }

  async checkTask(params: { taskId: string; userId: string }) {
    this.checkCalls.push(params);
    return this.responses.check ?? stubTask();
  }

  async abandon(params: { taskId: string; userId: string }) {
    this.abandonCalls.push(params);
    return this.responses.abandon ?? stubTask({ status: WANXIANG_VIDEO_EDIT_TASK_STATUS.CANCELED, reason: '用户已放弃' });
  }
}

async function caught(promise: Promise<unknown>) {
  return promise.catch((error) => error);
}

function assistantPayload(row: VideoEditMessage): VideoEditAssistantMessagePayload {
  return JSON.parse(row.message) as VideoEditAssistantMessagePayload;
}

async function createBreakdownTask(userId: string, taskId: string, status: string, result: string | null = JSON.stringify(SEGMENTS)) {
  return VideoBreakdownTask.create({ taskId, userId, videoUrl: 'https://cdn.example.com/video.mp4', status, result, reason: null });
}

async function createEditTask(userId: string, entityId: string, taskId: string, status: string) {
  return WanxiangVideoEditTask.create({
    userId,
    entityId,
    taskId,
    status,
    config: JSON.stringify({ model: 'wan2.7-videoedit', media: [{ type: 'video', url: 'https://cdn.example.com/video.mp4' }] }),
    videoUrl: null,
    result: null,
    reason: null,
  });
}

async function createAssistantMessage(userId: string, entityId: string, taskId: string, status: string) {
  return VideoEditMessage.create({
    userId,
    entityId,
    role: 'assistant',
    message: JSON.stringify({
      provider: 'stub',
      task_id: taskId,
      status,
      video_url: null,
      reason: null,
      source: { type: 'segment', segmentIndex: 0 },
    }),
    taskId,
  });
}

test.group('Video edit conversation service', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  test('send creates user and assistant messages and calls the provider with the breakdown entity', async ({ assert }) => {
    const user = 'user-1';
    const breakdown = await createBreakdownTask(user, 'breakdown-1', VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    const provider = new StubVideoEditProvider({ create: stubTask({ taskId: 'edit-task-1', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING }) });
    const service = new VideoEditConversationService(provider);

    const task = await service.send({
      userId: user,
      breakdownTaskId: breakdown.taskId,
      prompt: '将画面转换为黏土风格',
      media: [{ type: 'video', url: segmentMediaUrl(0) }],
    });

    assert.equal(task.taskId, 'edit-task-1');
    assert.lengthOf(provider.createCalls, 1);
    assert.equal(provider.createCalls[0].userId, user);
    assert.equal(provider.createCalls[0].entityId, 'breakdown-1');
    assert.equal(provider.createCalls[0].input.prompt, '将画面转换为黏土风格');

    const messages = await VideoEditMessage.query().where('userId', user).orderBy('id', 'asc');
    assert.lengthOf(messages, 2);
    assert.equal(messages[0].role, 'user');
    assert.equal(messages[0].message, '将画面转换为黏土风格');
    assert.isNull(messages[0].taskId);
    assert.equal(messages[1].role, 'assistant');
    assert.equal(messages[1].taskId, 'edit-task-1');
    assert.deepEqual(assistantPayload(messages[1]), {
      provider: 'stub',
      task_id: 'edit-task-1',
      status: WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING,
      video_url: null,
      reason: null,
      source: { type: 'segment', segmentIndex: 0 },
    });
  });

  test('send rejects a missing breakdown task', async ({ assert }) => {
    const provider = new StubVideoEditProvider();
    const service = new VideoEditConversationService(provider);

    const error = await caught(service.send({ userId: 'user-1', breakdownTaskId: 'missing', prompt: 'p', media: [{ type: 'video', url: segmentMediaUrl(0) }] }));

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '拆解任务不存在');
    assert.lengthOf(provider.createCalls, 0);
  });

  test('send rejects a breakdown task that is not completed', async ({ assert }) => {
    await createBreakdownTask('user-1', 'breakdown-1', VIDEO_BREAKDOWN_TASK_STATUS.PROCESSING);
    const provider = new StubVideoEditProvider();
    const service = new VideoEditConversationService(provider);

    const error = await caught(service.send({ userId: 'user-1', breakdownTaskId: 'breakdown-1', prompt: 'p', media: [{ type: 'video', url: segmentMediaUrl(0) }] }));

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '拆解任务尚未完成');
    assert.lengthOf(provider.createCalls, 0);
  });

  test('send rejects media without exactly one video', async ({ assert }) => {
    await createBreakdownTask('user-1', 'breakdown-1', VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    const provider = new StubVideoEditProvider();
    const service = new VideoEditConversationService(provider);

    const error = await caught(
      service.send({
        userId: 'user-1',
        breakdownTaskId: 'breakdown-1',
        prompt: 'p',
        media: [
          { type: 'video', url: segmentMediaUrl(0) },
          { type: 'video', url: segmentMediaUrl(1) },
        ],
      }),
    );

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '万相视频编辑失败: 待编辑视频有且仅有 1 个');
    assert.lengthOf(provider.createCalls, 0);
  });

  test('send resolves the segment source by URL suffix match', async ({ assert }) => {
    await createBreakdownTask('user-1', 'breakdown-1', VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    const provider = new StubVideoEditProvider();
    const service = new VideoEditConversationService(provider);

    await service.send({ userId: 'user-1', breakdownTaskId: 'breakdown-1', prompt: 'p', media: [{ type: 'video', url: segmentMediaUrl(1) }] });

    const assistant = await VideoEditMessage.query().where('userId', 'user-1').where('role', 'assistant').first();
    assert.isNotNull(assistant);
    assert.deepEqual(assistantPayload(assistant as VideoEditMessage).source, { type: 'segment', segmentIndex: 1 });
  });

  test('send rejects a media URL that matches a succeeded result video', async ({ assert }) => {
    await createBreakdownTask('user-1', 'breakdown-1', VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    await createEditTask('user-1', 'breakdown-1', 'done-task', WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED);
    await WanxiangVideoEditTask.query().where('taskId', 'done-task').update({ videoUrl: 'https://cdn.example.com/result.mp4' });

    const provider = new StubVideoEditProvider();
    const service = new VideoEditConversationService(provider);

    const error = await caught(
      service.send({ userId: 'user-1', breakdownTaskId: 'breakdown-1', prompt: 'p', media: [{ type: 'video', url: 'https://cdn.example.com/result.mp4' }] }),
    );

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '编辑素材无效，请选择有效的视频分片');
    assert.lengthOf(provider.createCalls, 0);
  });

  test('send rejects a media URL that matches no segment', async ({ assert }) => {
    await createBreakdownTask('user-1', 'breakdown-1', VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    const provider = new StubVideoEditProvider();
    const service = new VideoEditConversationService(provider);

    const error = await caught(
      service.send({ userId: 'user-1', breakdownTaskId: 'breakdown-1', prompt: 'p', media: [{ type: 'video', url: 'https://cdn.example.com/unknown.mp4' }] }),
    );

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '编辑素材无效，请选择有效的视频分片');
    assert.lengthOf(provider.createCalls, 0);
  });

  test('check does not write back while the task is still running', async ({ assert }) => {
    await createBreakdownTask('user-1', 'breakdown-1', VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    await createEditTask('user-1', 'breakdown-1', 'edit-task-1', WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING);
    await createAssistantMessage('user-1', 'breakdown-1', 'edit-task-1', WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING);

    const provider = new StubVideoEditProvider({ check: stubTask({ status: WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING }) });
    const service = new VideoEditConversationService(provider);

    const task = await service.check({ userId: 'user-1', breakdownTaskId: 'breakdown-1', editTaskId: 'edit-task-1' });

    assert.equal(task.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING);
    assert.deepEqual(provider.checkCalls, [{ taskId: 'edit-task-1', userId: 'user-1' }]);

    const message = await VideoEditMessage.query().where('userId', 'user-1').where('taskId', 'edit-task-1').first();
    assert.isNotNull(message);
    assert.equal(assistantPayload(message as VideoEditMessage).status, WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING);
    assert.isNull(assistantPayload(message as VideoEditMessage).video_url);
  });

  test('check writes back terminal status while preserving provider, task_id and source', async ({ assert }) => {
    await createBreakdownTask('user-1', 'breakdown-1', VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    await createEditTask('user-1', 'breakdown-1', 'edit-task-1', WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING);
    await createAssistantMessage('user-1', 'breakdown-1', 'edit-task-1', WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING);

    const provider = new StubVideoEditProvider({
      check: stubTask({
        taskId: 'edit-task-1',
        status: WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED,
        videoUrl: 'https://cdn.example.com/out.mp4',
        reason: null,
      }),
    });
    const service = new VideoEditConversationService(provider);

    const task = await service.check({ userId: 'user-1', breakdownTaskId: 'breakdown-1', editTaskId: 'edit-task-1' });

    assert.equal(task.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED);

    const message = await VideoEditMessage.query().where('userId', 'user-1').where('taskId', 'edit-task-1').first();
    assert.isNotNull(message);
    const payload = assistantPayload(message as VideoEditMessage);
    assert.equal(payload.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED);
    assert.equal(payload.video_url, 'https://cdn.example.com/out.mp4');
    assert.isNull(payload.reason);
    assert.equal(payload.provider, 'stub');
    assert.equal(payload.task_id, 'edit-task-1');
    assert.deepEqual(payload.source, { type: 'segment', segmentIndex: 0 });
  });

  test('check writes back the failure reason for failed tasks', async ({ assert }) => {
    await createBreakdownTask('user-1', 'breakdown-1', VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    await createEditTask('user-1', 'breakdown-1', 'edit-task-1', WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING);
    await createAssistantMessage('user-1', 'breakdown-1', 'edit-task-1', WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING);

    const provider = new StubVideoEditProvider({
      check: stubTask({ taskId: 'edit-task-1', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.FAILED, videoUrl: null, reason: 'The size is not match' }),
    });
    const service = new VideoEditConversationService(provider);

    await service.check({ userId: 'user-1', breakdownTaskId: 'breakdown-1', editTaskId: 'edit-task-1' });

    const message = await VideoEditMessage.query().where('userId', 'user-1').where('taskId', 'edit-task-1').first();
    assert.isNotNull(message);
    const payload = assistantPayload(message as VideoEditMessage);
    assert.equal(payload.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.FAILED);
    assert.equal(payload.reason, 'The size is not match');
    assert.isNull(payload.video_url);
  });

  test('check rejects a task that does not belong to the conversation', async ({ assert }) => {
    await createBreakdownTask('user-1', 'breakdown-1', VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    await createEditTask('user-1', 'other-entity', 'edit-task-1', WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING);
    const provider = new StubVideoEditProvider();
    const service = new VideoEditConversationService(provider);

    const error = await caught(service.check({ userId: 'user-1', breakdownTaskId: 'breakdown-1', editTaskId: 'edit-task-1' }));

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '任务不存在');
    assert.lengthOf(provider.checkCalls, 0);
  });

  test('check skips the write back when the message row is missing', async ({ assert }) => {
    await createBreakdownTask('user-1', 'breakdown-1', VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    await createEditTask('user-1', 'breakdown-1', 'edit-task-1', WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING);

    const provider = new StubVideoEditProvider({
      check: stubTask({ taskId: 'edit-task-1', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.SUCCEEDED, videoUrl: 'https://cdn.example.com/out.mp4' }),
    });
    const service = new VideoEditConversationService(provider);

    await service.check({ userId: 'user-1', breakdownTaskId: 'breakdown-1', editTaskId: 'edit-task-1' });

    assert.lengthOf(await VideoEditMessage.all(), 0);
  });

  test('abandon marks the task canceled and writes back the message', async ({ assert }) => {
    await createBreakdownTask('user-1', 'breakdown-1', VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    await createEditTask('user-1', 'breakdown-1', 'edit-task-1', WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING);
    await createAssistantMessage('user-1', 'breakdown-1', 'edit-task-1', WANXIANG_VIDEO_EDIT_TASK_STATUS.PENDING);

    const provider = new StubVideoEditProvider({ abandon: stubTask({ taskId: 'edit-task-1', status: WANXIANG_VIDEO_EDIT_TASK_STATUS.CANCELED, reason: '用户已放弃' }) });
    const service = new VideoEditConversationService(provider);

    const task = await service.abandon({ userId: 'user-1', breakdownTaskId: 'breakdown-1', editTaskId: 'edit-task-1' });

    assert.equal(task.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.CANCELED);
    assert.deepEqual(provider.abandonCalls, [{ taskId: 'edit-task-1', userId: 'user-1' }]);

    const message = await VideoEditMessage.query().where('userId', 'user-1').where('taskId', 'edit-task-1').first();
    assert.isNotNull(message);
    const payload = assistantPayload(message as VideoEditMessage);
    assert.equal(payload.status, WANXIANG_VIDEO_EDIT_TASK_STATUS.CANCELED);
    assert.equal(payload.reason, '用户已放弃');
    assert.isNull(payload.video_url);
    assert.equal(payload.task_id, 'edit-task-1');
  });

  test('abandon rejects a task that does not belong to the conversation', async ({ assert }) => {
    await createBreakdownTask('user-1', 'breakdown-1', VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    await createEditTask('user-1', 'other-entity', 'edit-task-1', WANXIANG_VIDEO_EDIT_TASK_STATUS.RUNNING);
    const provider = new StubVideoEditProvider();
    const service = new VideoEditConversationService(provider);

    const error = await caught(service.abandon({ userId: 'user-1', breakdownTaskId: 'breakdown-1', editTaskId: 'edit-task-1' }));

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '任务不存在');
    assert.lengthOf(provider.abandonCalls, 0);
  });

  test('listMessages isolates users, entities and orders by id desc', async ({ assert }) => {
    await createBreakdownTask('user-1', 'breakdown-1', VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    await createBreakdownTask('user-1', 'breakdown-2', VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    await VideoEditMessage.create({ userId: 'user-1', entityId: 'breakdown-1', role: 'user', message: 'a1', taskId: null });
    await VideoEditMessage.create({ userId: 'user-1', entityId: 'breakdown-1', role: 'user', message: 'a2', taskId: null });
    await VideoEditMessage.create({ userId: 'user-1', entityId: 'breakdown-2', role: 'user', message: 'other entity', taskId: null });
    await VideoEditMessage.create({ userId: 'user-2', entityId: 'breakdown-1', role: 'user', message: 'other user', taskId: null });

    const service = new VideoEditConversationService(new StubVideoEditProvider());

    const result = await service.listMessages({ userId: 'user-1', entityId: 'breakdown-1', page: 1, size: 1 });
    assert.equal(result.meta.total, 2);
    assert.lengthOf(result.list, 1);
    assert.equal(result.list[0].message, 'a2');

    const second = await service.listMessages({ userId: 'user-1', entityId: 'breakdown-1', page: 2, size: 1 });
    assert.equal(second.list[0].message, 'a1');
  });

  test('listMessages returns an empty page for a user without messages', async ({ assert }) => {
    const service = new VideoEditConversationService(new StubVideoEditProvider());

    const result = await service.listMessages({ userId: 'user-9', entityId: randomUUID(), page: 1, size: 20 });
    assert.equal(result.meta.total, 0);
    assert.lengthOf(result.list, 0);
  });
});
