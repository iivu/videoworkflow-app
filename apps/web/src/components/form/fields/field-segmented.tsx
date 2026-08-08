import { Button, ButtonGroup } from '@r/ui';

import { useFieldContext } from '../context';
import { FieldBase, type FieldBaseProps } from './field-base';

export type Options<T> = Array<{ label: React.ReactNode; value: T }>;

export type Props<T> = FieldBaseProps & {
  options: Options<T>;
  disabled?: boolean;
  mapKey?: (value: T) => string;
  equals?: (a: T, b: T) => boolean;
};

function defaultMapKey<T>(value: T) {
  return String(value);
}

function defaultEquals<T>(a: T, b: T) {
  return a === b;
}

export function FieldSegmented<T>(props: Props<T>) {
  const { options, disabled = false, mapKey = defaultMapKey, equals = defaultEquals, ...baseProps } = props;
  const field = useFieldContext<T>();
  return (
    <FieldBase {...baseProps}>
      <ButtonGroup aria-label={String(baseProps.label)}>
        {options.map(({ label, value }) => {
          const key = mapKey(value);
          const isSelected = equals(field.state.value, value);
          const variant = isSelected ? 'default' : 'outline';
          return (
            <Button key={key} type="button" variant={variant} aria-pressed={isSelected} disabled={disabled} onClick={() => field.handleChange(value)}>
              {label}
            </Button>
          );
        })}
      </ButtonGroup>
    </FieldBase>
  );
}
