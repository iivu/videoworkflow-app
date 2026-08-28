import { XIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { selectIsNodeLocked, useCanvasStore } from '../store';

export function NodeShell({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const locked = useCanvasStore(selectIsNodeLocked(id));

  return (
    <div className="relative rounded-xl border border-border bg-card p-3 shadow">
      {/* 标题渲染在容器外（上方），不占用容器内空间 */}
      <span className="absolute -top-5 left-1 rounded-sm bg-background/80 px-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm select-none">{title}</span>
      <button
        type="button"
        aria-label="删除节点"
        title={locked ? '生成中，禁止删除' : '删除节点'}
        disabled={locked}
        className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-md text-muted-foreground opacity-60 transition-opacity hover:bg-accent hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
        onClick={() => deleteNode(id)}
      >
        <XIcon className="size-3.5" />
      </button>
      {children}
    </div>
  );
}
