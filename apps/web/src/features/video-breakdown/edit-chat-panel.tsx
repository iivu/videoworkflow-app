import { Bubble, type BubbleListProps, Sender, XProvider } from '@ant-design/x';
import { Button, toast } from '@r/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TuyauError } from '@tuyau/core/client';
import { theme as antdTheme } from 'antd';
import { Bot, LoaderCircle } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { EmptyState } from '#/features/video/detail/components';
import { useTheme } from '#/providers/theme-provider';
import { normalizeApiFailedMessage, query } from '#/services/api';
import { getAssetUrl, type Segment } from './detail';
import { type AssistantPayload, EditMessageItem, TERMINAL_STATUSES } from './edit-message-item';
import type { ChatMessage, VideoEditMessage } from './types';

const roleConfig: BubbleListProps['role'] = {
  user: { placement: 'end', variant: 'filled' },
  ai: { placement: 'start', variant: 'outlined' },
};

function toApiErrorMessage(error: unknown): string {
  return normalizeApiFailedMessage(error as TuyauError) || '';
}

function toChatMessage(row: VideoEditMessage): ChatMessage {
  return { ...row, role: row.role === 'assistant' ? 'assistant' : 'user' };
}

export function EditChatPanel({ taskId, segments, selectedIndex }: { taskId: string; segments: Segment[]; selectedIndex: number }) {
  const { resolvedTheme } = useTheme();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const handleActiveTaskChange = useCallback((next: string | null) => setActiveTaskId(next), []);

  const messagesRequest = useMemo(() => ({ params: { taskId }, query: { page: 1, size: 50 } }), [taskId]);
  const messagesKey = useMemo(() => query.videoEditConversation.listMessages.queryKey(messagesRequest), [messagesRequest]);

  // 对话历史：纯消息渲染，终态零任务查询；进行中任务由消息项组件自行轮询
  const messagesQuery = useQuery(
    query.videoEditConversation.listMessages.queryOptions(messagesRequest, {
      select: (response) => [...response.data.list].reverse().map(toChatMessage),
    }),
  );
  const messages = messagesQuery.data ?? [];

  const sendMutation = useMutation({
    ...query.videoEditConversation.send.mutationOptions(),
    onSuccess: (response, variables) => {
      const task = response.data;
      const source: AssistantPayload['source'] = { type: 'segment', segmentIndex: selectedIndex };
      const now = Date.now();
      // 缓存列表与服务端一致为「新消息在前」（orderBy id desc），展示层再 reverse 成时间正序。
      // 因此乐观插入时 assistant（更新）必须排在 user 之前，否则展示时处理中的消息会跑到用户消息上面。
      const optimistic: VideoEditMessage[] = [
        {
          id: -now - 1,
          entityId: taskId,
          role: 'assistant',
          message: JSON.stringify({
            provider: 'wanxiang',
            task_id: task.taskId,
            status: task.status,
            video_url: null,
            reason: null,
            source,
          } satisfies AssistantPayload),
          taskId: task.taskId,
          createdAt: new Date(now + 1).toISOString(),
          updatedAt: null,
        },
        {
          id: -now,
          entityId: taskId,
          role: 'user',
          message: variables.body.prompt,
          taskId: null,
          createdAt: new Date(now).toISOString(),
          updatedAt: null,
        },
      ];
      queryClient.setQueryData(messagesKey, (old) => {
        const previous = old ?? { code: 0, message: 'ok', data: { meta: { total: 0, currentPage: 1 }, list: [] as VideoEditMessage[] } };
        return { ...previous, data: { meta: previous.data.meta, list: [...optimistic, ...previous.data.list] } };
      });
      setInput('');
      // 立即占用：消息项组件随后也会上报同一任务，双方保持一致
      setActiveTaskId(task.taskId);
    },
    onError: (error) => {
      toast.add({ type: 'error', description: toApiErrorMessage(error) || '发送失败，请稍后重试' });
      // 可能被“已有任务进行中”拒绝：刷新列表，让进行中的消息项自行续接轮询
      void queryClient.invalidateQueries({ queryKey: messagesKey });
    },
  });

  const abandonMutation = useMutation({
    ...query.videoEditConversation.abandon.mutationOptions(),
    onSuccess: (response) => {
      if (TERMINAL_STATUSES.has(response.data.status)) {
        toast.add({ type: 'success', description: '已放弃当前任务' });
        void queryClient.invalidateQueries({ queryKey: messagesKey });
      }
    },
    onError: (error) => {
      toast.add({ type: 'error', description: toApiErrorMessage(error) || '放弃失败，请稍后重试' });
    },
  });

  const handleSend = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || sendMutation.isPending || activeTaskId) return;
    const selectedSegment = segments[selectedIndex];
    const mediaUrl = selectedSegment ? getAssetUrl(selectedSegment.file) : '';
    if (!mediaUrl) return;
    try {
      await sendMutation.mutateAsync({
        params: { taskId },
        body: { prompt, media: [{ type: 'video', url: mediaUrl }] },
      });
    } catch {
      // 错误提示与刷新续接由 mutation 的 onError 处理
    }
  };

  const handleAbandon = () => {
    if (!activeTaskId || abandonMutation.isPending) return;
    void abandonMutation.mutateAsync({ params: { taskId }, body: { taskId: activeTaskId } });
  };

  const items = useMemo<BubbleListProps['items']>(
    () =>
      messages.map((message) => ({
        key: message.id,
        role: message.role === 'user' ? ('user' as const) : ('ai' as const),
        content: <EditMessageItem message={message} breakdownTaskId={taskId} segments={segments} messagesKey={messagesKey} onActiveTaskChange={handleActiveTaskChange} />,
      })),
    [messages, taskId, segments, messagesKey, handleActiveTaskChange],
  );

  return (
    <XProvider theme={{ algorithm: resolvedTheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }}>
      <section className="flex min-h-0 flex-col border-l bg-background" aria-labelledby="video-edit-chat-title">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            {messagesQuery.isLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <LoaderCircle className="size-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState icon={<Bot />} title="暂无对话" description="选择下方分片，输入自然语言指令进行视频编辑" />
            ) : (
              <Bubble.List items={items} autoScroll role={roleConfig} className="h-full" styles={{ scroll: { height: '100%' } }} />
            )}
          </div>
        </div>
        {messagesQuery.isError ? <p className="shrink-0 px-4 pb-2 text-center text-sm text-destructive">{toApiErrorMessage(messagesQuery.error) || '加载对话历史失败'}</p> : null}
        {activeTaskId ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-2 text-sm text-muted-foreground">
            <span className="flex min-w-0 items-center gap-2">
              <LoaderCircle className="size-4 shrink-0 animate-spin" />
              <span className="truncate">正在生成视频…</span>
            </span>
            <Button type="button" variant="outline" size="xs" disabled={abandonMutation.isPending} onClick={handleAbandon}>
              {abandonMutation.isPending ? <LoaderCircle className="size-3 animate-spin" /> : null}
              放弃
            </Button>
          </div>
        ) : null}
        <div className="shrink-0 px-2 py-4">
          <Sender
            value={input}
            onChange={setInput}
            onSubmit={(value) => void handleSend(value)}
            loading={sendMutation.isPending}
            disabled={!!activeTaskId}
            onCancel={() => {}}
            submitType="enter"
            placeholder="输入编辑指令，如：将画面转换为黏土风格..."
            autoSize={{ minRows: 1, maxRows: 6 }}
            suffix={false}
            footer={(actionNode) => <div className="flex items-center justify-end">{actionNode}</div>}
          />
        </div>
      </section>
    </XProvider>
  );
}
