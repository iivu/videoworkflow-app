import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, toast } from '@r/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import z from 'zod';

import { useAppForm } from '#/components/form';
import { normalizeApiFailedMessage, query } from '#/services/api';
import { EVENT_OPEN_CRAWLER_VIDEO_FORM_DIALOG, emitter } from '#/shared/mitt';

const crawlerVideoFormSchema = z.object({
  links: z.string().min(1, '请输入至少一条视频链接'),
});

function parseUserInput(input: string) {
  return [
    ...new Set(
      input
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ];
}

function CrawlerVideoForm({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    ...query.videos.createCrawlerTask.mutationOptions(),
    onSuccess: async (_data, variables) => {
      toast.add({ type: 'success', description: `已提交 ${variables.body.userInput.length} 个提取任务` });
      await queryClient.invalidateQueries({ queryKey: query.videos.listCrawlerTasks.queryKey() });
      await queryClient.invalidateQueries({ queryKey: query.videos.list.queryKey() });
      onSuccess?.();
    },
    onError: (error) => {
      toast.add({ type: 'error', description: normalizeApiFailedMessage(error) || '任务提交失败，请重试' });
    },
  });
  const busy = createMutation.isPending;

  const form = useAppForm({
    validators: {
      onSubmit: crawlerVideoFormSchema,
    },
    defaultValues: { links: '' },
    onSubmit: ({ value }) => {
      createMutation.mutate({ body: { userInput: parseUserInput(value.links) } });
    },
  });

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    form.handleSubmit();
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <form.AppField name="links">
        {(field) => <field.FieldTextarea rows={6} placeholder="粘贴视频分享链接或分享文本，每行一条" description="支持直接粘贴 App 分享文本，提交后自动提取并下载视频" />}
      </form.AppField>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" className="min-w-24" disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" /> : null}
          {busy ? '提交中' : '提交任务'}
        </Button>
      </div>
    </form>
  );
}

export function CrawlerVideoFormDialog() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => {
      setVisible(true);
    };
    emitter.on(EVENT_OPEN_CRAWLER_VIDEO_FORM_DIALOG, handler);
    return () => {
      emitter.off(EVENT_OPEN_CRAWLER_VIDEO_FORM_DIALOG, handler);
    };
  }, []);

  const close = () => setVisible(false);

  return (
    <Dialog open={visible} onOpenChange={setVisible}>
      <DialogContent className="max-w-2xl!">
        <DialogHeader>
          <DialogTitle>提取视频</DialogTitle>
        </DialogHeader>
        <CrawlerVideoForm onSuccess={close} onCancel={close} />
      </DialogContent>
    </Dialog>
  );
}
