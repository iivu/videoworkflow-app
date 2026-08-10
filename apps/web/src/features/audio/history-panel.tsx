import dayjs from 'dayjs';
import { Play } from 'lucide-react';
import type { AudioHistoryItem } from './types';

type HistoryPanelProps = {
  history: AudioHistoryItem[];
  activeId?: string;
  onSelect: (item: AudioHistoryItem) => void;
};

function historyDayLabel(timestamp: number) {
  const date = dayjs(timestamp);
  if (date.isSame(dayjs(), 'day')) return '今天';
  if (date.isSame(dayjs().subtract(1, 'day'), 'day')) return '昨天';
  return date.format('YYYY-MM-DD');
}

export function HistoryPanel({ history, activeId, onSelect }: HistoryPanelProps) {
  if (history.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">暂无生成记录</p>;
  }

  const groups: Array<{ label: string; items: AudioHistoryItem[] }> = [];
  for (const item of history) {
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
                      <span className="block truncate text-sm font-medium">{item.title ?? item.text}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.voiceName} · {dayjs(item.createdAt).format('HH:mm')}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
