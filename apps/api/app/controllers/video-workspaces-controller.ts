import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';

import { VideoWorkspaceService } from '#services/video-workspace-service';
import VideoWorkspaceTransformer from '#transformers/video-workspace-transformer';
import WanxiangVideoTaskTransformer from '#transformers/wanxiang-video-task-transformer';
import { generateVideoWorkspaceNodeValidator, listVideoWorkspaceTasksValidator, showVideoWorkspaceTaskValidator } from '#validators/canvas-generation';
import {
  createVideoWorkspaceValidator,
  removeVideoWorkspaceValidator,
  renameVideoWorkspaceValidator,
  saveVideoWorkspaceCanvasValidator,
  showVideoWorkspaceValidator,
} from '#validators/video-workspace';

@inject()
export default class VideoWorkspacesController {
  constructor(private readonly videoWorkspaceService: VideoWorkspaceService) {}

  /** 创作空间列表 */
  async list(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const workspaces = await this.videoWorkspaceService.list({ userId: user.id });
    return ctx.ok(await ctx.serialize.withoutWrapping(VideoWorkspaceTransformer.transform(workspaces)));
  }

  /** 新建创作空间（空画布） */
  async create(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(createVideoWorkspaceValidator);
    const workspace = await this.videoWorkspaceService.create({ userId: user.id, name: payload.name });
    return ctx.ok(await ctx.serialize.withoutWrapping(VideoWorkspaceTransformer.transform(workspace)));
  }

  /** 空间详情（含画布） */
  async show(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(showVideoWorkspaceValidator);
    const workspace = await this.videoWorkspaceService.show({ userId: user.id, id: payload.params.id });
    return ctx.ok(await ctx.serialize.withoutWrapping(VideoWorkspaceTransformer.transform(workspace)));
  }

  /** 重命名空间 */
  async rename(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(renameVideoWorkspaceValidator);
    const workspace = await this.videoWorkspaceService.rename({ userId: user.id, id: payload.params.id, name: payload.name });
    return ctx.ok(await ctx.serialize.withoutWrapping(VideoWorkspaceTransformer.transform(workspace)));
  }

  /** 保存画布（last-write-wins 整包替换） */
  async saveCanvas(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(saveVideoWorkspaceCanvasValidator);
    const workspace = await this.videoWorkspaceService.saveCanvas({
      userId: user.id,
      id: payload.params.id,
      canvas: { nodes: payload.nodes, edges: payload.edges, viewport: payload.viewport ?? null },
    });
    return ctx.ok(await ctx.serialize.withoutWrapping(VideoWorkspaceTransformer.transform(workspace)));
  }

  /** 删除空间（级联清理画布节点关联的生成任务） */
  async remove(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(removeVideoWorkspaceValidator);
    await this.videoWorkspaceService.remove({ userId: user.id, id: payload.params.id });
    return ctx.ok(null);
  }

  /** 画布节点生成视频：校验节点存在后委托万相服务创建任务 */
  async generate(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(generateVideoWorkspaceNodeValidator);
    const task = await this.videoWorkspaceService.generate({
      userId: user.id,
      workspaceId: payload.params.id,
      nodeId: payload.params.nodeId,
      payload: {
        model: payload.model,
        input: payload.input,
        parameters: payload.parameters,
      },
    });
    return ctx.ok(await ctx.serialize.withoutWrapping(WanxiangVideoTaskTransformer.transform(task)));
  }

  /** 空间任务列表（entity_id ∈ 画布节点 id） */
  async listTasks(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(listVideoWorkspaceTasksValidator);
    const result = await this.videoWorkspaceService.listTasks({
      userId: user.id,
      workspaceId: payload.params.id,
      page: payload.page ?? 1,
      size: payload.size ?? 10,
    });
    const list = await ctx.serialize.withoutWrapping(WanxiangVideoTaskTransformer.transform(result.list));
    return ctx.ok({ meta: result.meta, list });
  }

  /** 任务详情 */
  async showTask(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(showVideoWorkspaceTaskValidator);
    const task = await this.videoWorkspaceService.showTask({ userId: user.id, workspaceId: payload.params.id, taskId: payload.params.taskId });
    if (!task) return ctx.error('任务不存在');
    return ctx.ok(await ctx.serialize.withoutWrapping(WanxiangVideoTaskTransformer.transform(task)));
  }

  /** 轮询任务状态（终态直接返回缓存） */
  async checkTask(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(showVideoWorkspaceTaskValidator);
    const task = await this.videoWorkspaceService.checkTask({ userId: user.id, workspaceId: payload.params.id, taskId: payload.params.taskId });
    return ctx.ok(await ctx.serialize.withoutWrapping(WanxiangVideoTaskTransformer.transform(task)));
  }

  /** 放弃任务 */
  async abandonTask(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(showVideoWorkspaceTaskValidator);
    const task = await this.videoWorkspaceService.abandonTask({ userId: user.id, workspaceId: payload.params.id, taskId: payload.params.taskId });
    return ctx.ok(await ctx.serialize.withoutWrapping(WanxiangVideoTaskTransformer.transform(task)));
  }
}
