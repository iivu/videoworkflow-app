import { Input, Textarea } from '@r/ui';

import { useFieldContext } from '../context';
import { FieldBase, type FieldBaseProps } from './field-base';

type FieldInputProps = FieldBaseProps & React.ComponentProps<'input'>;
export function FieldInput({ type = 'text', placeholder, ...baseProps }: FieldInputProps) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <FieldBase<string> {...baseProps}>
      <Input
        aria-invalid={isInvalid}
        name={field.name}
        type={type}
        id={field.name}
        value={field.state.value}
        placeholder={placeholder}
        {...baseProps}
        onChange={(e) => field.handleChange(e.target.value)}
      />
    </FieldBase>
  );
}

type FieldTextareaProps = FieldBaseProps & React.ComponentProps<'textarea'>;
export function FieldTextarea(props: FieldTextareaProps) {
  const { rows = 5, placeholder, ...baseProps } = props;
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <FieldBase<string> {...baseProps}>
      <Textarea
        aria-invalid={isInvalid}
        name={field.name}
        id={field.name}
        rows={rows}
        value={field.state.value}
        placeholder={placeholder}
        {...baseProps}
        onChange={(e) => field.handleChange(e.target.value)}
      />
    </FieldBase>
  );
}
