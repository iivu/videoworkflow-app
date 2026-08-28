import { Panel } from '@xyflow/react';
import { Check, LoaderCircle } from 'lucide-react';

import type { CanvasSaveStatus } from '../types';

type SaveStatusPanelProps = {
  saveStatus: CanvasSaveStatus;
};

export function SaveStatusPanel({ saveStatus }: SaveStatusPanelProps) {
  return (
    <Panel position="bottom-left" className="!m-3">
      <div className="flex items-center gap-2 rounded-md border bg-background/80 px-2.5 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
        {saveStatus === 'saving' ? (
          <>
            <LoaderCircle className="size-3 animate-spin" />
            保存中…
          </>
        ) : (
          <>
            <Check className="size-3" />
            已保存
          </>
        )}
        <span className="text-border">|</span>
        <span>滚轮缩放 · 拖拽连线</span>
      </div>
    </Panel>
  );
}
