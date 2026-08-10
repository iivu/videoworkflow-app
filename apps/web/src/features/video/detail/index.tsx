import { Alert, AlertDescription, AlertTitle, Button, Skeleton } from '@r/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Bot, FileText, LoaderCircle, Play, RefreshCw, Video } from 'lucide-react';
import { useState } from 'react';

import { Route } from '#/routes/_auth/videos/$id';
import { normalizeApiFailedMessage, query } from '#/services/api';
import { VideoActionsMenuTrigger } from '../components/video-actions-menu';
import { type VideoData, VideoEditDialog } from '../components/video-edit-dialog';

const POLL_INTERVAL_MS = 5_000;
const ACTIVE_STATUSES = new Set(['PENDING', 'RUNNING']);
const FAILED_STATUSES = new Set(['FAILED', 'UNKNOWN']);

export function VideoDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const videoQuery = useQuery(query.videos.check.queryOptions({ params: { id } }));
  const [editOpen, setEditOpen] = useState(false);

  if (!videoQuery.isLoading && (videoQuery.error || !videoQuery.data?.data)) {
    return (
      <main className="flex min-h-(--content-min-height) items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle />
          <AlertTitle>视频加载失败</AlertTitle>
          <AlertDescription>{normalizeApiFailedMessage(videoQuery.error) || '无法获取视频详情，请稍后重试'}</AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="h-(--content-min-height) min-h-140 overflow-x-auto bg-muted/20">
      <div className="grid h-full min-w-240 grid-cols-[minmax(400px,0.8fr)_minmax(520px,1.2fr)] xl:min-w-280 xl:grid-cols-[minmax(280px,0.7fr)_minmax(320px,0.85fr)_minmax(520px,1.45fr)]">
        <div className="grid h-full min-h-0 min-w-100 grid-rows-[400px_minmax(320px,1fr)] overflow-y-auto xl:contents">
          {videoQuery.data?.data ? <VideoPanel video={videoQuery.data.data} onEdit={() => setEditOpen(true)} /> : <VideoPanelSkeleton />}
          <TranscriptionPanel videoId={id} />
        </div>
        <ChatPanel />
      </div>
      {videoQuery.data?.data ? (
        <VideoEditDialog
          video={videoQuery.data.data}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={(video) => {
            queryClient.setQueryData(query.videos.check.queryKey({ params: { id } }), { code: 0, message: 'ok', data: video });
            void queryClient.invalidateQueries({ queryKey: query.videos.list.queryKey() });
          }}
        />
      ) : null}
    </main>
  );
}

function VideoPanel({ video, onEdit }: { video: VideoData; onEdit: () => void }) {
  return (
    <section className="flex min-h-100 shrink-0 flex-col border-b bg-background xl:min-h-0 xl:border-b-0 xl:border-r" aria-labelledby="video-panel-title">
      <PanelHeader icon={<Video />} title="视频" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="group relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
          <video className="h-full max-h-full w-full object-contain" src={video.fileUrl} controls playsInline preload="metadata">
            <track kind="captions" />
          </video>
          <VideoActionsMenuTrigger videoUrl={video.fileUrl} onEdit={onEdit} className="hover:bg-white/20" />
        </div>
        <div className="min-w-0 shrink-0">
          <h1 className="truncate-2 max-h-12 wrap-break-word text-base font-semibold leading-6" title={video.title}>
            {video.title}
          </h1>
          <p className="mt-1 wrap-break-word text-sm text-muted-foreground">@{video.author}</p>
        </div>
      </div>
    </section>
  );
}

function TranscriptionPanel({ videoId }: { videoId: string }) {
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
      <PanelHeader icon={<FileText />} title="转录文本" />
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
          <article className="whitespace-pre-wrap wrap-break-word text-sm leading-7 text-foreground">{task.result || '转录已完成，但没有返回文本内容'}</article>
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

function ChatPanel() {
  return (
    <aside className="flex min-h-0 flex-col border-l bg-background xl:border-l-0" aria-labelledby="chat-panel-title">
      <PanelHeader icon={<Bot />} title="AI Chat" />
      <div className="min-h-0 flex-1 p-4">
        <EmptyState icon={<Bot />} title="暂无对话" />
      </div>
    </aside>
  );
}

function PanelHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  const id = title === '视频' ? 'video-panel-title' : title === '转录文本' ? 'transcription-panel-title' : 'chat-panel-title';
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      <h2 id={id} className="text-sm font-semibold">
        {title}
      </h2>
    </header>
  );
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
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

function ErrorAlert({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="wrap-break-word">{message}</AlertDescription>
    </Alert>
  );
}

function TranscriptionSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="正在加载转录任务">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

function VideoPanelSkeleton() {
  return (
    <section className="flex min-h-100 shrink-0 flex-col border-b bg-background xl:min-h-0 xl:border-b-0 xl:border-r" aria-labelledby="video-panel-title">
      <PanelHeader icon={<Video />} title="视频" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4" role="status" aria-label="正在加载视频详情">
        <Skeleton className="min-h-0 flex-1" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      </div>
    </section>
  );
}
