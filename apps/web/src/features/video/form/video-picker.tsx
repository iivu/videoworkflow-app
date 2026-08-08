import { Button, cn, Tooltip, TooltipContent, TooltipTrigger } from '@r/ui';
import { AlertCircle, FileVideo, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { COUNT_FIELDS, type DraftErrors, formatFileSize, MAX_VIDEO_COUNT, type VideoDraft } from './video-draft';

type VideoPickerProps = {
  drafts: VideoDraft[];
  selectedId?: string;
  errorsById: Record<string, DraftErrors>;
  busy: boolean;
  onAddFiles: (files: FileList | File[]) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
};

export function VideoPicker({ drafts, selectedId, errorsById, busy, onAddFiles, onSelect, onRemove }: VideoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const canAddFiles = !busy && drafts.length < MAX_VIDEO_COUNT;

  return (
    <aside className="flex min-h-0 flex-col border-b bg-muted/20 lg:border-r lg:border-b-0">
      <button
        type="button"
        disabled={!canAddFiles}
        aria-label="选择或拖拽添加视频"
        className={cn(
          'm-3 mb-2 flex min-h-28 items-center justify-center rounded-md border border-dashed px-4 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-background',
          !canAddFiles && 'opacity-50',
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          if (canAddFiles) setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          onAddFiles(event.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Upload className="size-5" />
          <span>{canAddFiles ? '点击选择或拖拽视频到此处' : `已达到 ${MAX_VIDEO_COUNT} 个视频上限`}</span>
        </div>
      </button>
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept="video/*"
        multiple
        onChange={(event) => {
          if (event.target.files) onAddFiles(event.target.files);
          event.target.value = '';
        }}
      />

      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-sm font-medium">视频列表</h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {drafts.length}/{MAX_VIDEO_COUNT}
        </span>
      </div>

      <div className="max-h-72 min-h-0 flex-1 overflow-y-auto px-3 pb-3 lg:max-h-none">
        {drafts.length === 0 ? (
          <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">尚未添加视频</div>
        ) : (
          <ul className="space-y-1">
            {drafts.map((draft) => {
              const hasError = Boolean(errorsById[draft.id]);
              return (
                <li key={draft.id}>
                  <div
                    className={cn(
                      'group flex min-h-24 w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors',
                      draft.id === selectedId ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted',
                      hasError && 'border-destructive/50',
                    )}
                  >
                    <button className="flex min-w-0 flex-1 items-start gap-2 text-left" type="button" onClick={() => onSelect(draft.id)}>
                      <FileVideo className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="block truncate text-sm font-medium">{draft.title || draft.file.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {draft.author.trim() || '作者未填写'} · {draft.publishAt ? draft.publishAt.toLocaleDateString('zh-CN') : '日期未填写'}
                        </span>
                        <span className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          {COUNT_FIELDS.map(([field, , shortLabel]) => (
                            <span key={field}>
                              {shortLabel} {draft[field] === '' ? '-' : draft[field]}
                            </span>
                          ))}
                        </span>
                        <span className="block text-xs text-muted-foreground">{formatFileSize(draft.file.size)}</span>
                      </span>
                      {hasError ? <AlertCircle className="size-4 shrink-0 text-destructive" /> : null}
                    </button>
                    <Tooltip>
                      <TooltipTrigger
                        render={<Button type="button" size="icon-sm" variant="ghost" disabled={busy} aria-label={`移除 ${draft.file.name}`} onClick={() => onRemove(draft.id)} />}
                      >
                        <Trash2 />
                      </TooltipTrigger>
                      <TooltipContent>移除视频</TooltipContent>
                    </Tooltip>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
