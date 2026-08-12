import { Alert, AlertDescription, AlertTitle, Skeleton } from '@r/ui';
import { AlertCircle, Video } from 'lucide-react';

export function PanelHeader({ id, icon, title }: { id: string; icon: React.ReactNode; title: string }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      <h2 id={id} className="text-sm font-semibold">
        {title}
      </h2>
    </header>
  );
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
    <section className="flex min-h-100 shrink-0 flex-col border-b bg-background xl:min-h-0 xl:border-b-0 xl:border-r" aria-labelledby="video-panel-title">
      <PanelHeader id="video-panel-title" icon={<Video />} title="视频" />
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
