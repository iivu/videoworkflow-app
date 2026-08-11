import { Skeleton } from '@r/ui';
import dayjs from 'dayjs';
import { Play } from 'lucide-react';
import { Pagination } from '#/components/pagination';
import { providerOptions } from '#/features/voice/voice-cloning-dialog/constants';
import { normalizeApiFailedMessage } from '#/services/api';
import type { CreativeAudioItem } from './types';

type HistoryPanelProps = {
  items: CreativeAudioItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error: unknown;
  activeId?: number | string;
  onSelect: (item: CreativeAudioItem) => void;
  onPageChange: (page: number) => void;
};

function providerLabel(provider: string) {
  return providerOptions.find((option) => option.value === provider)?.label ?? provider;
}

function historyDayLabel(timestamp: string | number | Date | null) {
  const date = dayjs(timestamp ?? undefined);
  if (date.isSame(dayjs(), 'day')) return '今天';
  if (date.isSame(dayjs().subtract(1, 'day'), 'day')) return '昨天';
  return date.format('YYYY-MM-DD');
}

export function HistoryPanel({ items, total, page, pageSize, isLoading, error, activeId, onSelect, onPageChange }: HistoryPanelProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 py-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{normalizeApiFailedMessage(error as Parameters<typeof normalizeApiFailedMessage>[0]) || '加载失败'}</p>;
  }

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">暂无生成历史</p>;
  }

  const groups: Array<{ label: string; items: CreativeAudioItem[] }> = [];
  for (const item of items) {
    const label = historyDayLabel(item.createdAt);
    const group = groups.find((entry) => entry.label === label);
    if (group) group.items.push(item);
    else groups.push({ label, items: [item] });
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.label}>
          <h3 className="mb-2 text-sm font-semibold">{group.label}</h3>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = activeId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className={`flex w-full items-center gap-3 rounded-lg border bg-background p-2 text-left transition-colors hover:bg-accent ${active ? 'border-primary bg-accent' : ''}`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary">
                      <Play className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.text}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {providerLabel(item.provider)} · {item.model} · {dayjs(item.createdAt).format('HH:mm')}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <Pagination className="w-fit self-center" size={pageSize} currentPage={page} total={total} onPageChange={onPageChange} />
    </div>
  );
}
