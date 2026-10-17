import { Alert, AlertDescription, Button, buttonVariants, Input, Label, toast } from '@r/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Download, History, LoaderCircle, Search } from 'lucide-react';
import { useState } from 'react';
import { Pagination } from '#/components/pagination';
import { normalizeApiFailedMessage, query } from '#/services/api';
import { DownloadTasksDialog, SearchHistoryDialog } from './dialogs';
import { CreatorPicker, FilterFields, type Filters, formatTime, PostsTable, RequestError, statusLabel, useRefreshPosts } from './shared';

export function DouyinPostSearchPage() {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [creatorId, setCreatorId] = useState<number>();
  const [source, setSource] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [resultFilters, setResultFilters] = useState<Filters | null>(null);
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const refresh = useRefreshPosts();
  const history = useQuery({
    ...query.douyinPosts.searchesList.queryOptions({ query: { page: 1, size: 1 } }),
    refetchInterval: (current) => (current.state.data?.data.activeId ? 2000 : false),
    refetchOnMount: 'always',
  });
  const currentId = Math.max(history.data?.data.activeId ?? 0, submittedId ?? 0, history.data?.data.list[0]?.id ?? 0) || null;
  const current = useQuery({
    ...query.douyinPosts.searchShow.queryOptions({ params: { id: currentId ?? 0 } }),
    enabled: currentId !== null,
    refetchInterval: (record) => (record.state.data?.data.status === 'processing' ? 2000 : record.state.data?.data.cacheValid ? 30000 : false),
  });
  const record = current.data?.data;
  const processing = Boolean(history.data?.data.activeId || record?.status === 'processing');
  const results = useQuery({
    ...query.douyinPosts.results.queryOptions({ params: { id: currentId ?? 0 }, query: { page, size: 20, ...(resultFilters ? { custom: true, ...resultFilters } : {}) } }),
    enabled: Boolean(record?.status === 'completed' && (record.cacheValid || !record.fetchedCount)),
    refetchInterval: record?.cacheValid ? 10000 : false,
  });
  const create = useMutation({
    ...query.douyinPosts.search.mutationOptions(),
    onSuccess: (response) => {
      setSubmittedId(response.data.id);
      setResultFilters(null);
      setPage(1);
      setSelected(new Set());
      void refresh();
    },
    onError: () => {
      void refresh();
    },
  });
  const download = useMutation({
    ...query.douyinPosts.download.mutationOptions(),
    onSuccess: (response) => {
      setSelected(new Set());
      setTasksOpen(true);
      void refresh();
      toast.add({ type: 'success', description: response.data.count ? `已提交 ${response.data.count} 个下载任务` : '所选作品已下载或正在下载' });
    },
    onError: (error) => toast.add({ type: 'error', description: normalizeApiFailedMessage(error) || '提交下载失败' }),
  });
  const startDownload = (ids: string[]) => {
    if (!currentId || !record || !ids.length) return;
    download.mutate({ body: { searchId: currentId, awemeIds: ids, ...(resultFilters ?? record.filters) } });
  };
  return (
    <main className="space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">博主作品搜索下载</h1>
          <p className="mt-1 text-sm text-muted-foreground">先搜索筛选，再将需要的视频保存到对应博主的已下载作品。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setHistoryOpen(true)}>
            <History />
            搜索记录
          </Button>
          <Button variant="outline" onClick={() => setTasksOpen(true)}>
            <Download />
            下载任务
          </Button>
          {record?.creatorId ? (
            <Link to="/douyin-creators/$id" params={{ id: String(record.creatorId) }} className={buttonVariants({ variant: 'outline' })}>
              博主详情
            </Link>
          ) : (
            <Link to="/douyin-creators" className={buttonVariants({ variant: 'outline' })}>
              博主库
            </Link>
          )}
        </div>
      </header>
      <form
        className="space-y-4 rounded-lg border bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (processing || create.isPending) return;
          create.mutate({ body: { ...(mode === 'existing' ? { creatorId } : { source: source.trim() }), ...filters } });
        }}
      >
        <div className="flex items-center gap-4">
          <h2 className="font-medium">抓取设置</h2>
          <span className="text-xs text-muted-foreground">最多获取 10,000 条，仅获取公开作品；作品数量以已入库资料为准。</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={mode === 'existing' ? 'default' : 'outline'} disabled={processing || create.isPending} onClick={() => setMode('existing')}>
            选择已有博主
          </Button>
          <Button type="button" size="sm" variant={mode === 'new' ? 'default' : 'outline'} disabled={processing || create.isPending} onClick={() => setMode('new')}>
            输入链接 / sec_uid
          </Button>
        </div>
        {mode === 'existing' ? (
          <CreatorPicker value={creatorId} onChange={setCreatorId} disabled={processing || create.isPending} />
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="post-source">博主主页 URL、分享短链接或 sec_uid</Label>
            <Input
              id="post-source"
              maxLength={255}
              required
              value={source}
              disabled={processing || create.isPending}
              onChange={(event) => setSource(event.target.value)}
              placeholder="https://www.douyin.com/user/MS4wLj…"
            />
          </div>
        )}
        <FilterFields value={filters} onChange={setFilters} disabled={processing || create.isPending} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={history.isLoading || Boolean(history.error) || processing || create.isPending || (mode === 'existing' ? !creatorId : !source.trim())}>
            {processing || create.isPending ? <LoaderCircle className="animate-spin" /> : <Search />}
            {processing ? '搜索进行中' : '开始搜索'}
          </Button>
          <Button type="button" variant="outline" disabled={processing || create.isPending} onClick={() => setFilters({})}>
            重置条件
          </Button>
          <p className="text-xs text-destructive">采集将产生费用；新博主需先采集资料再查询作品，可能产生两阶段费用。命中七天缓存不重复查询。</p>
        </div>
        <RequestError error={create.error || history.error} />
      </form>
      <RequestError error={current.error} />
      {record ? (
        <section className="space-y-4 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">{record.creatorName || record.source}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatTime(record.createdAt)} · {statusLabel(record.status)} · 原始作品 {record.fetchedCount} 条
              </p>
            </div>
            {record.status === 'completed' ? (
              <span className="text-sm">
                符合条件 {results.data?.data.meta.total ?? record.matchedCount} 条 · 可下载 {results.data?.data.downloadableCount ?? 0} 条
              </span>
            ) : null}
          </div>
          {record.status === 'processing' ? (
            <p role="status" className="flex items-center gap-2 text-sm">
              <LoaderCircle className="size-4 animate-spin" />
              正在后台入库或获取作品，离开页面不会中断。
            </p>
          ) : null}
          {record.reason ? (
            <Alert variant="destructive">
              <AlertDescription>{record.reason}</AlertDescription>
            </Alert>
          ) : null}
          {record.status === 'completed' && record.cacheValid ? (
            <>
              <p className="text-xs text-muted-foreground">
                {record.cacheHit ? '使用缓存' : '已获取作品'} · 获取于 {formatTime(record.fetchedAt)} · 缓存到期 {formatTime(record.cacheExpiresAt)}
                。仅对已有结果筛选不产生查询费用。
              </p>
              <FilterFields
                value={resultFilters ?? record.filters}
                onChange={(next) => {
                  setResultFilters(next);
                  setPage(1);
                  setSelected(new Set());
                }}
              />
              <Button disabled={!selected.size || download.isPending} onClick={() => startDownload([...selected])}>
                <Download />
                下载选中视频（{selected.size}）
              </Button>
              <p className="text-xs text-muted-foreground">勾选仅作用于当前页。下载在后台转存至 OSS，可在下载任务中查看进度。</p>
            </>
          ) : record.status === 'completed' ? (
            <p className="text-sm text-muted-foreground">{record.fetchedCount ? '结果缓存已失效，请重新搜索。' : '暂无作品；可到博主库刷新资料后再搜索。'}</p>
          ) : null}
        </section>
      ) : !history.isLoading ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">选择一位博主，开始搜索公开作品。</div>
      ) : null}
      {record?.status === 'completed' && record.cacheValid ? (
        <>
          <RequestError error={results.error} />
          {results.isLoading ? (
            <p role="status">正在加载作品…</p>
          ) : !results.error ? (
            <PostsTable posts={results.data?.data.list ?? []} selected={selected} onSelected={setSelected} onDownload={startDownload} downloading={download.isPending} />
          ) : null}
          <Pagination
            size={20}
            currentPage={page}
            total={results.data?.data.meta.total ?? 0}
            onPageChange={(next) => {
              setPage(next);
              setSelected(new Set());
            }}
          />
        </>
      ) : null}
      <SearchHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
      <DownloadTasksDialog open={tasksOpen} onOpenChange={setTasksOpen} />
    </main>
  );
}
