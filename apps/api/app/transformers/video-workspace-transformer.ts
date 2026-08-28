import { BaseTransformer } from '@adonisjs/core/transformers';

import type VideoWorkspace from '#models/video-workspace';

export type CanvasJsonValue = string | number | boolean | null | CanvasJsonValue[] | { [key: string]: CanvasJsonValue };

export type VideoWorkspaceCanvas = {
  nodes: CanvasJsonValue[];
  edges: CanvasJsonValue[];
  viewport: CanvasJsonValue | null;
};

export const EMPTY_VIDEO_WORKSPACE_CANVAS: VideoWorkspaceCanvas = { nodes: [], edges: [], viewport: null };

export function parseVideoWorkspaceCanvas(value: string): VideoWorkspaceCanvas {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as VideoWorkspaceCanvas).nodes) && Array.isArray((parsed as VideoWorkspaceCanvas).edges)) {
      return parsed as VideoWorkspaceCanvas;
    }
  } catch {
    // 画布 JSON 损坏时回退为空画布
  }
  return EMPTY_VIDEO_WORKSPACE_CANVAS;
}

export default class VideoWorkspaceTransformer extends BaseTransformer<VideoWorkspace> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'name', 'createdAt', 'updatedAt']),
      canvas: parseVideoWorkspaceCanvas(this.resource.canvas),
    };
  }

  /** 列表变体：不返回画布数据（画布由详情接口返回） */
  toList() {
    return this.pick(this.resource, ['id', 'name', 'createdAt', 'updatedAt']);
  }
}
