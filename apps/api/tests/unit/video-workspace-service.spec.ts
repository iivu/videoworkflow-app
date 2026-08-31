import testUtils from '@adonisjs/core/services/test_utils';
import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import User from '#models/user';
import VideoWorkspace from '#models/video-workspace';
import WanxiangVideoTask from '#models/wanxiang-video-task';
import { VideoWorkspaceService } from '#services/video-workspace-service';
import { WANXIANG_VIDEO_TASK_STATUS } from '#services/wanxiang-video-service';
import { EMPTY_VIDEO_WORKSPACE_CANVAS, parseVideoWorkspaceCanvas } from '#transformers/video-workspace-transformer';

type FakeWanxiangVideoService = {
  calls: unknown[];
  create(params: unknown): Promise<unknown>;
};

function createFakeWanxiangService(): FakeWanxiangVideoService {
  const calls: unknown[] = [];
  return {
    calls,
    create: async (params: unknown) => {
      calls.push(params);
      return { taskId: 'task-1', status: WANXIANG_VIDEO_TASK_STATUS.PENDING };
    },
  };
}

async function createUser(username: string) {
  return User.create({ username, password: 'test-password' });
}

async function createTask(params: { userId: string; entityId: string; taskId: string; status: string }) {
  return WanxiangVideoTask.create({
    userId: params.userId,
    entityId: params.entityId,
    taskId: params.taskId,
    status: params.status,
    config: JSON.stringify({ model: 'wan3.0-video', prompt: '测试' }),
    videoUrl: null,
    result: null,
    reason: null,
  });
}

