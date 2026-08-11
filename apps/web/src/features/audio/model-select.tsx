import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@r/ui';
import { MODEL_OPTIONS } from './constants';
import type { AudioProvider } from './types';

type ModelSelectProps = {
  provider: AudioProvider | null;
  value: string;
  onChange: (model: string) => void;
};

/** 模型选择器：可选项由当前音色的 provider 决定，未选音色时禁用 */
export function ModelSelect({ provider, value, onChange }: ModelSelectProps) {
  const options = MODEL_OPTIONS.filter((option) => option.provider === provider);

  return (
    <Select items={options} value={value} disabled={!provider} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger className="w-72" aria-label="模型" disabled={!provider}>
        <span className="shrink-0 text-muted-foreground">模型</span>
        <span className="h-4 w-px shrink-0 bg-border" />
        <SelectValue placeholder="先选择音色" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
