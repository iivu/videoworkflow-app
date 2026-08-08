import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, toast } from '@r/ui';
import { useMutation } from '@tanstack/react-query';
import type { Route as ApiRoute } from '@tuyau/core/types';
import { LoaderCircle } from 'lucide-react';
import { useEffect } from 'react';
import { z } from 'zod';

import { useAppForm } from '#/components/form';
import { normalizeApiFailedMessage, query } from '#/services/api';

export type VideoData = ApiRoute.Response<'videos.check'>['data'];

type VideoEditDraft = {
  title: string;
  author: string;
  likeCount: string;
  playCount: string;
  shareCount: string;
  favoriteCount: string;
  commentCount: string;
};

function createVideoEditDraft(video: VideoData): VideoEditDraft {
  return {
    title: video.title,
    author: video.author,
    likeCount: `${video.likeCount ?? 0}`,
    playCount: '0',
    shareCount: `${video.shareCount ?? 0}`,
    favoriteCount: `${video.favoriteCount ?? 0}`,
    commentCount: `${video.commentCount ?? 0}`,
  };
}

const videoEditSchema = z.object({
  title: z.string().trim().min(1, '请输入视频标题'),
  author: z.string().trim().min(1, '请输入视频作者'),
  likeCount: z.string().regex(/^\d+$/, '请输入不小于 0 的整数'),
  playCount: z.string().regex(/^\d+$/, '请输入不小于 0 的整数'),
  shareCount: z.string().regex(/^\d+$/, '请输入不小于 0 的整数'),
  favoriteCount: z.string().regex(/^\d+$/, '请输入不小于 0 的整数'),
  commentCount: z.string().regex(/^\d+$/, '请输入不小于 0 的整数'),
});

export function VideoEditDialog({
  video,
  open,
  onOpenChange,
  onSaved,
}: {
  video: VideoData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (video: VideoData) => void;
}) {
  const updateMutation = useMutation({
    ...query.videos.update.mutationOptions(),
    onSuccess: (response) => {
      onSaved(response.data);
      onOpenChange(false);
      toast.add({ type: 'success', description: '视频信息已更新' });
    },
  });
  const form = useAppForm({
    defaultValues: createVideoEditDraft(video),
    validators: { onSubmit: videoEditSchema },
    onSubmit: ({ value }) => {
      updateMutation.mutate({
        params: { id: `${video.id}` },
        body: {
          title: value.title.trim(),
          author: value.author.trim(),
          likeCount: Number(value.likeCount),
          playCount: Number(value.playCount),
          shareCount: Number(value.shareCount),
          favoriteCount: Number(value.favoriteCount),
          commentCount: Number(value.commentCount),
        },
      });
    },
  });

  useEffect(() => {
    if (open) form.reset(createVideoEditDraft(video));
  }, [form, open, video]);

  const countFields: Array<[keyof VideoEditDraft, string]> = [
    ['likeCount', '点赞数'],
    ['playCount', '播放数'],
    ['shareCount', '分享数'],
    ['favoriteCount', '收藏数'],
    ['commentCount', '评论数'],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg!">
        <DialogHeader>
          <DialogTitle>编辑视频信息</DialogTitle>
        </DialogHeader>
        {updateMutation.error ? <ErrorAlert title="保存失败" message={normalizeApiFailedMessage(updateMutation.error) || '保存失败，请稍后重试'} /> : null}
        <form
          id="video-edit-form"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.AppField name="title">{(field) => <field.FieldInput label="标题" disabled={updateMutation.isPending} />}</form.AppField>
          <form.AppField name="author">{(field) => <field.FieldInput label="作者" disabled={updateMutation.isPending} />}</form.AppField>
          {countFields.map(([field, label]) => (
            <form.AppField key={field} name={field}>
              {(fieldApi) => <fieldApi.FieldInput label={label} type="number" min={0} step={1} inputMode="numeric" disabled={updateMutation.isPending} />}
            </form.AppField>
          ))}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={updateMutation.isPending} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="submit" form="video-edit-form" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <LoaderCircle className="animate-spin" /> : null}
            {updateMutation.isPending ? '保存中' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ErrorAlert({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
      <strong>{title}</strong>
      <p className="mt-1">{message}</p>
    </div>
  );
}