test.group('Video workspace service', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  test('creates a workspace with an empty canvas', async ({ assert }) => {
    const user = await createUser('workspace-create');
    const service = new VideoWorkspaceService(createFakeWanxiangService() as never);

    const workspace = await service.create({ userId: user.id, name: '我的创作空间' });

    assert.equal(workspace.userId, user.id);
    assert.equal(workspace.name, '我的创作空间');
    assert.deepEqual(parseVideoWorkspaceCanvas(workspace.canvas), EMPTY_VIDEO_WORKSPACE_CANVAS);
  });

  test('lists workspaces ordered by updated_at descending', async ({ assert }) => {
    const user = await createUser('workspace-list');
    const service = new VideoWorkspaceService(createFakeWanxiangService() as never);
    const first = await service.create({ userId: user.id, name: '空间一' });
    const second = await service.create({ userId: user.id, name: '空间二' });

    await first.merge({ name: '空间一改' }).save();

    const list = await service.list({ userId: user.id });

    assert.deepEqual(
      list.map((item) => item.id),
      [first.id, second.id],
    );
  });

  test('isolates workspaces between users', async ({ assert }) => {
    const owner = await createUser('workspace-owner');
    const viewer = await createUser('workspace-viewer');
    const service = new VideoWorkspaceService(createFakeWanxiangService() as never);
    await service.create({ userId: owner.id, name: '私有空间' });

    const list = await service.list({ userId: viewer.id });

    assert.lengthOf(list, 0);
  });

  test('rejects access to another user workspace', async ({ assert }) => {
    const owner = await createUser('workspace-owner-2');
    const viewer = await createUser('workspace-viewer-2');
    const service = new VideoWorkspaceService(createFakeWanxiangService() as never);
    const workspace = await service.create({ userId: owner.id, name: '私有空间' });

    const error = await service.show({ userId: viewer.id, id: String(workspace.id) }).catch((e) => e);

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '创作空间不存在');
  });

  test('renames a workspace', async ({ assert }) => {
    const user = await createUser('workspace-rename');
    const service = new VideoWorkspaceService(createFakeWanxiangService() as never);
    const workspace = await service.create({ userId: user.id, name: '旧名称' });

    const renamed = await service.rename({ userId: user.id, id: String(workspace.id), name: '新名称' });

    assert.equal(renamed.name, '新名称');
  });

  test('round-trips the canvas JSON through save and show', async ({ assert }) => {
    const user = await createUser('workspace-canvas');
    const service = new VideoWorkspaceService(createFakeWanxiangService() as never);
    const workspace = await service.create({ userId: user.id, name: '画布空间' });
    const canvas = {
      nodes: [{ id: 'node-1', position: { x: 1, y: 2 }, data: { kind: 'prompt', prompt: '一只猫' } }],
      edges: [],
      viewport: { x: 10, y: 20, zoom: 1.5 },
    };

    await service.saveCanvas({ userId: user.id, id: String(workspace.id), canvas });
    const loaded = await service.show({ userId: user.id, id: String(workspace.id) });

    assert.deepEqual(parseVideoWorkspaceCanvas(loaded.canvas), canvas);
  });

  test('persists the canvas version through save and show', async ({ assert }) => {
    const user = await createUser('workspace-canvas-version');
    const service = new VideoWorkspaceService(createFakeWanxiangService() as never);
    const workspace = await service.create({ userId: user.id, name: '画布空间' });
    const canvas = {
      version: 4,
      nodes: [{ id: 'node-1', position: { x: 0, y: 0 }, data: { kind: 'generation', parameters: { prompt: '一只猫' }, assets: [] } }],
      edges: [],
      viewport: null,
    };

    await service.saveCanvas({ userId: user.id, id: String(workspace.id), canvas });
    const loaded = await service.show({ userId: user.id, id: String(workspace.id) });

    assert.deepEqual(parseVideoWorkspaceCanvas(loaded.canvas), canvas);
  });

  test('accepts a null viewport when saving the canvas', async ({ assert }) => {
    const user = await createUser('workspace-canvas-null-viewport');
    const service = new VideoWorkspaceService(createFakeWanxiangService() as never);
    const workspace = await service.create({ userId: user.id, name: '画布空间' });

    await service.saveCanvas({ userId: user.id, id: String(workspace.id), canvas: { nodes: [], edges: [], viewport: null } });
    const loaded = await service.show({ userId: user.id, id: String(workspace.id) });

    assert.isNull(parseVideoWorkspaceCanvas(loaded.canvas).viewport);
  });

  test('rejects an invalid canvas structure', async ({ assert }) => {
    const user = await createUser('workspace-canvas-invalid');
    const service = new VideoWorkspaceService(createFakeWanxiangService() as never);
    const workspace = await service.create({ userId: user.id, name: '画布空间' });

    const error = await service.saveCanvas({ userId: user.id, id: String(workspace.id), canvas: { nodes: 'oops' as never, edges: [], viewport: null } }).catch((e) => e);

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '画布数据格式无效');
  });

  test('deletes the workspace and cascades tasks of its canvas nodes', async ({ assert }) => {
    const user = await createUser('workspace-remove');
    const service = new VideoWorkspaceService(createFakeWanxiangService() as never);
    const workspace = await service.create({ userId: user.id, name: '待删除空间' });
    await service.saveCanvas({
      userId: user.id,
      id: String(workspace.id),
      canvas: {
        nodes: [
          { id: 'node-a', position: { x: 0, y: 0 }, data: {} },
          { id: 'node-b', position: { x: 0, y: 0 }, data: {} },
        ],
        edges: [],
        viewport: null,
      },
    });
    await createTask({ userId: user.id, entityId: 'node-a', taskId: 'task-a', status: WANXIANG_VIDEO_TASK_STATUS.RUNNING });
    await createTask({ userId: user.id, entityId: 'node-b', taskId: 'task-b', status: WANXIANG_VIDEO_TASK_STATUS.SUCCEEDED });
    // 不属于该空间画布节点的任务应保留
    await createTask({ userId: user.id, entityId: 'other-node', taskId: 'task-c', status: WANXIANG_VIDEO_TASK_STATUS.PENDING });

    await service.remove({ userId: user.id, id: String(workspace.id) });

    assert.isNull(await VideoWorkspace.find(workspace.id));
    assert.isNull(await WanxiangVideoTask.findBy('taskId', 'task-a'));
    assert.isNull(await WanxiangVideoTask.findBy('taskId', 'task-b'));
    assert.isNotNull(await WanxiangVideoTask.findBy('taskId', 'task-c'));
  });

  test('delegates generate to the wanxiang service with the node id as entity', async ({ assert }) => {
    const user = await createUser('workspace-generate');
    const wanxiang = createFakeWanxiangService();
    const service = new VideoWorkspaceService(wanxiang as never);
    const workspace = await service.create({ userId: user.id, name: '生成空间' });
    await service.saveCanvas({
      userId: user.id,
      id: String(workspace.id),
      canvas: { nodes: [{ id: 'node-1', position: { x: 0, y: 0 }, data: {} }], edges: [], viewport: null },
    });

    await service.generate({
      userId: user.id,
      workspaceId: String(workspace.id),
      nodeId: 'node-1',
      payload: { input: { prompt: '一只猫' } },
    });

    assert.deepEqual(wanxiang.calls, [
      {
        userId: user.id,
        entityId: 'node-1',
        model: undefined,
        input: { prompt: '一只猫' },
        parameters: undefined,
      },
    ]);
  });

  test('rejects generate when the node is not on the canvas', async ({ assert }) => {
    const user = await createUser('workspace-generate-missing-node');
    const service = new VideoWorkspaceService(createFakeWanxiangService() as never);
    const workspace = await service.create({ userId: user.id, name: '生成空间' });

    const error = await service.generate({ userId: user.id, workspaceId: String(workspace.id), nodeId: 'ghost-node', payload: { input: { prompt: '一只猫' } } }).catch((e) => e);

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, '生成节点不存在于当前画布');
  });

  test('lists tasks only for canvas node ids of the workspace', async ({ assert }) => {
    const user = await createUser('workspace-list-tasks');
    const service = new VideoWorkspaceService(createFakeWanxiangService() as never);
    const workspace = await service.create({ userId: user.id, name: '任务空间' });
    await service.saveCanvas({
      userId: user.id,
      id: String(workspace.id),
      canvas: { nodes: [{ id: 'node-a', position: { x: 0, y: 0 }, data: {} }], edges: [], viewport: null },
    });
    await createTask({ userId: user.id, entityId: 'node-a', taskId: 'task-a', status: WANXIANG_VIDEO_TASK_STATUS.PENDING });
    await createTask({ userId: user.id, entityId: 'outside-node', taskId: 'task-b', status: WANXIANG_VIDEO_TASK_STATUS.RUNNING });

    const result = await service.listTasks({ userId: user.id, workspaceId: String(workspace.id) });

    assert.equal(result.meta.total, 1);
    assert.equal(result.list[0].taskId, 'task-a');
  });

  test('rejects task access for missing tasks, other users, and other nodes', async ({ assert }) => {
    const owner = await createUser('workspace-task-owner');
    const viewer = await createUser('workspace-task-viewer');
    const service = new VideoWorkspaceService(createFakeWanxiangService() as never);
    const workspace = await service.create({ userId: owner.id, name: '任务空间' });
    await service.saveCanvas({
      userId: owner.id,
      id: String(workspace.id),
      canvas: { nodes: [{ id: 'node-a', position: { x: 0, y: 0 }, data: {} }], edges: [], viewport: null },
    });
    await createTask({ userId: owner.id, entityId: 'node-a', taskId: 'task-a', status: WANXIANG_VIDEO_TASK_STATUS.RUNNING });
    await createTask({ userId: owner.id, entityId: 'outside-node', taskId: 'task-outside', status: WANXIANG_VIDEO_TASK_STATUS.PENDING });

    const missingError = await service.showTask({ userId: owner.id, workspaceId: String(workspace.id), taskId: 'ghost-task' }).catch((e) => e);
    assert.instanceOf(missingError, BusinessException);
    assert.equal((missingError as Error).message, '任务不存在');

    // 其他用户访问：空间属主校验先行
    const foreignError = await service.showTask({ userId: viewer.id, workspaceId: String(workspace.id), taskId: 'task-a' }).catch((e) => e);
    assert.instanceOf(foreignError, BusinessException);
    assert.equal((foreignError as Error).message, '创作空间不存在');

    // 任务存在但不属于该空间画布节点
    const otherNodeError = await service.showTask({ userId: owner.id, workspaceId: String(workspace.id), taskId: 'task-outside' }).catch((e) => e);
    assert.instanceOf(otherNodeError, BusinessException);
    assert.equal((otherNodeError as Error).message, '任务不属于该创作空间');
  });
});
