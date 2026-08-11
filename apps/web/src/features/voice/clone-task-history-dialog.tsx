import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@r/ui';
import { useQuery } from '@tanstack/react-query';
import type { Data } from 'api/data';
import dayjs from 'dayjs';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Pagination } from '#/components/pagination';
import { normalizeApiFailedMessage, query } from '#/services/api';

const PAGE_SIZE = 10;

const PROVIDER_LABELS: Record<string, string> = {
  bailian: '百炼',
  minimaxi: 'MiniMax',
};

const STATUS_LABELS: Record<string, string> = {
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
};

function TaskStatus({ status }: { status: string }) {
  const variant = status === 'failed' ? 'destructive' : status === 'completed' ? 'default' : 'secondary';
  return <Badge variant={variant}>{STATUS_LABELS[status] ?? status}</Badge>;
}

function parseTaskName(config: string) {
  try {
    const name = JSON.parse(config).name;
    return typeof name === 'string' ? name : '';
  } catch {
    return '';
  }
}

function TaskRow({ task }: { task: Data.VideoToVoiceTask }) {
  const name = parseTaskName(task.config);
  return (
    <TableRow>
      <TableCell>{PROVIDER_LABELS[task.provider] ?? task.provider}</TableCell>
      <TableCell className="max-w-80 whitespace-normal">
        <div className="wrap-break-word font-medium">{name || '-'}</div>
        {task.voiceId ? <div className="mt-1 break-all text-xs text-muted-foreground">音色 ID:{task.voiceId}</div> : null}
        {task.status === 'failed' && task.reason ? <div className="mt-2 wrap-break-word text-xs text-destructive">失败原因：{task.reason}</div> : null}
      </TableCell>
      <TableCell>
        <TaskStatus status={task.status} />
      </TableCell>
      <TableCell className="text-muted-foreground">{dayjs(task.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
    </TableRow>
  );
}

function TaskTableSkeleton() {
  return (
    <div className="space-y-3 py-2" role="status" aria-label="任务记录加载中">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CloneTaskHistoryDialog({ open, onOpenChange }: Props) {
  const [page, setPage] = useState(1);
  const taskQuery = useQuery({
    ...query.voices.listCloneTasks.queryOptions({ query: { page, size: PAGE_SIZE } }),
    enabled: open,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setPage(1);
    onOpenChange(nextOpen);
  };

  const tasks = taskQuery.data?.data.list ?? [];
  const total = taskQuery.data?.data.meta.total ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-4xl! grid-rows-[auto_minmax(0,1fr)_auto]">
        <DialogHeader>
          <DialogTitle>任务记录</DialogTitle>
          <DialogDescription>查看已提交的声音克隆任务及处理结果</DialogDescription>
        </DialogHeader>

        <div className="min-h-48 overflow-auto">
          {taskQuery.isLoading ? <TaskTableSkeleton /> : null}

          {taskQuery.isError ? (
            <Alert variant="destructive" className="my-2">
              <AlertCircle />
              <AlertTitle>任务记录加载失败</AlertTitle>
              <AlertDescription className="wrap-break-word">{normalizeApiFailedMessage(taskQuery.error) || '无法获取任务记录，请稍后重试'}</AlertDescription>
              <Button className="col-start-2 mt-3 w-fit" size="sm" variant="outline" onClick={() => taskQuery.refetch()}>
                <RefreshCw />
                重新加载
              </Button>
            </Alert>
          ) : null}

          {!taskQuery.isLoading && !taskQuery.isError && tasks.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Inbox className="size-8" aria-hidden="true" />
              <p>暂无声音克隆任务</p>
            </div>
          ) : null}

          {!taskQuery.isLoading && !taskQuery.isError && tasks.length > 0 ? (
            <Table className="min-w-180">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">服务商</TableHead>
                  <TableHead>音色 ID</TableHead>
                  <TableHead className="w-24">状态</TableHead>
                  <TableHead className="w-36">提交时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </TableBody>
            </Table>
          ) : null}
        </div>

        <Pagination size={PAGE_SIZE} currentPage={page} total={total} onPageChange={setPage} />
      </DialogContent>
    </Dialog>
  );
}
