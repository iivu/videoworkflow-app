import { Button, cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@r/ui';
import { AudioLines, MoreVertical, Pencil } from 'lucide-react';

import { EVENT_OPEN_VOICE_CLONING_DIALOG, emitter } from '#/shared/mitt';

export function VideoActionsMenuTrigger({ videoUrl, onEdit, className }: { videoUrl: string; onEdit: () => void; className?: string }) {
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
