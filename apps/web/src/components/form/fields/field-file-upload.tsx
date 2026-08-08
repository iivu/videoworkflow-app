import { Button } from '@r/ui';
import { FileIcon, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useFieldContext } from '../context';
import { FieldBase, type FieldBaseProps } from './field-base';

export type FileValue = File | string;

type Props = FieldBaseProps & {
  /** Maximum number of files allowed. */
  maxCount?: number;
  /** Accepted file types, e.g. "image/*,.pdf" */
  accept?: string;
  disabled?: boolean;
};

function isImageValue(value: FileValue) {
  if (typeof value === 'string') {
    return /\.(apng|avif|gif|jpg|jpeg|jfif|pjpeg|pjp|png|svg|webp|bmp|ico|cur|tif|tiff)$/i.test(value);
  }
  return value.type.startsWith('image/');
}

function isVideoValue(value: FileValue) {
  if (typeof value === 'string') {
    return /\.(mp4|webm|ogg|mov|avi|wmv|flv|mkv)$/i.test(value);
  }
  return value.type.startsWith('video/');
}

function getFileName(value: FileValue) {
  return typeof value === 'string' ? value.split('/').pop()?.split('?')[0] || value : value.name;
}

function FilePreview({ value }: { value: FileValue }) {
  const isImage = isImageValue(value);
  const isVideo = isVideoValue(value);
  const name = getFileName(value);
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    if (!value) return;
    if (typeof value === 'string') {
      setSrc(value);
      return;
    } else {
      const objectUrl = URL.createObjectURL(value);
      setSrc(objectUrl);

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [value]);

  if (!src) return null;

  if (isImage) {
    return <img src={src} alt={name} className="h-full w-full object-cover" />;
  }

  if (isVideo) {
    // biome-ignore lint/a11y/useMediaCaption: User-selected preview files do not include a separate caption track.
    return <video src={src} className="h-full w-full object-cover" controls />;
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted p-2">
      <FileIcon className="h-6 w-6 text-muted-foreground" />
      <span className="max-w-full truncate px-1 text-xs text-muted-foreground">{name}</span>
    </div>
  );
}

export function FieldFileUpload({ maxCount, accept, disabled = false, ...baseProps }: Props) {
  const field = useFieldContext<Array<FileValue>>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const value = field.state.value ?? [];
  const inputRef = useRef<HTMLInputElement>(null);

  const canAdd = maxCount === undefined || value.length < maxCount;

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const newFiles = Array.from(files);
      const next = maxCount === undefined ? [...value, ...newFiles] : [...value, ...newFiles].slice(0, maxCount);

      field.handleChange(next);

      // Reset input so the same file can be selected again.
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [field, maxCount, value, disabled],
  );

  const handleRemove = useCallback(
    (index: number) => {
      if (disabled) return;
      const next = value.filter((_, i) => i !== index);
      field.handleChange(next);
    },
    [field, value, disabled],
  );

  return (
    <FieldBase {...baseProps}>
      <div className="flex flex-wrap gap-3">
        {value.map((fileValue, index) => (
          <div key={`${getFileName(fileValue)}-${index}`} className="group relative flex h-24 w-24 overflow-hidden rounded-md border">
            <FilePreview value={fileValue} />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              onClick={() => handleRemove(index)}
              disabled={disabled}
              aria-label={`移除 ${getFileName(fileValue)}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {canAdd ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            disabled={disabled}
          >
            <Upload className="h-5 w-5" />
            <span className="text-xs">上传</span>
          </button>
        ) : null}
      </div>
      <input
        disabled={disabled}
        ref={inputRef}
        type="file"
        id={field.name}
        name={field.name}
        accept={accept}
        multiple={maxCount === undefined || maxCount > 1}
        className="sr-only"
        onChange={handleFileChange}
        aria-invalid={isInvalid}
      />
    </FieldBase>
  );
}
