import { inject } from '@adonisjs/core';

import BusinessException from '#exceptions/business-exception';
import VideoWorkspace from '#models/video-workspace';
import WanxiangVideoTask from '#models/wanxiang-video-task';
import { type WanxiangVideoInput, type WanxiangVideoModel, type WanxiangVideoParameters, WanxiangVideoService } from '#services/wanxiang-video-service';
import { EMPTY_VIDEO_WORKSPACE_CANVAS, parseVideoWorkspaceCanvas } from '#transformers/video-workspace-transformer';

export type SaveVideoWorkspaceCanvasPayload = {
  /** 画布数据格式版本（前端维护）；随画布一并持久化，载入时据此跳过已完成的迁移 */
  version?: number;
  nodes: unknown[];
  edges: unknown[];
  viewport: unknown;
};

export type GenerateVideoWorkspaceNodePayload = {
  model?: WanxiangVideoModel;
  input: WanxiangVideoInput;
  parameters?: WanxiangVideoParameters;
};

/**
 * 视频创作空间服务。
 *
 * 画布以 JSON 文档（nodes/edges/viewport）存储于 `video_workspaces.canvas`，
 * 采用 last-write-wins 整包替换策略；生成任务通过 `entity_id = 节点 id` 关联空间，
 * 删除空间时按画布节点 id 级联清理任务记录。
 */
@inject()
export class VideoWorkspaceService {
  constructor(private readonly wanxiangVideoService: WanxiangVideoService) {}

  /** 按更新时间倒序返回当前用户全部空间 */
  async list(params: { userId: string }) {
    const workspaces = await VideoWorkspace.query().where('userId', params.userId).orderBy('updatedAt', 'desc');
    return workspaces;
  }

  /** 以空画布创建空间 */
  async create(params: { userId: string; name: string }) {
    return VideoWorkspace.create({
      userId: params.userId,
      name: params.name,
      canvas: JSON.stringify(EMPTY_VIDEO_WORKSPACE_CANVAS),
    });
  }

  /** 空间详情（属主校验） */
  async show(params: { userId: string; id: string }) {
    return this.getOwnedWorkspace(params);
  }

  /** 重命名（属主校验） */
  async rename(params: { userId: string; id: string; name: string }) {
    const workspace = await this.getOwnedWorkspace(params);
    await workspace.merge({ name: params.name }).save();
    return workspace;
  }

  /** 保存画布：校验 nodes/edges 为数组、viewport 可为 null，整包替换存储 */
  async saveCanvas(params: { userId: string; id: string; canvas: SaveVideoWorkspaceCanvasPayload }) {
    if (!Array.isArray(params.canvas.nodes) || !Array.isArray(params.canvas.edges)) {
      throw new BusinessException('画布数据格式无效');
    }
    const workspace = await this.getOwnedWorkspace(params);
    await workspace
      .merge({
        canvas: JSON.stringify({
          // 版本字段缺失的历史数据不补写，交由前端迁移后回写；存量画布随后续保存自动带上版本
          ...(params.canvas.version !== undefined ? { version: params.canvas.version } : {}),
          nodes: params.canvas.nodes,
          edges: params.canvas.edges,
          viewport: params.canvas.viewport ?? null,
        }),
      })
      .save();
    return workspace;
  }

  /** 删除空间，并级联删除该空间画布中所有节点 id 关联的生成任务记录 */
  async remove(params: { userId: string; id: string }) {
    const workspace = await this.getOwnedWorkspace(params);
    const nodeIds = this.getCanvasNodeIds(workspace.canvas);
    if (nodeIds.length > 0) {
      await WanxiangVideoTask.query().where('userId', params.userId).whereIn('entityId', nodeIds).delete();
    }
    await workspace.delete();
  }

  /** 生成：加载空间（属主校验）→ 校验节点存在 → 委托万相服务创建任务（按节点并发） */
  async generate(params: { userId: string; workspaceId: string; nodeId: string; payload: GenerateVideoWorkspaceNodePayload }) {
    const workspace = await this.getOwnedWorkspace({ userId: params.userId, id: params.workspaceId });
    const nodeIds = this.getCanvasNodeIds(workspace.canvas);
    if (!nodeIds.includes(params.nodeId)) throw new BusinessException('生成节点不存在于当前画布');

    return this.wanxiangVideoService.create({
      userId: params.userId,
      entityId: params.nodeId,
      model: params.payload.model,
      input: params.payload.input,
      parameters: params.payload.parameters,
    });
  }

  /** 任务详情：校验任务属主且 entity_id 属于该空间画布的节点 id */
  async showTask(params: { userId: string; workspaceId: string; taskId: string }) {
    const workspace = await this.getOwnedWorkspace({ userId: params.userId, id: params.workspaceId });
    await this.assertTaskBelongsToWorkspace({ ...params, workspace });
    return this.wanxiangVideoService.getByTaskId({ taskId: params.taskId, userId: params.userId });
  }

  /** 轮询任务状态：属主与空间校验后委托万相服务 */
  async checkTask(params: { userId: string; workspaceId: string; taskId: string }) {
    const workspace = await this.getOwnedWorkspace({ userId: params.userId, id: params.workspaceId });
    await this.assertTaskBelongsToWorkspace({ ...params, workspace });
    return this.wanxiangVideoService.checkTask({ taskId: params.taskId, userId: params.userId });
  }

  /** 放弃任务：属主与空间校验后委托万相服务 */
  async abandonTask(params: { userId: string; workspaceId: string; taskId: string }) {
    const workspace = await this.getOwnedWorkspace({ userId: params.userId, id: params.workspaceId });
    await this.assertTaskBelongsToWorkspace({ ...params, workspace });
    return this.wanxiangVideoService.abandon({ taskId: params.taskId, userId: params.userId });
  }

  /** 按空间节点 id 集合分页查询任务 */
  async listTasks(params: { userId: string; workspaceId: string; page?: number; size?: number }) {
    const workspace = await this.getOwnedWorkspace({ userId: params.userId, id: params.workspaceId });
    const nodeIds = this.getCanvasNodeIds(workspace.canvas);
    if (nodeIds.length === 0) {
      return { meta: { total: 0, currentPage: params.page ?? 1 }, list: [] };
    }
    const paginated = await WanxiangVideoTask.query()
      .where('userId', params.userId)
      .whereIn('entityId', nodeIds)
      .orderBy('id', 'desc')
      .paginate(params.page ?? 1, params.size ?? 10);
    return { meta: { total: paginated.total, currentPage: paginated.currentPage }, list: paginated.all() };
  }

  private async getOwnedWorkspace(params: { userId: string; id: string }) {
    const workspace = await VideoWorkspace.query().where('userId', params.userId).where('id', params.id).first();
    if (!workspace) throw new BusinessException('创作空间不存在');
    return workspace;
  }

  private getCanvasNodeIds(canvas: string): string[] {
    const parsed = parseVideoWorkspaceCanvas(canvas);
    return parsed.nodes
      .map((node) => {
        const record = node as { id?: unknown };
        return typeof record?.id === 'string' ? record.id : null;
      })
      .filter((id): id is string => id !== null);
  }

  private async assertTaskBelongsToWorkspace(params: { userId: string; taskId: string; workspace: VideoWorkspace }) {
    const task = await WanxiangVideoTask.query().where('userId', params.userId).where('taskId', params.taskId).first();
    if (!task) throw new BusinessException('任务不存在');
    const nodeIds = this.getCanvasNodeIds(params.workspace.canvas);
    if (task.entityId === null || !nodeIds.includes(task.entityId)) {
      throw new BusinessException('任务不属于该创作空间');
    }
  }
}
