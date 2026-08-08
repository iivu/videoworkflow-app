import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';
import { CalendarIcon } from 'lucide-react';
import type { DateRange, DayPickerProps } from 'react-day-picker';

import { Button } from '#components/ui/button';
import { Calendar } from '#components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '#components/ui/popover';
import { cn } from '#lib/utils';

export type RangeDatePickerProps = {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dateFormat?: string;
  numberOfMonths?: DayPickerProps['numberOfMonths'];
};

function formatRange(range: DateRange | undefined, dateFormat: string): string | null {
  if (!range) {
    return null;
  }

  const { from, to } = range;

  if (from && to) {
    return `${format(from, dateFormat, { locale: zhCN })} ~ ${format(to, dateFormat, { locale: zhCN })}`;
  }

  if (from) {
    return `${format(from, dateFormat, { locale: zhCN })} ~`;
  }

  return null;
}

export function RangeDatePicker({ value, onChange, placeholder = '选择日期范围', disabled, className, dateFormat = 'yyyy-MM-dd', numberOfMonths = 2 }: RangeDatePickerProps) {
  const displayValue = formatRange(value, dateFormat);

  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="outline" disabled={disabled} className={cn('w-full justify-start text-left font-normal', !displayValue && 'text-muted-foreground', className)}>
          <CalendarIcon className="mr-2 size-4" />
          {displayValue ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={value} onSelect={(range) => onChange?.(range)} numberOfMonths={numberOfMonths} />
      </PopoverContent>
    </Popover>
  );
}

export type { DateRange, DayPickerProps } from 'react-day-picker';
