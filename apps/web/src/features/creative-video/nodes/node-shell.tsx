import { XIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { useConfirm } from '#/providers/confirm-dialog-provider';
import { selectNodeHasActiveTask, useCanvasStore } from '../store';

export function NodeShell({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const { confirm } = useConfirm();
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const hasActiveTask = useCanvasStore(selectNodeHasActiveTask(id));

  async function handleDelete() {
    if (hasActiveTask) {
      const ok = await confirm({
        title: '删除生成节点',
        description: '该节点仍有视频生成任务进行中，删除后任务将丢失，确定删除吗？',
        danger: true,
      });
      if (!ok) return;
    }
    deleteNode(id);
  }

  return (
    <div className="relative rounded-xl border border-border bg-card p-3 shadow">
      {/* 标题渲染在容器外（上方），不占用容器内空间 */}
      <span className="absolute -top-5 left-1 rounded-sm bg-background/80 px-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm select-none">{title}</span>
      <button
        type="button"
        aria-label="删除节点"
        title="删除节点"
        className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-md text-muted-foreground opacity-60 transition-opacity hover:bg-accent hover:opacity-100"
        onClick={() => void handleDelete()}
      >
        <XIcon className="size-3.5" />
      </button>
      {children}
    </div>
  );
}
