import { Alert, AlertDescription, AlertTitle, Button, Skeleton, toast } from '@r/ui';
import dayjs from 'dayjs';
import { AlertCircle, ArrowLeft, Bookmark, Check, Copy, Heart, MessageCircle, Share2 } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';

import type { VideoData } from '../components/video-edit-dialog';

export function PanelHeader({ id, icon, title, action }: { id: string; icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      <h2 id={id} className="text-sm font-semibold">
        {title}
      </h2>
      {action ? <div className="ml-auto flex items-center">{action}</div> : null}
    </header>
  );
}

export function DetailHeader({ video, onBack }: { video: VideoData; onBack: () => void }) {
  const stats: Array<{ icon: React.ReactNode; label: string; count: number }> = [
    { icon: <Heart className="size-4" />, label: '点赞', count: video.likeCount ?? 0 },
    { icon: <Bookmark className="size-4" />, label: '收藏', count: video.favoriteCount ?? 0 },
    { icon: <Share2 className="size-4" />, label: '分享', count: video.shareCount ?? 0 },
    { icon: <MessageCircle className="size-4" />, label: '评论', count: video.commentCount ?? 0 },
  ];
  const meta = [video.author ? `@${video.author}` : '', video.platform, video.publishAt ? dayjs(video.publishAt).format('YYYY-MM-DD') : ''].filter(Boolean).join(' · ');

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border bg-background hover:bg-muted"
        aria-label="返回视频库"
      >
        <ArrowLeft className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="max-w-md truncate text-lg font-semibold" title={video.title}>
          {video.title}
        </h1>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <div className="hidden shrink-0 items-center gap-5 xl:flex">
        {stats.map(({ icon, label, count }) => (
          <span key={label} className="flex items-center gap-1.5 text-sm text-muted-foreground" title={`${label}：${count}`}>
            {icon}
            {formatCount(count)}
          </span>
        ))}
      </div>
    </header>
  );
}

export function DetailHeaderSkeleton() {
  return (
    <div className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-4" role="status" aria-label="正在加载视频详情">
      <Skeleton className="size-8 rounded-md" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-3.5 w-1/3" />
      </div>
    </div>
  );
}

export const CopyButton = memo(function CopyButton({ text, label = '复制内容' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      toast.add({ type: 'error', description: '复制失败，请手动复制' });
    }
  }, [text]);

  return (
    <Button type="button" variant="ghost" size="icon-xs" aria-label={label} title={label} className="text-muted-foreground hover:text-foreground" onClick={() => void handleCopy()}>
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </Button>
  );
});

export function formatCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1).replace(/\.0$/, '')}w`;
  }
  return count.toString();
}

export function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-center">
      <span className="text-muted-foreground [&_svg]:size-8">{icon}</span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorAlert({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="wrap-break-word">{message}</AlertDescription>
    </Alert>
  );
}

export function TranscriptionSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="正在加载转录任务">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

export function VideoPanelSkeleton() {
  return (
    <section className="flex min-h-100 shrink-0 flex-col border-b bg-background xl:min-h-0 xl:border-b-0 xl:border-r" role="status" aria-label="正在加载视频播放器">
      <Skeleton className="min-h-0 flex-1 rounded-none" />
    </section>
  );
}
