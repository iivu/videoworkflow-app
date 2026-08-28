import { Textarea } from '@r/ui';
import { Handle, type NodeProps, Position } from '@xyflow/react';

import { selectIsNodeLocked, useCanvasStore } from '../store';
import { PROMPT_SOURCE_HANDLE, type VideoWorkspaceNode } from '../types';
import { NodeShell } from './node-shell';

export function PromptNode({ id, data }: NodeProps<VideoWorkspaceNode>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const locked = useCanvasStore(selectIsNodeLocked(id));
  if (data.kind !== 'prompt') return null;

  return (
    <NodeShell id={id} title="提示词">
      <Handle type="source" position={Position.Right} id={PROMPT_SOURCE_HANDLE} />
      <Textarea
        value={data.prompt}
        placeholder="输入画面提示词…"
        disabled={locked}
        className="nodrag w-56 min-h-24 resize-y"
        onChange={(event) => updateNodeData(id, { prompt: event.target.value })}
      />
    </NodeShell>
  );
}
