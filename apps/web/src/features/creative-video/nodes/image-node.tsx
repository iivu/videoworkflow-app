import { Button, Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, toast } from '@r/ui';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import { ImagePlus, LoaderCircle } from 'lucide-react';
import { useRef } from 'react';

import { useOss } from '#/hooks/use-oss';
import { createUuid } from '#/shared/uuid';
import { selectIsNodeLocked, selectWorkspaceId, useCanvasStore } from '../store';
import { IMAGE_FRAME_OPTIONS, IMAGE_SOURCE_HANDLE, type VideoWorkspaceNode } from '../types';
import { NodeShell } from './node-shell';

export function ImageNode({ id, data }: NodeProps<VideoWorkspaceNode>) {
  const workspaceId = useCanvasStore(selectWorkspaceId);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const locked = useCanvasStore(selectIsNodeLocked(id));
  const { upload, uploading } = useOss();
  const inputRef = useRef<HTMLInputElement>(null);

  if (data.kind !== 'image') return null;

  async function handleFile(file: File | undefined) {
    if (!file || !workspaceId) return;
    const key = `video-workspace/${workspaceId}/${createUuid()}.png`;
    const result = await upload([{ file, key }]);
    const url = result?.[0]?.url ?? null;
    if (!url) {
      toast.add({ type: 'error', description: '图片上传失败，请重试' });
    }
    updateNodeData(id, { imageUrl: url, fileName: url ? file.name : undefined });
  }

  return (
    <NodeShell id={id} title="图片素材">
      <Handle type="source" position={Position.Right} id={IMAGE_SOURCE_HANDLE} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <div className="flex w-40 flex-col items-center gap-2">
        {data.imageUrl ? (
          <img src={data.imageUrl} alt={data.fileName ?? '图片素材'} className="h-28 w-full rounded-md object-cover" />
        ) : (
          <div className="flex h-28 w-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            {uploading ? <LoaderCircle className="size-5 animate-spin" /> : '暂无图片'}
          </div>
        )}
        <Button type="button" variant="outline" size="sm" className="nodrag w-full" disabled={locked || uploading} onClick={() => inputRef.current?.click()}>
          <ImagePlus />
          {data.imageUrl ? '更换图片' : '上传图片'}
        </Button>
        <Select
          items={IMAGE_FRAME_OPTIONS}
          value={data.frame ?? 'first_frame'}
          disabled={locked}
          onValueChange={(value) => value && updateNodeData(id, { frame: value as 'first_frame' | 'last_frame' })}
        >
          <SelectTrigger size="sm" className="nodrag w-full" aria-label="首帧/尾帧">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {IMAGE_FRAME_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </NodeShell>
  );
}
