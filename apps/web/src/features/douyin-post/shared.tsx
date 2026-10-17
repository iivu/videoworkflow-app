import { Alert, AlertDescription, Button, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@r/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Route as ApiRoute } from '@tuyau/core/types';
import dayjs from 'dayjs';
import { useId, useState } from 'react';
import { Pagination } from '#/components/pagination';
import { normalizeApiFailedMessage, query } from '#/services/api';

export type Filters = { startDate?: string; endDate?: string; minLikes?: number; minCollects?: number; minComments?: number };
export type SearchRecord = ApiRoute.Response<'douyin_posts.searches_list'>['data']['list'][number];
export type ResultPost = ApiRoute.Response<'douyin_posts.results'>['data']['list'][number];
export type Work = ApiRoute.Response<'douyin_posts.works'>['data']['list'][number];
export const formatTime = (value: string | null | undefined) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—');
export const statusLabel = (status: string) => ({ processing: '处理中', queued: '排队中', completed: '已完成', failed: '失败' })[status] ?? status;

export function RequestError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{normalizeApiFailedMessage(error as Parameters<typeof normalizeApiFailedMessage>[0]) || '请求失败，请重试'}</AlertDescription>
    </Alert>
  );
}

export function useRefreshPosts() {
  const cache = useQueryClient();
  return () =>
    Promise.all(
      [
        query.douyinPosts.searchesList.queryKey(),
        query.douyinPosts.searchShow.queryKey(),
        query.douyinPosts.results.queryKey(),
        query.douyinPosts.batches.queryKey(),
        query.douyinPosts.tasks.queryKey(),
        query.douyinPosts.works.queryKey(),
        query.douyinCreators.list.queryKey(),
        query.douyinCreators.show.queryKey(),
      ].map((queryKey) => cache.invalidateQueries({ queryKey })),
    );
}

export function CreatorPicker({
  value,
  onChange,
  disabled = false,
  allowAll = false,
}: {
  value: number | undefined;
  onChange: (id: number | undefined) => void;
  disabled?: boolean;
  allowAll?: boolean;
}) {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const creators = useQuery(query.douyinCreators.list.queryOptions({ query: { keyword: keyword || undefined, page, size: 12 } }));
  return (
    <div className="space-y-2">
      <Input
        aria-label="查找已有博主"
        placeholder="按昵称或抖音号查找已有博主"
        value={keyword}
        disabled={disabled}
        onChange={(event) => {
          setKeyword(event.target.value);
          setPage(1);
        }}
      />
      <select
        aria-label="选择已有博主"
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        disabled={disabled || creators.isLoading}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)}
      >
        <option value="">{allowAll ? '全部博主' : '请选择已有博主'}</option>
        {value && !creators.data?.data.list.some((creator) => creator.id === value) ? <option value={value}>已选择博主 #{value}</option> : null}
        {creators.data?.data.list.map((creator) => (
          <option key={creator.id} value={creator.id}>
            {creator.nickname || creator.sourceUrl} · {creator.awemeCount} 个作品
          </option>
        ))}
      </select>
      <RequestError error={creators.error} />
      <Pagination size={12} currentPage={page} total={creators.data?.data.meta.total ?? 0} onPageChange={setPage} />
    </div>
  );
}

export function FilterFields({ value, onChange, disabled = false }: { value: Filters; onChange: (filters: Filters) => void; disabled?: boolean }) {
  const prefix = useId();
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {(
        [
          { key: 'startDate', label: '发布开始日期', type: 'date' },
          { key: 'endDate', label: '发布结束日期', type: 'date' },
          { key: 'minLikes', label: '点赞不低于', type: 'number' },
          { key: 'minCollects', label: '收藏不低于', type: 'number' },
          { key: 'minComments', label: '评论不低于', type: 'number' },
        ] as const
      ).map((field) => (
        <div className="space-y-1.5" key={field.key}>
          <Label htmlFor={`${prefix}-${field.key}`}>{field.label}</Label>
          <Input
            id={`${prefix}-${field.key}`}
            type={field.type}
            min={field.type === 'number' ? 0 : undefined}
            step={field.type === 'number' ? 1 : undefined}
            disabled={disabled}
            value={value[field.key] ?? ''}
            onChange={(event) => onChange({ ...value, [field.key]: event.target.value ? (field.type === 'number' ? Number(event.target.value) : event.target.value) : undefined })}
          />
        </div>
      ))}
    </div>
  );
}

