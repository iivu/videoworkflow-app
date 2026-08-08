import { useSelector } from '@tanstack/react-form';
import { useMemo } from 'react';
import { useObjectUrl } from '#/hooks/use-object-url';

import { useVoiceCloningDialogForm } from './use-voice-cloning-form';

type Props = { form: ReturnType<typeof useVoiceCloningDialogForm>['form'] };

export function AssetsPreview({ form }: Props) {
  const selectedSourceMode = useSelector(form.store, (state) => state.values.sourceMode);
  const selectedMediaKind = useSelector(form.store, (state) => state.values.mediaKind);
  const selectedFile = useSelector(form.store, (state) => state.values.selectedFile);
  const inputUrl = useSelector(form.store, (state) => state.values.url);
  const realValue = useMemo(() => (selectedSourceMode === 'file' ? (selectedFile?.[0] ?? '') : (inputUrl ?? '')), [selectedSourceMode, selectedFile, inputUrl]);
  const url = useObjectUrl(realValue);
  let render: React.ReactNode = null;
  if (!realValue) render = <div>资源预览</div>;
  else if (selectedMediaKind === 'video') {
    // biome-ignore lint/a11y/useMediaCaption: User-selected preview media does not include a separate caption track.
    render = <video src={url} controls className="w-full h-full object-contain" />;
  } else if (selectedMediaKind === 'audio') {
    // biome-ignore lint/a11y/useMediaCaption: User-selected preview media does not include a separate caption track.
    render = <audio src={url} controls className="w-full max-w-full" />;
  }
  return <div className="flex-center h-40 w-full shrink-0 rounded border md:h-100 md:w-1/3">{render}</div>;
}
