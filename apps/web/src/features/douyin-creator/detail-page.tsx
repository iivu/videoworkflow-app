import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  toast,
} from '@r/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { ArrowLeft, Bookmark, Download, ExternalLink, Heart, MessageCircle, MoreVertical, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Pagination } from '#/components/pagination';
import { DownloadTasksDialog } from '#/features/douyin-post/dialogs';
import { formatTime, RequestError, useRefreshPosts, type Work } from '#/features/douyin-post/shared';
import { useConfirm } from '#/providers/confirm-dialog-provider';
import { Route } from '#/routes/_auth/douyin-creators/$id';
import { normalizeApiFailedMessage, query } from '#/services/api';

export function DouyinCreatorDetailPage() {
  const { id } = Route.useParams();
  return <CreatorDetail key={id} creatorId={Number(id)} />;
}

function CreatorDetail({ creatorId }: { creatorId: number }) {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [keyword, setKeyword] = useState(search.keyword);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [playing, setPlaying] = useState<Work | null>(null);
  const { confirm } = useConfirm();
  const refresh = useRefreshPosts();
  const profile = useQuery({
    ...query.douyinCreators.show.queryOptions({ params: { id: creatorId } }),
    refetchInterval: (current) => (current.state.data?.data.currentTask?.status === 'processing' ? 2000 : false),
    refetchOnMount: 'always',
  });
  const creator = profile.data?.data;
  const works = useQuery(query.douyinPosts.works.queryOptions({ query: { ...search, creatorId, keyword: search.keyword || undefined } }));
  const remove = useMutation({
    ...query.douyinPosts.remove.mutationOptions(),
    onSuccess: () => {
      void refresh();
      if (works.data?.data.list.length === 1 && search.page > 1) void navigate({ search: { ...search, page: search.page - 1 } });
    },
    onError: (error) => toast.add({ type: 'error', description: normalizeApiFailedMessage(error) || '删除失败' }),
  });
  if (!creator || profile.isError) {
    return (
      <main className="space-y-4 p-4 md:p-6">
        <Link to="/douyin-creators" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          返回博主库
        </Link>
        {profile.isPending ? <p role="status">正在加载博主详情…</p> : <RequestError error={profile.error} />}
        {profile.isError ? (
          <Button variant="outline" onClick={() => void profile.refetch()}>
            重新加载
          </Button>
        ) : null}
      </main>
    );
  }
  const name = creator.nickname || '待获取博主资料';
  const status = creator.currentTask?.status;
  const stats = [
    { label: '粉丝', value: creator.followerCount },
    { label: '获赞', value: creator.totalFavorited },
    { label: '关注', value: creator.followingCount },
    { label: '喜欢', value: creator.favoritingCount },
    { label: '发布作品', value: creator.awemeCount },
    { label: '已下载作品', value: creator.downloadedCount, local: true },
  ];
  return (
    <main className="space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/douyin-creators" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          返回博主库
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setTasksOpen(true)}>
            <Download />
            下载任务
          </Button>
          <Link to="/douyin-download" className="inline-flex items-center gap-2 rounded-md border px-3 text-sm hover:bg-accent">
            <Search className="size-4" />
            搜索下载
          </Link>
        </div>
      </header>
      <section aria-label="博主资料" className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-12 shrink-0">
            <AvatarImage src={creator.avatarUrl ?? undefined} alt={name} />
            <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-lg font-semibold">{name}</h1>
              {status === 'processing' ? <Badge variant="secondary">资料采集中</Badge> : status === 'failed' ? <Badge variant="destructive">采集失败</Badge> : null}
              {creator.secUid ? (
                <a
                  href={`https://www.douyin.com/user/${creator.secUid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  抖音主页
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              抖音号 {creator.uniqueId || '—'} · {creator.ipLocation || 'IP 属地未知'}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm leading-5">{creator.signature || '暂无博主简介'}</p>
            {!creator.secUid ? <p className="break-all text-xs text-muted-foreground">添加来源：{creator.sourceUrl}</p> : null}
          </div>
        </div>
        {status === 'failed' ? (
          <p role="alert" className="text-sm text-destructive">
            {creator.currentTask?.reason || '资料采集失败，可返回博主库重试。'}
          </p>
        ) : null}
        <dl className="flex flex-wrap gap-x-8 gap-y-2 border-y py-2">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{creator.lastSyncedAt || stat.local ? (stat.value ?? 0).toLocaleString('zh-CN') : '—'}</dd>
            </div>
          ))}
        </dl>
        <dl className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex min-w-0 items-baseline gap-2">
            <dt className="shrink-0 text-muted-foreground">UID</dt>
            <dd className="truncate" title={creator.uid || '—'}>
              {creator.uid || '—'}
            </dd>
          </div>
          <div className="flex min-w-0 items-baseline gap-2">
            <dt className="shrink-0 text-muted-foreground">sec_uid</dt>
            <dd className="truncate" title={creator.secUid || '—'}>
              {creator.secUid || '—'}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="shrink-0 text-muted-foreground">入库时间</dt>
            <dd>{formatTime(creator.createdAt)}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="shrink-0 text-muted-foreground">最近采集</dt>
            <dd>{formatTime(creator.lastSyncedAt)}</dd>
          </div>
        </dl>
      </section>
      <section aria-label="已下载作品" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              已下载作品 <span className="ml-1 text-sm font-normal text-muted-foreground">{works.data?.data.meta.total ?? creator.downloadedCount} 个</span>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">仅展示该博主已成功保存到 OSS 的作品，与视频库独立管理。</p>
          </div>
          <form
            className="flex items-start gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void navigate({ search: { ...search, keyword: keyword.trim(), page: 1 } });
            }}
          >
            <Input aria-label="搜索作品标题" placeholder="搜索作品标题" value={keyword} maxLength={128} onChange={(event) => setKeyword(event.target.value)} />
            <Button type="submit" variant="outline">
              <Search />
              搜索
            </Button>
          </form>
        </div>
        <RequestError error={works.error} />
        {works.isLoading ? (
          <p role="status">正在加载作品…</p>
        ) : works.data?.data.list.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {works.data.data.list.map((work) => (
              <article key={work.id} className="group relative min-w-0 overflow-hidden rounded-sm shadow-sm">
                <div className="relative aspect-3/4 bg-gray-100">
                  <button type="button" className="absolute inset-0 size-full cursor-pointer" aria-label={`播放 ${work.title || work.awemeId}`} onClick={() => setPlaying(work)}>
                    {work.coverUrl ? (
                      <img className="size-full object-cover" src={work.coverUrl} alt={work.title || '作品封面'} loading="lazy" />
                    ) : (
                      <video
                        className="size-full object-cover"
                        src={work.videoUrl}
                        muted
                        playsInline
                        preload="metadata"
                        onLoadedMetadata={(event) => {
                          event.currentTarget.currentTime = 0.001;
                        }}
                      />
                    )}
                  </button>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`作品操作 ${work.title || work.awemeId}`}
                          className="absolute top-2 right-2 text-white transition-opacity hover:bg-black/30 hover:text-white focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        />
                      }
                    >
                      <MoreVertical />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {work.shareUrl ? (
                        <DropdownMenuItem render={<a href={work.shareUrl} target="_blank" rel="noreferrer" />}>
                          <ExternalLink />
                          打开抖音原页
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={remove.isPending}
                        onClick={async () => {
                          if (await confirm({ title: '删除作品', description: '将同时删除保存的 OSS 视频和封面，此操作不可撤销。', confirmBtnText: '删除', danger: true }))
                            remove.mutate({ params: { id: work.id } });
                        }}
                      >
                        <Trash2 />
                        删除作品
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/35 to-transparent px-2 pb-1.5 pt-8">
                    <div className="flex items-center gap-2 text-center text-white drop-shadow-md">
                      {[
                        { label: '点赞', Icon: Heart, count: work.likes },
                        { label: '收藏', Icon: Bookmark, count: work.collects },
                        { label: '评论', Icon: MessageCircle, count: work.comments },
                      ].map(({ label, Icon, count }) => (
                        <div key={label} className="flex flex-col items-center" title={`${label} ${count}`}>
                          <Icon className="size-5" />
                          <span className="sr-only">{label}</span>
                          <span className="mt-0.5 text-xs">{count >= 10000 ? `${(count / 10000).toFixed(1).replace(/\.0$/, '')}w` : count.toString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="px-3 py-2 text-sm">
                  <h3 className="line-clamp-2 h-12 break-all leading-6" title={work.title || '无标题'}>
                    {work.title || '无标题'}
                  </h3>
                  <p className="mt-2 mb-1 truncate text-muted-foreground" title={work.creatorName || '抖音博主'}>
                    @{work.creatorName || '抖音博主'}
                  </p>
                  <p className="text-xs text-muted-foreground">发布日期：{work.publishedAt ? dayjs(work.publishedAt * 1000).format('YYYY-MM-DD') : '未知'}</p>
                </div>
              </article>
            ))}
          </div>
        ) : !works.error ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground md:p-16">
            {search.keyword ? '没有找到匹配的已下载作品，请调整标题关键词。' : '该博主暂无已下载作品，请先到搜索下载页选择作品。'}
          </div>
        ) : null}
        <Pagination
          size={search.size}
          currentPage={search.page}
          total={works.data?.data.meta.total ?? 0}
          onPageChange={(page) => {
            void navigate({ search: { ...search, page } });
          }}
        />
      </section>
      <Dialog
        open={playing !== null}
        onOpenChange={(open) => {
          if (!open) setPlaying(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] w-[min(calc(100%-2rem),calc(70dvh*9/16+2rem))] overflow-y-auto sm:max-w-md">
          <DialogHeader className="min-w-0 pr-6">
            <DialogTitle className="truncate leading-normal" title={playing?.title || '作品播放'}>
              {playing?.title || '作品播放'}
            </DialogTitle>
          </DialogHeader>
          {playing ? (
            <video
              key={playing.id}
              src={playing.videoUrl}
              poster={playing.coverUrl ?? undefined}
              controls
              muted
              playsInline
              preload="metadata"
              className="aspect-[9/16] w-full rounded bg-black object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <DownloadTasksDialog
        open={tasksOpen}
        onOpenChange={(open) => {
          setTasksOpen(open);
          if (!open) void refresh();
        }}
      />
    </main>
  );
}