export function PostsTable({
  posts,
  selected,
  onSelected,
  onDownload,
  downloading = false,
  readOnly = false,
}: {
  posts: ResultPost[];
  selected?: Set<string>;
  onSelected?: (ids: Set<string>) => void;
  onDownload?: (ids: string[]) => void;
  downloading?: boolean;
  readOnly?: boolean;
}) {
  const selectable = posts.filter((post) => post.downloadable && !post.downloaded && !post.downloading);
  const allSelected = selectable.length > 0 && selectable.every((post) => selected?.has(post.awemeId));
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {!readOnly ? (
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="选择当前页可下载作品"
                  checked={allSelected}
                  disabled={!selectable.length || downloading}
                  onChange={() => onSelected?.(allSelected ? new Set() : new Set(selectable.map((post) => post.awemeId)))}
                />
              </TableHead>
            ) : null}
            <TableHead>封面</TableHead>
            <TableHead>视频 ID / 标题</TableHead>
            <TableHead>发布时间</TableHead>
            <TableHead>点赞 / 收藏 / 评论</TableHead>
            <TableHead>时长</TableHead>
            <TableHead>原页</TableHead>
            {!readOnly ? <TableHead>操作</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.length ? (
            posts.map((post, index) => (
              <TableRow key={post.awemeId || `missing-${index}`}>
                {!readOnly ? (
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`选择 ${post.title || post.awemeId}`}
                      checked={selected?.has(post.awemeId) ?? false}
                      disabled={!post.downloadable || post.downloaded || post.downloading || downloading}
                      onChange={(event) => {
                        const next = new Set(selected);
                        if (event.target.checked) next.add(post.awemeId);
                        else next.delete(post.awemeId);
                        onSelected?.(next);
                      }}
                    />
                  </TableCell>
                ) : null}
                <TableCell>
                  {post.coverUrl ? (
                    <img className="h-20 w-14 rounded object-cover" src={post.coverUrl} alt="作品封面" loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="min-w-60 max-w-96 whitespace-normal">
                  <p className="line-clamp-2">{post.title || '无标题'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{post.awemeId || '缺少作品 ID'}</p>
                </TableCell>
                <TableCell className="whitespace-nowrap">{post.publishedAt ? dayjs(post.publishedAt * 1000).format('YYYY-MM-DD HH:mm') : '—'}</TableCell>
                <TableCell>
                  {post.likes.toLocaleString()} / {post.collects.toLocaleString()} / {post.comments.toLocaleString()}
                </TableCell>
                <TableCell>{post.duration ? `${Math.floor(post.duration / 60000)}:${String(Math.floor(post.duration / 1000) % 60).padStart(2, '0')}` : '—'}</TableCell>
                <TableCell>
                  {post.shareUrl ? (
                    <a className="text-primary hover:underline" href={post.shareUrl} target="_blank" rel="noreferrer">
                      打开原页
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
                {!readOnly ? (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!post.downloadable || post.downloaded || post.downloading || downloading}
                      onClick={() => onDownload?.([post.awemeId])}
                    >
                      {post.downloaded ? '已下载' : post.downloading ? '下载中' : post.downloadable ? '下载' : '无可用视频'}
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={readOnly ? 7 : 9} className="h-32 text-center text-muted-foreground">
                没有符合条件的作品
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
