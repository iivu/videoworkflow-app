import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@r/ui';
import { MODEL_OPTIONS } from './mock';

type ModelSelectProps = {
  value: string;
  onChange: (model: string) => void;
};

export function ModelSelect({ value, onChange }: ModelSelectProps) {
  return (
    <Select items={MODEL_OPTIONS} value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger className="w-72" aria-label="模型">
        <span className="shrink-0 text-muted-foreground">模型</span>
        <span className="h-4 w-px shrink-0 bg-border" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {MODEL_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
