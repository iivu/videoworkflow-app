import { Alert, AlertDescription, AlertTitle, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@r/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { useState } from 'react';
import { useWheelHorizontalScroll } from '#/hooks/use-wheel-horizontal-scroll';
import { Route } from '#/routes/_auth/video-breakdown/$id';
import { normalizeApiFailedMessage, query } from '#/services/api';
import { EditChatPanel } from './edit-chat-panel';

export type Segment = { start: string; end: string; summary?: string; file: string };
type Task = { videoUrl: string; status: string; result?: string | Segment[] | null };
const statusLabels: Record<string, string> = { pending: '排队中', processing: '处理中', completed: '已完成', failed: '失败' };

export function VideoBreakdownDetailPage() {
  const { id } = Route.useParams();
  const taskQuery = useQuery(query.videoBreakdown.show.queryOptions({ params: { taskId: id } }));
  if (taskQuery.isLoading)
    return (
      <main className="min-h-(--content-min-height) p-6">
        <Skeleton className="h-[70vh] w-full" />
      </main>
    );
  if (taskQuery.error || !taskQuery.data?.data)
    return (
      <main className="flex min-h-(--content-min-height) items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle />
          <AlertTitle>拆解任务加载失败</AlertTitle>
          <AlertDescription>{normalizeApiFailedMessage(taskQuery.error) || '任务不存在或无权访问'}</AlertDescription>
        </Alert>
      </main>
    );
  const task = taskQuery.data.data as Task;
  if (task.status !== 'completed')
    return (
      <main className="flex min-h-(--content-min-height) items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>任务尚未完成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>当前状态：{statusLabels[task.status] ?? task.status}。完成后才能查看拆解结果。</p>
            <Link to="/video-breakdown" className="inline-flex items-center gap-2 text-primary hover:underline">
              <ArrowLeft className="size-4" />
              返回任务列表
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  const segments = parseSegments(task.result);
  return (
    <main className="h-(--content-min-height) overflow-x-auto overflow-y-hidden bg-background flex min-w-225 flex-col">
      <BreakdownHeader videoUrl={task.videoUrl} />
      <BreakdownWorkspace taskId={id} segments={segments} />
    </main>
  );
}

function BreakdownHeader({ videoUrl }: { videoUrl: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-13 shrink-0 items-center gap-3 border-b px-4">
      <button
        type="button"
        onClick={() => navigate({ to: '/video-breakdown' })}
        className="inline-flex size-8 items-center justify-center rounded-md border bg-background hover:bg-muted"
        aria-label="返回任务列表"
      >
        <ArrowLeft className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold">视频拆解结果</h1>
        <p className="truncate text-xs text-muted-foreground">{videoUrl}</p>
      </div>
    </div>
  );
}

function BreakdownWorkspace({ taskId, segments }: { taskId: string; segments: Segment[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedSegment = segments[selectedIndex] ?? segments[0];
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(520px,1.55fr)_minmax(360px,0.75fr)]">
      <div className="flex min-h-0 min-w-0 flex-col">
        <VideoPreview segment={selectedSegment} />
        <SegmentRail segments={segments} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
      </div>
      <EditChatPanel taskId={taskId} segments={segments} selectedIndex={selectedIndex} />
    </div>
  );
}

function VideoPreview({ segment }: { segment?: Segment }) {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center bg-black">
      {segment ? (
        /* biome-ignore lint/a11y/useMediaCaption: segment captions are not available from the breakdown API. */
        <video autoPlay key={segment.file} src={getAssetUrl(segment.file)} controls className="h-full w-full rounded-sm object-contain" />
      ) : (
        <p className="text-sm text-white/60">暂无可预览的切片</p>
      )}
    </section>
  );
}

function SegmentRail({ segments, selectedIndex, onSelect }: { segments: Segment[]; selectedIndex: number; onSelect: (index: number) => void }) {
  const railRef = useWheelHorizontalScroll();
  return (
    <section ref={railRef} className="flex h-48 shrink-0 border-t overflow-x-auto">
      {segments.length ? (
        segments.map((segment, index) => (
          <SegmentCard key={`${segment.file}-${index}`} segment={segment} index={index} selected={index === selectedIndex} onSelect={() => onSelect(index)} />
        ))
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">暂无视频分片</div>
      )}
    </section>
  );
}

function SegmentCard({ segment, index, selected, onSelect }: { segment: Segment; index: number; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-60 shrink-0 flex h-full flex-col py-2 pr-2 text-left transition-colors ${selected ? 'bg-muted' : 'hover:bg-muted/50'}`}
      aria-pressed={selected}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-sm bg-black">
        <video src={getAssetUrl(segment.file)} muted preload="metadata" className="h-full w-full object-cover" />
        {selected ? (
          <span
            className="pointer-events-none absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
            aria-hidden="true"
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 to-transparent px-2 pt-12 pb-2 text-white">
          <p className="mb-1 line-clamp-1 text-sm font-medium">{segment.summary || `分片 ${index + 1}`}</p>
          <p className="text-xs text-white/75">
            {segment.start} - {segment.end}
          </p>
        </div>
      </div>
    </button>
  );
}

function getAssetUrl(file: string) {
  return /^https?:\/\//.test(file) ? file : `${String(import.meta.env.VITE_API_URL).replace(/\/$/, '')}/${file.replace(/^\//, '')}`;
}

export { getAssetUrl };

function parseSegments(result: Task['result']): Segment[] {
  if (Array.isArray(result)) return result;
  if (!result) return [];
  try {
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed.filter((item): item is Segment => item && typeof item.file === 'string') : [];
  } catch {
    return [];
  }
}
