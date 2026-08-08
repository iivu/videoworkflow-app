import { cn, Field, FieldContent, FieldDescription, FieldLabel, Switch } from '@r/ui';

import { useFieldContext } from '../context';
import type { FieldBaseProps } from './field-base';

type Props = FieldBaseProps & { className?: string; disabled?: boolean };

export function FieldSwitch({ className, label, labelEnd, description, orientation = 'horizontal', disabled = false }: Props) {
  const field = useFieldContext<boolean>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid} orientation={orientation} className={cn(className)}>
      <FieldContent>
        {label ? (
          <div className="flex items-center gap-2">
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            {labelEnd}
          </div>
        ) : null}
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </FieldContent>
      <Switch
        disabled={disabled}
        name={field.name}
        id={field.name}
        checked={field.state.value}
        aria-invalid={isInvalid}
        onCheckedChange={(checked) => field.handleChange(checked)}
      />
    </Field>
  );
}
