import testUtils from '@adonisjs/core/services/test_utils';
import { test } from '@japa/runner';

import User from '#models/user';
import VideoWorkspace from '#models/video-workspace';
import WanxiangVideoTask from '#models/wanxiang-video-task';
import { WANXIANG_VIDEO_TASK_STATUS } from '#services/wanxiang-video-service';

const EMPTY_CANVAS = JSON.stringify({ nodes: [], edges: [], viewport: null });

type WorkspaceItemBody = {
  id: number;
  name: string;
  canvas: { nodes: unknown[]; edges: unknown[]; viewport: unknown };
  createdAt: string;
  updatedAt: string | null;
};

function bodyOf<T>(response: { body(): unknown }) {
  return (response.body() as unknown as { data: T }).data;
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

test.group('Video workspaces HTTP boundary', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/video-workspaces');

    response.assertStatus(401);
  });

  test('creates a workspace with an empty canvas', async ({ assert, client }) => {
    const user = await createUser('workspace-create');

    const response = await client.post('/api/v1/video-workspaces').loginAs(user).json({ name: '我的创作空间' });

    response.assertStatus(200);
    const data = bodyOf<WorkspaceItemBody>(response);
    assert.equal(data.name, '我的创作空间');
    assert.deepEqual(data.canvas, { nodes: [], edges: [], viewport: null });
    assert.notProperty(data, 'userId');
  });

  test('validates the workspace name', async ({ client }) => {
    const user = await createUser('workspace-bad-name');

    const response = await client.post('/api/v1/video-workspaces').loginAs(user).json({ name: '' });

    response.assertStatus(422);
  });

  test('lists workspaces ordered by update time', async ({ assert, client }) => {
    const user = await createUser('workspace-list');
    const first = await createWorkspace({ userId: user.id, name: '空间一' });
    const second = await createWorkspace({ userId: user.id, name: '空间二' });
    await first.merge({ name: '空间一改' }).save();

    const response = await client.get('/api/v1/video-workspaces').loginAs(user);

    response.assertStatus(200);
    const body = bodyOf<WorkspaceItemBody[]>(response);
    assert.deepEqual(
      body.map((item) => item.id),
      [first.id, second.id],
    );
    // 列表不应返回画布数据（画布由详情接口返回）
    assert.ok(
      body.every((item) => !('canvas' in item)),
      '列表不应返回画布数据',
    );
  });

  test('shows a workspace with its canvas', async ({ assert, client }) => {
    const user = await createUser('workspace-show');
    const workspace = await createWorkspace({
      userId: user.id,
      name: '画布空间',
      canvas: JSON.stringify({
        nodes: [{ id: 'node-1', position: { x: 0, y: 0 }, data: { kind: 'prompt', prompt: '一只猫' } }],
        edges: [],
        viewport: { x: 10, y: 20, zoom: 1.5 },
      }),
    });

    const response = await client.get(`/api/v1/video-workspaces/${workspace.id}`).loginAs(user);

    response.assertStatus(200);
    const data = bodyOf<WorkspaceItemBody>(response);
    assert.equal(data.id, workspace.id);
    assert.equal(data.name, '画布空间');
    assert.deepEqual(data.canvas.nodes, [{ id: 'node-1', position: { x: 0, y: 0 }, data: { kind: 'prompt', prompt: '一只猫' } }]);
    assert.deepEqual(data.canvas.viewport, { x: 10, y: 20, zoom: 1.5 });
  });

  test('renames a workspace', async ({ assert, client }) => {
    const user = await createUser('workspace-rename');
    const workspace = await createWorkspace({ userId: user.id, name: '旧名称' });

    const response = await client.put(`/api/v1/video-workspaces/${workspace.id}`).loginAs(user).json({ name: '新名称' });

    response.assertStatus(200);
    assert.equal(bodyOf<WorkspaceItemBody>(response).name, '新名称');
  });

  test('saves and reloads the canvas', async ({ assert, client }) => {
    const user = await createUser('workspace-canvas');
    const workspace = await createWorkspace({ userId: user.id, name: '画布空间' });
    const canvas = {
      nodes: [{ id: 'node-1', position: { x: 1, y: 2 }, data: { kind: 'prompt', prompt: 'hello' } }],
      edges: [],
      viewport: null,
    };

    const saveResponse = await client.put(`/api/v1/video-workspaces/${workspace.id}/canvas`).loginAs(user).json(canvas);
    saveResponse.assertStatus(200);
    assert.deepEqual(bodyOf<WorkspaceItemBody>(saveResponse).canvas, canvas);

    const showResponse = await client.get(`/api/v1/video-workspaces/${workspace.id}`).loginAs(user);
    assert.deepEqual(bodyOf<WorkspaceItemBody>(showResponse).canvas, canvas);
  });

  test('persists the canvas version so the client skips re-migration on reload', async ({ assert, client }) => {
    const user = await createUser('workspace-canvas-version');
    const workspace = await createWorkspace({ userId: user.id, name: '画布空间' });
    const canvas = {
      version: 4,
      nodes: [{ id: 'node-1', position: { x: 0, y: 0 }, data: { kind: 'generation', parameters: { prompt: 'hello' }, assets: [] } }],
      edges: [],
      viewport: null,
    };

    const saveResponse = await client.put(`/api/v1/video-workspaces/${workspace.id}/canvas`).loginAs(user).json(canvas);
    saveResponse.assertStatus(200);
    assert.deepEqual(bodyOf<WorkspaceItemBody>(saveResponse).canvas, canvas);

    const showResponse = await client.get(`/api/v1/video-workspaces/${workspace.id}`).loginAs(user);
    assert.deepEqual(bodyOf<WorkspaceItemBody>(showResponse).canvas, canvas);
  });

  test('rejects a non-array canvas structure', async ({ client }) => {
    const user = await createUser('workspace-canvas-invalid');
    const workspace = await createWorkspace({ userId: user.id, name: '画布空间' });

    const response = await client.put(`/api/v1/video-workspaces/${workspace.id}/canvas`).loginAs(user).json({ nodes: 'oops', edges: [], viewport: null });

    response.assertStatus(422);
  });

  test('does not expose another user workspace', async ({ assert, client }) => {
    const owner = await createUser('workspace-owner');
    const viewer = await createUser('workspace-viewer');
    const workspace = await createWorkspace({ userId: owner.id, name: '私有空间' });

    const response = await client.get(`/api/v1/video-workspaces/${workspace.id}`).loginAs(viewer);

    response.assertStatus(400);
    assert.deepEqual(response.body(), { code: 40000, message: '创作空间不存在', data: null });
  });

  test('deletes a workspace and cascades its canvas node tasks', async ({ assert, client }) => {
    const user = await createUser('workspace-remove');
    const workspace = await createWorkspace({
      userId: user.id,
      name: '待删除空间',
      canvas: JSON.stringify({
        nodes: [
          { id: 'node-a', position: { x: 0, y: 0 }, data: {} },
          { id: 'node-b', position: { x: 0, y: 0 }, data: {} },
        ],
        edges: [],
        viewport: null,
      }),
    });
    await createTask({ userId: user.id, entityId: 'node-a', taskId: 'task-a', status: WANXIANG_VIDEO_TASK_STATUS.RUNNING });
    await createTask({ userId: user.id, entityId: 'node-b', taskId: 'task-b', status: WANXIANG_VIDEO_TASK_STATUS.SUCCEEDED });
    await createTask({ userId: user.id, entityId: 'other-node', taskId: 'task-c', status: WANXIANG_VIDEO_TASK_STATUS.PENDING });

    const response = await client.delete(`/api/v1/video-workspaces/${workspace.id}`).loginAs(user);

    response.assertStatus(200);
    assert.isNull(await VideoWorkspace.find(workspace.id));
    assert.isNull(await WanxiangVideoTask.findBy('taskId', 'task-a'));
    assert.isNull(await WanxiangVideoTask.findBy('taskId', 'task-b'));
    assert.isNotNull(await WanxiangVideoTask.findBy('taskId', 'task-c'));
  });
});
