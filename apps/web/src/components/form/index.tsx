import { createFormHook } from '@tanstack/react-form';

import { fieldContext, formContext } from './context';
import { FieldDatePicker } from './fields/field-date-picker';
import { FieldFileUpload } from './fields/field-file-upload';
import { FieldSegmented } from './fields/field-segmented';
import { FieldSelect } from './fields/field-select';
import { FieldSwitch } from './fields/field-switch';
import { FieldInput, FieldTextarea } from './fields/field-text';

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    FieldInput,
    FieldTextarea,
    FieldDatePicker,
    FieldSelect,
    FieldSegmented,
    FieldFileUpload,
    FieldSwitch,
  },
  formComponents: {},
});
