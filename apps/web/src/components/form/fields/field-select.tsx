import { cn, Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@r/ui';

import { useFieldContext } from '../context';
import { FieldBase, type FieldBaseProps } from './field-base';

export type SelectOption<T> = {
  label: React.ReactNode;
  value: T;
};

type Props<T> = FieldBaseProps & {
  options: SelectOption<T>[];
  placeholder?: string;
  valueToString?: (value: T) => string;
  className?: string;
  disabled?: boolean;
  onValueChange?: (value: T) => void;
};

function defaultValueToString<T>(value: T): string {
  return String(value);
}

export function FieldSelect<T = string>({ options, placeholder, valueToString = defaultValueToString, className, disabled, onValueChange, ...baseProps }: Props<T>) {
  const field = useFieldContext<T>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const valueMap = new Map<string, T>();
  for (const option of options) {
    valueMap.set(valueToString(option.value), option.value);
  }

  const currentKey = valueToString(field.state.value);

  return (
    <FieldBase {...baseProps}>
      <Select
        items={options}
        value={currentKey}
        disabled={disabled}
        onValueChange={(key) => {
          const next = valueMap.get(key!);
          if (next !== undefined) {
            field.handleChange(next);
            onValueChange?.(next);
          }
        }}
      >
        <SelectTrigger id={field.name} aria-invalid={isInvalid} className={cn(className)} disabled={disabled}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => {
              const key = valueToString(option.value);
              return (
                <SelectItem key={key} value={key}>
                  {option.label}
                </SelectItem>
              );
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
    </FieldBase>
  );
}
