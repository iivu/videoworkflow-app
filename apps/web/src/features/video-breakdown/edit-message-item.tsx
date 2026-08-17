import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TuyauQueryKey } from '@tuyau/react-query';
import { LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';

import { client } from '#/services/api';
import type { Segment } from './detail';

export type ChatMessage = {
  id: number;
  entityId: string;
  role: 'user' | 'assistant';
  message: string;
  taskId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AssistantPayload = {
  provider: string;
  task_id: string;
  status: string;
  video_url: string | null;
  reason: string | null;
  source: { type: 'segment'; segmentIndex: number | null };
};

export const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'UNKNOWN']);
const POLL_INTERVAL_MS = 3000;
const MAX_CONSECUTIVE_POLL_FAILURES = 5;

export function parseAssistantPayload(message: string): AssistantPayload | null {
  try {
    const record = JSON.parse(message) as Partial<AssistantPayload>;
    if (typeof record?.task_id !== 'string' || typeof record?.status !== 'string') return null;
    return {
      provider: typeof record.provider === 'string' ? record.provider : '',
      task_id: record.task_id,
      status: record.status,
      video_url: typeof record.video_url === 'string' ? record.video_url : null,
      reason: typeof record.reason === 'string' ? record.reason : null,
      source: {
        type: 'segment',
        segmentIndex: typeof record.source?.segmentIndex === 'number' ? record.source.segmentIndex : null,
      },
    };
  } catch {
    return null;
  }
}

function sourceLabel(source: AssistantPayload['source'], segments: Segment[]) {
  const index = typeof source.segmentIndex === 'number' ? source.segmentIndex : -1;
  const segment = index >= 0 ? segments[index] : undefined;
  return segment ? `分片 ${index + 1} · ${segment.start} - ${segment.end}` : index >= 0 ? `分片 ${index + 1}` : '';
}

type EditMessageItemProps = {
  message: ChatMessage;
  breakdownTaskId: string;
  segments: Segment[];
  messagesKey: TuyauQueryKey;
  onActiveTaskChange: (taskId: string | null) => void;
};

/** 单条对话消息：独立渲染，assistant 消息在组件内部自行轮询自己的任务状态 */
export function EditMessageItem({ message, breakdownTaskId, segments, messagesKey, onActiveTaskChange }: EditMessageItemProps) {
  if (message.role === 'user') {
    return <p className="whitespace-pre-wrap wrap-break-words">{message.message}</p>;
  }
  return <AssistantBubble message={message} breakdownTaskId={breakdownTaskId} segments={segments} messagesKey={messagesKey} onActiveTaskChange={onActiveTaskChange} />;
}

function AssistantBubble({ message, breakdownTaskId, segments, messagesKey, onActiveTaskChange }: EditMessageItemProps) {
  const queryClient = useQueryClient();
  const payload = useMemo(() => parseAssistantPayload(message.message), [message.message]);
  const terminal = !!payload && TERMINAL_STATUSES.has(payload.status);
  const editTaskId = payload?.task_id ?? '';

  // 终态由服务端回写消息，刷新列表即可让本条重新渲染为结果/错误
  const handleTerminal = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: messagesKey });
  }, [queryClient, messagesKey]);

  // 进行中任务轮询：由 useQuery 的 refetchInterval/retry 驱动，终态或连续失败超限时自动停止
  const checkQuery = useQuery({
    queryKey: ['video-edit-check', breakdownTaskId, editTaskId],
    queryFn: async () => {
      const response = await client.api.videoEditConversation.check({
        params: { taskId: breakdownTaskId },
        body: { taskId: editTaskId },
      });
      if (response.data && TERMINAL_STATUSES.has(response.data.status)) handleTerminal();
      return response.data;
    },
    enabled: !!payload && !terminal && !!editTaskId,
    // 单次拉取失败不重试（不引入退避延迟），连续失败由 failureCount 计数、refetchInterval 停止
    retry: false,
    refetchInterval: (query) => {
      // 连续失败达到上限：停止轮询，引导用户放弃任务
      if (query.state.fetchFailureCount >= MAX_CONSECUTIVE_POLL_FAILURES) return false;
      // 已到达终态：停止轮询
      if (query.state.data && TERMINAL_STATUSES.has(query.state.data.status)) return false;
      return POLL_INTERVAL_MS;
    },
  });

  // 连续失败计数（成功时由 TanStack 自动归零）
  const pollError = checkQuery.failureCount >= MAX_CONSECUTIVE_POLL_FAILURES;

  // 上报占用状态：非终态任务占用全局名额（父级据此禁用发送并展示放弃栏），终态释放
  useEffect(() => {
    if (!payload) return;
    onActiveTaskChange(terminal ? null : payload.task_id);
  }, [payload, terminal, onActiveTaskChange]);

  if (!payload) {
    return <p className="text-sm text-muted-foreground">（消息格式异常）</p>;
  }

  if (terminal) {
    if (payload.status === 'SUCCEEDED') {
      return (
        <div className="w-full space-y-2">
          <div className="overflow-hidden rounded-sm bg-black">
            {/* biome-ignore lint/a11y/useMediaCaption: generated result video, no caption available */}
            <video src={payload.video_url ?? undefined} controls className="max-h-72 w-full rounded-sm object-contain" />
          </div>
          <p className="text-xs text-muted-foreground">{sourceLabel(payload.source, segments)}</p>
        </div>
      );
    }
    if (payload.status === 'FAILED' || payload.status === 'CANCELED') {
      return (
        <div className="text-sm text-destructive">
          <p className="font-medium">{payload.status === 'FAILED' ? '视频编辑失败' : '任务已取消'}</p>
          {payload.reason ? <p className="mt-1 text-xs opacity-80">{payload.reason}</p> : null}
        </div>
      );
    }
    return <p className="text-sm text-muted-foreground">任务状态未知，请刷新后重试</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        正在生成视频…
      </div>
      {pollError ? <p className="text-xs text-destructive">任务状态轮询失败，请点击上方「放弃」释放占用后重试</p> : null}
    </div>
  );
}
