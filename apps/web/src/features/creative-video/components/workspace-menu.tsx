import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@r/ui';
import { Panel } from '@xyflow/react';
import { Check, ChevronDown, FolderOpen, PencilLine, Plus, Trash2 } from 'lucide-react';

import type { VideoWorkspaceItem } from '../types';

function formatUpdatedAt(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

type WorkspaceMenuProps = {
  workspaces: VideoWorkspaceItem[];
  workspaceId: string | null;
  currentName: string;
  onSwitch(id: string): void;
  onOpenDialog(mode: 'create' | 'rename'): void;
  onDelete(): void;
};

export function WorkspaceMenu({ workspaces, workspaceId, currentName, onSwitch, onOpenDialog, onDelete }: WorkspaceMenuProps) {
  return (
    <Panel position="top-left" className="!m-3">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline" className="gap-2">
            <FolderOpen className="size-4" />
            <span className="max-w-44 truncate">{currentName}</span>
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>创作空间</DropdownMenuLabel>
            {workspaces.map((item) => (
              <DropdownMenuItem key={item.id} onClick={() => onSwitch(String(item.id))}>
                {String(item.id) === workspaceId ? <Check className="size-4 text-primary" /> : <span className="size-4" />}
                <span className="flex-1 truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground">{formatUpdatedAt(item.updatedAt)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onOpenDialog('create')}>
            <Plus />
            新建空间
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenDialog('rename')}>
            <PencilLine />
            重命名
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            删除空间
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Panel>
  );
}
