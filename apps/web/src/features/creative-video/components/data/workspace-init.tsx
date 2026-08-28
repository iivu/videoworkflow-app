import { useEffect } from 'react';

import { useCanvasStore } from '../../store';

/** 数据组件：挂载时初始化创作空间列表（含自动创建默认空间） */
export function WorkspaceInit() {
  const initWorkspaces = useCanvasStore((state) => state.initWorkspaces);
  useEffect(() => {
    void initWorkspaces();
  }, [initWorkspaces]);
  return null;
}
