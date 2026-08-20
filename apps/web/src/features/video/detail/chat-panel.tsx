import { type UIMessage, useChat } from '@ai-sdk/react';
import { Bubble, type BubbleListProps, Sender, Think, XProvider } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@r/ui';
import { DefaultChatTransport } from 'ai';
import { theme as antdTheme } from 'antd';
import { Bot, ChevronDown, History, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTheme } from '#/providers/theme-provider';
import { client } from '#/services/api';
import { getToken } from '#/shared/token';
import { CopyButton, EmptyState, PanelHeader } from './components';

const CHAT_MODELS = ['qwen3.8-max', 'kimi/kimi-k3', 'deepseek-v4-flash-0731'] as const;
const HISTORY_PAGE_SIZE = 20;

type HistoryMessage = { id: number; role: string; message: string };

const roleConfig: BubbleListProps['role'] = {
  user: { placement: 'end', variant: 'filled' },
  ai: { placement: 'start', variant: 'outlined' },
  loadMore: { placement: 'start', variant: 'borderless', styles: { root: { width: '100%', padding: 0, justifyContent: 'center' } } },
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

function historyMessageToUIMessage(message: HistoryMessage): UIMessage {
  return {
    id: `history-${message.id}`,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    parts: [{ type: 'text', text: message.message }],
  };
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

export function ChatPanel({ videoId }: { videoId: string }) {
  const { resolvedTheme } = useTheme();
  const [model, setModel] = useState<(typeof CHAT_MODELS)[number]>(() => CHAT_MODELS[0]);
  const [input, setInput] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const loadingHistoryRef = useRef(false);

  const chatApi = `${import.meta.env.VITE_API_URL}/api/v1/chat/polish-article/${videoId}`;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: chatApi,
        headers: () => ({ Authorization: `Bearer ${getToken()}` }),
        prepareSendMessagesRequest: ({ messages }) => {
          const lastMessage = messages[messages.length - 1];
          const text = lastMessage ? messageText(lastMessage.parts) : '';
          return { body: { message: text, model } };
        },
      }),
    [chatApi, model],
  );

  const { messages, setMessages, sendMessage, status, error, stop } = useChat({ transport });
  const streaming = status === 'submitted' || status === 'streaming';

  const loadPage = useCallback(
    async (targetPage: number) => {
      if (loadingHistoryRef.current) return;
      loadingHistoryRef.current = true;
      setLoadingHistory(true);
      try {
        const response = await client.api.ai.listMessages({ params: { videoId }, query: { page: targetPage, size: HISTORY_PAGE_SIZE } });
        const { list, meta } = response.data;
        const olderMessages = [...list].reverse().map(historyMessageToUIMessage);
        setMessages((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          return [...olderMessages.filter((item) => !existingIds.has(item.id)), ...prev];
        });
        setPage(targetPage);
        setHasMore(meta.currentPage < Math.ceil(meta.total / HISTORY_PAGE_SIZE));
      } catch (err) {
        console.error('加载润色对话历史失败', err);
      } finally {
        loadingHistoryRef.current = false;
        setLoadingHistory(false);
      }
    },
    [client, setMessages, videoId],
  );

  const loadOlder = useCallback(() => {
    if (!hasMore) return;
    void loadPage(page + 1);
  }, [hasMore, loadPage, page]);

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  const items = useMemo<BubbleListProps['items']>(() => {
    const list: BubbleListProps['items'] = messages.map((message, index): BubbleListProps['items'][number] => {
      const isLast = index === messages.length - 1;
      const active = streaming && isLast;

      if (message.role === 'user') {
        const text = messageText(message.parts);
        return {
          key: message.id,
          role: 'user',
          content: text,
          footer: text ? <CopyButton text={text} /> : undefined,
        };
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
        footer: text ? <CopyButton text={text} /> : undefined,
        contentRender: (content) => {
          const markdown = String(content ?? '');
          if (!markdown) {
            return <span className="text-muted-foreground">{active ? '思考中…' : '（空回复）'}</span>;
          }
          return (
            <XMarkdown
              content={markdown}
              streaming={active ? { hasNextChunk: true, enableAnimation: true } : undefined}
              rootClassName="[&_p:last-child]:mb-0 [&_ul:last-child]:mb-0 [&_ol:last-child]:mb-0 [&_pre:last-child]:mb-0"
            />
          );
        },
      };
    });

    // 加载更早的对话按钮放在最顶部（最早消息之前），向上滚动到顶即可看到。
    if (messages.length > 0 && (hasMore || loadingHistory)) {
      list.unshift({
        key: '__load-more__',
        role: 'loadMore',
        content: (
          <div className="flex-center py-2">
            <Button type="button" variant="ghost" size="xs" disabled={loadingHistory} onClick={loadOlder} className="text-muted-foreground">
              {loadingHistory ? <LoaderCircle className="size-3 animate-spin" /> : <History className="size-3" />}
              {loadingHistory ? '正在加载更早的对话' : '加载更早的对话'}
            </Button>
          </div>
        ),
      });
    }

    // While the request is being submitted there is no assistant message yet,
    // so render a placeholder loading bubble.
    if (streaming && messages[messages.length - 1]?.role !== 'assistant') {
      list.push({ key: '__loading__', role: 'ai', content: '', loading: true });
    }

    return list;
  }, [messages, streaming, hasMore, loadingHistory, loadOlder]);

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
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            {loadingHistory && messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <LoaderCircle className="size-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState icon={<Bot />} title="暂无对话" />
            ) : (
              <Bubble.List items={items} autoScroll role={roleConfig} className="h-full" styles={{ scroll: { height: '100%' } }} />
            )}
          </div>
        </div>
        {error ? <p className="px-4 pb-2 text-center text-sm text-destructive">{normalizeChatError(error)}</p> : null}
        <div className="shrink-0 px-2 py-4">
          <Sender
            value={input}
            onChange={(value) => setInput(value)}
            onSubmit={handleSend}
            loading={streaming}
            onCancel={stop}
            submitType="enter"
            placeholder="输入你的需求，比如改写这篇文案..."
            autoSize={{ minRows: 1, maxRows: 6 }}
            suffix={false}
            footer={(actionNode) => (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
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
