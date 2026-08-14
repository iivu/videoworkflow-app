import { Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@r/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AlertCircle, ArrowRight, Film, Loader2, Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { normalizeApiFailedMessage, query } from '#/services/api';

type Task = { taskId: string; videoUrl: string; status: string; reason?: string | null; createdAt?: string | null };
const statusLabels: Record<string, string> = { pending: '排队中', processing: '处理中', completed: '已完成', failed: '失败' };

export function VideoBreakdownListPage() {
  const queryClient = useQueryClient();
  const [videoUrl, setVideoUrl] = useState('');
  const tasksQuery = useQuery({
    ...query.videoBreakdown.list.queryOptions({ query: { page: 1, size: 50 } }),
    refetchInterval: (q) => (q.state.data?.data.list.some((task) => task.status === 'pending' || task.status === 'processing') ? 5000 : false),
  });
  const createMutation = useMutation(
    query.videoBreakdown.create.mutationOptions({
      onSuccess: () => {
        setVideoUrl('');
        void queryClient.invalidateQueries({ queryKey: query.videoBreakdown.list.queryKey() });
      },
    }),
  );
  const tasks = (tasksQuery.data?.data.list ?? []) as Task[];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!videoUrl.trim() || createMutation.isPending) return;
    createMutation.mutate({ body: { videoUrl: videoUrl.trim(), model: 'qwen3.8-max' } });
  };
  return (
    <main className="min-h-(--content-min-height) bg-muted/20 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-4" />
              新建拆解任务
            </CardTitle>
            <CardDescription>输入可公开访问的 HTTPS 视频地址，任务将在后台处理。</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="breakdown-url">视频地址</Label>
                <Input id="breakdown-url" type="url" required value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://example.com/video.mp4" />
              </div>
              <Button type="submit" disabled={createMutation.isPending || !videoUrl.trim()}>
                {createMutation.isPending && <Loader2 className="animate-spin" />}开始拆解
              </Button>
            </form>
            {createMutation.error && <p className="mt-3 text-sm text-destructive">{normalizeApiFailedMessage(createMutation.error) || '任务创建失败，请稍后重试'}</p>}
          </CardContent>
        </Card>
        {tasksQuery.error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>任务加载失败</AlertTitle>
            <AlertDescription>{normalizeApiFailedMessage(tasksQuery.error) || '无法获取任务列表'}</AlertDescription>
          </Alert>
        ) : null}
        {!tasksQuery.isLoading && !tasksQuery.error && tasks.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => (
              <TaskCard key={task.taskId} task={task} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function TaskCard({ task }: { task: Task }) {
  const completed = task.status === 'completed';
  let hostname = task.videoUrl;
  try {
    hostname = new URL(task.videoUrl).hostname;
  } catch {
    /* API validates URLs */
  }
  const inProgress = task.status === 'pending' || task.status === 'processing';
  const body = (
    <Card className={`relative min-w-0 h-full transition-shadow ${completed ? 'hover:shadow-md' : 'opacity-75'}`}>
      <CardHeader className="min-w-0">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <CardTitle className="flex min-w-0 flex-1 items-center gap-2 text-base">
            <Film className="size-4 shrink-0 text-primary" />
            <span className="truncate">{hostname}</span>
          </CardTitle>
          <Badge variant={completed ? 'default' : task.status === 'failed' ? 'destructive' : 'secondary'}>{statusLabels[task.status] ?? task.status}</Badge>
        </div>
        <CardDescription className="min-w-0 truncate">{task.videoUrl}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex min-w-0 items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="shrink-0">{task.createdAt ? new Date(task.createdAt).toLocaleString('zh-CN') : '刚刚创建'}</span>
        {completed && <ArrowRight className="size-4" />}
        {task.status === 'failed' && <span className="min-w-0 truncate text-destructive">{task.reason}</span>}
      </CardContent>
      {inProgress ? <TaskProgressOverlay status={task.status} /> : null}
    </Card>
  );
  return completed ? (
    <Link to="/video-breakdown/$id" params={{ id: task.taskId }} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

function TaskProgressOverlay({ status }: { status: string }) {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/65 text-center backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label={statusLabels[status] ?? '任务进行中'}
    >
      <Loader2 className="size-7 animate-spin text-primary" />
      <span className="text-sm font-medium">{statusLabels[status] ?? '任务进行中'}</span>
      <span className="text-xs text-muted-foreground">AI 正在分析视频，请稍候</span>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Film className="size-10 text-muted-foreground/50" />
        <div>
          <p className="font-medium">还没有拆解任务</p>
          <p className="mt-1 text-sm text-muted-foreground">输入视频地址，创建你的第一个 AI 拆解任务。</p>
        </div>
      </CardContent>
    </Card>
  );
}
