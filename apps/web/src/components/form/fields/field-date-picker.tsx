import { cn, DatePicker, type DatePickerProps } from '@r/ui';

import { useFieldContext } from '../context';
import { FieldBase, type FieldBaseProps } from './field-base';

type Props = FieldBaseProps & DatePickerProps;

export function FieldDatePicker({ placeholder, className, dateFormat, ...baseProps }: Props) {
  const field = useFieldContext<Date | undefined>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FieldBase {...baseProps}>
      <DatePicker
        value={field.state.value}
        onChange={(date) => field.handleChange(date)}
        placeholder={placeholder}
        dateFormat={dateFormat}
        className={cn(isInvalid && 'border-destructive focus-visible:ring-destructive', className)}
      />
    </FieldBase>
  );
}
