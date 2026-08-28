import { useEffect } from 'react';

import { selectWorkspaceId, useCanvasStore } from '../../store';

const SAVE_INTERVAL_MS = 5000;

/** 数据组件：每 5s 定时保存画布；页面关闭（beforeunload / 卸载）前 keepalive 兜底保存 */
export function CanvasAutoSave() {
  const workspaceId = useCanvasStore(selectWorkspaceId);
  const flushCanvas = useCanvasStore((state) => state.flushCanvas);
  const flushCanvasKeepalive = useCanvasStore((state) => state.flushCanvasKeepalive);

  useEffect(() => {
    if (!workspaceId) return;
    const timer = setInterval(() => void flushCanvas(), SAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [workspaceId, flushCanvas]);

  useEffect(() => {
    const handler = () => flushCanvasKeepalive();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [flushCanvasKeepalive]);

  useEffect(() => () => flushCanvasKeepalive(), [flushCanvasKeepalive]);

  return null;
}
