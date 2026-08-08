import { cn, Field, FieldDescription, FieldError, FieldLabel } from '@r/ui';

import { useFieldContext } from '../context';

export type FieldBaseProps = {
  label?: React.ReactNode;
  labelEnd?: React.ReactNode;
  description?: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
};

export function FieldBase<T>({
  label,
  labelEnd,
  description,
  orientation = 'vertical',
  className,
  children,
}: FieldBaseProps & {
  className?: string;
  children?: React.ReactNode;
}) {
  const field = useFieldContext<T>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid} orientation={orientation} className={cn(className)}>
      {label ? (
        <div className="flex items-center gap-2">
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          {labelEnd}
        </div>
      ) : null}
      {children}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {field.state.meta.errors.length > 0 ? <FieldError errors={field.state.meta.errors} /> : null}
    </Field>
  );
}
