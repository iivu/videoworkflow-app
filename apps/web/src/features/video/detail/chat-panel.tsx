import { type UIMessage, useChat } from '@ai-sdk/react';
import { Bubble, type BubbleListProps, Sender, Think, XProvider } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@r/ui';
import { DefaultChatTransport } from 'ai';
import { theme as antdTheme } from 'antd';
import { Bot, ChevronDown, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useTheme } from '#/providers/theme-provider';
import { getToken } from '#/shared/token';
import { EmptyState, PanelHeader } from './components';

const CHAT_MODELS = ['qwen3.8-max', 'kimi/kimi-k3', 'deepseek-v4-flash-0731'] as const;
const CHAT_API = `${import.meta.env.VITE_API_URL}/api/v1/chat/polish-article`;

const roleConfig: BubbleListProps['role'] = {
  user: { placement: 'end', variant: 'filled' },
  ai: { placement: 'start', variant: 'outlined' },
};

function messageText(parts: UIMessage['parts']) {
  return parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n\n');
}

function messageReasoning(parts: UIMessage['parts']) {
  return parts
    .filter((part) => part.type === 'reasoning')
    .map((part) => part.text)
    .join('\n');
}

function normalizeChatError(error: Error) {
  try {
    const parsed = JSON.parse(error.message) as { message?: string };
    if (parsed.message) return parsed.message;
  } catch {
    // Fall back to the raw message.
  }
  return error.message || '请求失败，请稍后重试';
}

export function ChatPanel() {
  const { resolvedTheme } = useTheme();
  const [model, setModel] = useState<(typeof CHAT_MODELS)[number]>(() => CHAT_MODELS[0]);
  const [input, setInput] = useState('');

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: CHAT_API,
        headers: () => ({ Authorization: `Bearer ${getToken()}` }),
        body: () => ({ model }),
      }),
    [model],
  );

  const { messages, sendMessage, status, error, stop } = useChat({ transport });
  const streaming = status === 'submitted' || status === 'streaming';

  const items: BubbleListProps['items'] = messages.map((message, index): BubbleListProps['items'][number] => {
    const isLast = index === messages.length - 1;
    const active = streaming && isLast;

    if (message.role === 'user') {
      return { key: message.id, role: 'user', content: messageText(message.parts) };
    }

    const text = messageText(message.parts);
    const reasoning = messageReasoning(message.parts);

    return {
      key: message.id,
      role: 'ai',
      content: text,
      header: reasoning ? (
        <Think title="思考过程" defaultExpanded={false} blink={active}>
          {reasoning}
        </Think>
      ) : undefined,
      contentRender: (content) => {
        const markdown = String(content ?? '');
        if (!markdown) {
          return <span className="text-muted-foreground">{active ? '思考中…' : '（空回复）'}</span>;
        }
        return (
          <XMarkdown
            content={markdown}
            streaming={active ? { hasNextChunk: true, tail: true } : undefined}
            rootClassName="[&_p:last-child]:mb-0 [&_ul:last-child]:mb-0 [&_ol:last-child]:mb-0 [&_pre:last-child]:mb-0"
          />
        );
      },
    };
  });

  // While the request is being submitted there is no assistant message yet,
  // so render a placeholder loading bubble.
  if (streaming && messages[messages.length - 1]?.role !== 'assistant') {
    items.push({ key: '__loading__', role: 'ai', content: '', loading: true });
  }

  const handleSend = (message: string) => {
    const text = message.trim();
    if (!text || streaming) return;
    void sendMessage({ text });
    setInput('');
  };

  return (
    <XProvider theme={{ algorithm: resolvedTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }}>
      <aside className="flex min-h-0 flex-col border-l bg-background xl:border-l-0" aria-labelledby="chat-panel-title">
        <PanelHeader id="chat-panel-title" icon={<Bot />} title="AI Chat" />
        <div className="min-h-0 flex-1">
          {messages.length === 0 ? (
            <EmptyState icon={<Bot />} title="暂无对话" />
          ) : (
            <Bubble.List items={items} role={roleConfig} className="h-full" styles={{ scroll: { height: '100%' } }} />
          )}
        </div>
        {error ? <p className="px-4 pb-2 text-center text-sm text-destructive">{normalizeChatError(error)}</p> : null}
        <div className="shrink-0 p-4">
          <Sender
            value={input}
            onChange={(value) => setInput(value)}
            onSubmit={handleSend}
            loading={streaming}
            onCancel={stop}
            submitType="enter"
            placeholder='输入 "/" 唤起插件和技能'
            autoSize={{ minRows: 1, maxRows: 6 }}
            suffix={false}
            footer={(actionNode) => (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="添加附件"
                    className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="size-4" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
                      <span className="text-foreground">{model}</span>
                      <ChevronDown className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {CHAT_MODELS.map((item) => (
                        <DropdownMenuItem key={item} onClick={() => setModel(item)}>
                          {item}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {actionNode}
              </div>
            )}
          />
        </div>
      </aside>
    </XProvider>
  );
}
