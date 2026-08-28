import type { Connection, Edge, NodeTypes } from '@xyflow/react';

import { FIRST_FRAME_TARGET_HANDLE, IMAGE_SOURCE_HANDLE, LAST_FRAME_TARGET_HANDLE, PROMPT_SOURCE_HANDLE, PROMPT_TARGET_HANDLE } from '../types';
import { GenerationNode } from './generation-node';
import { ImageNode } from './image-node';
import { PromptNode } from './prompt-node';

export const nodeTypes: NodeTypes = {
  prompt: PromptNode,
  image: ImageNode,
  generation: GenerationNode,
};

/** 连线规则：prompt 源仅连 prompt 目标；image 源仅连 firstFrame/lastFrame 目标；每个 handle 至多 1 条入边 */
export function isValidCanvasConnection(connection: Edge | Connection, edges: Edge[]) {
  const { source, target, sourceHandle, targetHandle } = connection;
  if (!source || !target || source === target) return false;

  if (sourceHandle === PROMPT_SOURCE_HANDLE && targetHandle !== PROMPT_TARGET_HANDLE) return false;
  if (sourceHandle !== PROMPT_SOURCE_HANDLE && targetHandle === PROMPT_TARGET_HANDLE) return false;
  if (sourceHandle === IMAGE_SOURCE_HANDLE && targetHandle !== FIRST_FRAME_TARGET_HANDLE && targetHandle !== LAST_FRAME_TARGET_HANDLE) return false;
  if (sourceHandle !== IMAGE_SOURCE_HANDLE && (targetHandle === FIRST_FRAME_TARGET_HANDLE || targetHandle === LAST_FRAME_TARGET_HANDLE)) return false;

  return !edges.some((edge) => edge.target === target && edge.targetHandle === targetHandle);
}
