import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';
import { CalendarIcon } from 'lucide-react';

import { Button } from '#components/ui/button';
import { Calendar } from '#components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '#components/ui/popover';
import { cn } from '#lib/utils';

export type DatePickerProps = {
  id?: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dateFormat?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

export function DatePicker({ id, value, onChange, placeholder = '选择日期', disabled, className, dateFormat = 'yyyy-MM-dd', ...ariaProps }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground', className)}
            {...ariaProps}
          />
        }
      >
        <CalendarIcon className="mr-2 size-4" />
        {value ? format(value, dateFormat, { locale: zhCN }) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={(date) => onChange?.(date)} />
      </PopoverContent>
    </Popover>
  );
}
