import type { Connection, Edge, NodeTypes } from '@xyflow/react';

import { GENERATION_INPUT_HANDLE, type VideoWorkspaceNode } from '../types';
import { GenerationNode } from './generation-node';
import { ImageNode } from './image-node';

export const nodeTypes: NodeTypes = {
  image: ImageNode,
  generation: GenerationNode,
};

/**
 * 连线规则：图片素材经生成节点唯一输入 handle 连入；
 * 同一帧角色（首帧/尾帧）至多 1 条入边。
 */
export function isValidCanvasConnection(connection: Edge | Connection, edges: Edge[], nodes: VideoWorkspaceNode[]) {
  const { source, target, targetHandle } = connection;
  if (!source || !target || source === target) return false;
  if (targetHandle !== GENERATION_INPUT_HANDLE) return false;

  const sourceNode = nodes.find((node) => node.id === source);
  if (sourceNode?.data.kind !== 'image') return false;
  const role = `image:${sourceNode.data.frame ?? 'first_frame'}`;

  return !edges.some((edge) => {
    if (edge.target !== target || edge.targetHandle !== targetHandle) return false;
    const other = nodes.find((node) => node.id === edge.source);
    if (other?.data.kind !== 'image') return false;
    const otherRole = `image:${other.data.frame ?? 'first_frame'}`;
    return otherRole === role;
  });
}
