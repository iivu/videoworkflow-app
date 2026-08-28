import { useReactFlow } from '@xyflow/react';
import { useEffect, useRef } from 'react';

import { selectWorkspaceId, useCanvasStore } from '../../store';
import type { VideoWorkspaceNode } from '../../types';

/** 数据组件：空间切换且画布加载完成后恢复保存的视口（每空间仅一次） */
export function CanvasViewportSync() {
  const { setViewport: applyViewport } = useReactFlow<VideoWorkspaceNode>();
  const workspaceId = useCanvasStore(selectWorkspaceId);
  const viewport = useCanvasStore((state) => state.viewport);
  const canvasLoaded = useCanvasStore((state) => state.canvasLoaded);
  const appliedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!workspaceId || !canvasLoaded || !viewport) return;
    if (appliedForRef.current === workspaceId) return;
    appliedForRef.current = workspaceId;
    applyViewport(viewport);
  }, [workspaceId, canvasLoaded, viewport, applyViewport]);

  return null;
}
