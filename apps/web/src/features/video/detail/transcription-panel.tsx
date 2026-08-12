import { Button } from '@r/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, LoaderCircle, Play, RefreshCw } from 'lucide-react';

import { normalizeApiFailedMessage, query } from '#/services/api';
import { EmptyState, ErrorAlert, PanelHeader, TranscriptionSkeleton } from './components';

const POLL_INTERVAL_MS = 5_000;
const ACTIVE_STATUSES = new Set(['PENDING', 'RUNNING']);
const FAILED_STATUSES = new Set(['FAILED', 'UNKNOWN']);

export function TranscriptionPanel({ videoId }: { videoId: string }) {
  const queryClient = useQueryClient();
  const taskQueryOptions = query.paraformer.checkTask.queryOptions({ params: { videoId } });
  const taskQuery = useQuery({
    ...taskQueryOptions,
    refetchInterval: (currentQuery) => (ACTIVE_STATUSES.has(currentQuery.state.data?.data?.status ?? '') ? POLL_INTERVAL_MS : false),
  });
  const submitMutation = useMutation(query.paraformer.transcription.mutationOptions());
  const retryMutation = useMutation(query.paraformer.transcriptionRetry.mutationOptions());
  const task = taskQuery.data?.data;
  const mutationError = submitMutation.error || retryMutation.error;

  async function submitTask(mode: 'submit' | 'retry') {
    const mutation = mode === 'retry' ? retryMutation : submitMutation;
    submitMutation.reset();
    retryMutation.reset();
    try {
      const response = await mutation.mutateAsync({ params: { videoId } });
      queryClient.setQueryData(taskQueryOptions.queryKey, response);
    } catch {
      // Mutation state keeps the error visible without discarding the current task.
    }
  }

  return (
    <section className="flex min-h-0 flex-col bg-background xl:border-r" aria-labelledby="transcription-panel-title">
      <PanelHeader id="transcription-panel-title" icon={<FileText />} title="转录文本" />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {taskQuery.isLoading ? <TranscriptionSkeleton /> : null}

        {taskQuery.error ? <ErrorAlert title="转录任务查询失败" message={normalizeApiFailedMessage(taskQuery.error) || '无法获取转录任务，请稍后重试'} /> : null}

        {mutationError ? <ErrorAlert title="操作失败" message={normalizeApiFailedMessage(mutationError) || '操作失败，请稍后重试'} /> : null}

        {!taskQuery.isLoading && !taskQuery.error && !task ? (
          <EmptyState
            icon={<FileText />}
            title="暂无转录文本"
            action={
              <Button disabled={submitMutation.isPending} onClick={() => submitTask('submit')}>
                {submitMutation.isPending ? <LoaderCircle className="animate-spin" /> : <Play />}
                {submitMutation.isPending ? '提交中' : '开始转录'}
              </Button>
            }
          />
        ) : null}

        {task && !taskQuery.error && ACTIVE_STATUSES.has(task.status) ? (
          <EmptyState icon={<LoaderCircle className="animate-spin" />} title={task.status === 'PENDING' ? '等待转录' : '正在转录'} description="转录完成后会自动显示结果" />
        ) : null}

        {task?.status === 'SUCCEEDED' ? (
          <article className="whitespace-pre-wrap wrap-break-word text-sm leading-7 text-foreground text-justify">{task.result || '转录已完成，但没有返回文本内容'}</article>
        ) : null}

        {task && !taskQuery.error && FAILED_STATUSES.has(task.status) ? (
          <div className="space-y-4">
            <ErrorAlert title="转录失败" message={task.reason || '转录任务未能完成，请重试'} />
            <Button variant="outline" disabled={retryMutation.isPending} onClick={() => submitTask('retry')}>
              {retryMutation.isPending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
              {retryMutation.isPending ? '重试中' : '重试'}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
