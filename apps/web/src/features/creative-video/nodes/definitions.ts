import type { Connection, Edge, NodeTypes } from '@xyflow/react';

import { PROMPT_TARGET_HANDLE, type VideoWorkspaceNode } from '../types';
import { GenerationNode } from './generation-node';
import { ImageNode } from './image-node';
import { PromptNode } from './prompt-node';

export const nodeTypes: NodeTypes = {
  prompt: PromptNode,
  image: ImageNode,
  generation: GenerationNode,
};

/**
 * 连线规则：提示词/图片均通过唯一输入 handle 连入生成节点；
 * 同一角色至多 1 条入边——提示词唯一，图片按首帧/尾帧各至多 1 条。
 */
export function isValidCanvasConnection(connection: Edge | Connection, edges: Edge[], nodes: VideoWorkspaceNode[]) {
  const { source, target, targetHandle } = connection;
  if (!source || !target || source === target) return false;
  if (targetHandle !== PROMPT_TARGET_HANDLE) return false;

  const sourceNode = nodes.find((node) => node.id === source);
  if (!sourceNode) return false;
  const role = sourceNode.data.kind === 'image' ? `image:${sourceNode.data.frame ?? 'first_frame'}` : 'prompt';

  return !edges.some((edge) => {
    if (edge.target !== target || edge.targetHandle !== targetHandle) return false;
    const other = nodes.find((node) => node.id === edge.source);
    if (!other) return false;
    const otherRole = other.data.kind === 'image' ? `image:${other.data.frame ?? 'first_frame'}` : 'prompt';
    return otherRole === role;
  });
}
