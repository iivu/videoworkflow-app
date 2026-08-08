import { Alert, AlertDescription, cn, DatePicker, Field, FieldError, FieldLabel, Input } from '@r/ui';
import { AlertCircle, FileVideo } from 'lucide-react';

import { useObjectUrl } from '#/hooks/use-object-url';
import { normalizeApiFailedMessage } from '#/services/api';
import { COUNT_FIELDS, type DraftErrors, formatFileSize, type VideoDraft } from './video-draft';

type VideoEditorProps = {
  draft?: VideoDraft;
  errors?: DraftErrors;
  busy: boolean;
  error: Parameters<typeof normalizeApiFailedMessage>[0];
  onUpdate: (updater: (draft: VideoDraft) => VideoDraft) => void;
};

function VideoPreview({ file }: { file: File }) {
  const url = useObjectUrl(file);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
      {url ? <video className="size-full object-contain" src={url} controls muted playsInline preload="metadata" /> : null}
    </div>
  );
}

export function VideoEditor({ draft, errors, busy, error, onUpdate }: VideoEditorProps) {
  if (!draft) {
    return (
      <main className="min-w-0 overflow-y-auto p-4 sm:p-6">
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
          <FileVideo className="size-10" />
          <p className="text-sm">添加视频后即可编辑创建信息</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-w-0 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="min-w-0 border-b pb-4">
          <h2 className="text-lg font-semibold">视频信息</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground" title={draft.file.name}>
            {draft.file.name} · {formatFileSize(draft.file.size)}
          </p>
        </div>

        <VideoPreview file={draft.file} />

        {error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{normalizeApiFailedMessage(error) || '创建失败，请稍后重试'}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors?.title)}>
            <FieldLabel htmlFor={`video-${draft.id}-title`}>标题</FieldLabel>
            <Input
              id={`video-${draft.id}-title`}
              value={draft.title}
              disabled={busy}
              aria-invalid={Boolean(errors?.title)}
              onChange={(event) => onUpdate((current) => ({ ...current, title: event.target.value }))}
            />
            {errors?.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>

          <Field data-invalid={Boolean(errors?.author)}>
            <FieldLabel htmlFor={`video-${draft.id}-author`}>作者</FieldLabel>
            <Input
              id={`video-${draft.id}-author`}
              value={draft.author}
              disabled={busy}
              maxLength={24}
              aria-invalid={Boolean(errors?.author)}
              onChange={(event) => onUpdate((current) => ({ ...current, author: event.target.value }))}
            />
            {errors?.author ? <FieldError>{errors.author}</FieldError> : null}
          </Field>

          <Field data-invalid={Boolean(errors?.publishAt)} className="sm:col-span-2">
            <FieldLabel htmlFor={`video-${draft.id}-publishAt`}>发布日期</FieldLabel>
            <DatePicker
              id={`video-${draft.id}-publishAt`}
              value={draft.publishAt}
              disabled={busy}
              aria-invalid={Boolean(errors?.publishAt)}
              aria-describedby={errors?.publishAt ? `video-${draft.id}-publishAt-error` : undefined}
              className={cn(errors?.publishAt && 'border-destructive')}
              onChange={(publishAt) => onUpdate((current) => ({ ...current, publishAt }))}
            />
            {errors?.publishAt ? <FieldError id={`video-${draft.id}-publishAt-error`}>{errors.publishAt}</FieldError> : null}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-3 text-sm font-medium">互动数据</legend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {COUNT_FIELDS.map(([field, label]) => (
              <Field key={field} data-invalid={Boolean(errors?.[field])}>
                <FieldLabel htmlFor={`video-${draft.id}-${field}`}>{label}</FieldLabel>
                <Input
                  id={`video-${draft.id}-${field}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={draft[field]}
                  disabled={busy}
                  aria-invalid={Boolean(errors?.[field])}
                  onChange={(event) => {
                    const value = event.target.value === '' ? '' : Number(event.target.value);
                    onUpdate((current) => ({ ...current, [field]: value }));
                  }}
                />
                {errors?.[field] ? <FieldError>{errors[field]}</FieldError> : null}
              </Field>
            ))}
          </div>
        </fieldset>
      </div>
    </main>
  );
}
