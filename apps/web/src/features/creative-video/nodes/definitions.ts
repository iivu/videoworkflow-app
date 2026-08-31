import type { Connection, Edge, NodeTypes } from '@xyflow/react';

import { GENERATION_INPUT_HANDLE, MAX_REFERENCE_IMAGES, type VideoWorkspaceNode } from '../types';
import { GenerationNode } from './generation-node';
import { ImageNode } from './image-node';

export const nodeTypes: NodeTypes = {
  image: ImageNode,
  generation: GenerationNode,
};

/** 单个生成节点最多可连入的图片素材数量（首帧 1 + 尾帧 1 + 参考图 10） */
const MAX_LINKED_IMAGES = 2 + MAX_REFERENCE_IMAGES;

/**
 * 连线规则：图片素材经生成节点唯一输入 handle 连入；
 * 同一对图片 → 生成节点只保留一条连线，且单个生成节点连入的图片数不超过素材区容量。
 */
export function isValidCanvasConnection(connection: Edge | Connection, edges: Edge[], nodes: VideoWorkspaceNode[]) {
  const { source, target, targetHandle } = connection;
  if (!source || !target || source === target) return false;
  if (targetHandle !== GENERATION_INPUT_HANDLE) return false;

  const sourceNode = nodes.find((node) => node.id === source);
  if (sourceNode?.data.kind !== 'image') return false;
  const targetNode = nodes.find((node) => node.id === target);
  if (targetNode?.data.kind !== 'generation') return false;

  const alreadyLinked = edges.some((edge) => edge.source === source && edge.target === target && edge.targetHandle === GENERATION_INPUT_HANDLE);
  if (alreadyLinked) return false;

  const linkCount = edges.filter((edge) => edge.target === target && edge.targetHandle === GENERATION_INPUT_HANDLE).length;
  return linkCount < MAX_LINKED_IMAGES;
}
