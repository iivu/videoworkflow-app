import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@r/ui';
import { LoaderCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { EVENT_OPEN_VOICE_CLONING_DIALOG, emitter, type VoiceCloningOpenPayload } from '#/shared/mitt';
import { AssetsPreview } from './assets-preview';
import { VoiceCloningForm } from './form';
import { createDraft } from './types';
import { useVoiceCloningDialogForm } from './use-voice-cloning-form';

export function VoiceCloningDialog() {
  const [open, setOpen] = useState(false);
  const { form, formError, setFormError, clearUploadCache, uploading, isAudioMutationPending, isVideoMutationPending } = useVoiceCloningDialogForm({
    onSuccess: resetAndClose,
  });
  const busy = uploading || isAudioMutationPending || isVideoMutationPending;

  function resetAndClose() {
    setOpen(false);
    setFormError('');
    clearUploadCache();
    form.reset(createDraft());
  }

  function close() {
    if (busy) return;
    resetAndClose();
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!busy) form.handleSubmit();
  }

  useEffect(() => {
    const handler = (payload?: VoiceCloningOpenPayload) => {
      if (busy) return;
      clearUploadCache();
      form.reset(createDraft(payload));
      setOpen(true);
      setFormError('');
    };
    emitter.on(EVENT_OPEN_VOICE_CLONING_DIALOG, handler);
    return () => emitter.off(EVENT_OPEN_VOICE_CLONING_DIALOG, handler);
  }, [busy, clearUploadCache, form]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-h-[calc(100dvh-4rem)] max-w-4xl! grid-rows-[auto_minmax(0,1fr)_auto]" showCloseButton={false}>
        <DialogHeader className="pr-8">
          <DialogTitle>声音克隆</DialogTitle>
        </DialogHeader>
        <Button type="button" variant="ghost" size="icon-sm" className="absolute top-2 right-2" aria-label="关闭" title="关闭" disabled={busy} onClick={close}>
          <X />
        </Button>
        <div className="flex min-h-0 flex-col gap-4 md:flex-row">
          <AssetsPreview form={form} />
          {open ? <VoiceCloningForm onSubmit={handleSubmit} error={formError} form={form} busy={busy} onFileChange={clearUploadCache} /> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={close}>
            取消
          </Button>
          <Button type="submit" form="voice-cloning-form" disabled={busy}>
            {busy ? <LoaderCircle className="animate-spin" /> : null}
            {uploading ? '上传中' : busy ? '提交中' : '开始克隆'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
