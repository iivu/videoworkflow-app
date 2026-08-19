import { Button, cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@r/ui';
import { AudioLines, MoreVertical, Pencil, Trash2 } from 'lucide-react';

import { EVENT_OPEN_VOICE_CLONING_DIALOG, emitter } from '#/shared/mitt';

export function VideoActionsMenuTrigger({ videoUrl, onEdit, onDelete, className }: { videoUrl: string; onEdit: () => void; onDelete?: () => void; className?: string }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="视频操作"
            title="视频操作"
            className={cn(
              'absolute top-2 right-2 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/30 hover:text-white focus-visible:opacity-100',
              className,
            )}
          />
        }
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <MoreVertical />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
        >
          <Pencil />
          编辑视频信息
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            emitter.emit(EVENT_OPEN_VOICE_CLONING_DIALOG, { videoUrl });
          }}
        >
          <AudioLines />
          提取音色
        </DropdownMenuItem>
        {onDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 />
              删除视频
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
