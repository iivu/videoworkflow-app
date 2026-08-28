import { useEffect } from 'react';

import { useCanvasStore } from '../../store';

/** 数据组件：当前空间变化时从服务端加载画布 */
export function CanvasLoader() {
  const currentId = useCanvasStore((state) => state.currentId);
  const loadCanvas = useCanvasStore((state) => state.loadCanvas);
  useEffect(() => {
    if (!currentId) return;
    void loadCanvas(currentId);
  }, [currentId, loadCanvas]);
  return null;
}
