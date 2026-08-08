import { Button, toast } from '@r/ui';
import { useSelector } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { Route as ApiRoute } from '@tuyau/core/types';
import { LoaderCircle, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { useAppForm } from '#/components/form';
import { useOss } from '#/hooks/use-oss';
import { query } from '#/services/api';
import { createDraft, type DraftErrors, MAX_VIDEO_COUNT, type VideoDraft, validateDraft } from './video-draft';
import { VideoEditor } from './video-editor';
import { VideoPicker } from './video-picker';

export function VideoCreateForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submitGuardRef = useRef(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [errorsById, setErrorsById] = useState<Record<string, DraftErrors>>({});
  const { upload, uploading, ossPolicyLoading } = useOss();
  const createMutation = useMutation(query.videos.create.mutationOptions());
  const form = useAppForm({ defaultValues: { drafts: [] as VideoDraft[] } });
  const drafts = useSelector(form.store, (state) => state.values.drafts);
  const selectedIndex = drafts.findIndex((draft) => draft.id === selectedId);
  const selectedDraft = selectedIndex >= 0 ? drafts[selectedIndex] : undefined;
  const busy = uploading || createMutation.isPending;

  function updateDraft(id: string, updater: (draft: VideoDraft) => VideoDraft) {
    const currentDraft = drafts.find((draft) => draft.id === id);
    if (!currentDraft) return;
    const nextDraft = updater(currentDraft);
    form.setFieldValue('drafts', (current) => current.map((draft) => (draft.id === id ? nextDraft : draft)));
    setErrorsById((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      const nextErrors = validateDraft(nextDraft);
      if (Object.keys(nextErrors).length > 0) next[id] = nextErrors;
      else delete next[id];
      return next;
    });
  }

  function addFiles(fileList: FileList | File[]) {
    if (busy) return;
    const files = Array.from(fileList);
    const videoFiles = files.filter((file) => file.type.startsWith('video/'));
    const rejectedCount = files.length - videoFiles.length;
    const capacity = MAX_VIDEO_COUNT - drafts.length;
    const accepted = videoFiles.slice(0, capacity).map(createDraft);
    const overflowCount = videoFiles.length - accepted.length;

    if (rejectedCount > 0) toast.add({ type: 'warning', description: `${rejectedCount} 个非视频文件已忽略` });
    if (overflowCount > 0) toast.add({ type: 'warning', description: `最多添加 ${MAX_VIDEO_COUNT} 个视频，${overflowCount} 个文件未添加` });
    if (accepted.length === 0) return;

    form.setFieldValue('drafts', (current) => [...current, ...accepted]);
    setSelectedId((current) => current ?? accepted[0].id);
  }

  function removeDraft(id: string) {
    if (busy) return;
    const index = drafts.findIndex((draft) => draft.id === id);
    if (index < 0) return;
    const nextDrafts = drafts.filter((draft) => draft.id !== id);
    form.setFieldValue('drafts', nextDrafts);
    setErrorsById((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (selectedId === id) setSelectedId(nextDrafts[Math.min(index, nextDrafts.length - 1)]?.id);
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitGuardRef.current || busy) return;
    if (drafts.length === 0) {
      toast.add({ type: 'warning', description: '请先添加视频' });
      return;
    }

    const nextErrors = Object.fromEntries(drafts.map((draft) => [draft.id, validateDraft(draft)]).filter(([, errors]) => Object.keys(errors).length > 0)) as Record<
      string,
      DraftErrors
    >;
    const firstInvalid = drafts.find((draft) => nextErrors[draft.id]);
    if (firstInvalid) {
      setErrorsById(nextErrors);
      setSelectedId(firstInvalid.id);
      toast.add({ type: 'warning', description: '请先完善所有视频信息' });
      return;
    }

    submitGuardRef.current = true;
    try {
      const pendingUploads = drafts.filter((draft) => !draft.uploadedUrl);
      const uploadResults = pendingUploads.length ? await upload(pendingUploads.map((draft) => ({ file: draft.file, key: draft.objectKey }))) : [];
      if (uploadResults === null || uploadResults === undefined) return;

      const urlsByKey = new Map(uploadResults.flatMap((result) => (result.url ? [[result.key, result.url] as const] : [])));
      const draftsWithUrls = drafts.map((draft) => ({
        ...draft,
        uploadedUrl: draft.uploadedUrl ?? urlsByKey.get(draft.objectKey) ?? undefined,
      }));
      form.setFieldValue('drafts', (current) => current.map((draft) => draftsWithUrls.find((candidate) => candidate.id === draft.id) ?? draft));

      const submittedDrafts = draftsWithUrls.filter((draft): draft is VideoDraft & { uploadedUrl: string } => Boolean(draft.uploadedUrl));
      if (submittedDrafts.length === 0) {
        toast.add({ type: 'error', description: '所有视频上传失败，请重试' });
        return;
      }

      const body: ApiRoute.Body<'videos.create'> = {
        videos: submittedDrafts.map((draft) => {
          if (!draft.publishAt) throw new Error('Validated draft is missing a publication date');
          return {
            title: draft.title.trim(),
            author: draft.author.trim(),
            fileUrl: draft.uploadedUrl,
            publishAt: draft.publishAt.toISOString(),
            likeCount: Number(draft.likeCount || 0),
            playCount: Number(draft.playCount || 0),
            shareCount: Number(draft.shareCount || 0),
            favoriteCount: Number(draft.favoriteCount || 0),
            commentCount: Number(draft.commentCount || 0),
          };
        }),
      };

      try {
        await createMutation.mutateAsync({ body });
      } catch {
        return;
      }
      const submittedIds = new Set(submittedDrafts.map((draft) => draft.id));
      const remainingDrafts = draftsWithUrls.filter((draft) => !submittedIds.has(draft.id));
      form.setFieldValue('drafts', remainingDrafts);
      setErrorsById({});
      await queryClient.invalidateQueries({ queryKey: query.videos.list.queryKey() });

      if (remainingDrafts.length === 0) {
        await navigate({ to: '/videos' });
      } else {
        setSelectedId(remainingDrafts[0].id);
        toast.add({ type: 'success', description: `${submittedDrafts.length} 个视频创建成功，失败项已保留` });
      }
    } finally {
      submitGuardRef.current = false;
    }
  }

  return (
    <form className="flex min-h-(--content-min-height) flex-col" onSubmit={handleSubmit}>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        <VideoPicker drafts={drafts} selectedId={selectedId} errorsById={errorsById} busy={busy} onAddFiles={addFiles} onSelect={setSelectedId} onRemove={removeDraft} />
        <VideoEditor
          draft={selectedDraft}
          errors={selectedDraft ? errorsById[selectedDraft.id] : undefined}
          busy={busy}
          error={createMutation.error}
          onUpdate={(updater) => {
            if (selectedDraft) updateDraft(selectedDraft.id, updater);
          }}
        />
      </div>

      <footer className="sticky bottom-0 flex min-h-14 items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur-sm">
        <Button type="button" variant="outline" disabled={busy} onClick={() => navigate({ to: '/videos' })}>
          取消
        </Button>
        <Button type="submit" className="min-w-24" disabled={busy || drafts.length === 0 || ossPolicyLoading}>
          {busy ? <LoaderCircle className="animate-spin" /> : <Upload />}
          {uploading ? '上传中' : createMutation.isPending ? '创建中' : '创建视频'}
        </Button>
      </footer>
    </form>
  );
}
