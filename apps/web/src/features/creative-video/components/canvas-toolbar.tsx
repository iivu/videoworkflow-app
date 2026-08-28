import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@r/ui';
import { Panel } from '@xyflow/react';
import { ChevronDown, Clapperboard, Image as ImageIcon, Plus, Type } from 'lucide-react';

type CanvasNodeKind = 'prompt' | 'image' | 'generation';

type CanvasToolbarProps = {
  onAddNode(kind: CanvasNodeKind): void;
};

export function CanvasToolbar({ onAddNode }: CanvasToolbarProps) {
  return (
    <Panel position="top-right" className="!m-3">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline" className="gap-2">
            <Plus className="size-4" />
            添加节点
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>添加节点</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onAddNode('prompt')}>
              <Type />
              提示词
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNode('image')}>
              <ImageIcon />
              图片素材
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddNode('generation')}>
              <Clapperboard />
              视频生成
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Panel>
  );
}
