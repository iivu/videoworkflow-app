import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@r/ui';
import { ArrowUp, Bot, ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';

import { EmptyState, PanelHeader } from './components';

const CHAT_MODES = ['快速', '进阶'] as const;

function ChatInput() {
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<(typeof CHAT_MODES)[number]>('快速');

  const canSend = message.trim().length > 0;

  return (
    <div className="rounded-2xl border bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring/50">
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder='输入 "/" 唤起插件和技能'
        rows={3}
        className="w-full resize-none bg-transparent px-4 pt-3 text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center justify-between p-2">
        <button
          type="button"
          aria-label="添加附件"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-4" />
        </button>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <span className="text-foreground">{mode}</span>
              <ChevronDown className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {CHAT_MODES.map((item) => (
                <DropdownMenuItem key={item} onSelect={() => setMode(item)}>
                  {item}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            aria-label="发送"
            disabled={!canSend}
            className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChatPanel() {
  return (
    <aside className="flex min-h-0 flex-col border-l bg-background xl:border-l-0" aria-labelledby="chat-panel-title">
      <PanelHeader id="chat-panel-title" icon={<Bot />} title="AI Chat" />
      <div className="min-h-0 flex-1 p-4">
        <EmptyState icon={<Bot />} title="暂无对话" />
      </div>
      <div className="shrink-0 p-4">
        <ChatInput />
      </div>
    </aside>
  );
}
