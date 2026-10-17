import { Avatar, AvatarFallback, AvatarImage, Badge, Button, toast } from '@r/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { Route as ApiRoute } from '@tuyau/core/types';
import dayjs from 'dayjs';
import { LoaderCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useRefreshPosts } from '#/features/douyin-post/shared';
import { useConfirm } from '#/providers/confirm-dialog-provider';
import { normalizeApiFailedMessage, query } from '#/services/api';

type Creator = ApiRoute.Response<'douyin_creators.list'>['data']['list'][number];

function formatCount(value: number) {
  if (value >= 100_000_000) return `${Number((value / 100_000_000).toFixed(1))}亿`;
  if (value >= 10_000) return `${Number((value / 10_000).toFixed(1))}万`;
  return String(value);
}

function formatIpLocation(v: string | null) {
  if (!v) return '-';
  return v.replace('IP属地：', '');
}

export function CreatorCard({ creator, onRemoved }: { creator: Creator; onRemoved: () => void }) {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const refreshPosts = useRefreshPosts();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: query.douyinCreators.list.queryKey() });
  const retry = useMutation({
    ...query.douyinCreators.retry.mutationOptions(),
    onSuccess: () => {
      void invalidate();
    },
    onError: (error) => {
      toast.add({ type: 'error', description: normalizeApiFailedMessage(error) || '重试失败' });
      void invalidate();
    },
  });
  const remove = useMutation({
    ...query.douyinCreators.remove.mutationOptions(),
    onSuccess: () => {
      void refreshPosts();
      onRemoved();
    },
    onError: (error) => {
      toast.add({ type: 'error', description: normalizeApiFailedMessage(error) || '删除失败' });
    },
  });
  const processing = creator.currentTask?.status === 'processing';
  const failed = creator.currentTask?.status === 'failed';
  const hasSnapshot = Boolean(creator.lastSyncedAt);
  const name = creator.nickname || (processing ? '博主资料采集中' : '待获取博主资料');

  const handleRetry = async () => {
    if (processing || retry.isPending || remove.isPending) return;
    const confirmed = await confirm({
      title: '确认付费采集',
      description: '重新采集将产生费用，是否继续？',
      confirmBtnText: '确认并采集',
    });
    if (confirmed) retry.mutate({ params: { id: creator.id } });
  };

  const handleRemove = async () => {
    if (
      await confirm({
        title: '删除博主',
        description: '将永久删除该博主及其全部作品、下载任务、搜索记录和资料采集任务，同时删除作品文件。进行中的任务结果将被丢弃，且无法恢复。',
        confirmBtnText: '全部删除',
        danger: true,
      })
    ) {
      remove.mutate({ params: { id: creator.id } });
    }
  };

  return (
    <article className="flex min-w-0 flex-col gap-2.5 rounded-lg border bg-card p-3 text-card-foreground shadow-xs">
      <div className="flex items-center gap-2.5">
        <Avatar className="size-11">
          {creator.avatarUrl ? <AvatarImage src={creator.avatarUrl} alt={creator.nickname || '博主头像'} /> : null}
          <AvatarFallback className="bg-orange-100 text-lg text-orange-700 dark:bg-orange-950 dark:text-orange-200">{Array.from(creator.nickname || '?')[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold" title={name}>
            {name}
          </h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">抖音号 {creator.uniqueId || '—'}</p>
        </div>
        {processing ? (
          <Badge variant="secondary">
            <LoaderCircle className="size-3 animate-spin" />
            采集中
          </Badge>
        ) : failed ? (
          <Badge variant="destructive">失败</Badge>
        ) : null}
      </div>
      {hasSnapshot ? (
        <>
          <p className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
            <span>获赞 {formatCount(creator.totalFavorited)}</span>
            <span aria-hidden="true">·</span>
            <span>关注 {formatCount(creator.followingCount)}</span>
            <span aria-hidden="true">·</span>
            <span>粉丝 {formatCount(creator.followerCount)}</span>
          </p>
          <p className="line-clamp-2 h-10 shrink-0 break-all text-xs leading-5 text-muted-foreground" title={creator.signature || undefined}>
            {creator.signature || '—'}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>IP 属地：{formatIpLocation(creator.ipLocation)}</span>
            <span className="break-all">UID：{creator.uid || '—'}</span>
          </div>
        </>
      ) : (
        <p className="line-clamp-2 h-10 shrink-0 break-all text-xs leading-5 text-muted-foreground" title={creator.sourceUrl}>
          {creator.sourceUrl}
        </p>
      )}
      {failed ? (
        <p className="wrap-break-word text-xs text-destructive" role="alert">
          {creator.currentTask?.reason || '采集失败，请重试'}
        </p>
      ) : null}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span>
            作品 {hasSnapshot ? formatCount(creator.awemeCount) : '—'} · 已下载 {creator.downloadedCount}
          </span>
          <Link to="/douyin-creators/$id" params={{ id: String(creator.id) }} className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-accent">
            查看详情
          </Link>
        </div>
        <div className="flex items-center justify-between gap-2 border-t pt-1.5">
          <span className="text-xs text-muted-foreground">{creator.lastSyncedAt ? `更新于 ${dayjs(creator.lastSyncedAt).format('YYYY-MM-DD HH:mm')}` : '尚未同步'}</span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="重新采集"
              aria-label={`重试采集 ${name}`}
              disabled={processing || retry.isPending || remove.isPending}
              onClick={handleRetry}
            >
              <RefreshCw className={retry.isPending ? 'animate-spin' : undefined} />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" title="删除卡片" aria-label={`删除 ${name}`} disabled={remove.isPending} onClick={handleRemove}>
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
