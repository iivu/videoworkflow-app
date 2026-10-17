import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, toast } from '@r/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pagination } from '#/components/pagination';
import { useConfirm } from '#/providers/confirm-dialog-provider';
import { normalizeApiFailedMessage, query } from '#/services/api';
import { formatTime, PostsTable, RequestError, statusLabel, useRefreshPosts } from './shared';

export function SearchHistoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [page, setPage] = useState(1);
  const [resultId, setResultId] = useState<number | null>(null);
  const [resultPage, setResultPage] = useState(1);
  const refresh = useRefreshPosts();
  const { confirm } = useConfirm();
  const history = useQuery({
    ...query.douyinPosts.searchesList.queryOptions({ query: { page, size: 10 } }),
    enabled: open,
    refetchInterval: (current) => (current.state.data?.data.activeId ? 2000 : false),
  });
  const results = useQuery({
    ...query.douyinPosts.results.queryOptions({ params: { id: resultId ?? 0 }, query: { page: resultPage, size: 20 } }),
    enabled: open && resultId !== null,
  });
  const invalidate = useMutation({
    ...query.douyinPosts.invalidate.mutationOptions(),
    onSuccess: () => {
      void refresh();
    },
    onError: (error) => toast.add({ type: 'error', description: normalizeApiFailedMessage(error) || '缓存失效操作失败' }),
  });
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setResultId(null);
          onOpenChange(next);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>搜索记录</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">仅保留搜索摘要。结果保存在七天缓存中，缓存失效后无法查看。</p>
          <RequestError error={history.error} />
          {history.isLoading ? <p role="status">正在加载记录…</p> : null}
          {history.data?.data.list.map((record) => (
            <article key={record.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg border p-4">
              <div className="min-w-0 space-y-2">
                <strong className="block truncate" title={record.creatorName || record.source}>
                  {record.creatorName || record.source}
                </strong>
                <p className="truncate text-xs text-muted-foreground">
                  {formatTime(record.createdAt)} · 获取 {record.fetchedCount} 条 · 匹配 {record.matchedCount} 条 · {record.cacheHit ? '缓存命中' : '非缓存命中'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  发布时间 {record.filters.startDate || '不限'} 至 {record.filters.endDate || '不限'}；点赞 ≥ {record.filters.minLikes ?? 0}，收藏 ≥{' '}
                  {record.filters.minCollects ?? 0}
                  ，评论 ≥ {record.filters.minComments ?? 0}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {record.cacheValid
                    ? `缓存到期：${formatTime(record.cacheExpiresAt)}`
                    : record.status === 'processing'
                      ? '正在获取结果'
                      : '结果缓存已失效或无作品，请前往搜索页重新搜索'}
                </p>
                {record.reason ? (
                  <p className="truncate text-sm text-destructive" title={record.reason}>
                    {record.reason}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-sm">{statusLabel(record.status)}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!record.cacheValid || record.status !== 'completed'}
                    onClick={() => {
                      setResultId(record.id);
                      setResultPage(1);
                    }}
                  >
                    查看结果
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!record.canInvalidate || invalidate.isPending}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: '使缓存失效',
                          description: '此操作影响所有用户共享的当前版本缓存。下次搜索将重新获取并可能产生费用；本次不会立即搜索。',
                          confirmBtnText: '使缓存失效',
                        })
                      )
                        invalidate.mutate({ params: { id: record.id } });
                    }}
                  >
                    使缓存失效
                  </Button>
                </div>
              </div>
            </article>
          ))}
          {!history.isLoading && !history.error && !history.data?.data.list.length ? <p className="py-10 text-center text-muted-foreground">暂无搜索记录</p> : null}
          <Pagination size={10} currentPage={page} total={history.data?.data.meta.total ?? 0} onPageChange={setPage} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={open && resultId !== null}
        onOpenChange={(next) => {
          if (!next) setResultId(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>搜索结果 · 只读</DialogTitle>
          </DialogHeader>
          <RequestError error={results.error} />
          {results.isLoading ? <p role="status">正在加载结果…</p> : !results.error ? <PostsTable posts={results.data?.data.list ?? []} readOnly /> : null}
          <Pagination size={20} currentPage={resultPage} total={results.data?.data.meta.total ?? 0} onPageChange={setResultPage} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DownloadTasksDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [page, setPage] = useState(1);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [taskPage, setTaskPage] = useState(1);
  const refresh = useRefreshPosts();
  const batches = useQuery({
    ...query.douyinPosts.batches.queryOptions({ query: { page, size: 10 } }),
    enabled: open,
    refetchInterval: (current) => (current.state.data?.data.hasProcessing ? 2000 : false),
  });
  const tasks = useQuery({
    ...query.douyinPosts.tasks.queryOptions({ params: { id: batchId ?? 0 }, query: { page: taskPage, size: 20 } }),
    enabled: open && batchId !== null,
    refetchInterval: batches.data?.data.hasProcessing ? 2000 : false,
  });
  const retry = useMutation({
    ...query.douyinPosts.retry.mutationOptions(),
    onSuccess: (response) => {
      toast.add({ type: 'success', description: response.data.count ? `已提交 ${response.data.count} 个重试任务` : '没有可重试的作品，可能已下载或正在下载' });
      void refresh();
    },
    onError: (error) => toast.add({ type: 'error', description: normalizeApiFailedMessage(error) || '重试失败' }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>下载任务</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">任务在后台转存至 OSS，关闭弹窗不影响执行。重试不会自动付费刷新视频链接。</p>
        <RequestError error={batches.error || tasks.error} />
        {batches.isLoading ? <p role="status">正在加载任务…</p> : null}
        {batches.data?.data.list.map((batch) => {
          const total = Object.values(batch.counts).reduce((sum, count) => sum + count, 0);
          const processed = (batch.counts.completed ?? 0) + (batch.counts.failed ?? 0);
          return (
            <article key={batch.id} className="min-w-0 space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>
                  {batch.creatorName || '抖音博主'} · 批次 #{batch.id}
                </strong>
                <span className="text-xs text-muted-foreground">{formatTime(batch.createdAt)}</span>
              </div>
              <p className="text-sm">
                共 {total} 条 · 成功 {batch.counts.completed ?? 0} · 失败 {batch.counts.failed ?? 0} · 进行中 {(batch.counts.queued ?? 0) + (batch.counts.processing ?? 0)}
              </p>
              <div
                role="progressbar"
                aria-label="批次完成进度"
                aria-valuemin={0}
                aria-valuemax={total || 1}
                aria-valuenow={processed}
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${(processed / (total || 1)) * 100}%` }} />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBatchId(batchId === batch.id ? null : batch.id);
                    setTaskPage(1);
                  }}
                >
                  {batchId === batch.id ? '收起明细' : '查看明细'}
                </Button>
                <Button size="sm" variant="ghost" disabled={!batch.counts.failed || retry.isPending} onClick={() => retry.mutate({ params: { id: batch.id }, body: {} })}>
                  重试本批失败项
                </Button>
              </div>
              {batchId === batch.id ? (
                <div className="space-y-2 border-t pt-3">
                  {tasks.isLoading ? <p role="status">正在加载明细…</p> : null}
                  {tasks.data?.data.list.map((task) => (
                    <div key={task.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate" title={task.title || task.awemeId}>
                          {task.title || task.awemeId}
                        </p>
                        <p className="text-xs wrap-anywhere text-muted-foreground">
                          {task.awemeId} · {statusLabel(task.status)}
                        </p>
                        {task.reason ? <p className="text-xs wrap-anywhere text-destructive">{task.reason}</p> : null}
                      </div>
                      {task.status === 'failed' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          disabled={retry.isPending}
                          onClick={() => retry.mutate({ params: { id: batch.id }, body: { taskId: task.id } })}
                        >
                          重试
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <Pagination size={20} currentPage={taskPage} total={tasks.data?.data.meta.total ?? 0} onPageChange={setTaskPage} />
                </div>
              ) : null}
            </article>
          );
        })}
        {!batches.isLoading && !batches.error && !batches.data?.data.list.length ? <p className="py-10 text-center text-muted-foreground">暂无下载任务</p> : null}
        <Pagination size={10} currentPage={page} total={batches.data?.data.meta.total ?? 0} onPageChange={setPage} />
      </DialogContent>
    </Dialog>
  );
}
